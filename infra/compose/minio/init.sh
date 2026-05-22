#!/usr/bin/env sh
# vidgen — MinIO bootstrap sidecar (T-012)
#
# Runs once per `docker compose up`, against the live `minio` server. Idempotent
# by design — every step uses --ignore-existing / set-or-update semantics so
# repeated boots are safe.
#
# Architecture reference: docs/architecture.md §5.1 (bucket layout).
#
# Steps:
#   1. Wait for the MinIO server to answer the health probe.
#   2. Register an `mc` alias for the local server using root creds.
#   3. Create the four buckets:
#        media-raw      — immutable source uploads (versioning ON for E2 immutability)
#        media-derived  — rebuildable renditions
#        media-chunks   — in-flight tus chunks
#        public         — CDN-fronted public objects (anonymous GET)
#   4. Enable versioning on media-raw.
#   5. Attach the public-read policy to public/*.
#   6. Emit a one-time warning if root creds are still the dev sentinel
#      (`change-me`) so operators notice before exposing the service.
#
# Exits non-zero on any step failure so compose marks the sidecar `exited(1)`
# and operators see the problem in `docker compose ps`.

set -eu

ALIAS="${MC_ALIAS:-local}"
ENDPOINT="${MINIO_INTERNAL_ENDPOINT:-http://minio:9000}"
USER="${MINIO_ROOT_USER:?MINIO_ROOT_USER is required}"
PASS="${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}"
BUCKET_RAW="${MINIO_BUCKET_RAW:-media-raw}"
BUCKET_DERIVED="${MINIO_BUCKET_DERIVED:-media-derived}"
BUCKET_CHUNKS="${MINIO_BUCKET_CHUNKS:-media-chunks}"
BUCKET_PUBLIC="${MINIO_BUCKET_PUBLIC:-public}"
POLICY_FILE="${MINIO_PUBLIC_POLICY_FILE:-/etc/minio/public-readonly.json}"

log() { printf '[minio-init] %s\n' "$*"; }
warn() { printf '[minio-init] WARN: %s\n' "$*" >&2; }

# --- 1. Wait for the server to be ready ----------------------------------
# `mc ready` returns 0 only when the cluster is online and accepting requests.
# Retry for ~60s; if MinIO hasn't booted by then something is wrong upstream.
log "waiting for $ENDPOINT to be ready"
i=0
until mc alias set "$ALIAS" "$ENDPOINT" "$USER" "$PASS" >/dev/null 2>&1 \
      && mc ready "$ALIAS" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    warn "minio did not become ready within 60s"
    exit 1
  fi
  sleep 2
done
log "server ready"

# --- 2. Create buckets ---------------------------------------------------
# `--ignore-existing` makes this idempotent on every subsequent boot.
for b in "$BUCKET_RAW" "$BUCKET_DERIVED" "$BUCKET_CHUNKS" "$BUCKET_PUBLIC"; do
  log "ensuring bucket $b"
  mc mb --ignore-existing "$ALIAS/$b"
done

# --- 3. Versioning on media-raw -----------------------------------------
# arch §E2: source media is immutable, derivatives are rebuildable. Versioning
# protects against accidental overwrite of the source object.
log "enabling versioning on $BUCKET_RAW"
mc version enable "$ALIAS/$BUCKET_RAW" >/dev/null

# --- 4. Public-read policy on public/* -----------------------------------
# We use a custom IAM policy (POLICY_FILE) attached as the anonymous policy of
# the bucket via `mc anonymous set-json`. This is preferred over the broader
# `mc anonymous set download` which also exposes ListObjects.
if [ -f "$POLICY_FILE" ]; then
  log "applying public-read policy to $BUCKET_PUBLIC from $POLICY_FILE"
  mc anonymous set-json "$POLICY_FILE" "$ALIAS/$BUCKET_PUBLIC" >/dev/null
else
  warn "policy file $POLICY_FILE not found; falling back to 'mc anonymous set download'"
  mc anonymous set download "$ALIAS/$BUCKET_PUBLIC" >/dev/null
fi

# --- 5. Default-creds warning -------------------------------------------
# We only warn — refusing to start would break the first-boot dev flow. The
# `.env.example` ships these as `change-me`; operators are expected to
# replace them before exposing the service beyond localhost.
if [ "$USER" = "change-me" ] || [ "$PASS" = "change-me" ] \
   || [ "$USER" = "minioadmin" ] || [ "$PASS" = "minioadmin" ]; then
  warn "MinIO root credentials are still defaults ($USER). Rotate before exposing the service."
fi

log "bootstrap complete: 4 buckets, versioning on $BUCKET_RAW, anonymous read on $BUCKET_PUBLIC"
