#!/usr/bin/env bash
# vidgen — MinIO smoke script (T-012)
#
# Verifies every acceptance criterion of T-012:
#   1. `mc ls local/` lists the four buckets (media-raw, media-derived,
#      media-chunks, public) after the stack is up.
#   2. Upload + download via S3 against http://localhost:9000 works
#      (we use the `mc` client inside the minio-init container — it's the
#      same S3 protocol path the SDK exercises and avoids forcing an
#      `aws`/`s3cmd` install on the host).
#   3. An object placed at `public/x` is fetchable over plain HTTP with no
#      credentials (anonymous GET).
#   4. An object placed at `media-raw/x` returns 403/401 without creds.
#   5. (Bonus, derived from arch §E2) `media-raw` has versioning ON.
#
# Exit codes:
#   0 -> all checks passed
#   1 -> at least one check failed (stderr explains which)
#
# Usage:
#   bash scripts/minio-init.sh
#
# Assumes `docker compose --profile core up -d minio minio-init` has been
# run from infra/compose/. Re-running is idempotent.

set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
COMPOSE_DIR="${COMPOSE_DIR:-$REPO_ROOT/infra/compose}"
SERVICE="${MINIO_SERVICE:-minio}"
INIT_SERVICE="${MINIO_INIT_SERVICE:-minio-init}"
ENDPOINT_HOST="${MINIO_HOST_ENDPOINT:-http://localhost:9000}"

pass() { echo "  ✓ $*"; }
fail() { echo "FAIL: $*" >&2; exit 1; }

dc() {
  docker compose -f "$COMPOSE_DIR/docker-compose.yml" "$@"
}

# Resolve creds: load infra/compose/.env if present, otherwise rely on the
# values already in the environment.
if [[ -f "$COMPOSE_DIR/.env" ]]; then
  # shellcheck disable=SC1090
  set -a; . "$COMPOSE_DIR/.env"; set +a
fi
USER="${MINIO_ROOT_USER:?MINIO_ROOT_USER required (set it in infra/compose/.env)}"
PASS_="${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD required (set it in infra/compose/.env)}"
B_RAW="${MINIO_BUCKET_RAW:-media-raw}"
B_DERIVED="${MINIO_BUCKET_DERIVED:-media-derived}"
B_CHUNKS="${MINIO_BUCKET_CHUNKS:-media-chunks}"
B_PUBLIC="${MINIO_BUCKET_PUBLIC:-public}"

echo "T-012 minio smoke — compose dir: $COMPOSE_DIR — endpoint: $ENDPOINT_HOST"

# ---- 0. server container healthy ---------------------------------------
echo "[0/5] minio container health"
health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' "vidgen-minio" 2>/dev/null || echo missing)
[[ "$health" == "healthy" ]] || fail "minio container '$health' (run: docker compose -f $COMPOSE_DIR/docker-compose.yml --profile core up -d minio minio-init)"
pass "vidgen-minio healthy"

# Helper: run an arbitrary `mc` command against the live server using a
# transient mc container. We do NOT reuse minio-init (it already exited after
# bootstrap). The mc base image is BusyBox + mc only — it has cut/tr/bash but
# not sed/awk/grep/jq, so we keep the in-container side to *just* the mc
# invocation and parse on the host.
mc_run() {
  # First arg: shell-quoted `mc ...` command (one logical command).
  dc run --rm --no-deps --entrypoint sh "$INIT_SERVICE" -c "
    set -e
    mc alias set s 'http://minio:9000' '$USER' '$PASS_' >/dev/null
    $*
  "
}

# ---- 1. four buckets exist ---------------------------------------------
echo "[1/5] four buckets exist"
# `mc ls s/` prints one line per top-level bucket, last whitespace-separated
# column is the bucket name with a trailing slash. We strip the slash on the
# host with sed/tr.
raw=$(mc_run "mc ls --quiet s/") || fail "mc ls failed"
listed=$(printf '%s\n' "$raw" \
  | awk '{print $NF}' \
  | sed 's:/$::' \
  | sort -u \
  | tr '\n' ',')
want=$(printf '%s\n' "$B_DERIVED" "$B_CHUNKS" "$B_PUBLIC" "$B_RAW" | sort -u | tr '\n' ',')
[[ "$listed" == "$want" ]] || fail "bucket list mismatch; got '$listed' want '$want'"
pass "buckets present: $want"

# ---- 2. upload + download via S3 (mc cp roundtrip) ----------------------
echo "[2/5] upload + download roundtrip via S3"
roundtrip=$(mc_run "
  printf 'hello-roundtrip-$$' > /tmp/p.txt
  mc cp -q /tmp/p.txt s/$B_DERIVED/smoke/p.txt >/dev/null
  mc cat s/$B_DERIVED/smoke/p.txt
")
[[ "$roundtrip" == hello-roundtrip-* ]] || fail "S3 roundtrip failed; got '$roundtrip'"
pass "upload+download against http://minio:9000 works"

# ---- 3. anonymous GET on public/ works ---------------------------------
echo "[3/5] anonymous GET on public/x works"
PUB_KEY="smoke/anon-$$.txt"
PUB_BODY="anon-ok-$$"
mc_run "
  printf '%s' '$PUB_BODY' > /tmp/anon.txt
  mc cp -q /tmp/anon.txt s/$B_PUBLIC/$PUB_KEY >/dev/null
" >/dev/null
got_anon=$(curl -fsS "$ENDPOINT_HOST/$B_PUBLIC/$PUB_KEY") \
  || fail "anonymous GET on $B_PUBLIC/$PUB_KEY failed (HTTP error)"
[[ "$got_anon" == "$PUB_BODY" ]] || fail "anonymous GET body mismatch; got '$got_anon' want '$PUB_BODY'"
pass "anonymous GET on $B_PUBLIC/$PUB_KEY returned the object"

# ---- 4. anonymous GET on media-raw/ is forbidden -----------------------
echo "[4/5] anonymous GET on media-raw/x is denied"
RAW_KEY="smoke/private-$$.txt"
mc_run "
  printf 'should-be-private-$$' > /tmp/priv.txt
  mc cp -q /tmp/priv.txt s/$B_RAW/$RAW_KEY >/dev/null
" >/dev/null
code=$(curl -s -o /dev/null -w '%{http_code}' "$ENDPOINT_HOST/$B_RAW/$RAW_KEY")
case "$code" in
  401|403) pass "anonymous GET on $B_RAW/$RAW_KEY -> HTTP $code (denied)";;
  *)       fail "anonymous GET on $B_RAW/$RAW_KEY -> HTTP $code (expected 401/403)";;
esac

# ---- 5. media-raw has versioning ON -------------------------------------
echo "[5/5] media-raw versioning ON"
ver_raw=$(mc_run "mc version info s/$B_RAW")
# Sample line:  `s/media-raw` versioning is enabled
echo "$ver_raw" | grep -Eqi 'versioning is enabled|enabled' \
  || fail "versioning on $B_RAW not enabled. mc said: $ver_raw"
pass "versioning on $B_RAW: Enabled"

echo
echo "ALL CHECKS PASSED"
