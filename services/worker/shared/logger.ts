/**
 * services/worker/shared — pino logger (T-021).
 *
 * Mirrors the services/api logger conventions:
 *   - JSON in production, pretty-printed in development
 *   - LOG_LEVEL env-driven, defaults to info
 *   - Shared across all pools so a `docker logs` pipeline (Loki, etc.)
 *     sees a single shape per replica.
 */
import pino, { type Logger, type LoggerOptions } from "pino";

export function buildLogger(taskQueue: string): Logger {
  const level = process.env["LOG_LEVEL"] ?? "info";
  const isProduction = process.env["NODE_ENV"] === "production";

  const options: LoggerOptions = {
    level,
    base: { service: "@vidgen/worker", taskQueue },
    // Production: structured JSON for log aggregators.
    // Dev: human-readable single line via pino-pretty (lazy import — it
    // isn't a runtime dep, only loaded when explicitly enabled below).
    ...(isProduction
      ? {}
      : {
          transport: {
            target: "pino/file",
            options: { destination: 1 }, // stdout, line-delimited JSON
          },
        }),
  };

  return pino(options);
}
