#!/usr/bin/env bash
# vidgen — Worker pools smoke script (T-021)
#
# Verifies every acceptance criterion of T-021:
#   1. `worker-base` build sidecar completes (image vidgen/worker-base:dev
#      exists locally).
#   2. Per-pool containers (vidgen-worker-light, -media, -ai-cpu, -ai-gpu)
#      start in their respective profiles.
#   3. Each pool registers a poller on its task queue with the Temporal
#      server (proving the worker connected and authenticated against
#      the namespace).
#   4. Each container logs a startup banner showing taskQueue +
#      capabilities + temporal address (arch §6.2 capability tagging).
#
# Pools and profiles checked:
#   light    -> core
#   media    -> media
#   ai-cpu   -> ai-cpu
#   ai-gpu   -> ai-gpu (started but NOT polled — no GPU required in dev)
#
# Exit codes:
#   0 -> all checks passed
#   1 -> at least one check failed (stderr explains which)
#
# Usage:
#   bash scripts/worker-smoke.sh
#
# Assumes:
#   Temporal stack from T-020 is up (`docker compose --profile core up -d`
#   already brings up temporal + temporal-ui + postgres). This script
#   will additionally start the four worker pools.

set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
COMPOSE_DIR="${COMPOSE_DIR:-$REPO_ROOT/infra/compose}"
COMPOSE="docker compose -f $COMPOSE_DIR/docker-compose.yml"

pass() { echo "  ✓ $*"; }
fail() { echo "FAIL: $*" >&2; exit 1; }

if [[ -f "$COMPOSE_DIR/.env" ]]; then
  # shellcheck disable=SC1090
  set -a; . "$COMPOSE_DIR/.env"; set +a
fi

NAMESPACE="${TEMPORAL_NAMESPACE:-app}"

echo "T-021 worker pools smoke — namespace: $NAMESPACE"

# ---- 0. ensure base image + pools are up ------------------------------
echo "[0/4] building worker-base image first (pool Dockerfiles FROM it)"
# Compose builds in parallel by default — pool Dockerfiles can't find
# `vidgen/worker-base:dev` if it's still being built alongside them.
# Build the base image standalone, then start the four pools.
$COMPOSE --profile core build worker-base >/dev/null

docker image inspect vidgen/worker-base:dev >/dev/null 2>&1 \
  || fail "vidgen/worker-base:dev image missing after build"
pass "worker-base image built (vidgen/worker-base:dev)"

echo "[0b/4] bringing up worker pools (core + media + ai-cpu + ai-gpu)"
$COMPOSE --profile core --profile media --profile ai-cpu --profile ai-gpu \
  up -d --build worker-light worker-media worker-ai-cpu worker-ai-gpu \
  >/dev/null

# ---- 1. per-pool containers running -----------------------------------
echo "[1/4] container status"
for c in vidgen-worker-light vidgen-worker-media vidgen-worker-ai-cpu vidgen-worker-ai-gpu; do
  state=$(docker inspect --format '{{.State.Status}}' "$c" 2>/dev/null || echo missing)
  [[ "$state" == "running" ]] || fail "$c state '$state'"
  pass "$c running"
done

# ---- 2. capability banner in logs -------------------------------------
echo "[2/4] capability banner present in logs"
# Banner emits within ~2-3s of boot; give it some headroom on slow CI.
sleep 6
# Use a case statement instead of an associative array for macOS bash 3.2 compat.
caps_for() {
  case "$1" in
    light)  echo "orchestration, rest, oauth-refresh" ;;
    media)  echo "ffmpeg, mlt, remotion" ;;
    ai-cpu) echo "whisper-cpu" ;;
    ai-gpu) echo "xtts" ;;
    *) echo ""; return 1 ;;
  esac
}
for pool in light media ai-cpu ai-gpu; do
  logs=$(docker logs --tail 200 "vidgen-worker-$pool" 2>&1)
  echo "$logs" | grep -q "vidgen worker ($pool)" \
    || fail "no startup banner in vidgen-worker-$pool logs"
  echo "$logs" | grep -q "task queue    : $pool" \
    || fail "banner missing task queue line for $pool"
  needle="$(caps_for "$pool")"
  echo "$logs" | grep -q "$needle" \
    || fail "banner missing capability marker '$needle' for $pool"
  pass "vidgen-worker-$pool banner OK"
done

# ---- 3. Temporal pollers registered -----------------------------------
echo "[3/4] Temporal task-queue pollers"
$COMPOSE --profile dev up -d temporal-admin-tools >/dev/null

# Pollers register a few seconds after worker.run() resolves; small wait.
sleep 4
for tq in light media ai-cpu ai-gpu; do
  # NB: ai-gpu shows pollers iff the container booted — and it does
  # (no CUDA call yet). Real GPU activities will be wired by T-080+.
  out=$($COMPOSE exec -T temporal-admin-tools \
    temporal task-queue describe --task-queue "$tq" --namespace "$NAMESPACE" 2>&1 || true)
  if echo "$out" | grep -qiE "identity|pollers"; then
    pass "task-queue '$tq' has pollers"
  else
    fail "no pollers on task-queue '$tq'\n----\n$out\n----"
  fi
done

# ---- 4. summary -------------------------------------------------------
echo "[4/4] all checks passed"
echo "✓ T-021 smoke OK"
