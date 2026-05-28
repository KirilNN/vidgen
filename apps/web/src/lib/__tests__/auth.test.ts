import { describe, expect, it } from "vitest";
import { codeChallengeFor, generatePkce, __resetAuthForTests } from "../auth";

describe("PKCE helpers", () => {
  it("generates a code verifier and state of expected entropy", () => {
    const a = generatePkce();
    const b = generatePkce();
    expect(a.state).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
    // RFC 7636: code_verifier 43–128 chars
    expect(a.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(a.codeVerifier.length).toBeLessThanOrEqual(128);
    expect(a.state).not.toEqual(b.state);
    expect(a.codeVerifier).not.toEqual(b.codeVerifier);
  });

  it("computes a stable S256 code challenge for a given verifier", async () => {
    const verifier = "x".repeat(64);
    const c1 = await codeChallengeFor(verifier);
    const c2 = await codeChallengeFor(verifier);
    expect(c1).toEqual(c2);
    // base64url SHA-256 = 43 chars (no padding)
    expect(c1).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("produces a different challenge for a different verifier", async () => {
    const c1 = await codeChallengeFor("a".repeat(64));
    const c2 = await codeChallengeFor("b".repeat(64));
    expect(c1).not.toEqual(c2);
  });
});

describe("auth test helper", () => {
  it("__resetAuthForTests is callable", () => {
    expect(() => __resetAuthForTests()).not.toThrow();
  });
});
