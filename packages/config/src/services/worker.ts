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

    MINIO_ENDPOINT: z.string().url().optional(),
    MINIO_ROOT_USER: z.string().min(1).optional(),
    MINIO_ROOT_PASSWORD: z.string().min(1).optional(),
    MINIO_REGION: z.string().min(1).default("us-east-1"),

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
