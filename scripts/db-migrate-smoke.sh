#!/usr/bin/env bash
# vidgen — Database migration + RLS smoke script (T-011)
#
# Verifies every acceptance criterion of T-011:
#   1. `pnpm db:migrate` is idempotent — applying twice leaves the schema
#      unchanged and exits 0 both times.
#   2. The `app` role, with `app.workspace_id` unset, returns zero rows
#      from any tenant table.
#   3. With `SET LOCAL app.workspace_id = 'ws-alpha'`, the same app role
#      sees only rows belonging to ws-alpha — and switching to ws-beta
#      flips the visible set.
#   4. The `embeddings.embedding` column has the `vector(1024)` type.
#
# Exit codes:
#   0 -> all checks passed
#   1 -> at least one check failed (stderr explains which)
#
# Usage:
#   bash scripts/db-migrate-smoke.sh
#
# Assumes:
#   - `docker compose --profile core up -d postgres` has been run.
#   - `pnpm install` has been run (drizzle + postgres deps available).
#   - Default app password in init/01-app-role.sql is `change-me`.
#
# Idempotency: this script seeds two tenants per run; existing seed rows
# are tolerated via ON CONFLICT DO NOTHING.

set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
COMPOSE_DIR="${COMPOSE_DIR:-$REPO_ROOT/infra/compose}"
API_DIR="${API_DIR:-$REPO_ROOT/services/api}"
DB="${POSTGRES_DB:-vidgen}"
SUPER="${POSTGRES_SUPERUSER:-postgres}"
SUPER_PASS="${POSTGRES_SUPERUSER_PASSWORD:-change-me}"
APP_USER="${POSTGRES_USER:-app}"
APP_PASS="${POSTGRES_PASSWORD:-change-me}"
SERVICE="${POSTGRES_SERVICE:-postgres}"
HOST="${POSTGRES_HOST:-localhost}"
PORT="${POSTGRES_PORT:-5432}"

pass() { echo "  ✓ $*"; }
fail() { echo "FAIL: $*" >&2; exit 1; }

run_psql_super() {
  docker compose -f "$COMPOSE_DIR/docker-compose.yml" exec -T "$SERVICE" \
    psql -U "$SUPER" -d "$DB" -tAq -v ON_ERROR_STOP=1 -c "$1"
}
run_psql_app() {
  docker compose -f "$COMPOSE_DIR/docker-compose.yml" exec -T -e PGPASSWORD="$APP_PASS" "$SERVICE" \
    psql -U "$APP_USER" -d "$DB" -tAq -v ON_ERROR_STOP=1 -c "$1"
}

echo "T-011 db-migrate smoke — repo: $REPO_ROOT"

# ---- 0. container healthy ------------------------------------------------
echo "[0/5] container health"
health=$(docker inspect --format '{{.State.Health.Status}}' "vidgen-postgres" 2>/dev/null || echo missing)
[[ "$health" == "healthy" ]] || fail "postgres container '$health' (run: docker compose --profile core up -d postgres)"
pass "vidgen-postgres healthy"

# ---- 1. migrate idempotency ---------------------------------------------
echo "[1/5] pnpm db:migrate twice (idempotency)"
cd "$API_DIR"
export CONFIG_SKIP_DOTENV=1
export POSTGRES_HOST="$HOST" POSTGRES_PORT="$PORT" POSTGRES_DB="$DB"
export POSTGRES_SUPERUSER="$SUPER" POSTGRES_SUPERUSER_PASSWORD="$SUPER_PASS"
pnpm -s db:migrate >/tmp/vidgen-db-migrate.1.log 2>&1 || { cat /tmp/vidgen-db-migrate.1.log; fail "first migrate failed"; }
pass "first migrate OK"
pnpm -s db:migrate >/tmp/vidgen-db-migrate.2.log 2>&1 || { cat /tmp/vidgen-db-migrate.2.log; fail "second migrate failed"; }
pass "second migrate OK (idempotent)"

# Ensure schema actually exists
got=$(run_psql_super "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r';")
[[ "$got" == "20" ]] || fail "expected 20 tables in public schema, got $got"
pass "20 tables present"

# ---- 2. seed two workspaces ---------------------------------------------
echo "[2/5] seed two workspaces (ws-alpha, ws-beta)"
run_psql_super "
  INSERT INTO tenants (workspace_id, name) VALUES ('ws-alpha','alpha'),('ws-beta','beta')
    ON CONFLICT (workspace_id) DO NOTHING;
  INSERT INTO assets (workspace_id, source_uri, sha256, mime) VALUES
    ('ws-alpha','s3://media-raw/ws-alpha/a','sha-alpha-1','video/mp4'),
    ('ws-beta', 's3://media-raw/ws-beta/b', 'sha-beta-1', 'video/mp4')
    ON CONFLICT (workspace_id, sha256) DO NOTHING;
  -- Users + memberships (idempotent: only insert if email not present).
  INSERT INTO users (email)
    SELECT 'alice@alpha' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='alice@alpha');
  INSERT INTO users (email)
    SELECT 'bob@beta' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='bob@beta');
  INSERT INTO tenant_members (workspace_id, user_id, role)
    SELECT 'ws-alpha', user_id, 'owner' FROM users WHERE email='alice@alpha'
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  INSERT INTO tenant_members (workspace_id, user_id, role)
    SELECT 'ws-beta', user_id, 'owner' FROM users WHERE email='bob@beta'
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
" >/dev/null
pass "seeded ws-alpha, ws-beta"

# ---- 3. app role + unset GUC => zero rows everywhere ---------------------
echo "[3/5] app role, GUC unset => 0 rows everywhere"
# Iterate every tenant table; treat each non-zero count as a failure.
for t in tenants users tenant_members assets renditions projects project_clips \
         transcripts transcript_segments transcript_words captions edits renders \
         workflows comments audit_log embeddings share_links oauth_connections \
         webhooks; do
  c=$(run_psql_app "SELECT count(*) FROM ${t};")
  [[ "$c" == "0" ]] || fail "table '${t}' visible without GUC (count=${c})"
done
pass "all 20 tables: 0 rows visible without GUC"

# ---- 4. app role + SET LOCAL => matching rows only ----------------------
echo "[4/5] app role, GUC set to ws-alpha then ws-beta => only matching rows"
alpha=$(run_psql_app "BEGIN; SET LOCAL app.workspace_id = 'ws-alpha';
  SELECT source_uri FROM assets;
  COMMIT;")
[[ "$alpha" == "s3://media-raw/ws-alpha/a" ]] || fail "ws-alpha expected its asset, got: $alpha"
pass "ws-alpha sees only its asset"

beta=$(run_psql_app "BEGIN; SET LOCAL app.workspace_id = 'ws-beta';
  SELECT source_uri FROM assets;
  COMMIT;")
[[ "$beta" == "s3://media-raw/ws-beta/b" ]] || fail "ws-beta expected its asset, got: $beta"
pass "ws-beta sees only its asset"

# users via tenant_members policy
alpha_user=$(run_psql_app "BEGIN; SET LOCAL app.workspace_id = 'ws-alpha';
  SELECT email FROM users;
  COMMIT;")
[[ "$alpha_user" == "alice@alpha" ]] || fail "ws-alpha users policy broken; got: $alpha_user"
pass "users policy via tenant_members works (alpha sees alice only)"

# ---- 5. embedding column is vector(1024) ---------------------------------
echo "[5/5] embeddings.embedding has type vector(1024)"
got=$(run_psql_super "SELECT format_type(atttypid, atttypmod)
  FROM pg_attribute
  WHERE attrelid='public.embeddings'::regclass AND attname='embedding';")
[[ "$got" == "vector(1024)" ]] || fail "embedding column is '$got', expected 'vector(1024)'"
pass "embeddings.embedding is vector(1024)"

echo
echo "ALL CHECKS PASSED"
