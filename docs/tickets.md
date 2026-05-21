# Tickets — Implementation Backlog

> Companion to `build-plan.md` and `architecture.md`. Each ticket is a **self-contained prompt** for an AI coding agent.
>
> **Agent rules of engagement** (apply to every ticket below):
>
> - Read `architecture.md` for tech choices; **do not substitute**. If an OSS choice in arch is impractical, open an ADR in `/decisions.md` and stop.
> - Read the referenced spec file(s) in `product-specifications/` for behavior.
> - Stay inside the listed file paths. If you need to touch something else, justify in the PR description.
> - Multi-tenant from day 1: every new table has `workspace_id`; every new endpoint asserts the caller's workspace; every new bucket object is prefixed `{bucket}/{workspace_id}/...`.
> - $0 cost: **no paid services** in any default code path. Hosted APIs are adapter plug-ins behind interfaces.
> - **Definition of done is in `build-plan.md` — every ticket must meet it before merge.**

Legend: `🟢 R1 wedge` `🟡 R1 polish` `🔵 R2+ enabler`

---

## Phase 0 — Bootstrap

### T-001 — Initialize monorepo skeleton 🟢
**Phase:** 0 Bootstrap
**Depends on:** —
**Files:**
- `/package.json`, `/pnpm-workspace.yaml`, `/turbo.json`, `/.editorconfig`, `/.gitignore`, `/.nvmrc`
- `/apps/`, `/services/`, `/packages/`, `/infra/`, `/scripts/`, `/decisions.md`
- `/README.md`, `/CONTRIBUTING.md`

**Context:** arch §8.4 monorepo layout.
**Task:** Create the monorepo at the repo root using **pnpm workspaces + Turborepo**. Create empty directories `apps/{web,mobile,extension,share}`, `services/{api,worker,mcp}`, `packages/{sdk-ts,editor-core,caption-ui,ui}`, `infra/{compose,helm,terraform}`. Add Node `.nvmrc` pinned to current LTS. Add Prettier + ESLint + TypeScript base configs at the root that workspaces extend. Add a top-level `README.md` with one-paragraph project description and `pnpm install && pnpm dev` quickstart. Create empty `decisions.md` with a one-line ADR template.

**Acceptance:** `pnpm install` succeeds. `pnpm turbo run lint` and `pnpm turbo run type-check` exit 0 even with no code (passes with empty workspaces). Repo opens cleanly in VS Code with no red squigglies.
**Out of scope:** any actual service code (later tickets).

---

### T-002 — GitHub Actions CI baseline 🟢
**Phase:** 0
**Depends on:** T-001
**Files:** `.github/workflows/ci.yml`, `.github/workflows/smoke.yml`, `scripts/smoke.sh`, `Makefile`
**Context:** arch §4.3, §15 — `make smoke` is the gate; CI uses GitHub Actions free minutes (arch §14).
**Task:** Add a `ci.yml` workflow that on push + PR runs: `pnpm install --frozen-lockfile`, `pnpm turbo run lint type-check test build` across all workspaces, with pnpm + turbo cache. Add `smoke.yml` that runs `make smoke` (smoke script is a no-op echo stub for now; future tickets fill it in). Add a `Makefile` with targets: `up`, `down`, `logs`, `smoke`, `seed`, `reset`. Make `up` = `docker compose --profile core --profile media --profile ai-cpu up -d`. Make `smoke` = `bash scripts/smoke.sh`. Make `down` = `docker compose down -v`.

**Acceptance:** PR opened against `main` triggers both workflows and they pass. `make smoke` exits 0 locally.
**Out of scope:** real smoke logic.

---

### T-003 — Docker Compose profiles scaffold 🟢
**Phase:** 0
**Depends on:** T-001
**Files:** `infra/compose/docker-compose.yml`, `infra/compose/compose.gpu.override.yml`, `infra/compose/.env.example`, `infra/compose/README.md`
**Context:** arch §4.1, §4.2 — profiles `core`, `media`, `ai-cpu`, `ai-gpu`, `realtime`, `obs`, `dev`.
**Task:** Create a single `docker-compose.yml` with **only the profile structure** and one placeholder service per profile (a `tianon/true` sleep container) so `docker compose --profile <name> config` validates each profile. Define named volumes for `pg_data`, `minio_data`, `models`, `redis_data`. Define network `appnet`. Add `.env.example` with all the env vars the later tickets will populate (KEYCLOAK_ADMIN, POSTGRES_PASSWORD, MINIO_ROOT_USER, MINIO_ROOT_PASSWORD, etc. — leave values as `change-me`). Add a top-level `compose.gpu.override.yml` skeleton with `deploy.resources.reservations.devices` block commented in.

**Acceptance:** `docker compose --profile core config` and the same for every profile validates without errors. `docker compose --profile core up -d` boots the placeholder. `docker compose down -v` cleans up.
**Out of scope:** real services (later phases).

---

### T-004 — `.env`, secrets, and config conventions 🟢
**Phase:** 0
**Depends on:** T-001
**Files:** `/.env.example`, `/.gitignore` (verify), `/packages/config/`, `services/api/src/config.ts`
**Task:** Create a `packages/config` shared TS module that loads env via **Zod** schemas (one schema per service). Document conventions in `/packages/config/README.md`: every service imports the schema, validates on boot, fails fast on missing/invalid. Add `dotenv-flow` for local layered envs (`.env`, `.env.local`). Ensure `.env*` (except `.env.example`) are gitignored. Add `pre-commit` (Husky) hook that runs `pnpm lint-staged`.

**Acceptance:** `import { apiConfig } from '@app/config'` typechecks. Booting any service with a missing required env var prints a useful error and exits non-zero.

---

### T-005 — OpenAPI 3.1 single source of truth 🟢
**Phase:** 0
**Depends on:** T-001
**Files:** `packages/openapi/openapi.yaml`, `packages/sdk-ts/`, `scripts/gen-sdk.sh`, `services/api/src/openapi.ts`
**Context:** arch §3.10 — OpenAPI is the contract; Fastify serves it; SDK is generated.
**Task:** Create `packages/openapi/openapi.yaml` with a minimal valid OpenAPI 3.1 doc (title, version, one `/health` GET). Wire `openapi-typescript` to generate types into `packages/sdk-ts/src/types.gen.ts`. Wire `openapi-fetch` to expose a typed client. Add `scripts/gen-sdk.sh` that runs the codegen and is invoked by `pnpm sdk:gen`. Add a check in CI that fails if the generated SDK is out of date.

**Acceptance:** `pnpm sdk:gen` is idempotent. SDK has a `client.GET('/health')` that typechecks.

---

## Phase 1 — Core infrastructure

### T-010 — Postgres 16 service with extensions + RLS bootstrap 🟢
**Phase:** 1
**Depends on:** T-003
**Files:** `infra/compose/postgres/Dockerfile`, `infra/compose/postgres/init/*.sql`, `infra/compose/docker-compose.yml` (add `postgres` to `core` profile)
**Context:** arch §5.1 — Postgres 16 + `pgvector`, `pg_trgm`, `pgcrypto`. RLS gates by `workspace_id`.
**Task:** Build a custom Postgres 16 image preloading `pgvector` (use the official `pgvector/pgvector:pg16` base). Add an `init/00-extensions.sql` enabling `pgvector`, `pg_trgm`, `pgcrypto`. Add `init/01-app-role.sql` creating a non-superuser `app` role used by services. Add `init/02-rls-helpers.sql` with a helper function `current_workspace_id()` that reads `app.workspace_id` from session settings. Add Postgres to the `core` profile in compose with healthcheck (`pg_isready`).

**Acceptance:** `make up` brings Postgres up green. `psql` shows `pgvector`, `pg_trgm`, `pgcrypto` installed. `SELECT current_workspace_id()` returns NULL when unset, returns set value when `SET LOCAL app.workspace_id = 'abc'`.

---

### T-011 — Database migration tooling (drizzle / kysely-migrator) 🟢
**Phase:** 1
**Depends on:** T-010
**Files:** `services/api/drizzle.config.ts`, `services/api/migrations/`, `services/api/src/db/schema.ts`, `services/api/src/db/client.ts`
**Task:** Set up **Drizzle ORM** for the API service against Postgres. Create the first migration that defines the core schema from arch §5.2: `tenants`, `users`, `tenant_members`, `assets`, `renditions`, `projects`, `project_clips`, `transcripts`, `transcript_segments`, `transcript_words`, `captions`, `edits`, `renders`, `workflows`, `comments`, `audit_log`, `embeddings`, `share_links`, `oauth_connections`, `webhooks`. Apply RLS policies on every table: enable RLS, add policy `workspace_isolation USING (workspace_id = current_workspace_id())`. Add `pnpm db:migrate` script. `assets` needs columns: `asset_id`, `workspace_id`, `source_uri`, `sha256`, `duration_ms`, `mime`, `created_by`, `captured_via`, `tier_at_upload`, `created_at`.

**Acceptance:** `pnpm db:migrate` is idempotent. Querying as the `app` role with `app.workspace_id` unset returns zero rows from any tenant table. Setting it returns only matching rows. Vector type compiles (`embedding vector(1024)` works).

---

### T-012 — MinIO with bucket conventions 🟢
**Phase:** 1
**Depends on:** T-003
**Files:** `infra/compose/minio/`, `infra/compose/docker-compose.yml`, `scripts/minio-init.sh`
**Context:** arch §5.1 — buckets: `media-raw`, `media-derived`, `media-chunks`, `public`.
**Task:** Add MinIO to the `core` profile. Add a `minio-init` sidecar (runs `mc`) that on first start creates the four buckets, sets versioning ON for `media-raw`, sets a public-read policy on `public/*`, and prints a one-time admin warning if root creds are still the defaults. Persist data to the `minio_data` volume. Expose console on 9001 (only inside Docker network + Caddy-proxied for local dev).

**Acceptance:** `mc ls local/` lists the four buckets after `make up`. Upload + download via S3 SDK works against `http://localhost:9000`. Object placed in `public/x` is fetchable via signed-less GET; object in `media-raw/x` requires creds.

---

### T-013 — Keycloak with realm + admin bootstrap 🟢
**Phase:** 1
**Depends on:** T-003, T-010
**Files:** `infra/compose/keycloak/`, `infra/compose/keycloak/realm-export.json`, scripts.
**Context:** arch §3.9, §11 — Keycloak per-realm tenancy; OIDC for app login.
**Task:** Add Keycloak 25+ to the `core` profile, backed by Postgres (separate `keycloak` DB). Provide a `realm-export.json` defining a `app` realm with: PKCE-required public client `app-web`, confidential client `app-api`, default roles `owner`, `editor`, `viewer`, and a test user `dev@local` / `dev` (only when `ENV=dev`). Configure Keycloak to import on startup. Expose at `http://localhost:8080`.

**Acceptance:** Visiting `http://localhost:8080` shows Keycloak. Realm `app` exists with the two clients. Discovery doc reachable at `/realms/app/.well-known/openid-configuration`.

---

### T-014 — Caddy reverse proxy with local TLS 🟢
**Phase:** 1
**Depends on:** T-003
**Files:** `infra/compose/caddy/Caddyfile`, compose.
**Context:** arch §10 — Caddy in front, Let's Encrypt in prod, local self-signed in dev.
**Task:** Add Caddy to `core` profile. Configure routes:
- `app.localhost` → web app (port 3000)
- `api.localhost` → API (port 4000)
- `auth.localhost` → Keycloak (port 8080)
- `s3.localhost` → MinIO API (9000)
- `minio.localhost` → MinIO console (9001)
- `share.localhost` → static share app

Use Caddy's `tls internal` for local trusted certs. Document how to install the Caddy root CA on macOS in `infra/compose/README.md`.

**Acceptance:** All `*.localhost` URLs respond over HTTPS without browser warnings after CA install.

---

### T-015 — API service skeleton (Fastify + OIDC) 🟢
**Phase:** 1
**Depends on:** T-005, T-011, T-013
**Files:** `services/api/`, `Dockerfile`, `src/server.ts`, `src/plugins/{auth,db,logger,error}.ts`, `src/routes/{health,me,workspaces}.ts`
**Context:** arch §2, §3.10. Auth via Keycloak OIDC; per-request RLS context.
**Task:** Implement a Fastify 5 server in `services/api`. Plugins:
- `auth`: validates Bearer JWTs from Keycloak (`jwks-rsa` cache), extracts `sub`, `email`, `workspace_id` claim; rejects on invalid.
- `db`: opens a per-request Postgres transaction, runs `SET LOCAL app.workspace_id = $1` from the JWT, exposes `req.db`.
- `logger`: pino with redaction of `authorization`, `cookie`.
- `error`: maps domain errors to RFC7807 problem-details JSON.

Routes:
- `GET /health` — public, returns `{ ok, version, ts }`.
- `GET /me` — auth required, returns the calling user + memberships.
- `POST /workspaces` — auth required, creates a workspace, makes caller owner.
- `GET /workspaces` — auth required, lists caller's workspaces.

Update OpenAPI to declare these. Regenerate SDK. Add Fastify to `core` compose profile on port 4000.

**Acceptance:** `curl https://api.localhost/health` returns OK. Authenticated `curl` to `/me` returns the user. Creating a workspace persists it and the caller can list it but a different user can't.

---

### T-016 — Web app shell (Next.js App Router) with Keycloak login 🟢
**Phase:** 1
**Depends on:** T-013, T-015
**Files:** `apps/web/`, Next.js App Router, `app/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(app)/dashboard/page.tsx`, `lib/auth.ts`, `lib/api.ts`
**Context:** arch §8.1 — Next.js + Tailwind + shadcn/ui + TanStack Query + Zustand.
**Task:** Initialize Next.js 14+ with TypeScript, Tailwind, shadcn/ui. Auth via `next-auth` (or `openid-client` direct) against Keycloak `app-web` client with PKCE. After login, fetch `/me` via the generated SDK. Dashboard page lists user's workspaces (call `GET /workspaces`) and has "Create workspace" button. Wire TanStack Query for server state. Add to `core` compose profile as a built container (multi-stage Dockerfile, Node 20 alpine).

**Acceptance:** Visiting `https://app.localhost` redirects to Keycloak, login completes, dashboard shows. "Create workspace" calls API and the list updates.

---

### T-017 — Redis / DragonflyDB cache 🟢
**Phase:** 1
**Depends on:** T-003
**Files:** compose.
**Task:** Add **DragonflyDB** (Redis-compatible, faster, BSL but free for our use) to `core` profile on port 6379. Persist to `redis_data` volume with appendonly enabled. Expose via env `REDIS_URL` in `.env.example`.

**Acceptance:** `redis-cli -h localhost ping` returns PONG.

---

## Phase 2 — Workflow plane

### T-020 — Temporal cluster (dev mode) 🟢
**Phase:** 2
**Depends on:** T-010
**Files:** compose (add to `core`), `infra/compose/temporal/`
**Context:** arch §6 — Temporal is the spine for every long op.
**Task:** Add Temporal server + Temporal Web (UI) to `core` profile, backed by Postgres (a `temporal` DB). Expose gRPC on 7233, UI on 8088 routed through Caddy as `temporal.localhost`. Configure default namespace `app`.

**Acceptance:** `temporal.localhost` shows the empty UI. `temporal workflow list -n app` works from `temporal` CLI in a sidecar.

---

### T-021 — Worker service skeleton + capability tagging 🟢
**Phase:** 2
**Depends on:** T-020
**Files:** `services/worker/`, sub-packages per capability (`light`, `media`, `ai-cpu`, `ai-gpu`), shared `services/worker/shared/`
**Context:** arch §6.2 — worker pools per capability; each advertises capabilities so Temporal routes correctly.
**Task:** Create a TypeScript worker package using `@temporalio/worker`. Provide a base `createWorker({ taskQueue, activities })` that boots, connects to Temporal, runs activities. Define task queues: `light`, `media`, `ai-cpu`, `ai-gpu`. Each container ships only the activities for its queue (separate Dockerfiles per pool, shared base image). Add `worker-light` to `core` profile, `worker-media` to `media` profile, `worker-ai-cpu` to `ai-cpu` profile, `worker-ai-gpu` to `ai-gpu` profile. Each prints a startup banner with its declared capabilities.

**Acceptance:** `make up` starts `worker-light` and `worker-media` and they appear as pollers on their respective task queues in the Temporal UI.

---

### T-022 — NATS JetStream event bus 🟡
**Phase:** 2
**Depends on:** T-003
**Files:** compose (`realtime` profile), `packages/events/`
**Context:** arch §6.1, §9 — NATS as the event bus; Novu later fans out to webhooks.
**Task:** Add NATS server with JetStream enabled to `realtime` profile on 4222. Create `packages/events` with typed publish/subscribe helpers (Zod schemas per event type) and a single source-of-truth `events.ts` enumerating: `asset.ingested`, `asset.transcribed`, `project.rendered`, `render.failed`, `clip.proposed`, `clip.approved`, `publish.completed`.

**Acceptance:** Unit test publishes then receives a typed event roundtrip against the running NATS.

---

### T-023 — Novu (OSS) notification & webhook fan-out 🟡
**Phase:** 2
**Depends on:** T-010, T-022
**Files:** compose (add Novu to `core`), `services/api/src/routes/webhooks.ts`
**Context:** arch §3.8 F8.9, §3.10 F10.2, §11.
**Task:** Add **Novu** self-host (API + Web + Worker) to `core` profile backed by the existing Postgres + Redis. Provide a thin wrapper module in the API that, on receiving a NATS event, fires a Novu trigger. Expose REST endpoints: `POST /webhooks` (register), `GET /webhooks`, `DELETE /webhooks/:id`. Outbound webhooks must be HMAC-signed with the workspace's secret.

**Acceptance:** Registering a webhook and emitting a synthetic `asset.ingested` event causes a signed POST to the registered URL with valid HMAC.

---

## Phase 3 — Ingest

### T-030 — tus resumable upload server 🟢
**Phase:** 3
**Depends on:** T-012, T-015
**Files:** `services/api/src/tus/`, integrate into Fastify or run `tusd` sidecar
**Context:** arch §3.1 F1.7; arch §5.3.
**Task:** Run `tusd` as a sidecar container (in `core` profile) configured to use MinIO as the store via S3 backend, bucket `media-chunks`, prefix `{workspace_id}/`. Front it via Caddy at `upload.localhost`. tusd must call a pre-create hook against the API (`POST /internal/tus/pre-create`) to authenticate the upload (validates JWT, ensures the user can upload to this workspace, returns metadata) and a post-finish hook (`POST /internal/tus/post-finish`) that triggers the `IngestAssetWorkflow`.

**Acceptance:** `tus-js-client` uploads a 50 MB file successfully and the file lands in `media-chunks/{ws}/...`. Killing and resuming the upload at 50% completes correctly.

---

### T-031 — `IngestAssetWorkflow` 🟢
**Phase:** 3
**Depends on:** T-021, T-030
**Files:** `services/worker/light/workflows/ingest-asset.ts`, activities under `services/worker/{light,media}/activities/`
**Context:** arch §6.1.
**Task:** Implement Temporal workflow with steps:
1. `finalizeUpload(uploadId)` — move object from `media-chunks/...` to `media-raw/{workspace_id}/{asset_id}/source.{ext}`, compute sha256, insert `assets` row.
2. `transcodeMezzanine(asset_id)` — invoke `ffmpeg-worker` to produce a normalized H.264 720p mezzanine + an audio-only WAV 16 kHz, store in `media-derived/.../mezz.mp4` and `.../audio.wav`, insert `renditions` rows.
3. `enqueueTranscription(asset_id)` — signal the transcription workflow (T-040) — for now, just publish `asset.transcribed.pending`.
4. Publish `asset.ingested` event to NATS.

All activities are retryable; the workflow is idempotent on `asset_id`.

**Acceptance:** Uploading a sample MP4 creates an `assets` row with sha256 + duration, two `renditions` rows, and emits `asset.ingested`.

---

### T-032 — FFmpeg media worker container 🟢
**Phase:** 3
**Depends on:** T-021
**Files:** `services/worker/media/Dockerfile`, `services/worker/media/activities/ffmpeg.ts`
**Context:** arch §3.2 (FFmpeg + MLT). Capability: `media`.
**Task:** Build a Docker image based on a minimal Node + FFmpeg-static base. Implement activities: `transcodeMezzanine`, `extractAudio`, `probeMedia` (returns duration, codecs, resolution). Stream inputs/outputs against MinIO via the S3 SDK; use temp local files only as scratch. Idempotent on output paths.

**Acceptance:** Probe on a sample MP4 returns correct duration. Transcode produces a playable 720p file.

---

### T-033 — Content-addressed dedup on upload finalize 🔵
**Phase:** 3
**Depends on:** T-031
**Files:** `services/api/src/tus/post-finish.ts`, `services/worker/light/activities/dedup.ts`
**Context:** arch E6.
**Task:** Before creating a new `assets` row, check whether an asset with the same sha256 exists in the same workspace. If yes, return the existing `asset_id`, skip transcode, and emit `asset.ingested` with `deduped: true`.

**Acceptance:** Uploading the same file twice yields one row and one set of derivatives.

---

## Phase 4 — Transcription

### T-040 — `TranscribeAssetWorkflow` + transcripts schema usage 🟢
**Phase:** 4
**Depends on:** T-031
**Files:** `services/worker/light/workflows/transcribe-asset.ts`, activities in `ai-cpu`
**Context:** arch §3.2 F2.4; arch E8 — every word carries `media_id + offset_ms`.
**Task:** Workflow:
1. `loadAudio(asset_id)` → audio WAV URI.
2. `runWhisper(audio_uri, lang_hint?)` → JSON segments + words with timestamps (delegated to `worker-ai-cpu`).
3. `persistTranscript(asset_id, result)` → inserts `transcripts`, `transcript_segments`, `transcript_words` rows.
4. Publish `asset.transcribed`.

Idempotent on `(asset_id, model_version)`.

**Acceptance:** Running on the sample 30 s clip yields >0 words, all with `start_ms < end_ms`, segments concatenate to full duration ±200 ms.

---

### T-041 — Whisper.cpp CPU worker 🟢
**Phase:** 4
**Depends on:** T-021
**Files:** `services/worker/ai-cpu/Dockerfile`, `services/worker/ai-cpu/activities/whisper.ts`
**Context:** arch §3.2 F2.4 — Whisper.cpp on CPU as default, WhisperX on GPU as upgrade.
**Task:** Build a container with whisper.cpp compiled (`ggerganov/whisper.cpp`) and the `ggml-small` model downloaded on first run into the shared `/models` volume keyed by hash. Expose a Node activity `runWhisper(audio_uri, opts)` that downloads the audio from MinIO, runs whisper.cpp with `--output-json --word-thumbnails`, parses, returns the typed result. Capability tag: `ai-cpu`, `asr`.

**Acceptance:** A 30 s English sample returns transcript with word timestamps. Model cached after first run; second run skips download.

---

### T-042 — WhisperX GPU worker (adapter) 🔵
**Phase:** 4
**Depends on:** T-040
**Files:** `services/worker/ai-gpu/whisperx/`
**Context:** arch §3.2 — WhisperX adds diarization + word alignment.
**Task:** Build an alternative `runWhisper` implementation on the `ai-gpu` queue using WhisperX (Python sub-process via a Python service container, exposed over HTTP to the TS activity). Adapter selected by the workflow when caller requests `quality=max` and a GPU worker is registered. Falls back to CPU otherwise.

**Acceptance:** With `worker-ai-gpu` running, a re-transcription request with `quality=max` produces diarized output (`speaker` column populated).

---

### T-043 — Transcript REST API 🟢
**Phase:** 4
**Depends on:** T-040, T-015
**Files:** `services/api/src/routes/transcripts.ts`, OpenAPI updates
**Task:** Endpoints:
- `GET /assets/:assetId/transcript` — returns the latest transcript (segments + words).
- `POST /assets/:assetId/transcript/retry` — re-runs transcription (e.g. with a different language hint or quality).
- `PATCH /transcripts/:transcriptId/words/:wordId` — manual realign (updates `start_ms`/`end_ms`/`text`), audit-logged.

All gated by `workspace_id` via RLS.

**Acceptance:** Web app can fetch a transcript and render the word list with timestamps.

---

## Phase 5 — Browser recorder

### T-050 — Recorder UI (screen + cam + mic, crash recovery) 🟢
**Phase:** 5
**Depends on:** T-016, T-030
**Files:** `apps/web/app/(app)/record/page.tsx`, `apps/web/lib/recorder/{capture.ts,buffer.ts,recover.ts}`
**Context:** spec F1.1 — full requirements list.
**Task:** Implement the recorder per F1.1:
- Source selection: screen (`getDisplayMedia`), cam (`getUserMedia`), mic. Up to 2 screens (call `getDisplayMedia` twice).
- Pre-recording check with mic VU meter, cam preview.
- 3-second countdown.
- Recording controls (Start/Pause/Resume/Stop; spacebar, M, C).
- **Crash safety:** chunk via `MediaRecorder` `timeslice=5000`, persist each chunk to IndexedDB keyed by `recordingId + chunkIndex`.
- On Stop: assemble chunks, push via tus to the upload endpoint with metadata `{ captured_via: 'browser-recorder' }`.
- On app load: scan IndexedDB for unfinished recordings → show "Recover" modal.
- Tier-length-limit banner at 90% (read tier from `/me`).
- Auto-create project + open editor after upload completes.

**Acceptance:** End-to-end record → upload → asset row created → transcription kicks off → editor opens. Killing the browser tab mid-recording and reopening surfaces the recovery modal and successfully restores the partial recording.

---

### T-051 — Tier enforcement service 🟡
**Phase:** 5
**Depends on:** T-015
**Files:** `services/api/src/lib/tier.ts`, `tenants.tier` column usage
**Context:** P3 every feature works on free, only quotas differ.
**Task:** Add a `tier.ts` helper that returns the active tier's quotas (record length, monthly minutes, exports). API endpoints that gate on tier (recorder length, render minutes) consume this. Free tier = 30 min record. Surface the limits via `GET /me/limits`.

**Acceptance:** Recorder reads `/me/limits` and shows the right cap. Server enforces too (rejects uploads from recordings > tier cap).

---

## Phase 6 — Text-based editor + render

### T-060 — Transcript-as-source data model & edits API 🟢
**Phase:** 6
**Depends on:** T-040, T-015
**Files:** `services/api/src/routes/projects.ts`, `services/api/src/routes/edits.ts`, `packages/editor-core/src/{ops.ts,materialize.ts}`
**Context:** arch §5.3 — edits are an event log; project view is derived.
**Task:** Define edit op types in `packages/editor-core/src/ops.ts` (TypeScript discriminated unions): `delete_words`, `insert_clip`, `replace_segment`, `move_words`, `set_crossfade_ms`, `set_speaker_label`. Implement `materialize(edits, transcripts, assets) → timeline` (pure function, fully tested). API:
- `POST /projects` — create from one or more `asset_id`s.
- `GET /projects/:id` — returns project + edits + materialized timeline.
- `POST /projects/:id/edits` — appends an edit op (validates against current materialized view).
- `POST /projects/:id/edits/undo` and `/redo`.

Use Postgres for the event log (`edits` table). Materialization cached in Redis keyed by `(project_id, edit_cursor)`.

**Acceptance:** Round-trip test: create project from a 30 s asset → delete 2 words via edit op → materialized timeline excludes those words → second materialize call hits cache.

---

### T-061 — Transcript editor UI (web) 🟢
**Phase:** 6
**Depends on:** T-016, T-043, T-060
**Files:** `apps/web/app/(app)/editor/[projectId]/page.tsx`, `apps/web/components/editor/{Transcript.tsx,Timeline.tsx,Preview.tsx}`, `packages/editor-core` (browser bindings)
**Context:** spec F2.1, F2.2.
**Task:** Implement F2.1 functional requirements 1–13 + 15 (collab #14 = later phase):
- Editable transcript surface (virtualized for >10 h, e.g. `@tanstack/react-virtual`).
- Cut/copy/paste/delete with keyboard shortcuts; selection at word/sentence/paragraph (multi-click).
- Word click → seek; Space → play/pause via WebCodecs preview (fall back to `<video>` element for V1).
- Smart crossfade default 30–80 ms (rendered later, just set the prop on edit ops).
- Strikethrough preview mode.
- Speaker labels editable in one click.
- Filler words dimmed.
- Undo/redo (≥100 steps).
- Cmd+F search; Find & Replace.
- Disfluency sidebar (count of fillers + one-click cleanup that emits a `delete_words` batch).

Timeline pane = simple horizontal track view of clips, derived from materialized view. Editing in transcript reflects within 200 ms.

**Acceptance:** Loads a 30 s asset's project, deletes a word, preview updates, undo restores, render produces the cut version.

---

### T-062 — MLT render worker + `RenderProjectWorkflow` 🟢
**Phase:** 6
**Depends on:** T-021, T-060
**Files:** `services/worker/media/Dockerfile` (add MLT), `services/worker/media/activities/mlt.ts`, `services/worker/light/workflows/render-project.ts`
**Context:** arch §3.2, §6.1.
**Task:** Add **MLT Framework** (`melt` CLI) to the media worker image. Workflow:
1. `materializeProject(project_id)` → timeline JSON.
2. `compileMltXml(timeline)` → MLT XML.
3. `renderSegments(mltXml)` → fan out into N parallel segment renders (parallelism = host CPU).
4. `stitchSegments(...)` → final MP4.
5. `publishRender(render_id, output_uri)` → write to `media-derived/.../render-{render_id}.mp4`, insert `renders` row, emit `project.rendered`.

Crash-safe (resumable) — segment renders are idempotent on segment hash.

**Acceptance:** Triggering a render on the edited 30 s project produces a playable MP4 with the deleted words actually removed. `make smoke` reaches step 5.

---

### T-063 — Browser preview via WebCodecs (best-effort) 🟡
**Phase:** 6
**Depends on:** T-061
**Files:** `apps/web/components/editor/Preview.tsx`, `apps/web/lib/preview/webcodecs.ts`
**Context:** arch §3.2.
**Task:** Replace the `<video>` fallback with a WebCodecs-based preview that plays the materialized timeline by demuxing the mezzanine (via `mp4box.js`), seeking by edit boundaries, applying audio crossfades client-side. Fall back to `<video>` on unsupported browsers (Firefox without flag).

**Acceptance:** Chrome plays the edited timeline without a server render. Firefox falls back gracefully.

---

## Phase 7 — AI Co-pilot

### T-070 — Ollama service + model registry 🟢
**Phase:** 7
**Depends on:** T-003
**Files:** `infra/compose/ollama/`, `services/api/src/lib/llm/`, `models.yaml`
**Context:** arch §3.3, §7.1 — Ollama for LLM brain.
**Task:** Add Ollama to `ai-cpu` profile. Persist models to shared `/models` volume. On first start, `ollama pull llama3.1:8b-instruct-q4_K_M` (or smaller `qwen2.5:7b` if RAM-constrained). Create `models.yaml` at the repo root listing every model with name, license, size, capability, default backend, hash. The API exposes a typed `LLM` interface `{ complete(messages, opts) }` with implementations `OllamaLocal`, `OpenRouterFree` (adapter, opt-in), `GroqFree` (adapter, opt-in).

**Acceptance:** `curl http://localhost:11434/api/generate -d '{"model":"llama3.1:8b-instruct-q4_K_M","prompt":"hi","stream":false}'` returns a response. API `LLM.complete` works against Ollama.

---

### T-071 — Tool catalog for Co-pilot 🟢
**Phase:** 7
**Depends on:** T-060, T-070
**Files:** `services/api/src/copilot/tools/{cut,caption,clip,share,brand}.ts`, `services/api/src/copilot/agent.ts`
**Context:** spec F2.6; arch §3.2 — Co-pilot calls the same REST API as the UI.
**Task:** Implement a LangGraph (or comparable lightweight TS) agent with tools:
- `cut_segment({ project_id, start_ms, end_ms })` → emits a `delete_words` edit.
- `remove_fillers({ project_id })` → batch `delete_words` over flagged words.
- `apply_caption_template({ project_id, template_id })`.
- `generate_clip({ asset_id })` → fires the clip workflow (Phase 9).
- `share_project({ project_id })` → returns share URL.
- `apply_brand_kit({ project_id, brand_kit_id })`.

Each tool is a thin wrapper over the existing REST endpoints. The agent is invoked by `POST /projects/:id/copilot/chat` (streaming). All tool calls are audit-logged.

**Acceptance:** "Remove all filler words" → fillers disappear from materialized timeline within seconds.

---

### T-072 — Copilot chat UI 🟢
**Phase:** 7
**Depends on:** T-071, T-061
**Files:** `apps/web/components/editor/Copilot.tsx`
**Task:** Side panel in the editor: chat messages, streaming responses, tool-call cards (show which edit ops were applied with one-click undo). Every change must be diffable (P10).

**Acceptance:** User types "cut everything after the 30 second mark", co-pilot proposes a `delete_words` op, user clicks accept, edit applied; undo restores.

---

## Phase 8 — Enhance

### T-080 — Studio Sound pipeline (DeepFilterNet + Demucs + loudness) 🟡
**Phase:** 8
**Depends on:** T-041
**Files:** `services/worker/ai-cpu/activities/studio-sound.ts`, workflow trigger
**Context:** spec F4.1; arch §3.4.
**Task:** Implement a `StudioSoundWorkflow(asset_id)` that:
1. Runs DeepFilterNet 3 on the audio rendition.
2. Runs Demucs to separate stems (optional, behind `quality=max`).
3. Applies FFmpeg `loudnorm` to EBU R128.
4. Writes a new audio rendition `studio.wav`.

A project edit can opt-in via `set_audio_rendition(asset_id, 'studio')`.

**Acceptance:** Compare original vs studio output: noise floor drops audibly on a noisy sample.

---

### T-081 — Filler & silence removal (deterministic from WhisperX) 🟡
**Phase:** 8
**Depends on:** T-040
**Files:** `services/api/src/lib/cleanup.ts`, exposed as `POST /projects/:id/cleanup/fillers` and `/silence`
**Context:** spec F4.2.
**Task:** From transcript words, detect:
- Fillers: configurable list (`um`, `uh`, `like`, `you know`, locale-aware).
- Long silences: gaps between words > N ms (configurable, default 800).
- Retakes: simple repeated-phrase heuristic.

Each detection returns a list of word IDs and a one-click "apply" emits a `delete_words` batch with crossfade.

**Acceptance:** Sample with 10 inserted "um"s → cleanup proposes 10 deletions; user accepts; render confirms removal.

---

## Phase 9 — Captions + clip generator

### T-090 — Remotion render service + caption template library 🟢
**Phase:** 9
**Depends on:** T-021
**Files:** `services/worker/media/remotion/`, `packages/caption-ui/`
**Context:** arch §3.2 F2.5; F6.7.
**Task:** Add Remotion to media worker image. Build `packages/caption-ui` with 10+ caption templates (React components — same components used for browser preview and server render). Expose activity `renderCaptions({ project_id, template_id, lang })` that produces a transparent overlay or burned-in render depending on caller.

**Acceptance:** A render with `apply_caption_template` shows captions matching the chosen template style.

---

### T-091 — `ClipGeneratorWorkflow` + viral score 🟢
**Phase:** 9
**Depends on:** T-040, T-070
**Files:** `services/worker/light/workflows/clip-generator.ts`, `services/api/src/routes/clips.ts`
**Context:** spec F6.6; arch §3.6.
**Task:** Workflow:
1. Load transcript + scene boundaries (PySceneDetect activity on the mezzanine).
2. Score candidate clip windows (8–60 s) with a local LLM prompt: "hookiness" + speaker change + sentiment + question/answer pairs.
3. Return ranked list of `proposed_clips` (start_ms, end_ms, score, hook text).
4. Pause for `user_approval` signal.
5. On approval, render each chosen clip vertical (9:16) with optional hook overlay.

API:
- `POST /assets/:id/clips/generate` → starts workflow, returns workflow handle.
- `GET /assets/:id/clips/proposals` → polls for proposals.
- `POST /assets/:id/clips/approve` → signals workflow with chosen indexes + style.

**Acceptance:** Sample 5-minute podcast asset produces ≥3 ranked clip proposals; approving 2 renders 2 vertical MP4s.

---

### T-092 — Hook overlay + thumbnail generation 🟡
**Phase:** 9
**Depends on:** T-091
**Files:** `services/worker/ai-cpu/activities/thumbnail.ts` (uses Flux.1 schnell if GPU else fallback `node-canvas` text-on-frame).
**Context:** spec F6.7.
**Task:** For each approved clip, generate a thumbnail: extract a high-energy frame (highest motion + face if detected), overlay the hook text in the project's brand font. If GPU + Flux.1 schnell available, generate stylized thumbnail; else fall back to grabbed-frame + text. Output stored as `media-derived/.../clip-{id}/thumb.png`.

**Acceptance:** Approved clip has a thumbnail PNG with hook text rendered.

---

## Phase 10 — Distribute

### T-100 — Share links + HLS publishing 🟢
**Phase:** 10
**Depends on:** T-062
**Files:** `services/worker/media/activities/hls.ts`, `services/api/src/routes/share.ts`, `apps/share/`
**Context:** spec F7.1; arch §3.7, §10.
**Task:**
1. After render, an activity packages the MP4 as HLS (`ffmpeg -hls_time 6 -hls_playlist_type vod ...`) into `public/{share_token}/`.
2. API: `POST /projects/:id/share` → creates `share_links` row, returns URL `https://share.localhost/s/{token}`.
3. `apps/share` is a tiny Next.js (or Astro) static export that fetches the manifest and plays via **Plyr** with `hls.js`.
4. View counter: a beacon `POST /s/{token}/view` increments a Postgres counter (rate-limited per IP-day via Redis).

**Acceptance:** Sharing a rendered project yields a working public URL playing HLS in any browser. View counter increments once per IP per day.

---

### T-101 — Auto-updating embed 🟡
**Phase:** 10
**Depends on:** T-100
**Files:** `apps/share/embed/`, embed snippet generator
**Context:** spec F7.2.
**Task:** Embed iframe at `/e/{token}` that loads the latest manifest for the share token. Re-publishing the project updates the manifest in place — embed picks it up on next load. Provide a copy-to-clipboard snippet in the share dialog.

**Acceptance:** Embed iframe on an external test page plays; re-rendering the project updates what the embed shows on refresh without snippet change.

---

## Phase 11 — Realtime collaboration

### T-110 — Hocuspocus + Yjs server 🔵
**Phase:** 11
**Depends on:** T-010, T-015
**Files:** `services/realtime/`, compose (`realtime` profile)
**Context:** arch §9, spec F8.2.
**Task:** Add a Hocuspocus server, Postgres-backed (table `yjs_docs(doc_id, data, updated_at)`), per-project document scoping. Auth handshake validates the JWT and asserts membership. Expose via Caddy at `rt.localhost`.

**Acceptance:** Two browsers open the same project → Yjs doc syncs.

---

### T-111 — Wire Yjs into transcript editor 🔵
**Phase:** 11
**Depends on:** T-110, T-061
**Files:** `apps/web/components/editor/`, `packages/editor-core/yjs.ts`
**Task:** Bind the transcript word list and edit op log to Yjs. Edits made by user A appear in user B within 500 ms. Presence cursors via Yjs awareness.

**Acceptance:** Two browsers editing the same project show live cursors and merge edits without conflict.

---

### T-112 — Comments at word anchors 🔵
**Phase:** 11
**Depends on:** T-110
**Files:** `services/api/src/routes/comments.ts`, UI components
**Context:** spec F8.7.
**Task:** REST CRUD over `comments(comment_id, project_id, anchor_ms, body, thread_id, author_id)`. UI lets users click a word → comment thread; @mentions notify via Novu.

**Acceptance:** Two users post + reply on the same word anchor; both see threads.

---

## Phase 12 — Trust & Ops

### T-120 — Append-only hash-chained audit log 🟢
**Phase:** 12
**Depends on:** T-011, T-015
**Files:** `services/api/src/lib/audit.ts`, schema already in T-011
**Context:** arch §11.
**Task:** Every mutating API call appends to `audit_log(actor, action, target, hash_prev, hash_self)`. `hash_self = sha256(hash_prev || canonicalize(row))`. Provide `GET /audit?cursor=...` (paginated, workspace-scoped). Daily Temporal cron exports the previous day's chain to MinIO `audit/{ws}/{date}.jsonl` and writes the final hash to a separate WORM bucket if available.

**Acceptance:** Audit chain verifies end-to-end with `pnpm tsx scripts/verify-audit.ts`. Tampering with any row breaks verification.

---

### T-121 — Observability stack (OTel + Prometheus + Grafana + Loki) 🟡
**Phase:** 12
**Depends on:** T-003
**Files:** compose `obs` profile, `infra/compose/grafana/`
**Context:** arch §12.
**Task:** Add Prometheus, Grafana (with pre-provisioned dashboards: API latency, render success rate, worker queue depth), Loki + Promtail, Tempo, OpenTelemetry Collector. Every service emits OTel traces + logs. Grafana exposed at `grafana.localhost`.

**Acceptance:** Grafana shows live API request rate and worker queue depth.

---

### T-122 — GlitchTip + Uptime Kuma 🟡
**Phase:** 12
**Depends on:** T-003
**Files:** compose `obs`/`dev` profiles.
**Task:** Add **GlitchTip** for error tracking (Sentry-compatible SDKs in services/web). Add **Uptime Kuma** for status page (F9.7).

**Acceptance:** A thrown error in the API appears in GlitchTip. Uptime Kuma probes core services and shows green.

---

### T-123 — Cerbos policy engine for fine-grained roles 🔵
**Phase:** 12
**Depends on:** T-015
**Files:** `infra/compose/cerbos/`, `services/api/src/lib/policy.ts`
**Context:** arch §3.8 F8.3, F8.4, §11.
**Task:** Add Cerbos sidecar to `core` profile with policies for resources `project`, `asset`, `comment` and actions `read`, `edit`, `render`, `share`, `delete` per role (`owner`, `editor`, `commenter`, `viewer`). API middleware checks Cerbos before every mutating endpoint.

**Acceptance:** A `viewer` cannot POST edits to a project they have read access to (403). An `editor` can.

---

## Phase 13 — Translate + Dub

### T-130 — MADLAD-400 translator service 🔵
**Phase:** 13
**Depends on:** T-021
**Files:** `services/worker/ai-cpu/translator/`
**Context:** arch §3.5 — MADLAD permissive license preferred over NLLB CC-BY-NC.
**Task:** Python container running MADLAD-400 (3B or 7B depending on RAM). Activity `translate(segments, target_lang)` returns translated segments preserving timing. Default backend; **Argos Translate** as ultra-light fallback.

**Acceptance:** A transcript translated to Spanish preserves segment count and timestamps; quality matches MADLAD reference outputs.

---

### T-131 — Caption translation pipeline 🔵
**Phase:** 13
**Depends on:** T-130, T-090
**Files:** `services/api/src/routes/captions.ts`, workflow
**Task:** `POST /projects/:id/captions/translate` triggers a workflow that takes the current transcript → MADLAD → writes a `captions` row (`lang=es`, format SRT/VTT). Editor exposes a language switcher.

**Acceptance:** Smoke step 7 passes: Spanish captions render correctly in the embed player.

---

### T-132 — XTTS v2 dubbing 🔵
**Phase:** 13
**Depends on:** T-021
**Files:** `services/worker/ai-gpu/xtts/` (CPU fallback container too).
**Context:** arch §3.3 F3.3, §3.5 F5.3.
**Task:** Containerize Coqui XTTS v2. Activity `synthesize(text, voice_ref, lang)` returns a WAV per segment. `DubbingWorkflow(asset_id, target_lang)`: translate → XTTS in cloned voice → align/timestretch → mix with original music bed (via Demucs) → output `media-derived/.../dub-{lang}.wav`.

**Acceptance:** A 30 s clip dubbed to Spanish produces audible Spanish audio synchronized within ±150 ms of original segment boundaries.

---

### T-133 — MuseTalk lip-sync (GPU only, optional) 🔵
**Phase:** 13
**Depends on:** T-132
**Files:** `services/worker/ai-gpu/musetalk/`
**Task:** Container running MuseTalk to relip a face video against new audio. Activity `lipSync(video_uri, audio_uri)`. Skipped on CPU-only hosts with a clear "GPU required for lip-sync" message back to the user.

**Acceptance:** With GPU available, dubbed output has visibly improved lip-sync vs un-synced.

---

## Phase 14 — Mobile + QR pairing

### T-140 — Expo app shell + auth + project list 🔵
**Phase:** 14
**Depends on:** T-015, T-016
**Files:** `apps/mobile/`
**Context:** spec F1.5; arch §8.2.
**Task:** Initialize Expo (React Native, TypeScript). Auth via Keycloak with `expo-auth-session` (PKCE). Tabs: Projects, Record, Profile. Projects tab lists `GET /projects` (paginated). Local SQLite for offline cache (`expo-sqlite`).

**Acceptance:** Logs in, lists projects on a phone simulator.

---

### T-141 — Mobile capture → tus upload 🔵
**Phase:** 14
**Depends on:** T-140, T-030
**Files:** `apps/mobile/screens/Record.tsx`
**Task:** `expo-camera` capture (video + audio). On stop, buffer to local file, upload via tus (`react-native-tus-client`). Same auto-import flow as web (creates project, opens project detail).

**Acceptance:** Record on phone → see asset on web within seconds.

---

### T-142 — QR pairing (mobile → desktop) 🔵
**Phase:** 14
**Depends on:** T-141
**Files:** `services/api/src/routes/pair.ts`, `apps/web/components/PairQR.tsx`, mobile pair screen
**Context:** spec F1.6.
**Task:** Web `Pair phone` button calls `POST /pair` → returns short-lived signed token + QR (URL `pair.localhost/?t=...`). Mobile app scans → exchanges for an upload token scoped to a specific workspace + project. Token TTL 5 min, single-use.

**Acceptance:** Pair flow uploads a clip from a phone scanner directly into a desktop session.

---

## Phase 15 — Vertical packs + Brand kit

### T-150 — Brand kit (lite) 🟡
**Phase:** 15
**Depends on:** T-015, T-090
**Files:** `services/api/src/routes/brand-kit.ts`, UI
**Context:** spec F8.1.
**Task:** `brand_kits` table (colors[], fonts[], logo_uri, lower_third_uri). CRUD UI. Default project picks up workspace's brand kit. Caption templates reference brand colors by token.

**Acceptance:** Setting brand color and re-rendering captions reflects the new color.

---

### T-151 — Vertical pack JSON loader 🔵
**Phase:** 15
**Depends on:** T-070, T-090, T-150
**Files:** `services/api/src/routes/vertical-packs.ts`, `packs/sermon.json`, loader
**Context:** spec F11.x; arch §3.11.
**Task:** Define a JSON schema for a vertical pack: prompts (for Co-pilot + Copywriter), caption templates, default workflows, sample brand kit. Implement `POST /workspaces/:id/packs/install` that takes a pack JSON or pack ID and loads it. Ship one example pack: `packs/sermon.json` (sermon repurpose).

**Acceptance:** Installing the sermon pack into a fresh workspace adds the configured templates + prompts; AI Co-pilot uses the sermon-specific system prompt.

---

## Cross-cutting tickets (do anytime, useful early)

### T-200 — Seed script (sample asset + sample user) 🟢
**Phase:** any (recommend after T-031)
**Depends on:** T-013, T-015, T-031
**Files:** `scripts/seed.ts`
**Task:** A `pnpm seed` script that: creates `dev@local` user in Keycloak (if missing), creates a workspace, uploads `fixtures/sample-30s.mp4` via tus, waits for ingest + transcription, prints the project URL. Used by `make smoke`.

**Acceptance:** `pnpm seed` from a clean `make up` produces a ready-to-use project in under 2 minutes on a laptop.

---

### T-201 — `make smoke` full implementation 🟢
**Phase:** any (final piece)
**Depends on:** T-062 (render), T-131 (translate), T-091 (clip gen)
**Files:** `scripts/smoke.sh`
**Task:** Replace the stub with the journey from arch §4.3 (all 8 steps). Each step prints PASS/FAIL with a checksum or status code. Exit code propagates to CI.

**Acceptance:** `make smoke` green locally and in GitHub Actions.

---

### T-202 — MCP server (sidecar) 🔵
**Phase:** any after Phase 6
**Depends on:** T-015, T-071
**Files:** `services/mcp/`
**Context:** arch §3.10 F10.3.
**Task:** Stand up an MCP server wrapping the same REST API (using the TS SDK). Expose tools mirroring the Co-pilot tool catalog so external MCP clients (Claude Desktop, IDEs) can drive the product.

**Acceptance:** `claude` MCP client lists the tools and can call `share_project`.

---

### T-203 — n8n community node 🔵
**Phase:** any after Phase 10
**Depends on:** T-100
**Context:** arch §3.10 F10.5.
**Task:** Publish an n8n community node exposing trigger (webhook) + actions (`create_project`, `render`, `share`).

**Acceptance:** A self-hosted n8n can listen for `project.rendered` and POST to Slack.

---

### T-204 — Cloudflare Tunnel deployment recipe 🔵
**Phase:** any
**Depends on:** T-014
**Files:** `infra/compose/cloudflared/`, `infra/compose/README.md` deploy section.
**Context:** arch §10, §13.
**Task:** Optional `cloudflared` service (commented out by default) plus README walkthrough: domain → CF Tunnel → exposing `app.<domain>`. Zero cost.

**Acceptance:** Following the README, a developer can serve the local stack on a public domain in <15 minutes for $0.

---

### T-205 — Helm chart skeleton 🔵
**Phase:** any
**Depends on:** Phase 1 done.
**Files:** `infra/helm/`
**Context:** arch §13.
**Task:** Helm chart that deploys core + media + ai-cpu profiles equivalents to k3s. Values file mirrors `.env.example`. Not required for V1 local; this is for the day a paying customer wants their own deployment.

**Acceptance:** `helm template` produces valid YAML; deploys successfully on a kind cluster as a CI dry-run.

---

## Mode B — Managed free-tier deploy (hybrid)

> These tickets implement the hybrid deploy path from `hosting-options.md`. They build *on top of* the Mode A code from Phases 0–15 — no business-logic rewrites, only adapters + deploy plumbing.

### T-210 — Provision managed free-tier services 🟡
**Phase:** Deploy (Mode B)
**Depends on:** T-011, T-015
**Files:** `infra/deploy/cloud-provisioning.md`, `infra/deploy/terraform/` (optional)
**Context:** `hosting-options.md` §3; `free-tier-catalog.md` §S.
**Task:** Write a step-by-step provisioning runbook (idempotent, copy-pasteable) that stands up:
1. Cloudflare account + DNS + Pages project (web app) + Pages project (share/embed) + R2 buckets (`media-raw`, `media-derived`, `media-chunks`, `public`) + Workers project (for `share-beacon` + `supabase-keepalive`) + Email Routing (`hello@`, `support@` → owner inbox) + Turnstile site key.
2. Supabase project (region matching primary user base) — enable pgvector extension, create initial DB roles, copy Drizzle migrations from T-011, run `pnpm db:migrate` against the Supabase connection string. **Do not enable Supabase storage** — we use R2.
3. Upstash Redis database (free tier, same region as Supabase).
4. Resend account + verified sending domain + API key.
5. Sentry project (TS/web + node) and DSNs.
6. PostHog Cloud project + API key.
7. BetterStack status page + monitors for: web, api, share, supabase health endpoint.
8. LangFuse Cloud project + Helicone account + keys.
9. Cal.com booking link (founder).
10. Linear workspace + GitHub integration.
11. Cloudflare Turnstile site key.

Every credential lands in **GitHub Actions repository secrets** under a documented naming convention (`CF_*`, `SUPABASE_*`, `UPSTASH_*`, `RESEND_*`, `SENTRY_*`, `POSTHOG_*`, `HELICONE_*`, `LANGFUSE_*`). Provide an optional Terraform module (Cloudflare provider) for re-provisioning, but the runbook is the source of truth.

**Acceptance:** Following the runbook from scratch on a new domain produces a working set of services in under 60 minutes. Every secret is in GH Actions; `.env.cloud.example` lists every var name (no secrets committed).

**Out of scope:** Oracle A1 box provisioning (that's T-212).

---

### T-211 — Adapter swap layer (storage / db / auth / cache / llm / asr / notifier / mailer) 🟡
**Phase:** Deploy (Mode B)
**Depends on:** T-012, T-013, T-015, T-017, T-023, T-031, T-041, T-070
**Files:** `services/api/src/adapters/{storage,db,auth,cache,llm,asr,notifier,mailer,featureflags}/`, `packages/config/src/mode.ts`
**Context:** arch §7.2; `hosting-options.md` §4; `free-tier-catalog.md` §S.
**Task:** Formalize the adapter pattern. For each capability define an interface + Mode-A implementation + Mode-B implementation; selected by env (e.g. `STORAGE_ADAPTER=minio|r2`).

| Interface | Mode A | Mode B |
|---|---|---|
| `Storage` | `MinioStorage` | `R2Storage` (S3 SDK, R2 endpoint + creds) |
| `Database` | local Postgres URL | Supabase Postgres URL (Drizzle works unchanged) |
| `Auth` | Keycloak OIDC | Supabase Auth OIDC |
| `Cache` | DragonflyDB | Upstash Redis (TLS, REST optional) |
| `LLM` | `OllamaLocal` | `GroqAdapter` + `GeminiAdapter` + `OpenRouterAdapter` (router picks per quality tier) |
| `Transcriber` | `WhisperCpp` | `GroqDistilWhisper` |
| `Notifier` | `NovuSelfHost` | `NovuCloud` (same SDK) |
| `Mailer` | Mailpit (dev) | Resend (`@resend/node`) |
| `FeatureFlags` | Postgres `flags` table | PostHog Feature Flags SDK |
| `EmbeddingsStore` | pgvector | pgvector (Supabase) — no change; or `CloudflareVectorize` adapter |
| `Observability` | OTel → local Loki/Tempo | OTel → Grafana Cloud |
| `ErrorTracker` | GlitchTip | Sentry |
| `Analytics` | PostHog self-host | PostHog Cloud |

Add a `packages/config/src/mode.ts` that exports `MODE` = `'local'|'cloud'|'hybrid'` and wires the right adapter into a DI container at boot. Every adapter must pass its own contract test (e.g. `Storage.put/get/delete` round-trip).

Add **AI gateway pass-through:** all LLM/ASR calls in Mode B route through Helicone (set `OPENAI_BASE_URL`-style env or wrap with their SDK) so we get free caching + tracing. LangFuse SDK wraps every LLM call too (no-op in Mode A).

**Acceptance:** Setting `MODE=cloud` and supplying Mode-B env vars boots the same code against Supabase + R2 + Upstash + Resend + Groq + Sentry. The full smoke test (T-201) passes in both modes from the same `main` branch.

---

### T-212 — Data-plane deployment to Oracle Always Free A1 (or home box) 🟡
**Phase:** Deploy (Mode B)
**Depends on:** T-210, T-211
**Files:** `infra/deploy/oracle-a1.md`, `infra/deploy/cloudflared/config.yml`, `.github/workflows/deploy-data-plane.yml`
**Context:** arch §13; `hosting-options.md` §3.
**Task:**
1. Runbook: provision an Oracle Cloud Always Free A1 instance (24 GB RAM, 4 vCPU ARM, permanent free). Install Docker + Docker Compose. Install Cloudflare `cloudflared`. Configure it to expose `api.{domain}`, `temporal.{domain}` (auth-gated), `rt.{domain}` to the home box via Cloudflare Tunnel.
2. Compose override `compose.cloud.override.yml`: pulls API, worker-light, worker-media, worker-ai-cpu, Temporal, Hocuspocus, NATS, Caddy (internal only — public traffic is Cloudflare-Tunnel-terminated). All bind to `127.0.0.1`; `cloudflared` is the only public route. **Postgres, Redis, MinIO containers are NOT started** — those are managed services in Mode B.
3. GitHub Actions deploy workflow on push to `main`: build per-service Docker images, push to GHCR, SSH into A1 (deploy key), `docker compose pull && up -d --remove-orphans`. Workflow uses secrets from T-210.
4. Optional home-GPU box runbook (separate file): same workflow but adds `ai-gpu` profile and a Tailscale link so Temporal task queues reach the home GPU privately.
5. Add a Cloudflare Worker (deployed via Wrangler in a separate workflow) for: (a) `share-beacon` view counter at the edge; (b) `supabase-keepalive` cron (Workers Cron Trigger every 6 days hits a Supabase health endpoint to defeat 7-day idle pause).

**Acceptance:** Pushing to `main` deploys the data plane to A1 within 5 minutes. `make smoke MODE=cloud` against the deployed stack passes end-to-end. Cost console shows $0.00 on Oracle + Cloudflare + Supabase + Upstash + Resend + Sentry + PostHog after 7 days of normal usage.

---

### T-213 — Cloudflare Turnstile on signup + share endpoints 🟡
**Phase:** Deploy (Mode B); applicable to Mode A too
**Depends on:** T-015, T-100
**Files:** `apps/web/components/Turnstile.tsx`, `services/api/src/plugins/turnstile.ts`
**Context:** `free-tier-catalog.md` §D.
**Task:** Add CF Turnstile widget on the signup form and on the public share-view beacon. Server-side verify with the secret. Block abuse without breaking UX for real users.

**Acceptance:** Bot traffic visibly drops; signup completion rate for real users unchanged.

---

### T-214 — Helicone + LangFuse wiring for AI calls 🟡
**Phase:** Deploy (Mode B); applicable to Mode A too
**Depends on:** T-070, T-211
**Files:** `services/api/src/lib/llm/index.ts`
**Context:** `free-tier-catalog.md` §F, §N.
**Task:** Wrap every LLM/ASR call so:
1. The request first goes through **Helicone** (OpenAI-compatible proxy URL) — automatic caching + cost logging.
2. Then is logged to **LangFuse** with prompt, response, latency, cost (free 50k observations/mo).
3. Both are no-ops if env vars are unset (Mode A pure local).

**Acceptance:** Triggering a Co-pilot chat shows the call in Helicone dashboard + LangFuse trace. A repeated identical prompt hits the Helicone cache (latency drops).

---

### T-215 — Grafana Cloud OTel export 🟡
**Phase:** Deploy (Mode B); applicable to Mode A too
**Depends on:** T-121 (or T-211 if skipping self-host)
**Files:** `infra/otel/collector-cloud.yaml`
**Context:** `free-tier-catalog.md` §G.
**Task:** Add a Grafana Cloud OTel exporter target. In Mode B the OTel Collector ships metrics → Mimir, logs → Loki, traces → Tempo on Grafana Cloud Free (50 GB each, 10k series, 14-day retention). Pre-provision the same Grafana dashboards built in T-121 against the cloud workspace via Grafana provisioning API.

**Acceptance:** Grafana Cloud shows live API request rate + worker queue depth identical to local Grafana.

---

### T-216 — Supabase keep-alive cron 🟡
**Phase:** Deploy (Mode B)
**Depends on:** T-210
**Files:** `.github/workflows/supabase-ping.yml` **and/or** `infra/workers/keepalive.ts` (Cloudflare Worker)
**Context:** `hosting-options.md` §5 — Supabase pauses free projects after 7 days idle.
**Task:** Either a GitHub Actions cron (every 6 days at 12:00 UTC) or a Cloudflare Worker Cron Trigger that hits a Supabase REST endpoint (e.g. `select 1 from public.health`). Prefer the Worker (no failure modes from GHA being disabled). Document both.

**Acceptance:** Two consecutive weeks without user traffic do not pause the Supabase project.

---

### T-217 — R2 lifecycle + backup to B2 🔵
**Phase:** Deploy (Mode B)
**Depends on:** T-210
**Files:** `infra/deploy/r2-lifecycle.json`, `.github/workflows/r2-backup.yml`
**Context:** `free-tier-catalog.md` §C.
**Task:** Configure R2 lifecycle: `media-chunks/` objects older than 7 days auto-deleted (stale tus uploads). Schedule a weekly cross-region backup of `media-raw/` to **Backblaze B2** (10 GB free, $0.005/GB egress thereafter) using `rclone` in a GitHub Actions workflow. Backup is incremental.

**Acceptance:** A simulated R2 wipe can be restored from B2 within an hour.

---

### T-218 — Cloudflare Pages deploy for `apps/web` 🟢
**Phase:** Deploy (Mode B); useful in Mode A too
**Depends on:** T-016, T-210
**Files:** `apps/web/wrangler.toml` or `apps/web/.cloudflare/`, `.github/workflows/pages-deploy.yml`
**Context:** `hosting-options.md` §3 — Cloudflare Pages over Vercel.
**Task:** Configure Next.js for Cloudflare Pages using `@cloudflare/next-on-pages`. Add GH Actions deploy on push to `main` (production) and PR previews (limit to main-only if hitting the 500-builds/mo cap). Custom domain `app.{domain}` via CF DNS + Pages binding.

**Acceptance:** Push to `main` → live at `https://app.{domain}` in under 3 minutes.

---

### T-219 — Cloudflare Pages deploy for `apps/share` 🟢
**Phase:** Deploy (Mode B); applicable to Mode A too
**Depends on:** T-100, T-218
**Files:** `apps/share/wrangler.toml`, `.github/workflows/share-deploy.yml`
**Context:** spec F7.1, F7.2; `hosting-options.md`.
**Task:** Static export of `apps/share`, deployed to its own CF Pages project on `share.{domain}`. The share page reads HLS manifests from R2 public bucket; no API call needed for playback (only for the view-counter beacon, which goes to a CF Worker — T-220).

**Acceptance:** A public share URL plays HLS directly from R2 with no API involvement.

---

### T-220 — Cloudflare Worker: share-beacon view counter 🟡
**Phase:** Deploy (Mode B)
**Depends on:** T-100, T-210
**Files:** `infra/workers/share-beacon/`
**Context:** spec F7.1 — view counter is rate-limited per IP-day.
**Task:** A Cloudflare Worker at `beacon.{domain}/s/:token/view` that: (1) checks Turnstile token, (2) does per-IP-per-day dedup via Workers KV, (3) increments a counter via Supabase REST (or buffers in KV + flushes hourly). 100k req/day free tier covers ~3M monthly views.

**Acceptance:** Loading a share page from 5 different IPs increments the count by 5; reloading from the same IP within 24h doesn't increment.

---

## Dependency cheatsheet

```
T-001 ── T-002, T-003, T-004, T-005
T-003 ── T-010, T-012, T-013, T-014, T-017, T-020, T-022, T-070, T-121, T-122
T-010 ── T-011, T-013, T-020
T-013 ── T-015
T-005 ── T-015
T-011 ── T-015
T-015 ── T-016, T-023, T-030, T-043, T-051, T-060, T-110, T-120, T-123, T-140, T-142, T-150, T-151, T-202
T-020 ── T-021
T-021 ── T-022 ── T-023
T-021 ── T-032, T-041, T-090, T-130, T-132, T-133
T-030 ── T-031, T-141
T-031 ── T-033, T-040, T-200
T-040 ── T-042, T-043, T-060, T-081, T-091, T-131
T-041 ── T-040
T-016 ── T-050, T-061, T-072, T-140
T-050 ── T-051
T-060 ── T-061, T-062, T-063, T-071
T-061 ── T-063, T-111
T-062 ── T-100, T-201
T-070 ── T-071, T-091, T-151
T-071 ── T-072, T-202
T-090 ── T-091, T-131, T-150, T-151
T-091 ── T-092, T-201
T-100 ── T-101, T-203
T-110 ── T-111, T-112
T-130 ── T-131
T-132 ── T-133
T-140 ── T-141 ── T-142
T-150 ── T-151

# Mode B (managed free-tier) deploy chain — independent of Phases 0–15 core build
T-011, T-015 ── T-210
T-210 ── T-212, T-216, T-217, T-218, T-219, T-220
T-211 (adapters) ── T-212
T-070, T-211 ── T-214
T-121 (or T-211) ── T-215
T-015, T-100 ── T-213, T-220
T-016, T-210 ── T-218
T-100, T-218 ── T-219
```

R1 wedge (🟢) — fastest path to a usable product — sequence:
`T-001 → T-002 → T-003 → T-004 → T-005 → T-010 → T-011 → T-012 → T-013 → T-014 → T-015 → T-016 → T-017 → T-020 → T-021 → T-030 → T-031 → T-032 → T-040 → T-041 → T-043 → T-050 → T-060 → T-061 → T-062 → T-070 → T-071 → T-072 → T-090 → T-091 → T-100 → T-120 → T-200 → T-201`

---

*End of tickets. Update this file as new work is identified; preserve IDs (don't renumber).*
