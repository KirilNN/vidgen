# `@vidgen/openapi`

Single source of truth for the Vidgen HTTP contract. Implements ticket
**T-005**.

The spec is `openapi.yaml` (OpenAPI 3.1). Everything that talks HTTP — the
Fastify API server, the generated TypeScript SDK, the ChatGPT plugin
manifest, future Postman / Scalar docs — derives from this one file.

## Files

- `openapi.yaml` — the spec. Hand-edited.
- `src/index.ts` — small helper that exposes the spec's file path and a
  cached `loadOpenApiDocument()` parser.

## How the pieces fit

```
packages/openapi/openapi.yaml
        │
        │ ───► scripts/gen-sdk.sh   (openapi-typescript)
        │        └─► packages/sdk-ts/src/types.gen.ts   (committed)
        │              └─► packages/sdk-ts/src/client.ts  (openapi-fetch)
        │
        └─► services/api/src/openapi.ts   (Fastify serves /openapi.json + Scalar UI in T-015)
```

## Workflow

1. Edit `openapi.yaml`. Use `operationId`, `summary`, JSON-Schema components.
2. Run `pnpm sdk:gen` from the repo root. It regenerates
   `packages/sdk-ts/src/types.gen.ts`.
3. Commit both the spec change and the regenerated SDK in the **same PR**.
4. CI runs `pnpm sdk:check` and fails the build if the committed SDK does
   not match what the spec would produce — i.e. if you forgot step 2.

## Run

```sh
pnpm --filter @vidgen/openapi test
pnpm --filter @vidgen/openapi type-check
```

## Architecture references

- arch §3.10 — OpenAPI is the contract; Fastify serves it; SDK is generated.
- arch §8 (`/packages/sdk-ts`) — generated from OpenAPI.
