# services/api/src/db

Drizzle ORM schema, runtime client, and migration runner for the API
service (T-011).

## Files

| File         | Purpose                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `schema.ts`  | TypeScript declarations for every table in `architecture.md §5.2`. The single source of truth for the Postgres schema.                                             |
| `client.ts`  | Lazy postgres.js pool + `getDb()` + `withWorkspace()` — the per-request transaction helper that sets `SET LOCAL app.workspace_id` so RLS policies (arch §11) bite. |
| `migrate.ts` | CLI entry for `pnpm db:migrate`. Connects as the superuser (DDL needs ownership) and applies every file under `services/api/migrations/`.                          |

## Conventions

- **Every tenant table carries `workspace_id text`** with a foreign key to
  `tenants.workspace_id`. The exception is `users`, where visibility is
  enforced via `tenant_members` in `migrations/0001_rls_policies.sql`.
- **`workspace_id` is `text`** so it matches the return type of the
  `current_workspace_id()` helper from T-010 (no casts in RLS predicates).
- **Surrogate `uuid` PKs** with `gen_random_uuid()` (pgcrypto). Exception:
  `tenants` uses `workspace_id` itself as the PK; `audit_log` uses
  `bigserial` for monotonic ordering; `workflows` mirrors Temporal's text
  workflow id; `share_links` uses an opaque token.
- **No media bytes in Postgres** (arch §5.1). Use `text` columns to store
  S3-style URIs into MinIO/R2.

## Adding a new table

1. Append it to `schema.ts`, including a `workspace_id` column unless you
   have an explicit reason not to.
2. Add it to the `ALL_TABLE_NAMES` array in the same file — the test in
   `src/__tests__/schema.rls.test.ts` will fail otherwise.
3. Generate the migration: `pnpm --filter @vidgen/api db:generate -- --name <slug>`.
4. Generate a custom RLS migration:
   `pnpm --filter @vidgen/api db:generate -- --custom --name rls_<slug>`,
   then add:
   ```sql
   ALTER TABLE "your_table" ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "workspace_isolation" ON "your_table"
     FOR ALL
     USING  (workspace_id = current_workspace_id())
     WITH CHECK (workspace_id = current_workspace_id());
   ```
5. Update the assertion list in `migrations/0001_rls_policies.sql`'s
   `DO $$ ... $$` self-test if you want the migration itself to fail-fast
   on missed coverage (optional, but the unit test already enforces it).
6. Apply: `pnpm db:migrate`.
7. Re-run `bash scripts/db-migrate-smoke.sh` to prove the new table is
   RLS-bound.
