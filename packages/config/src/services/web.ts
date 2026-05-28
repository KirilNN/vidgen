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
 * Environment schema for `apps/web` (Next.js App Router shell, T-016).
 *
 * Architecture refs:
 * - arch §8.1  Next.js App Router + Tailwind + shadcn primitives
 * - arch §3.10 Calls the API exclusively via @vidgen/sdk-ts
 * - arch §11   Auth is Keycloak OIDC PKCE; cookie sealed with APP_SECRET
 *
 * Splitting **public** vs **internal** OIDC URL:
 *  - `KEYCLOAK_PUBLIC_ISSUER_URL` is what the BROWSER navigates to during
 *    the PKCE flow AND what the API container validates the `iss` claim
 *    against. Both must agree.
 *  - We deliberately do not expose a separate `_INTERNAL_` variant: the
 *    web container trusts Caddy's local CA (NODE_EXTRA_CA_CERTS pointed at
 *    /caddy-pki/caddy/pki/authorities/local/root.crt) so its server-side
 *    token-exchange POST also goes to https://auth.localhost, keeping the
 *    iss claim consistent. See `infra/compose/docker-compose.yml` → web.
 *
 * Required vs optional matches what the Next.js server genuinely cannot
 * boot without: API_INTERNAL_URL + the four KEYCLOAK_* values + APP_SECRET.
 * NEXT_PUBLIC_API_PUBLIC_URL is optional because it's only used for
 * cosmetic links in the UI.
 */
export const webEnvSchema = refuseDevSentinelsInProduction(
  commonEnvSchema.extend({
    WEB_PORT: portSchema.default(3000),
    WEB_PUBLIC_URL: z.string().url().default("http://localhost:3000"),
    /**
     * Sealing key for the iron-session cookie. Same `APP_SECRET` the API
     * uses to sign internal JWTs — there is exactly one app-wide secret in
     * Mode A. Must be ≥ 32 chars; production rejects `change-me`.
     */
    APP_SECRET: appSecretSchema,

    KEYCLOAK_PUBLIC_ISSUER_URL: z.string().url().default("https://auth.localhost/realms/app"),
    KEYCLOAK_CLIENT_ID_WEB: z.string().min(1).default("app-web"),

    API_INTERNAL_URL: z.string().url().default("http://localhost:3001"),
    NEXT_PUBLIC_API_PUBLIC_URL: z.string().url().default("http://localhost:3001"),
  }),
);

export type WebConfig = z.infer<typeof webEnvSchema>;

export function parseWebEnv(env: NodeJS.ProcessEnv = process.env): WebConfig {
  const result = webEnvSchema.safeParse(env);
  if (!result.success) {
    throw zodErrorToConfigError("web", result.error);
  }
  return Object.freeze(result.data) as WebConfig;
}

/**
 * Lazy: callers must invoke this inside a request handler / server action,
 * NOT at module top-level — otherwise Next's build-time prerender step
 * would evaluate it without a real env, fail, and abort `next build`.
 */
export function loadWebConfig(): WebConfig {
  loadEnvOnce();
  return parseWebEnv(process.env);
}
