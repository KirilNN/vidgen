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

export { schema };
