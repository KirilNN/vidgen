/**
 * services/worker/light — workflow registry (T-021, populated T-031).
 *
 * Re-exports every workflow this pool runs. Picked up by Temporal's
 * sandboxed loader via `workflowsPath` in the entrypoint. **Do not
 * import this file directly from non-workflow code** — workflows MUST
 * run in their isolated context.
 *
 * Light-pool workflows are orchestration-only — cross-queue activities
 * (e.g. ffmpeg on the media queue) are accessed via
 * `proxyActivities({ taskQueue: 'media' })` inside the workflow.
 *
 *   - T-031 IngestAssetWorkflow
 *   - T-040 TranscribeAssetWorkflow (later)
 *   - T-062 RenderProjectWorkflow (later)
 */
export { IngestAssetWorkflow } from "./ingest-asset.js";
