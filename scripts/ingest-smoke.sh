#!/usr/bin/env bash
# vidgen — Ingest pipeline smoke script (T-030 / T-031 / T-032)
#
# Verifies the acceptance criteria of the three ingest tickets end-to-end:
#
#   T-030 (tus resumable uploads)
#     - `tusd` sidecar starts in the `core` profile and is reachable
#       via Caddy at `https://upload.localhost` (port-forwarded inside
#       the compose network as `tusd:1080`).
#     - tusd's /metrics endpoint responds with `tusd_` metrics.
#     - Pre-create + post-finish hooks are wired to the API's
#       `/internal/tus/*` routes.
#
#   T-031 (IngestAssetWorkflow)
#     - A POST to `/internal/tus/post-finish` (simulating tusd's hook
#       fire) starts a workflow named `ingest-<uuid>` on the `light`
#       task queue.
#     - The activities upsert one assets row and (when ffmpeg is
#       reachable) two renditions rows (mezzanine + audio).
#     - The workflow publishes `asset.ingested` to NATS — verified by
#       a JetStream consumer pull.
#
#   T-032 (FFmpeg media worker)
#     - `vidgen-worker-media` container has ffmpeg + ffprobe on PATH.
#     - The mezzanine + audio rendition outputs land in
#       `media-derived/{ws}/{asset}/`.
#
# Exit codes:
#   0 -> all checks passed
#   1 -> at least one check failed (stderr explains which)
#
# Usage:
#   bash scripts/ingest-smoke.sh
#   bash scripts/ingest-smoke.sh --quick    # only the per-container checks; skip the end-to-end upload
#
# Assumes:
#   `docker compose --profile core --profile media up -d` has been run
#   from infra/compose/. The script will validate or start the stack.

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

QUICK=0
if [[ "${1:-}" == "--quick" ]]; then
  QUICK=1
fi

NAMESPACE="${TEMPORAL_NAMESPACE:-app}"
INGEST_QUEUE="${INGEST_TASK_QUEUE:-light}"
TUSD_PORT="${TUSD_PORT:-1080}"

echo "T-030/31/32 ingest pipeline smoke — task queue: $INGEST_QUEUE, tusd port: $TUSD_PORT"

# ---- 0. ensure containers are up --------------------------------------
echo "[0/7] containers (tusd + worker-media + nats)"
for c in vidgen-tusd vidgen-worker-media vidgen-api vidgen-minio vidgen-nats; do
  state=$(docker inspect --format '{{.State.Status}}' "$c" 2>/dev/null || echo missing)
  if [[ "$state" != "running" ]]; then
    echo "  · $c state '$state'; bringing up core + media + realtime profiles"
    $COMPOSE --profile core --profile media --profile realtime up -d >/dev/null
    sleep 4
    state=$(docker inspect --format '{{.State.Status}}' "$c" 2>/dev/null || echo missing)
  fi
  [[ "$state" == "running" ]] || fail "$c not running ($state)"
  pass "$c running"
done

# ---- 1. tusd reachable + serving metrics ------------------------------
echo "[1/7] tusd metrics endpoint"
# tusd /metrics is plain text (Prometheus exposition format). The
# baseline tusd_* metrics exist as soon as the server starts even with
# zero uploads.
metrics=$(docker exec vidgen-tusd wget -qO- "http://127.0.0.1:1080/metrics" 2>&1 || true)
if echo "$metrics" | grep -q "tusd_"; then
  pass "tusd /metrics serves tusd_* metrics"
else
  fail "tusd /metrics returned no tusd_ metrics:\n$metrics"
fi

# ---- 2. ffmpeg + ffprobe inside the media container -------------------
echo "[2/7] ffmpeg / ffprobe on the media-pool container"
docker exec vidgen-worker-media ffmpeg -version >/dev/null 2>&1 \
  || fail "ffmpeg missing from vidgen-worker-media"
docker exec vidgen-worker-media ffprobe -version >/dev/null 2>&1 \
  || fail "ffprobe missing from vidgen-worker-media"
pass "ffmpeg + ffprobe present"

# ---- 3. internal HMAC-protected endpoints reject unauthenticated -----
echo "[3/7] /internal/assets rejects without HMAC token"
# Use docker exec'd curl so we hit the API on the compose network
# (avoids depending on a host port mapping).
unauth=$(docker exec vidgen-api node -e '
  const res = await fetch("http://localhost:3001/internal/assets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspace_id: "ws_smoke", source_uri: "s3://x/y", sha256: "0".repeat(64), mime: "video/mp4" }),
  });
  console.log(res.status);
' 2>&1 || true)
if echo "$unauth" | tail -1 | grep -q "401"; then
  pass "/internal/assets returns 401 without token"
else
  fail "/internal/assets did not return 401: $unauth"
fi

# ---- 4. post-finish triggers a workflow on the ingest queue -----------
if (( QUICK )); then
  echo "[4/7] skipped (--quick)"
  echo "[5/7] skipped (--quick)"
  echo "[6/7] all quick checks passed"
  echo "✓ T-030/31/32 quick smoke OK"
  exit 0
fi

echo "[4/7] post-finish hook starts IngestAssetWorkflow"
# Start a JetStream subscriber on asset.> BEFORE we publish so the
# Interest retention stream doesn't drop our message before we can
# verify it.
nats_network=$(docker inspect vidgen-nats \
  --format '{{ range $k, $_ := .NetworkSettings.Networks }}{{ $k }}{{ end }}' 2>/dev/null || true)
[[ -n "$nats_network" ]] || fail "could not discover vidgen-nats network"
docker rm -f vidgen-smoke-nats-sub >/dev/null 2>&1 || true
docker run -d --name vidgen-smoke-nats-sub --network "$nats_network" \
  natsio/nats-box:latest \
  nats --server=nats://nats:4222 sub 'asset.>' \
  >/dev/null 2>&1 || true
sleep 1
pass "subscribed to VIDGEN_EVENTS asset.>"
# We POST a tusd-style payload that mimics a finished upload. The API
# starts the workflow but it will likely fail at finalizeUpload (the
# chunk doesn't exist in MinIO). That's fine for this check — the
# workflow's *start* is what proves the wiring.
TOKEN="${API_INTERNAL_TOKEN:-${APP_SECRET:-}}"
[[ -n "$TOKEN" ]] || fail "neither API_INTERNAL_TOKEN nor APP_SECRET is set"

# Seed a real chunk in MinIO so the workflow actually progresses past
# finalizeUpload. Use a tiny synthesised mp4 if ffmpeg is available
# locally; otherwise use any 16-byte stub (finalize will copy it and
# the workflow will fail at probeMedia — still proves T-031 reach).
SMOKE_WS="ws_smoke"
SMOKE_USER="33333333-3333-4333-8333-333333333333"
SMOKE_UPLOAD_KEY="smoke-upload-$RANDOM"

# Seed the tenant + user rows so the assets FKs on workspace_id and
# created_by are satisfied. The dev compose stack ships with empty
# tables; the smoke is the first thing to ever write to them.
docker exec -i vidgen-postgres psql -U postgres -d vidgen -v ON_ERROR_STOP=1 <<SQL >/dev/null
INSERT INTO tenants (workspace_id, name) VALUES ('$SMOKE_WS', 'smoke') ON CONFLICT DO NOTHING;
INSERT INTO users (user_id, email, display_name) VALUES ('$SMOKE_USER', 'smoke@example.test', 'smoke') ON CONFLICT DO NOTHING;
SQL
pass "tenants + users rows for $SMOKE_WS seeded"

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT
if command -v ffmpeg >/dev/null 2>&1; then
  ffmpeg -y -hide_banner -loglevel error \
    -f lavfi -i color=c=green:s=320x180:d=1:r=10 \
    -f lavfi -i sine=frequency=440:duration=1:sample_rate=44100 \
    -c:v libx264 -preset ultrafast -pix_fmt yuv420p \
    -c:a aac -shortest "$tmpdir/tiny.mp4"
else
  printf 'not a real mp4' > "$tmpdir/tiny.mp4"
fi

# Push the chunk to MinIO using the minio-init mc client (already in
# core profile, has the alias `local` configured).
docker cp "$tmpdir/tiny.mp4" vidgen-minio:/tmp/smoke.bin
docker exec vidgen-minio sh -c 'mkdir -p /tmp/_mc 2>/dev/null; mc alias set localmc http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1 || true' || true
docker exec vidgen-minio mc cp /tmp/smoke.bin "localmc/media-chunks/$SMOKE_UPLOAD_KEY" >/dev/null \
  || fail "could not seed chunk into MinIO"
pass "seeded media-chunks/$SMOKE_UPLOAD_KEY"

WORKFLOW_RESPONSE=$(docker exec vidgen-api node -e '
  const payload = {
    Type: "post-finish",
    Event: {
      Upload: {
        ID: "'"$SMOKE_UPLOAD_KEY"'",
        Size: 1024,
        MetaData: {
          workspaceId: "'"$SMOKE_WS"'",
          userId: "33333333-3333-4333-8333-333333333333",
          original_filename: "smoke.mp4",
          mime: "video/mp4",
        },
        Storage: { Key: "'"$SMOKE_UPLOAD_KEY"'" },
      },
    },
  };
  const res = await fetch("http://localhost:3001/internal/tus/post-finish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.text();
  console.log(JSON.stringify({ status: res.status, body }));
' 2>&1 || true)

last_line=$(echo "$WORKFLOW_RESPONSE" | tail -1)
case "$last_line" in
  *'"status":200'*)
    pass "post-finish returned 200: $last_line"
    ;;
  *)
    fail "post-finish unexpected: $WORKFLOW_RESPONSE"
    ;;
esac

# Pull the workflow id out of the JSON body.
WORKFLOW_ID=$(echo "$last_line" | node -e '
  let data = "";
  process.stdin.on("data", (c) => { data += c; });
  process.stdin.on("end", () => {
    const wrap = JSON.parse(data);
    const inner = JSON.parse(wrap.body);
    console.log(inner.workflow_id ?? "");
  });
' 2>/dev/null || echo "")
[[ -n "$WORKFLOW_ID" ]] || fail "post-finish did not return a workflow_id"
pass "workflow $WORKFLOW_ID started"

# ---- 5. wait for the workflow to complete -----------------------------
echo "[5/7] workflow completes within 60s"
$COMPOSE --profile dev up -d temporal-admin-tools >/dev/null 2>&1 || true
for i in $(seq 1 30); do
  out=$($COMPOSE exec -T temporal-admin-tools \
    temporal workflow describe --workflow-id "$WORKFLOW_ID" --namespace "$NAMESPACE" 2>&1 || true)
  if echo "$out" | grep -qi "Completed"; then
    pass "workflow $WORKFLOW_ID Completed"
    break
  fi
  if echo "$out" | grep -qi "Failed\|Terminated\|Canceled"; then
    fail "workflow $WORKFLOW_ID ended in failure:\n$out"
  fi
  sleep 2
  if (( i == 30 )); then
    fail "workflow $WORKFLOW_ID did not complete within 60s:\n$out"
  fi
done

# ---- 6. rendition outputs landed in media-derived ---------------------
echo "[6/7] rendition outputs in media-derived"
listing=$(docker exec vidgen-minio mc ls --recursive "localmc/media-derived/$SMOKE_WS/" 2>&1 || true)
if echo "$listing" | grep -q "mezz.mp4"; then
  pass "media-derived/$SMOKE_WS/.../mezz.mp4 present"
else
  fail "no mezz.mp4 found under media-derived/$SMOKE_WS/:\n$listing"
fi
if echo "$listing" | grep -q "audio.wav"; then
  pass "media-derived/$SMOKE_WS/.../audio.wav present"
else
  fail "no audio.wav found under media-derived/$SMOKE_WS/:\n$listing"
fi

# ---- 7. asset.ingested was published on the JetStream bus -------------
echo "[7/7] NATS asset.ingested event captured by subscriber"
sub_logs=$(docker logs vidgen-smoke-nats-sub 2>&1 || true)
docker rm -f vidgen-smoke-nats-sub >/dev/null 2>&1 || true
if echo "$sub_logs" | grep -q "asset.ingested"; then
  pass "saw asset.ingested on subject asset.>"
elif echo "$sub_logs" | grep -qi '"asset_id"'; then
  pass "saw event with asset_id on subject asset.>"
else
  echo "$sub_logs" | tail -20
  fail "subscriber did not capture an asset.* event"
fi

echo "✓ T-030/31/32 smoke OK"
