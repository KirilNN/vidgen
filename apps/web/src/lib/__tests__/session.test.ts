import { describe, expect, it } from "vitest";
import { isSessionValid } from "../session";

describe("isSessionValid", () => {
  it("rejects empty / missing fields", () => {
    expect(isSessionValid(null)).toBe(false);
    expect(isSessionValid(undefined)).toBe(false);
    expect(isSessionValid({})).toBe(false);
    expect(isSessionValid({ accessToken: "" })).toBe(false);
    expect(isSessionValid({ accessToken: "abc" })).toBe(false);
    expect(isSessionValid({ accessToken: "abc", expiresAtSec: 0 })).toBe(false);
  });

  it("rejects an expired session", () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    expect(isSessionValid({ accessToken: "abc", expiresAtSec: past })).toBe(false);
  });

  it("accepts a session with a future expiry + non-empty token", () => {
    const future = Math.floor(Date.now() / 1000) + 600;
    expect(isSessionValid({ accessToken: "abc", expiresAtSec: future })).toBe(true);
  });
});
