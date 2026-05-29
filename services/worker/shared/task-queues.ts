/**
 * services/worker/shared — task queue names (T-021).
 *
 * Workflows route to a task queue by capability class (arch §6.2). The
 * names below are the on-the-wire strings Temporal sees; keep them
 * stable — changing one is a breaking change for every workflow that
 * targets it.
 *
 * Architecture refs:
 * - §6.2 — capability-class task queues.
 */

/**
 * Canonical task queue names. Use the constants instead of inlining
 * literals so a rename is a one-file change and TypeScript catches
 * typos at every call site.
 */
export const TaskQueue = {
  /** Orchestration, REST calls, OAuth refreshes — small, many replicas. */
  Light: "light",
  /** FFmpeg / MLT / Remotion — CPU-heavy media transforms. */
  Media: "media",
  /** Whisper.cpp, Piper, Argos, RemBG, LaMa-CPU — CPU AI/ML. */
  AiCpu: "ai-cpu",
  /** XTTS, SAM 2, ProPainter, Wav2Lip/MuseTalk, Flux, large LLMs — GPU. */
  AiGpu: "ai-gpu",
} as const;

export type TaskQueueName = (typeof TaskQueue)[keyof typeof TaskQueue];

/** Every task queue, in deterministic order (handy for tests + logs). */
export const ALL_TASK_QUEUES: readonly TaskQueueName[] = Object.freeze([
  TaskQueue.Light,
  TaskQueue.Media,
  TaskQueue.AiCpu,
  TaskQueue.AiGpu,
]);
