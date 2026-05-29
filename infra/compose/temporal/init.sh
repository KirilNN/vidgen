#!/usr/bin/env sh
# vidgen — Temporal DB + role prep sidecar (T-020)
#
# Architecture references:
#   - docs/architecture.md §6.1 — Temporal is the spine for every long op.
#   - docs/architecture.md §5.1 — Postgres holds metadata only; we reuse the
#     T-010 Postgres cluster for the two Temporal databases (history +
#     visibility) rather than spinning up a dedicated Postgres container.
#
# Runs once per `docker compose up`, before the temporal server starts.
#
# Responsibilities:
#
#   1. Create a dedicated Postgres LOGIN role (`temporal`) inside the
#      T-010 cluster. Non-superuser, no BYPASSRLS, no CREATEDB — the
#      Temporal server connects as this role for normal operations and
#      relies on this script having pre-created the DBs (we set
#      `SKIP_DB_CREATE=true` on the auto-setup container).
#
#   2. Create the two databases Temporal needs:
#        * `temporal`              — workflow history / mutable state.
#        * `temporal_visibility`   — list-workflows API backing store.
#      Both owned by the `temporal` role so schema migrations run by the
#      auto-setup container can create/alter tables without a SUPERUSER.
#
# T-010's postgres init/*.sql only runs on first cluster bootstrap; on an
# existing pg_data volume those scripts are silently skipped — so we do
# this work imperatively here, idempotent on every boot.
#
# Idempotency uses the same `SELECT format(...) WHERE NOT EXISTS ... \gexec`
# pattern as keycloak/init.sh (Postgres has no native `CREATE ROLE IF NOT
# EXISTS` / `CREATE DATABASE IF NOT EXISTS`).

set -eu

PGHOST="${POSTGRES_HOST:-postgres}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_SUPERUSER:-postgres}"
PGPASSWORD="${POSTGRES_SUPERUSER_PASSWORD:?POSTGRES_SUPERUSER_PASSWORD is required}"
PGDATABASE_BOOT="${POSTGRES_DB:-postgres}"
export PGHOST PGPORT PGUSER PGPASSWORD

TMP_USER="${TEMPORAL_DB_USER:-temporal}"
TMP_PASS="${TEMPORAL_DB_PASSWORD:?TEMPORAL_DB_PASSWORD is required}"
TMP_DB="${TEMPORAL_DB_NAME:-temporal}"
TMP_VIS_DB="${TEMPORAL_VISIBILITY_DB_NAME:-temporal_visibility}"

log() { printf '[temporal-init] %s\n' "$*"; }
warn() { printf '[temporal-init] WARN: %s\n' "$*" >&2; }

# ---- 1. wait for postgres ------------------------------------------------
log "waiting for postgres at $PGHOST:$PGPORT"
i=0
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE_BOOT" -q; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    warn "postgres did not become ready within 60s"
    exit 1
  fi
  sleep 2
done
log "postgres is ready"

# ---- 2. create role if missing, always reset its password ---------------
log "ensuring role '$TMP_USER' exists"

psql -v ON_ERROR_STOP=1 -d "$PGDATABASE_BOOT" \
  -v tmp_user="$TMP_USER" -v tmp_pass="$TMP_PASS" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'tmp_user', :'tmp_pass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'tmp_user')
\gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'tmp_user', :'tmp_pass')
\gexec
SQL

# ---- 3. create both databases if missing --------------------------------
log "ensuring databases '$TMP_DB' and '$TMP_VIS_DB' exist"

# CREATE DATABASE cannot run inside a transaction block; \gexec auto-commits
# each top-level command. We pass each DB name as a separate -v variable so
# both are owned by the temporal role and Temporal's schema migrations can
# run without SUPERUSER.
psql -v ON_ERROR_STOP=1 -d "$PGDATABASE_BOOT" \
  -v tmp_user="$TMP_USER" \
  -v tmp_db="$TMP_DB" \
  -v tmp_vis_db="$TMP_VIS_DB" <<'SQL'
SELECT format('CREATE DATABASE %I OWNER %I', :'tmp_db', :'tmp_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'tmp_db')
\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'tmp_vis_db', :'tmp_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'tmp_vis_db')
\gexec

SELECT format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', :'tmp_db', :'tmp_user')
\gexec

SELECT format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', :'tmp_vis_db', :'tmp_user')
\gexec
SQL

log "postgres prep done"

# ---- 4. dev-default warnings -------------------------------------------
if [ "${TEMPORAL_DB_PASSWORD:-}" = "change-me" ]; then
  warn "TEMPORAL_DB_PASSWORD is still the dev sentinel. Rotate before exposing."
fi

log "bootstrap complete"
