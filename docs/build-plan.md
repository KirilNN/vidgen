# Build Plan — $0, Docker-Native, Local **or** Managed Free-Tier

> Companion to `architecture.md` (engineering blueprint), `product-specifications/` (PRDs), `hosting-options.md` (deploy modes), and `decisions.md` (ADRs).
> This plan turns those into an ordered build for an AI-agent-driven implementation team.

## Deployment modes

The same codebase runs in two modes (see `hosting-options.md` for the full comparison):

- **Mode A — Local / Self-host.** `docker compose up` on laptop or single VPS (Oracle Always Free A1). All OSS. The default for development and the cheapest at scale.
- **Mode B — Hybrid managed free-tier.** Cloudflare Pages (web), Supabase (Postgres + Auth, **metadata only**), Cloudflare R2 (all media), Upstash (cache), Resend (email), Sentry/PostHog free. Data-plane (API, workers, AI, render) runs on owner hardware or Oracle Always Free behind Cloudflare Tunnel. The fastest path to a public demo at $0.

Both modes share the same code — mode is chosen by **env vars selecting which adapter is active**. The adapter interfaces are defined in arch §7.2 and implemented in `services/api/src/adapters/`. Switching modes is config, not refactor.

## Guiding rules (read first, every agent)

1. **Follow `architecture.md` for every technology choice.** No deviations without a written ADR in `decisions.md`.
2. **Local-first runnable.** Anything that won't run via `docker compose --profile core --profile media --profile ai-cpu up` on a 16 GB MacBook **without a GPU** fails the ticket. Mode B is an *additional* target, not a replacement.
3. **OSS-only on the default code path.** Hosted/managed services are pluggable adapters behind interfaces (arch §7.2). Default tier = local.
4. **No vendor SDK in business logic.** Adapters live in `services/api/src/adapters/{storage,auth,cache,llm,asr,notifier,db}/` and `services/worker/*/adapters/`. Business logic imports the interface only.
5. **Postgres / Supabase store metadata only.** All media bytes (raw, derived, thumbnails, HLS segments, public share assets) live in object storage (MinIO local / R2 cloud). The browser/player fetches media directly from object storage, never proxied through the API or DB layer. See `hosting-options.md` §5.
6. **Multi-tenant from day 1.** Every row, every bucket prefix, every queue task is tagged with `workspace_id` (arch §11).
7. **Async by default.** Long ops are Temporal workflows, never in-request. See arch §6.
8. **One artifact, many renditions.** Source media immutable; everything else rebuildable. (arch E2)
9. **Every AI output links to source moment.** `media_id + offset_ms`. (arch E8)
10. **`make smoke` must pass after every phase**, both in Mode A (full local) and in Mode B (against managed services using `.env.cloud`).
11. **Don't reinvent.** If an OSS project exists, use it. Custom code only at seams.

## Phase map (ordered; each phase is an epic of tickets)

| Phase | Epic | Goal | Build-order ref |
|---|---|---|---|
| 0 | **Bootstrap** | Monorepo, CI, base Docker compose with empty stack | arch §4, §8.4 |
| 1 | **Core infra up** | Postgres + RLS + MinIO + Keycloak + Caddy + API + Web shell login | arch §15.1 |
| 2 | **Workflow plane** | Temporal + worker pools + event bus (NATS) + Novu | arch §6, §10-events |
| 3 | **Ingest** | tus upload → IngestAssetWorkflow → mezzanine transcode → MinIO | arch §3.1, §5.3 |
| 4 | **Transcription** | Whisper.cpp → transcripts table → words/segments | arch §3.2 (F2.4) |
| 5 | **Browser recorder** | MediaRecorder + crash recovery + tus upload (F1.1) | spec F1.1 |
| 6 | **Text-based editor + render** | Transcript editor UI + edit ops + MLT/Remotion render → MP4 | arch §15.3, F2.1, F2.2 |
| 7 | **AI Co-pilot** | Ollama + LangGraph + tool catalog (F2.6) | arch §3.2, §15.6 |
| 8 | **Enhance** | DeepFilterNet + Demucs (F4.1) + filler/silence remove (F4.2) | arch §3.4 |
| 9 | **Captions + clip generator** | Remotion captions + clip generator workflow (F2.5, F6.6, F6.7) | arch §3.6, §3.2 |
| 10 | **Distribute** | Public share URL + HLS + embed + view counter (F7.1, F7.2) | arch §3.7, §10 |
| 11 | **Realtime collab** | Yjs + Hocuspocus on transcript + timeline (F8.2) | arch §9 |
| 12 | **Trust & Ops** | Audit log hash-chain + webhooks + OTel + GlitchTip + Uptime Kuma | arch §11, §12 |
| 13 | **Translate + Dub** | MADLAD + XTTS + MuseTalk pipeline (F5.x) | arch §3.5, §15.7 |
| 14 | **Mobile + QR pairing** | Expo capture + tus + QR mobile→desktop (F1.5, F1.6) | arch §8.2, §15.8 |
| 15 | **Vertical packs + brand kit** | JSON pack loader + brand kit lite (F8.1, F11.x) | arch §3.11, §3.8 |
| Deploy | **Mode-B hybrid managed-free-tier deploy** | Cloudflare Pages + Supabase + R2 + Upstash + Sentry + Helicone + Grafana Cloud + Oracle A1 data plane | `hosting-options.md`, `free-tier-catalog.md` |

Phases 0–10 = the **public-beta-ready R1 wedge** (text editor + clip gen + share, per execution plan §4).
Phases 11–15 = R1 polish + R2/R4 enablers (collab, trust posture, multilingual, mobile, vertical packs).
Deploy phase (T-210 → T-220) = independent of feature build; can begin once Phase 1 (core infra) compiles, runs in parallel.

## Smoke test (gates every phase)

`make smoke` exercises:

1. Login → create workspace (Keycloak admin API).
2. Upload sample 30 s MP4 via tus.
3. Whisper transcript appears within N seconds.
4. Issue text-edit op via REST (delete 2 words).
5. Render to MP4 via MLT.
6. Verify output checksum.
7. (Phase ≥9) Translate captions to Spanish via MADLAD.
8. (Phase ≥9) Generate a vertical short clip.

Smoke runs locally and in GitHub Actions on every PR.

## How tickets are structured

See `tickets.md`. Each ticket is a self-contained prompt for one AI agent. Format:

- **ID** (e.g., `T-007`) and **title**
- **Phase / epic**
- **Depends on** (ticket IDs that must be done first)
- **Files / paths** the ticket should touch
- **Context** (key arch §s and spec IDs to read)
- **Task** (what to build, in implementation-ready language)
- **Acceptance criteria** (verifiable)
- **Out of scope** (so the agent doesn't expand)

Tickets are sized to be completable in one focused session (target: < 1 day of agent work each). Larger items are split.

## Parallelism

Within a phase, any tickets that share no `Depends on` link can run in parallel. The `tickets.md` dependency graph is the source of truth — agents (or a dispatcher) should pick the next ticket whose deps are all `done`.

## Definition of done (every ticket)

1. Code merged to `main` with passing CI (lint + type-check + unit tests + `make smoke`).
2. New components have a `README.md` next to them (1 page: purpose, run, test).
3. Any new env vars added to `.env.example`.
4. Any new container added to the matching docker-compose profile.
5. Any new REST endpoint added to the OpenAPI spec and regenerates the SDK cleanly.
6. Multi-tenant assertion: a written check (test or assertion) that the resource is gated by `workspace_id`.

---

*End of build plan. See `tickets.md` for the work items.*
