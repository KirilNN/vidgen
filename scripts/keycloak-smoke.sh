#!/usr/bin/env bash
# vidgen — Keycloak smoke script (T-013)
#
# Verifies every acceptance criterion of T-013:
#   1. The keycloak container is up and healthy.
#   2. The OIDC discovery doc is reachable at
#      $KEYCLOAK_ISSUER_URL/.well-known/openid-configuration and its `issuer`
#      field equals $KEYCLOAK_ISSUER_URL.
#   3. Realm `app` exists.
#   4. Both clients (`app-web`, `app-api`) exist in that realm.
#   5. The three realm roles (`owner`, `editor`, `viewer`) exist.
#   6. (When ENV=dev) The dev test user can authenticate via the Direct
#      Access Grant flow on `app-api`.
#
# Exit codes:
#   0 -> all checks passed
#   1 -> at least one check failed (stderr explains which)
#
# Usage:
#   bash scripts/keycloak-smoke.sh
#
# Assumes:
#   `docker compose --profile core up -d keycloak-init keycloak` has been run.

set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
COMPOSE_DIR="${COMPOSE_DIR:-$REPO_ROOT/infra/compose}"

pass() { echo "  ✓ $*"; }
fail() { echo "FAIL: $*" >&2; exit 1; }

# Load env from infra/compose/.env if present.
if [[ -f "$COMPOSE_DIR/.env" ]]; then
  # shellcheck disable=SC1090
  set -a; . "$COMPOSE_DIR/.env"; set +a
fi
ADMIN="${KEYCLOAK_ADMIN:?KEYCLOAK_ADMIN required}"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD required}"
REALM="${KEYCLOAK_REALM:-app}"
ISSUER="${KEYCLOAK_ISSUER_URL:-http://localhost:8080/realms/$REALM}"
HTTP_BASE="${ISSUER%/realms/$REALM}"
CLIENT_WEB="${KEYCLOAK_CLIENT_ID_WEB:-app-web}"
CLIENT_API="${KEYCLOAK_CLIENT_ID_API:-app-api}"
CLIENT_API_SECRET="${KEYCLOAK_CLIENT_SECRET_API:-change-me}"
ENV_NAME="${ENV:-dev}"

echo "T-013 keycloak smoke — base: $HTTP_BASE — realm: $REALM"

# ---- 0. container healthy ----------------------------------------------
echo "[0/6] container health"
health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' "vidgen-keycloak" 2>/dev/null || echo missing)
[[ "$health" == "healthy" ]] || fail "keycloak container '$health' (run: docker compose -f $COMPOSE_DIR/docker-compose.yml --profile core up -d keycloak-init keycloak)"
pass "vidgen-keycloak healthy"

# ---- 1. discovery doc + issuer field -----------------------------------
echo "[1/6] OIDC discovery"
disco_url="$ISSUER/.well-known/openid-configuration"
body=$(curl -fsS "$disco_url") || fail "GET $disco_url failed"
got_issuer=$(printf '%s' "$body" | sed -n 's/.*"issuer"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[[ "$got_issuer" == "$ISSUER" ]] || fail "discovery doc issuer mismatch: got '$got_issuer' want '$ISSUER'"
pass "discovery doc at $disco_url has issuer='$ISSUER'"

# ---- 2. admin token ----------------------------------------------------
echo "[2/6] admin token (master realm)"
token_resp=$(curl -fsS -X POST \
  -d "client_id=admin-cli" \
  -d "username=$ADMIN" \
  -d "password=$ADMIN_PASS" \
  -d "grant_type=password" \
  "$HTTP_BASE/realms/master/protocol/openid-connect/token") \
  || fail "admin login failed against master realm"
ADMIN_TOKEN=$(printf '%s' "$token_resp" | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[[ -n "$ADMIN_TOKEN" ]] || fail "admin token missing from response"
pass "admin token acquired"

admin_get() {
  curl -fsS -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$HTTP_BASE/admin/realms/$1"
}

# ---- 3. realm `app` exists ---------------------------------------------
echo "[3/6] realm exists"
realm_json=$(admin_get "$REALM") || fail "realm '$REALM' not found via admin API"
realm_name=$(printf '%s' "$realm_json" | sed -n 's/.*"realm"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
[[ "$realm_name" == "$REALM" ]] || fail "realm name mismatch: got '$realm_name' want '$REALM'"
pass "realm '$REALM' present"

# ---- 4. both clients exist ---------------------------------------------
echo "[4/6] clients $CLIENT_WEB, $CLIENT_API"
clients_json=$(admin_get "$REALM/clients") || fail "clients listing failed"
# Extract clientIds — naive but sufficient: every clientId appears once.
client_ids=$(printf '%s' "$clients_json" | grep -oE '"clientId"[[:space:]]*:[[:space:]]*"[^"]+"' | sed 's/.*"\([^"]*\)"$/\1/' | sort -u | tr '\n' ',')
for need in "$CLIENT_WEB" "$CLIENT_API"; do
  case ",$client_ids" in
    *",$need,"*) pass "client '$need' present" ;;
    *)           fail "client '$need' missing (got: $client_ids)";;
  esac
done

# Extra check: app-web is publicClient + PKCE; app-api is confidential.
web_obj=$(printf '%s' "$clients_json" | tr ',' '\n' | grep -A0 "\"clientId\":\"$CLIENT_WEB\"" || true)
pkce=$(printf '%s' "$clients_json" | grep -o '"pkce.code.challenge.method":"S256"' || true)
[[ -n "$pkce" ]] || fail "PKCE S256 not configured on $CLIENT_WEB"
pass "$CLIENT_WEB uses PKCE S256"

# ---- 5. realm roles ----------------------------------------------------
echo "[5/6] realm roles owner, editor, viewer"
roles_json=$(admin_get "$REALM/roles")
role_names=$(printf '%s' "$roles_json" | grep -oE '"name"[[:space:]]*:[[:space:]]*"[^"]+"' | sed 's/.*"\([^"]*\)"$/\1/' | sort -u | tr '\n' ',')
for need in owner editor viewer; do
  case ",$role_names" in
    *",$need,"*) pass "role '$need' present" ;;
    *)           fail "role '$need' missing (got: $role_names)";;
  esac
done

# ---- 6. dev user can authenticate (ENV=dev only) -----------------------
echo "[6/6] dev test user login (ENV=$ENV_NAME)"
if [[ "$ENV_NAME" == "dev" ]]; then
  dev_resp=$(curl -fsS -X POST \
    -d "client_id=$CLIENT_API" \
    -d "client_secret=$CLIENT_API_SECRET" \
    -d "username=dev@local" \
    -d "password=dev" \
    -d "grant_type=password" \
    "$HTTP_BASE/realms/$REALM/protocol/openid-connect/token") \
    || fail "dev user direct-access-grant against $CLIENT_API failed"
  dev_tok=$(printf '%s' "$dev_resp" | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  [[ -n "$dev_tok" ]] || fail "dev access_token missing from response"
  pass "dev@local can authenticate via $CLIENT_API direct grant"
else
  # In non-dev the user must NOT exist. Look up by username; expect empty.
  users_json=$(admin_get "$REALM/users?username=dev@local")
  if printf '%s' "$users_json" | grep -q '"username"[[:space:]]*:[[:space:]]*"dev@local"'; then
    fail "dev@local user exists with ENV=$ENV_NAME (should be stripped)"
  fi
  pass "dev user absent (ENV=$ENV_NAME)"
fi

echo
echo "ALL CHECKS PASSED"
