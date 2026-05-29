/**
 * services/api — notifier unit tests (T-023).
 *
 * Covers:
 *   - AES-256-GCM secret encryption roundtrip (crypto.ts).
 *   - HMAC signature header format (hmac-webhook.ts).
 *   - The HMAC adapter's delivery contract: success, HTTP error,
 *     timeout, and per-subscriber settled results.
 *   - canonicalJson key ordering.
 */
import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  canonicalJson,
  computeSignatureHeader,
  createHmacWebhookNotifier,
  decryptSecret,
  encryptSecret,
  generateWebhookSecret,
  resolveEncryptionKey,
} from "../notifier/index.js";

describe("notifier/crypto", () => {
  const appSecret = "x".repeat(32);

  it("derives a 32-byte key from APP_SECRET when no explicit key is set", () => {
    const key = resolveEncryptionKey(undefined, appSecret);
    expect(key.length).toBe(32);
    const same = resolveEncryptionKey("", appSecret);
    expect(same.equals(key)).toBe(true);
  });

  it("accepts a 64-hex explicit key", () => {
    const hex = "a".repeat(64);
    const key = resolveEncryptionKey(hex, appSecret);
    expect(key.length).toBe(32);
    expect(key.equals(Buffer.from(hex, "hex"))).toBe(true);
  });

  it("rejects an explicit key of the wrong length", () => {
    expect(() => resolveEncryptionKey("abcd", appSecret)).toThrow(/64 hex chars/);
  });

  it("encrypt → decrypt roundtrip recovers the original secret", () => {
    const key = resolveEncryptionKey(undefined, appSecret);
    const plaintext = generateWebhookSecret();
    const envelope = encryptSecret(plaintext, key);
    expect(envelope.split(".")).toHaveLength(3);
    expect(decryptSecret(envelope, key)).toBe(plaintext);
  });

  it("decryption fails for a tampered envelope", () => {
    const key = resolveEncryptionKey(undefined, appSecret);
    const envelope = encryptSecret("secret-payload", key);
    const [iv, tag, ct] = envelope.split(".");
    // Flip the last char of the ciphertext segment.
    const broken = `${iv}.${tag}.${ct!.slice(0, -1)}${ct!.endsWith("A") ? "B" : "A"}`;
    expect(() => decryptSecret(broken, key)).toThrow();
  });

  it("encryption is non-deterministic (random IV)", () => {
    const key = resolveEncryptionKey(undefined, appSecret);
    const a = encryptSecret("same", key);
    const b = encryptSecret("same", key);
    expect(a).not.toBe(b);
    expect(decryptSecret(a, key)).toBe("same");
    expect(decryptSecret(b, key)).toBe("same");
  });
});

describe("notifier/hmac-webhook — signature & canonical body", () => {
  it("canonicalJson sorts object keys recursively", () => {
    const a = canonicalJson({ b: 1, a: { y: 2, x: 1 } });
    const b = canonicalJson({ a: { x: 1, y: 2 }, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":{"x":1,"y":2},"b":1}');
  });

  it("computeSignatureHeader produces a parseable Stripe-style header", () => {
    const ts = 1700000000;
    const body = '{"hello":"world"}';
    const secret = "shhh";
    const header = computeSignatureHeader(secret, ts, body);
    expect(header.startsWith(`t=${ts},v1=`)).toBe(true);
    const expected = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
    expect(header).toBe(`t=${ts},v1=${expected}`);
  });
});

describe("notifier/hmac-webhook — delivery", () => {
  it("POSTs canonical JSON + a valid signature to every subscriber", async () => {
    const captured: Array<{
      url: string;
      headers: Record<string, string>;
      body: string;
    }> = [];
    const fakeFetch: typeof fetch = async (url, init) => {
      const headers: Record<string, string> = {};
      const h = new Headers(init?.headers);
      h.forEach((v, k) => (headers[k] = v));
      captured.push({
        url: String(url),
        headers,
        body: String(init?.body ?? ""),
      });
      return new Response("", { status: 200 });
    };
    const n = createHmacWebhookNotifier({ fetchImpl: fakeFetch });
    const subs = [
      { id: "w1", workspaceId: "ws-1", url: "https://example.com/a", secret: "s1" },
      { id: "w2", workspaceId: "ws-1", url: "https://example.com/b", secret: "s2" },
    ];
    const payload = {
      workspace_id: "ws-1",
      emitted_at: "2025-05-28T10:46:08.102Z",
      asset_id: "a1",
      source_uri: "s3://x",
      sha256: "0".repeat(64),
      duration_ms: 1234,
    };
    const results = await n.notify({
      subject: "asset.ingested",
      payload,
      subscribers: subs,
    });
    expect(results).toHaveLength(2);
    for (const r of results) expect(r.status).toBe("delivered");
    expect(captured).toHaveLength(2);

    for (const cap of captured) {
      expect(cap.headers["content-type"]).toBe("application/json");
      expect(cap.headers["x-vidgen-event"]).toBe("asset.ingested");
      expect(cap.headers["x-vidgen-delivery"]).toMatch(/^[0-9a-f-]+$/);
      const ts = cap.headers["x-vidgen-timestamp"]!;
      const sig = cap.headers["x-vidgen-signature"]!;
      const sub = subs.find((s) => s.url === cap.url)!;
      const expected = computeSignatureHeader(sub.secret, Number(ts), cap.body);
      expect(sig).toBe(expected);
      // The body is canonical JSON of the payload.
      expect(cap.body).toBe(canonicalJson(payload));
    }
  });

  it("returns status=failed for non-2xx responses", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response("nope", { status: 503, statusText: "Service Unavailable" });
    const n = createHmacWebhookNotifier({ fetchImpl: fakeFetch });
    const results = await n.notify({
      subject: "asset.ingested",
      payload: {
        workspace_id: "ws-1",
        emitted_at: "2025-05-28T10:46:08.102Z",
        asset_id: "a1",
        source_uri: "s3://x",
        sha256: "0".repeat(64),
        duration_ms: 1,
      },
      subscribers: [{ id: "w1", workspaceId: "ws-1", url: "https://x", secret: "s" }],
    });
    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.httpStatus).toBe(503);
  });

  it("returns status=failed when fetch rejects (transport error)", async () => {
    const fakeFetch: typeof fetch = async () => {
      throw new Error("ECONNREFUSED");
    };
    const n = createHmacWebhookNotifier({ fetchImpl: fakeFetch });
    const results = await n.notify({
      subject: "asset.ingested",
      payload: {
        workspace_id: "ws-1",
        emitted_at: "2025-05-28T10:46:08.102Z",
        asset_id: "a1",
        source_uri: "s3://x",
        sha256: "0".repeat(64),
        duration_ms: 1,
      },
      subscribers: [{ id: "w1", workspaceId: "ws-1", url: "https://x", secret: "s" }],
    });
    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.error).toMatch(/ECONNREFUSED/);
  });
});
