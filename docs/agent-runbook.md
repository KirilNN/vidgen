# Agent Runbook — How to Resolve Tickets With AI Agents

> How to take `tickets.md` and turn it into shipped code, one (or several) AI agents at a time.

## 0. Setup once

1. Create the GitHub repo (empty). Set the default branch to `main`.
2. Put these files in a `docs/` folder of the repo (commit as the *first* commit so every agent can read them):
   - `architecture.md`
   - `product-specifications/` (all 12 files)
   - `build-plan.md`
   - `tickets.md`
   - `hosting-options.md`
   - `free-tier-catalog.md`
   - `decisions.md`
   - `agent-runbook.md` (this file)
3. Enable: Dependabot, GitHub Actions, branch protection on `main` (require PR, require 1 review, require CI green).
4. Add an empty `decisions.md` to the repo root that links to `docs/decisions.md` (or move it there).
5. Pick your agent tooling. Any of these works — same prompts apply:
   - **GitHub Copilot coding agent** (cloud, fire-and-forget; one ticket per PR)
   - **Claude Code / Cursor / Aider** (interactive, you stay in the loop)
   - **GitHub Copilot CLI** (this tool) — open one terminal per parallel ticket

## 1. The master kickoff prompt (paste this into the FIRST agent)

```
You are an AI engineer joining a new project. Read these files in order before doing anything:

1. docs/architecture.md  — THE engineering blueprint. Do not deviate.
2. docs/build-plan.md    — the phased rollout and Definition of Done.
3. docs/tickets.md       — the backlog. You will pick exactly ONE ticket.
4. docs/decisions.md     — recorded ADRs you must honour.
5. docs/agent-runbook.md — how we work (this file).
6. docs/hosting-options.md and docs/free-tier-catalog.md — if your ticket touches deploy/infra.
7. docs/product-specifications/<file-for-your-pillar>.md — if your ticket cites a spec ID (F1.1, F2.1, etc.).

Your task: implement **T-001** (Initialize monorepo skeleton).

Hard rules (apply to EVERY ticket, not just this one):
- Follow architecture.md technology choices. No substitutions without writing a new ADR in decisions.md.
- Stay inside the file paths listed in the ticket. If you need to touch something else, justify in the PR body.
- Multi-tenant from day 1: every new table has workspace_id; every new endpoint asserts the caller's workspace; every new object-storage key is prefixed with workspace_id.
- $0 cost: no paid services on the default code path. Hosted APIs go behind adapters with local/OSS defaults.
- Postgres / Supabase stores METADATA ONLY. Media bytes always live in object storage (MinIO local / R2 cloud).
- Async by default for long ops (use Temporal workflows, never block a request).
- Every AI output links back to its source moment (media_id + offset_ms).

Workflow:
1. Create a branch named `t-001-monorepo-skeleton` off main.
2. Implement the ticket per its "Files" and "Task" sections.
3. Make every acceptance criterion in the ticket explicitly verifiable (write a test or a documented manual check).
4. Ensure `pnpm install` and `pnpm turbo run lint type-check` exit 0.
5. Open a PR titled `T-001: Initialize monorepo skeleton`. PR body must include:
   - Link to the ticket section in docs/tickets.md
   - A checklist of the ticket's acceptance criteria, each ticked with evidence (log output / screenshot / file path)
   - "Followed architecture.md §<X.Y>" references for each tech choice
   - "Definition of Done" checklist from docs/build-plan.md, each ticked
   - Notes on anything you skipped or deferred (with a rationale)

If you hit a blocker (e.g. an OSS choice in arch is impractical, or two tickets conflict), STOP, do not improvise. Open a draft PR with notes, and write a proposed ADR in decisions.md for human review.

When done, comment on the PR: "Ready for review. Next ticket(s) unblocked: T-002, T-003, T-004, T-005."
```

## 2. The reusable ticket prompt (paste this for every subsequent ticket)

Replace `<TICKET-ID>` and `<DEPENDENCIES>`:

```
You are an AI engineer on this project. Read these files first:

1. docs/architecture.md
2. docs/build-plan.md
3. docs/tickets.md (find your ticket by ID; read it in full)
4. docs/decisions.md
5. docs/agent-runbook.md
6. docs/hosting-options.md and docs/free-tier-catalog.md — if the ticket touches deploy/infra/cost.
7. docs/product-specifications/<file>.md — if the ticket cites a spec ID.

Your task: implement **<TICKET-ID>**.

Before coding, verify all upstream tickets are merged: <DEPENDENCIES>. If any are not yet merged to main, stop and report which dependency is missing.

Hard rules (carry over from agent-runbook.md):
- Follow architecture.md. No technology substitutions without a new ADR.
- Stay inside the ticket's "Files" list unless the PR body explains why.
- workspace_id on every new row / bucket prefix / queue task.
- $0 cost on the default code path; hosted services are adapters.
- Postgres stores METADATA ONLY; media bytes live in object storage.
- Async long ops; AI outputs link to source moments.

Workflow:
1. Branch: `t-<NNN>-<slug>` off latest main.
2. Implement to satisfy every acceptance criterion.
3. Add tests / smoke checks proving the criteria.
4. Update OpenAPI + regenerate SDK if you added/changed an endpoint (`pnpm sdk:gen`).
5. Add any new env var to .env.example with safe default.
6. Add any new container to the matching docker-compose profile.
7. Run `pnpm turbo run lint type-check test build` and `make smoke` — both must pass.
8. Open a PR titled `<TICKET-ID>: <title>` with:
   - Ticket link
   - Acceptance-criteria checklist with evidence
   - Definition-of-Done checklist (from build-plan.md §"Definition of done")
   - Architecture references (which arch §s you followed)
   - List of tickets unblocked by this one

If blocked, draft-PR with notes + ADR proposal; do not improvise around the blocker.
```

## 3. Suggested dispatch order — the first 30 days

The R1-wedge fast path from `tickets.md` is 34 tickets. Dispatch as follows.

### Wave 1 — Foundation (sequential; 1 agent, ~1 day)
Must be done in order; everything else depends on these.

```
T-001 → T-002 → T-003 → T-004 → T-005
```

### Wave 2 — Core infra (4 agents in parallel, ~2–3 days)
After T-003 + T-005 merge, these are independent of each other:

| Agent | Tickets |
|---|---|
| A | T-010 → T-011 (Postgres + migrations) |
| B | T-012 (MinIO) |
| C | T-013 (Keycloak) → T-014 (Caddy) |
| D | T-017 (Redis) |

Then sequential after the above merge:
```
T-015 (API skeleton; depends on T-005, T-011, T-013)
T-016 (Web shell; depends on T-013, T-015)
```

### Wave 3 — Workflow + ingest (3 agents in parallel)
After T-015 merges:

| Agent | Tickets |
|---|---|
| A | T-020 (Temporal) → T-021 (Workers) → T-022 (NATS) → T-023 (Novu) |
| B | T-030 (tus) → T-031 (IngestAssetWorkflow) → T-032 (FFmpeg worker) |
| C | T-200 (seed script — uses sample asset) |

### Wave 4 — Transcribe + edit (2 agents in parallel)
| Agent | Tickets |
|---|---|
| A | T-041 (Whisper.cpp) → T-040 (TranscribeAssetWorkflow) → T-043 (transcript API) |
| B | T-060 (edit ops + materialize) → T-061 (editor UI) → T-062 (render workflow) |

### Wave 5 — AI co-pilot (1 agent)
```
T-070 (Ollama) → T-071 (tool catalog) → T-072 (chat UI)
```

### Wave 6 — Distribute + smoke (2 agents)
| Agent | Tickets |
|---|---|
| A | T-090 (Remotion) → T-091 (clip generator) → T-100 (share + HLS) |
| B | T-120 (audit log) → T-201 (full smoke test) |

**At this point R1 wedge is live locally** (Mode A).

### Wave 7 — Mode B deploy (3 agents in parallel; runs anytime after Wave 2)
| Agent | Tickets |
|---|---|
| A | T-210 (provision services) → T-218 (Pages web) → T-219 (Pages share) |
| B | T-211 (adapter swap layer) → T-212 (Oracle A1 deploy) |
| C | T-213 (Turnstile) → T-214 (Helicone+LangFuse) → T-215 (Grafana Cloud) → T-216 (keep-alive) → T-220 (share-beacon Worker) |

### Wave 8+ — Polish (parallelize freely)
Phase 8 (Enhance), 11 (Collab), 12 (Trust/Ops), 13 (Translate), 14 (Mobile), 15 (Verticals) can each be assigned to a pod/agent with minimal cross-talk. Order by user value.

## 4. Tracking state across agents

Use the GitHub Project board or this minimal SQL pattern locally. **Always update before/after each agent run** so parallel work doesn't collide.

A simple ticket-state file (`docs/ticket-state.csv`) committed to the repo:

```
ticket_id,status,branch,pr,agent,started_at,merged_at
T-001,done,t-001-monorepo,#1,copilot-cli,2025-05-21,2025-05-21
T-002,in_progress,t-002-ci,#3,claude-code,2025-05-22,
T-010,blocked,,,wait_on,T-003,
```

Rule: an agent must `git pull && cat docs/ticket-state.csv` before starting, mark its own ticket `in_progress`, commit that row, then begin work. On merge, the merger marks `done`.

## 5. Verifying a ticket is actually done (paste this as a reviewer agent)

```
You are a code reviewer. Read:
- docs/tickets.md (find <TICKET-ID>)
- docs/build-plan.md (Definition of Done)
- docs/architecture.md (relevant §s)

Then review PR #<N>. For each of these, answer PASS / FAIL with evidence:

1. Every acceptance criterion in the ticket is verifiably met (test, log, or screenshot).
2. Every Definition-of-Done item from build-plan.md is satisfied.
3. Changes stayed inside the ticket's "Files" list (or the PR body explains why not).
4. Architecture.md choices were followed. If any deviation, an ADR exists in decisions.md.
5. workspace_id appears in every new table / bucket prefix / queue task.
6. No paid SaaS on the default code path; hosted APIs are adapters with local defaults.
7. Postgres holds metadata only — no media bytes.
8. CI is green (lint, type-check, test, build, make smoke).
9. OpenAPI updated and SDK regenerated cleanly if endpoints changed.
10. New env vars in .env.example with safe defaults.

If all 10 are PASS, comment "LGTM — approving" and approve.
If any FAIL, comment with the failing items and request changes. Do NOT approve.
```

## 6. Handling blockers without derailing

When an agent gets stuck, it should:

1. **Not improvise around the architecture.** Wrong tech choice now = months of pain.
2. **Open a draft PR** with what it did manage to do.
3. **Write a proposed ADR** in `decisions.md` (status: *proposed*) explaining the blocker and at least two options.
4. **Comment** on the PR tagging the human reviewer.
5. **Move to the next unblocked ticket** rather than spinning.

A blocker is escalated to human only when:
- An OSS dependency listed in arch is dead/broken.
- Two acceptance criteria contradict.
- A spec ID referenced in the ticket cannot be found.
- A free-tier ceiling is hit during build (rare; usually means a config error).

## 7. Cost / speed tips for the agent operator

- **Run T-001 → T-005 yourself** (or with one agent in interactive mode). They're fast and set the foundation everyone else needs.
- **Use cheaper/faster models for boilerplate tickets** (T-002 CI, T-003 compose scaffold, T-200 seed script). Reserve premium models for tickets with hard logic (T-060 materialize fn, T-091 clip generator, T-211 adapter layer).
- **Batch related tickets to one agent** when they touch the same files (e.g. T-040 + T-043 both touch transcripts code). One agent, fewer merge conflicts.
- **Don't parallelize within a wave more than you have CPU/review bandwidth for.** Three concurrent PRs is the sweet spot for one human reviewer.
- **`make smoke` is your safety net.** Run it after every merge to `main`. If it fails, revert the most recent merge while you fix forward.
- **Snapshot the model/agent setup that worked.** Record in `decisions.md` (D-015 onwards) which agent + model handled which class of ticket so you can repeat.

## 8. Sample first 3 prompts to paste right now

### Prompt 1 — to agent A
```
[paste the master kickoff prompt from §1]
```

After T-001 merges, in three new agent sessions:

### Prompt 2 — to agent A
```
[paste the reusable prompt from §2 with TICKET-ID=T-002, DEPENDENCIES=T-001]
```

### Prompt 3 — to agent B
```
[paste the reusable prompt from §2 with TICKET-ID=T-003, DEPENDENCIES=T-001]
```

### Prompt 4 — to agent C
```
[paste the reusable prompt from §2 with TICKET-ID=T-005, DEPENDENCIES=T-001]
```

(T-004 can run in a fourth parallel session, or wait — it only depends on T-001.)

## 9. Recovering when something goes wrong

| Symptom | Fix |
|---|---|
| Two agents touched the same files → merge conflict | Pick the one with cleaner tests; rebase the other on top; ask its agent to resolve. |
| Agent invented a new dependency not in arch | Reject the PR. Ask it to either use the arch-mandated tech or write an ADR proposing the change. |
| `make smoke` flakes intermittently | Add a retry to the smoke step *only if* the test is genuinely racy; otherwise treat as a real bug. |
| Agent silently downgraded a Mode B service to Mode A | Reject. The whole point of T-211 is mode parity. |
| Costs unexpectedly appearing on a vendor dashboard | Audit the offending PR. Likely an adapter was wired to call hosted by default. Roll back, fix the env-var default. |

---

*This file is the operating manual. Update it as you learn what works.*
