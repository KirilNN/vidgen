import { afterEach, describe, expect, it } from "vitest";
import { __resetLoadedForTests, loadEnvOnce } from "../loader.js";

afterEach(() => {
  __resetLoadedForTests();
  delete process.env["CONFIG_SKIP_DOTENV"];
});

describe("loader", () => {
  it("is a no-op when CONFIG_SKIP_DOTENV=1", () => {
    process.env["CONFIG_SKIP_DOTENV"] = "1";
    const before = process.env["NODE_ENV"];
    loadEnvOnce();
    expect(process.env["NODE_ENV"]).toBe(before);
  });

  it("is idempotent (second call does not throw)", () => {
    process.env["CONFIG_SKIP_DOTENV"] = "1";
    expect(() => {
      loadEnvOnce();
      loadEnvOnce();
    }).not.toThrow();
  });
});
