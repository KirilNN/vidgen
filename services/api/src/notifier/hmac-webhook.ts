/**
 * services/api/notifier/hmac-webhook — built-in $0 webhook adapter.
 *
 * For every subscriber:
 *   - Compute `signed_string = "<timestamp>.<canonical_body>"`
 *   - Compute `signature = HMAC-SHA256(secret, signed_string)`
 *   - POST `canonical_body` to `subscriber.url` with headers:
 *       Content-Type: application/json
 *       X-Vidgen-Event:     <event subject>
 *       X-Vidgen-Delivery:  <random uuid>          (delivery id, useful for dedup)
 *       X-Vidgen-Timestamp: <unix seconds>
 *       X-Vidgen-Signature: t=<ts>,v1=<hex sig>    (Stripe-style)
 *
 * `canonical_body` is the exact bytes used to compute the signature, so
 * subscribers can re-derive it without re-serialising JSON (which would
 * be lossy across implementations). This matches Stripe / GitHub
 * conventions and is documented in `docs/agent-runbook.md`-adjacent
 * material for downstream consumers.
 *
 * Delivery is best-effort: any non-2xx response or transport error
 * yields `{status: "failed"}` in the result — RETRY is out of scope of
 * T-023 (queued via Temporal in later tickets).
 */
import { createHmac, randomUUID } from "node:crypto";
import type { DeliveryResult, Notifier, NotifyInput, WebhookSubscriber } from "./notifier.js";

export interface HmacWebhookNotifierOptions {
  /** Per-attempt timeout (ms). Defaults to 10 000. */
  deliveryTimeoutMs?: number;
  /**
   * Override the global fetch — primarily for tests so we don't need
   * a real HTTP server. Must follow the same signature.
   */
  fetchImpl?: typeof globalThis.fetch;
  /**
   * Optional structured logger. Receives one entry per delivery
   * attempt. Defaults to a no-op so prod can plug Fastify's logger in.
   */
  log?: (entry: DeliveryResult & { subject: string }) => void;
}

/**
 * Canonical JSON body used for both signing and transport. We sort keys
 * recursively so two subscribers signing the same logical payload get
 * the same signed bytes regardless of property order in JS.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) sorted[k] = sortDeep(obj[k]);
    return sorted;
  }
  return value;
}

/**
 * Compute the `X-Vidgen-Signature` header value for a body+timestamp
 * pair. Exposed so subscribers (and our own tests) can verify deliveries
 * without re-implementing the format.
 */
export function computeSignatureHeader(
  secret: string,
  unixTimestamp: number,
  canonicalBody: string,
): string {
  const sig = createHmac("sha256", secret)
    .update(`${unixTimestamp}.${canonicalBody}`)
    .digest("hex");
  return `t=${unixTimestamp},v1=${sig}`;
}

export function createHmacWebhookNotifier(opts: HmacWebhookNotifierOptions = {}): Notifier {
  const timeoutMs = opts.deliveryTimeoutMs ?? 10_000;
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const log = opts.log ?? (() => {});

  async function dispatchOne(
    sub: WebhookSubscriber,
    subject: string,
    canonicalBody: string,
  ): Promise<DeliveryResult> {
    const ts = Math.floor(Date.now() / 1000);
    const sig = computeSignatureHeader(sub.secret, ts, canonicalBody);
    const deliveryId = randomUUID();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const start = Date.now();
    try {
      const res = await fetchImpl(sub.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Vidgen-Event": subject,
          "X-Vidgen-Delivery": deliveryId,
          "X-Vidgen-Timestamp": String(ts),
          "X-Vidgen-Signature": sig,
        },
        body: canonicalBody,
        signal: ctrl.signal,
      });
      const result: DeliveryResult = {
        subscriberId: sub.id,
        url: sub.url,
        status: res.ok ? "delivered" : "failed",
        httpStatus: res.status,
        durationMs: Date.now() - start,
        ...(res.ok ? {} : { error: `HTTP ${res.status}` }),
      };
      log({ ...result, subject });
      return result;
    } catch (err) {
      const result: DeliveryResult = {
        subscriberId: sub.id,
        url: sub.url,
        status: "failed",
        durationMs: Date.now() - start,
        error: (err as Error).message ?? "delivery error",
      };
      log({ ...result, subject });
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    name: "hmac-webhook",
    async notify(input: NotifyInput): Promise<DeliveryResult[]> {
      if (input.subscribers.length === 0) return [];
      const body = canonicalJson(input.payload);
      return Promise.all(input.subscribers.map((sub) => dispatchOne(sub, input.subject, body)));
    },
    async close(): Promise<void> {
      /* nothing to release */
    },
  };
}
