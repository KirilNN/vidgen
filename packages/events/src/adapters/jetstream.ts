/**
 * @vidgen/events — NATS JetStream adapter (T-022).
 *
 * Production adapter. Backs the `EventBus` interface with a single
 * JetStream stream (`VIDGEN_EVENTS`) that captures every subject under
 * the platform's namespace prefixes (`asset.>`, `project.>`,
 * `render.>`, `clip.>`, `publish.>`). One stream is sufficient at our
 * scale; per-subject streams add operational surface without buying
 * anything until volume justifies it.
 *
 * Architecture refs:
 * - §6.1 — workflows publish to NATS on lifecycle boundaries.
 * - §9   — NATS JetStream is the bus; Novu (T-023) consumes via webhook.
 *
 * Subscription model: each `subscribe()` call creates an *ephemeral*
 * push consumer with the next-only deliver policy by default. Long-
 * lived durable consumers (Novu, audit log) are created by their
 * owning tickets; this adapter is the low-level primitive.
 */
import {
  connect,
  consumerOpts,
  DeliverPolicy,
  RetentionPolicy,
  StorageType,
  StringCodec,
  type Codec,
  type NatsConnection,
  type StreamConfig,
} from "nats";
import {
  EventValidationError,
  parsePayloadForPublish,
  parsePayloadForReceive,
  type EventBus,
  type EventHandler,
  type SubscribeOptions,
  type Unsubscribe,
} from "../bus.js";
import { ALL_EVENT_TYPES, type EventPayload, type EventType } from "../schema.js";

/** Name of the single JetStream stream this adapter manages. */
export const STREAM_NAME = "VIDGEN_EVENTS";

/**
 * Subject filter the stream captures. Wildcards over each top-level
 * namespace so newly added subjects in those namespaces are picked up
 * automatically without an `ensureStream()` schema migration.
 */
export const STREAM_SUBJECTS = Object.freeze([
  "asset.>",
  "project.>",
  "render.>",
  "clip.>",
  "publish.>",
]);

export interface JetStreamBusOptions {
  /** NATS server URL, e.g. `nats://nats:4222`. */
  url: string;
  /**
   * Connection name surfaced in NATS monitoring (`/varz`). Default
   * "vidgen-events" — override per-service for fleet visibility (e.g.
   * "vidgen-worker-light").
   */
  name?: string;
  /**
   * If true (default), the adapter will create or update the
   * `VIDGEN_EVENTS` stream on connect. Disable when running against a
   * NATS instance you don't own.
   */
  manageStream?: boolean;
  /**
   * Override the default ephemeral-consumer deliver policy. Defaults
   * to "new" so subscribers don't replay historical events on attach.
   */
  deliverPolicy?: DeliverPolicy;
}

export async function createJetStreamBus(options: JetStreamBusOptions): Promise<EventBus> {
  const nc = await connect({
    servers: options.url,
    name: options.name ?? "vidgen-events",
    // Reconnect aggressively; long-running workers shouldn't fall off
    // the bus permanently because NATS bounces.
    reconnect: true,
    maxReconnectAttempts: -1,
    reconnectTimeWait: 2000,
  });

  const codec: Codec<string> = StringCodec();
  const js = nc.jetstream();
  const jsm = await nc.jetstreamManager();

  if (options.manageStream !== false) {
    await ensureStream(jsm);
  }

  // Track active subscriptions so `close()` can drain them deterministically.
  const drainCallbacks = new Set<() => Promise<void>>();
  let closed = false;

  function assertOpen(): void {
    if (closed) throw new Error("[@vidgen/events] JetStream bus is closed");
  }

  return {
    async publish<S extends EventType>(subject: S, payload: EventPayload<S>) {
      assertOpen();
      const parsed = parsePayloadForPublish(subject, payload);
      const bytes = codec.encode(JSON.stringify(parsed));
      // `publish` returns the PubAck — useful for callers that need to
      // confirm durability; we await it so backpressure surfaces.
      await js.publish(subject, bytes);
    },

    async subscribe<S extends EventType>(
      subject: S,
      handler: EventHandler<S>,
      subOpts: SubscribeOptions = {},
    ): Promise<Unsubscribe> {
      assertOpen();
      const onValidationError =
        subOpts.onValidationError ??
        ((err: EventValidationError) =>
          console.error(`[@vidgen/events] JetStream dropped invalid event: ${err.message}`));

      // Ephemeral push consumer: no durable name, the server cleans up
      // when this connection drops. `consumerOpts()` is the v2 idiomatic
      // way to build subscriber options — it transparently synthesizes
      // a unique deliver subject (otherwise the server rejects push
      // subs with ERR push consumer requires deliver_subject). Long-
      // lived durable consumers (Novu, audit log) live in their owner
      // tickets and will pass their own `durable()` here.
      const opts = consumerOpts();
      opts.manualAck();
      opts.ackExplicit();
      const deliverPolicy = options.deliverPolicy ?? DeliverPolicy.New;
      if (deliverPolicy === DeliverPolicy.All) {
        opts.deliverAll();
      } else if (deliverPolicy === DeliverPolicy.Last) {
        opts.deliverLast();
      } else {
        opts.deliverNew();
      }
      // `deliverTo` is what flips the consumer into push mode by giving
      // the server an inbox subject to push messages to. Omitting it
      // is the cause of "push consumer requires deliver_subject".
      opts.deliverTo(`_INBOX.events.${Math.random().toString(36).slice(2, 14)}`);

      const subscription = await js.subscribe(subject, opts);

      const runner = (async () => {
        for await (const message of subscription) {
          let raw: unknown;
          try {
            raw = JSON.parse(codec.decode(message.data));
          } catch (err) {
            onValidationError(
              new EventValidationError(
                subject,
                {
                  issues: [
                    {
                      code: "custom",
                      path: [],
                      message: `non-JSON payload: ${(err as Error).message}`,
                    },
                  ],
                  // The Zod type wants the full ZodError but our hand-
                  // rolled shape only carries `issues`; cast is safe
                  // because `EventValidationError` only reads `.issues`.
                } as never,
                "subscribe",
              ),
            );
            message.ack();
            continue;
          }
          const parsed = parsePayloadForReceive(subject, raw, onValidationError);
          if (parsed === null) {
            // Validation failure already reported; ack so we don't
            // hot-loop on a poison pill.
            message.ack();
            continue;
          }
          try {
            await handler(parsed);
            message.ack();
          } catch (err) {
            // Handler threw — NAK so JetStream redelivers per its
            // backoff policy. Surface the failure too.
            message.nak();
            console.error(
              `[@vidgen/events] handler for ${subject} threw: ${(err as Error).message}`,
            );
          }
        }
      })();

      // Surface unexpected iterator errors (e.g. connection torn down
      // mid-iteration) so they don't disappear into an unhandled-rejection.
      runner.catch((err) => {
        if (!closed) {
          console.error(
            `[@vidgen/events] subscription loop for ${subject} crashed: ${(err as Error).message}`,
          );
        }
      });

      const drain = async () => {
        try {
          await subscription.drain();
        } catch {
          /* connection may already be closed */
        }
      };
      drainCallbacks.add(drain);

      return async () => {
        drainCallbacks.delete(drain);
        await drain();
      };
    },

    async close() {
      if (closed) return;
      closed = true;
      // Drain subscriptions first so in-flight handlers get to finish.
      await Promise.allSettled(Array.from(drainCallbacks).map((d) => d()));
      drainCallbacks.clear();
      await nc.drain();
    },
  };
}

/**
 * Create the stream if missing; update its config if drift is detected
 * (subjects list changed). Safe to call repeatedly — JetStream is
 * idempotent on stream config equality.
 */
async function ensureStream(jsm: Awaited<ReturnType<NatsConnection["jetstreamManager"]>>) {
  const desired: Partial<StreamConfig> = {
    name: STREAM_NAME,
    subjects: STREAM_SUBJECTS as unknown as string[],
    // 7-day retention is enough for replays during dev and for the
    // Novu/audit-log consumers to backfill on restart. Production may
    // bump this via a future ticket.
    max_age: 7 * 24 * 60 * 60 * 1_000_000_000, // ns
    // Interest retention so messages without an active consumer are
    // discarded; matches the "fire-and-forget unless someone is
    // listening" model the bus advertises.
    retention: RetentionPolicy.Interest,
    storage: StorageType.File,
  };

  try {
    const info = await jsm.streams.info(STREAM_NAME);
    // Only update on a meaningful diff — JetStream returns
    // already-equal updates as ERR_STREAM_NAME_EXIST otherwise.
    const current = info.config;
    const subjectsEqual =
      Array.isArray(current.subjects) &&
      current.subjects.length === STREAM_SUBJECTS.length &&
      current.subjects.every((s, i) => s === STREAM_SUBJECTS[i]);
    if (!subjectsEqual) {
      await jsm.streams.update(STREAM_NAME, desired);
    }
  } catch {
    // Stream does not exist; create it.
    await jsm.streams.add(desired);
  }
}

/**
 * Echoed for tests + smoke scripts that want to verify the catalogue
 * matches the stream subject filter without importing both modules.
 */
export function eventSubjectsCoveredByStream(): boolean {
  return ALL_EVENT_TYPES.every((subject) =>
    STREAM_SUBJECTS.some((filter) => {
      const prefix = filter.replace(/\.>$/, ".");
      return subject.startsWith(prefix);
    }),
  );
}
