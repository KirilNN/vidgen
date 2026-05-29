/**
 * @vidgen/events — schema + memory-bus tests (T-022).
 *
 * These tests cover the network-free path; the JetStream roundtrip
 * lives in `jetstream.test.ts` and is skipped unless `NATS_URL` points
 * at a running server.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALL_EVENT_TYPES,
  EventSchemas,
  EventType,
  EventValidationError,
  createMemoryBus,
  parsePayloadForPublish,
  type EventBus,
  type EventPayload,
} from "../index.js";

/**
 * One well-formed sample per event subject. The bus tests publish
 * these to make sure every catalogued event survives a roundtrip.
 */
function validSamples(): { [S in EventType]: EventPayload<S> } {
  const now = new Date().toISOString();
  const ws = "ws_abc123";
  return {
    [EventType.AssetIngested]: {
      workspace_id: ws,
      emitted_at: now,
      asset_id: "asset_1",
      source_uri: `s3://media-raw/${ws}/asset_1/source.mp4`,
      sha256: "a".repeat(64),
      duration_ms: 30000,
    },
    [EventType.AssetTranscribed]: {
      workspace_id: ws,
      emitted_at: now,
      asset_id: "asset_1",
      transcript_id: "t_1",
      language: "en",
      model: "whisper-small",
      word_count: 142,
    },
    [EventType.ProjectRendered]: {
      workspace_id: ws,
      emitted_at: now,
      project_id: "p_1",
      render_id: "r_1",
      target: "mp4-720p",
      output_uri: `s3://media-derived/${ws}/p_1/r_1.mp4`,
      duration_ms: 30000,
    },
    [EventType.RenderFailed]: {
      workspace_id: ws,
      emitted_at: now,
      project_id: "p_1",
      render_id: "r_1",
      target: "mp4-720p",
      error: { code: "ffmpeg_exit_1", message: "Invalid data found when processing input" },
    },
    [EventType.ClipProposed]: {
      workspace_id: ws,
      emitted_at: now,
      project_id: "p_1",
      clip_id: "c_1",
      asset_id: "asset_1",
      in_ms: 1000,
      out_ms: 5000,
      score: 0.87,
    },
    [EventType.ClipApproved]: {
      workspace_id: ws,
      emitted_at: now,
      project_id: "p_1",
      clip_id: "c_1",
      approved_by: "user_42",
    },
    [EventType.PublishCompleted]: {
      workspace_id: ws,
      emitted_at: now,
      project_id: "p_1",
      share_token: "share_xyz",
      channel: "web",
    },
  };
}

describe("schema catalogue", () => {
  it("has a Zod schema for every EventType constant", () => {
    for (const subject of ALL_EVENT_TYPES) {
      expect(EventSchemas[subject], `missing schema for ${subject}`).toBeDefined();
    }
  });

  it("includes every subject the ticket enumerated", () => {
    const required: ReadonlyArray<string> = [
      "asset.ingested",
      "asset.transcribed",
      "project.rendered",
      "render.failed",
      "clip.proposed",
      "clip.approved",
      "publish.completed",
    ];
    expect(new Set(ALL_EVENT_TYPES)).toEqual(new Set(required));
  });

  it("rejects every payload that omits workspace_id (multi-tenant rule)", () => {
    const samples = validSamples();
    for (const subject of ALL_EVENT_TYPES) {
      const sample = samples[subject];
      const { workspace_id: _ws, ...rest } = sample as { workspace_id: string };
      expect(
        () => parsePayloadForPublish(subject, rest as unknown),
        `${subject} accepted payload without workspace_id`,
      ).toThrowError(EventValidationError);
    }
  });

  it("rejects a non-RFC3339 emitted_at", () => {
    const samples = validSamples();
    const bad = { ...samples[EventType.AssetIngested], emitted_at: "yesterday" };
    expect(() => parsePayloadForPublish(EventType.AssetIngested, bad)).toThrowError(/emitted_at/);
  });

  it("EventValidationError carries the ZodError issues", () => {
    try {
      parsePayloadForPublish(EventType.AssetIngested, { not: "even close" });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(EventValidationError);
      const e = err as EventValidationError;
      expect(e.subject).toBe(EventType.AssetIngested);
      expect(e.issues.length).toBeGreaterThan(0);
      expect(e.message).toContain("publish validation failed");
    }
  });
});

describe("createMemoryBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = createMemoryBus();
  });

  afterEach(async () => {
    await bus.close();
  });

  it("delivers a published event to a subscriber (typed roundtrip)", async () => {
    const samples = validSamples();
    const sample = samples[EventType.AssetIngested];
    const received: EventPayload<typeof EventType.AssetIngested>[] = [];
    await bus.subscribe(EventType.AssetIngested, (event) => {
      received.push(event);
    });

    await bus.publish(EventType.AssetIngested, sample);

    expect(received).toEqual([sample]);
  });

  it("delivers each catalogued event end-to-end", async () => {
    const samples = validSamples();
    const seen: Partial<Record<EventType, number>> = {};

    for (const subject of ALL_EVENT_TYPES) {
      await bus.subscribe(subject, () => {
        seen[subject] = (seen[subject] ?? 0) + 1;
      });
    }
    for (const subject of ALL_EVENT_TYPES) {
      await bus.publish(subject, samples[subject] as never);
    }

    for (const subject of ALL_EVENT_TYPES) {
      expect(seen[subject], `${subject} was not delivered`).toBe(1);
    }
  });

  it("routes events only to subscribers of the matching subject", async () => {
    const samples = validSamples();
    const renderHandler = vi.fn();
    const assetHandler = vi.fn();
    await bus.subscribe(EventType.ProjectRendered, renderHandler);
    await bus.subscribe(EventType.AssetIngested, assetHandler);

    await bus.publish(EventType.AssetIngested, samples[EventType.AssetIngested]);

    expect(assetHandler).toHaveBeenCalledTimes(1);
    expect(renderHandler).not.toHaveBeenCalled();
  });

  it("stops delivering after unsubscribe()", async () => {
    const samples = validSamples();
    const handler = vi.fn();
    const unsubscribe = await bus.subscribe(EventType.ClipApproved, handler);
    await bus.publish(EventType.ClipApproved, samples[EventType.ClipApproved]);
    await unsubscribe();
    await bus.publish(EventType.ClipApproved, samples[EventType.ClipApproved]);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid payloads with EventValidationError", async () => {
    await expect(
      bus.publish(EventType.AssetIngested, { foo: "bar" } as never),
    ).rejects.toBeInstanceOf(EventValidationError);
  });

  it("throws after close()", async () => {
    await bus.close();
    const samples = validSamples();
    await expect(
      bus.publish(EventType.AssetIngested, samples[EventType.AssetIngested]),
    ).rejects.toThrow(/closed/);
  });
});
