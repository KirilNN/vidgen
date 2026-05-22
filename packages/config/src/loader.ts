import { existsSync } from "node:fs";
import { join } from "node:path";
import dotenvFlow from "dotenv-flow";

/**
 * Load layered `.env*` files using `dotenv-flow` exactly once per process.
 *
 * Layering order (last wins on conflicts):
 *   .env  →  .env.local  →  .env.{NODE_ENV}  →  .env.{NODE_ENV}.local
 *
 * `.env.local` is git-ignored by convention. Only `.env.example` is committed.
 *
 * The function is a no-op when:
 * - already invoked in this process (idempotent), or
 * - `CONFIG_SKIP_DOTENV=1` is set (tests / containers that inject env directly)
 *
 * Search order for the env directory:
 * 1. explicit `cwd` argument
 * 2. `CONFIG_ENV_DIR` env var
 * 3. nearest ancestor of `process.cwd()` that contains `.env.example`
 * 4. `process.cwd()` (fallback)
 */
let loaded = false;

export function loadEnvOnce(cwd?: string): void {
  if (loaded) return;
  if (process.env["CONFIG_SKIP_DOTENV"] === "1") {
    loaded = true;
    return;
  }
  const dir = cwd ?? process.env["CONFIG_ENV_DIR"] ?? findRepoRoot();
  dotenvFlow.config({ path: dir, silent: true });
  loaded = true;
}

/**
 * Test-only: reset the memoisation flag so unit tests can re-load.
 * @internal
 */
export function __resetLoadedForTests(): void {
  loaded = false;
}

function findRepoRoot(): string {
  let dir = process.cwd();
  for (let depth = 0; depth < 10; depth++) {
    if (existsSync(join(dir, ".env.example")) || existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}
