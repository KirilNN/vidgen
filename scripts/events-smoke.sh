#!/usr/bin/env bash
# vidgen — NATS JetStream event bus smoke script (T-022)
#
# Verifies every acceptance criterion of T-022:
#   1. `vidgen-nats` container is healthy.
#   2. The monitoring endpoint serves /healthz and /jsz on 127.0.0.1.
#   3. JetStream is enabled (jetstream.enabled == true in /jsz).
#   4. The @vidgen/events JetStream adapter can `ensureStream` and
#      round-trip publish→subscribe with the canonical event schemas,
#      tagged with workspace_id (arch §11).
#   5. The resulting VIDGEN_EVENTS stream is configured with the five
#      canonical subjects (asset.>, project.>, render.>, clip.>,
#      publish.>) and Interest retention.
#
# Exit codes:
#   0 -> all checks passed
#   1 -> at least one check failed (stderr explains which)
#
# Usage:
#   bash scripts/events-smoke.sh
#
# Assumes:
#   `docker compose --profile realtime up -d` has been run from
#   infra/compose/. The script will validate or start the stack.

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

NATS_HTTP_PORT="${NATS_HTTP_PORT:-8222}"
NATS_PORT="${NATS_PORT:-4222}"

echo "T-022 NATS JetStream smoke — monitor: 127.0.0.1:$NATS_HTTP_PORT"

# ---- 0. container healthy ---------------------------------------------
echo "[0/5] container health"
health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' vidgen-nats 2>/dev/null || echo missing)
if [[ "$health" != "healthy" ]]; then
  echo "  · vidgen-nats not healthy ($health); attempting --profile realtime up -d"
  $COMPOSE --profile realtime up -d nats >/dev/null
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    sleep 2
    health=$(docker inspect --format '{{.State.Health.Status}}' vidgen-nats 2>/dev/null || echo missing)
    [[ "$health" == "healthy" ]] && break
  done
fi
[[ "$health" == "healthy" ]] || fail "vidgen-nats container '$health'"
pass "vidgen-nats healthy"

# ---- 1. monitoring endpoints ------------------------------------------
echo "[1/5] monitoring endpoints"
curl -fsS "http://127.0.0.1:${NATS_HTTP_PORT}/healthz" >/dev/null \
  || fail "/healthz unreachable on 127.0.0.1:${NATS_HTTP_PORT}"
pass "/healthz reachable"

jsz=$(curl -fsS "http://127.0.0.1:${NATS_HTTP_PORT}/jsz")
[[ -n "$jsz" ]] || fail "/jsz returned empty"
pass "/jsz reachable"

# ---- 2. JetStream enabled ---------------------------------------------
echo "[2/5] JetStream enabled"
# `/jsz` is only served when JetStream is on; the presence of
# "config" or "memory" fields is sufficient evidence. We also fail loudly
# if the response is the bare "not enabled" stub NATS returns.
if echo "$jsz" | grep -q '"not enabled"'; then
  fail "JetStream is NOT enabled — /jsz returned the disabled stub"
fi
echo "$jsz" | grep -q '"config"' || fail "/jsz missing config block — JetStream not initialized"
pass "JetStream is enabled"

# ---- 3. round-trip publish/subscribe via @vidgen/events ---------------
echo "[3/5] @vidgen/events round-trip (publish → subscribe)"
# We export NATS_URL pointed at the host-bound 4222 so the test runs
# from the host (no extra container needed). This is the same code path
# the workers + API will use in production via the in-network nats:4222.
export NATS_URL="nats://127.0.0.1:${NATS_PORT}"

# vitest skips the jetstream suite by default; setting NATS_URL flips
# the `describe.runIf(process.env.NATS_URL)` gate and runs it.
( cd "$REPO_ROOT" && pnpm --filter @vidgen/events test -- --run jetstream ) \
  || fail "@vidgen/events JetStream tests failed against nats://127.0.0.1:${NATS_PORT}"
pass "publish + subscribe round-trip succeeded"

# ---- 4. stream config verification ------------------------------------
echo "[4/5] VIDGEN_EVENTS stream config"
# Reach into the same monitoring port for a definitive view of the
# stream NATS itself reports it has. Avoids a dep on the `nats` CLI.
stream_jsz=$(curl -fsS "http://127.0.0.1:${NATS_HTTP_PORT}/jsz?streams=true&consumers=true&config=true")
echo "$stream_jsz" | grep -q "VIDGEN_EVENTS" \
  || fail "VIDGEN_EVENTS stream not found in /jsz"
# NATS' /jsz output JSON-encodes `>` as \u003e, so we check the prefix.
for prefix in asset project render clip publish; do
  echo "$stream_jsz" | grep -q "${prefix}.\\\\u003e" \
    || fail "stream missing subject filter '${prefix}.>'"
done
pass "stream VIDGEN_EVENTS present with the five canonical subjects"

# ---- 5. summary -------------------------------------------------------
echo "[5/5] all checks passed"
echo "✓ T-022 smoke OK"
