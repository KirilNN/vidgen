import { z } from "zod";
import {
  appSecretSchema,
  commonEnvSchema,
  portSchema,
  refuseDevSentinelsInProduction,
} from "../common.js";
import { loadEnvOnce } from "../loader.js";
import { zodErrorToConfigError } from "../format.js";

/**
 * Environment schema for `services/api` (Fastify API gateway).
 *
 * Architecture refs:
 * - arch §3.10 Fastify serves the OpenAPI contract → API_PORT / API_PUBLIC_URL
 * - arch §5.1 Postgres (metadata only) → POSTGRES_* from infra/compose/.env.example
 * - arch §11 multi-tenant isolation → APP_SECRET signs internal JWTs
 * - arch §6 async by default → TEMPORAL_ADDRESS for workflow plane
 *
 * Required vs optional reflects what the API service genuinely cannot start
 * without (database + auth issuer). Things added by later tickets stay optional
 * until the service code actually depends on them.
 */
export const apiEnvSchema = refuseDevSentinelsInProduction(
  commonEnvSchema.extend({
    API_PORT: portSchema.default(3001),
    API_PUBLIC_URL: z.string().url().default("http://localhost:3001"),
    APP_SECRET: appSecretSchema,

    POSTGRES_HOST: z.string().min(1),
    POSTGRES_PORT: portSchema.default(5432),
    POSTGRES_USER: z.string().min(1),
    POSTGRES_PASSWORD: z.string().min(1),
    POSTGRES_DB: z.string().min(1),

    KEYCLOAK_ISSUER_URL: z.string().url().optional(),
    KEYCLOAK_JWKS_URL: z.string().url().optional(),
    KEYCLOAK_CLIENT_ID_API: z.string().min(1).optional(),
    KEYCLOAK_CLIENT_SECRET_API: z.string().min(1).optional(),
    // Comma-separated list of Keycloak `azp` claim values allowed to call
    // this API. Defaults to the two client IDs the dev realm-export ships
    // (app-web for the browser SPA, app-api for service-to-service grants).
    // Kept as a string so docker-compose env injection just works; parsed
    // into a Set on first read by the auth plugin.
    KEYCLOAK_ALLOWED_AZP: z.string().min(1).default("app-web,app-api"),

    REDIS_URL: z.string().url().optional(),
    TEMPORAL_ADDRESS: z.string().min(1).optional(),
    TEMPORAL_NAMESPACE: z.string().min(1).default("default"),
    NATS_URL: z.string().url().optional(),
  }),
);

export type ApiConfig = z.infer<typeof apiEnvSchema>;

/**
 * Parse the supplied env object against the API schema without any side effects.
 * Pure: no dotenv loading, no process.exit. Throws `ConfigError` on failure.
 */
export function parseApiEnv(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const result = apiEnvSchema.safeParse(env);
  if (!result.success) {
    throw zodErrorToConfigError("api", result.error);
  }
  return Object.freeze(result.data) as ApiConfig;
}

/**
 * Load layered `.env*` files (once per process) then parse `process.env`.
 * Throws `ConfigError` on failure; callers handle the exit.
 */
export function loadApiConfig(): ApiConfig {
  loadEnvOnce();
  return parseApiEnv(process.env);
}
