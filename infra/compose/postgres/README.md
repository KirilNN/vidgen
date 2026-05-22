# `infra/compose/postgres/` — Postgres 16 + pgvector

Custom image and init scripts for the project's primary OLTP store.
Delivered by [T-010](../../../docs/tickets.md#t-010--postgres-16-service-with-extensions--rls-bootstrap-).

## Purpose

- Run Postgres 16 with `pgvector`, `pg_trgm`, and `pgcrypto` preinstalled.
- Create a non-superuser `app` login role used by every service.
- Install a `current_workspace_id()` helper that the RLS policies in T-011
  use to gate every tenant table by `workspace_id`.

Architecture references: [`architecture.md` §5.1](../../../docs/architecture.md)
(stores) and §11 (multi-tenant isolation).

## Image

```
FROM pgvector/pgvector:pg16
COPY init/ /docker-entrypoint-initdb.d/
```

- Base is the official `pgvector/pgvector:pg16` (multi-arch: amd64, arm64).
- `pg_trgm` and `pgcrypto` are part of `postgresql-contrib`, already bundled
  in the base image — no extra `apt install` needed.
- Init scripts run **once** on first cluster init (i.e. when `PGDATA` is
  empty). On subsequent boots the persisted `pg_data` volume is reused and
  init is skipped — exactly the behaviour we want for idempotency.

## Init scripts (lexical order)

| File                      | Purpose                                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init/00-extensions.sql`  | `CREATE EXTENSION` for `vector`, `pg_trgm`, `pgcrypto` in the app database.                                                                                                 |
| `init/01-app-role.sql`    | Idempotent `app` role + `CONNECT` / `USAGE` / default privileges. Password sourced from `APP_DB_PASSWORD`.                                                                  |
| `init/02-rls-helpers.sql` | `public.current_workspace_id()` returning `NULLIF(current_setting('app.workspace_id', true), '')`. Includes a built-in self-test that fails init if the contract regresses. |

## Run

From `infra/compose/`:

```bash
cp .env.example .env                              # edit secrets first

# Build + start Postgres only (core profile pulls in postgres):
docker compose --profile core up -d postgres

# Wait for healthy:
docker compose ps postgres
#   STATUS: Up (healthy)

# Connect as the app role (RLS-enforced; never use the superuser from code):
docker compose exec postgres \
  psql -U "${POSTGRES_USER:-app}" -d "${POSTGRES_DB:-vidgen}"
```

Defaults if `.env` is absent: cluster superuser `postgres`/`change-me`,
service role `app`/`change-me`, database `vidgen`, host port `5432`.
**Never deploy with `change-me`.**

## Verifying acceptance (T-010)

```bash
# 1) Extensions installed
docker compose exec postgres \
  psql -U postgres -d vidgen -tAc \
  "SELECT extname FROM pg_extension WHERE extname IN ('vector','pg_trgm','pgcrypto') ORDER BY 1;"
# → pg_trgm
#   pgcrypto
#   vector

# 2) Helper returns NULL unset, value when set
docker compose exec postgres \
  psql -U postgres -d vidgen -tAc \
  "SELECT current_workspace_id();"
# → (empty, NULL)

docker compose exec postgres \
  psql -U postgres -d vidgen -tAc \
  "BEGIN; SET LOCAL app.workspace_id = 'abc'; SELECT current_workspace_id(); ROLLBACK;"
# → abc

# 3) App role exists and is non-superuser / non-BYPASSRLS
docker compose exec postgres \
  psql -U postgres -d vidgen -tAc \
  "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname='app';"
# → app|f|f
```

A scripted version lives at `scripts/postgres-smoke.sh` (run as
`bash scripts/postgres-smoke.sh` from the repo root).

## Configuration

Variables consumed by the service (defaults shown):

| Env var                       | Default     | Purpose                                                                 |
| ----------------------------- | ----------- | ----------------------------------------------------------------------- |
| `POSTGRES_SUPERUSER`          | `postgres`  | Cluster superuser. Used by migrations and operators only.               |
| `POSTGRES_SUPERUSER_PASSWORD` | `change-me` | Superuser password.                                                     |
| `POSTGRES_USER`               | `app`       | Service-facing role created by init/01-app-role.sql. RLS applies to it. |
| `POSTGRES_PASSWORD`           | `change-me` | Service role password (forwarded to init as `APP_DB_PASSWORD`).         |
| `POSTGRES_DB`                 | `vidgen`    | App database name.                                                      |
| `POSTGRES_PORT`               | `5432`      | Host port mapping (container always listens on 5432).                   |

`POSTGRES_USER` is **not** the superuser — that's intentional. The official
postgres entrypoint creates `POSTGRES_USER` with SUPERUSER, which would
bypass RLS. So we map the container's `POSTGRES_USER` env to
`POSTGRES_SUPERUSER`, then create a separate non-superuser role from
`APP_DB_USER`/`APP_DB_PASSWORD` (= the service-facing `POSTGRES_USER`/
`POSTGRES_PASSWORD` in the app's env namespace).

| Connects as             | Used for                                                                  |
| ----------------------- | ------------------------------------------------------------------------- |
| `POSTGRES_SUPERUSER`    | T-011 migrations (`ALTER TABLE ... ENABLE RLS`), operators, `psql` admin. |
| `POSTGRES_USER` (`app`) | Every service at runtime. RLS applies.                                    |

## Out of scope (per ticket)

- The concrete tenant schema (`tenants`, `assets`, …) and its RLS policies —
  these land in **T-011** via Drizzle migrations.
- Replication / backup — owned by the deploy phase (T-210+).
- TLS termination — handled by Caddy (T-014).
