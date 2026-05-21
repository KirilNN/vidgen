#!/usr/bin/env node
/**
 * Guarded husky installer.
 *
 * `husky install` (now `husky` in v9) should only run in a developer's local
 * working tree. Skip it when:
 *   - running in CI (CI=true, set by GitHub Actions)
 *   - running in a non-git checkout (e.g. inside a docker build context)
 *   - the user has set HUSKY=0 to opt out
 *
 * This keeps `pnpm install --frozen-lockfile` from failing in CI / Docker.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

if (process.env.CI) process.exit(0);
if (process.env.HUSKY === "0") process.exit(0);
if (!existsSync(resolve(process.cwd(), ".git"))) process.exit(0);

const result = spawnSync("husky", [], { stdio: "inherit", shell: true });
process.exit(result.status ?? 0);
