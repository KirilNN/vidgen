/**
 * services/api/src/temporal-client — lazy Temporal client wrapper (T-031).
 *
 * The API service needs to *start* `IngestAssetWorkflow` (from the tus
 * `post-finish` hook). It does NOT execute workflows or activities —
 * those live in `services/worker`. So all we need here is a thin
 * wrapper around `@temporalio/client`'s `Client.workflow.start()` with
 * the right defaults for our setup:
 *
 *   - workflowId: `ingest-<asset_id>` — the workflow itself is
 *     idempotent on `asset_id`, so colliding workflow IDs (rare but
 *     possible if a client retries the same upload) are a *feature*:
 *     Temporal's WorkflowIdReusePolicy.AllowDuplicateFailedOnly means
 *     a second start with the same id will return the existing run if
 *     it's still running or it succeeded.
 *   - taskQueue: `INGEST_TASK_QUEUE` (default `light`). The light pool
 *     hosts orchestration; the workflow itself proxies into the media
 *     pool for ffmpeg work.
 *
 * Lazy on first use:
 *   - The constructor reaches across the network to Temporal; doing it
 *     eagerly in `buildServer()` would break tests that don't run a
 *     Temporal cluster. Tests use `__setTemporalClientStarterForTests`
 *     to inject a no-op starter.
 *   - In production the connection is reused for the lifetime of the
 *     process; we close it on Fastify shutdown via `closeTemporal()`.
 *
 * Architecture refs:
 *   - §6.1 — long ops are Temporal workflows.
 *   - §6.2 — task queues mirror worker pools (light, media, ai-cpu,
 *           ai-gpu); cross-queue calls are proxyActivities, not
 *           workflow-to-workflow.
 */
import type { Client as TemporalClient } from "@temporalio/client";
import { apiConfig } from "./config.js";

export interface IngestAssetWorkflowInput {
  workspace_id: string;
  asset_id: string;
  upload_id: string;
  upload_key: string;
  mime: string;
  source_name: string;
  created_by?: string | null;
}

export interface IngestAssetWorkflowHandle {
  workflowId: string;
  runId: string;
}

export type IngestWorkflowStarter = (
  input: IngestAssetWorkflowInput,
) => Promise<IngestAssetWorkflowHandle>;

let cachedClient: TemporalClient | undefined;
let cachedStarter: IngestWorkflowStarter | undefined;

/**
 * Build the production Temporal client. Imports `@temporalio/client`
 * lazily so test environments don't trip on its native bindings.
 */
async function buildTemporalClient(address: string): Promise<TemporalClient> {
  const { Client, Connection } = await import("@temporalio/client");
  const connection = await Connection.connect({ address });
  return new Client({
    connection,
    namespace: apiConfig.TEMPORAL_NAMESPACE,
  });
}

/**
 * Resolve the workflow starter. Caches the underlying client; safe to
 * call from every request — the lazy init happens once.
 */
export async function getIngestWorkflowStarter(): Promise<IngestWorkflowStarter> {
  if (cachedStarter) return cachedStarter;
  if (!apiConfig.TEMPORAL_ADDRESS) {
    throw new Error(
      "getIngestWorkflowStarter: TEMPORAL_ADDRESS is not configured — cannot start IngestAssetWorkflow",
    );
  }
  const client = await buildTemporalClient(apiConfig.TEMPORAL_ADDRESS);
  cachedClient = client;
  const starter: IngestWorkflowStarter = async (input) => {
    const handle = await client.workflow.start("IngestAssetWorkflow", {
      taskQueue: apiConfig.INGEST_TASK_QUEUE,
      // `ingest-<asset_id>` makes retries collapse onto a single
      // workflow run — exactly what T-031 calls for. Temporal will
      // reject a second start with the same id while one is running,
      // and we treat that 409 as "already in flight, all good".
      workflowId: `ingest-${input.asset_id}`,
      args: [input],
    });
    return { workflowId: handle.workflowId, runId: handle.firstExecutionRunId };
  };
  cachedStarter = starter;
  return starter;
}

/** Close the Temporal connection on Fastify shutdown. Idempotent. */
export async function closeTemporal(): Promise<void> {
  const client = cachedClient;
  cachedClient = undefined;
  cachedStarter = undefined;
  if (client) {
    await client.connection.close();
  }
}

/**
 * Test-only injection point. Vitest replaces the starter with a stub
 * that records the input; the route then assert against the recorder.
 * @internal
 */
export function __setIngestWorkflowStarterForTests(starter: IngestWorkflowStarter): void {
  cachedStarter = starter;
}
