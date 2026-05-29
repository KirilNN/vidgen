/**
 * services/worker — finalizeUpload activity tests (T-031).
 *
 * Pure unit tests with no network: storage is replaced with an
 * in-memory Map-backed client; the internal API client is replaced
 * with a recorder. We verify the activity:
 *
 *   1. hashes the chunk bytes correctly (SHA-256 in lowercase hex).
 *   2. copies the chunk to the canonical
 *      `media-raw/{ws}/{asset}/source.{ext}` slot.
 *   3. POSTs the asset row to the API with workspace_id + sha256.
 *   4. deletes the chunk ONLY AFTER the API write succeeds (chunk
 *      stays put on API failure so a retry can re-read it).
 *   5. returns `deduped: true` when the API responds with a
 *      pre-existing row.
 *   6. enforces workspace_id (multi-tenant rule, arch §11).
 */
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import {
  __setApiClientForTests,
  __setStorageClientForTests,
  finalizeUpload,
} from "../light/activities/finalize-upload.js";
import { parseS3Uri, type StorageClient } from "../shared/storage.js";
import type {
  InternalApiClient,
  PostAssetInput,
  PostAssetResult,
  PostRenditionInput,
  PostRenditionResult,
} from "../light/activities/api-client.js";

function buildMemoryStorage(): {
  client: StorageClient;
  store: Map<string, Buffer>;
  deletes: string[];
} {
  const store = new Map<string, Buffer>();
  const deletes: string[] = [];
  const client: StorageClient = {
    async head(uri) {
      const buf = store.get(uri);
      if (!buf) throw new Error(`stub head: missing ${uri}`);
      const parsed = parseS3Uri(uri);
      return {
        bucket: parsed.bucket,
        key: parsed.key,
        size: buf.length,
        contentType: undefined,
        etag: undefined,
      };
    },
    async getStream(uri) {
      const buf = store.get(uri);
      if (!buf) throw new Error(`stub get: missing ${uri}`);
      return Readable.from(buf);
    },
    async putStream(uri, body) {
      let buf: Buffer;
      if (Buffer.isBuffer(body)) buf = body;
      else if (body instanceof Uint8Array) buf = Buffer.from(body);
      else {
        const chunks: Buffer[] = [];
        for await (const chunk of body as Readable) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
        }
        buf = Buffer.concat(chunks);
      }
      store.set(uri, buf);
    },
    async copy(source, destination) {
      const buf = store.get(source);
      if (!buf) throw new Error(`stub copy: missing source ${source}`);
      store.set(destination, buf);
    },
    async delete(uri) {
      deletes.push(uri);
      store.delete(uri);
    },
  };
  return { client, store, deletes };
}

interface ApiRecorder extends InternalApiClient {
  assetCalls: PostAssetInput[];
  renditionCalls: PostRenditionInput[];
}

function buildApi(opts: { dedup?: boolean; throws?: Error } = {}): ApiRecorder {
  const assetCalls: PostAssetInput[] = [];
  const renditionCalls: PostRenditionInput[] = [];
  return {
    assetCalls,
    renditionCalls,
    async postAsset(input) {
      assetCalls.push(input);
      if (opts.throws) throw opts.throws;
      const result: PostAssetResult = {
        asset_id: input.asset_id ?? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        workspace_id: input.workspace_id,
        source_uri: input.source_uri,
        sha256: input.sha256,
        mime: input.mime,
        duration_ms: input.duration_ms ?? null,
        deduped: !!opts.dedup,
      };
      return result;
    },
    async postRendition(input) {
      renditionCalls.push(input);
      const result: PostRenditionResult = {
        rendition_id: "r-1",
        asset_id: input.asset_id,
        workspace_id: input.workspace_id,
        kind: input.kind,
        uri: input.uri,
      };
      return result;
    },
  };
}

const WS = "ws_test";
const ASSET = "11111111-1111-4111-8111-111111111111";
const UPLOAD_KEY = "abc123";
const PAYLOAD = Buffer.from("hello vidgen — tiny upload payload for hash test");
const EXPECTED_SHA = createHash("sha256").update(PAYLOAD).digest("hex");

afterEach(() => {
  __setStorageClientForTests(undefined);
  __setApiClientForTests(undefined);
});

describe("finalizeUpload", () => {
  it("hashes, copies into media-raw, and posts the asset", async () => {
    const { client, store, deletes } = buildMemoryStorage();
    const chunkUri = `s3://media-chunks/${UPLOAD_KEY}`;
    store.set(chunkUri, PAYLOAD);
    __setStorageClientForTests(client);
    const api = buildApi();
    __setApiClientForTests(api);

    const result = await finalizeUpload({
      workspace_id: WS,
      asset_id: ASSET,
      upload_id: "upload-1",
      upload_key: UPLOAD_KEY,
      mime: "video/mp4",
      source_name: "clip.mp4",
      created_by: "33333333-3333-4333-8333-333333333333",
    });

    expect(result.workspace_id).toBe(WS);
    expect(result.sha256).toBe(EXPECTED_SHA);
    expect(result.size_bytes).toBe(PAYLOAD.length);
    expect(result.deduped).toBe(false);
    expect(result.source_uri).toBe(`s3://media-raw/${WS}/${ASSET}/source.mp4`);

    // Bytes landed at the workspace-prefixed key in media-raw.
    const copied = store.get(result.source_uri);
    expect(copied).toBeDefined();
    expect(copied!.equals(PAYLOAD)).toBe(true);

    // Chunk deleted post-write.
    expect(deletes).toEqual([chunkUri]);
    expect(store.has(chunkUri)).toBe(false);

    // API received the right body.
    expect(api.assetCalls).toHaveLength(1);
    expect(api.assetCalls[0]).toMatchObject({
      workspace_id: WS,
      asset_id: ASSET,
      source_uri: result.source_uri,
      sha256: EXPECTED_SHA,
      mime: "video/mp4",
      captured_via: "tus",
      created_by: "33333333-3333-4333-8333-333333333333",
    });
  });

  it("returns deduped=true when the API reports an existing sha256", async () => {
    const { client, store } = buildMemoryStorage();
    store.set(`s3://media-chunks/${UPLOAD_KEY}`, PAYLOAD);
    __setStorageClientForTests(client);
    __setApiClientForTests(buildApi({ dedup: true }));

    const result = await finalizeUpload({
      workspace_id: WS,
      asset_id: ASSET,
      upload_id: "upload-1",
      upload_key: UPLOAD_KEY,
      mime: "audio/wav",
      source_name: "tone.wav",
    });
    expect(result.deduped).toBe(true);
    // Even on dedup we still copy + write the source row; the
    // workflow uses `deduped` to skip transcoding.
    expect(result.source_uri).toBe(`s3://media-raw/${WS}/${ASSET}/source.wav`);
  });

  it("does NOT delete the chunk if the API write fails", async () => {
    const { client, store, deletes } = buildMemoryStorage();
    const chunkUri = `s3://media-chunks/${UPLOAD_KEY}`;
    store.set(chunkUri, PAYLOAD);
    __setStorageClientForTests(client);
    __setApiClientForTests(buildApi({ throws: new Error("api 500") }));

    await expect(
      finalizeUpload({
        workspace_id: WS,
        asset_id: ASSET,
        upload_id: "upload-1",
        upload_key: UPLOAD_KEY,
        mime: "video/mp4",
        source_name: "clip.mp4",
      }),
    ).rejects.toThrow(/api 500/);

    // Critical retry property: the chunk MUST still exist so a retry
    // can re-read it.
    expect(deletes).toEqual([]);
    expect(store.has(chunkUri)).toBe(true);
  });

  it("rejects missing workspace_id (arch §11)", async () => {
    await expect(
      finalizeUpload({
        workspace_id: "",
        asset_id: ASSET,
        upload_id: "upload-1",
        upload_key: UPLOAD_KEY,
        mime: "video/mp4",
        source_name: "clip.mp4",
      } as never),
    ).rejects.toThrow(/workspace_id is required/);
  });

  it("rejects missing asset_id / upload_key / mime", async () => {
    for (const missing of ["asset_id", "upload_key", "mime"] as const) {
      const input = {
        workspace_id: WS,
        asset_id: ASSET,
        upload_id: "upload-1",
        upload_key: UPLOAD_KEY,
        mime: "video/mp4",
        source_name: "clip.mp4",
      } as Record<string, string>;
      input[missing] = "";
      await expect(finalizeUpload(input as never)).rejects.toThrow(
        /asset_id, upload_key, mime are all required/,
      );
    }
  });

  it("refuses path-escape attempts via the workspace_id", async () => {
    const { client, store } = buildMemoryStorage();
    store.set(`s3://media-chunks/${UPLOAD_KEY}`, PAYLOAD);
    __setStorageClientForTests(client);
    __setApiClientForTests(buildApi());

    await expect(
      finalizeUpload({
        workspace_id: "ws/escape",
        asset_id: ASSET,
        upload_id: "upload-1",
        upload_key: UPLOAD_KEY,
        mime: "video/mp4",
        source_name: "clip.mp4",
      }),
    ).rejects.toThrow(/invalid workspaceId/);
  });
});
