/**
 * services/api/db/assets-repo — assets table CRUD (T-031).
 *
 * Every write goes through `withWorkspace` so the RLS policy
 * installed by `migrations/0001_rls_policies.sql` enforces the
 * multi-tenant boundary at the database layer. A handler that
 * forgets to set the workspace context will simply see / write zero
 * rows; we do not bypass RLS here.
 *
 * Architecture refs:
 *   - §5.1 — Postgres holds metadata only (source bytes live in
 *            MinIO/R2; `source_uri` points at them).
 *   - §11  — RLS via `current_workspace_id()` keys off the GUC set
 *            inside `withWorkspace`.
 *   - E6   — content-addressed dedup via `UNIQUE (workspace_id,
 *            sha256)`. The `upsertAsset` helper returns the existing
 *            row when the sha256 already exists for the workspace,
 *            laying the foundation T-033 will lean on.
 */
import { and, eq, sql } from "drizzle-orm";
import { withWorkspace } from "./client.js";
import { assets } from "./schema.js";

export interface AssetRow {
  assetId: string;
  workspaceId: string;
  sourceUri: string;
  sha256: string;
  durationMs: number | null;
  mime: string;
  createdBy: string | null;
  capturedVia: string | null;
  tierAtUpload: string | null;
  createdAt: Date;
}

export interface CreateAssetInput {
  /** Optional — let the DB generate one unless the caller already has an id. */
  assetId?: string;
  workspaceId: string;
  sourceUri: string;
  sha256: string;
  durationMs?: number | null;
  mime: string;
  createdBy?: string | null;
  capturedVia?: string | null;
  tierAtUpload?: string | null;
}

/**
 * Insert an asset OR return the existing row when the same sha256
 * already exists in this workspace. The unique index installed by
 * T-011 makes the ON CONFLICT predicate cheap and race-free.
 *
 * Returns `{ row, deduped }` so the workflow can short-circuit
 * transcoding when `deduped === true` (T-033 lands the smarter
 * caller; T-031 is the first user and treats `deduped` as a hint).
 */
export async function upsertAsset(
  input: CreateAssetInput,
): Promise<{ row: AssetRow; deduped: boolean }> {
  return withWorkspace(input.workspaceId, async (tx) => {
    const valuesInsert = {
      workspaceId: input.workspaceId,
      sourceUri: input.sourceUri,
      sha256: input.sha256,
      durationMs: input.durationMs ?? null,
      mime: input.mime,
      createdBy: input.createdBy ?? null,
      capturedVia: input.capturedVia ?? null,
      tierAtUpload: input.tierAtUpload ?? null,
      ...(input.assetId ? { assetId: input.assetId } : {}),
    } as const;

    // Use the unique (workspace_id, sha256) index to short-circuit.
    // ON CONFLICT DO NOTHING returns 0 rows on conflict; we then SELECT
    // the existing row in the same transaction. This costs one
    // round-trip in the common (insert) path and two in the dedup
    // path — acceptable for a non-hot endpoint.
    const inserted = await tx
      .insert(assets)
      .values(valuesInsert)
      .onConflictDoNothing({ target: [assets.workspaceId, assets.sha256] })
      .returning();
    if (inserted[0]) {
      return { row: mapRow(inserted[0]), deduped: false };
    }
    const existing = await tx
      .select()
      .from(assets)
      .where(and(eq(assets.workspaceId, input.workspaceId), eq(assets.sha256, input.sha256)))
      .limit(1);
    const row = existing[0];
    if (!row) {
      throw new Error(
        `upsertAsset: insert returned no row but no existing row found for ws=${input.workspaceId} sha=${input.sha256}`,
      );
    }
    return { row: mapRow(row), deduped: true };
  });
}

export async function findAssetById(
  workspaceId: string,
  assetId: string,
): Promise<AssetRow | null> {
  return withWorkspace(workspaceId, async (tx) => {
    const rows = await tx
      .select()
      .from(assets)
      .where(and(eq(assets.assetId, assetId), eq(assets.workspaceId, workspaceId)))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

/**
 * Update mutable fields (currently `duration_ms`) after a probe lands
 * the canonical duration. We deliberately do NOT allow overwriting
 * sha256 / source_uri — those are content-addressed invariants set at
 * upload time.
 */
export async function updateAssetDuration(
  workspaceId: string,
  assetId: string,
  durationMs: number,
): Promise<void> {
  await withWorkspace(workspaceId, async (tx) => {
    await tx
      .update(assets)
      .set({ durationMs })
      .where(and(eq(assets.assetId, assetId), eq(assets.workspaceId, workspaceId)));
  });
  // Silence drizzle's "unused sql import" warning when nothing else
  // in the file references it.
  void sql;
}

function mapRow(r: typeof assets.$inferSelect): AssetRow {
  return {
    assetId: r.assetId,
    workspaceId: r.workspaceId,
    sourceUri: r.sourceUri,
    sha256: r.sha256,
    durationMs: r.durationMs ?? null,
    mime: r.mime,
    createdBy: r.createdBy ?? null,
    capturedVia: r.capturedVia ?? null,
    tierAtUpload: r.tierAtUpload ?? null,
    createdAt: r.createdAt,
  };
}
