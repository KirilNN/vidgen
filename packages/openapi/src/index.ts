/**
 * `@vidgen/openapi` — single source of truth for the HTTP contract.
 *
 * The spec itself lives in `openapi.yaml` next to this file. Consumers should
 * prefer the helpers exported here over re-implementing file paths, so we can
 * move or bundle the spec without touching call sites.
 *
 * - `openapiSpecPath` — absolute filesystem path to the YAML file. Used by
 *   `scripts/gen-sdk.sh` and by Fastify (`services/api/src/openapi.ts`).
 * - `loadOpenApiDocument()` — read + parse the YAML into a plain JS object.
 *   Cached after the first call.
 *
 * Architecture refs:
 * - arch §3.10 — OpenAPI is the contract; Fastify serves it; SDK is generated.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const here = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the committed `openapi.yaml` spec. */
export const openapiSpecPath: string = resolve(here, "..", "openapi.yaml");

export interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string; [k: string]: unknown };
  paths: Record<string, unknown>;
  components?: Record<string, unknown>;
  [k: string]: unknown;
}

let cached: OpenApiDocument | undefined;

/**
 * Read the YAML spec from disk and parse it. Cached for the lifetime of the
 * process; pass `{ fresh: true }` to bypass the cache (used in tests).
 */
export function loadOpenApiDocument(options: { fresh?: boolean } = {}): OpenApiDocument {
  if (!options.fresh && cached) return cached;
  const raw = readFileSync(openapiSpecPath, "utf8");
  const doc = parseYaml(raw) as OpenApiDocument;
  if (!doc || typeof doc !== "object" || typeof doc.openapi !== "string") {
    throw new Error(`@vidgen/openapi: invalid spec at ${openapiSpecPath}`);
  }
  cached = doc;
  return doc;
}
