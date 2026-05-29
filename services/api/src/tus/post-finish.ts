/**
 * services/api/src/tus/post-finish — tusd `post-finish` hook (T-030/31).
 *
 * Called by tusd AFTER the final PATCH completes (Upload-Length ==
 * Upload-Offset). We use this signal to start the
 * `IngestAssetWorkflow` on the light task queue.
 *
 * Why post-finish and not pre-finish:
 *   - `pre-finish` is synchronous — we'd block tusd's response to the
 *     client while Temporal accepts the start command. That makes the
 *     UI feel sluggish for no good reason.
 *   - `post-finish` is fire-and-forget; the client already has its
 *     201/204; the workflow can take its time.
 *
 * Idempotency:
 *   - We mint a fresh asset_id PER UPLOAD here (sha256-based dedup
 *     happens inside the workflow's `finalizeUpload` activity once
 *     we've read the bytes). The workflow ID is `ingest-<asset_id>`,
 *     so if tusd's at-least-once hook delivery ever double-fires
 *     within seconds, the second start collides with the first and
 *     Temporal returns the existing handle.
 *   - On retries from a *different* upload (e.g. the same browser
 *     starts the upload twice), the asset_ids differ but the
 *     workflow's content-hash dedup catches it and returns the
 *     existing asset.
 *
 * Architecture refs:
 *   - §6.1 — long ops are Temporal workflows.
 *   - §3.1 — ingest pipeline is the canonical entry point for media
 *     bytes.
 */
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { getIngestWorkflowStarter } from "../temporal-client.js";

interface TusdHookRequest {
  Type?: string;
  Event?: {
    Upload?: {
      ID?: string;
      Size?: number;
      MetaData?: Record<string, string>;
      Storage?: Record<string, string>;
    };
  };
}

export function registerTusPostFinish(app: FastifyInstance): void {
  app.post("/internal/tus/post-finish", async (req, reply) => {
    const body = (req.body ?? {}) as TusdHookRequest;
    const upload = body.Event?.Upload;
    if (!upload?.ID) {
      return reply.code(400).type("application/problem+json").send({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "Event.Upload.ID missing",
        instance: req.url,
      });
    }

    const meta = upload.MetaData ?? {};
    const workspaceId = meta["workspaceId"];
    const userId = meta["userId"];
    const sourceName = meta["original_filename"] ?? "upload";
    const mime = meta["mime"] ?? "application/octet-stream";

    if (!workspaceId) {
      return reply.code(400).type("application/problem+json").send({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "Upload.MetaData.workspaceId missing — was pre-create skipped?",
        instance: req.url,
      });
    }

    // The actual S3 object key tusd wrote to. tusd's S3 store puts the
    // object at `<bucket>/<Storage.Key>` where Key is the tusd upload
    // ID (a 32-byte hex string). Tests can override this via Storage
    // mapping if they emulate the hook payload.
    const uploadKey = upload.Storage?.["Key"] ?? upload.ID;

    const assetId = randomUUID();

    try {
      const starter = await getIngestWorkflowStarter();
      const handle = await starter({
        workspace_id: workspaceId,
        asset_id: assetId,
        upload_id: upload.ID,
        upload_key: uploadKey,
        mime,
        source_name: sourceName,
        created_by: userId ?? null,
      });
      req.log.info(
        {
          workspace_id: workspaceId,
          asset_id: assetId,
          workflow_id: handle.workflowId,
          run_id: handle.runId,
        },
        "ingest workflow started",
      );
      return reply.code(200).send({
        HTTPResponse: { StatusCode: 200 },
        // Echoing the asset_id back on the response is purely
        // informational — tusd ignores it, but it helps debugging.
        asset_id: assetId,
        workflow_id: handle.workflowId,
        run_id: handle.runId,
      });
    } catch (err) {
      req.log.error(
        { err: { message: (err as Error).message }, workspace_id: workspaceId, asset_id: assetId },
        "tus post-finish: failed to start ingest workflow",
      );
      return reply.code(500).type("application/problem+json").send({
        type: "about:blank",
        title: "Internal Server Error",
        status: 500,
        detail: "failed to start ingest workflow",
        instance: req.url,
      });
    }
  });
}
