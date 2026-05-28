#!/usr/bin/env bash
# vidgen — API smoke script (T-015)
#
# End-to-end smoke against the running compose stack. Verifies:
#   1. `vidgen-api` container is up and healthy.
#   2. GET /health returns 200 with the {ok, version, ts} payload.
#   3. GET /me without a token returns 401 (application/problem+json).
#   4. Alice (dev@local) obtains a token via app-api direct grant,
#      hits /me, sees user record + empty workspaces, then POSTs a
#      workspace and sees it appear in GET /workspaces.
#   5. A second user (smoke-bob@local) is created via Keycloak admin
#      API, obtains a token, lists workspaces — must NOT see Alice's
#      workspace.
#   6. Cleans up the second user from Keycloak on success (Postgres
#      rows are left behind on purpose: a fresh `docker compose down -v`
#      wipes the volume; the user_id is harmless once disconnected).
#
# Assumes the core profile is up:
#   cd infra/compose && docker compose --profile core up -d
# and that scripts/db-migrate-smoke.sh has applied the migrations (the
# api-migrate sidecar in compose runs them automatically on first boot).
#
# Exit codes:
#   0 — all checks passed
#   1 — at least one check failed (stderr explains which)

set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
COMPOSE_DIR="${COMPOSE_DIR:-$REPO_ROOT/infra/compose}"

pass() { echo "  ✓ $*"; }
fail() { echo "FAIL: $*" >&2; exit 1; }

# Load env from infra/compose/.env if present (matches keycloak-smoke).
if [[ -f "$COMPOSE_DIR/.env" ]]; then
  # shellcheck disable=SC1090
  set -a; . "$COMPOSE_DIR/.env"; set +a
fi

API_PORT="${API_PORT:-3001}"
API_BASE="${API_BASE:-http://localhost:$API_PORT}"
KEYCLOAK_HTTP_PORT="${KEYCLOAK_HTTP_PORT:-8080}"
# For the smoke we must hit Keycloak directly (not via Caddy) so the
# `iss` claim matches what the API is configured with. The API
# normally validates `iss` against KEYCLOAK_ISSUER_URL — for the
# smoke we override the running api container to issue against the
# direct http://localhost issuer instead. Simpler: run smoke with the
# API trusting the direct issuer. The compose file already supports
# that via KEYCLOAK_ISSUER_URL override.
KC_HTTP_BASE="${KC_HTTP_BASE:-http://localhost:$KEYCLOAK_HTTP_PORT}"
KC_ADMIN="${KEYCLOAK_ADMIN:-change-me}"
KC_ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-change-me}"
REALM="${KEYCLOAK_REALM:-app}"
CLIENT_API="${KEYCLOAK_CLIENT_ID_API:-app-api}"
CLIENT_API_SECRET="${KEYCLOAK_CLIENT_SECRET_API:-change-me}"

# Where the API thinks tokens were issued. We must use the SAME value
# the api container has KEYCLOAK_ISSUER_URL set to. Compose default is
# https://auth.localhost/realms/app; smoke overrides to the direct
# http://localhost:8080/realms/app so we don't need Caddy + the local
# CA trusted by the container.
API_EXPECTED_ISSUER="${API_EXPECTED_ISSUER:-$KC_HTTP_BASE/realms/$REALM}"

echo "T-015 api smoke — base: $API_BASE — realm: $REALM"
echo "        keycloak: $KC_HTTP_BASE  expected iss: $API_EXPECTED_ISSUER"

# ---- 0. container healthy ---------------------------------------------
echo "[0/6] container health"
health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' "vidgen-api" 2>/dev/null || echo missing)
[[ "$health" == "healthy" ]] || fail "vidgen-api container '$health' (run: docker compose -f $COMPOSE_DIR/docker-compose.yml --profile core up -d api)"
pass "vidgen-api healthy"

# Cross-check: the API was started with the expected issuer. If not we
# fail loudly so the smoke doesn't silently pass for the wrong reason.
api_iss=$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' vidgen-api | grep '^KEYCLOAK_ISSUER_URL=' | cut -d= -f2- || true)
[[ "$api_iss" == "$API_EXPECTED_ISSUER" ]] || fail "api container has KEYCLOAK_ISSUER_URL='$api_iss', smoke expects '$API_EXPECTED_ISSUER'. Restart with: KEYCLOAK_ISSUER_URL=$API_EXPECTED_ISSUER KEYCLOAK_JWKS_URL=http://keycloak:8080/realms/$REALM/protocol/openid-connect/certs docker compose -f $COMPOSE_DIR/docker-compose.yml --profile core up -d --force-recreate api"

# ---- 1. /health unauthenticated ---------------------------------------
echo "[1/6] GET /health"
body=$(curl -fsS "$API_BASE/health") || fail "GET /health failed"
echo "$body" | grep -q '"ok":true' || fail "/health missing ok:true (got: $body)"
echo "$body" | grep -q '"version"' || fail "/health missing version (got: $body)"
echo "$body" | grep -q '"ts"' || fail "/health missing ts (got: $body)"
pass "/health returns ok+version+ts"

# ---- 2. /me without token returns 401 problem+json --------------------
echo "[2/6] GET /me without token"
status=$(curl -s -o /tmp/vidgen-api-401.json -w "%{http_code}" "$API_BASE/me")
[[ "$status" == "401" ]] || fail "expected 401, got $status (body: $(cat /tmp/vidgen-api-401.json))"
ctype=$(curl -s -o /dev/null -w "%{content_type}" "$API_BASE/me")
[[ "$ctype" == application/problem+json* ]] || fail "expected application/problem+json, got $ctype"
pass "/me returns 401 problem+json without token"

# ---- 3. admin token for user provisioning ----------------------------
echo "[3/6] acquire admin token + ensure smoke users"
admin_resp=$(curl -fsS -X POST \
  -d "client_id=admin-cli" \
  -d "username=$KC_ADMIN" \
  -d "password=$KC_ADMIN_PASS" \
  -d "grant_type=password" \
  "$KC_HTTP_BASE/realms/master/protocol/openid-connect/token") \
  || fail "admin login failed against master realm at $KC_HTTP_BASE"
ADMIN_TOKEN=$(printf '%s' "$admin_resp" | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[[ -n "$ADMIN_TOKEN" ]] || fail "admin access_token missing"

admin_curl() {
  curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$@"
}

# Idempotent: ensure smoke-bob@local exists in realm `app` with password
# `smoke-pass`. If already present, reset their password.
BOB_USER="smoke-bob@local"
BOB_PASS="smoke-pass"
existing=$(admin_curl "$KC_HTTP_BASE/admin/realms/$REALM/users?username=$BOB_USER")
if echo "$existing" | grep -q "\"username\":\"$BOB_USER\""; then
  bob_id=$(echo "$existing" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n1)
else
  create_status=$(admin_curl -o /tmp/vidgen-api-create.json -w "%{http_code}" \
    -X POST -H "Content-Type: application/json" \
    -d '{"username":"'"$BOB_USER"'","email":"'"$BOB_USER"'","enabled":true,"emailVerified":true,"firstName":"Smoke","lastName":"Bob"}' \
    "$KC_HTTP_BASE/admin/realms/$REALM/users")
  [[ "$create_status" =~ ^20[01]$ ]] || fail "create user failed: $create_status $(cat /tmp/vidgen-api-create.json)"
  # Find the id of the freshly-created user.
  bob_id=$(admin_curl "$KC_HTTP_BASE/admin/realms/$REALM/users?username=$BOB_USER" \
    | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n1)
fi
[[ -n "$bob_id" ]] || fail "could not resolve smoke-bob user id"
# (Re)set bob's password.
pw_status=$(admin_curl -o /dev/null -w "%{http_code}" \
  -X PUT -H "Content-Type: application/json" \
  -d '{"type":"password","value":"'"$BOB_PASS"'","temporary":false}' \
  "$KC_HTTP_BASE/admin/realms/$REALM/users/$bob_id/reset-password")
[[ "$pw_status" == "204" ]] || fail "password reset failed: $pw_status"
pass "smoke-bob@local ready"

# Cleanup hook — fires on success AND on failure.
cleanup() {
  admin_curl -X DELETE "$KC_HTTP_BASE/admin/realms/$REALM/users/$bob_id" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# ---- 4. Alice (dev@local) end-to-end ---------------------------------
echo "[4/6] alice happy path"
alice_resp=$(curl -fsS -X POST \
  -d "client_id=$CLIENT_API" \
  -d "client_secret=$CLIENT_API_SECRET" \
  -d "username=dev@local" \
  -d "password=dev" \
  -d "grant_type=password" \
  "$KC_HTTP_BASE/realms/$REALM/protocol/openid-connect/token") \
  || fail "dev@local direct grant failed against $CLIENT_API"
ALICE_TOKEN=$(printf '%s' "$alice_resp" | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[[ -n "$ALICE_TOKEN" ]] || fail "alice access_token missing"

me_body=$(curl -fsS -H "Authorization: Bearer $ALICE_TOKEN" "$API_BASE/me") || fail "alice GET /me failed"
echo "$me_body" | grep -q '"email":"dev@local"' || fail "alice /me wrong email: $me_body"
pass "alice GET /me ok"

create_body=$(curl -fsS -X POST -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" -d '{"name":"Alice Smoke Co"}' \
  "$API_BASE/workspaces") || fail "alice POST /workspaces failed"
echo "$create_body" | grep -q '"name":"Alice Smoke Co"' || fail "alice create returned: $create_body"
echo "$create_body" | grep -q '"role":"owner"' || fail "alice not marked owner: $create_body"
alice_ws_id=$(echo "$create_body" | sed -n 's/.*"workspaceId":"\([^"]*\)".*/\1/p')
[[ -n "$alice_ws_id" ]] || fail "could not extract workspaceId from alice create"
pass "alice created workspace $alice_ws_id"

list_body=$(curl -fsS -H "Authorization: Bearer $ALICE_TOKEN" "$API_BASE/workspaces") || fail "alice GET /workspaces failed"
echo "$list_body" | grep -q "\"workspaceId\":\"$alice_ws_id\"" || fail "alice cannot see her own workspace: $list_body"
pass "alice GET /workspaces sees her workspace"

# ---- 5. Bob: isolation ------------------------------------------------
echo "[5/6] bob isolation"
bob_resp=$(curl -fsS -X POST \
  -d "client_id=$CLIENT_API" \
  -d "client_secret=$CLIENT_API_SECRET" \
  -d "username=$BOB_USER" \
  -d "password=$BOB_PASS" \
  -d "grant_type=password" \
  "$KC_HTTP_BASE/realms/$REALM/protocol/openid-connect/token") \
  || fail "bob direct grant failed"
BOB_TOKEN=$(printf '%s' "$bob_resp" | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[[ -n "$BOB_TOKEN" ]] || fail "bob access_token missing"

bob_list=$(curl -fsS -H "Authorization: Bearer $BOB_TOKEN" "$API_BASE/workspaces") || fail "bob GET /workspaces failed"
if echo "$bob_list" | grep -q "\"workspaceId\":\"$alice_ws_id\""; then
  fail "TENANT LEAK — bob can see alice's workspace $alice_ws_id (got: $bob_list)"
fi
echo "$bob_list" | grep -q '"workspaces":\[\]' || echo "  note: bob has other workspaces but NOT alice's: $bob_list"
pass "bob cannot see alice's workspace"

bob_me=$(curl -fsS -H "Authorization: Bearer $BOB_TOKEN" "$API_BASE/me") || fail "bob GET /me failed"
echo "$bob_me" | grep -q "\"email\":\"$BOB_USER\"" || fail "bob /me wrong email: $bob_me"
pass "bob GET /me ok"

# ---- 6. (covered by trap) ---------------------------------------------
echo "[6/6] cleanup runs in EXIT trap"

echo
echo "ALL CHECKS PASSED"
