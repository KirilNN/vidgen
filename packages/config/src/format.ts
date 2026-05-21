import type { ZodError } from "zod";

/**
 * Error raised when a service's environment cannot be parsed.
 * Callers (typically a service's `config.ts` boot module) should catch this,
 * print `.message` to stderr, and exit with a non-zero status.
 */
export class ConfigError extends Error {
  public readonly service: string;
  public readonly issues: ReadonlyArray<{ path: string; message: string }>;

  constructor(service: string, issues: ReadonlyArray<{ path: string; message: string }>) {
    super(formatConfigErrorMessage(service, issues));
    this.name = "ConfigError";
    this.service = service;
    this.issues = issues;
  }
}

export function formatConfigErrorMessage(
  service: string,
  issues: ReadonlyArray<{ path: string; message: string }>,
): string {
  const lines = [
    `[@vidgen/config] Invalid environment for service "${service}":`,
    ...issues.map((i) => `  • ${i.path || "(root)"}: ${i.message}`),
    "",
    "Fix the env vars listed above. Copy /.env.example to /.env (or .env.local)",
    "for local dev. See packages/config/README.md for conventions.",
  ];
  return lines.join("\n");
}

export function zodErrorToConfigError(service: string, err: ZodError): ConfigError {
  const issues = err.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));
  return new ConfigError(service, issues);
}
