/**
 * @vidgen/events — bus interface + helpers (T-022).
 *
 * `EventBus` is the contract every adapter (JetStream, in-memory)
 * implements. Generic over the event subject so callers get
 * exact-shape type inference for the payload AND runtime validation
 * (the publish + subscribe helpers parse against `EventSchemas` before
 * the bytes leave / enter the adapter).
 */
import type { ZodError } from "zod";
import { EventSchemas, type EventPayload, type EventType } from "./schema.js";

/** Async handler invoked once per subscribed event. */
export type EventHandler<S extends EventType> = (event: EventPayload<S>) => void | Promise<void>;

/** Returned by `subscribe()`; await to drop the subscription cleanly. */
export type Unsubscribe = () => Promise<void>;

export interface EventBus {
  /**
   * Validate `payload` against the subject's schema, then deliver to
   * every interested subscriber (in-process or JetStream-backed).
   * Throws `EventValidationError` on validation failure — the bus never
   * forwards an invalid payload.
   */
  publish<S extends EventType>(subject: S, payload: EventPayload<S>): Promise<void>;

  /**
   * Subscribe to a single event subject. The handler receives only
   * payloads that pass validation; invalid payloads are reported via
   * the optional `onValidationError` hook (defaults to logging to
   * console.error) and dropped (consumers should not crash on a single
   * malformed message — JetStream subjects can be old).
   */
  subscribe<S extends EventType>(
    subject: S,
    handler: EventHandler<S>,
    options?: SubscribeOptions,
  ): Promise<Unsubscribe>;

  /** Release any underlying resources (NATS connection, timers). */
  close(): Promise<void>;
}

export interface SubscribeOptions {
  /**
   * Optional callback for payloads that fail schema validation. The
   * default is a `console.error` log — production callers should pass
   * a structured logger.
   */
  onValidationError?: (err: EventValidationError) => void;
}

/**
 * Thrown by `publish()` when the payload fails its Zod schema. Wraps
 * the underlying `ZodError` so callers can inspect issues directly.
 */
export class EventValidationError extends Error {
  readonly subject: EventType;
  readonly issues: ZodError["issues"];

  constructor(subject: EventType, zodError: ZodError, direction: "publish" | "subscribe") {
    const summary = zodError.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    super(`[@vidgen/events] ${direction} validation failed for ${subject}: ${summary}`);
    this.name = "EventValidationError";
    this.subject = subject;
    this.issues = zodError.issues;
  }
}

/**
 * Helper used by adapters to validate the payload immediately before
 * publishing. Returns the (potentially coerced) parsed value; throws
 * on failure. Keeps the validation logic in one place across adapters.
 */
export function parsePayloadForPublish<S extends EventType>(
  subject: S,
  payload: unknown,
): EventPayload<S> {
  const schema = EventSchemas[subject];
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new EventValidationError(subject, result.error, "publish");
  }
  return result.data as EventPayload<S>;
}

/**
 * Helper used by adapters to validate a received payload before
 * invoking the handler. Returns `null` and notifies the error callback
 * on failure so the adapter can drop the message gracefully.
 */
export function parsePayloadForReceive<S extends EventType>(
  subject: S,
  raw: unknown,
  onError: (err: EventValidationError) => void,
): EventPayload<S> | null {
  const schema = EventSchemas[subject];
  const result = schema.safeParse(raw);
  if (!result.success) {
    onError(new EventValidationError(subject, result.error, "subscribe"));
    return null;
  }
  return result.data as EventPayload<S>;
}
