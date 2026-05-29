/**
 * @vidgen/events — event type catalogue + Zod schemas (T-022).
 *
 * **Single source of truth.** Every event subject the platform emits or
 * subscribes to is listed in `EventType` and has a matching schema in
 * `EventSchemas`. The bus interface is generic over this map: TypeScript
 * infers the right payload type from the subject string, and runtime
 * validation (publish + subscribe) is wired automatically.
 *
 * Architecture refs:
 * - §6.1 — workflows emit events at lifecycle boundaries.
 * - §9   — NATS JetStream as the bus; Novu fans out to webhooks (T-023).
 * - §11  — `workspace_id` mandatory on every payload (multi-tenant).
 * - §3.8 F8.9 — webhooks subscribe to a subset of these subjects (T-023).
 *
 * Adding a new event: append to `EventType`, add a schema to
 * `EventSchemas`, ensure the JetStream subject filter still matches.
 */
import { z } from "zod";

/**
 * NATS subject names for every event the platform publishes. Names use
 * dot-separated namespaces so JetStream can wildcard-filter (`asset.>`,
 * etc.) — see `adapters/jetstream.ts` for the stream layout.
 *
 * Keep the literal strings stable; downstream consumers (Novu webhooks,
 * the API audit log) index on them.
 */
export const EventType = {
  AssetIngested: "asset.ingested",
  AssetTranscribed: "asset.transcribed",
  ProjectRendered: "project.rendered",
  RenderFailed: "render.failed",
  ClipProposed: "clip.proposed",
  ClipApproved: "clip.approved",
  PublishCompleted: "publish.completed",
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

/**
 * Fields every event MUST carry. `workspace_id` is the multi-tenant
 * tag (arch §11) — the bus rejects publishes that omit it. `emitted_at`
 * is RFC3339 so it survives JSON serialisation without timezone
 * ambiguity.
 */
const eventEnvelope = z.object({
  workspace_id: z
    .string()
    .min(1, "workspace_id is required on every event (multi-tenant rule, arch §11)"),
  emitted_at: z.string().datetime({ offset: true }),
});

const assetIngestedSchema = eventEnvelope.extend({
  asset_id: z.string().min(1),
  source_uri: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/i),
  duration_ms: z.number().int().nonnegative(),
  /** True when finalize-upload found an existing matching sha256 (T-033). */
  deduped: z.boolean().optional(),
});

const assetTranscribedSchema = eventEnvelope.extend({
  asset_id: z.string().min(1),
  transcript_id: z.string().min(1),
  language: z.string().min(1),
  model: z.string().min(1),
  word_count: z.number().int().nonnegative(),
});

const projectRenderedSchema = eventEnvelope.extend({
  project_id: z.string().min(1),
  render_id: z.string().min(1),
  /** One of "mp4-720p", "mp4-1080p", "hls", "gif"… (validated by callers). */
  target: z.string().min(1),
  output_uri: z.string().min(1),
  duration_ms: z.number().int().nonnegative(),
});

const renderFailedSchema = eventEnvelope.extend({
  project_id: z.string().min(1),
  render_id: z.string().min(1),
  target: z.string().min(1),
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
  }),
});

const clipProposedSchema = eventEnvelope.extend({
  project_id: z.string().min(1),
  clip_id: z.string().min(1),
  asset_id: z.string().min(1),
  in_ms: z.number().int().nonnegative(),
  out_ms: z.number().int().nonnegative(),
  score: z.number().min(0).max(1),
});

const clipApprovedSchema = eventEnvelope.extend({
  project_id: z.string().min(1),
  clip_id: z.string().min(1),
  approved_by: z.string().min(1),
});

const publishCompletedSchema = eventEnvelope.extend({
  project_id: z.string().min(1),
  share_token: z.string().min(1),
  channel: z.string().min(1),
  destination_url: z.string().url().optional(),
});

/**
 * Subject → Zod schema. The bus uses this map at publish + subscribe
 * to guarantee every byte that crosses a service boundary parses.
 */
export const EventSchemas = {
  [EventType.AssetIngested]: assetIngestedSchema,
  [EventType.AssetTranscribed]: assetTranscribedSchema,
  [EventType.ProjectRendered]: projectRenderedSchema,
  [EventType.RenderFailed]: renderFailedSchema,
  [EventType.ClipProposed]: clipProposedSchema,
  [EventType.ClipApproved]: clipApprovedSchema,
  [EventType.PublishCompleted]: publishCompletedSchema,
} as const;

export type EventSchemaMap = typeof EventSchemas;

/** Resolves the inferred TypeScript payload type for a given subject. */
export type EventPayload<S extends EventType> = z.infer<EventSchemaMap[S]>;

/** Every payload shape, useful for catch-all consumers (audit log, etc.). */
export type AnyEventPayload = {
  [S in EventType]: EventPayload<S>;
}[EventType];

/**
 * Convenience runtime list — used by the JetStream adapter to compute
 * subject filters and by tests to iterate every event.
 */
export const ALL_EVENT_TYPES: readonly EventType[] = Object.freeze(
  Object.values(EventType) as EventType[],
);
