/**
 * @vidgen/events — in-memory event bus (T-022).
 *
 * Synchronous fan-out backed by per-subject handler lists. Used by:
 *   - unit tests, so the test process doesn't need a NATS server
 *   - the API's emit-and-forget path when JetStream isn't configured
 *     (dev convenience; production wires the JetStream adapter)
 *
 * Persistence: none. Subjects published before any subscriber attached
 * are dropped on the floor — same semantics as NATS core (not
 * JetStream). For durable replay, use the JetStream adapter.
 */
import type { EventType, EventPayload } from "../schema.js";
import {
  EventValidationError,
  parsePayloadForPublish,
  type EventBus,
  type EventHandler,
  type SubscribeOptions,
  type Unsubscribe,
} from "../bus.js";

type AnyHandler = (event: unknown) => void | Promise<void>;

export function createMemoryBus(): EventBus {
  // Keyed by subject; each entry is a Set of handler wrappers (Set so
  // we get O(1) deletion in `unsubscribe`).
  const subscribers = new Map<EventType, Set<AnyHandler>>();
  let closed = false;

  function assertOpen(): void {
    if (closed) throw new Error("[@vidgen/events] memory bus is closed");
  }

  return {
    async publish<S extends EventType>(subject: S, payload: EventPayload<S>) {
      assertOpen();
      // parsePayloadForPublish throws EventValidationError on failure.
      const parsed = parsePayloadForPublish(subject, payload);
      const handlers = subscribers.get(subject);
      if (!handlers || handlers.size === 0) return;
      // Snapshot to avoid mutation-during-iteration if a handler
      // unsubscribes / re-subscribes synchronously.
      const snapshot = Array.from(handlers);
      // Fire-and-await sequentially so handler errors surface in order;
      // the in-memory bus is for unit tests, so determinism > parallelism.
      for (const handler of snapshot) {
        await handler(parsed);
      }
    },

    async subscribe<S extends EventType>(
      subject: S,
      handler: EventHandler<S>,
      options: SubscribeOptions = {},
    ): Promise<Unsubscribe> {
      assertOpen();
      // The memory bus delivers what publish already validated, so the
      // receive-side validator is a no-op except as a safety net for
      // callers that bypass `publish()` (none today). We still surface
      // validation errors through `onValidationError` for parity with
      // the JetStream adapter.
      const onValidationError =
        options.onValidationError ??
        ((err: EventValidationError) =>
          console.error(`[@vidgen/events] memory bus dropped invalid event: ${err.message}`));

      const wrapped: AnyHandler = async (event) => {
        try {
          await handler(event as EventPayload<S>);
        } catch (err) {
          // Re-throw validation errors via the dedicated channel; other
          // errors bubble out of `publish()` (which awaits handlers).
          if (err instanceof EventValidationError) {
            onValidationError(err);
            return;
          }
          throw err;
        }
      };

      const set = subscribers.get(subject) ?? new Set<AnyHandler>();
      set.add(wrapped);
      subscribers.set(subject, set);

      return async () => {
        set.delete(wrapped);
        if (set.size === 0) subscribers.delete(subject);
      };
    },

    async close() {
      closed = true;
      subscribers.clear();
    },
  };
}
