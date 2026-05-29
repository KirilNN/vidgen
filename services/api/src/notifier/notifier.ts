/**
 * services/api/notifier — adapter interface.
 *
 * Architecture: §3.8 F8.9 (webhooks), §3.10 F10.2 (in-app notifications),
 * §6.1 (workflows emit events), §7.2 (adapter pattern), §11 (multi-tenant).
 *
 * The Notifier is what fans out a domain event to "everyone who asked
 * to be told". Two adapters live alongside this file:
 *
 *   - `hmac-webhook.ts` — built-in $0 path: signs the event JSON with
 *     HMAC-SHA256 and POSTs it directly to every URL registered for the
 *     workspace + subject. The default.
 *   - `novu.ts`         — delegates delivery to a self-hosted Novu API
 *     when `NOVU_API_URL` is set. Novu then handles webhooks + in-app
 *     inbox + Slack/Teams using its own workflow definitions.
 *
 * The fan-out *driver* (`fanout.ts`) talks only to this interface, so
 * swapping adapters never touches the event subscription wiring.
 */
import type { EventPayload, EventType } from "@vidgen/events";

/**
 * Minimal description of one webhook subscriber. The notifier receives
 * an already-resolved list of these from the fan-out driver — it does
 * not query the database itself, because adapters might run in a
 * different process from the API in future (e.g. a dedicated worker).
 */
export interface WebhookSubscriber {
  /** Row id in the `webhooks` table — used for log correlation. */
  id: string;
  /** Workspace this subscription belongs to (arch §11). */
  workspaceId: string;
  /** Destination URL the POST goes to. */
  url: string;
  /** Plaintext HMAC secret (decrypted by the caller). */
  secret: string;
}

/**
 * One delivery attempt summary. The fan-out driver collects these and
 * (optionally) writes them to an audit log; today we just emit a single
 * structured log line per attempt.
 */
export interface DeliveryResult {
  subscriberId: string;
  url: string;
  status: "delivered" | "failed";
  /** HTTP status code on success, undefined on transport error. */
  httpStatus?: number;
  /** Wall-clock duration of the attempt in milliseconds. */
  durationMs: number;
  /** Error message when `status === "failed"`. */
  error?: string;
}

export interface NotifyInput<S extends EventType = EventType> {
  subject: S;
  payload: EventPayload<S>;
  subscribers: WebhookSubscriber[];
}

/**
 * The single contract every adapter implements. Returns a settled
 * result per subscriber — adapters must NOT throw on individual
 * delivery failures (a slow subscriber should not block fan-out for
 * the others).
 */
export interface Notifier {
  /** Human-readable adapter name, used only in logs. */
  readonly name: string;
  notify(input: NotifyInput): Promise<DeliveryResult[]>;
  /** Release any underlying resources (HTTP agents, timers). */
  close(): Promise<void>;
}
