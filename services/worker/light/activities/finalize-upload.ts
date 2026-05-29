/**
 * services/worker/light/activities/finalize-upload — first step of
 * IngestAssetWorkflow (T-031).
 *
 * Reads the bytes tusd wrote into `media-chunks/{upload_key}`, computes
 * the SHA-256 incrementally (we DON'T hold the file in RAM — a 10 GB
 * upload would OOM the light worker), copies the object to the
 * content-addressed `media-raw/{workspace}/{asset_id}/source.{ext}`
 * slot, deletes the chunk, and POSTs the asset row to the API.
 *
 * Three properties matter:
 *
 *   1. **Idempotent on retries.** The destination key is deterministic
 *      (`media-raw/{ws}/{asset_id}/source.{ext}`), so a re-attempt
 *      overwrites the previous attempt. The API call uses the unique
 *      `(workspace_id, sha256)` index to short-circuit duplicates and
 *      returns `{deduped: true}` so the workflow can skip transcoding.
 *
 *   2. **Streaming hash + copy.** We hash by reading the chunk once
 *      from S3, then copy server-side (no re-download). This keeps the
 *      activity O(stream-read) regardless of file size. The S3
 *      `CopyObject` is single-request up to 5 GB; multipart copy lands
 *      in a later ticket if we need to support bigger files (the
 *      free-tier MinIO default ulimit is fine for sub-5GB).
 *
 *   3. **No deletion until the API write succeeds.** If the metadata
 *      write fails, the chunk stays around so a retry can re-read it.
 *      Once the API row exists, the chunk is garbage; we delete it to
 *      reclaim quota in `media-chunks`.
 *
 * Architecture refs:
 *   - §3.1 — uploads → media-raw, content-addressed by sha256.
 *   - §5.1 — Postgres metadata only.
 *   - §11  — workspace_id on every key + every API call.
 *   - E6   — content-addressed dedup.
 */
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Writable } from "node:stream";
import {
  buildS3Uri,
  createStorageClientFromEnv,
  defaultBucketLayout,
  extensionForMime,
  workspaceKey,
  type StorageClient,
} from "../../shared/storage.js";
import { getInternalApiClient, type InternalApiClient } from "./api-client.js";

let storage: StorageClient | undefined;
let apiClient: InternalApiClient | undefined;

/** @internal */
export function __setStorageClientForTests(client: StorageClient | undefined): void {
  storage = client;
}
/** @internal */
export function __setApiClientForTests(client: InternalApiClient | undefined): void {
  apiClient = client;
}

function getStorage(): StorageClient {
  if (!storage) storage = createStorageClientFromEnv();
  return storage;
}

function getApi(): InternalApiClient {
  if (!apiClient) apiClient = getInternalApiClient();
  return apiClient;
}

export interface FinalizeUploadInput {
  workspace_id: string;
  asset_id: string;
  /** tusd upload id (e.g. `1234abcd…`). Used only for logging. */
  upload_id: string;
  /** Key inside the chunks bucket as reported by tusd Storage.Key. */
  upload_key: string;
  mime: string;
  /** Original filename from Upload-Metadata; preserved for created_by audit. */
  source_name: string;
  created_by?: string | null;
}

export interface FinalizeUploadResult {
  workspace_id: string;
  asset_id: string;
  source_uri: string;
  sha256: string;
  size_bytes: number;
  mime: string;
  /** True when the API found an existing matching sha256 row. */
  deduped: boolean;
}

/**
 * Read every byte of the chunk to compute its SHA-256. We use a
 * one-shot streaming pass — Hasher → throwaway sink. Memory usage is
 * bounded by the stream's internal high-water mark (64 KiB default).
 */
async function streamSha256(
  client: StorageClient,
  uri: string,
): Promise<{ sha256: string; size: number }> {
  const hash = createHash("sha256");
  let size = 0;
  const src = await client.getStream(uri);
  await pipeline(
    src,
    new Writable({
      write(chunk: Buffer, _enc, cb) {
        size += chunk.length;
        hash.update(chunk);
        cb();
      },
    }),
  );
  return { sha256: hash.digest("hex"), size };
}

export async function finalizeUpload(input: FinalizeUploadInput): Promise<FinalizeUploadResult> {
  if (!input?.workspace_id) {
    throw new Error("[worker/light/finalizeUpload] workspace_id is required");
  }
  if (!input.asset_id || !input.upload_key || !input.mime) {
    throw new Error("[worker/light/finalizeUpload] asset_id, upload_key, mime are all required");
  }

  const client = getStorage();
  const api = getApi();
  const layout = defaultBucketLayout();

  const chunkUri = buildS3Uri(layout.chunks, input.upload_key);
  const head = await client.head(chunkUri);

  const { sha256, size } = await streamSha256(client, chunkUri);
  if (head.size && head.size !== size) {
    // Defence-in-depth — if S3 reports a different size than the
    // stream we read, something's *very* wrong (S3 returned partial
    // bytes?); fail loud so Temporal retries.
    throw new Error(
      `finalizeUpload: head.size=${head.size} but stream size=${size} for ${chunkUri}`,
    );
  }

  const ext = extensionForMime(input.mime);
  const destKey = workspaceKey(input.workspace_id, input.asset_id, `source.${ext}`);
  const sourceUri = buildS3Uri(layout.raw, destKey);

  // Server-side copy from chunks → raw. MinIO supports this without a
  // network round-trip; @aws-sdk uses CopyObject.
  await client.copy(chunkUri, sourceUri);

  const asset = await api.postAsset({
    workspace_id: input.workspace_id,
    asset_id: input.asset_id,
    source_uri: sourceUri,
    sha256,
    mime: input.mime,
    duration_ms: null,
    captured_via: "tus",
    ...(input.created_by ? { created_by: input.created_by } : {}),
  });

  // Delete the chunk only AFTER the API write succeeded. If the
  // metadata write failed, leaving the chunk in place lets a retry
  // pick up where we left off.
  await client.delete(chunkUri).catch(() => undefined);

  return {
    workspace_id: input.workspace_id,
    asset_id: asset.asset_id,
    source_uri: asset.source_uri,
    sha256: asset.sha256,
    size_bytes: size,
    mime: asset.mime,
    deduped: asset.deduped,
  };
}
