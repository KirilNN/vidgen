# scripts/

Repository-wide shell scripts (smoke tests, codegen wrappers, dev helpers).

| Script                | Owner ticket | Purpose                                                                                        |
| --------------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| `gen-sdk.sh`          | T-005        | Regenerate the typed SDK from `packages/openapi/openapi.yaml`.                                 |
| `check-sdk-fresh.sh`  | T-005        | CI guard: fail if the committed SDK differs from `gen-sdk.sh`'s output.                        |
| `husky-install.mjs`   | T-004        | Idempotent Husky bootstrap (no-op in CI).                                                      |
| `postgres-smoke.sh`   | T-010        | Verify the Postgres core container's extensions, RLS helper, and app-role contract.            |
| `db-migrate-smoke.sh` | T-011        | Apply Drizzle migrations twice (idempotency), then verify RLS gates the `app` role end-to-end. |

`T-002` will wire most of these into a top-level `Makefile`'s `make smoke`
target. Until then, run them directly.
