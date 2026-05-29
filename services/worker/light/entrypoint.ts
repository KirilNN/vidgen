/**
 * services/worker/light — entrypoint (T-021).
 *
 * Boots the `light` pool worker: polls the `light` task queue, runs
 * the activities exported by `./activities`, and (when filled) the
 * workflows exported by `./workflows`. See arch §6.2.
 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runWorker, TaskQueue } from "../shared/index.js";
import * as activities from "./activities/index.js";

const here = dirname(fileURLToPath(import.meta.url));

await runWorker({
  taskQueue: TaskQueue.Light,
  activities: activities as unknown as Record<string, (...args: never[]) => unknown>,
  // .ts not .js — workers run via tsx (no precompiled output on disk).
  // Temporal's WorkflowCodeBundler `statSync`s this path literally.
  workflowsPath: resolve(here, "workflows/index.ts"),
});
