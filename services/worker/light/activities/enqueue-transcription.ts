/**
 * services/worker/light/activities/enqueue-transcription — placeholder
 * for T-040 (T-031).
 *
 * The ingest workflow needs to *hand off* to a transcription
 * workflow once audio is ready. T-040 ships the actual transcription
 * pipeline (Whisper.cpp on ai-cpu). Until then this activity:
 *
 *   - Logs that transcription would be enqueued.
 *   - Returns success so the ingest workflow can complete.
 *
 * Replacing this with a real child workflow start in T-040 should be
 * a one-file change.
 *
 * Architecture refs:
 *   - §3.2 — Whisper consumes the 16 kHz mono WAV we just produced.
 *   - §6.1 — orchestration is the light pool's job.
 */
export interface EnqueueTranscriptionInput {
  workspace_id: string;
  asset_id: string;
  audio_uri: string;
}

export interface EnqueueTranscriptionResult {
  workspace_id: string;
  asset_id: string;
  /** Whether this call actually scheduled a child workflow (T-040). */
  enqueued: boolean;
}

export async function enqueueTranscription(
  input: EnqueueTranscriptionInput,
): Promise<EnqueueTranscriptionResult> {
  if (!input?.workspace_id) {
    throw new Error("[worker/light/enqueueTranscription] workspace_id is required");
  }
  if (!input.asset_id || !input.audio_uri) {
    throw new Error("[worker/light/enqueueTranscription] asset_id and audio_uri are required");
  }
  // T-040 will replace this body with a `proxyActivities({ taskQueue:
  // 'ai-cpu' })` call into the Whisper pipeline; until then this is a
  // structured no-op so the ingest workflow has a stable contract.
  return {
    workspace_id: input.workspace_id,
    asset_id: input.asset_id,
    enqueued: false,
  };
}
