/**
 * services/worker/ai-gpu — entrypoint (T-021).
 *
 * Boots the `ai-gpu` pool worker. See arch §6.2.
 *
 * GPU detection: the GPU is allocated via compose.gpu.override.yml
 * (T-003). This entrypoint doesn't probe the GPU itself — that's the
 * job of the activities that actually touch CUDA / Metal / ROCm.
 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runWorker, TaskQueue } from "../shared/index.js";
import * as activities from "./activities/index.js";

const here = dirname(fileURLToPath(import.meta.url));

await runWorker({
  taskQueue: TaskQueue.AiGpu,
  activities: activities as unknown as Record<string, (...args: never[]) => unknown>,
  workflowsPath: resolve(here, "workflows/index.ts"),
});
