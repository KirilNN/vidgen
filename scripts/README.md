# scripts/

Repository-wide shell scripts (smoke tests, codegen wrappers, dev helpers).

| Script                | Owner ticket | Purpose                                                                                                                                                                            |
| --------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gen-sdk.sh`          | T-005        | Regenerate the typed SDK from `packages/openapi/openapi.yaml`.                                                                                                                     |
| `check-sdk-fresh.sh`  | T-005        | CI guard: fail if the committed SDK differs from `gen-sdk.sh`'s output.                                                                                                            |
| `husky-install.mjs`   | T-004        | Idempotent Husky bootstrap (no-op in CI).                                                                                                                                          |
| `postgres-smoke.sh`   | T-010        | Verify the Postgres core container's extensions, RLS helper, and app-role contract.                                                                                                |
| `db-migrate-smoke.sh` | T-011        | Apply Drizzle migrations twice (idempotency), then verify RLS gates the `app` role end-to-end.                                                                                     |
| `minio-init.sh`       | T-012        | Verify the four buckets, versioning on `media-raw`, anonymous GET on `public/*`, deny on `media-raw/*`.                                                                            |
| `keycloak-smoke.sh`   | T-013        | Verify the `app` realm, both clients, three roles, OIDC discovery, and dev-user grant (ENV=dev).                                                                                   |
| `caddy-smoke.sh`      | T-014        | Verify Caddy is healthy, the Caddyfile parses, every `*.localhost` site terminates TLS, and the served leaf cert chains to Caddy's local root CA.                                  |
| `api-smoke.sh`        | T-015        | End-to-end against the running `vidgen-api` container: `/health` payload, `/me` 401 without token, two-user happy path with tenant isolation.                                      |
| `redis-smoke.sh`      | T-017        | Verify `vidgen-redis` (DragonflyDB) is healthy, accepts `PING` on the host port, round-trips `SET/GET`, and persists to a named volume.                                            |
| `web-smoke.sh`        | T-016        | Verify the `vidgen-web` container is healthy, redirects anonymous traffic to `/login`, and `/api/auth/login` issues a Keycloak PKCE redirect.                                      |
| `temporal-smoke.sh`   | T-020        | Verify the Temporal server + UI are healthy, both Postgres DBs exist, namespace `app` is registered, `temporal workflow list -n app` works, and Caddy serves `temporal.localhost`. |

`T-002` will wire most of these into a top-level `Makefile`'s `make smoke`
target. Until then, run them directly.
