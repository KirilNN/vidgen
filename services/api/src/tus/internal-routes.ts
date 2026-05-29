/**
 * services/api/src/tus/internal-routes — `/internal/assets` +
 * `/internal/renditions` write endpoints (T-031).
 *
 * The worker can't reach the DB directly: it lives in its own
 * container, doesn't have the postgres adapter wired, and we want
 * data ownership to stay in the API service (one writer, one place to
 * audit). So we expose two narrow internal endpoints that the
 * worker's light-pool activities (`finalize-upload`,
 * `create-rendition`) call over HTTP.
 *
 * Both endpoints are guarded by `requireInternalToken` — the same
 * HMAC shared secret tusd uses. They are NOT in the public OpenAPI
 * spec (different auth, different SLA, no SDK exposure).
 *
 * Why these are the *only* worker→API writes:
 *   - Asset create + rendition create are the two metadata writes
 *     `IngestAssetWorkflow` performs. Everything else
 *     (publish-event, enqueue-transcription) goes via NATS / Temporal,
 *     not the DB.
 *
 * Architecture refs:
 *   - §5.1 — Postgres metadata only; the API owns those writes.
 *   - §6.1, §6.2 — workers do bytes, API does metadata.
 *   - §11    — `withWorkspace` in the repo enforces RLS so a bad
 *              caller can't cross workspaces even with the token.
 */
import type { FastifyInstance } from "fastify";
import { upsertAsset, type AssetRow } from "../db/assets-repo.js";
import { upsertRendition, type RenditionRow } from "../db/renditions-repo.js";
import { requireInternalToken } from "./auth.js";

const WORKSPACE_ID_RE = /^[A-Za-z0-9_\-.]+$/;
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;

interface CreateAssetBody {
  workspace_id?: string;
  asset_id?: string;
  source_uri?: string;
  sha256?: string;
  mime?: string;
  duration_ms?: number | null;
  created_by?: string | null;
  captured_via?: string | null;
  tier_at_upload?: string | null;
}

interface CreateRenditionBody {
  workspace_id?: string;
  asset_id?: string;
  kind?: string;
  uri?: string;
  params_json?: Record<string, unknown>;
}

function assetToWire(row: AssetRow): Record<string, unknown> {
  return {
    asset_id: row.assetId,
    workspace_id: row.workspaceId,
    source_uri: row.sourceUri,
    sha256: row.sha256,
    duration_ms: row.durationMs,
    mime: row.mime,
    created_by: row.createdBy,
    captured_via: row.capturedVia,
    tier_at_upload: row.tierAtUpload,
    created_at: row.createdAt.toISOString(),
  };
}

function renditionToWire(row: RenditionRow): Record<string, unknown> {
  return {
    rendition_id: row.renditionId,
    asset_id: row.assetId,
    workspace_id: row.workspaceId,
    kind: row.kind,
    uri: row.uri,
    params_json: row.paramsJson,
    created_at: row.createdAt.toISOString(),
  };
}

export function registerInternalAssetRoutes(app: FastifyInstance): void {
  // ---- POST /internal/assets ------------------------------------------------
  app.post("/internal/assets", { preHandler: [requireInternalToken] }, async (req, reply) => {
    const body = (req.body ?? {}) as CreateAssetBody;
    const workspace_id = body.workspace_id;
    if (!workspace_id || !WORKSPACE_ID_RE.test(workspace_id)) {
      return reply.code(400).type("application/problem+json").send({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "workspace_id missing or malformed",
        instance: req.url,
      });
    }
    if (!body.source_uri || typeof body.source_uri !== "string") {
      return reply.code(400).type("application/problem+json").send({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "source_uri missing",
        instance: req.url,
      });
    }
    if (!body.sha256 || !SHA256_RE.test(body.sha256)) {
      return reply.code(400).type("application/problem+json").send({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "sha256 missing or not 64 lowercase hex chars",
        instance: req.url,
      });
    }
    if (!body.mime || typeof body.mime !== "string") {
      return reply.code(400).type("application/problem+json").send({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "mime missing",
        instance: req.url,
      });
    }
    if (body.asset_id && !UUID_RE.test(body.asset_id)) {
      return reply.code(400).type("application/problem+json").send({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "asset_id is not a UUID",
        instance: req.url,
      });
    }
    if (body.created_by && !UUID_RE.test(body.created_by)) {
      return reply.code(400).type("application/problem+json").send({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "created_by is not a UUID",
        instance: req.url,
      });
    }

    try {
      const { row, deduped } = await upsertAsset({
        workspaceId: workspace_id,
        sourceUri: body.source_uri,
        sha256: body.sha256,
        mime: body.mime,
        durationMs: body.duration_ms ?? null,
        createdBy: body.created_by ?? null,
        capturedVia: body.captured_via ?? null,
        tierAtUpload: body.tier_at_upload ?? null,
        ...(body.asset_id ? { assetId: body.asset_id } : {}),
      });
      return reply.code(deduped ? 200 : 201).send({
        ...assetToWire(row),
        deduped,
      });
    } catch (err) {
      req.log.error(
        { err: { message: (err as Error).message }, workspace_id, sha256: body.sha256 },
        "internal asset upsert failed",
      );
      return reply.code(500).type("application/problem+json").send({
        type: "about:blank",
        title: "Internal Server Error",
        status: 500,
        detail: "asset upsert failed",
        instance: req.url,
      });
    }
  });

  // ---- POST /internal/renditions --------------------------------------------
  app.post("/internal/renditions", { preHandler: [requireInternalToken] }, async (req, reply) => {
    const body = (req.body ?? {}) as CreateRenditionBody;
    const workspace_id = body.workspace_id;
    if (!workspace_id || !WORKSPACE_ID_RE.test(workspace_id)) {
      return reply.code(400).type("application/problem+json").send({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "workspace_id missing or malformed",
        instance: req.url,
      });
    }
    if (!body.asset_id || !UUID_RE.test(body.asset_id)) {
      return reply.code(400).type("application/problem+json").send({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "asset_id missing or not a UUID",
        instance: req.url,
      });
    }
    if (!body.kind || typeof body.kind !== "string") {
      return reply.code(400).type("application/problem+json").send({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "kind missing",
        instance: req.url,
      });
    }
    if (!body.uri || typeof body.uri !== "string") {
      return reply.code(400).type("application/problem+json").send({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "uri missing",
        instance: req.url,
      });
    }

    try {
      const row = await upsertRendition({
        assetId: body.asset_id,
        workspaceId: workspace_id,
        kind: body.kind,
        uri: body.uri,
        paramsJson: body.params_json ?? {},
      });
      return reply.code(201).send(renditionToWire(row));
    } catch (err) {
      req.log.error(
        { err: { message: (err as Error).message }, workspace_id, asset_id: body.asset_id },
        "internal rendition upsert failed",
      );
      return reply.code(500).type("application/problem+json").send({
        type: "about:blank",
        title: "Internal Server Error",
        status: 500,
        detail: "rendition upsert failed",
        instance: req.url,
      });
    }
  });
}
