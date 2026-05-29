/**
 * `@vidgen/events` — typed event bus for the vidgen workflow plane (T-022).
 *
 * Public surface:
 *   - `EventType` + `EventSchemas` (schema.ts) — the source-of-truth
 *     catalogue of every event the platform emits.
 *   - `EventBus` + helpers (bus.ts) — adapter-agnostic interface.
 *   - `createMemoryBus()` (adapters/memory.ts) — in-process bus for
 *     unit tests / dev convenience.
 *   - `createJetStreamBus()` (adapters/jetstream.ts) — production
 *     adapter against NATS JetStream.
 *
 * See `packages/events/README.md` for usage; architecture rationale in
 * docs/architecture.md §6.1, §9, §11.
 */
export {
  ALL_EVENT_TYPES,
  EventSchemas,
  EventType,
  type AnyEventPayload,
  type EventPayload,
  type EventSchemaMap,
} from "./schema.js";

export {
  EventValidationError,
  parsePayloadForPublish,
  parsePayloadForReceive,
  type EventBus,
  type EventHandler,
  type SubscribeOptions,
  type Unsubscribe,
} from "./bus.js";

export { createMemoryBus } from "./adapters/memory.js";
export {
  createJetStreamBus,
  eventSubjectsCoveredByStream,
  STREAM_NAME,
  STREAM_SUBJECTS,
  type JetStreamBusOptions,
} from "./adapters/jetstream.js";
