/**
 * services/worker/ai-cpu — entrypoint (T-021).
 *
 * Boots the `ai-cpu` pool worker. See arch §6.2.
 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runWorker, TaskQueue } from "../shared/index.js";
import * as activities from "./activities/index.js";

const here = dirname(fileURLToPath(import.meta.url));

await runWorker({
  taskQueue: TaskQueue.AiCpu,
  activities: activities as unknown as Record<string, (...args: never[]) => unknown>,
  workflowsPath: resolve(here, "workflows/index.ts"),
});
