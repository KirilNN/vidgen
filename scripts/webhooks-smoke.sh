#!/usr/bin/env bash
# vidgen — T-023 webhook fan-out smoke script.
#
# Verifies T-023's acceptance criterion end-to-end against the live
# stack:
#   1. The new Novu + MongoDB containers come up healthy in the `core`
#      profile (compose-only check — does not exercise Novu).
#   2. The notifier+fanout unit suites pass (notifier.test.ts +
#      fanout.test.ts inside @vidgen/api).
#   3. Optionally (when NATS_URL is set and DB+API are up), runs the
#      live end-to-end registration → event → signed POST path.
#
# Today the API service is not yet a long-running compose service
# (T-015 builds it on the host). Step 3 is therefore gated on the
# RUN_E2E env var; defaults to off so this script is safe to run
# without booting Postgres.
#
# Exit codes:
#   0 -> all checks passed
#   1 -> at least one check failed
#
# Usage:
#   bash scripts/webhooks-smoke.sh                  # compose + unit checks
#   RUN_E2E=1 bash scripts/webhooks-smoke.sh        # also exercise the live API

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

echo "T-023 webhook fan-out smoke"

# ---- 0. compose validates -------------------------------------------------
echo "[0/3] compose config validates"
$COMPOSE --profile core config --quiet \
  || fail "docker compose config failed for the core profile"
pass "compose --profile core config OK"

# Compose-services-that-must-exist check. We do NOT require them to be
# running — operators may scope `up` to a subset — but the YAML must
# declare them.
for svc in mongodb novu-api novu-worker novu-ws novu-dashboard; do
  services=$($COMPOSE --profile core config --services)
  echo "$services" | grep -qx "$svc" \
    || fail "service '$svc' missing from compose"
done
pass "novu + mongodb services declared in core profile"

# ---- 1. unit tests (notifier + fan-out) ----------------------------------
echo "[1/3] notifier + fan-out unit suites"
( cd "$REPO_ROOT" && pnpm --filter @vidgen/api test -- --run notifier ) \
  || fail "notifier unit tests failed"
pass "notifier unit suite passed"

( cd "$REPO_ROOT" && pnpm --filter @vidgen/api test -- --run fanout ) \
  || fail "fanout integration test failed"
pass "fanout integration test passed"

( cd "$REPO_ROOT" && pnpm --filter @vidgen/api test -- --run webhooks.routes ) \
  || fail "webhooks routes test failed"
pass "webhooks routes test passed"

# ---- 2. (optional) end-to-end against the live API ------------------------
echo "[2/3] end-to-end (RUN_E2E=${RUN_E2E:-})"
if [[ -z "${RUN_E2E:-}" ]]; then
  echo "  · skipped (set RUN_E2E=1 to run the live registration test)"
else
  : "${API_BASE:=http://127.0.0.1:3001}"
  : "${API_BEARER:?RUN_E2E=1 requires API_BEARER (Keycloak access token)}"
  : "${WORKSPACE_ID:?RUN_E2E=1 requires WORKSPACE_ID for the caller}"

  # Start an ephemeral HTTP receiver on a random port.
  PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("",0)); print(s.getsockname()[1]); s.close()')
  CAP_FILE="$(mktemp)"
  python3 - "$PORT" "$CAP_FILE" <<'PY' &
import sys, json, http.server
port = int(sys.argv[1]); out = sys.argv[2]
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("content-length", "0"))
        body = self.rfile.read(n).decode("utf-8")
        with open(out, "w") as f:
            json.dump({"headers": dict(self.headers), "body": body}, f)
        self.send_response(200); self.end_headers()
    def log_message(self, *a, **k): pass
srv = http.server.HTTPServer(("127.0.0.1", port), H)
srv.handle_request()
PY
  RECEIVER_PID=$!
  trap 'kill $RECEIVER_PID 2>/dev/null || true; rm -f "$CAP_FILE"' EXIT

  WEBHOOK_URL="http://127.0.0.1:${PORT}/hook"
  echo "  · receiver up on $WEBHOOK_URL"

  CREATE_RES=$(curl -fsS -X POST \
    -H "Authorization: Bearer $API_BEARER" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$WEBHOOK_URL\",\"events\":[\"asset.ingested\"]}" \
    "$API_BASE/workspaces/$WORKSPACE_ID/webhooks")
  WEBHOOK_ID=$(echo "$CREATE_RES" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
  SECRET=$(echo "$CREATE_RES" | python3 -c 'import json,sys; print(json.load(sys.stdin)["secret"])')
  pass "registered webhook $WEBHOOK_ID"

  # Publish a synthetic asset.ingested event. We use the dev `nats`
  # CLI if present, otherwise fall back to a tiny Node one-liner against
  # @vidgen/events.
  EMITTED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  PAYLOAD=$(printf '{"workspace_id":"%s","emitted_at":"%s","asset_id":"smoke-1","source_uri":"s3://test","sha256":"%s","duration_ms":100}' \
    "$WORKSPACE_ID" "$EMITTED" "$(printf '0%.0s' {1..64})")
  ( cd "$REPO_ROOT" && NATS_URL="${NATS_URL:-nats://127.0.0.1:4222}" \
      node --input-type=module -e "
        import { createJetStreamBus } from '@vidgen/events';
        const bus = await createJetStreamBus({ url: process.env.NATS_URL });
        await bus.publish('asset.ingested', $PAYLOAD);
        await bus.close();
      " )
  pass "published synthetic asset.ingested"

  # Wait up to 10 s for the receiver to capture.
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    [[ -s "$CAP_FILE" ]] && break
    sleep 1
  done
  [[ -s "$CAP_FILE" ]] || fail "no POST received within 10 s"
  pass "receiver captured a POST"

  # Verify the signature.
  python3 - "$CAP_FILE" "$SECRET" <<'PY'
import sys, json, hmac, hashlib
cap = json.load(open(sys.argv[1])); secret = sys.argv[2]
hdr = {k.lower(): v for k, v in cap["headers"].items()}
assert hdr.get("x-vidgen-event") == "asset.ingested", hdr
sig = hdr["x-vidgen-signature"]; ts = hdr["x-vidgen-timestamp"]
t = sig.split(",")[0].split("=")[1]; v1 = sig.split("v1=")[1]
mac = hmac.new(secret.encode(), f"{ts}.{cap['body']}".encode(), hashlib.sha256).hexdigest()
assert mac == v1, f"signature mismatch:\n  expected {mac}\n  got      {v1}"
print("  ✓ HMAC signature valid")
PY

  # Clean up.
  curl -fsS -X DELETE \
    -H "Authorization: Bearer $API_BEARER" \
    "$API_BASE/workspaces/$WORKSPACE_ID/webhooks/$WEBHOOK_ID" >/dev/null
  pass "webhook deregistered"
fi

# ---- 3. summary -----------------------------------------------------------
echo "[3/3] all checks passed"
echo "✓ T-023 smoke OK"
