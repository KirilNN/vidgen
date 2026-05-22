# `@vidgen/config`

Single source of truth for environment-variable validation across every
backend service in the monorepo. Implements ticket **T-004**.

## Why

Hand-rolling `process.env.FOO ?? throw` scatters config concerns across the
codebase and lets services boot in invalid states. This package centralises:

- One Zod schema **per service** (api, worker, mcp).
- A shared set of primitives (`portSchema`, `appSecretSchema`,
  `commonEnvSchema`).
- Layered `.env*` loading via [`dotenv-flow`](https://github.com/kerimdzhanov/dotenv-flow).
- A typed `ConfigError` with a human-readable message — point operators at the
  exact missing var.
- A production-only refinement that refuses the dev sentinel `change-me` for
  any `*_PASSWORD` / `*_SECRET` / `*_TOKEN` env var.

## Conventions

1. **One schema per service.** Live under `src/services/<name>.ts`. Each
   exports `xxxEnvSchema`, `parseXxxEnv(env)`, `loadXxxConfig()`, and the
   inferred `XxxConfig` type.
2. **Side-effect-free package.** Importing `@vidgen/config` (or any subpath)
   does **not** read `.env` files and does **not** validate. Loading happens
   only inside `loadXxxConfig()`.
3. **Pure parsers vs loaders.** `parseXxxEnv(env)` is a pure function — pass
   any env object, get back a frozen config or a thrown `ConfigError`.
   `loadXxxConfig()` is the convenience wrapper that calls `loadEnvOnce()`
   then `parseXxxEnv(process.env)`.
4. **Validate on boot, fail fast.** Each service's `src/config.ts` calls
   `loadXxxConfig()` at module load time, catches `ConfigError`, prints
   `err.message` to stderr, and `process.exit(1)`s. No service module should
   ever observe an invalid config.
5. **Frozen output.** Parsed configs are `Object.freeze`d so business code
   can't mutate them at runtime.
6. **Production sentinels.** `refuseDevSentinelsInProduction` rejects any
   value of `change-me` (the convention from `infra/compose/.env.example`)
   for fields named `*_PASSWORD`, `*_SECRET`, `*_TOKEN`, or `APP_SECRET`.

## Layered `.env` loading

`loadEnvOnce()` resolves the env directory in this order:

1. The `cwd` argument, if passed.
2. `CONFIG_ENV_DIR` env var.
3. The nearest ancestor of `process.cwd()` containing `.env.example` or
   `pnpm-workspace.yaml` (the monorepo root).
4. `process.cwd()`.

Then `dotenv-flow` merges (last wins on conflict):

```
.env  →  .env.local  →  .env.{NODE_ENV}  →  .env.{NODE_ENV}.local
```

Only `.env.example` is committed. All other `.env*` files are
git-ignored (`/.gitignore`).

Set `CONFIG_SKIP_DOTENV=1` to skip file loading entirely — useful inside
containers and CI where env is injected by the orchestrator.

## Using in a service

```ts
// services/api/src/config.ts
import { loadApiConfig, ConfigError } from "@vidgen/config";

let config;
try {
  config = loadApiConfig();
} catch (err) {
  console.error(err instanceof ConfigError ? err.message : (err as Error).message);
  process.exit(1);
}
export const apiConfig = config;
```

```ts
// services/api/src/server.ts
import { apiConfig } from "./config.js";

server.listen({ port: apiConfig.API_PORT });
```

## Adding a new service schema

1. Create `src/services/<name>.ts`. Use `commonEnvSchema.extend({ ... })` so
   `NODE_ENV`, `ENV`, and `LOG_LEVEL` come for free.
2. Wrap with `refuseDevSentinelsInProduction(...)` to inherit the prod-secret
   guard.
3. Export `xxxEnvSchema`, `parseXxxEnv`, `loadXxxConfig`, `XxxConfig`.
4. Re-export from `src/index.ts`.
5. Add the new env vars to `/.env.example` and `infra/compose/.env.example`
   with safe defaults.
6. Add tests under `src/__tests__/`.

## Architecture references

- **arch §E4** Single binary in dev, scale-out in prod — same config shape both
  ways.
- **arch §E9** Feature flags + per-tenant tiering live in **config**, not code.
- **arch §11** Multi-tenant isolation — `APP_SECRET` and `*_PASSWORD` secrets
  must be non-trivial in production.
- **arch §3.10** OpenAPI is the contract; the API's port + public URL are env-driven.
- **arch §6** Async by default — workers need `TEMPORAL_*` in their schema.

## Testing

```sh
pnpm --filter @vidgen/config test
```
