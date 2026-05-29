/**
 * @vidgen/events — JetStream roundtrip (T-022).
 *
 * Skipped unless `NATS_URL` points at a running NATS server with
 * JetStream enabled. The compose `realtime` profile exposes
 * `nats://localhost:4222` for this purpose; the smoke script
 * `scripts/events-smoke.sh` runs `pnpm --filter @vidgen/events test`
 * with that env set.
 *
 *   NATS_URL=nats://localhost:4222 pnpm --filter @vidgen/events test
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  EventType,
  STREAM_NAME,
  STREAM_SUBJECTS,
  createJetStreamBus,
  eventSubjectsCoveredByStream,
  type EventBus,
  type EventPayload,
} from "../index.js";

const URL = process.env["NATS_URL"];

// Vitest API: `describe.skipIf` is the idiomatic way to gate a suite
// behind a runtime condition without polluting the report with empty
// `it.skip` entries.
describe.skipIf(!URL)("JetStream adapter (against $NATS_URL)", () => {
  let bus: EventBus;
  // Unique workspace id per run so reruns don't see each other.
  const ws = `ws_test_${Math.random().toString(36).slice(2, 10)}`;

  beforeAll(async () => {
    bus = await createJetStreamBus({ url: URL as string, name: `vidgen-events-test-${ws}` });
  });

  afterAll(async () => {
    await bus?.close();
  });

  it("verifies STREAM_SUBJECTS covers every catalogued EventType", () => {
    expect(eventSubjectsCoveredByStream()).toBe(true);
    expect(STREAM_SUBJECTS.length).toBeGreaterThan(0);
    expect(STREAM_NAME).toBe("VIDGEN_EVENTS");
  });

  it("roundtrips an asset.ingested event", async () => {
    const payload: EventPayload<typeof EventType.AssetIngested> = {
      workspace_id: ws,
      emitted_at: new Date().toISOString(),
      asset_id: "asset_jet_1",
      source_uri: `s3://media-raw/${ws}/asset_jet_1/source.mp4`,
      sha256: "b".repeat(64),
      duration_ms: 12345,
    };

    const received: (typeof payload)[] = [];
    const done = new Promise<void>((resolve) => {
      void bus
        .subscribe(EventType.AssetIngested, async (event) => {
          if (event.workspace_id === ws) {
            received.push(event);
            resolve();
          }
        })
        .then(() => {
          // Once the subscription is live, publish.
          void bus.publish(EventType.AssetIngested, payload);
        });
    });

    await Promise.race([
      done,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout waiting for event")), 8000),
      ),
    ]);

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject(payload);
  }, 12_000);
});
