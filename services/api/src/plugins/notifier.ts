/**
 * services/api/plugins/notifier — Fastify plugin (T-023).
 *
 * Boots the Notifier and the fan-out subscriber. Decorates
 * `app.notifier` and `app.eventBus` so routes / tests can publish
 * events directly (the `/health/synthetic` style endpoints used by the
 * smoke script live here in spirit, but we keep the public surface
 * stable: routes publish via `app.eventBus`).
 *
 * Behaviour:
 *   - If `NOVU_API_URL` is set we pick the Novu adapter.
 *   - Else (default) we use the in-process HMAC-webhook adapter.
 *   - If `NATS_URL` is set we wire a JetStream bus, otherwise an
 *     in-memory bus (so test environments without infra still receive
 *     events via `app.eventBus.publish(...)`).
 *
 * The plugin owns the bus + notifier lifecycle; both close cleanly on
 * Fastify `onClose`.
 */
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { createJetStreamBus, createMemoryBus, type EventBus } from "@vidgen/events";
import { apiConfig } from "../config.js";
import { findWebhooksForSubject } from "../db/webhooks-repo.js";
import {
  createHmacWebhookNotifier,
  createNovuNotifier,
  resolveEncryptionKey,
  startFanout,
  type DeliveryResult,
  type FanoutHandle,
  type Notifier,
} from "../notifier/index.js";

declare module "fastify" {
  interface FastifyInstance {
    notifier: Notifier;
    eventBus: EventBus;
  }
}

async function notifierPlugin(app: FastifyInstance): Promise<void> {
  // ---- event bus ------------------------------------------------------------
  const bus: EventBus = apiConfig.NATS_URL
    ? await createJetStreamBus({ url: apiConfig.NATS_URL })
    : createMemoryBus();

  // ---- notifier adapter -----------------------------------------------------
  const baseLog = (entry: DeliveryResult & { subject: string }) => {
    if (entry.status === "failed") {
      app.log.warn({ ...entry }, "webhook delivery failed");
    } else {
      app.log.info({ ...entry }, "webhook delivered");
    }
  };
  const notifier: Notifier =
    apiConfig.NOVU_API_URL && apiConfig.NOVU_API_KEY
      ? createNovuNotifier({
          apiUrl: apiConfig.NOVU_API_URL,
          apiKey: apiConfig.NOVU_API_KEY,
          deliveryTimeoutMs: apiConfig.WEBHOOK_DELIVERY_TIMEOUT_MS,
          log: baseLog,
        })
      : createHmacWebhookNotifier({
          deliveryTimeoutMs: apiConfig.WEBHOOK_DELIVERY_TIMEOUT_MS,
          log: baseLog,
        });

  app.log.info(
    { adapter: notifier.name, bus: apiConfig.NATS_URL ? "jetstream" : "memory" },
    "notifier wired",
  );

  // ---- fan-out consumer -----------------------------------------------------
  const encryptionKey = resolveEncryptionKey(
    apiConfig.WEBHOOK_SECRET_ENCRYPTION_KEY || undefined,
    apiConfig.APP_SECRET,
  );
  let fanout: FanoutHandle | null = null;
  try {
    fanout = await startFanout({
      bus,
      notifier,
      findSubscribers: (workspaceId, subject) => findWebhooksForSubject(workspaceId, subject),
      encryptionKey,
      log: {
        info: (obj, msg) => app.log.info(obj, msg),
        warn: (obj, msg) => app.log.warn(obj, msg),
        error: (obj, msg) => app.log.error(obj, msg),
      },
    });
  } catch (err) {
    // If the bus can't be subscribed (e.g. JetStream down at boot) we
    // still want the route surface to work so operators can register
    // webhooks; subsequent events will be lost until restart.
    app.log.error(
      { err: { message: (err as Error).message } },
      "fanout: failed to start; webhooks will not receive events until restart",
    );
  }

  app.decorate("notifier", notifier);
  app.decorate("eventBus", bus);

  app.addHook("onClose", async () => {
    await fanout?.close();
    await bus.close();
  });
}

export default fp(notifierPlugin, {
  name: "vidgen-notifier",
  dependencies: ["vidgen-db"],
});
