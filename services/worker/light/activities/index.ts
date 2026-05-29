/**
 * services/worker/light — activity registry (T-021).
 *
 * Re-exports every activity this pool implements. The pool's
 * entrypoint imports `* as activities` from this barrel and hands the
 * resulting record straight to `createWorker`, so adding an activity
 * is a one-line export here plus the file itself.
 *
 * Activities ship empty at T-021 — light's actual activities arrive
 * with the workflows that need them (T-031 finalizeUpload, T-040
 * enqueueTranscription, etc.).
 *
 * Architecture refs:
 * - §6.2 — light pool capabilities: orchestration, REST, OAuth refresh.
 */

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
