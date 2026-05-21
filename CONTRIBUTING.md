# Contributing to vidgen

> Read [`docs/agent-runbook.md`](docs/agent-runbook.md) first — it is the operating manual for both humans and AI agents on this repo.

## Prerequisites

- **Node 22 LTS** (via `nvm`/`fnm`; pinned in [`.nvmrc`](.nvmrc)).
- **pnpm 9** (`corepack enable` + `corepack prepare pnpm@9 --activate`).
- **Docker** with Compose v2 for stacks added in later tickets.

## Workflow

1. **Pick a ticket** from [`docs/tickets.md`](docs/tickets.md). Verify all upstream tickets in `Depends on` are merged to `main`.
2. **Branch off `main`** using the pattern `t-<NNN>-<short-slug>` (e.g. `t-007-tus-uploader`).
3. **Stay inside the ticket's `Files:` list.** If you must touch something else, justify it in the PR body.
4. **Honour the hard rules** (also enumerated in `docs/agent-runbook.md` §1):
   - Follow [`docs/architecture.md`](docs/architecture.md) for every tech choice. Substitutions require a new ADR in [`docs/decisions.md`](docs/decisions.md).
   - Multi-tenant from day 1: every new table has `workspace_id`; every new endpoint asserts the caller's workspace; every new object-storage key is prefixed with `workspace_id`.
   - **$0 cost** on the default code path. Hosted APIs go behind adapters with local/OSS defaults.
   - Postgres / Supabase store **metadata only**. Media bytes live in object storage (MinIO local / R2 cloud).
   - Async by default for long ops (use Temporal workflows, never block a request).
   - Every AI output links back to its source moment (`media_id + offset_ms`).
5. **Local checks must pass before pushing:**
   ```bash
   pnpm install
   pnpm turbo run lint type-check
   pnpm turbo run test build   # once tests/builds exist
   make smoke                  # once smoke is wired (T-002)
   ```
6. **Open a PR** titled `T-<NNN>: <ticket title>`. The PR body must include:
   - Link to the ticket section in `docs/tickets.md`.
   - Acceptance-criteria checklist with evidence (log output, screenshot, file path).
   - Definition-of-Done checklist from [`docs/build-plan.md`](docs/build-plan.md).
   - Architecture-section references for each tech choice.
   - List of tickets unblocked by this one.

## Branch protection (on `main`)

- PR required, 1 review, conversation resolution, CI green.
- Force-pushes and deletions disabled.

## Commit conventions

Conventional Commits are recommended (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `ci:`, `test:`). Reference the ticket ID in the body when relevant (e.g. `Refs T-007`).

## Code style

- TypeScript strict (root [`tsconfig.base.json`](tsconfig.base.json) — workspaces extend it).
- ESLint 9 flat config + Prettier 3. Run `pnpm lint:fix` and `pnpm format`.
- Editor settings come from [`.editorconfig`](.editorconfig).

## Reporting blockers (per agent-runbook §6)

If an OSS choice in `architecture.md` is impractical or two tickets conflict: **do not improvise.** Open a draft PR with what you have, add a proposed ADR (status `proposed`) to `docs/decisions.md`, and tag the human reviewer.
