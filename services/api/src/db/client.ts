/**
 * services/api — runtime database client (T-011).
 *
 * Two responsibilities:
 *   1. Open a pooled connection to Postgres as the *app* role (the
 *      RLS-bound, non-superuser role created by
 *      infra/compose/postgres/init/01-app-role.sql).
 *   2. Provide `withWorkspace(workspaceId, fn)` — runs the given async
 *      callback inside a transaction that has `SET LOCAL app.workspace_id`
 *      set to the caller's workspace. Every request handler MUST go
 *      through this helper so RLS is enforced (arch §11).
 *
 * Architecture references:
 *   - arch §5.1 — Postgres 16 + pgvector (metadata only; no media bytes).
 *   - arch §11  — Per-request `SET LOCAL app.workspace_id = ...` is what
 *                 binds the request to its workspace.
 *
 * Why `postgres` (a.k.a. `postgres.js`) and not `pg`:
 *   - First-class TypeScript types.
 *   - Connection pool is built in and survives idle disconnects cleanly.
 *   - Cooperates well with `drizzle-orm/postgres-js`, which is the
 *     officially-supported adapter Drizzle ships with.
 *
 * This file does NOT call `loadApiConfig()` at import time so it stays
 * tree-shakeable and testable. Call `getDb()` (lazily) from a request
 * scope.
 */
import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { apiConfig } from "../config.js";
import * as schema from "./schema.js";

export type AppDatabase = PostgresJsDatabase<typeof schema>;

let sqlClient: Sql | undefined;
let dbClient: AppDatabase | undefined;

/**
 * Build a Postgres connection string from the validated `apiConfig`.
 * Uses the *app* user (POSTGRES_USER / POSTGRES_PASSWORD); migrations
 * deliberately use a different superuser URL (see migrate.ts).
 */
function appConnectionString(): string {
  const { POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = apiConfig;
  return `postgres://${encodeURIComponent(POSTGRES_USER)}:${encodeURIComponent(
    POSTGRES_PASSWORD,
  )}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;
}

/**
 * Lazily construct and cache the postgres.js client + drizzle wrapper.
 * Exposed so tests can override (`__setDbForTests`) and so the Fastify
 * lifecycle (T-015 onwards) can call `closeDb()` on shutdown.
 */
export function getDb(): AppDatabase {
  if (dbClient) return dbClient;
  sqlClient = postgres(appConnectionString(), {
    // Surfacing app role + connection labelling helps when reading the
    // `pg_stat_activity` view during incident response.
    connection: { application_name: "vidgen-api" },
    // Keep the pool small in dev (16 GB MacBook); production sizing is
    // tuned per-deployment.
    max: Number(process.env["POSTGRES_POOL_MAX"] ?? 10),
    idle_timeout: 30,
    // pgvector returns vectors as text. Disable the automatic prepare so
    // queries that mix vector and json work the first time. Performance
    // delta is negligible vs the readability win.
    prepare: false,
  });
  dbClient = drizzle(sqlClient, { schema });
  return dbClient;
}

/**
 * Test-only escape hatch. Vitest can hand the helper a stub `Sql` plus a
 * `drizzle` instance backed by it. We do NOT expose a public reset because
 * a real service should only close on shutdown.
 * @internal
 */
export function __setDbForTests(sql: Sql, db: AppDatabase): void {
  sqlClient = sql;
  dbClient = db;
}

/** Cleanly close the underlying pool. Idempotent. */
export async function closeDb(): Promise<void> {
  const sqlRef = sqlClient;
  sqlClient = undefined;
  dbClient = undefined;
  if (sqlRef) await sqlRef.end({ timeout: 5 });
}

/**
 * Run `fn` inside a transaction that has `SET LOCAL app.workspace_id` bound
 * to the supplied workspace. RLS predicates installed by
 * `migrations/0001_rls_policies.sql` see the value via
 * `current_workspace_id()`.
 *
 * Why `SET LOCAL` and not `SET`:
 *   - `SET LOCAL` is rolled back at transaction end. We never want a
 *     pooled connection to leak a workspace context into the next request.
 *   - `SET LOCAL` is a no-op outside a transaction, so the BEGIN is
 *     mandatory.
 *
 * The workspace_id is validated to be a non-empty string that excludes
 * single quotes — defensive even though Drizzle parameterises everything,
 * because GUC values *cannot* be parameterised in `SET` syntax and we have
 * to inline-quote them. A misformatted workspace_id is a programming bug
 * (the JWT layer in T-015 produces UUIDs); throwing here is the right
 * outcome.
 */
const WORKSPACE_ID_RE = /^[A-Za-z0-9_\-.]+$/;

export async function withWorkspace<T>(
  workspaceId: string,
  fn: (tx: AppDatabase) => Promise<T>,
): Promise<T> {
  if (!workspaceId || !WORKSPACE_ID_RE.test(workspaceId)) {
    throw new Error(
      `withWorkspace: invalid workspaceId ${JSON.stringify(workspaceId)} — must match ${WORKSPACE_ID_RE.source}`,
    );
  }
  const db = getDb();
  return db.transaction(async (tx) => {
    // `set_config(name, value, is_local => true)` is the function form of
    // `SET LOCAL` and accepts a parameterised value — safer than string
    // interpolation into `SET`.
    await tx.execute(sql`select set_config('app.workspace_id', ${workspaceId}, true)`);
    return fn(tx);
  });
}

// ---- Bootstrap helpers (T-015) ----------------------------------------------
//
// The three cross-tenant routes (GET /me, GET /workspaces, POST /workspaces)
// run before the caller has chosen a workspace. RLS is still enforced — the
// app role only sees rows that match the additive `self_bootstrap_read`
// policies installed by migration 0002, which key off the `app.user_id` GUC.
// `withUserContext` sets that GUC inside a transaction in the same way
// `withWorkspace` sets `app.workspace_id` above.
//
// Writes that the bootstrap path cannot perform under RLS (creating the
// first tenant + tenant_members pair) go through SECURITY DEFINER functions
// — `upsertUserByEmail` and `createWorkspaceForUser` below. Both are
// EXECUTE-granted to the app role only.

// PostgreSQL canonical UUID textual representation, e.g.
// 00000000-0000-0000-0000-000000000000. Matching this here means we never
// inject a malformed value into `set_config('app.user_id', ...)` — the
// migration's `current_user_id()` falls back to NULL on a bad cast, so a
// caller bug would result in zero-row reads (silent), which is worse than
// throwing.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Run `fn` inside a transaction bound to a specific user (no workspace
 * context). Sets `app.user_id` so the `self_bootstrap_read` policies from
 * migration 0002 allow the caller to read their own user row, their
 * tenant_members rows, and the tenants they belong to. Use this for the
 * /me and GET /workspaces routes only — anything that touches a specific
 * workspace's rows should use `withWorkspace` instead so the standard
 * RLS predicate fires.
 */
export async function withUserContext<T>(
  userId: string,
  fn: (tx: AppDatabase) => Promise<T>,
): Promise<T> {
  if (!userId || !UUID_RE.test(userId)) {
    throw new Error(
      `withUserContext: invalid userId ${JSON.stringify(userId)} — must be a canonical UUID`,
    );
  }
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}

/**
 * SECURITY DEFINER bootstrap: resolve a Keycloak email claim into our
 * internal `users.user_id`. Idempotent. Migration 0002 installs the
 * underlying function and gates EXECUTE to the app role only.
 *
 * Returns the canonical user_id (UUID text). Throws if the function
 * surfaces an exception (empty email, etc.).
 */
export async function upsertUserByEmail(
  email: string,
  displayName?: string | null,
): Promise<string> {
  const db = getDb();
  const rows = await db.execute<{ upsert_user_by_email: string }>(
    sql`select public.upsert_user_by_email(${email}, ${displayName ?? null}) as upsert_user_by_email`,
  );
  const id = rows[0]?.upsert_user_by_email;
  if (!id || !UUID_RE.test(id)) {
    throw new Error(`upsertUserByEmail: backend returned ${JSON.stringify(id)} for email ${email}`);
  }
  return id;
}

/**
 * SECURITY DEFINER bootstrap: atomically insert a new tenant + its
 * founding `tenant_members(role='owner')` row. The function requires
 * `app.user_id = userId`, so we run it inside `withUserContext` to
 * enforce that contract from the connection side too — defence in depth
 * with the function's own check.
 */
export async function createWorkspaceForUser(
  workspaceId: string,
  name: string,
  userId: string,
): Promise<string> {
  if (!workspaceId) throw new Error("createWorkspaceForUser: workspaceId required");
  if (!name) throw new Error("createWorkspaceForUser: name required");
  return withUserContext(userId, async (tx) => {
    const rows = await tx.execute<{ create_workspace_for_user: string }>(
      sql`select public.create_workspace_for_user(${workspaceId}, ${name}, ${userId}::uuid) as create_workspace_for_user`,
    );
    const ws = rows[0]?.create_workspace_for_user;
    if (ws !== workspaceId) {
      throw new Error(
        `createWorkspaceForUser: backend returned ${JSON.stringify(ws)}, expected ${workspaceId}`,
      );
    }
    return ws;
  });
}

export { schema };
