import { z } from "zod";

/**
 * Common environment schemas shared by every service.
 *
 * See `packages/config/README.md` for conventions. Architecture refs:
 * - arch §E4 single-binary-in-dev / scale-out-in-prod ⇒ identical config shape
 * - arch §E9 feature flags + tiering live in config, not code
 * - arch §11 multi-tenant isolation ⇒ secrets must never be the dev sentinel
 *   `change-me` in production
 */

export const nodeEnvSchema = z.enum(["development", "test", "production"]).default("development");

export const appEnvSchema = z.enum(["dev", "staging", "production"]).default("dev");

export const logLevelSchema = z
  .enum(["trace", "debug", "info", "warn", "error", "fatal"])
  .default("info");

/**
 * Coerce a string ("3001") to a TCP port number, enforcing the legal range.
 */
export const portSchema = z.coerce.number().int().min(1).max(65535);

/**
 * Application-wide secret used to sign session cookies / internal JWTs.
 * Minimum 32 chars; production must not use the dev sentinel `change-me`.
 */
export const appSecretSchema = z
  .string()
  .min(32, "APP_SECRET must be at least 32 characters of high-entropy random data");

export const commonEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  ENV: appEnvSchema,
  LOG_LEVEL: logLevelSchema,
});

export type CommonEnv = z.infer<typeof commonEnvSchema>;

/**
 * Refinement applied per-service: any field named `*_PASSWORD`, `*_SECRET`,
 * or `*_TOKEN` is rejected if its value is the literal dev sentinel `change-me`
 * while NODE_ENV is `production`. Mirrors `infra/compose/.env.example`'s
 * "fail loudly on misconfiguration" convention.
 */
export function refuseDevSentinelsInProduction<T extends z.ZodRawShape, O extends z.ZodObject<T>>(
  schema: O,
): O {
  return schema.superRefine((env, ctx) => {
    if (env["NODE_ENV"] !== "production") return;
    for (const [key, value] of Object.entries(env)) {
      if (typeof value !== "string") continue;
      if (!/(?:_PASSWORD|_SECRET|_TOKEN|APP_SECRET)$/.test(key)) continue;
      if (value === "change-me" || value.startsWith("change-me")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must not use the dev sentinel "change-me" when NODE_ENV=production`,
        });
      }
    }
  }) as unknown as O;
}
