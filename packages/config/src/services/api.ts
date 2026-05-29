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

    // ---- T-023 Notifier (Novu + webhook fan-out) ---------------------------
    //
    // The API's outbound-webhook fan-out has two backends, both opt-in
    // via env vars:
    //   - Default ($0): in-process HMAC POST sender. No extra config
    //     needed beyond `APP_SECRET` (used to derive the per-workspace
    //     secret encryption key when WEBHOOK_SECRET_ENCRYPTION_KEY is
    //     blank).
    //   - Novu: set NOVU_API_URL + NOVU_API_KEY to delegate delivery.
    //
    // WEBHOOK_DELIVERY_TIMEOUT_MS bounds how long a single outbound POST
    // can hang; defaults match Cloudflare Workers' subrequest cap.
    NOVU_API_URL: z.string().url().optional(),
    NOVU_API_KEY: z.string().min(1).optional(),
    WEBHOOK_DELIVERY_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(10_000),
    // 32 bytes encoded as 64 lowercase hex chars; blank means "derive
    // from APP_SECRET via SHA-256".
    WEBHOOK_SECRET_ENCRYPTION_KEY: z
      .string()
      .regex(
        /^([0-9a-fA-F]{64})?$/,
        "WEBHOOK_SECRET_ENCRYPTION_KEY must be 64 hex chars (32 bytes) or empty",
      )
      .default(""),
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
