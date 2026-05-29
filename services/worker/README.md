# @vidgen/worker

Temporal worker pools for vidgen (T-021).

The platform's long ops (ingest, transcribe, render, dub, clip-gen,
publish) run as Temporal workflows. Each workflow is routed to a task
queue named after the _capability class_ it needs (arch §6.2):

| Sub-package          | Task queue | Capabilities (advertised)                                   | Lands in container                 |
| -------------------- | ---------- | ----------------------------------------------------------- | ---------------------------------- |
| [`light/`](light/)   | `light`    | orchestration, REST calls, OAuth refreshes                  | `worker-light` (`core` profile)    |
| [`media/`](media/)   | `media`    | FFmpeg, MLT, Remotion (CPU-bound media ops)                 | `worker-media` (`media` profile)   |
| [`ai-cpu/`](ai-cpu/) | `ai-cpu`   | Whisper.cpp, Piper, Argos, RemBG, LaMa-CPU                  | `worker-ai-cpu` (`ai-cpu` profile) |
| [`ai-gpu/`](ai-gpu/) | `ai-gpu`   | XTTS, SAM 2, ProPainter, Wav2Lip/MuseTalk, Flux, large LLMs | `worker-ai-gpu` (`ai-gpu` profile) |

`shared/` holds the factory (`createWorker`), the task-queue + capability
constants, and the startup banner. Each pool only ships its own
activities — that's how a laptop without a GPU can run
`light + media + ai-cpu` without dragging CUDA into its container.

## Layout

```
services/worker/
  package.json             one workspace, four entrypoints (start:light, …)
  shared/
    index.ts               public surface
    create-worker.ts       createWorker({ taskQueue, activities, … })
    task-queues.ts         TaskQueue.Light / .Media / .AiCpu / .AiGpu
    capabilities.ts        capability constants per pool
    banner.ts              renderStartupBanner()
    logger.ts              pino-based logger (worker-friendly)
  light/   entrypoint.ts · activities/ · workflows/  ─┐
  media/   entrypoint.ts · activities/ · workflows/   │  task-queue
  ai-cpu/  entrypoint.ts · activities/ · workflows/   │  containers
  ai-gpu/  entrypoint.ts · activities/ · workflows/  ─┘
  __tests__/                                           shared unit tests
```

Activities + workflows are intentionally empty at T-021 — they're
filled in by the tickets that own each long op (T-031 ingest, T-040
transcribe, T-062 render, T-091 clip-gen, etc.).

## Run

Locally (against Temporal in the compose `core` profile):

```bash
# Bring up Temporal first
cd infra/compose && docker compose --profile core up -d

# In another shell — choose a pool to run on the host
pnpm --filter @vidgen/worker start:light
pnpm --filter @vidgen/worker start:media
pnpm --filter @vidgen/worker start:ai-cpu
pnpm --filter @vidgen/worker start:ai-gpu
```

Or via compose (covers the same as the four `start:*` invocations
above, in containers):

```bash
cd infra/compose
docker compose --profile core up -d                      # worker-light
docker compose --profile core --profile media up -d      # + worker-media
docker compose --profile core --profile media --profile ai-cpu up -d
docker compose --profile core --profile media --profile ai-cpu --profile ai-gpu up -d
```

Verify they show up as pollers in the Temporal UI
(`https://temporal.localhost`) or via `scripts/worker-smoke.sh`.

## Test

```bash
pnpm --filter @vidgen/worker lint
pnpm --filter @vidgen/worker type-check
pnpm --filter @vidgen/worker test
```

Tests cover `createWorker()` wiring, the task-queue constants, the
banner formatter, and the capability declarations. They do NOT spin up
a Temporal server — that's the smoke script's job.

## Adding an activity / workflow

1. Drop the activity in `services/worker/<pool>/activities/<name>.ts`
   and re-export from `services/worker/<pool>/activities/index.ts`.
2. (Workflows only) drop in `services/worker/<pool>/workflows/<name>.ts`
   and re-export from `services/worker/<pool>/workflows/index.ts`.
3. The pool's `entrypoint.ts` picks the new symbol up automatically
   because it imports `* as activities` / `workflowsPath: workflows`.

## Architecture references

- §6.1 Temporal as the spine — every long op is a workflow.
- §6.2 Worker pools — capability-class task queues; light / media /
  ai-cpu / ai-gpu.
- §11 — `workspace_id` propagates from the workflow input into every
  activity; the bus / DB plugin enforce it.
