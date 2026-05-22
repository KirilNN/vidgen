# `@vidgen/sdk-ts`

Typed TypeScript client for the Vidgen REST API. Implements ticket **T-005**.

Types are **generated** from `packages/openapi/openapi.yaml` — never edit
`src/types.gen.ts` by hand. The runtime client uses
[`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/) for tree-shakeable,
strongly-typed calls.

## Usage

```ts
import { createClient } from "@vidgen/sdk-ts";

const client = createClient({ baseUrl: "http://localhost:3001" });

const { data, error, response } = await client.GET("/health");
if (error) throw error;
console.log(data.status); // "ok"
```

`createClient` accepts every option that `openapi-fetch` does (custom
`fetch`, default `headers`, `querySerializer`, etc.), plus a convenience
`baseUrl` that defaults to `http://localhost:3001` (matches the API service's
default `API_PUBLIC_URL` from `@vidgen/config`).

## Regenerating types

The spec is the source of truth. From the repo root:

```sh
pnpm sdk:gen      # rewrite src/types.gen.ts from packages/openapi/openapi.yaml
pnpm sdk:check    # CI: fail if the committed types.gen.ts is out of date
```

Codegen is idempotent — re-running with no spec change produces a byte-for-byte
identical file. `pnpm sdk:check` runs the generator and then `git diff`s the
result; commit any change it produces.

## Run

```sh
pnpm --filter @vidgen/sdk-ts test
pnpm --filter @vidgen/sdk-ts type-check
pnpm --filter @vidgen/sdk-ts build
```

## Architecture references

- arch §3.10 — OpenAPI is the contract; SDK is generated.
- arch §8 (`/packages/sdk-ts`) — generated from OpenAPI.
