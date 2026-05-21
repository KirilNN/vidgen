import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ConfigError, formatConfigErrorMessage } from "../format.js";
import { refuseDevSentinelsInProduction, commonEnvSchema } from "../common.js";

describe("ConfigError", () => {
  it("includes the service name and per-issue path", () => {
    const err = new ConfigError("api", [{ path: "POSTGRES_HOST", message: "Required" }]);
    expect(err.message).toContain('"api"');
    expect(err.message).toContain("POSTGRES_HOST");
    expect(err.message).toContain("Required");
  });
});

describe("formatConfigErrorMessage", () => {
  it("formats multiple issues clearly", () => {
    const msg = formatConfigErrorMessage("worker", [
      { path: "FOO", message: "Required" },
      { path: "BAR", message: "Invalid url" },
    ]);
    expect(msg).toMatch(/FOO: Required/);
    expect(msg).toMatch(/BAR: Invalid url/);
    expect(msg).toContain("packages/config/README.md");
  });
});

describe("refuseDevSentinelsInProduction", () => {
  const schema = refuseDevSentinelsInProduction(
    commonEnvSchema.extend({
      X_SECRET: z.string(),
    }),
  );

  it("permits change-me in development", () => {
    const result = schema.safeParse({
      NODE_ENV: "development",
      X_SECRET: "change-me",
    });
    expect(result.success).toBe(true);
  });

  it("rejects change-me in production", () => {
    const result = schema.safeParse({
      NODE_ENV: "production",
      X_SECRET: "change-me",
    });
    expect(result.success).toBe(false);
  });
});
