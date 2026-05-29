/**
 * services/worker/media — activity registry (T-021).
 *
 * Media pool capabilities: ffmpeg, mlt, remotion. Activities ship
 * empty at T-021 and are filled in by:
 *   - T-032 transcodeMezzanine / extractAudio / probeMedia (FFmpeg)
 *   - T-062 renderTimeline (MLT)
 *   - T-090 renderRemotion (Remotion)
 */

export async function ping(input: { workspace_id: string }): Promise<{
  ok: true;
  workspace_id: string;
  taskQueue: "media";
  serverTime: string;
}> {
  if (!input?.workspace_id) {
    throw new Error("[worker/media/ping] workspace_id is required");
  }
  return {
    ok: true,
    workspace_id: input.workspace_id,
    taskQueue: "media",
    serverTime: new Date().toISOString(),
  };
}
