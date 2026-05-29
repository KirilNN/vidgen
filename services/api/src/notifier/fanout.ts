/**
 * services/api/notifier/fanout — bridges the event bus to the notifier.
 *
 * Subscribes to every `EventType` on the configured `EventBus` and, for
 * each incoming event, looks up the matching webhook subscribers in
 * Postgres and dispatches them via the provided `Notifier`. The
 * subscriber lookup is per-workspace and uses the workspace_id from
 * the event envelope (arch §11 — every event carries one).
 *
 * Why decouple subscription from notification?
 *   - Lets us test fan-out with `createMemoryBus()` and a fake notifier.
 *   - The bus and the notifier each have their own retry semantics —
 *     JetStream redelivers if the API crashes mid-handling, Novu (or
 *     the HMAC adapter) decides per-attempt success/failure.
 *
 * Architecture: §3.8 F8.9 (webhooks), §6.1, §7.2, §9, §11.
 */
import {
  ALL_EVENT_TYPES,
  type EventBus,
  type EventPayload,
  type EventType,
  type Unsubscribe,
} from "@vidgen/events";
import type { WebhookRow } from "../db/webhooks-repo.js";
import { decryptSecret } from "./crypto.js";
import type { Notifier, WebhookSubscriber } from "./notifier.js";

export interface FanoutOptions {
  bus: EventBus;
  notifier: Notifier;
  /**
   * Per-workspace lookup. Wired to `findWebhooksForSubject` in prod;
   * tests inject an in-memory map.
   */
  findSubscribers: (workspaceId: string, subject: string) => Promise<WebhookRow[]>;
  /**
   * AES-GCM key used to decrypt `secret_enc`. Comes from
   * `resolveEncryptionKey(...)` at boot.
   */
  encryptionKey: Buffer;
  /** Optional structured logger. */
  log?: {
    info?: (obj: Record<string, unknown>, msg?: string) => void;
    warn?: (obj: Record<string, unknown>, msg?: string) => void;
    error?: (obj: Record<string, unknown>, msg?: string) => void;
  };
}

export interface FanoutHandle {
  /** Drop every subscription and close the underlying notifier. */
  close: () => Promise<void>;
}

/**
 * Wire the fan-out consumer. Returns a handle whose `close()` should
 * be called on Fastify `onClose`.
 */
export async function startFanout(opts: FanoutOptions): Promise<FanoutHandle> {
  const { bus, notifier, findSubscribers, encryptionKey, log } = opts;
  const subs: Unsubscribe[] = [];

  for (const subject of ALL_EVENT_TYPES) {
    const unsub = await bus.subscribe(subject, async (payload) => {
      await dispatchOne(subject, payload, {
        notifier,
        findSubscribers,
        encryptionKey,
        log,
      });
    });
    subs.push(unsub);
  }

  return {
    async close() {
      await Promise.allSettled(subs.map((u) => u()));
      await notifier.close();
    },
  };
}

interface DispatchContext {
  notifier: Notifier;
  findSubscribers: FanoutOptions["findSubscribers"];
  encryptionKey: Buffer;
  log: FanoutOptions["log"];
}

async function dispatchOne<S extends EventType>(
  subject: S,
  payload: EventPayload<S>,
  ctx: DispatchContext,
): Promise<void> {
  const workspaceId = (payload as { workspace_id: string }).workspace_id;
  if (!workspaceId) {
    // Bus already validates envelopes, so this is defensive only.
    ctx.log?.warn?.({ subject }, "fanout: event missing workspace_id; dropping");
    return;
  }

  let rows: WebhookRow[];
  try {
    rows = await ctx.findSubscribers(workspaceId, subject);
  } catch (err) {
    ctx.log?.error?.(
      { subject, workspaceId, err: { message: (err as Error).message } },
      "fanout: failed to look up subscribers",
    );
    return;
  }
  if (rows.length === 0) return;

  const subscribers: WebhookSubscriber[] = [];
  for (const row of rows) {
    try {
      subscribers.push({
        id: row.id,
        workspaceId: row.workspaceId,
        url: row.url,
        secret: decryptSecret(row.secretEnc, ctx.encryptionKey),
      });
    } catch (err) {
      ctx.log?.error?.(
        { subject, webhookId: row.id, err: { message: (err as Error).message } },
        "fanout: failed to decrypt webhook secret; skipping subscriber",
      );
    }
  }
  if (subscribers.length === 0) return;

  try {
    const results = await ctx.notifier.notify({ subject, payload, subscribers });
    for (const r of results) {
      if (r.status === "failed") {
        ctx.log?.warn?.(
          {
            subject,
            workspaceId,
            webhookId: r.subscriberId,
            url: r.url,
            httpStatus: r.httpStatus,
            durationMs: r.durationMs,
            error: r.error,
          },
          "fanout: delivery failed",
        );
      } else {
        ctx.log?.info?.(
          {
            subject,
            workspaceId,
            webhookId: r.subscriberId,
            httpStatus: r.httpStatus,
            durationMs: r.durationMs,
          },
          "fanout: delivered",
        );
      }
    }
  } catch (err) {
    ctx.log?.error?.(
      { subject, workspaceId, err: { message: (err as Error).message } },
      "fanout: notifier.notify() threw",
    );
  }
}
