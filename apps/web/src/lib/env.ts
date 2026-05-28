/**
 * Web app env access — single source of truth for `apps/web`. Re-exports
 * `loadWebConfig` from `@vidgen/config` so route handlers can import once
 * and we keep a single place to swap implementations later.
 *
 * IMPORTANT: only call `getWebConfig()` inside route handlers / server
 * actions. Never at module top-level — Next.js evaluates module top-level
 * at build time and the env is not populated then.
 */
import { loadWebConfig, type WebConfig } from "@vidgen/config/web";

let cached: WebConfig | undefined;

export function getWebConfig(): WebConfig {
  cached ??= loadWebConfig();
  return cached;
}

// Internal helper for tests that need to override the cached config.
export function __resetWebConfigForTests(): void {
  cached = undefined;
}
