/**
 * services/worker/shared — createWorker factory (T-021).
 *
 * Single source of truth for "how do we boot a Temporal worker". Each
 * pool's `entrypoint.ts` calls this with its own task queue + activity
 * registry + workflow bundle path. The factory handles:
 *   - connecting to Temporal via `NativeConnection`
 *   - constructing the Worker with workflows + activities
 *   - logging a startup banner with the capability advertisement
 *   - wiring SIGINT/SIGTERM to a graceful drain
 *
 * Architecture refs:
 * - §6.1 — Temporal as the spine.
 * - §6.2 — capability-tagged task queues (light/media/ai-cpu/ai-gpu).
 *
 * IMPORTANT: workflows MUST be loaded by `workflowsPath` (a filesystem
 * path), NOT by importing them directly. Temporal bundles workflows
 * with a sandboxed loader that strips Node globals; importing them
 * into the entrypoint module would break that contract. The shape of
 * `WorkerOptions.workflowsPath` documents this in the SDK.
 */
import { NativeConnection, Worker, type WorkerOptions } from "@temporalio/worker";
import { renderStartupBanner } from "./banner.js";
import { buildLogger } from "./logger.js";
import { capabilitiesFor } from "./capabilities.js";
import { type TaskQueueName } from "./task-queues.js";

export interface CreateWorkerOptions {
  /** Task queue this worker polls. Use a `TaskQueue.*` constant. */
  taskQueue: TaskQueueName;
  /**
   * Map of activity functions. Pool entrypoints `import * as activities`
   * from their `activities/index.ts` and pass it straight through.
   */
  activities: Record<string, (...args: never[]) => unknown>;
  /**
   * Absolute filesystem path to the workflows module (its index.ts).
   * Loaded by Temporal's workflow sandbox. Omit only for activity-only
   * workers (none today, but the AI-GPU pool may end up that way once
   * we split orchestration from heavy inference).
   */
  workflowsPath?: string;
  /** Temporal frontend address — defaults to `TEMPORAL_ADDRESS` env. */
  temporalAddress?: string;
  /** Temporal namespace — defaults to `TEMPORAL_NAMESPACE` env (or "app"). */
  temporalNamespace?: string;
  /**
   * Identity surfaced in Temporal's poller listing. Defaults to
   * `vidgen-worker-{taskQueue}@{hostname}-{pid}`; override for tests.
   */
  identity?: string;
  /** Override worker SDK options (advanced; mostly for tests). */
  overrides?: Partial<WorkerOptions>;
}

export interface BootedWorker {
  /** The underlying SDK Worker; call `.run()` to start polling. */
  worker: Worker;
  /** Closes the worker AND the connection. Safe to call twice. */
  shutdown(): Promise<void>;
}

/**
 * Build (but do not start) a configured Temporal worker. The caller
 * decides when to call `worker.run()` — the unit tests want a fully
 * constructed worker without ever polling, so we keep boot and run
 * separate.
 */
export async function createWorker(opts: CreateWorkerOptions): Promise<BootedWorker> {
  const log = buildLogger(opts.taskQueue);
  const capabilities = capabilitiesFor(opts.taskQueue);
  const temporalAddress =
    opts.temporalAddress ?? process.env["TEMPORAL_ADDRESS"] ?? "temporal:7233";
  const temporalNamespace =
    opts.temporalNamespace ?? process.env["TEMPORAL_NAMESPACE"] ?? "default";
  const identity =
    opts.identity ??
    `vidgen-worker-${opts.taskQueue}@${process.env["HOSTNAME"] ?? "local"}-${process.pid}`;

  log.info({ temporalAddress, temporalNamespace, capabilities }, "connecting to Temporal frontend");

  const connection = await NativeConnection.connect({ address: temporalAddress });

  const workerOptions: WorkerOptions = {
    connection,
    namespace: temporalNamespace,
    taskQueue: opts.taskQueue,
    activities: opts.activities,
    identity,
    // `buildId` is the worker's deployment marker for Temporal Workflow
    // Versioning. Reusing the task queue + identity keeps things simple
    // at T-021; later tickets that introduce breaking workflow changes
    // can switch to `useVersioning: true`.
    buildId: `vidgen-worker-${opts.taskQueue}-${process.env["npm_package_version"] ?? "0.0.0"}`,
    ...(opts.workflowsPath ? { workflowsPath: opts.workflowsPath } : {}),
    ...(opts.overrides ?? {}),
  };

  const worker = await Worker.create(workerOptions);

  // Banner goes to stdout via the logger so it's captured by docker
  // logs / Loki the same way the rest of the worker output is.
  for (const line of renderStartupBanner({
    taskQueue: opts.taskQueue,
    capabilities,
    temporalAddress,
    temporalNamespace,
  }).split("\n")) {
    log.info(line);
  }

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info("shutting down worker");
    try {
      worker.shutdown();
    } catch (err) {
      log.error({ err }, "worker.shutdown() threw");
    }
    try {
      await connection.close();
    } catch (err) {
      log.error({ err }, "connection.close() threw");
    }
  };

  return { worker, shutdown };
}

/**
 * Convenience boot-and-run helper used by every pool entrypoint.
 * Installs SIGINT/SIGTERM handlers and awaits `worker.run()`. Exits
 * the process non-zero on unexpected failure so docker-compose can
 * restart per its `restart: unless-stopped` policy.
 */
export async function runWorker(opts: CreateWorkerOptions): Promise<void> {
  const log = buildLogger(opts.taskQueue);
  let booted: BootedWorker;
  try {
    booted = await createWorker(opts);
  } catch (err) {
    log.error({ err }, "failed to construct worker");
    process.exit(1);
  }

  const onSignal = (signal: NodeJS.Signals) => {
    log.info({ signal }, "received signal");
    void booted.shutdown();
  };
  process.once("SIGINT", () => onSignal("SIGINT"));
  process.once("SIGTERM", () => onSignal("SIGTERM"));

  try {
    await booted.worker.run();
    log.info("worker exited cleanly");
  } catch (err) {
    log.error({ err }, "worker run loop crashed");
    process.exitCode = 1;
  } finally {
    await booted.shutdown();
  }
}
