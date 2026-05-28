#!/usr/bin/env bash
# vidgen — web shell smoke (T-016)
#
# End-to-end smoke against the running compose stack. Verifies:
#   1. vidgen-web container is up and healthy.
#   2. GET /api/healthz returns 200 {"status":"ok"}.
#   3. GET / without a session returns a 30x to /login.
#   4. GET /login renders the marketing/sign-in page.
#   5. GET /api/auth/login redirects (302) to Keycloak's authorize
#      endpoint with client_id=app-web, code_challenge, state, and
#      code_challenge_method=S256.
#   6. The OIDC issuer the web container is talking to matches the one
#      the API container validates against (cross-check via env vars).
#
# Assumes the core profile is up:
#   docker compose -f infra/compose/docker-compose.yml --profile core up -d
#
# Exit codes:
#   0 — all checks passed
#   1 — at least one check failed (stderr explains which)

set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
COMPOSE_DIR="${COMPOSE_DIR:-$REPO_ROOT/infra/compose}"

pass() { echo "  ✓ $*"; }
fail() { echo "FAIL: $*" >&2; exit 1; }

if [[ -f "$COMPOSE_DIR/.env" ]]; then
  # shellcheck disable=SC1090
  set -a; . "$COMPOSE_DIR/.env"; set +a
fi

WEB_PORT="${WEB_PORT:-3000}"
WEB_BASE="${WEB_BASE:-http://localhost:$WEB_PORT}"

echo "T-016 web smoke — base: $WEB_BASE"

# ---- 0. container healthy ---------------------------------------------
echo "[0/5] container health"
health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' "vidgen-web" 2>/dev/null || echo missing)
[[ "$health" == "healthy" ]] || fail "vidgen-web container '$health' (run: docker compose -f $COMPOSE_DIR/docker-compose.yml --profile core up -d web)"
pass "vidgen-web healthy"

# Issuer cross-check: web + api must agree, otherwise tokens minted by the
# browser flow will be rejected by the API.
web_iss=$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' vidgen-web | grep '^KEYCLOAK_PUBLIC_ISSUER_URL=' | cut -d= -f2- || true)
api_iss=$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' vidgen-api | grep '^KEYCLOAK_ISSUER_URL=' | cut -d= -f2- || true)
[[ -n "$web_iss" ]] || fail "vidgen-web has no KEYCLOAK_PUBLIC_ISSUER_URL"
[[ -n "$api_iss" ]] || fail "vidgen-api has no KEYCLOAK_ISSUER_URL"
[[ "$web_iss" == "$api_iss" ]] || fail "issuer mismatch: web='$web_iss' api='$api_iss'"
pass "issuer alignment: $web_iss"

# ---- 1. /api/healthz --------------------------------------------------
echo "[1/5] GET /api/healthz"
body=$(curl -fsS "$WEB_BASE/api/healthz") || fail "GET /api/healthz failed"
echo "$body" | grep -q '"status":"ok"' || fail "/api/healthz missing status:ok (got: $body)"
pass "/api/healthz returns ok"

# ---- 2. anonymous / → /login -----------------------------------------
echo "[2/5] anonymous GET / (expect redirect to /login)"
loc=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" "$WEB_BASE/")
status="${loc%% *}"
target="${loc#* }"
[[ "$status" == "302" || "$status" == "307" || "$status" == "308" ]] \
  || fail "expected 3xx from /, got: $status (target: $target)"
echo "$target" | grep -q '/login' || fail "expected redirect target to contain /login, got: $target"
pass "/ redirects to /login ($status)"

# ---- 3. /login renders ------------------------------------------------
echo "[3/5] GET /login"
login_status=$(curl -s -o /tmp/vidgen-web-login.html -w "%{http_code}" "$WEB_BASE/login")
[[ "$login_status" == "200" ]] || fail "expected 200 from /login, got $login_status"
grep -q 'Sign in with Keycloak' /tmp/vidgen-web-login.html || fail "/login HTML missing sign-in button text"
pass "/login renders"

# ---- 4. /api/auth/login → Keycloak authorize -------------------------
echo "[4/5] GET /api/auth/login (expect redirect to Keycloak)"
authz=$(curl -s -o /dev/null -w "%{http_code}\n%{redirect_url}\n" "$WEB_BASE/api/auth/login")
authz_status=$(echo "$authz" | sed -n '1p')
authz_url=$(echo "$authz" | sed -n '2p')
[[ "$authz_status" == "302" || "$authz_status" == "307" ]] \
  || fail "expected 3xx from /api/auth/login, got: $authz_status"
echo "$authz_url" | grep -q 'protocol/openid-connect/auth' \
  || fail "redirect target is not Keycloak authorize: $authz_url"
echo "$authz_url" | grep -q 'client_id=app-web' \
  || fail "authorize URL missing client_id=app-web: $authz_url"
echo "$authz_url" | grep -q 'code_challenge=' \
  || fail "authorize URL missing code_challenge: $authz_url"
echo "$authz_url" | grep -q 'code_challenge_method=S256' \
  || fail "authorize URL missing code_challenge_method=S256: $authz_url"
echo "$authz_url" | grep -q 'state=' \
  || fail "authorize URL missing state: $authz_url"
pass "/api/auth/login redirects to Keycloak with PKCE params"

# ---- 5. final summary -------------------------------------------------
echo "[5/5] summary"
echo
echo "ALL CHECKS PASSED"
