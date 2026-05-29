# @vidgen/events

Typed event bus for the vidgen workflow plane (T-022).

A thin abstraction over **NATS JetStream** for inter-service events
(`asset.ingested`, `asset.transcribed`, `project.rendered`,
`render.failed`, `clip.proposed`, `clip.approved`,
`publish.completed`). Two adapters share one interface:

| Adapter             | When to use                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| `JetStreamEventBus` | Production / dev. Persists to JetStream. Required for cross-service delivery (api → worker, worker → novu). |
| `MemoryEventBus`    | Unit tests + the API's in-process emit-and-forget path. Zero network. No persistence.                       |

## Source-of-truth schemas

`src/schema.ts` is the **single source of truth** for the catalogue of
event types and their Zod schemas. Every event payload is validated on
publish and on subscribe — invalid data NEVER crosses a service
boundary. Every payload carries a `workspace_id`; the bus rejects
publishes without one (multi-tenant rule, architecture §11).

Add a new event type:

1. Add a constant to `EventType` in `src/schema.ts`.
2. Add its Zod schema to `EventSchemas`.
3. The TypeScript types are derived automatically — `EventPayload<'…'>`
   and the `publish(subject, payload)` overload both pick it up.
4. (JetStream only) Ensure the new subject falls under the stream's
   `subjects: ["asset.>", "project.>", "render.>", "clip.>", "publish.>"]`
   filter, or extend the filter in `src/adapters/jetstream.ts`'s
   `ensureStream()`.

## Run

```bash
pnpm --filter @vidgen/events lint
pnpm --filter @vidgen/events type-check
pnpm --filter @vidgen/events test
```

The unit suite covers schema validation + in-memory roundtrip without
needing NATS. The JetStream roundtrip test is **skipped unless**
`NATS_URL` points at a running NATS server (e.g.
`NATS_URL=nats://localhost:4222 pnpm --filter @vidgen/events test`).
`scripts/events-smoke.sh` runs the same JetStream roundtrip against the
compose-managed NATS container.

## Example

```ts
import { createMemoryBus } from "@vidgen/events/adapters/memory";

const bus = createMemoryBus();
const unsubscribe = await bus.subscribe("asset.ingested", async (event) => {
  console.log("got", event.asset_id);
});
await bus.publish("asset.ingested", {
  workspace_id: "ws_123",
  asset_id: "a_456",
  source_uri: "s3://media-raw/ws_123/a_456/source.mp4",
  sha256: "deadbeef…",
  duration_ms: 30000,
  emitted_at: new Date().toISOString(),
});
await unsubscribe();
```

## Architecture references

- §6.1 Temporal as the spine — events are emitted at workflow boundaries.
- §9 — NATS JetStream as the event bus; Novu (T-023) fans out to webhooks.
- §11 — `workspace_id` mandatory on every queue task / event payload.
