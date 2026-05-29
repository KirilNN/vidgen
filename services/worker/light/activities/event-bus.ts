/**
 * services/worker/light/activities/event-bus — lazy event bus for
 * worker-side publishes (T-031).
 *
 * The light pool's `publishAssetIngested` activity needs an EventBus.
 * In production it's NATS JetStream; in tests + dev without NATS it's
 * the in-memory bus (the publish becomes a no-op as far as external
 * subscribers are concerned, but `publishEvent` still validates the
 * payload against the schema so we catch mistakes early).
 *
 * Architecture refs:
 *   - §6.1 — every long op publishes domain events.
 *   - §9   — events are typed via `@vidgen/events`.
 */
import { createJetStreamBus, createMemoryBus, type EventBus } from "@vidgen/events";

let bus: EventBus | undefined;
let starting: Promise<EventBus> | undefined;

/** @internal */
export function __setEventBusForTests(b: EventBus | undefined): void {
  bus = b;
  starting = undefined;
}

export async function getEventBus(): Promise<EventBus> {
  if (bus) return bus;
  if (starting) return starting;
  starting = (async () => {
    const url = process.env["NATS_URL"];
    bus = url ? await createJetStreamBus({ url }) : createMemoryBus();
    return bus;
  })();
  return starting;
}

export async function closeEventBus(): Promise<void> {
  const b = bus;
  bus = undefined;
  starting = undefined;
  if (b) await b.close();
}
