# `infra/compose/` — Docker Compose stack

Scaffold delivered by [T-003](../../docs/tickets.md#t-003--docker-compose-profiles-scaffold-).
Real services land in later tickets (T-010 → T-122).

## Purpose

A single `docker-compose.yml` that defines the **profile structure** for every
runtime tier described in [`architecture.md` §4.1](../../docs/architecture.md).
Each profile currently carries one `busybox` placeholder service (`/bin/true`,
multi-arch) so that `docker compose --profile <name> config` and `up -d`
validate cleanly _today_, before any real service exists. As subsequent tickets
land, placeholders are replaced by the real containers.

## Profiles

| Profile    | Owns (when fully built)                                              | Lands in tickets                                            |
| ---------- | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| `core`     | Postgres ✅, MinIO ✅, Keycloak ✅, Caddy ✅, Redis, API, Web        | T-010 ✅, T-012 ✅, T-013 ✅, T-014 ✅, T-015, T-016, T-017 |
| `media`    | `ffmpeg-worker`, `mlt-worker`, `remotion-worker`                     | T-032, T-062, T-090                                         |
| `ai-cpu`   | `whisper-cpu`, `piper`, `ollama` (small), `argos-translate`, `rembg` | T-041, T-070, etc.                                          |
| `ai-gpu`   | `whisperx-gpu`, `xtts-gpu`, `sam2`, `propainter`, `vllm`             | F4/F5 phases                                                |
| `realtime` | LiveKit SFU, Hocuspocus, NATS JetStream                              | T-022, T-110                                                |
| `obs`      | Prometheus, Grafana, Loki, Tempo, OpenTelemetry collector            | T-121, T-122                                                |
| `dev`      | Mailpit, MinIO console, pgAdmin, Temporal Web                        | T-200                                                       |

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

| Volume           | Filled by | Holds                                                                                                                                                  |
| ---------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pg_data`        | T-010     | Postgres data directory                                                                                                                                |
| `minio_data`     | T-012     | MinIO object storage                                                                                                                                   |
| `models`         | T-070     | Ollama / WhisperX model cache                                                                                                                          |
| `redis_data`     | T-017     | DragonflyDB AOF                                                                                                                                        |
| `keycloak_realm` | T-013     | One-shot prep volume — `keycloak-init` writes the rendered realm import file here so the server can `--import-realm` from it. Ephemeral; safe to wipe. |
| `caddy_data`     | T-014     | Caddy's **local root CA** + minted leaf certs. Wiping it (`down -v`) forces a new CA — the host trust store must be re-installed (see below).          |
| `caddy_config`   | T-014     | Caddy's adaptive config snapshot (runtime). Safe to wipe.                                                                                              |

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

| Criterion                                                        | How to verify                                                                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `docker compose --profile <name> config` validates every profile | `for p in core media ai-cpu ai-gpu realtime obs dev; do docker compose --profile "$p" config >/dev/null; done` |
| `docker compose --profile core up -d` boots the placeholder      | `docker compose --profile core up -d && docker compose ps -a`                                                  |
| `docker compose down -v` cleans up                               | `docker compose down -v && docker volume ls \| grep vidgen \|\| true`                                          |

## Trusting Caddy's local CA

T-014 added [`caddy`](./caddy/README.md) to the `core` profile. It terminates
HTTPS on every `*.localhost` subdomain using [Caddy's `tls internal`][tls-internal]
directive, which mints leaf certs from a root CA stored in the `caddy_data`
volume. To get **green padlocks instead of browser warnings** the dev installs
that root CA into the host trust store, **once per machine**.

[tls-internal]: https://caddyserver.com/docs/caddyfile/directives/tls#syntax

### macOS — one-time install

```bash
cd infra/compose

# 1. Start the proxy (and at least one upstream so Caddy mints its first
#    leaf cert — without that, only the root exists, which is what we copy).
docker compose --profile core up -d caddy
curl -k --resolve auth.localhost:443:127.0.0.1 \
  https://auth.localhost/ >/dev/null

# 2. Copy the local root CA out of the named volume.
docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt \
  ./caddy-root-ca.crt

# 3. Trust it. Adds to the System keychain so Safari, Chrome, Edge, Brave
#    and `curl` (which uses the system store on macOS 11+) all pick it up.
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain ./caddy-root-ca.crt

# 4. Restart any open browser windows. Verify:
curl --resolve auth.localhost:443:127.0.0.1 \
  https://auth.localhost/realms/app/.well-known/openid-configuration | head

# 5. Clean up the exported cert file (the trust is now in your keychain).
rm caddy-root-ca.crt
```

> **Firefox** uses its own trust store. Set
> `security.enterprise_roots.enabled = true` in `about:config` to have it
> inherit the macOS System keychain, or import `caddy-root-ca.crt` manually
> via _Settings → Privacy & Security → Certificates → View Certificates →
> Authorities → Import_.

### After `docker compose down -v`

Wiping volumes deletes `caddy_data` — Caddy will generate a **new** root CA
on the next start, and your old trusted entry no longer matches. Symptoms:
every `*.localhost` URL shows a cert warning again. Fix: repeat the install
above. To avoid a Keychain littered with stale roots, you can first remove
the previous entry — open _Keychain Access → System → Certificates_, search
for `Caddy Local Authority`, and delete the obsolete row(s).

### Linux / Windows

The same `docker compose cp` works everywhere. The trust-store install
command varies:

| OS                          | Install command                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| Debian / Ubuntu             | `sudo cp caddy-root-ca.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates`  |
| Fedora / RHEL               | `sudo cp caddy-root-ca.crt /etc/pki/ca-trust/source/anchors/ && sudo update-ca-trust`         |
| Windows (PowerShell, Admin) | `Import-Certificate -FilePath .\caddy-root-ca.crt -CertStoreLocation Cert:\LocalMachine\Root` |

### Smoke-test

```bash
bash scripts/caddy-smoke.sh
```

Asserts: container healthy, Caddyfile parses, every `*.localhost` site
terminates TLS, and the served leaf cert chains back to the local root CA
(no `-k`).

## Out of scope (per ticket)

Real services. They land in later phases per the table above.
