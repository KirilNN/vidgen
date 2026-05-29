/**
 * services/worker/ai-cpu — activity registry (T-021).
 *
 * AI-CPU pool capabilities: whisper-cpu, piper, argos, rembg, lama-cpu.
 * Activities ship empty at T-021; filled by:
 *   - T-041 transcribeWhisperCpu
 *   - T-080 enhanceAudio (DeepFilterNet — CPU mode)
 *   - T-130 translateText (Argos / MADLAD-small)
 *   - others.
 */

export async function ping(input: { workspace_id: string }): Promise<{
  ok: true;
  workspace_id: string;
  taskQueue: "ai-cpu";
  serverTime: string;
}> {
  if (!input?.workspace_id) {
    throw new Error("[worker/ai-cpu/ping] workspace_id is required");
  }
  return {
    ok: true,
    workspace_id: input.workspace_id,
    taskQueue: "ai-cpu",
    serverTime: new Date().toISOString(),
  };
}
