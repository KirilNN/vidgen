/**
 * services/worker/light — activity registry (T-021, extended T-031).
 *
 * Re-exports every activity this pool implements. The pool's
 * entrypoint imports `* as activities` from this barrel and hands the
 * resulting record straight to `createWorker`, so adding an activity
 * is a one-line export here plus the file itself.
 *
 * T-031 wires the four orchestration activities the
 * `IngestAssetWorkflow` calls:
 *
 *   - `finalizeUpload`         — copy chunk → media-raw, hash, upsert.
 *   - `createRendition`        — POST /internal/renditions.
 *   - `enqueueTranscription`   — placeholder until T-040.
 *   - `publishAssetIngested`   — emit `asset.ingested` on the bus.
 *
 * The cross-queue ffmpeg activities (`probeMedia`,
 * `transcodeMezzanine`, `extractAudio`) live in the media pool — the
 * workflow accesses them through `proxyActivities({ taskQueue:
 * 'media' })`, not via this registry.
 *
 * Architecture refs:
 *   - §6.2 — light pool capabilities: orchestration, REST, OAuth refresh.
 */

export { finalizeUpload } from "./finalize-upload.js";
export { createRendition } from "./create-rendition.js";
export { enqueueTranscription } from "./enqueue-transcription.js";
export { publishAssetIngested } from "./publish-event.js";

/**
 * Heartbeat activity that returns a structured pong. Exists so the
 * worker registers SOMETHING with Temporal — empty activity registries
 * are valid but make it harder to verify the worker is alive end-to-
 * end. Future tickets can keep or remove this once real activities
 * land; it has no business side effect.
 */
export async function ping(input: { workspace_id: string }): Promise<{
  ok: true;
  workspace_id: string;
  taskQueue: "light";
  serverTime: string;
}> {
  // Multi-tenant rule (arch §11): every task carries workspace_id.
  if (!input?.workspace_id) {
    throw new Error("[worker/light/ping] workspace_id is required");
  }
  return {
    ok: true,
    workspace_id: input.workspace_id,
    taskQueue: "light",
    serverTime: new Date().toISOString(),
  };
}
