# `infra/compose/` — Docker Compose stack

Scaffold delivered by [T-003](../../docs/tickets.md#t-003--docker-compose-profiles-scaffold-).
Real services land in later tickets (T-010 → T-122).

## Purpose

A single `docker-compose.yml` that defines the **profile structure** for every
runtime tier described in [`architecture.md` §4.1](../../docs/architecture.md).
Each profile currently carries one `busybox` placeholder service (`/bin/true`,
multi-arch) so that `docker compose --profile <name> config` and `up -d`
validate cleanly *today*, before any real service exists. As subsequent tickets
land, placeholders are replaced by the real containers.

## Profiles

| Profile    | Owns (when fully built)                                              | Lands in tickets |
| ---------- | -------------------------------------------------------------------- | ---------------- |
| `core`     | Postgres, Redis, MinIO, Keycloak, Caddy, API, Web                    | T-010, T-012, T-013, T-014, T-015, T-016, T-017 |
| `media`    | `ffmpeg-worker`, `mlt-worker`, `remotion-worker`                     | T-032, T-062, T-090 |
| `ai-cpu`   | `whisper-cpu`, `piper`, `ollama` (small), `argos-translate`, `rembg` | T-041, T-070, etc. |
| `ai-gpu`   | `whisperx-gpu`, `xtts-gpu`, `sam2`, `propainter`, `vllm`             | F4/F5 phases    |
| `realtime` | LiveKit SFU, Hocuspocus, NATS JetStream                              | T-022, T-110     |
| `obs`      | Prometheus, Grafana, Loki, Tempo, OpenTelemetry collector            | T-121, T-122     |
| `dev`      | Mailpit, MinIO console, pgAdmin, Temporal Web                        | T-200            |

## Run

```bash
cd infra/compose
cp .env.example .env             # edit secrets first

# Validate every profile (no containers started):
for p in core media ai-cpu ai-gpu realtime obs dev; do
  docker compose --profile "$p" config >/dev/null && echo "  ✓ $p"
done

# A typical laptop dev loop (per architecture.md §4.1):
docker compose --profile core --profile media --profile ai-cpu up -d
docker compose ps
docker compose down -v           # full teardown, removes named volumes
```

## GPU support

The `ai-gpu` profile is meant for hosts with NVIDIA (CUDA) or AMD (ROCm) GPUs.
Apply `compose.gpu.override.yml` to attach a GPU device reservation:

```bash
docker compose -f docker-compose.yml -f compose.gpu.override.yml \
  --profile core --profile ai-gpu up -d
```

The override file is a skeleton with the `deploy.resources.reservations.devices`
block commented in. Each ticket that promotes an `ai-gpu` placeholder to a
real service (e.g. T-070 large-model Ollama, F4 enhancement workers) is
responsible for uncommenting it on the specific service.

## Named volumes

Defined up-front so this file is the single source of truth for durable state:

| Volume       | Filled by | Holds |
| ------------ | --------- | ----- |
| `pg_data`    | T-010     | Postgres data directory |
| `minio_data` | T-012     | MinIO object storage |
| `models`     | T-070     | Ollama / WhisperX model cache |
| `redis_data` | T-017     | DragonflyDB AOF |

## Network

A single user-defined bridge `appnet` connects every service so they can
address each other by service name (e.g. `postgres`, `minio`).

## Environment

`.env.example` is the single source of truth for variable **names** the later
tickets will consume. Copy to `.env` (git-ignored) and replace every
`change-me`. Per [architecture.md §11](../../docs/architecture.md), the
multi-tenant `workspace_id` invariant is enforced in the application layer, not
in env vars.

## Acceptance (T-003)

| Criterion | How to verify |
| --- | --- |
| `docker compose --profile <name> config` validates every profile | `for p in core media ai-cpu ai-gpu realtime obs dev; do docker compose --profile "$p" config >/dev/null; done` |
| `docker compose --profile core up -d` boots the placeholder | `docker compose --profile core up -d && docker compose ps -a` |
| `docker compose down -v` cleans up | `docker compose down -v && docker volume ls \| grep vidgen \|\| true` |

## Out of scope (per ticket)

Real services. They land in later phases per the table above.
