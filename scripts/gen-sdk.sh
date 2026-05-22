#!/usr/bin/env bash
# scripts/gen-sdk.sh — regenerate `@vidgen/sdk-ts` types from the OpenAPI spec.
#
# Single entry point used both by humans (`pnpm sdk:gen`) and CI
# (`pnpm sdk:check`, which calls this then git-diffs the result).
#
# Architecture refs:
# - arch §3.10 OpenAPI is the contract; SDK is generated.
#
# Behaviour:
# - Runs `openapi-typescript` via pnpm so dependency resolution stays
#   inside the workspace (no global install required).
# - Idempotent: same spec in → same `types.gen.ts` out, byte-for-byte.
#   The CI freshness check (`scripts/check-sdk-fresh.sh`) relies on this.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

spec="packages/openapi/openapi.yaml"
out="packages/sdk-ts/src/types.gen.ts"

if [[ ! -f "$spec" ]]; then
  echo "[gen-sdk] missing spec: $spec" >&2
  exit 1
fi

echo "[gen-sdk] $spec → $out"
pnpm --silent --filter @vidgen/sdk-ts exec openapi-typescript "$repo_root/$spec" -o "$repo_root/$out"
echo "[gen-sdk] done"
