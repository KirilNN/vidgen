# infra/

Operational assets, not pnpm workspaces.

- `compose/` — Docker Compose stack with profiles per arch §4.1 (scaffolded in T-003; see [`compose/README.md`](compose/README.md)).
- `helm/` — Kubernetes charts for paid / multi-node deployments (arch §13).
- `terraform/` — Optional IaC for cloud paths.
