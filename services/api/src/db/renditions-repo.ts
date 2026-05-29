/**
 * services/api/db/renditions-repo — renditions table CRUD (T-031/32).
 *
 * Renditions are derived bytes — mezzanine MP4, audio WAV, thumbs.
 * Each row points at an object in `media-derived/{ws}/{asset}/...`
 * and carries the encoder params (`params_json`) so two renditions
 * with identical inputs can be deduped on `(asset_id, kind, params)`.
 *
 * Architecture refs:
 *   - §5.1 — Postgres metadata only; bytes in MinIO/R2.
 *   - §11  — RLS keys off `app.workspace_id` set inside
 *            `withWorkspace`; we never bypass it.
 *   - E2   — derivatives are rebuildable, so an idempotent
 *            (workspace_id, asset_id, kind) replace is the right
 *            primitive: if T-031 re-runs the same step, the row
 *            updates in place instead of multiplying.
 */
import { and, eq } from "drizzle-orm";
import { withWorkspace } from "./client.js";
import { renditions } from "./schema.js";

export interface RenditionRow {
  renditionId: string;
  assetId: string;
  workspaceId: string;
  kind: string;
  uri: string;
  paramsJson: Record<string, unknown>;
  createdAt: Date;
}

export interface UpsertRenditionInput {
  assetId: string;
  workspaceId: string;
  /** "mezzanine" | "audio" | "thumb" | "hls" | future kinds. */
  kind: string;
  uri: string;
  paramsJson?: Record<string, unknown>;
}

/**
 * Insert OR replace by `(asset_id, kind)`. Multiple kinds (mezzanine,
 * audio, thumb) coexist on the same asset; re-running the workflow
 * overwrites a stale row in place rather than piling up duplicates.
 *
 * We don't have a UNIQUE constraint on (asset_id, kind) in the
 * current schema (T-011 didn't add one), so we model upsert as
 * "delete-then-insert in the same transaction". RLS still applies
 * (`withWorkspace` sets the GUC), so a misbehaving call only sees
 * rows it owns.
 */
export async function upsertRendition(input: UpsertRenditionInput): Promise<RenditionRow> {
  return withWorkspace(input.workspaceId, async (tx) => {
    await tx
      .delete(renditions)
      .where(
        and(
          eq(renditions.assetId, input.assetId),
          eq(renditions.workspaceId, input.workspaceId),
          eq(renditions.kind, input.kind),
        ),
      );
    const rows = await tx
      .insert(renditions)
      .values({
        assetId: input.assetId,
        workspaceId: input.workspaceId,
        kind: input.kind,
        uri: input.uri,
        paramsJson: input.paramsJson ?? {},
      })
      .returning();
    if (!rows[0]) throw new Error("upsertRendition: insert returned no rows");
    return mapRow(rows[0]);
  });
}

export async function listRenditionsForAsset(
  workspaceId: string,
  assetId: string,
): Promise<RenditionRow[]> {
  return withWorkspace(workspaceId, async (tx) => {
    const rows = await tx
      .select()
      .from(renditions)
      .where(and(eq(renditions.assetId, assetId), eq(renditions.workspaceId, workspaceId)));
    return rows.map(mapRow);
  });
}

function mapRow(r: typeof renditions.$inferSelect): RenditionRow {
  return {
    renditionId: r.renditionId,
    assetId: r.assetId,
    workspaceId: r.workspaceId,
    kind: r.kind,
    uri: r.uri,
    paramsJson: (r.paramsJson as Record<string, unknown>) ?? {},
    createdAt: r.createdAt,
  };
}
