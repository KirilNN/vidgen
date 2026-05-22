/**
 * `@vidgen/sdk-ts` — typed TypeScript client for the Vidgen REST API.
 *
 * - Types are generated from `packages/openapi/openapi.yaml` into
 *   `types.gen.ts` by `pnpm sdk:gen`. Never edit `types.gen.ts` by hand.
 * - The runtime client uses `openapi-fetch` for tree-shakeable, typed
 *   `client.GET("/path")` calls.
 *
 * Usage:
 *
 *   import { createClient } from "@vidgen/sdk-ts";
 *   const client = createClient({ baseUrl: "http://localhost:3001" });
 *   const { data, error } = await client.GET("/health");
 *
 * Architecture refs: arch §3.10 (OpenAPI as the contract), arch §8
 * (`packages/sdk-ts` is generated from OpenAPI).
 */
export { createClient, type VidgenClient, type CreateClientOptions } from "./client.js";
export type { paths, components, operations, webhooks } from "./types.gen.js";
