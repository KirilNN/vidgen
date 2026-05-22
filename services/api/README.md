# @vidgen/api

Fastify API gateway (skeleton scaffolded by T-001; database layer landed
in T-011; HTTP server lands in T-015).

## Purpose

- Holds the validated env (`src/config.ts`).
- Owns the OpenAPI spec accessor (`src/openapi.ts`).
- Owns the **Drizzle** schema + migrations (`src/db/`) for the Postgres
  control plane (arch §5.2, §11). Postgres stores **metadata only** —
  media bytes live in object storage.

## Run

Lint / type-check / test the package on its own:

```bash
pnpm --filter @vidgen/api lint
pnpm --filter @vidgen/api type-check
pnpm --filter @vidgen/api test
```

## Database (T-011)

Schema is declared in `src/db/schema.ts`. Migrations live in `migrations/`
and are tracked in `drizzle.__drizzle_migrations`.

### Generate a new migration after editing the schema

```bash
pnpm --filter @vidgen/api db:generate -- --name <slug>
```

This calls `drizzle-kit generate`, which diffs the TypeScript schema
against the last snapshot in `migrations/meta/` and writes a numbered
SQL file. **Review and commit** the generated SQL.

For migrations that the schema diff can't express (e.g. RLS policies,
CHECK constraints, triggers), generate an empty file and edit it:

```bash
pnpm --filter @vidgen/api db:generate -- --custom --name rls_or_whatever
```

### Apply migrations

```bash
# from anywhere in the repo
pnpm db:migrate

# or, from services/api directly
pnpm --filter @vidgen/api db:migrate
```

Connects as the **superuser** (POSTGRES_SUPERUSER / POSTGRES_SUPERUSER_PASSWORD,
or DATABASE_URL if set) because DDL like `CREATE POLICY` requires
ownership. Re-runs are no-ops — the script is idempotent.

### Runtime DB usage

Services open a per-request transaction that sets `app.workspace_id`
before any query. Use the helper:

```ts
import { withWorkspace, schema } from "./db/client.js";

await withWorkspace(req.workspaceId, async (db) => {
  return db.select().from(schema.assets);
});
```

The transaction context (1) ensures `SET LOCAL` is rolled back at end and
(2) makes every read/write RLS-bound to the caller's workspace. The
runtime client uses the non-superuser `app` role so RLS actually applies
(arch §11; T-010 init scripts).

### Smoke test the database

```bash
bash scripts/db-migrate-smoke.sh
```

Brings up Postgres (`docker compose --profile core up -d postgres` first)
and verifies: migrations idempotent, RLS blocks the app role with the
GUC unset, RLS shows only matching rows with the GUC set, and the
`embeddings.embedding` column is `vector(1024)`.
