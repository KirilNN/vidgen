# `infra/compose/temporal/` — Temporal dev cluster (T-020)

Scaffold delivered by [T-020](../../../docs/tickets.md#t-020--temporal-cluster-dev-mode-).

## Purpose

Adds **Temporal** (server + Web UI) to the `core` Docker Compose profile, backed
by the existing T-010 Postgres cluster. Temporal is the spine for every
long-running operation in the architecture — ingest, transcribe, render, dub,
clip generation, schedule publish, etc. (see [`docs/architecture.md` §6][arch6]).

## What this directory contains

| File                             | Purpose                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `init.sh`                        | One-shot sidecar: creates the `temporal` Postgres role and the two databases (`temporal`, `temporal_visibility`) inside the T-010 cluster. Idempotent, runs before the server. |
| `dynamicconfig/development.yaml` | Dev-mode Temporal dynamic config. Mirrors the canonical upstream `development-sql.yaml` (255-byte ID limit + forced search-attribute cache refresh). Not safe for production.  |

## Containers added to the compose stack

| Service                | Profile | Image                                                   | Purpose                                                                                                                                      |
| ---------------------- | ------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `temporal-init`        | `core`  | `postgres:16-alpine`                                    | Pre-creates the role + two DBs in the T-010 Postgres cluster.                                                                                |
| `temporal`             | `core`  | `temporalio/auto-setup:1.29.6`                          | Frontend / history / matching / worker server. Auto-runs schema migrations on boot and registers namespace `app`. Listens on `:7233` (gRPC). |
| `temporal-ui`          | `core`  | `temporalio/ui:2.50.0`                                  | Read-only Web UI. Routed by Caddy at `https://temporal.localhost`. Host-port `8088` for direct dev access.                                   |
| `temporal-admin-tools` | `dev`   | `temporalio/admin-tools:1.29.6.1-tctl-1.18.4-cli-1.7.0` | CLI sidecar (`temporal …`, `tctl …`). Sleeps forever so the smoke script can `docker compose exec` into it.                                  |

> **Note on profile placement:** [`docs/architecture.md` §4.1][arch41] originally
> lists "Temporal Web" under the `dev` profile. T-020 explicitly overrides this
> and places **both** the server and the Web UI in the `core` profile so that
> any contributor running the minimum-viable stack
> (`docker compose --profile core up`) immediately has the workflow plane and
> its UI available — workflows are the spine of every long op, so the UI is
> not a dev-only convenience. The CLI tools (`temporal-admin-tools`) stay in
> `dev` since they are only needed for operator inspection.

## Run

```bash
cd infra/compose
docker compose --profile core up -d

# Browser:  https://temporal.localhost/      (UI; trust Caddy's local CA first)
# Browser:  http://localhost:8088/           (UI; bypasses Caddy)
# gRPC:     localhost:7233                   (workers / Temporal SDK)
```

## Smoke test

```bash
bash scripts/temporal-smoke.sh
```

The script verifies:

1. `vidgen-temporal` and `vidgen-temporal-ui` containers are healthy.
2. Both databases (`temporal`, `temporal_visibility`) exist in Postgres.
3. The `app` namespace was registered at boot.
4. `temporal workflow list --namespace app` succeeds from the admin-tools
   sidecar (the ticket's stated acceptance check).
5. `https://temporal.localhost/` serves the UI and the cert chains back to
   Caddy's local CA.

## Persistence

Temporal stores all durable state (workflow history, visibility records) in
the existing Postgres cluster's `pg_data` volume. **No new named volume is
needed.** Wiping `pg_data` resets Temporal alongside everything else.

## Multi-tenancy

T-020 ships infra only — no rows are created in Temporal yet. The
`workspace_id` discipline (architecture §11) kicks in once workflows are
actually started: every Temporal workflow ID, search attribute, and the
mirrored `workflows` table row (architecture §5.2) is prefixed/tagged with
`workspace_id`. T-021 onward enforces this in the worker SDK; T-020 only
provides the runtime they run on.

## Why Postgres-backed, not the SQLite dev-server

The `temporalio/temporal:server` image ships an in-process SQLite store
which is fine for one-machine demos but cannot share state across
restarts that involve a volume reset, and cannot back the visibility API
properly. We reuse the T-010 Postgres cluster instead so production
behaviour and local-dev behaviour match (arch §5.1: Postgres is the
primary OLTP store).

## References

- [`docs/architecture.md` §6 — Async job + workflow plane][arch6]
- [`docs/architecture.md` §4.1 — Docker profiles][arch41]
- [Temporal docs — Server architecture](https://docs.temporal.io/temporal-service)
- [`temporalio/docker-compose` upstream](https://github.com/temporalio/docker-compose)

[arch6]: ../../../docs/architecture.md
[arch41]: ../../../docs/architecture.md
