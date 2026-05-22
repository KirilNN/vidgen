/**
 * Drizzle Kit config for `services/api` (T-011).
 *
 * Architecture references:
 *   - arch §5.1 — Postgres 16 + pgvector; metadata only (no media bytes).
 *   - arch §5.2 — core schema (tenants, users, assets, ..., embeddings).
 *   - arch §11  — multi-tenant isolation via RLS on every tenant table.
 *
 * What this file does:
 *   - Tells `drizzle-kit` where the TypeScript schema lives.
 *   - Tells `drizzle-kit` where to write generated SQL migrations.
 *   - Builds a Postgres connection string from the *superuser* credentials,
 *     because migrations DDL (CREATE TABLE, ALTER ... ENABLE RLS, CREATE
 *     POLICY) require ownership and BYPASSRLS that the runtime `app` role
 *     intentionally does NOT have (see infra/compose/postgres/init/01-app-role.sql).
 *
 * Connection-string precedence:
 *   1. `DATABASE_URL` (explicit override; used by CI / hosted Postgres).
 *   2. Built from POSTGRES_SUPERUSER / POSTGRES_SUPERUSER_PASSWORD /
 *      POSTGRES_HOST / POSTGRES_PORT / POSTGRES_DB (the local-compose path).
 *
 * This file is read by `drizzle-kit` (a build-time tool), not by the API
 * service at runtime, so it imports `dotenv-flow` directly rather than going
 * through `@vidgen/config` (which intentionally throws on missing service env
 * vars the migrator doesn't need).
 */
import { defineConfig } from "drizzle-kit";
import dotenvFlow from "dotenv-flow";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function findRepoRoot(start: string): string {
  let dir = start;
  for (let depth = 0; depth < 10; depth++) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

if (process.env["CONFIG_SKIP_DOTENV"] !== "1") {
  dotenvFlow.config({ path: findRepoRoot(here), silent: true });
}

function buildDatabaseUrl(): string {
  if (process.env["DATABASE_URL"]) return process.env["DATABASE_URL"];
  const host = process.env["POSTGRES_HOST"] ?? "localhost";
  const port = process.env["POSTGRES_PORT"] ?? "5432";
  const db = process.env["POSTGRES_DB"] ?? "vidgen";
  const user = process.env["POSTGRES_SUPERUSER"] ?? "postgres";
  const password = process.env["POSTGRES_SUPERUSER_PASSWORD"] ?? "change-me";
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}`;
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: buildDatabaseUrl(),
  },
  // Drizzle's `__drizzle_migrations` journal lives in the `drizzle` schema by
  // default. Keep that — the smoke test relies on the standard location.
  migrations: {
    table: "__drizzle_migrations",
    schema: "drizzle",
  },
  // Helpful but non-fatal: list tables that look like ours and warn on drift.
  verbose: false,
  strict: true,
});
