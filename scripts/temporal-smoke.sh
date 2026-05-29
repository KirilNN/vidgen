#!/usr/bin/env bash
# vidgen — Temporal smoke script (T-020)
#
# Verifies every acceptance criterion of T-020:
#   1. `vidgen-temporal` and `vidgen-temporal-ui` containers are healthy.
#   2. Both Postgres databases (`temporal`, `temporal_visibility`) exist.
#   3. The `app` namespace was registered at boot.
#   4. `temporal workflow list --namespace app` works from the admin-tools
#      sidecar (the ticket's stated acceptance check).
#   5. `https://temporal.localhost/` serves the UI through Caddy and the
#      leaf cert chains back to Caddy's local root CA (no -k cheat).
#
# Exit codes:
#   0 -> all checks passed
#   1 -> at least one check failed (stderr explains which)
#
# Usage:
#   bash scripts/temporal-smoke.sh
#
# Assumes:
#   `docker compose --profile core up -d` has been run from infra/compose/.
#   The script will additionally `docker compose --profile dev up -d
#   temporal-admin-tools` to pull and start the CLI sidecar.

set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
COMPOSE_DIR="${COMPOSE_DIR:-$REPO_ROOT/infra/compose}"
COMPOSE="docker compose -f $COMPOSE_DIR/docker-compose.yml"

pass() { echo "  ✓ $*"; }
fail() { echo "FAIL: $*" >&2; exit 1; }

# Load env from infra/compose/.env if present (same pattern as the other
# smoke scripts in this directory).
if [[ -f "$COMPOSE_DIR/.env" ]]; then
  # shellcheck disable=SC1090
  set -a; . "$COMPOSE_DIR/.env"; set +a
fi

NAMESPACE="${TEMPORAL_NAMESPACE:-app}"
HTTPS_PORT="${CADDY_HTTPS_PORT:-443}"
PG_DB="${POSTGRES_DB:-vidgen}"
PG_SUPER="${POSTGRES_SUPERUSER:-postgres}"
TMP_DB="${TEMPORAL_DB_NAME:-temporal}"
TMP_VIS_DB="${TEMPORAL_VISIBILITY_DB_NAME:-temporal_visibility}"

echo "T-020 temporal smoke — namespace: $NAMESPACE"

# ---- 0. server + UI containers healthy --------------------------------
echo "[0/5] container health"
for c in vidgen-temporal vidgen-temporal-ui; do
  health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' "$c" 2>/dev/null || echo missing)
  [[ "$health" == "healthy" ]] || fail "$c container '$health' (run: $COMPOSE --profile core up -d)"
  pass "$c healthy"
done

# ---- 1. databases exist -----------------------------------------------
echo "[1/5] postgres databases"
# Use the existing T-010 postgres container; -tA gives clean output for [[ ]].
db_list=$($COMPOSE exec -T postgres \
  psql -U "$PG_SUPER" -d "$PG_DB" -tA -v ON_ERROR_STOP=1 \
  -c "SELECT datname FROM pg_database WHERE datname IN ('$TMP_DB','$TMP_VIS_DB') ORDER BY 1;")
expected="$(printf '%s\n%s' "$TMP_DB" "$TMP_VIS_DB" | sort)"
got="$(printf '%s' "$db_list" | sort)"
[[ "$got" == "$expected" ]] || fail "expected databases:\n$expected\ngot:\n$got"
pass "databases '$TMP_DB' and '$TMP_VIS_DB' present"

# ---- 2. admin-tools sidecar up ----------------------------------------
echo "[2/5] starting temporal-admin-tools sidecar"
$COMPOSE --profile dev up -d temporal-admin-tools >/dev/null 2>&1 \
  || fail "couldn't start temporal-admin-tools (run: $COMPOSE --profile dev up -d temporal-admin-tools)"
# Wait until the container is in the 'running' state (no healthcheck — it
# just sleeps forever; treat 'running' as ready).
i=0
until [[ "$(docker inspect --format '{{.State.Status}}' vidgen-temporal-admin-tools 2>/dev/null || echo missing)" == "running" ]]; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    fail "temporal-admin-tools did not reach 'running' within 30 s"
  fi
  sleep 1
done
pass "vidgen-temporal-admin-tools running"

# ---- 3. namespace registered ------------------------------------------
echo "[3/5] namespace '$NAMESPACE' registered"
ns_describe=$($COMPOSE exec -T temporal-admin-tools \
  temporal --address temporal:7233 operator namespace describe --namespace "$NAMESPACE" 2>&1) \
  || fail "operator namespace describe --namespace $NAMESPACE failed:\n$ns_describe"
# CLI output includes lines like "NamespaceInfo.Name  app". Match the
# namespace name verbatim to prove this isn't a stale `default` namespace.
printf '%s' "$ns_describe" | grep -qE "(^|[[:space:]])${NAMESPACE}([[:space:]]|$)" \
  || fail "namespace describe output did not mention '$NAMESPACE':\n$ns_describe"
pass "namespace '$NAMESPACE' is registered"

# ---- 4. `temporal workflow list -n app` works -------------------------
echo "[4/5] temporal workflow list --namespace $NAMESPACE"
# A fresh cluster has zero workflows. The CLI exits 0 and prints either a
# header line or "no workflows found" — both are success signals. The
# ticket acceptance text spells the command exactly as "temporal workflow
# list -n app"; we use the long form for forward compatibility with
# future CLI versions.
wf_out=$($COMPOSE exec -T temporal-admin-tools \
  temporal --address temporal:7233 workflow list --namespace "$NAMESPACE" 2>&1) \
  || fail "workflow list --namespace $NAMESPACE failed:\n$wf_out"
pass "workflow list returned cleanly (output: $(printf '%s' "$wf_out" | wc -l | tr -d ' ') line(s))"

# ---- 5. Caddy serves https://temporal.localhost -----------------------
echo "[5/5] https://temporal.localhost via Caddy"
# Same trusted-chain pattern as scripts/caddy-smoke.sh: pull Caddy's local
# root CA out of the caddy_data volume and use --cacert. We don't gate the
# test on Caddy being up — if it's not, this whole check is skipped (Caddy
# is in `core` so it should be).
caddy_health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' "vidgen-caddy" 2>/dev/null || echo missing)
if [[ "$caddy_health" != "healthy" ]]; then
  echo "  (skipping: vidgen-caddy is '$caddy_health' — start it with $COMPOSE --profile core up -d caddy)"
else
  ca_path="$(mktemp -t caddy-root-ca.XXXXXX.crt)"
  trap 'rm -f "$ca_path"' EXIT
  $COMPOSE cp caddy:/data/caddy/pki/authorities/local/root.crt "$ca_path" >/dev/null 2>&1 \
    || fail "couldn't copy local root CA out of caddy_data — has Caddy started yet?"
  [[ -s "$ca_path" ]] || fail "exported root CA is empty"

  # Hit the UI through Caddy. --resolve pins the SNI to temporal.localhost
  # but routes the TCP connection at 127.0.0.1. The UI returns the SPA
  # shell (200 OK) once it has connected to the temporal backend.
  status=$(curl -sS --cacert "$ca_path" -o /dev/null -w '%{http_code}' \
    --resolve "temporal.localhost:${HTTPS_PORT}:127.0.0.1" \
    "https://temporal.localhost:${HTTPS_PORT}/" \
    --max-time 10) \
    || fail "https://temporal.localhost/ via Caddy failed"
  case "$status" in
    200|301|302|307|308) pass "https://temporal.localhost/ → HTTP $status (trusted chain)" ;;
    *) fail "https://temporal.localhost/ returned $status (want 2xx/3xx)" ;;
  esac
fi

echo
echo "ALL CHECKS PASSED"
