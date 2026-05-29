/**
 * services/worker/ai-gpu — activity registry (T-021).
 *
 * AI-GPU pool capabilities: xtts, sam2, propainter, wav2lip, musetalk,
 * flux, llama-large. Activities ship empty at T-021; filled by:
 *   - T-130/T-131 dub (XTTS + MuseTalk)
 *   - T-150 etc.
 */

export async function ping(input: { workspace_id: string }): Promise<{
  ok: true;
  workspace_id: string;
  taskQueue: "ai-gpu";
  serverTime: string;
}> {
  if (!input?.workspace_id) {
    throw new Error("[worker/ai-gpu/ping] workspace_id is required");
  }
  return {
    ok: true,
    workspace_id: input.workspace_id,
    taskQueue: "ai-gpu",
    serverTime: new Date().toISOString(),
  };
}
