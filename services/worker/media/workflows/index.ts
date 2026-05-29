/**
 * services/worker/media — workflow registry (T-021).
 *
 * Media pool runs mostly activities (called by orchestration workflows
 * in `light/`). If a workflow is *purely* media (e.g. a multi-step
 * render fan-out that should pin to media replicas) it lives here.
 *
 * Empty at T-021.
 */
export {};
