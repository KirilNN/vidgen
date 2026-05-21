/**
 * `@vidgen/config` — single source of truth for env validation across services.
 *
 * This barrel exposes ONLY pure functions, schemas, and types. It performs no
 * side effects at import time so that:
 *  - one service does not crash when another's env vars are missing
 *  - tests can import schemas without loading `.env*`
 *
 * Each service should create its own top-level validated config in
 * `services/<name>/src/config.ts`, e.g.:
 *
 * ```ts
 * import { loadApiConfig, ConfigError } from "@vidgen/config";
 *
 * let config;
 * try {
 *   config = loadApiConfig();
 * } catch (err) {
 *   console.error(err instanceof ConfigError ? err.message : err);
 *   process.exit(1);
 * }
 * export const apiConfig = config;
 * ```
 *
 * See `packages/config/README.md` for the full convention.
 */

export * from "./common.js";
export * from "./format.js";
export { loadEnvOnce } from "./loader.js";

export { apiEnvSchema, parseApiEnv, loadApiConfig, type ApiConfig } from "./services/api.js";

export {
  workerEnvSchema,
  parseWorkerEnv,
  loadWorkerConfig,
  type WorkerConfig,
} from "./services/worker.js";

export { mcpEnvSchema, parseMcpEnv, loadMcpConfig, type McpConfig } from "./services/mcp.js";
