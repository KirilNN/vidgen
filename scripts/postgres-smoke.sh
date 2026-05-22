#!/usr/bin/env bash
# vidgen — Postgres smoke script (T-010)
#
# Verifies that the `postgres` service in the `core` profile satisfies the
# acceptance criteria from docs/tickets.md#T-010:
#   1. Container reports healthy.
#   2. pgvector, pg_trgm, pgcrypto are installed in the app database.
#   3. current_workspace_id() returns NULL when unset.
#   4. current_workspace_id() returns the value set via SET LOCAL.
#   5. The non-superuser `app` role exists and does NOT bypass RLS.
#
# Exit codes:
#   0 -> all checks passed
#   1 -> at least one check failed (stderr explains which)
#
# Usage:
#   bash scripts/postgres-smoke.sh
#
# Assumes `docker compose --profile core up -d postgres` has already been
# run from infra/compose/. Re-running this script is idempotent.

set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-$(cd "$(dirname "$0")/.." && pwd)/infra/compose}"
DB="${POSTGRES_DB:-vidgen}"
SUPER="${POSTGRES_SUPERUSER:-postgres}"
APP_USER="${POSTGRES_USER:-app}"
SERVICE="${POSTGRES_SERVICE:-postgres}"

cd "$COMPOSE_DIR"

run_psql() {
  # -tA  : tuples-only, unaligned (clean output for grep / [[ ]])
  # -v ON_ERROR_STOP=1 : a SQL error fails the script
  docker compose exec -T "$SERVICE" \
    psql -U "$SUPER" -d "$DB" -tA -v ON_ERROR_STOP=1 -c "$1"
}

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

pass() {
  echo "  ✓ $*"
}

echo "T-010 postgres smoke — compose dir: $COMPOSE_DIR"

# ---- 1. healthy ----------------------------------------------------------
echo "[1/5] container health"
health=$(docker inspect --format '{{.State.Health.Status}}' "vidgen-postgres" 2>/dev/null || echo missing)
[[ "$health" == "healthy" ]] || fail "container health is '$health' (want 'healthy'). Run: docker compose --profile core up -d postgres"
pass "container vidgen-postgres is healthy"

# ---- 2. extensions -------------------------------------------------------
echo "[2/5] extensions"
got=$(run_psql "SELECT string_agg(extname, ',' ORDER BY extname) FROM pg_extension WHERE extname IN ('vector','pg_trgm','pgcrypto');")
want="pg_trgm,pgcrypto,vector"
[[ "$got" == "$want" ]] || fail "extensions: got '$got', want '$want'"
pass "pgvector, pg_trgm, pgcrypto installed"

# ---- 3. helper returns NULL when unset ----------------------------------
echo "[3/5] current_workspace_id() unset -> NULL"
got=$(run_psql "SELECT current_workspace_id() IS NULL;")
[[ "$got" == "t" ]] || fail "current_workspace_id() unset should be NULL; got '$got'"
pass "returns NULL when GUC unset"

# ---- 4. helper returns set value ----------------------------------------
echo "[4/5] current_workspace_id() set -> value"
# Use set_config(...) inline so the whole thing is one SELECT — avoids
# BEGIN/SET/ROLLBACK noise psql otherwise prints. is_local=true scopes the
# GUC to the transaction; the implicit single-statement transaction ends
# immediately, so this leaks nothing.
got=$(run_psql "SELECT current_workspace_id() FROM (SELECT set_config('app.workspace_id','abc',true)) AS _;")
[[ "$got" == "abc" ]] || fail "current_workspace_id() set should be 'abc'; got '$got'"
pass "returns 'abc' when GUC SET LOCAL"

# ---- 5. app role exists and is RLS-bound --------------------------------
echo "[5/5] app role is non-superuser and respects RLS"
# psql 16 prints booleans as 't'/'f' for single-column ::bool selects but
# concatenation via || coerces to text 'true'/'false'. Cast to char(1) so
# we get a stable single-letter form regardless of psql version.
got=$(run_psql "SELECT rolname || '|' || CASE WHEN rolsuper THEN 't' ELSE 'f' END || '|' || CASE WHEN rolbypassrls THEN 't' ELSE 'f' END FROM pg_roles WHERE rolname='${APP_USER}';")
[[ "$got" == "${APP_USER}|f|f" ]] || fail "app role check failed; got '$got' (want '${APP_USER}|f|f')"
pass "${APP_USER} role: super=f, bypassrls=f"

echo
echo "ALL CHECKS PASSED"
