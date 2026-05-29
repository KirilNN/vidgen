/**
 * services/worker — shared module tests (T-021).
 *
 * Network-free unit tests for the pure helpers. The actual Temporal
 * SDK boot is covered by `scripts/worker-smoke.sh` against a live
 * Temporal cluster.
 */
import { describe, expect, it } from "vitest";
import {
  ALL_TASK_QUEUES,
  PoolCapabilities,
  TaskQueue,
  capabilitiesFor,
  renderStartupBanner,
} from "../shared/index.js";
import * as lightActivities from "../light/activities/index.js";
import * as mediaActivities from "../media/activities/index.js";
import * as aiCpuActivities from "../ai-cpu/activities/index.js";
import * as aiGpuActivities from "../ai-gpu/activities/index.js";

describe("TaskQueue constants", () => {
  it("matches the four canonical capability classes from arch §6.2", () => {
    expect(new Set(ALL_TASK_QUEUES)).toEqual(new Set(["light", "media", "ai-cpu", "ai-gpu"]));
  });

  it("exposes every task queue via PoolCapabilities", () => {
    for (const queue of ALL_TASK_QUEUES) {
      expect(PoolCapabilities[queue]).toBeDefined();
      expect(PoolCapabilities[queue].length).toBeGreaterThan(0);
    }
  });

  it("capabilitiesFor returns the expected pool advertisements", () => {
    expect(capabilitiesFor(TaskQueue.Light)).toEqual(["orchestration", "rest", "oauth-refresh"]);
    expect(capabilitiesFor(TaskQueue.Media)).toEqual(["ffmpeg", "mlt", "remotion"]);
    expect(capabilitiesFor(TaskQueue.AiCpu)).toContain("whisper-cpu");
    expect(capabilitiesFor(TaskQueue.AiGpu)).toContain("xtts");
  });

  it("capabilitiesFor throws for unknown queues", () => {
    expect(() => capabilitiesFor("totally-fake" as never)).toThrowError(
      /no capability list registered/,
    );
  });
});

describe("renderStartupBanner", () => {
  it("includes the task queue, capabilities, and Temporal coords", () => {
    const banner = renderStartupBanner({
      taskQueue: TaskQueue.Light,
      capabilities: capabilitiesFor(TaskQueue.Light),
      temporalAddress: "temporal:7233",
      temporalNamespace: "app",
      version: "1.2.3",
    });
    expect(banner).toContain("vidgen worker (light)");
    expect(banner).toContain("task queue    : light");
    expect(banner).toContain("orchestration, rest, oauth-refresh");
    expect(banner).toContain("temporal      : temporal:7233 / app");
    expect(banner).toContain("version       : 1.2.3");
  });

  it("falls back to npm_package_version when no version is supplied", () => {
    const before = process.env["npm_package_version"];
    process.env["npm_package_version"] = "9.9.9";
    try {
      const banner = renderStartupBanner({
        taskQueue: TaskQueue.Media,
        capabilities: ["ffmpeg"],
        temporalAddress: "temporal:7233",
        temporalNamespace: "app",
      });
      expect(banner).toContain("9.9.9");
    } finally {
      if (before === undefined) delete process.env["npm_package_version"];
      else process.env["npm_package_version"] = before;
    }
  });
});

describe("pool activity registries", () => {
  // Each pool ships a `ping` activity that enforces workspace_id
  // (multi-tenant rule, arch §11). Verifying every pool keeps this
  // contract is the cheapest possible regression guard against a
  // future change that drops the assertion.
  const registries = {
    light: lightActivities,
    media: mediaActivities,
    "ai-cpu": aiCpuActivities,
    "ai-gpu": aiGpuActivities,
  } as const;

  for (const [pool, mod] of Object.entries(registries)) {
    it(`${pool}: exports a workspace_id-asserting ping activity`, async () => {
      const ping = (mod as { ping?: (i: { workspace_id?: string }) => Promise<unknown> }).ping;
      expect(typeof ping).toBe("function");
      await expect(ping!({})).rejects.toThrow(/workspace_id is required/);
      const out = (await ping!({ workspace_id: "ws_test" })) as {
        ok: true;
        workspace_id: string;
        taskQueue: string;
      };
      expect(out.ok).toBe(true);
      expect(out.workspace_id).toBe("ws_test");
      expect(out.taskQueue).toBe(pool);
    });
  }
});
