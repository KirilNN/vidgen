/**
 * services/api — OpenAPI document accessor.
 *
 * Returns the parsed OpenAPI 3.1 document that Fastify will serve via
 * `@fastify/swagger` once the API server is wired up (T-015). Centralising the
 * load here means future code (Scalar docs UI, ChatGPT plugin manifest,
 * runtime route validation) shares a single source of truth and a single
 * cache.
 *
 * Architecture refs:
 * - arch §3.10 — Fastify serves the OpenAPI spec; Scalar renders docs.
 */
import { loadOpenApiDocument, openapiSpecPath, type OpenApiDocument } from "@vidgen/openapi";

/** Absolute path to the YAML spec on disk. */
export { openapiSpecPath };
export type { OpenApiDocument };

/**
 * Return the parsed spec, lazily loaded and cached by `@vidgen/openapi`.
 * Throws if the spec file is missing or malformed — caller decides what to
 * do (server boot in T-015 will treat this as fatal).
 */
export function getOpenApiDocument(): OpenApiDocument {
  return loadOpenApiDocument();
}
