/**
 * services/worker/shared — S3 object-storage helper (T-030/31/32).
 *
 * Single source of truth for "how do workers talk to MinIO / R2".
 * Wraps `@aws-sdk/client-s3` with the small set of operations every
 * media activity needs (head / get-stream / put-stream / copy /
 * delete) plus an S3 URI helper so callers don't have to handle the
 * `s3://{bucket}/{key}` ↔ {bucket, key} split themselves.
 *
 * Architecture refs:
 *   - §5.1 — buckets media-raw / media-derived / media-chunks / public.
 *   - §7.2 — storage is an adapter; the only S3 SDK import in the
 *            worker tree lives here so swapping to R2 (Mode B) is a
 *            one-config-line change.
 *   - §11  — every object key is workspace-prefixed; we enforce that
 *            in `workspaceKey()` rather than trusting callers.
 *
 * Why a thin wrapper instead of using the SDK directly in each
 * activity:
 *   - The MinIO + AWS endpoint quirks (path-style addressing, signed
 *     URLs against a custom hostname) only live here.
 *   - Activities are easier to unit-test against a single
 *     `StorageClient` interface than a moving SDK surface.
 *   - The same client wires into the ingest hooks if/when the API
 *     ever needs to verify a tus upload before handing off.
 *
 * Mode A defaults: MinIO behind `http://minio:9000` with path-style
 * addressing (required — MinIO doesn't do virtual-hosted-style
 * unless you map per-bucket hostnames in Caddy, which we don't).
 */
import { Readable } from "node:stream";
import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

/** Workspace_id must be safe to use as an S3 key prefix. */
const WORKSPACE_ID_RE = /^[A-Za-z0-9_\-.]+$/;

/**
 * Parsed `s3://{bucket}/{key}` URI. We do NOT support cross-region or
 * cross-endpoint URIs — every URI in our system points at the
 * configured MinIO/R2 instance, so a bare `s3://` prefix is enough.
 */
export interface S3Uri {
  bucket: string;
  key: string;
  /** Round-trip-safe textual form, identical to the input. */
  uri: string;
}

/**
 * Parse `s3://bucket/key/path` → {bucket, key}. Throws on malformed
 * input so a buggy activity surfaces immediately instead of silently
 * pointing at the wrong object.
 */
export function parseS3Uri(uri: string): S3Uri {
  const m = /^s3:\/\/([^/]+)\/(.+)$/.exec(uri);
  if (!m) throw new Error(`storage: invalid s3 URI ${JSON.stringify(uri)}`);
  return { bucket: m[1]!, key: m[2]!, uri };
}

/** Build an `s3://` URI from its parts. Validates the workspace prefix. */
export function buildS3Uri(bucket: string, key: string): string {
  if (!bucket) throw new Error("storage: bucket required");
  if (!key) throw new Error("storage: key required");
  return `s3://${bucket}/${key.replace(/^\/+/, "")}`;
}

/**
 * Build a workspace-prefixed key. Refuses anything that would let a
 * caller escape its workspace (`..`, leading `/`, empty workspace) —
 * defence in depth on top of the application-layer multi-tenant
 * checks (arch §11).
 */
export function workspaceKey(workspaceId: string, ...parts: string[]): string {
  if (!workspaceId || !WORKSPACE_ID_RE.test(workspaceId)) {
    throw new Error(
      `storage: invalid workspaceId ${JSON.stringify(workspaceId)}; must match ${WORKSPACE_ID_RE.source}`,
    );
  }
  const tail = parts.map((p) => p.replace(/^\/+|\/+$/g, "")).filter((p) => p.length > 0);
  for (const p of tail) {
    if (p.includes("..")) {
      throw new Error(`storage: path component ${JSON.stringify(p)} contains '..'`);
    }
  }
  return [workspaceId, ...tail].join("/");
}

export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Force path-style (required for MinIO). Defaults true for `endpoint` set. */
  forcePathStyle?: boolean;
}

export interface ObjectHead {
  bucket: string;
  key: string;
  size: number;
  contentType: string | undefined;
  etag: string | undefined;
}

/**
 * Minimal surface every media activity (and the ingest hooks if they
 * ever need it) uses. Keeping this typed as an interface — rather
 * than re-exporting the S3Client directly — makes it cheap to swap
 * implementations in tests (a Map-backed in-memory client suffices
 * for the ffmpeg activity unit tests).
 */
export interface StorageClient {
  head(uri: string): Promise<ObjectHead>;
  /** Get a readable Node stream for the object. Caller must consume + destroy. */
  getStream(uri: string): Promise<Readable>;
  /** Upload bytes from a stream. Sets contentType if provided. */
  putStream(
    uri: string,
    body: Readable | Buffer | Uint8Array,
    opts?: { contentType?: string; contentLength?: number },
  ): Promise<void>;
  /** Server-side copy from one S3 location to another (no network round-trip). */
  copy(source: string, destination: string): Promise<void>;
  /** Delete an object; no error if it does not exist. */
  delete(uri: string): Promise<void>;
}

/**
 * Build a real S3 client backed by `@aws-sdk/client-s3`. Path-style
 * is on by default because MinIO needs it; R2 also accepts it.
 */
export function createStorageClient(config: StorageConfig): StorageClient {
  const clientConfig: S3ClientConfig = {
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle ?? true,
  };
  const client = new S3Client(clientConfig);

  async function consumeBodyAsStream(body: unknown): Promise<Readable> {
    if (body instanceof Readable) return body;
    // The AWS SDK v3 returns a Web ReadableStream when running under
    // Node 18+. Convert it to a Node stream so callers can pipe.
    if (
      body &&
      typeof (body as { transformToWebStream?: unknown }).transformToWebStream === "function"
    ) {
      const webStream = (body as { transformToWebStream(): ReadableStream }).transformToWebStream();
      return Readable.fromWeb(webStream as never);
    }
    throw new Error("storage: unexpected S3 response Body shape");
  }

  return {
    async head(uri) {
      const { bucket, key } = parseS3Uri(uri);
      const res = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return {
        bucket,
        key,
        size: typeof res.ContentLength === "number" ? res.ContentLength : 0,
        contentType: res.ContentType,
        etag: res.ETag?.replace(/^"|"$/g, ""),
      };
    },
    async getStream(uri) {
      const { bucket, key } = parseS3Uri(uri);
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return consumeBodyAsStream(res.Body);
    },
    async putStream(uri, body, opts) {
      const { bucket, key } = parseS3Uri(uri);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body as never,
          ...(opts?.contentType ? { ContentType: opts.contentType } : {}),
          ...(typeof opts?.contentLength === "number" ? { ContentLength: opts.contentLength } : {}),
        }),
      );
    },
    async copy(source, destination) {
      const src = parseS3Uri(source);
      const dst = parseS3Uri(destination);
      await client.send(
        new CopyObjectCommand({
          Bucket: dst.bucket,
          Key: dst.key,
          // CopySource is bucket/key, URL-encoded. The SDK does NOT
          // encode this for us — `encodeURIComponent` would encode the
          // slash too, which breaks the call. Encode the key parts
          // separately.
          CopySource: `${src.bucket}/${src.key
            .split("/")
            .map((seg) => encodeURIComponent(seg))
            .join("/")}`,
        }),
      );
    },
    async delete(uri) {
      const { bucket, key } = parseS3Uri(uri);
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

/**
 * Resolve the canonical bucket names from env. Centralised here so a
 * deployment rename (e.g. r2-`vidgen-media-raw`) is a one-place edit.
 */
export interface BucketLayout {
  raw: string;
  derived: string;
  chunks: string;
  publicBucket: string;
}

export function defaultBucketLayout(env: NodeJS.ProcessEnv = process.env): BucketLayout {
  return {
    raw: env["MINIO_BUCKET_RAW"] ?? "media-raw",
    derived: env["MINIO_BUCKET_DERIVED"] ?? "media-derived",
    chunks: env["MINIO_BUCKET_CHUNKS"] ?? "media-chunks",
    publicBucket: env["MINIO_BUCKET_PUBLIC"] ?? "public",
  };
}

/**
 * Build a `StorageClient` from the worker env. Throws if any of the
 * four required vars is missing — workers don't run if storage is
 * unconfigured. Kept lazy: only called when an activity actually
 * needs storage (so the ping activity, which does not, won't trip
 * this).
 */
export function createStorageClientFromEnv(env: NodeJS.ProcessEnv = process.env): StorageClient {
  const endpoint = env["MINIO_ENDPOINT"];
  const accessKeyId = env["MINIO_ROOT_USER"];
  const secretAccessKey = env["MINIO_ROOT_PASSWORD"];
  if (!endpoint) throw new Error("storage: MINIO_ENDPOINT is required");
  if (!accessKeyId) throw new Error("storage: MINIO_ROOT_USER is required");
  if (!secretAccessKey) throw new Error("storage: MINIO_ROOT_PASSWORD is required");
  return createStorageClient({
    endpoint,
    region: env["MINIO_REGION"] ?? "us-east-1",
    accessKeyId,
    secretAccessKey,
    forcePathStyle: true,
  });
}

/**
 * Extension hint for a given mime type. The set is deliberately
 * limited to the formats we accept on ingest (arch §3.1) — any
 * unknown mime falls back to `bin` so the upload still lands
 * somewhere predictable while surfacing the surprise in logs.
 */
const MIME_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/flac": "flac",
  "audio/aac": "aac",
};

export function extensionForMime(mime: string): string {
  const normalised = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  return MIME_EXT[normalised] ?? "bin";
}
