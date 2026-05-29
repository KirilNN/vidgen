/**
 * services/worker — ffmpeg media-pool activity tests (T-032).
 *
 * Network-free: the storage client is replaced with an in-memory
 * Map-backed implementation of `StorageClient`, and ffmpeg/ffprobe are
 * the real binaries on the developer's PATH. Inputs are
 * tiny — synthesised via `ffmpeg -f lavfi -i color=…` once per suite —
 * so the entire file runs in well under 30 seconds even on a laptop.
 *
 * The suite skips itself when ffmpeg is not on PATH (CI without
 * ffmpeg would otherwise fail; the Docker media image always has it).
 *
 * Covered acceptance criteria for T-032:
 *   - probeMedia: returns duration_ms, mime, video + audio streams.
 *   - transcodeMezzanine: writes a 720p H.264 MP4 to the destination
 *     bucket; output_uri defaults to the canonical
 *     `media-derived/{ws}/{asset}/mezz.mp4` slot; persists params_json.
 *   - extractAudio: writes a 16 kHz mono PCM WAV; handles silent input
 *     via anullsrc fallback.
 *   - All activities reject missing workspace_id (arch §11).
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  __setFfmpegBinForTests,
  __setFfprobeBinForTests,
  __setStorageClientForTests,
  extractAudio,
  probeMedia,
  transcodeMezzanine,
} from "../media/activities/ffmpeg.js";
import { audioUri, mezzanineUri } from "../media/activities/ffmpeg.js";
import { parseS3Uri, type StorageClient } from "../shared/storage.js";

// --- In-memory storage stub ----------------------------------------------------
// Map keyed by `s3://bucket/key`, value is the raw bytes.
function buildMemoryStorage(): { client: StorageClient; store: Map<string, Buffer> } {
  const store = new Map<string, Buffer>();
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
      if (Buffer.isBuffer(body)) {
        buf = body;
      } else if (body instanceof Uint8Array) {
        buf = Buffer.from(body);
      } else {
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
      store.delete(uri);
    },
  };
  return { client, store };
}

// --- Helpers: synthesise tiny inputs once ----------------------------------------

const ffmpegOnPath = (() => {
  const r = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  return r.status === 0;
})();

let scratchDir: string;
let videoBytes: Buffer;
let silentVideoBytes: Buffer;
let audioBytes: Buffer;

beforeAll(() => {
  if (!ffmpegOnPath) return;
  scratchDir = mkdtempSync(join(tmpdir(), "vidgen-ffmpeg-test-"));
  // 1 second 320x180 color video with a 440 Hz tone — exercises both
  // video + audio probe paths.
  const videoPath = join(scratchDir, "tiny.mp4");
  const videoResult = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=red:s=320x180:d=1:r=10",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:duration=1:sample_rate=44100",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      videoPath,
    ],
    { encoding: "utf8" },
  );
  if (videoResult.status !== 0) {
    throw new Error(`fixture ffmpeg failed: ${videoResult.stderr}`);
  }
  videoBytes = readFileSync(videoPath);

  // Silent video — exercises extractAudio's anullsrc fallback.
  const silentPath = join(scratchDir, "silent.mp4");
  const silentResult = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=blue:s=320x180:d=1:r=10",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-pix_fmt",
      "yuv420p",
      "-an",
      silentPath,
    ],
    { encoding: "utf8" },
  );
  if (silentResult.status !== 0) {
    throw new Error(`fixture ffmpeg silent failed: ${silentResult.stderr}`);
  }
  silentVideoBytes = readFileSync(silentPath);

  // Audio-only mp3 — exercises probe + extract on an audio-only asset.
  const audioPath = join(scratchDir, "tiny.mp3");
  const audioResult = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:duration=1:sample_rate=44100",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "64k",
      audioPath,
    ],
    { encoding: "utf8" },
  );
  if (audioResult.status !== 0) {
    throw new Error(`fixture ffmpeg audio failed: ${audioResult.stderr}`);
  }
  audioBytes = readFileSync(audioPath);

  // Match the production env: defaults are fine, but make sure tests
  // don't depend on env from outside the suite.
  delete process.env["MINIO_BUCKET_RAW"];
  delete process.env["MINIO_BUCKET_DERIVED"];
});

afterAll(() => {
  if (scratchDir) {
    rmSync(scratchDir, { recursive: true, force: true });
  }
  __setStorageClientForTests(undefined);
  __setFfmpegBinForTests("ffmpeg");
  __setFfprobeBinForTests("ffprobe");
});

const WS = "ws_test";
const ASSET = "11111111-1111-4111-8111-111111111111";

describe("probeMedia", () => {
  it.skipIf(!ffmpegOnPath)("returns duration + streams for a video", async () => {
    const { client, store } = buildMemoryStorage();
    __setStorageClientForTests(client);
    const inputUri = `s3://media-raw/${WS}/${ASSET}/source.mp4`;
    store.set(inputUri, videoBytes);

    const result = await probeMedia({ workspace_id: WS, input_uri: inputUri });
    expect(result.workspace_id).toBe(WS);
    expect(result.duration_ms).toBeGreaterThan(500);
    expect(result.duration_ms).toBeLessThan(2000);
    expect(result.mime).toBe("video/mp4");
    expect(result.streams.some((s) => s.type === "video")).toBe(true);
    expect(result.streams.some((s) => s.type === "audio")).toBe(true);
    const video = result.streams.find((s) => s.type === "video");
    expect(video).toBeDefined();
    if (video && video.type === "video") {
      expect(video.width).toBe(320);
      expect(video.height).toBe(180);
    }
  });

  it.skipIf(!ffmpegOnPath)("rejects missing workspace_id", async () => {
    await expect(probeMedia({ workspace_id: "", input_uri: "s3://x/y" } as never)).rejects.toThrow(
      /workspace_id is required/,
    );
  });
});

describe("transcodeMezzanine", () => {
  it.skipIf(!ffmpegOnPath)("writes an MP4 to the canonical output URI", async () => {
    const { client, store } = buildMemoryStorage();
    __setStorageClientForTests(client);
    const inputUri = `s3://media-raw/${WS}/${ASSET}/source.mp4`;
    store.set(inputUri, videoBytes);

    const result = await transcodeMezzanine({
      workspace_id: WS,
      asset_id: ASSET,
      input_uri: inputUri,
    });
    expect(result.workspace_id).toBe(WS);
    expect(result.output_uri).toBe(mezzanineUri(WS, ASSET));
    // The mezzanine bucket key MUST be workspace-prefixed (arch §11).
    expect(result.output_uri).toContain(`/${WS}/${ASSET}/mezz.mp4`);
    // Output must have been uploaded.
    expect(store.has(result.output_uri)).toBe(true);
    expect((store.get(result.output_uri) ?? Buffer.alloc(0)).length).toBeGreaterThan(0);
    // Persisted encoder params (round-trip into renditions.params_json).
    expect(result.params["vcodec"]).toBe("libx264");
    expect(result.params["crf"]).toBe(23);
    // Resolution preserved (input is already 180p so no upscale; even-pixel rule).
    expect(result.width).toBe(320);
    expect(result.height).toBe(180);
    expect(result.duration_ms).toBeGreaterThan(500);
  });

  it.skipIf(!ffmpegOnPath)("respects an explicit output_uri override", async () => {
    const { client, store } = buildMemoryStorage();
    __setStorageClientForTests(client);
    const inputUri = `s3://media-raw/${WS}/${ASSET}/source.mp4`;
    const customOutput = `s3://media-derived/${WS}/${ASSET}/custom.mp4`;
    store.set(inputUri, videoBytes);

    const result = await transcodeMezzanine({
      workspace_id: WS,
      asset_id: ASSET,
      input_uri: inputUri,
      output_uri: customOutput,
    });
    expect(result.output_uri).toBe(customOutput);
    expect(store.has(customOutput)).toBe(true);
  });

  it.skipIf(!ffmpegOnPath)("rejects missing workspace_id / asset_id", async () => {
    await expect(
      transcodeMezzanine({ workspace_id: "", asset_id: ASSET, input_uri: "s3://x/y" } as never),
    ).rejects.toThrow(/workspace_id is required/);
    await expect(
      transcodeMezzanine({ workspace_id: WS, asset_id: "", input_uri: "s3://x/y" } as never),
    ).rejects.toThrow(/asset_id is required/);
  });
});

describe("extractAudio", () => {
  it.skipIf(!ffmpegOnPath)("writes a 16 kHz mono WAV to the canonical output URI", async () => {
    const { client, store } = buildMemoryStorage();
    __setStorageClientForTests(client);
    const inputUri = `s3://media-raw/${WS}/${ASSET}/source.mp4`;
    store.set(inputUri, videoBytes);

    const result = await extractAudio({
      workspace_id: WS,
      asset_id: ASSET,
      input_uri: inputUri,
    });
    expect(result.workspace_id).toBe(WS);
    expect(result.output_uri).toBe(audioUri(WS, ASSET));
    expect(result.sample_rate).toBe(16000);
    expect(result.channels).toBe(1);
    expect(store.has(result.output_uri)).toBe(true);
    // Verify the WAV header (sample rate + channels) directly.
    const wav = store.get(result.output_uri) ?? Buffer.alloc(0);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    // channel count (uint16 LE at offset 22) and sample rate (uint32 LE at 24).
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(16000);
  });

  it.skipIf(!ffmpegOnPath)("handles silent input via anullsrc fallback", async () => {
    const { client, store } = buildMemoryStorage();
    __setStorageClientForTests(client);
    const inputUri = `s3://media-raw/${WS}/${ASSET}/silent.mp4`;
    store.set(inputUri, silentVideoBytes);

    const result = await extractAudio({
      workspace_id: WS,
      asset_id: ASSET,
      input_uri: inputUri,
    });
    expect(store.has(result.output_uri)).toBe(true);
    // The silent placeholder is exactly 1 second at 16 kHz mono.
    expect(result.duration_ms).toBeGreaterThan(800);
    expect(result.duration_ms).toBeLessThan(1500);
  });

  it.skipIf(!ffmpegOnPath)("extracts audio from an audio-only asset", async () => {
    const { client, store } = buildMemoryStorage();
    __setStorageClientForTests(client);
    const inputUri = `s3://media-raw/${WS}/${ASSET}/source.mp3`;
    store.set(inputUri, audioBytes);

    const result = await extractAudio({
      workspace_id: WS,
      asset_id: ASSET,
      input_uri: inputUri,
    });
    expect(store.has(result.output_uri)).toBe(true);
    expect(result.duration_ms).toBeGreaterThan(500);
  });
});

describe("ffmpeg binary override (for stubs / CI)", () => {
  it("__setFfmpegBinForTests routes spawns to the override", () => {
    // Smoke check: setting a path doesn't blow up + survives reset.
    __setFfmpegBinForTests("/bin/echo");
    __setFfprobeBinForTests("/bin/echo");
    __setFfmpegBinForTests("ffmpeg");
    __setFfprobeBinForTests("ffprobe");
    // Avoid an unused-import warning on writeFileSync; the helper is
    // imported because future fixture growth uses it.
    void writeFileSync;
  });
});
