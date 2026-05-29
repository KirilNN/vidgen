/**
 * services/api — fan-out integration test (T-023 acceptance criterion).
 *
 * Wires `createMemoryBus()` to the HMAC notifier through `startFanout`,
 * registers a synthetic subscriber row, publishes `asset.ingested`, and
 * asserts the receiver gets a POST whose `X-Vidgen-Signature` validates
 * against the secret encrypted into the row.
 *
 * No NATS, no Postgres — proves the wiring is correct end-to-end
 * without infra. The smoke script (scripts/webhooks-smoke.sh) runs the
 * equivalent against the live stack.
 */
import { describe, expect, it } from "vitest";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { createHmac } from "node:crypto";
import { createMemoryBus, EventType } from "@vidgen/events";
import {
  computeSignatureHeader,
  createHmacWebhookNotifier,
  encryptSecret,
  generateWebhookSecret,
  resolveEncryptionKey,
  startFanout,
} from "../notifier/index.js";
import type { WebhookRow } from "../db/webhooks-repo.js";

interface Captured {
  body: string;
  headers: Record<string, string>;
}

function startEphemeralServer(): Promise<{ url: string; server: Server; received: Captured[] }> {
  const received: Captured[] = [];
  const server = createServer((req: IncomingMessage, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === "string") headers[k] = v;
      }
      received.push({ body: Buffer.concat(chunks).toString("utf8"), headers });
      res.statusCode = 200;
      res.end("ok");
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") throw new Error("no address");
      resolve({ url: `http://127.0.0.1:${addr.port}`, server, received });
    });
  });
}

describe("fanout — asset.ingested → signed POST (T-023 acceptance)", () => {
  it("delivers a valid HMAC-signed POST to a registered subscriber", async () => {
    const { url, server, received } = await startEphemeralServer();
    try {
      const appSecret = "x".repeat(32);
      const key = resolveEncryptionKey(undefined, appSecret);
      const plaintextSecret = generateWebhookSecret();
      const row: WebhookRow = {
        id: "00000000-0000-4000-8000-000000000001",
        workspaceId: "ws-acceptance",
        url,
        events: [EventType.AssetIngested],
        secretEnc: encryptSecret(plaintextSecret, key),
        createdAt: new Date(),
      };
      const bus = createMemoryBus();
      const notifier = createHmacWebhookNotifier({ deliveryTimeoutMs: 2_000 });
      const fanout = await startFanout({
        bus,
        notifier,
        encryptionKey: key,
        findSubscribers: async (workspaceId, subject) =>
          workspaceId === row.workspaceId && row.events.includes(subject) ? [row] : [],
      });

      await bus.publish(EventType.AssetIngested, {
        workspace_id: "ws-acceptance",
        emitted_at: new Date().toISOString(),
        asset_id: "asset-1",
        source_uri: "s3://media-raw/ws-acceptance/asset-1",
        sha256: "0".repeat(64),
        duration_ms: 1500,
      });

      // Wait briefly for async dispatch to land.
      for (let i = 0; i < 20 && received.length === 0; i++) {
        await new Promise((r) => setTimeout(r, 25));
      }
      await fanout.close();

      expect(received).toHaveLength(1);
      const cap = received[0]!;
      expect(cap.headers["x-vidgen-event"]).toBe("asset.ingested");
      expect(cap.headers["content-type"]).toBe("application/json");
      const ts = Number(cap.headers["x-vidgen-timestamp"]);
      expect(Number.isFinite(ts)).toBe(true);

      // Re-derive the signature and compare.
      const expected = computeSignatureHeader(plaintextSecret, ts, cap.body);
      expect(cap.headers["x-vidgen-signature"]).toBe(expected);

      // Sanity: the v1=... hex actually matches an HMAC-SHA256 over the
      // canonical signed string.
      const sigHex = cap.headers["x-vidgen-signature"]!.split("v1=")[1]!;
      const recomputed = createHmac("sha256", plaintextSecret)
        .update(`${ts}.${cap.body}`)
        .digest("hex");
      expect(sigHex).toBe(recomputed);

      // The body carries the workspace_id intact (multi-tenant rule).
      const parsed = JSON.parse(cap.body);
      expect(parsed.workspace_id).toBe("ws-acceptance");
      expect(parsed.asset_id).toBe("asset-1");
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  }, 10_000);

  it("does not deliver to subscribers in a different workspace", async () => {
    const { url, server, received } = await startEphemeralServer();
    try {
      const key = resolveEncryptionKey(undefined, "x".repeat(32));
      const row: WebhookRow = {
        id: "00000000-0000-4000-8000-000000000002",
        workspaceId: "ws-other",
        url,
        events: [EventType.AssetIngested],
        secretEnc: encryptSecret("s", key),
        createdAt: new Date(),
      };
      const bus = createMemoryBus();
      const fanout = await startFanout({
        bus,
        notifier: createHmacWebhookNotifier(),
        encryptionKey: key,
        findSubscribers: async (workspaceId, subject) =>
          workspaceId === row.workspaceId && row.events.includes(subject) ? [row] : [],
      });

      await bus.publish(EventType.AssetIngested, {
        workspace_id: "ws-acceptance", // different workspace
        emitted_at: new Date().toISOString(),
        asset_id: "asset-x",
        source_uri: "s3://x",
        sha256: "0".repeat(64),
        duration_ms: 1,
      });

      // Give the bus a tick.
      await new Promise((r) => setTimeout(r, 100));
      await fanout.close();
      expect(received).toHaveLength(0);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  }, 5_000);
});
