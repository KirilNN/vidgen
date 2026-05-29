/**
 * services/api/notifier/novu — Novu OSS adapter (T-023, opt-in).
 *
 * When `NOVU_API_URL` + `NOVU_API_KEY` are set in env, the API uses
 * this adapter instead of the built-in HMAC-webhook one. It POSTs to
 * Novu's `/v1/events/trigger` endpoint, letting Novu's workflow engine
 * handle channels (webhook, in-app, Slack, Teams, email…). For T-023
 * we still want a signed webhook to land at the registered URL, so we
 * encode each subscriber as a Novu Subscriber with a `webhookUrl`
 * payload key — the user's Novu workflow can map that to a Webhook
 * step. This adapter is intentionally minimal: full Novu workflow
 * authoring is a Phase-12 concern (see docs/build-plan.md §"Notify").
 *
 * Failures bubble up as `DeliveryResult{status:"failed"}` per
 * subscriber — same contract as the HMAC adapter so the fan-out
 * driver doesn't have to special-case anything.
 */
import type { DeliveryResult, Notifier, NotifyInput, WebhookSubscriber } from "./notifier.js";

export interface NovuNotifierOptions {
  apiUrl: string;
  apiKey: string;
  deliveryTimeoutMs?: number;
  fetchImpl?: typeof globalThis.fetch;
  log?: (entry: DeliveryResult & { subject: string }) => void;
}

function novuTriggerName(subject: string): string {
  // Novu workflow names are lowercase / hyphenated; map "asset.ingested"
  // → "vidgen-asset-ingested" so user workflows have a predictable id.
  return `vidgen-${subject.replace(/\./g, "-")}`;
}

export function createNovuNotifier(opts: NovuNotifierOptions): Notifier {
  const timeoutMs = opts.deliveryTimeoutMs ?? 10_000;
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const log = opts.log ?? (() => {});
  const triggerUrl = new URL("/v1/events/trigger", opts.apiUrl).toString();

  async function triggerOne(
    sub: WebhookSubscriber,
    subject: string,
    payload: unknown,
  ): Promise<DeliveryResult> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const start = Date.now();
    try {
      const res = await fetchImpl(triggerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `ApiKey ${opts.apiKey}`,
        },
        body: JSON.stringify({
          name: novuTriggerName(subject),
          to: {
            subscriberId: `vidgen:${sub.workspaceId}:${sub.id}`,
            data: { webhookUrl: sub.url },
          },
          payload,
        }),
        signal: ctrl.signal,
      });
      const result: DeliveryResult = {
        subscriberId: sub.id,
        url: sub.url,
        status: res.ok ? "delivered" : "failed",
        httpStatus: res.status,
        durationMs: Date.now() - start,
        ...(res.ok ? {} : { error: `Novu HTTP ${res.status}` }),
      };
      log({ ...result, subject });
      return result;
    } catch (err) {
      const result: DeliveryResult = {
        subscriberId: sub.id,
        url: sub.url,
        status: "failed",
        durationMs: Date.now() - start,
        error: (err as Error).message ?? "novu trigger error",
      };
      log({ ...result, subject });
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    name: "novu",
    async notify(input: NotifyInput): Promise<DeliveryResult[]> {
      if (input.subscribers.length === 0) return [];
      return Promise.all(
        input.subscribers.map((sub) => triggerOne(sub, input.subject, input.payload)),
      );
    },
    async close(): Promise<void> {
      /* nothing to release */
    },
  };
}
