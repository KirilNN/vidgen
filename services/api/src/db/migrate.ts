/**
 * services/api — migration runner (T-011).
 *
 * Invoked by `pnpm db:migrate` (defined in services/api/package.json).
 * Applies every SQL file under `migrations/` once and only once, tracked in
 * the `drizzle.__drizzle_migrations` table.
 *
 * Connects as the *superuser* (POSTGRES_SUPERUSER / POSTGRES_SUPERUSER_PASSWORD),
 * because:
 *   - DDL like `CREATE TABLE`, `ALTER TABLE ENABLE ROW LEVEL SECURITY`, and
 *     `CREATE POLICY` requires ownership / BYPASSRLS.
 *   - The runtime `app` role intentionally has neither (see T-010 init/01-app-role.sql)
 *     — that's the whole reason RLS bites it.
 *
 * Connection-string precedence:
 *   1. `DATABASE_URL` — explicit override (CI, hosted Supabase, etc.).
 *   2. Built from POSTGRES_SUPERUSER + POSTGRES_SUPERUSER_PASSWORD + host/port/db.
 *
 * Idempotency: drizzle-orm's `migrate()` skips any migration whose hash is
 * already in the journal. Re-running the script after a successful run is
 * a no-op and exits 0 (which the smoke test relies on).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenvFlow from "dotenv-flow";
import { existsSync } from "node:fs";
import { join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
// services/api/src/db -> services/api -> root via 4 levels up to monorepo root.
const repoRoot = (() => {
  let dir = here;
  for (let depth = 0; depth < 10; depth++) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return here;
})();

if (process.env["CONFIG_SKIP_DOTENV"] !== "1") {
  dotenvFlow.config({ path: repoRoot, silent: true });
}

function migrationConnectionString(): string {
  if (process.env["DATABASE_URL"]) return process.env["DATABASE_URL"];
  const host = process.env["POSTGRES_HOST"] ?? "localhost";
  const port = process.env["POSTGRES_PORT"] ?? "5432";
  const db = process.env["POSTGRES_DB"] ?? "vidgen";
  const user = process.env["POSTGRES_SUPERUSER"] ?? "postgres";
  const password = process.env["POSTGRES_SUPERUSER_PASSWORD"] ?? "change-me";
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}`;
}

async function main(): Promise<void> {
  const url = migrationConnectionString();
  // A single connection is plenty for migrations; postgres.js multiplexes
  // the journal lookups onto it. Limiting `max: 1` also gives us
  // deterministic ordering of advisory locks (drizzle takes one).
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  const db = drizzle(sql);

  const migrationsFolder = resolve(here, "../../migrations");
  console.log(`[db:migrate] applying migrations from ${migrationsFolder}`);
  try {
    await migrate(db, {
      migrationsFolder,
      migrationsTable: "__drizzle_migrations",
      migrationsSchema: "drizzle",
    });
    console.log("[db:migrate] OK — schema is up to date");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error("[db:migrate] failed:", err);
  process.exit(1);
});
