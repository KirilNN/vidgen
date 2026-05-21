import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const configEntry = resolve(here, "../config.ts");

/**
 * Acceptance criterion for T-004: "Booting any service with a missing required
 * env var prints a useful error and exits non-zero." We import the service's
 * config module in a child process with the env intentionally broken and
 * assert on stderr + exit code.
 */
describe("services/api boot", () => {
  it("exits non-zero with a useful message when required env is missing", () => {
    const result = spawnSync(process.execPath, ["--import", "tsx", configEntry], {
      env: {
        PATH: process.env["PATH"] ?? "",
        NODE_ENV: "test",
        CONFIG_SKIP_DOTENV: "1",
      },
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Invalid environment");
    expect(result.stderr).toContain("APP_SECRET");
    expect(result.stderr).toContain("POSTGRES_HOST");
  });

  it("loads successfully with all required env present", () => {
    const result = spawnSync(process.execPath, ["--import", "tsx", configEntry], {
      env: {
        PATH: process.env["PATH"] ?? "",
        NODE_ENV: "test",
        CONFIG_SKIP_DOTENV: "1",
        APP_SECRET: "x".repeat(32),
        POSTGRES_HOST: "localhost",
        POSTGRES_PORT: "5432",
        POSTGRES_USER: "app",
        POSTGRES_PASSWORD: "dev-only",
        POSTGRES_DB: "vidgen",
      },
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });
});
