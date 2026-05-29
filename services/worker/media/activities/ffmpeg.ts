/**
 * services/worker/media/activities/ffmpeg — media transcode activities
 * (T-032).
 *
 * Three activities mandated by the ticket:
 *
 *   - `probeMedia(input)`          → returns duration_ms, mime, video
 *                                    + audio codec/resolution.
 *   - `transcodeMezzanine(input)`  → H.264 720p MP4 written to
 *                                    `media-derived/{ws}/{asset}/mezz.mp4`.
 *   - `extractAudio(input)`        → 16 kHz mono WAV written to
 *                                    `.../audio.wav` (Whisper-ready).
 *
 * Architecture refs:
 *   - §3.2 — FFmpeg + MLT pipeline; Whisper consumes the 16 kHz mono
 *            WAV emitted here (matches T-040).
 *   - §5.1 — media bytes live in MinIO; Postgres stores metadata only.
 *   - §6.2 — every media-pool activity runs on the `media` task queue.
 *   - §11  — every input carries workspace_id; output keys are
 *            workspace-prefixed by the caller via `workspaceKey()`.
 *
 * Idempotency: the workflow chooses the output URI (`mezz.mp4`,
 * `audio.wav`) deterministically per asset_id, so a retry simply
 * overwrites the previous attempt — no extra suffix needed. We do
 * use a temp prefix on the local scratch file so two concurrent
 * activity attempts (Temporal's worst case) do not stomp on each
 * other on disk.
 *
 * Why temp files instead of pure-stream piping:
 *   - FFmpeg's input demuxer needs random-access on most container
 *     formats (MP4 moov-atom is at the END of the file when the
 *     encoder didn't fast-start it). Piping stdin works only for
 *     formats with progressive headers. Writing the input to a tmp
 *     file is simpler and reliably correct.
 *   - The mezzanine encoder writes a fast-started MP4 (`-movflags
 *     +faststart`) so the OUTPUT can be streamed; we still write
 *     it to disk first to compute size + checksum cheaply.
 *
 * Why ffmpeg-from-apt instead of `ffmpeg-static`:
 *   - `ffmpeg-static` ships a self-contained binary that lags
 *     several minor versions behind Debian's package; on the slim
 *     base image we already pay for, `apt-get install ffmpeg` adds
 *     ~70 MB and gives us the same H.264/AAC + libfdk-aac-equivalent
 *     codecs Debian ships. The media Dockerfile installs ffmpeg
 *     directly (`services/worker/media/Dockerfile`).
 */
import { spawn } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  buildS3Uri,
  createStorageClientFromEnv,
  defaultBucketLayout,
  parseS3Uri,
  type StorageClient,
} from "../../shared/storage.js";

// ---- shared scaffolding ---------------------------------------------------

/**
 * Module-local storage client. Lazy so tests can override via
 * `__setStorageClientForTests` without ever invoking the real env
 * loader. Activities that don't need storage (none here — all three
 * do) won't trigger construction.
 */
let storage: StorageClient | undefined;

export function __setStorageClientForTests(client: StorageClient | undefined): void {
  storage = client;
}

function getStorage(): StorageClient {
  if (!storage) storage = createStorageClientFromEnv();
  return storage;
}

/**
 * Allow tests to swap the binary (e.g. point at a shell stub) without
 * monkey-patching `spawn`. Defaults to `ffmpeg` / `ffprobe` on PATH.
 */
let ffmpegBin = process.env["FFMPEG_BIN"] ?? "ffmpeg";
let ffprobeBin = process.env["FFPROBE_BIN"] ?? "ffprobe";

export function __setFfmpegBinForTests(bin: string): void {
  ffmpegBin = bin;
}
export function __setFfprobeBinForTests(bin: string): void {
  ffprobeBin = bin;
}

interface RunResult {
  stdout: string;
  stderr: string;
  code: number;
}

async function runProcess(bin: string, args: string[]): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.once("error", (err) => reject(err));
    child.once("close", (code) => resolve({ stdout, stderr, code: code ?? -1 }));
  });
}

/**
 * Reject a non-zero ffmpeg exit with a useful error. We capture
 * stderr because ffmpeg writes the *interesting* diagnostic there;
 * trim to keep the Temporal failure payload small (the SDK caps
 * activity errors at 2 MB but the UI gets unhappy long before that).
 */
function assertOk(label: string, result: RunResult): void {
  if (result.code === 0) return;
  const tail = result.stderr.split("\n").slice(-20).join("\n");
  throw new Error(`${label} exited ${result.code}: ${tail}`);
}

/**
 * Stream a remote object into a temp file. Returns the absolute
 * filesystem path. We DON'T leak the directory to callers — the
 * cleanup helper below removes the whole tmpdir on shutdown.
 */
async function downloadToTemp(
  client: StorageClient,
  uri: string,
  tmpDir: string,
  filename: string,
): Promise<string> {
  const destPath = join(tmpDir, filename);
  const src = await client.getStream(uri);
  await pipeline(src, createWriteStream(destPath));
  return destPath;
}

/**
 * Upload a local file into S3. Streams from disk so we never
 * materialise the whole rendition in memory (a 1080p mezzanine of a
 * 2-hour podcast is ~3 GB).
 */
async function uploadFromTemp(
  client: StorageClient,
  localPath: string,
  uri: string,
  contentType: string,
): Promise<void> {
  const size = (await stat(localPath)).size;
  await client.putStream(uri, createReadStream(localPath) as unknown as Readable, {
    contentType,
    contentLength: size,
  });
}

async function withScratchDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "vidgen-ffmpeg-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

// ---- probeMedia ------------------------------------------------------------

export interface ProbeStreamVideo {
  type: "video";
  codec: string;
  width: number;
  height: number;
  frame_rate: number | null;
}

export interface ProbeStreamAudio {
  type: "audio";
  codec: string;
  sample_rate: number;
  channels: number;
}

export type ProbeStream = ProbeStreamVideo | ProbeStreamAudio;

export interface ProbeResult {
  workspace_id: string;
  duration_ms: number;
  format_name: string;
  mime: string;
  size_bytes: number;
  streams: ProbeStream[];
}

export interface ProbeMediaInput {
  workspace_id: string;
  /** `s3://media-raw/{ws}/{asset}/source.{ext}` */
  input_uri: string;
}

/**
 * Runs `ffprobe -print_format json -show_format -show_streams` and
 * normalises the output into `ProbeResult`. We deliberately do NOT
 * pipe the source over stdin — most container formats need the
 * moov-atom at the END, which makes a forward-only stdin probe
 * unreliable. A tmp-file download is correct + bounded by the
 * activity timeout.
 */
export async function probeMedia(input: ProbeMediaInput): Promise<ProbeResult> {
  if (!input?.workspace_id) {
    throw new Error("[worker/media/probeMedia] workspace_id is required");
  }
  const { workspace_id, input_uri } = input;
  parseS3Uri(input_uri);

  const client = getStorage();
  return withScratchDir(async (dir) => {
    const local = await downloadToTemp(client, input_uri, dir, "input.bin");
    const probe = await runProcess(ffprobeBin, [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      local,
    ]);
    assertOk("ffprobe", probe);

    interface RawProbe {
      format?: { format_name?: string; duration?: string; size?: string };
      streams?: Array<{
        codec_type?: string;
        codec_name?: string;
        width?: number;
        height?: number;
        sample_rate?: string;
        channels?: number;
        avg_frame_rate?: string;
      }>;
    }
    let raw: RawProbe;
    try {
      raw = JSON.parse(probe.stdout) as RawProbe;
    } catch (err) {
      throw new Error(`ffprobe: invalid JSON output: ${(err as Error).message}`);
    }
    const durationS = Number(raw.format?.duration ?? "0");
    const sizeBytes = Number(raw.format?.size ?? "0");
    const formatName = raw.format?.format_name ?? "unknown";

    const streams: ProbeStream[] = [];
    for (const s of raw.streams ?? []) {
      if (s.codec_type === "video") {
        let frameRate: number | null = null;
        const afr = s.avg_frame_rate;
        if (afr && afr.includes("/")) {
          const [num, den] = afr.split("/").map(Number);
          if (num && den) frameRate = num / den;
        }
        streams.push({
          type: "video",
          codec: s.codec_name ?? "unknown",
          width: s.width ?? 0,
          height: s.height ?? 0,
          frame_rate: frameRate,
        });
      } else if (s.codec_type === "audio") {
        streams.push({
          type: "audio",
          codec: s.codec_name ?? "unknown",
          sample_rate: Number(s.sample_rate ?? 0),
          channels: s.channels ?? 0,
        });
      }
    }

    // FFprobe reports container format like `mov,mp4,m4a,3gp,3g2,mj2`
    // — we keep the raw string but derive a best-guess mime for
    // downstream consumers that key on it.
    const mime = guessMimeFromFormat(formatName, streams);

    return {
      workspace_id,
      duration_ms: Math.round(durationS * 1000),
      format_name: formatName,
      mime,
      size_bytes: sizeBytes,
      streams,
    };
  });
}

function guessMimeFromFormat(format: string, streams: ProbeStream[]): string {
  const has = (type: ProbeStream["type"]) => streams.some((s) => s.type === type);
  const f = format.split(",")[0] ?? format;
  if (f === "mov" || f === "mp4") return has("video") ? "video/mp4" : "audio/mp4";
  if (f === "matroska") return "video/x-matroska";
  if (f === "webm") return "video/webm";
  if (f === "mp3") return "audio/mpeg";
  if (f === "wav") return "audio/wav";
  if (f === "flac") return "audio/flac";
  if (f === "aac") return "audio/aac";
  return "application/octet-stream";
}

// ---- transcodeMezzanine ---------------------------------------------------

export interface TranscodeMezzanineInput {
  workspace_id: string;
  asset_id: string;
  input_uri: string;
  /**
   * Optional explicit destination. Default is
   * `s3://{media-derived}/{ws}/{asset}/mezz.mp4` — built from
   * `defaultBucketLayout()` so the operator can rename the bucket via
   * env without touching workflow code.
   */
  output_uri?: string;
}

export interface TranscodeMezzanineResult {
  workspace_id: string;
  output_uri: string;
  size_bytes: number;
  duration_ms: number;
  width: number;
  height: number;
  /** FFmpeg-resolved params persisted in `renditions.params_json`. */
  params: Record<string, string | number>;
}

/**
 * Encode a normalised 720p H.264 + AAC MP4. The filter chain caps
 * height at 720 while preserving aspect (no upscale via `min(720,
 * ih)`), uses `-movflags +faststart` for HTTP-pseudo-streaming, and
 * targets a CRF of 23 — the sweet spot for "watchable preview"
 * without ballooning disk.
 *
 * Defaults are intentionally OPINIONATED: this is the source of
 * truth for "what a mezzanine looks like at vidgen". Per-workspace
 * overrides land in a future ticket when paid tiers want 1080p.
 */
export async function transcodeMezzanine(
  input: TranscodeMezzanineInput,
): Promise<TranscodeMezzanineResult> {
  if (!input?.workspace_id) {
    throw new Error("[worker/media/transcodeMezzanine] workspace_id is required");
  }
  if (!input.asset_id) {
    throw new Error("[worker/media/transcodeMezzanine] asset_id is required");
  }
  parseS3Uri(input.input_uri);
  const outputUri = input.output_uri ?? mezzanineUri(input.workspace_id, input.asset_id);
  parseS3Uri(outputUri);
  const client = getStorage();
  const params: Record<string, string | number> = {
    vcodec: "libx264",
    preset: "veryfast",
    crf: 23,
    height: 720,
    acodec: "aac",
    audio_bitrate: "128k",
    movflags: "+faststart",
  };

  return withScratchDir(async (dir) => {
    const inPath = await downloadToTemp(client, input.input_uri, dir, "input.bin");
    const outPath = join(dir, "mezz.mp4");
    const args = [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inPath,
      // Video: H.264, capped at 720p tall, even pixel dims (encoder requirement).
      "-vf",
      "scale='trunc(min(720,ih)*iw/ih/2)*2:trunc(min(720,ih)/2)*2'",
      "-c:v",
      String(params["vcodec"]),
      "-preset",
      String(params["preset"]),
      "-crf",
      String(params["crf"]),
      // Audio: AAC 128 kbps, downmix to stereo if surround.
      "-c:a",
      String(params["acodec"]),
      "-b:a",
      String(params["audio_bitrate"]),
      "-ac",
      "2",
      // Container.
      "-movflags",
      String(params["movflags"]),
      outPath,
    ];
    const result = await runProcess(ffmpegBin, args);
    assertOk("ffmpeg transcodeMezzanine", result);

    await uploadFromTemp(client, outPath, outputUri, "video/mp4");

    // Re-probe the OUTPUT so we can persist the actual resolution
    // (which may have rounded due to the trunc/2*2 filter) and the
    // exact duration.
    const probe = await runProcess(ffprobeBin, [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      outPath,
    ]);
    assertOk("ffprobe (mezz output)", probe);

    interface OutProbe {
      format?: { duration?: string; size?: string };
      streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
    }
    const out = JSON.parse(probe.stdout) as OutProbe;
    const videoStream = (out.streams ?? []).find((s) => s.codec_type === "video");
    const sizeBytes = Number(out.format?.size ?? (await stat(outPath)).size);
    const durationS = Number(out.format?.duration ?? 0);
    return {
      workspace_id: input.workspace_id,
      output_uri: outputUri,
      size_bytes: sizeBytes,
      duration_ms: Math.round(durationS * 1000),
      width: videoStream?.width ?? 0,
      height: videoStream?.height ?? 0,
      params,
    };
  });
}

// ---- extractAudio ---------------------------------------------------------

export interface ExtractAudioInput {
  workspace_id: string;
  asset_id: string;
  input_uri: string;
  output_uri?: string;
}

export interface ExtractAudioResult {
  workspace_id: string;
  output_uri: string;
  size_bytes: number;
  duration_ms: number;
  /** Always 16000 (Whisper's expected rate). */
  sample_rate: number;
  /** Always 1 (Whisper requires mono). */
  channels: number;
  params: Record<string, string | number>;
}

/**
 * Pull the audio track out to a 16 kHz mono PCM WAV. This is the
 * shape Whisper.cpp expects (T-041), so emitting it at ingest time
 * means the transcription workflow does zero conversion work.
 *
 * If the input has no audio stream we still write a silent 1-second
 * placeholder rather than failing — silent assets (B-roll, slides)
 * are legitimate and downstream code can choose to skip transcription
 * based on the resulting size.
 */
export async function extractAudio(input: ExtractAudioInput): Promise<ExtractAudioResult> {
  if (!input?.workspace_id) {
    throw new Error("[worker/media/extractAudio] workspace_id is required");
  }
  if (!input.asset_id) {
    throw new Error("[worker/media/extractAudio] asset_id is required");
  }
  parseS3Uri(input.input_uri);
  const outputUri = input.output_uri ?? audioUri(input.workspace_id, input.asset_id);
  parseS3Uri(outputUri);
  const client = getStorage();
  const params: Record<string, string | number> = {
    sample_rate: 16000,
    channels: 1,
    codec: "pcm_s16le",
    format: "wav",
  };

  return withScratchDir(async (dir) => {
    const inPath = await downloadToTemp(client, input.input_uri, dir, "input.bin");
    const outPath = join(dir, "audio.wav");

    // Detect whether the input has an audio stream. If not, generate a
    // 1-second silent WAV via `anullsrc` so downstream code has a
    // consistent file to point at.
    const probe = await runProcess(ffprobeBin, [
      "-v",
      "error",
      "-select_streams",
      "a",
      "-show_entries",
      "stream=index",
      "-print_format",
      "json",
      inPath,
    ]);
    assertOk("ffprobe (audio check)", probe);
    interface AudioCheck {
      streams?: Array<{ index?: number }>;
    }
    const hasAudio = ((JSON.parse(probe.stdout) as AudioCheck).streams ?? []).length > 0;

    const args = hasAudio
      ? [
          "-y",
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          inPath,
          "-vn",
          "-ac",
          String(params["channels"]),
          "-ar",
          String(params["sample_rate"]),
          "-c:a",
          String(params["codec"]),
          outPath,
        ]
      : [
          "-y",
          "-hide_banner",
          "-loglevel",
          "error",
          "-f",
          "lavfi",
          "-i",
          `anullsrc=channel_layout=mono:sample_rate=${params["sample_rate"]}`,
          "-t",
          "1",
          "-c:a",
          String(params["codec"]),
          outPath,
        ];
    const result = await runProcess(ffmpegBin, args);
    assertOk("ffmpeg extractAudio", result);

    await uploadFromTemp(client, outPath, outputUri, "audio/wav");

    const outProbe = await runProcess(ffprobeBin, [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      outPath,
    ]);
    assertOk("ffprobe (wav output)", outProbe);
    interface WavProbe {
      format?: { duration?: string; size?: string };
    }
    const out = JSON.parse(outProbe.stdout) as WavProbe;
    return {
      workspace_id: input.workspace_id,
      output_uri: outputUri,
      size_bytes: Number(out.format?.size ?? (await stat(outPath)).size),
      duration_ms: Math.round(Number(out.format?.duration ?? 0) * 1000),
      sample_rate: Number(params["sample_rate"]),
      channels: Number(params["channels"]),
      params,
    };
  });
}

// ---- helpers re-exported for the workflow ---------------------------------

/**
 * Convenience: build the canonical mezzanine output URI. The workflow
 * calls this so the path convention lives in one place.
 */
export function mezzanineUri(workspaceId: string, assetId: string): string {
  const layout = defaultBucketLayout();
  return buildS3Uri(layout.derived, `${workspaceId}/${assetId}/mezz.mp4`);
}

/** Canonical 16 kHz mono WAV output URI. */
export function audioUri(workspaceId: string, assetId: string): string {
  const layout = defaultBucketLayout();
  return buildS3Uri(layout.derived, `${workspaceId}/${assetId}/audio.wav`);
}
