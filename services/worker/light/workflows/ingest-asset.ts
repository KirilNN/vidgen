/**
 * services/worker/light/workflows/ingest-asset — IngestAssetWorkflow
 * (T-031).
 *
 * Steps (idempotent on `asset_id`):
 *
 *   1. `finalizeUpload`  — copies the tus chunk into media-raw,
 *                          computes sha256, writes the `assets` row.
 *                          Returns `deduped` if an existing asset
 *                          matched.
 *   2. **Short-circuit on dedup**: when `deduped === true`, jump
 *      straight to step 6 (publishAssetIngested) so consumers still
 *      get an event for the existing asset. We do NOT re-transcode
 *      bytes we already have.
 *   3. `probeMedia`       — (media queue) returns duration; we then
 *                          parallel-fan-out:
 *   4a. `transcodeMezzanine` (media queue) → renditions row
 *       `kind='mezzanine'`.
 *   4b. `extractAudio`      (media queue) → renditions row
 *       `kind='audio'`.
 *   5. `enqueueTranscription` — schedules T-040 work (currently a
 *                              structured no-op).
 *   6. `publishAssetIngested` — emits `asset.ingested` on the bus.
 *
 * Workflow IDs are `ingest-{asset_id}` (set by the caller — see
 * `services/api/src/temporal-client.ts`), so retries collapse onto a
 * single run; this workflow itself is deterministic given the same
 * input.
 *
 * Architecture refs:
 *   - §3.1 — ingest pipeline (upload → mezz + audio → publish).
 *   - §6.1 — long ops as Temporal workflows.
 *   - §6.2 — cross-queue activities via proxyActivities({taskQueue}).
 *   - §11  — `workspace_id` on every activity input + every event.
 */
import { proxyActivities } from "@temporalio/workflow";

// Importing the activity *types* (not the implementations) is the
// canonical way to give `proxyActivities` its generic argument. The
// .js extensions match Node ESM resolution; Temporal's workflow
// sandbox strips the modules at bundle time and only the type
// signatures survive.
import type * as lightActivities from "../activities/index.js";
import type * as mediaActivities from "../../media/activities/index.js";

const light = proxyActivities<typeof lightActivities>({
  startToCloseTimeout: "5 minutes",
  retry: { maximumAttempts: 5 },
});

const media = proxyActivities<typeof mediaActivities>({
  taskQueue: "media",
  // Mezzanine encodes can take a while for long inputs; cap aggressive
  // so a broken encoder doesn't hold the queue forever, but
  // long enough for ~2 hour podcasts in CRF 23 / veryfast.
  startToCloseTimeout: "30 minutes",
  // Heartbeat timeout left at default; the underlying ffmpeg activity
  // doesn't currently heartbeat (a future iteration can add one).
  retry: { maximumAttempts: 3 },
});

export interface IngestAssetWorkflowInput {
  workspace_id: string;
  asset_id: string;
  upload_id: string;
  upload_key: string;
  mime: string;
  source_name: string;
  created_by?: string | null;
}

export interface IngestAssetWorkflowResult {
  workspace_id: string;
  asset_id: string;
  source_uri: string;
  sha256: string;
  duration_ms: number;
  /** True when the asset already existed (sha256 match in the workspace). */
  deduped: boolean;
  rendition_ids: { mezzanine?: string; audio?: string };
}

/**
 * Workflow entrypoint. The name MUST match the string passed to
 * `client.workflow.start("IngestAssetWorkflow", …)` in the API.
 */
export async function IngestAssetWorkflow(
  input: IngestAssetWorkflowInput,
): Promise<IngestAssetWorkflowResult> {
  // Step 1: copy chunk → raw, compute sha256, upsert the asset row.
  const finalized = await light.finalizeUpload({
    workspace_id: input.workspace_id,
    asset_id: input.asset_id,
    upload_id: input.upload_id,
    upload_key: input.upload_key,
    mime: input.mime,
    source_name: input.source_name,
    ...(input.created_by ? { created_by: input.created_by } : {}),
  });

  // Dedup short-circuit: bytes already exist, no need to re-transcode.
  if (finalized.deduped) {
    await light.publishAssetIngested({
      workspace_id: finalized.workspace_id,
      asset_id: finalized.asset_id,
      source_uri: finalized.source_uri,
      sha256: finalized.sha256,
      duration_ms: 0, // duration unknown without a re-probe; T-033 may persist & re-emit.
      deduped: true,
    });
    return {
      workspace_id: finalized.workspace_id,
      asset_id: finalized.asset_id,
      source_uri: finalized.source_uri,
      sha256: finalized.sha256,
      duration_ms: 0,
      deduped: true,
      rendition_ids: {},
    };
  }

  // Step 2: probe so we have a canonical duration on the asset.
  const probe = await media.probeMedia({
    workspace_id: input.workspace_id,
    input_uri: finalized.source_uri,
  });

  // Steps 3a + 3b: transcode mezzanine + extract audio in parallel.
  // Both activities compute their own deterministic output URI
  // (`s3://media-derived/{ws}/{asset}/{mezz.mp4|audio.wav}`) so
  // retries simply overwrite the previous attempt.
  const [mezz, audio] = await Promise.all([
    media.transcodeMezzanine({
      workspace_id: input.workspace_id,
      asset_id: input.asset_id,
      input_uri: finalized.source_uri,
    }),
    media.extractAudio({
      workspace_id: input.workspace_id,
      asset_id: input.asset_id,
      input_uri: finalized.source_uri,
    }),
  ]);

  // Step 4: create rendition rows.
  const [mezzRow, audioRow] = await Promise.all([
    light.createRendition({
      workspace_id: input.workspace_id,
      asset_id: input.asset_id,
      kind: "mezzanine",
      uri: mezz.output_uri,
      params_json: {
        width: mezz.width,
        height: mezz.height,
        size_bytes: mezz.size_bytes,
        duration_ms: mezz.duration_ms,
        ...mezz.params,
      },
    }),
    light.createRendition({
      workspace_id: input.workspace_id,
      asset_id: input.asset_id,
      kind: "audio",
      uri: audio.output_uri,
      params_json: {
        sample_rate: audio.sample_rate,
        channels: audio.channels,
        size_bytes: audio.size_bytes,
        duration_ms: audio.duration_ms,
        ...audio.params,
      },
    }),
  ]);

  // Step 5: hand off to transcription (no-op until T-040).
  await light.enqueueTranscription({
    workspace_id: input.workspace_id,
    asset_id: input.asset_id,
    audio_uri: audio.output_uri,
  });

  // Step 6: publish the domain event.
  await light.publishAssetIngested({
    workspace_id: input.workspace_id,
    asset_id: input.asset_id,
    source_uri: finalized.source_uri,
    sha256: finalized.sha256,
    duration_ms: probe.duration_ms,
    deduped: false,
  });

  return {
    workspace_id: input.workspace_id,
    asset_id: input.asset_id,
    source_uri: finalized.source_uri,
    sha256: finalized.sha256,
    duration_ms: probe.duration_ms,
    deduped: false,
    rendition_ids: {
      mezzanine: mezzRow.rendition_id,
      audio: audioRow.rendition_id,
    },
  };
}
