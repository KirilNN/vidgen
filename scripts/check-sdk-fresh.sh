#!/usr/bin/env bash
# scripts/check-sdk-fresh.sh — fail CI if the generated SDK is out of date.
#
# Runs `scripts/gen-sdk.sh` then asserts the working tree is clean for the
# generated artifacts. Acceptance criterion of T-005: "Add a check in CI that
# fails if the generated SDK is out of date." Until T-002 adds CI, this is
# also runnable locally via `pnpm sdk:check`.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

bash scripts/gen-sdk.sh

paths=(
  "packages/sdk-ts/src/types.gen.ts"
)

if ! git diff --quiet --exit-code -- "${paths[@]}"; then
  echo
  echo "[check-sdk-fresh] generated SDK is out of date." >&2
  echo "[check-sdk-fresh] Run 'pnpm sdk:gen' and commit the result." >&2
  echo "[check-sdk-fresh] Diff:" >&2
  git --no-pager diff -- "${paths[@]}" >&2
  exit 1
fi

echo "[check-sdk-fresh] SDK is in sync with packages/openapi/openapi.yaml"
