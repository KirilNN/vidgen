#!/usr/bin/env bash
# vidgen — Caddy smoke script (T-014)
#
# Verifies every acceptance criterion of T-014:
#   1. The caddy container is up and healthy.
#   2. The Caddyfile parses (in-image `caddy validate`).
#   3. Every *.localhost site declared in the Caddyfile terminates TLS.
#   4. The served leaf cert chains back to Caddy's local root CA
#      (validated *without* -k — i.e. proves the "trustable" property the
#      ticket's acceptance text relies on).
#   5. For routes whose upstream is already part of `core` today
#      (auth, s3, minio), the upstream actually responds (non-502).
#
# Exit codes:
#   0 -> all checks passed
#   1 -> at least one check failed (stderr explains which)
#
# Usage:
#   bash scripts/caddy-smoke.sh
#
# Assumes:
#   `docker compose --profile core up -d` has been run.

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
HTTPS_PORT="${CADDY_HTTPS_PORT:-443}"

# `--resolve` shim used for every TLS handshake — pins the host header to
# the *.localhost name (so Caddy picks the right site block) but routes the
# TCP connection at 127.0.0.1:$HTTPS_PORT.
resolve_args=()
for host in app api share auth s3 minio; do
  resolve_args+=(--resolve "${host}.localhost:${HTTPS_PORT}:127.0.0.1")
done

echo "T-014 caddy smoke — https port: $HTTPS_PORT"

# ---- 0. container healthy --------------------------------------------------
echo "[0/5] container health"
health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' "vidgen-caddy" 2>/dev/null || echo missing)
[[ "$health" == "healthy" ]] || fail "caddy container '$health' (run: $COMPOSE --profile core up -d caddy)"
pass "vidgen-caddy healthy"

# ---- 1. Caddyfile parses ---------------------------------------------------
echo "[1/5] Caddyfile validation"
$COMPOSE exec -T caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 \
  || fail "Caddyfile failed validation"
pass "Caddyfile parses cleanly"

# ---- 2. every site terminates TLS -----------------------------------------
echo "[2/5] TLS handshake per site"
for host in app api share auth s3 minio; do
  status=$(curl -sk -o /dev/null -w '%{http_code}' \
    --resolve "${host}.localhost:${HTTPS_PORT}:127.0.0.1" \
    "https://${host}.localhost:${HTTPS_PORT}/") \
    || fail "TLS handshake to https://${host}.localhost failed"
  pass "https://${host}.localhost → HTTP ${status}"
done

# ---- 3. cert chain validates against the local root CA --------------------
echo "[3/5] trusted-chain validation"
ca_path="$(mktemp -t caddy-root-ca.XXXXXX.crt)"
trap 'rm -f "$ca_path"' EXIT
$COMPOSE cp caddy:/data/caddy/pki/authorities/local/root.crt "$ca_path" >/dev/null 2>&1 \
  || fail "couldn't copy local root CA out of caddy_data — has Caddy started yet?"
[[ -s "$ca_path" ]] || fail "exported root CA is empty"
pass "local root CA exported ($(wc -c <"$ca_path" | tr -d ' ') bytes)"

# Hit one site WITHOUT -k, supplying the local CA. If the chain doesn't
# verify, curl exits non-zero with curl(60). This is the "no browser
# warnings after CA install" property of the acceptance criterion expressed
# as a non-interactive check.
for host in app api share auth s3 minio; do
  if curl -sS --cacert "$ca_path" -o /dev/null \
      --resolve "${host}.localhost:${HTTPS_PORT}:127.0.0.1" \
      "https://${host}.localhost:${HTTPS_PORT}/" \
      --max-time 10 2>/dev/null; then
    pass "https://${host}.localhost validates against local CA"
  else
    rc=$?
    # rc=60 = SSL certificate problem. rc=52 / 56 = empty / aborted (502 etc.
    # from upstream-less routes still come back over a *trusted* TLS chain,
    # so we re-test the chain via openssl below if curl swallowed the body).
    if [[ $rc -eq 60 ]]; then
      fail "leaf cert for ${host}.localhost did NOT chain to local CA (curl rc=60)"
    fi
    # For upstream-less routes Caddy may write a 502 then close the
    # connection before curl reads the body. Re-prove TLS trust with
    # openssl s_client, which only cares about the handshake.
    if ! echo | openssl s_client -connect "127.0.0.1:${HTTPS_PORT}" \
        -servername "${host}.localhost" \
        -CAfile "$ca_path" -verify_return_error \
        >/dev/null 2>&1; then
      fail "openssl chain verification for ${host}.localhost failed"
    fi
    pass "https://${host}.localhost validates against local CA (s_client; curl rc=${rc})"
  fi
done

# ---- 4. live upstreams in core profile respond ----------------------------
echo "[4/5] live upstream sanity (auth / s3 / minio)"

# Keycloak discovery doc proxied through Caddy.
auth_body=$(curl -sS --cacert "$ca_path" \
  --resolve "auth.localhost:${HTTPS_PORT}:127.0.0.1" \
  "https://auth.localhost:${HTTPS_PORT}/realms/${KEYCLOAK_REALM:-app}/.well-known/openid-configuration") \
  || fail "GET https://auth.localhost/realms/.../openid-configuration failed (is keycloak healthy?)"
echo "$auth_body" | grep -q '"issuer"' \
  || fail "auth.localhost response missing 'issuer' field"
pass "auth.localhost serves the OIDC discovery doc"

# MinIO S3 health endpoint proxied through Caddy.
s3_status=$(curl -sS -o /dev/null -w '%{http_code}' --cacert "$ca_path" \
  --resolve "s3.localhost:${HTTPS_PORT}:127.0.0.1" \
  "https://s3.localhost:${HTTPS_PORT}/minio/health/live") \
  || fail "GET https://s3.localhost/minio/health/live failed"
[[ "$s3_status" == "200" ]] \
  || fail "s3.localhost /minio/health/live returned $s3_status (want 200)"
pass "s3.localhost /minio/health/live → 200"

# MinIO console root (returns 200 with the SPA shell).
console_status=$(curl -sS -o /dev/null -w '%{http_code}' --cacert "$ca_path" \
  --resolve "minio.localhost:${HTTPS_PORT}:127.0.0.1" \
  "https://minio.localhost:${HTTPS_PORT}/") \
  || fail "GET https://minio.localhost/ failed"
case "$console_status" in
  200|301|302|307) pass "minio.localhost / → $console_status" ;;
  *) fail "minio.localhost / returned $console_status (want 2xx/3xx)" ;;
esac

# ---- 5. http → https redirect ---------------------------------------------
echo "[5/5] http→https redirect"
HTTP_PORT="${CADDY_HTTP_PORT:-80}"
redirect_status=$(curl -sS -o /dev/null -w '%{http_code}' \
  --resolve "auth.localhost:${HTTP_PORT}:127.0.0.1" \
  "http://auth.localhost:${HTTP_PORT}/realms/${KEYCLOAK_REALM:-app}/") \
  || fail "GET http://auth.localhost/ failed"
case "$redirect_status" in
  301|302|308) pass "http://auth.localhost → $redirect_status (auto-redirect to HTTPS)" ;;
  *) fail "http→https auto-redirect missing on auth.localhost (got $redirect_status)" ;;
esac

echo
echo "ALL CHECKS PASSED"
