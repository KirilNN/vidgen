#!/usr/bin/env bash
# vidgen — Redis / DragonflyDB smoke script (T-017)
#
# Verifies:
#   1. The `vidgen-redis` (Dragonfly) container is up and healthy.
#   2. `redis-cli -h localhost ping` returns PONG (ticket acceptance).
#      - Primary path: host-installed redis-cli (the developer typically
#        has this from `brew install redis` / `apt install redis-tools`).
#      - Fallback path: spin up a throwaway redis image with `docker run`
#        on the host network so we never need a host install.
#   3. A trivial SET/GET round-trip persists across the same connection
#      (proves the protocol parser is doing more than reflecting PING).
#
# Assumes the core profile is up:
#   cd infra/compose && docker compose --profile core up -d redis
#
# Exit codes:
#   0 — all checks passed
#   1 — at least one check failed (stderr explains which)

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

REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_HOST="${REDIS_HOST:-localhost}"

echo "T-017 redis smoke — $REDIS_HOST:$REDIS_PORT"

# ---- 0. container healthy ---------------------------------------------
echo "[0/3] container health"
health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' "vidgen-redis" 2>/dev/null || echo missing)
[[ "$health" == "healthy" ]] || fail "vidgen-redis container '$health' (run: docker compose -f $COMPOSE_DIR/docker-compose.yml --profile core up -d redis)"
pass "vidgen-redis healthy"

# ---- 1. redis-cli ping -------------------------------------------------
# Pick the first runnable client: host redis-cli, then a docker fallback.
# We deliberately avoid `docker exec vidgen-redis` because Dragonfly's
# image does not ship a redis-cli binary — and because the ticket spells
# the test as "redis-cli -h localhost ping" run from outside the container.
echo "[1/3] PING via redis-cli"
PING_OUT=""
if command -v redis-cli >/dev/null 2>&1; then
  PING_OUT=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>&1 || true)
  pass "used host redis-cli"
else
  echo "  (host redis-cli not installed; using docker fallback)"
  PING_OUT=$(docker run --rm --network host redis:7-alpine \
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>&1 || true)
  pass "used docker fallback (redis:7-alpine)"
fi
[[ "$PING_OUT" == "PONG" ]] || fail "expected 'PONG', got: $PING_OUT"
pass "redis-cli ping returned PONG"

# ---- 2. SET / GET round-trip ------------------------------------------
echo "[2/3] SET/GET round-trip"
KEY="vidgen:smoke:$(date +%s):$$"
VAL="ok-$RANDOM"
if command -v redis-cli >/dev/null 2>&1; then
  setrep=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" set "$KEY" "$VAL" 2>&1 || true)
  getrep=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" get "$KEY" 2>&1 || true)
  redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" del "$KEY" >/dev/null 2>&1 || true
else
  setrep=$(docker run --rm --network host redis:7-alpine \
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" set "$KEY" "$VAL" 2>&1 || true)
  getrep=$(docker run --rm --network host redis:7-alpine \
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" get "$KEY" 2>&1 || true)
  docker run --rm --network host redis:7-alpine \
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" del "$KEY" >/dev/null 2>&1 || true
fi
[[ "$setrep" == "OK" ]] || fail "SET returned '$setrep'"
[[ "$getrep" == "$VAL" ]] || fail "GET returned '$getrep' (expected '$VAL')"
pass "SET/GET ok"

# ---- 3. persistence directory mounted ---------------------------------
echo "[3/3] persistence dir"
mounted=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' vidgen-redis 2>/dev/null || true)
[[ -n "$mounted" ]] || fail "no volume mounted at /data inside vidgen-redis"
pass "/data backed by named volume: $mounted"

echo
echo "ALL CHECKS PASSED"
