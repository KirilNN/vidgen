/**
 * services/worker — storage helper tests (T-030/31/32).
 *
 * Network-free unit tests for the pure helpers in `shared/storage.ts`:
 *   - parseS3Uri / buildS3Uri round-trip and reject malformed inputs.
 *   - workspaceKey enforces the multi-tenant prefix rule (arch §11)
 *     and refuses path-escape attempts (`..`, leading slashes,
 *     empty/illegal workspace ids).
 *   - extensionForMime returns the canonical extension for each
 *     ingestable mime, gracefully falls back for unknowns, and is
 *     case-insensitive + parameter-tolerant.
 *   - defaultBucketLayout honours env overrides and falls back to the
 *     compose-default bucket names.
 */
import { describe, expect, it } from "vitest";
import {
  buildS3Uri,
  defaultBucketLayout,
  extensionForMime,
  parseS3Uri,
  workspaceKey,
} from "../shared/storage.js";

describe("parseS3Uri / buildS3Uri", () => {
  it("parses a well-formed s3 URI", () => {
    expect(parseS3Uri("s3://media-raw/ws_acme/abc/source.mp4")).toEqual({
      bucket: "media-raw",
      key: "ws_acme/abc/source.mp4",
      uri: "s3://media-raw/ws_acme/abc/source.mp4",
    });
  });

  it("rejects non-s3 schemes and missing keys", () => {
    expect(() => parseS3Uri("https://example.com/x")).toThrow(/invalid s3 URI/);
    expect(() => parseS3Uri("s3://just-bucket")).toThrow(/invalid s3 URI/);
    expect(() => parseS3Uri("s3:///no-bucket")).toThrow(/invalid s3 URI/);
  });

  it("buildS3Uri assembles the URI and strips leading slashes from the key", () => {
    expect(buildS3Uri("media-raw", "/ws/abc/source.mp4")).toBe("s3://media-raw/ws/abc/source.mp4");
    expect(buildS3Uri("media-raw", "ws/abc/source.mp4")).toBe("s3://media-raw/ws/abc/source.mp4");
  });

  it("buildS3Uri refuses empty bucket or key", () => {
    expect(() => buildS3Uri("", "x")).toThrow(/bucket required/);
    expect(() => buildS3Uri("media-raw", "")).toThrow(/key required/);
  });

  it("round-trips through parse + build", () => {
    const original = "s3://media-derived/ws_acme/aaaa/mezz.mp4";
    const parsed = parseS3Uri(original);
    expect(buildS3Uri(parsed.bucket, parsed.key)).toBe(original);
  });
});

describe("workspaceKey", () => {
  it("joins workspace_id and path segments with '/'", () => {
    expect(workspaceKey("ws_acme", "abc", "source.mp4")).toBe("ws_acme/abc/source.mp4");
  });

  it("strips redundant slashes from segments", () => {
    expect(workspaceKey("ws_acme", "/abc/", "/source.mp4/")).toBe("ws_acme/abc/source.mp4");
  });

  it("returns just the workspace prefix when no parts are given", () => {
    expect(workspaceKey("ws_acme")).toBe("ws_acme");
  });

  it("refuses empty workspace_id (arch §11)", () => {
    expect(() => workspaceKey("", "abc")).toThrow(/invalid workspaceId/);
  });

  it("refuses illegal characters in the workspace_id (arch §11)", () => {
    expect(() => workspaceKey("ws/escape", "abc")).toThrow(/invalid workspaceId/);
    expect(() => workspaceKey("ws acme", "abc")).toThrow(/invalid workspaceId/);
    expect(() => workspaceKey("ws$acme", "abc")).toThrow(/invalid workspaceId/);
  });

  it("refuses path-escape attempts via '..' in any segment", () => {
    expect(() => workspaceKey("ws_acme", "..", "etc")).toThrow(/'\.\.'/);
    expect(() => workspaceKey("ws_acme", "abc/../etc")).toThrow(/'\.\.'/);
  });
});

describe("extensionForMime", () => {
  it("returns the canonical extension for video mimes", () => {
    expect(extensionForMime("video/mp4")).toBe("mp4");
    expect(extensionForMime("video/quicktime")).toBe("mov");
    expect(extensionForMime("video/webm")).toBe("webm");
    expect(extensionForMime("video/x-matroska")).toBe("mkv");
  });

  it("returns the canonical extension for audio mimes", () => {
    expect(extensionForMime("audio/mpeg")).toBe("mp3");
    expect(extensionForMime("audio/mp4")).toBe("m4a");
    expect(extensionForMime("audio/wav")).toBe("wav");
    expect(extensionForMime("audio/x-wav")).toBe("wav");
    expect(extensionForMime("audio/flac")).toBe("flac");
  });

  it("ignores mime parameters and is case-insensitive", () => {
    expect(extensionForMime("VIDEO/MP4; codecs=avc1")).toBe("mp4");
    expect(extensionForMime("audio/wav;rate=16000")).toBe("wav");
  });

  it("falls back to 'bin' for unknown mimes", () => {
    expect(extensionForMime("application/octet-stream")).toBe("bin");
    expect(extensionForMime("")).toBe("bin");
  });
});

describe("defaultBucketLayout", () => {
  it("returns the compose-default bucket names when env is empty", () => {
    expect(defaultBucketLayout({})).toEqual({
      raw: "media-raw",
      derived: "media-derived",
      chunks: "media-chunks",
      publicBucket: "public",
    });
  });

  it("honours MINIO_BUCKET_* overrides", () => {
    expect(
      defaultBucketLayout({
        MINIO_BUCKET_RAW: "vidgen-raw",
        MINIO_BUCKET_DERIVED: "vidgen-derived",
        MINIO_BUCKET_CHUNKS: "vidgen-chunks",
        MINIO_BUCKET_PUBLIC: "vidgen-public",
      }),
    ).toEqual({
      raw: "vidgen-raw",
      derived: "vidgen-derived",
      chunks: "vidgen-chunks",
      publicBucket: "vidgen-public",
    });
  });
});
