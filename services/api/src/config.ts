/**
 * services/api — boot-time configuration.
 *
 * Imports the validated `ApiConfig` from `@vidgen/config`. On any validation
 * failure the process exits non-zero with a useful message; no part of the
 * service ever observes an invalid config.
 *
 * See packages/config/README.md for conventions.
 */
import { ConfigError, loadApiConfig, type ApiConfig } from "@vidgen/config";

function bootApiConfig(): ApiConfig {
  try {
    return loadApiConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
    } else {
      console.error(`[services/api] failed to load configuration: ${(err as Error).message}`);
    }
    process.exit(1);
  }
}

export const apiConfig: ApiConfig = bootApiConfig();
export type { ApiConfig } from "@vidgen/config";
