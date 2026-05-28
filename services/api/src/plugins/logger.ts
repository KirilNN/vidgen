/**
 * services/api — Pino logger configuration (T-015).
 *
 * Fastify ships with Pino out of the box. We expose the logger options
 * as a value so `buildServer()` can hand them to the Fastify constructor
 * (it must — Fastify's logger is locked at constructor time and a
 * later `register()` cannot replace it).
 *
 * Architecture references:
 *   - arch §13 — Structured logs in JSON; redaction for secrets.
 *
 * Design notes:
 *   - `level` honours `LOG_LEVEL` from env, default `info`.
 *   - In dev (NODE_ENV=development) you can opt into `pino-pretty` by
 *     setting `LOG_PRETTY=1`. We do NOT do this automatically because
 *     `pino-pretty` is not a default dependency and the Pino worker
 *     would fail at boot if it's missing.
 *   - Standard redactions for auth headers + secrets. The redaction list
 *     is conservative — adding fields here is cheap; missing one isn't.
 */
import type { FastifyServerOptions } from "fastify";

const REDACT_PATHS = [
  // Inbound auth / cookie headers.
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["x-api-key"]',
  // Outbound auth on proxied requests.
  'res.headers["set-cookie"]',
  // Anything the app marks as secret.
  "*.password",
  "*.secret",
  "*.token",
];

export function buildLoggerOptions(
  env: NodeJS.ProcessEnv = process.env,
): FastifyServerOptions["logger"] {
  const level = env["LOG_LEVEL"] ?? "info";
  const pretty = env["LOG_PRETTY"] === "1";

  const base: NonNullable<FastifyServerOptions["logger"]> = {
    level,
    redact: { paths: REDACT_PATHS, censor: "[redacted]" },
  };

  if (pretty) {
    base.transport = {
      target: "pino-pretty",
      options: { colorize: true, singleLine: false },
    };
  }

  return base;
}
