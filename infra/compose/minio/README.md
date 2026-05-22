# `infra/compose/minio/` — MinIO object storage

Owned by [T-012](../../../docs/tickets.md#t-012--minio-with-bucket-conventions-).
Implements [`architecture.md` §5.1](../../../docs/architecture.md) — the
S3-compatible object storage where **all** media bytes live (raw, derived,
in-flight chunks, public/share assets).

> **Rule (build-plan §"Guiding rules"):** Postgres holds metadata only; media
> bytes always live here (Mode A: MinIO) or in Cloudflare R2 (Mode B). The
> `Storage` adapter swaps between them by env.

## Buckets (created by `init.sh`)

| Bucket          | Purpose                                        | Special config               |
| --------------- | ---------------------------------------------- | ---------------------------- |
| `media-raw`     | Immutable source uploads, keyed by workspace.  | **Versioning ON** (arch E2)  |
| `media-derived` | Rebuildable renditions (HLS, thumbnails, MP4). | versioning off               |
| `media-chunks`  | In-flight tus uploads.                         | versioning off; TTL planned  |
| `public`        | CDN-fronted share assets, embeds, thumbnails.  | **anonymous `s3:GetObject`** |

All keys are workspace-prefixed: `<bucket>/<workspace_id>/...` (enforced by the
application layer; bucket policies do not depend on it).

## Services

The compose file defines two services under the `core` profile:

| Service      | Image                                      | Role                                                                       |
| ------------ | ------------------------------------------ | -------------------------------------------------------------------------- |
| `minio`      | `minio/minio:RELEASE.2024-12-18T13-15-44Z` | The server. Data on the `minio_data` named volume.                         |
| `minio-init` | `minio/mc:RELEASE.2024-11-21T17-21-54Z`    | One-shot sidecar that creates buckets + policies + versioning, then exits. |

### Ports

| Port (host) | Port (container) | Purpose                                                |
| ----------- | ---------------- | ------------------------------------------------------ |
| `9000`      | `9000`           | S3 API (used by services and the host `aws`/`mc` CLI). |
| `9001`      | `9001`           | Web console (dev only — see _Console access_ below).   |

In production both ports stay inside the Docker network; Caddy (T-014)
exposes them under `s3.localhost` and `minio.localhost`.

### Console access

The console listens on `9001` and is bound to the host **only because we have
no reverse proxy yet** (T-014 lands Caddy). Once T-014 is merged, the host
binding will be removed and the console will only be reachable through
`https://minio.localhost`.

## `init.sh` contract

`init.sh` is idempotent and safe to run on every boot:

1. Polls `mc ready` until the server is accepting traffic (≤60 s).
2. `mc mb --ignore-existing` for each of the four buckets.
3. `mc version enable` on `media-raw`.
4. `mc anonymous set-json /etc/minio/public-readonly.json` on `public` — grants
   `s3:GetObject` to `*` for `arn:aws:s3:::public/*`. Listing remains denied.
5. Warns to stderr if `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` are still
   `change-me` (or the upstream `minioadmin` default).

If any step fails, the sidecar exits non-zero, surfacing the problem in
`docker compose ps -a`.

## Run

```bash
cd infra/compose
cp .env.example .env                   # then set strong MINIO_ROOT_* values
docker compose --profile core up -d minio minio-init

# Bucket listing (host has `mc` installed):
docker compose run --rm minio-init mc ls local/

# Or via host AWS CLI:
AWS_ACCESS_KEY_ID="$MINIO_ROOT_USER" \
AWS_SECRET_ACCESS_KEY="$MINIO_ROOT_PASSWORD" \
aws --endpoint-url http://localhost:9000 s3 ls
```

## Smoke

`bash scripts/minio-init.sh` verifies the T-012 acceptance criteria
end-to-end (bucket existence, versioning state, anonymous GET on `public/`,
auth required on `media-raw/`).

## Out of scope (per ticket)

- TLS termination → T-014 Caddy.
- Per-workspace bucket policies → not needed; isolation is enforced in the API
  layer by workspace-prefixed keys (arch §11).
- R2 swap → ships in Mode B (T-210/T-211).
- Lifecycle policies for `media-chunks` TTL → ships with the tus worker (T-030).
