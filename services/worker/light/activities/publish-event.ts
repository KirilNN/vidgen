/**
 * services/worker/light/activities/publish-event — typed event-bus
 * publishes from workflows (T-031).
 *
 * Activities, not workflows, do I/O. The workflow calls
 * `publishAssetIngested` after the asset row + renditions exist, and
 * the bus fan-outs land in Notifier (webhooks) + any future
 * subscribers.
 *
 * Architecture refs:
 *   - §6.1 — workflows publish domain events at the boundaries.
 *   - §9   — schemas live in `@vidgen/events`.
 *   - §11  — `workspace_id` is on every payload (the bus rejects
 *            otherwise).
 */
import { EventType } from "@vidgen/events";
import { getEventBus } from "./event-bus.js";

export interface PublishAssetIngestedInput {
  workspace_id: string;
  asset_id: string;
  source_uri: string;
  sha256: string;
  duration_ms: number;
  deduped?: boolean;
}

export async function publishAssetIngested(input: PublishAssetIngestedInput): Promise<void> {
  if (!input?.workspace_id) {
    throw new Error("[worker/light/publishAssetIngested] workspace_id is required");
  }
  const bus = await getEventBus();
  await bus.publish(EventType.AssetIngested, {
    workspace_id: input.workspace_id,
    emitted_at: new Date().toISOString(),
    asset_id: input.asset_id,
    source_uri: input.source_uri,
    sha256: input.sha256,
    duration_ms: input.duration_ms,
    ...(typeof input.deduped === "boolean" ? { deduped: input.deduped } : {}),
  });
}
