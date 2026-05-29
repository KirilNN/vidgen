/**
 * services/worker/media — activity registry (T-021, populated T-032).
 *
 * Media pool capabilities: ffmpeg, mlt, remotion. Re-exports every
 * activity this pool implements; the entrypoint hands the resulting
 * record to `createWorker`, so adding an activity is a one-line
 * `export *` plus the file itself.
 *
 * T-032 wires the three FFmpeg activities mandated by the ticket:
 * `probeMedia`, `transcodeMezzanine`, `extractAudio`. Later tickets
 * (T-062 MLT, T-090 Remotion) add their own files alongside.
 */

export { probeMedia, transcodeMezzanine, extractAudio } from "./ffmpeg.js";

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
