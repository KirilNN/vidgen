import { z } from "zod";
import { commonEnvSchema, portSchema, refuseDevSentinelsInProduction } from "../common.js";
import { loadEnvOnce } from "../loader.js";
import { zodErrorToConfigError } from "../format.js";

/**
 * Environment schema for `services/worker` (Temporal worker pool).
 *
 * Architecture refs:
 * - arch §6 async by default → TEMPORAL_* is required
 * - arch §5.1 / §10 storage adapters → MINIO_* for media bytes
 */
export const workerEnvSchema = refuseDevSentinelsInProduction(
  commonEnvSchema.extend({
    TEMPORAL_ADDRESS: z.string().min(1).default("temporal:7233"),
    TEMPORAL_NAMESPACE: z.string().min(1).default("default"),

    POSTGRES_HOST: z.string().min(1).optional(),
    POSTGRES_PORT: portSchema.default(5432),
    POSTGRES_USER: z.string().min(1).optional(),
    POSTGRES_PASSWORD: z.string().min(1).optional(),
    POSTGRES_DB: z.string().min(1).optional(),

    // ---- T-032 ffmpeg activities ------------------------------------
    // MinIO connection: required for media activities. The S3 client
    // helper in `services/worker/shared/storage.ts` reads these
    // directly so the worker can talk to MinIO (Mode A) or R2 (Mode B).
    MINIO_ENDPOINT: z.string().url().optional(),
    MINIO_ROOT_USER: z.string().min(1).optional(),
    MINIO_ROOT_PASSWORD: z.string().min(1).optional(),
    MINIO_REGION: z.string().min(1).default("us-east-1"),
    MINIO_BUCKET_RAW: z.string().min(1).default("media-raw"),
    MINIO_BUCKET_DERIVED: z.string().min(1).default("media-derived"),
    MINIO_BUCKET_CHUNKS: z.string().min(1).default("media-chunks"),
    MINIO_BUCKET_PUBLIC: z.string().min(1).default("public"),

    // ---- T-031 finalize-upload / publish-event ----------------------
    // The light pool's IngestAssetWorkflow calls back into the API for
    // metadata writes (assets / renditions) — see services/api/src/
    // routes/internal.ts. Reuses APP_SECRET as the shared HMAC token
    // by default so the dev path needs zero extra config.
    API_INTERNAL_URL: z.string().url().optional(),
    API_INTERNAL_TOKEN: z
      .string()
      .min(16)
      .optional()
      .or(z.literal("").transform(() => undefined)),

    REDIS_URL: z.string().url().optional(),
    NATS_URL: z.string().url().optional(),
    OLLAMA_HOST: z.string().url().optional(),
  }),
);

export type WorkerConfig = z.infer<typeof workerEnvSchema>;

export function parseWorkerEnv(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const result = workerEnvSchema.safeParse(env);
  if (!result.success) {
    throw zodErrorToConfigError("worker", result.error);
  }
  return Object.freeze(result.data) as WorkerConfig;
}

export function loadWorkerConfig(): WorkerConfig {
  loadEnvOnce();
  return parseWorkerEnv(process.env);
}
