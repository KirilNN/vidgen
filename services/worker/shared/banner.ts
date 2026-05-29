/**
 * services/worker/shared — startup banner formatter (T-021).
 *
 * Pure function so it's trivially unit-testable; the entrypoints log
 * its output via pino on boot. The banner is the only "human-readable
 * proof of life" the worker emits before it starts polling Temporal —
 * operators eyeballing `docker logs vidgen-worker-light` need this to
 * confirm the right pool launched with the right capabilities.
 *
 * Architecture refs:
 * - §6.2 — "Each [worker] prints a startup banner with its declared
 *   capabilities" (T-021 acceptance text).
 */
import type { TaskQueueName } from "./task-queues.js";

export interface BannerOptions {
  taskQueue: TaskQueueName;
  capabilities: readonly string[];
  temporalAddress: string;
  temporalNamespace: string;
  /** Optional — defaults to `process.env.npm_package_version` or "0.0.0". */
  version?: string;
}

/**
 * Render a multi-line banner. Stable format so it's grep-able from
 * smoke scripts:
 *
 *   ┌─ vidgen worker (light) ─────────────────────────────────────┐
 *   │ version       : 0.0.0
 *   │ task queue    : light
 *   │ capabilities  : orchestration, rest, oauth-refresh
 *   │ temporal      : temporal:7233 / app
 *   └─────────────────────────────────────────────────────────────┘
 */
export function renderStartupBanner(opts: BannerOptions): string {
  const version = opts.version ?? process.env["npm_package_version"] ?? "0.0.0";
  const lines = [
    `┌─ vidgen worker (${opts.taskQueue}) ─────────────────────────────────────┐`,
    `│ version       : ${version}`,
    `│ task queue    : ${opts.taskQueue}`,
    `│ capabilities  : ${opts.capabilities.join(", ")}`,
    `│ temporal      : ${opts.temporalAddress} / ${opts.temporalNamespace}`,
    `└─────────────────────────────────────────────────────────────┘`,
  ];
  return lines.join("\n");
}
