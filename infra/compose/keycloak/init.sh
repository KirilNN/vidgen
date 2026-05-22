#!/usr/bin/env sh
# vidgen — Keycloak DB + realm prep sidecar (T-013)
#
# Runs once per `docker compose up`, before the keycloak server starts.
#
# Responsibilities:
#
#   1. Make sure the dedicated Postgres database + role for Keycloak exist.
#      Keycloak does not create its own DB and the T-010 postgres init scripts
#      only run on first cluster bootstrap (they'd skip an existing volume).
#      We therefore use psql + `\gexec` against the *live* cluster for an
#      idempotent CREATE DATABASE / CREATE USER, leaving T-010's territory
#      untouched.
#
#   2. Render the realm import file at $KEYCLOAK_IMPORT_DIR/app-realm.json:
#         - When ENV=dev, copy realm-export.json verbatim (dev user enabled).
#         - Otherwise, strip the `users` array so no test credentials land
#           in non-dev environments. This satisfies the T-013 acceptance
#           note "test user dev@local / dev (only when ENV=dev)".
#      The shared volume is mounted into the keycloak container at the path
#      it imports from on startup (`--import-realm`).
#
# Idempotent: safe to run on every boot.

set -eu

ENV_NAME="${ENV:-dev}"
PGHOST="${POSTGRES_HOST:-postgres}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_SUPERUSER:-postgres}"
PGPASSWORD="${POSTGRES_SUPERUSER_PASSWORD:?POSTGRES_SUPERUSER_PASSWORD is required}"
PGDATABASE_BOOT="${POSTGRES_DB:-postgres}"
export PGHOST PGPORT PGUSER PGPASSWORD

KC_DB="${KEYCLOAK_DB_NAME:-keycloak}"
KC_DB_USER="${KEYCLOAK_DB_USER:-keycloak}"
KC_DB_PASS="${KEYCLOAK_DB_PASSWORD:?KEYCLOAK_DB_PASSWORD is required}"
# Realm-import secret materialization (jq substitutes this into the rendered
# realm file). Read here so set -u fails fast if it's missing.
KC_CLIENT_SECRET_API="${KEYCLOAK_CLIENT_SECRET_API:?KEYCLOAK_CLIENT_SECRET_API is required}"

SRC="${KEYCLOAK_REALM_SRC:-/realm-src/realm-export.json}"
OUT_DIR="${KEYCLOAK_IMPORT_DIR:-/shared/realm}"
OUT="${OUT_DIR}/app-realm.json"

log() { printf '[keycloak-init] %s\n' "$*"; }
warn() { printf '[keycloak-init] WARN: %s\n' "$*" >&2; }

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

# ---- 2. create role + database if missing -------------------------------
log "ensuring role '$KC_DB_USER' and database '$KC_DB' exist"

# 2a. role (idempotent CREATE then ALTER for the password).
#     We rely on psql -v substitution + format()/%I /%L for safe quoting.
psql -v ON_ERROR_STOP=1 -d "$PGDATABASE_BOOT" \
  -v kc_user="$KC_DB_USER" -v kc_pass="$KC_DB_PASS" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'kc_user', :'kc_pass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'kc_user')
\gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'kc_user', :'kc_pass')
\gexec
SQL

# 2b. database (cannot run inside a transaction block; \gexec auto-commits
#     each top-level command).
psql -v ON_ERROR_STOP=1 -d "$PGDATABASE_BOOT" \
  -v kc_db="$KC_DB" -v kc_user="$KC_DB_USER" <<'SQL'
SELECT format('CREATE DATABASE %I OWNER %I', :'kc_db', :'kc_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'kc_db')
\gexec

SELECT format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', :'kc_db', :'kc_user')
\gexec
SQL

log "postgres prep done"

# ---- 3. render realm import file ---------------------------------------
mkdir -p "$OUT_DIR"

if [ ! -f "$SRC" ]; then
  warn "source realm file not found at $SRC"
  exit 1
fi

if [ "$ENV_NAME" = "dev" ]; then
  log "ENV=$ENV_NAME — including dev test user (dev@local) in realm import"
  USERS_FILTER='.'
else
  log "ENV=$ENV_NAME — stripping users[] from realm import (no dev user)"
  USERS_FILTER='.users = []'
fi

# We always re-render via jq so that the confidential client secret is
# materialized from $KEYCLOAK_CLIENT_SECRET_API. Keycloak's realm import does
# NOT process `${env.VAR}` placeholders inside imported JSON (that syntax is
# for the WildFly server config layer, not realm-import), so the substitution
# has to happen here.
#
# jq isn't bundled in the postgres:16-alpine base image (this script's
# runtime). The install is small (~200 KB) and idempotent.
if ! command -v jq >/dev/null 2>&1; then
  log "installing jq (one-time)"
  apk add --no-cache --quiet jq >/dev/null
fi

jq \
  --arg client_id_api "${KEYCLOAK_CLIENT_ID_API:-app-api}" \
  --arg api_secret "${KEYCLOAK_CLIENT_SECRET_API:-change-me}" \
  '
    # 1. Materialize the app-api client secret from the env var.
    .clients |= map(
      if .clientId == $client_id_api then .secret = $api_secret else . end
    )
    # 2. Conditionally strip dev users (filter applied next).
    | '"$USERS_FILTER"'
  ' \
  "$SRC" > "$OUT"

log "realm import written to $OUT ($(wc -c < "$OUT") bytes)"

# ---- 4. dev-default warnings -------------------------------------------
if [ "${KEYCLOAK_ADMIN_PASSWORD:-}" = "change-me" ]; then
  warn "KEYCLOAK_ADMIN_PASSWORD is still the dev sentinel. Rotate before exposing."
fi
if [ "${KEYCLOAK_CLIENT_SECRET_API:-}" = "change-me" ]; then
  warn "KEYCLOAK_CLIENT_SECRET_API is still the dev sentinel. Rotate before exposing."
fi

log "bootstrap complete"
