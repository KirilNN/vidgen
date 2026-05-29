# services/api/src/notifier — webhook fan-out + Notifier adapters (T-023)

## Purpose

Bridges the platform's domain event bus (`@vidgen/events`, T-022) to
outbound notification channels. Two responsibilities:

1. **Adapter pattern** — `Notifier` interface with two implementations:
   - `hmac-webhook` (default, $0): HMAC-SHA256 signs every payload with
     the per-webhook secret and POSTs to the subscriber's URL. Headers:
     `X-Vidgen-Event`, `X-Vidgen-Delivery`, `X-Vidgen-Timestamp`,
     `X-Vidgen-Signature: t=<unix>,v1=<hex>` (Stripe-style).
   - `novu` (opt-in): forwards to a self-hosted Novu API
     (`/v1/events/trigger`) so user-defined Novu workflows can route
     events to webhook + in-app inbox + Slack/Teams.
2. **Fan-out driver** (`fanout.ts`) — subscribes to every `EventType`
   on the configured `EventBus`, looks up matching `webhooks` rows for
   the event's `workspace_id`, decrypts the secret, and dispatches via
   the active `Notifier`.

Architecture refs: §3.8 F8.9, §3.10 F10.2, §6.1, §7.2, §9, §11.

## Adapter selection (at boot)

| Env vars                            | Adapter        |
| ----------------------------------- | -------------- |
| _(default)_                         | `hmac-webhook` |
| `NOVU_API_URL` + `NOVU_API_KEY` set | `novu`         |

Adapter choice is logged on startup
(`{adapter: "hmac-webhook" | "novu", bus: "memory" | "jetstream"}`).

## Secret handling

- Per-webhook secret: 32 random bytes, base64url-encoded, generated at
  registration (`generateWebhookSecret`).
- Stored encrypted in `webhooks.secret_enc` via AES-256-GCM
  (`encryptSecret`). The encryption key is either
  `WEBHOOK_SECRET_ENCRYPTION_KEY` (64 hex chars) or, when blank,
  `SHA-256(APP_SECRET)`.
- Plaintext returned **once** by `POST /workspaces/:id/webhooks`. Never
  returned by `GET`. Lost secrets require deregister + reregister.

## Run

The notifier is wired by `services/api/src/plugins/notifier.ts` at
Fastify boot. Nothing extra to start — the API process owns the
subscription. To enable Novu in dev:

```
docker compose --profile core up -d mongodb novu-api novu-worker novu-dashboard
# Browse http://localhost:4000 → create an environment → copy the API key
NOVU_API_URL=http://localhost:3030 NOVU_API_KEY=<...> pnpm --filter @vidgen/api dev
```

## Test

```
pnpm --filter @vidgen/api test -- --run notifier
pnpm --filter @vidgen/api test -- --run fanout
pnpm --filter @vidgen/api test -- --run webhooks.routes
```

End-to-end against the live stack:

```
bash scripts/webhooks-smoke.sh                            # compose + unit
RUN_E2E=1 API_BEARER=$tok WORKSPACE_ID=$ws \
  bash scripts/webhooks-smoke.sh                          # live POST round-trip
```
