# vidgen

Open-source, $0-cost, Docker-first video creation platform. The full engineering blueprint, product specs, and roadmap live in [`docs/`](docs/).

## Quickstart

```bash
nvm use            # Node 22 LTS (see .nvmrc)
corepack enable    # provides pnpm
pnpm install
pnpm dev           # runs `turbo run dev` across active workspaces
```

> The repo is currently a **monorepo skeleton** (ticket T-001). Real services land in subsequent tickets — see [`docs/tickets.md`](docs/tickets.md).

## Repository layout (per [`docs/architecture.md`](docs/architecture.md) §8.4)

```
apps/        web · mobile · extension · share          (user-facing)
services/    api · worker · mcp                        (server side)
packages/    sdk-ts · editor-core · caption-ui · ui    (shared libs)
infra/       compose · helm · terraform                (deployment)
scripts/                                               (repo scripts)
docs/        architecture, build plan, tickets, ADRs, specs
```

## Common scripts

| Script            | What it does                                 |
| ----------------- | -------------------------------------------- |
| `pnpm install`    | Install all workspaces                       |
| `pnpm dev`        | Turbo `dev` across workspaces (long-running) |
| `pnpm build`      | Turbo `build` across workspaces              |
| `pnpm lint`       | ESLint across workspaces                     |
| `pnpm type-check` | `tsc --noEmit` across workspaces             |
| `pnpm test`       | Test runners across workspaces               |
| `pnpm format`     | Prettier write across the repo               |

## Documentation map

Start here:

- [docs/agent-runbook.md](docs/agent-runbook.md) — how agents (human or AI) work in this repo.
- [docs/architecture.md](docs/architecture.md) — engineering blueprint. **Do not deviate without an ADR.**
- [docs/build-plan.md](docs/build-plan.md) — phased rollout + Definition of Done.
- [docs/tickets.md](docs/tickets.md) — the backlog (one ticket per agent session).
- [docs/decisions.md](docs/decisions.md) — ADRs you must honour. The top-level [`decisions.md`](decisions.md) is a pointer.
- [docs/product-specifications/](docs/product-specifications/) — 12 product specification documents.
- [docs/hosting-options.md](docs/hosting-options.md) · [docs/free-tier-catalog.md](docs/free-tier-catalog.md) — deploy/cost references.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for branch naming, commit conventions, and the ticket-driven workflow.
