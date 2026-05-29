/**
 * services/worker/shared — capability tagging (T-021).
 *
 * Each worker pool advertises the capabilities it offers so operators
 * (and future routing logic) can see at a glance what a given replica
 * can do. The capability list is purely informational at T-021 —
 * Temporal routes by task queue, not by capability — but the strings
 * are stable so later tickets can use them in search attributes or in
 * per-capability HPA scaling rules without renaming.
 *
 * Architecture refs:
 * - §6.2 — "each worker advertises capabilities".
 */
import { TaskQueue, type TaskQueueName } from "./task-queues.js";

/**
 * Capabilities advertised by each pool. Strings are kept short,
 * lowercase, kebab-case so they're safe to use as label values in
 * Prometheus / OTel / Temporal search attributes.
 */
export const PoolCapabilities: Readonly<Record<TaskQueueName, readonly string[]>> = Object.freeze({
  [TaskQueue.Light]: Object.freeze(["orchestration", "rest", "oauth-refresh"]),
  [TaskQueue.Media]: Object.freeze(["ffmpeg", "mlt", "remotion"]),
  [TaskQueue.AiCpu]: Object.freeze(["whisper-cpu", "piper", "argos", "rembg", "lama-cpu"]),
  [TaskQueue.AiGpu]: Object.freeze([
    "xtts",
    "sam2",
    "propainter",
    "wav2lip",
    "musetalk",
    "flux",
    "llama-large",
  ]),
});

/**
 * Convenience accessor — returns the capability list for a task queue
 * or throws if asked for an unknown queue (callers can't silently
 * advertise nothing).
 */
export function capabilitiesFor(taskQueue: TaskQueueName): readonly string[] {
  const caps = PoolCapabilities[taskQueue];
  if (!caps) {
    throw new Error(`[worker] no capability list registered for task queue "${taskQueue}"`);
  }
  return caps;
}
