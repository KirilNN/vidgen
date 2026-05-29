/**
 * services/worker/light — workflow registry (T-021).
 *
 * Re-exports every workflow this pool runs. Picked up by Temporal's
 * sandboxed loader via `workflowsPath` in the entrypoint. **Do not
 * import this file directly from non-workflow code** — workflows MUST
 * run in their isolated context.
 *
 * Empty at T-021; future tickets populate it:
 *   - T-031 IngestAssetWorkflow
 *   - T-040 TranscribeAssetWorkflow (orchestration only; activities
 *           live in ai-cpu)
 *   - T-062 RenderProjectWorkflow (orchestration only; media work
 *           lives in media)
 */
export {};
