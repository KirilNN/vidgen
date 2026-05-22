import { describe, expect, it } from "vitest";
import { ConfigError, parseApiEnv, parseMcpEnv, parseWorkerEnv } from "../index.js";

const baseValidApi = {
  NODE_ENV: "test",
  ENV: "dev",
  LOG_LEVEL: "info",
  API_PORT: "3001",
  API_PUBLIC_URL: "http://localhost:3001",
  APP_SECRET: "x".repeat(32),
  POSTGRES_HOST: "postgres",
  POSTGRES_PORT: "5432",
  POSTGRES_USER: "app",
  POSTGRES_PASSWORD: "dev-only-pw",
  POSTGRES_DB: "vidgen",
} satisfies NodeJS.ProcessEnv;

describe("api config", () => {
  it("parses a valid env", () => {
    const cfg = parseApiEnv(baseValidApi);
    expect(cfg.API_PORT).toBe(3001);
    expect(cfg.APP_SECRET).toHaveLength(32);
    expect(cfg.TEMPORAL_NAMESPACE).toBe("default");
  });

  it("freezes the result to prevent accidental mutation", () => {
    const cfg = parseApiEnv(baseValidApi);
    expect(Object.isFrozen(cfg)).toBe(true);
  });

  it("rejects a missing required var with a useful message", () => {
    const env = { ...baseValidApi };
    delete (env as Record<string, unknown>)["POSTGRES_HOST"];
    try {
      parseApiEnv(env);
      throw new Error("expected parseApiEnv to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      const message = (err as ConfigError).message;
      expect(message).toContain('Invalid environment for service "api"');
      expect(message).toContain("POSTGRES_HOST");
    }
  });

  it("rejects an APP_SECRET shorter than 32 chars", () => {
    expect(() => parseApiEnv({ ...baseValidApi, APP_SECRET: "short" })).toThrowError(/APP_SECRET/);
  });

  it("rejects an out-of-range port", () => {
    expect(() => parseApiEnv({ ...baseValidApi, API_PORT: "70000" })).toThrowError(/API_PORT/);
  });

  it("rejects dev sentinel passwords in production", () => {
    expect(() =>
      parseApiEnv({
        ...baseValidApi,
        NODE_ENV: "production",
        APP_SECRET: "x".repeat(32),
        POSTGRES_PASSWORD: "change-me",
      }),
    ).toThrowError(/POSTGRES_PASSWORD/);
  });

  it("rejects dev sentinel APP_SECRET in production", () => {
    expect(() =>
      parseApiEnv({
        ...baseValidApi,
        NODE_ENV: "production",
        APP_SECRET: "change-me-change-me-change-me-change-me",
      }),
    ).toThrowError(/APP_SECRET/);
  });

  it("allows dev sentinels when NODE_ENV != production", () => {
    expect(() =>
      parseApiEnv({
        ...baseValidApi,
        NODE_ENV: "development",
        POSTGRES_PASSWORD: "change-me",
      }),
    ).not.toThrow();
  });
});

describe("worker config", () => {
  it("parses with sane defaults", () => {
    const cfg = parseWorkerEnv({ NODE_ENV: "test", ENV: "dev" });
    expect(cfg.TEMPORAL_ADDRESS).toBe("temporal:7233");
    expect(cfg.TEMPORAL_NAMESPACE).toBe("default");
  });
});

describe("mcp config", () => {
  it("parses with sane defaults", () => {
    const cfg = parseMcpEnv({ NODE_ENV: "test", ENV: "dev" });
    expect(cfg.MCP_PORT).toBe(3100);
  });
});
