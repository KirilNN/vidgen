/**
 * services/api/notifier — public surface (T-023).
 *
 * Re-exports the adapters + the fan-out runtime. The Fastify plugin in
 * `plugins/notifier.ts` is the only consumer that should pick which
 * adapter to use; everything else talks to the `Notifier` interface.
 */
export type { DeliveryResult, Notifier, NotifyInput, WebhookSubscriber } from "./notifier.js";

export {
  canonicalJson,
  computeSignatureHeader,
  createHmacWebhookNotifier,
  type HmacWebhookNotifierOptions,
} from "./hmac-webhook.js";

export { createNovuNotifier, type NovuNotifierOptions } from "./novu.js";

export {
  decryptSecret,
  encryptSecret,
  generateWebhookSecret,
  resolveEncryptionKey,
} from "./crypto.js";

export { startFanout, type FanoutHandle, type FanoutOptions } from "./fanout.js";
