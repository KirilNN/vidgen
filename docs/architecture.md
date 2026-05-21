# Architecture — Open-Source, $0-Cost, Docker-First

> **Companion to** `product-specifications/`. This document is the engineering blueprint for the platform described in those PRDs (Capture → Edit → Create → Enhance → Translate → Repurpose → Distribute → Operate → Trust → API → Verticals).
>
> **Three load-bearing constraints:**
>
> 1. **Reuse OSS, do not reinvent.** Every box in the diagram below maps to an existing, actively maintained open-source project. Custom code only at the seams (glue, UX, business logic, prompts).
> 2. **Target marginal cost = $0.** The entire system runs on free tiers, self-hosted on consumer hardware, or on owner-provided compute. Paid services are *optional adapters* the operator can swap in later.
> 3. **Local-first, Docker-native.** Every component must boot from `docker compose up` on a single laptop (16 GB RAM, optional GPU) and pass an end-to-end smoke test before anything is deployed.
>
> Nothing in here contradicts the product specs — it picks technology for each PRD.

---

## 0. Reading guide

- §1 Principles and the $0 budget envelope
- §2 The reference topology (one diagram, then component-by-component)
- §3 Mapping each product pillar (F1–F11) to OSS components
- §4 Local Docker setup (`docker compose` profiles for laptop vs GPU box)
- §5 Data model + storage layout
- §6 Async job + workflow plane (the heart of every long video op)
- §7 AI/ML inference plane (the part that wants a GPU but doesn't require one)
- §8 Frontend / mobile architecture
- §9 Realtime + collaboration plane
- §10 Distribution / edge / CDN strategy
- §11 Trust, compliance, multi-tenant isolation
- §12 Observability, ops, support
- §13 Deployment paths (laptop → single VPS → multi-node → cloud burst)
- §14 Cost ledger: how each line item stays at $0
- §15 Build order — what to ship first to validate the architecture cheaply
- §16 Risks and explicit non-goals for V1

---

## 1. Architectural principles (engineering, not product)

These translate the product principles (P1–P12 in `00-README.md`) into engineering rules.

| # | Principle | Why |
|---|---|---|
| **E1** | **Stateless services, durable queues.** All long ops (transcribe, render, dub) run as resumable jobs in a workflow engine, never inside a request. | Maps to P1 (stable at scale) and to crash-safe recording (F1.1). |
| **E2** | **One artifact, many renditions.** Source media is immutable in object storage; renders are derived and rebuildable. | Lets us delete derivatives to save space; makes P6 (reversible) cheap. |
| **E3** | **Local AI by default, hosted AI as adapter.** Every AI feature has a local-OSS path (Whisper, XTTS, SAM2, LaMa, NLLB, Llama, etc.). Hosted API providers are pluggable when speed or quality matters. | Keeps cost = $0; lets operator pay for quality on demand. |
| **E4** | **Single binary in dev, scale-out in prod.** Each service must run as a single container locally, and as N replicas behind a load balancer in prod, with identical config. | One mental model, no "works on my laptop only." |
| **E5** | **Tenant data is partitioned by `workspace_id` at the row + bucket prefix level from day one.** | Avoids painful re-architecting for F8.4 / F9.x / F11.7. |
| **E6** | **Everything is content-addressed where it can be.** Media chunks, transcripts, embeddings keyed by hash → free dedup + cache. | Cost saving for repeat imports. |
| **E7** | **No vendor lock-in at the data layer.** Postgres (not Aurora), S3-compatible (not S3-only), OIDC (not Cognito-only), MQTT/AMQP/NATS-style queues with portable contracts. | A future paying customer can self-host. Also future-proofs the $0 plan. |
| **E8** | **All AI outputs link to source moment (P4 verifiable AI).** Every transcript word carries a `media_id + offset_ms`; every clip suggestion carries a `[start_ms, end_ms]`; every translation carries a `source_segment_id`. | Hard requirement of F2.1, F2.4, F6.6, F6.8. |
| **E9** | **Feature flags + per-tenant tiering live in config, not code.** | Lets P3 (generous free tier) ship without spaghetti. |
| **E10** | **Every async op emits a webhook event.** | Powers F9.6, F10.2, F8.9, mobile push (F1.5). |

---

## 2. Reference topology (one picture)

```
                      ┌────────────────────────────────────────────────┐
                      │                    EDGE                        │
                      │  Cloudflare Tunnel (free) → Caddy reverse-proxy│
                      │  Cloudflare R2 / MinIO public bucket for CDN   │
                      └───────────────┬────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────────┐
        │                             │                                 │
   ┌────▼────┐                  ┌─────▼─────┐                     ┌─────▼─────┐
   │ Web App │                  │ Mobile    │                     │ Public    │
   │ (Next/  │                  │ (Expo /   │                     │ Share/    │
   │  Vite + │                  │  RN)      │                     │ Embed UI  │
   │  React) │                  └─────┬─────┘                     │ (static)  │
   └────┬────┘                        │                           └─────┬─────┘
        │                             │                                 │
        └──────────────► API Gateway / BFF (Fastify or NestJS) ◄────────┘
                                      │
        ┌────────────────┬────────────┼────────────┬─────────────────────┐
        │                │            │            │                     │
   ┌────▼─────┐    ┌─────▼─────┐ ┌────▼─────┐ ┌────▼─────┐         ┌────▼─────┐
   │  Auth    │    │ Realtime  │ │ Workflow │ │ Search   │         │ Webhook  │
   │ Keycloak │    │ LiveKit + │ │ Temporal │ │ Meili +  │         │ Bus      │
   │ (OIDC,   │    │ Hocuspocus│ │ (job orch│ │ Qdrant   │         │ Novu     │
   │  SAML,   │    │ (Yjs)     │ │  & sagas)│ │ (vectors)│         │ + NATS   │
   │  SCIM)   │    └─────┬─────┘ └────┬─────┘ └────┬─────┘         └────┬─────┘
   └────┬─────┘          │            │            │                    │
        │                │            │            │                    │
        └────────────────┴────────────┼────────────┴────────────────────┘
                                      │
                ┌─────────────────────┼─────────────────────┐
                │                     │                     │
         ┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐
         │ Postgres    │       │ Redis /     │       │ MinIO       │
         │ (+ pgvector,│       │ DragonflyDB │       │ (S3 API)    │
         │  + Citus    │       │ (cache, RT) │       │ media+derivs│
         │  optional)  │       └─────────────┘       └─────────────┘
         └─────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────────┐
        │                  AI / MEDIA WORKER POOL                       │
        │                                                               │
        │  FFmpeg │ MLT  │ Remotion │ Whisper.cpp │ XTTS │ SAM2 │ LaMa │
        │  ProPainter │ DeepFilterNet │ Demucs │ NLLB │ Wav2Lip │      │
        │  LivePortrait │ AnimateDiff │ Ollama (Llama/Qwen) │ etc.     │
        │                                                               │
        │  Each is a small container, pulled by Temporal workers, runs  │
        │  CPU or CUDA depending on host capability.                    │
        └───────────────────────────────────────────────────────────────┘
```

Read this from top to bottom: requests enter at the edge, hit a thin BFF, fan out to a few stateful planes (auth / realtime / workflow / search / events), all of which sit on three stores (Postgres, Redis, MinIO). Heavy media + AI work is always *queued*, never in-band.

---

## 3. Component selection per pillar

The rule: **for each product feature, name the OSS project we'll actually use.** No "we'll evaluate" — we already evaluated. Replace later if needed.

### 3.1 Pillar 1 — Capture (F1.1 – F1.7)

| Need | OSS choice | Notes |
|---|---|---|
| Browser screen + cam + mic recorder | `MediaRecorder` API + `getDisplayMedia` + custom React glue | Buffer to IndexedDB every 5 s for crash recovery (F1.1 requirement). |
| Resumable / chunked upload | **tus.io** (`tusd` server, `tus-js-client`) | Battle-tested resumable protocol; satisfies F1.7. |
| Remote multi-guest rooms (F1.3) | **LiveKit OSS** (self-hosted SFU) | Apache 2; local-record-per-participant + cloud backup; mobile guest via WebRTC. |
| Producer mode (F1.4) | LiveKit metadata + custom data channel; producer joins as silent participant with control RPC | No extra component. |
| Mobile native apps (F1.5) | **Expo / React Native** with `expo-camera`, `expo-av`, `expo-notifications` | Single codebase, FOSS, free build via EAS local builds. |
| QR mobile→desktop (F1.6) | `qrcode` lib (Node) + tus upload endpoint with one-shot signed token | Pure code; no extra dep. |
| Cloud-drive import (F1.7) | Provider OAuth via `openid-client`; SDKs only when free + self-contained: Google Drive REST, Dropbox v2, MS Graph (OneDrive), Box API, Zoom REST | Server-to-server stream → MinIO; no client download. |
| Auto-transcribe on capture | See §3.4 (Whisper) | Triggered by Temporal on upload completion event. |

### 3.2 Pillar 2 — Edit (F2.1 – F2.8)

| Need | OSS choice | Notes |
|---|---|---|
| NLE engine (timeline → render) | **MLT Framework** + **FFmpeg** | MLT is what Shotcut/Kdenlive use; gives us multi-track composition free. |
| Web editor frontend | React + TypeScript + **Zustand** + **Tldraw** (storyboard canvas, F2.3) | Tldraw is MIT-ish (with permissive watermark conditions for OSS). |
| Browser-side preview | **WebCodecs API** + `mp4box.js` + a thin custom timeline player | Avoids server preview render for most edits. |
| Text-based editing model (F2.1) | Custom; transcript is the source of truth, timeline derived | See §5.3 (transcript data model). |
| Transcription (F2.4) | **WhisperX** (faster-whisper + word-level alignment) + **pyannote-audio** for diarization | All OSS; GPU optional, CPU works. |
| Animated captions (F2.5) | **Remotion** (MIT) for render + a library of caption templates as Remotion components | Lets us export the same template to MP4 server-side and preview in browser. |
| AI Co-pilot (F2.6) | **Ollama** (Llama 3.x / Qwen 2.5) + **LangGraph** for tool-use orchestration + custom tool catalog (apply-edit, generate-caption, etc.) | Co-pilot calls *the same* APIs as the UI — no parallel logic. |
| Templates gallery (F2.7, F2.8) | JSON spec stored in Postgres; renderer is Remotion + MLT | Templates are data, not code. |

### 3.3 Pillar 3 — Create / Generate (F3.1 – F3.10)

| Need | OSS choice | Notes |
|---|---|---|
| LLM brain (script, brainstorm, copy) | **Ollama** running Llama 3.1 8B / Qwen 2.5 14B locally; **vLLM** for higher throughput when GPU available | Free; switch to hosted (OpenRouter free tier, Groq free tier, Gemini free tier) via adapter when needed. |
| TTS (F3.3) | **Coqui XTTS v2** (multilingual), **Piper** (lightweight CPU), **F5-TTS** (high quality) | XTTS handles 17+ languages. |
| Voice clone (F3.4) | **OpenVoice v2** or **F5-TTS** | 5–10 s reference; runs on CPU acceptably. |
| Talking avatar (F3.5, F3.6) | **SadTalker** (single photo → talking head), **LivePortrait** (more expressive), **Hallo** (lip-sync to audio) | All OSS, all CUDA-friendly; CPU fallback slow but works. |
| Character generator with identity consistency (F3.9) | **Stable Diffusion XL / Flux.1 schnell** + **IP-Adapter** + **InstantID / PuLID** for identity lock; **AnimateDiff** for short video; **ControlNet** for pose | All weights downloadable, no API. |
| B-roll image / video (F3.2) | **Flux.1 schnell** (Apache-licensed weights) for stills; **CogVideoX** / **AnimateDiff** / **HunyuanVideo** for short clips; **Stable Video Diffusion** as fallback | GPU-bound — see §7. |
| Voice changer effects (F3.7) | **RVC** (Retrieval-based Voice Conversion) + **so-vits-svc** | Real-time variants exist. |

### 3.4 Pillar 4 — Enhance (F4.1 – F4.10)

| Need | OSS choice | Notes |
|---|---|---|
| Studio sound / regenerative cleanup (F4.1) | **DeepFilterNet 3** (noise) + **Demucs** (stem separation) + **Resemble-Enhance** (regenerate quality) + Loudness norm (FFmpeg `loudnorm`) | Chain runs CPU-fine for ≤10 min clips. |
| Filler / silence / retake removal (F4.2) | Detect from WhisperX timestamps + a small local LLM classifier (Llama 3 8B) running over transcript | Transcript-driven, deterministic, fast. |
| Eye contact correction (F4.3) | **NVIDIA Maxine** is closed; OSS path = **eye-contact-lib** approach via **MediaPipe FaceMesh + GAN warp** (PR-friendly, slower). Document as "best-effort OSS" feature; degrade gracefully. | Honest about quality gap. |
| Background removal / green screen (F4.4) | **RobustVideoMatting** + **BackgroundMattingV2** + **MODNet**; **RemBG** for images | Real-time on GPU; per-frame on CPU. |
| Auto multicam / center active speaker (F4.5) | **pyannote-audio** speaker diarization + FFmpeg crop filter; for face-track use MediaPipe / YOLOv8-face | Pure pipeline, no model training. |
| Profanity censor (F4.6) | WhisperX word list → FFmpeg `bleep` filter + caption mask | Trivial once we have word timings. |
| Lip-sync regeneration (F4.7) | **MuseTalk** or **Wav2Lip** (latter has license caveats; prefer MuseTalk) | GPU strongly recommended. |
| AI relight / color (F4.8) | **IC-Light** (relight), **DaVinci Resolve** free for color reference; auto-color = OpenCV CLAHE + LUTs | Resolve is free but not OSS; we ship our own basic auto-color and offer a "send to Resolve" option (see F10.7). |
| Inpainting / object remove (F4.9) | **LaMa** (images), **ProPainter** / **E2FGVI** (video), **SAM 2** for mask generation, **GroundingDINO** for text-prompted masks | "Remove the lamppost" = GroundingDINO mask → ProPainter fill. |
| Style transfer (F4.10) | **AnimateDiff + ControlNet + IP-Adapter** style transfer; **Rerender-A-Video** for temporal coherence | GPU-bound. |

### 3.5 Pillar 5 — Translate (F5.1 – F5.5)

| Need | OSS choice | Notes |
|---|---|---|
| Caption translation, 100+ languages | **NLLB-200** (Meta, CC-BY-NC) for breadth; **MADLAD-400** as permissive alternative; **Argos Translate** (CPU-friendly fallback) | We default to MADLAD where licensing forbids commercial use of NLLB. |
| Dubbing / voice translation (F5.3) | XTTS v2 (multilingual TTS) + the voice clone above + lip-sync (MuseTalk) | Pipeline: WhisperX transcript → NLLB/MADLAD translate → XTTS in cloned voice → MuseTalk align mouth. |
| Native-trained dubbing voices (F5.4) | Curated XTTS / OpenVoice speaker bank with locale-tagged samples (CC0 voice donations) | Build a small open voice library; let users contribute. |
| Bilingual / display modes (F5.2, F5.5) | Pure renderer logic (Remotion captions) | No new component. |

### 3.6 Pillar 6 — Repurpose (F6.1 – F6.8)

| Need | OSS choice | Notes |
|---|---|---|
| Copywriter suite (F6.1) | Ollama + LangGraph + per-channel prompt templates (data, not code) | Same brain as Co-pilot. |
| Brand voice / ICP guidelines (F6.2) | RAG over `brand_voice` documents using **pgvector** + sentence-transformers (BGE-M3 multilingual) | Cheap, local. |
| Persistent workflow memory (F6.3) | Postgres tables + pgvector; **Letta (MemGPT)** as optional layer for hierarchical memory | Start simple. |
| Custom AI personas (F6.4) | Just system prompts + few-shot in a `personas` table | No new infra. |
| Custom-trained models (F6.5) | **Axolotl** + **Unsloth** for LoRA fine-tuning on local GPU; serve via vLLM/Ollama | Enterprise feature; opt-in. |
| Clip generator long→short (F6.6) | WhisperX transcript → local LLM scoring of "hookiness" + speaker-change boundaries + visual-energy heuristic (scene-detect via PySceneDetect) | Pipeline, no new heavy model. |
| Hook overlay + thumbnail (F6.7) | Flux.1 schnell for thumbnail; caption renderer for hook text | Reuses §3.3. |
| Natural-language video search (F6.8) | Multimodal embeddings via **OpenCLIP** (frames) + BGE-M3 (transcript chunks) → **Qdrant** | Hybrid search (text + vector). |

### 3.7 Pillar 7 — Distribute (F7.1 – F7.7)

| Need | OSS choice | Notes |
|---|---|---|
| Public share URL + view counter (F7.1) | Static page served from Caddy + signed short URL + Postgres counter via API beacon | No third-party analytics. |
| Auto-updating embed (F7.2) | iframe player (**Plyr** or **Video.js**) pointing at a stable manifest URL; HLS via FFmpeg `hls_segment` | Re-publish updates the manifest, embed picks it up. |
| Interactive video hosting (F7.3) | Player overlays via custom Plyr plugin; event capture via beacon endpoint | Polls/CTAs/branches as JSON timeline. |
| SCORM export (F7.4) | **Rustici-style SCORM wrapper** built from open templates (e.g. `scorm12-launcher`); produces zip with packaged HLS + manifest | One-time build. |
| Personalization at scale (F7.5) | Templated render via Remotion with row-of-data input; Temporal batch | Same engine as captions. |
| White-label embed (F7.6) | Same Plyr build with theming via CSS vars; per-tenant subdomain via Caddy on-demand TLS | $0 with Let's Encrypt. |
| Social scheduler (F7.7) | **Postiz** (AGPL, OSS social scheduler) as the engine, embedded via internal API; or **Mixpost** community edition | Don't rebuild this. |

### 3.8 Pillar 8 — Operate (F8.1 – F8.9)

| Need | OSS choice | Notes |
|---|---|---|
| Brand kit storage / governance (F8.1, F8.4) | Postgres + MinIO + small Next.js admin UI | No new infra. |
| Real-time collab editing (F8.2) | **Yjs** + **Hocuspocus** (CRDT) | Mature, proven (used by Notion-likes, Affine). |
| Roles & permissions (F8.3) | **Cerbos** (OSS policy engine) or **OpenFGA** (Google Zanzibar OSS) for fine-grained ACLs | Externalises auth logic. |
| Planner (Kanban) (F8.5) | Custom React + Postgres; no new component | Trivial. |
| Calendar (F8.6) | Same; FullCalendar OSS for UI | Trivial. |
| Comments / approvals (F8.7) | Custom on Postgres; threads + transcript anchors | Reuses E8 (everything is moment-linked). |
| Multi-client agency workspace (F8.8) | Workspace = row in `tenants`; RLS in Postgres + Cerbos policies | Same primitives. |
| Slack / Teams notifications (F8.9) | **Novu** (OSS notification infrastructure) drives webhooks → Slack/Teams webhooks | One config per integration. |

### 3.9 Pillar 9 — Trust & Compliance (F9.1 – F9.7)

| Need | OSS choice | Notes |
|---|---|---|
| SSO / SAML / SCIM (F9.2) | **Keycloak** (Apache 2) or **Zitadel** (Apache 2) | Both ship SAML + SCIM out of box. |
| GDPR / data residency (F9.3) | Operational: per-tenant region tag on `workspaces`; MinIO buckets per region; Postgres logical replicas per region | Architectural, not a product. |
| HIPAA / BAA posture (F9.4) | Disk-level encryption (LUKS on host), at-rest envelope encryption in MinIO, audited PHI tag on `assets`, audit log immutability | We can claim posture; certifications are paid (not $0). Mark as roadmap. |
| FedRAMP-aligned (F9.5) | Same shape; deployment recipes for STIG'd Ubuntu base image | Posture only; cert costs money. |
| Webhooks (F9.6) | Novu + signed HMAC + retry queue (Temporal) | Already there. |
| Audit logs | **OpenTelemetry** logs → **Grafana Loki** with tamper-evident batches (signed hash chain in Postgres) | Free, durable. |
| Trust center (F9.7) | Static site (Astro / Next static export) auto-built from policies repo | Free hosting (Cloudflare Pages). |
| SOC 2 / ISO 27001 | **NOT free.** Treat as a paid milestone — `drata`, `vanta` alternatives include **Comp AI** (OSS) for evidence collection; certification audits cost money. Architecture is *audit-ready*; the audit itself is outside the $0 envelope. | Documented honestly. |

### 3.10 Pillar 10 — API & Integrations (F10.1 – F10.8)

| Need | OSS choice | Notes |
|---|---|---|
| Public REST API (F10.1) | Generated from a single **OpenAPI 3.1** spec; **Fastify** serves it; **Scalar** for docs UI | One source of truth. |
| Webhooks (F10.2) | Novu (covered). |  |
| MCP server (F10.3) | **Official MCP SDK** (TypeScript) wrapping the REST API; runs as a sidecar container | Same business logic, different transport. |
| ChatGPT plugin / custom GPT (F10.4) | OpenAPI spec is the plugin manifest; nothing extra | Free. |
| Zapier / Make / n8n (F10.5) | Generic webhooks + REST; ship an official **n8n** community node (OSS-friendly) | n8n is self-hostable too. |
| Browser extension (F10.6) | **WXT** framework (cross-browser); MV3 manifest | Hits the same API. |
| NLE round-trip (F10.7) | Export as **OTIO** (OpenTimelineIO, Apache 2) — Premiere/Resolve/FCPX all read it | Single export format → all NLEs. |
| Podcast host publishing (F10.8) | RSS generator + provider APIs (Buzzsprout, Transistor, Captivate); render MP3 with FFmpeg | Simple. |

### 3.11 Pillar 11 — Vertical packs (F11.1 – F11.7)

These are **configuration** (templates, prompt packs, default workflows), not new engineering. Stored as JSON in a `vertical_packs` table; loaded into the user's workspace on selection. Zero new components.

---

## 4. Local Docker setup

### 4.1 Profiles

`docker-compose.yml` defines a single stack with **profiles** so contributors only spin up what they need:

- `core` — Postgres, Redis, MinIO, Keycloak, Caddy, API, Web (always on)
- `media` — `ffmpeg-worker`, `mlt-worker`, `remotion-worker`
- `ai-cpu` — `whisper-cpu`, `piper`, `ollama` (small models), `argos-translate`, `rembg`, `lama`
- `ai-gpu` — `whisperx-gpu`, `xtts-gpu`, `sam2`, `propainter`, `livepoortrait`, `vllm` (large models)
- `realtime` — LiveKit SFU, Hocuspocus, NATS
- `obs` — Prometheus, Grafana, Loki, Tempo, OpenTelemetry collector
- `dev` — Mailpit (fake SMTP), MinIO console, pgAdmin, Temporal Web

A fresh contributor runs:

```bash
docker compose --profile core --profile media --profile ai-cpu up
```

…and gets a working laptop instance (no GPU required) with degraded AI quality but a complete loop: record → transcribe → edit → export.

### 4.2 GPU support

We use `--gpus all` (NVIDIA) or ROCm-flavored images. A `compose.gpu.override.yml` swaps the `ai-cpu` profile services for `ai-gpu` equivalents. The same Temporal task queue routes requests — workers self-register their capabilities (`gpu=true`, `vram=24GB`) and Temporal picks the right pool.

### 4.3 Local end-to-end smoke test

A `make smoke` target runs a scripted journey:

1. Create user → workspace via Keycloak admin API.
2. Upload a 30-second sample MP4 via tus.
3. Wait for Whisper transcription event.
4. Issue text-edit ops via REST (delete 2 words).
5. Render to MP4 via MLT/Remotion.
6. Verify checksum of expected output.
7. Translate captions to Spanish via NLLB/MADLAD.
8. Generate a vertical short clip via the clip generator workflow.

If `make smoke` passes locally, the deploy is allowed. CI runs the same target in GitHub Actions on every PR (free for our usage).

---

## 5. Data model + storage

### 5.1 Stores

- **Postgres 16** — primary OLTP. Extensions: `pgvector` (embeddings), `pg_trgm` (search), `pgcrypto` (envelope keys), `timescaledb` (event counters; optional).
- **Redis / DragonflyDB** — cache, rate limits, Yjs awareness ephemeral state, Temporal visibility cache.
- **MinIO** — S3-compatible object storage. Buckets:
  - `media-raw/{workspace}/{asset_id}/source.{ext}`  (immutable)
  - `media-derived/{workspace}/{asset_id}/{rendition}.{ext}` (rebuildable)
  - `media-chunks/{workspace}/tus/...` (in-flight uploads)
  - `public/{share_token}/...` (CDN-fronted)
- **Qdrant** — vector store for clip search (F6.8), brand-voice RAG, similar-asset lookup.
- **Meilisearch** — keyword/typo-tolerant search over project metadata + transcripts.
- **Loki / Tempo** — logs / traces (ops only).

All four user-data stores (Postgres / MinIO / Qdrant / Meilisearch) speak workspace-prefixed APIs. Single Postgres row-level-security policy `workspace_id = current_setting('app.workspace_id')` gates every query.

### 5.2 Core schema (excerpt)

```
tenants(workspace_id, name, region, tier, brand_kit_id, ...)
users(user_id, email, ...) ── tenant_members(workspace_id, user_id, role)
assets(asset_id, workspace_id, source_uri, sha256, duration_ms, mime,
       created_by, captured_via, tier_at_upload)
renditions(rendition_id, asset_id, kind, uri, params_json)
projects(project_id, workspace_id, name, brand_kit_id, ...)
project_clips(project_id, asset_id, in_ms, out_ms, track, z)
transcripts(transcript_id, asset_id, language, model, version)
transcript_segments(segment_id, transcript_id, start_ms, end_ms,
                    speaker, text, confidence)
transcript_words(word_id, segment_id, start_ms, end_ms, text)
captions(caption_id, asset_id, lang, format, style_json, uri)
edits(edit_id, project_id, op_jsonb, author_id, ts)        ─ event-sourced
renders(render_id, project_id, target, status, output_uri, started, ended)
workflows(workflow_id, kind, status, payload_uri, ...)      ─ mirrored from Temporal
comments(comment_id, project_id, anchor_ms, body, thread_id, author_id, ts)
audit_log(id, workspace_id, actor, action, target, hash_prev, hash_self, ts)
embeddings(asset_id, segment_id, kind, vector, model)        ─ pgvector
share_links(token, project_id, kind, expires_at, settings_json)
oauth_connections(user_id, provider, scopes, token_enc, refresh_enc, expires_at)
webhooks(workspace_id, url, events[], secret_enc)
```

### 5.3 Transcript-as-source-of-truth (F2.1)

The single most important model decision. The transcript carries word-level timestamps; the *project timeline* is a **derived view** projected from transcript + edit operations:

```
project_view(project_id, t) = fold(edits, t).materialize(transcripts, assets)
```

Edits are an event log: `delete_words([word_id...])`, `insert_clip(asset_id, in_ms, out_ms, at)`, `replace_segment(...)`, etc. The renderer (MLT/Remotion) takes the materialised view, not a stored timeline blob. Benefits:

- Undo/redo + collaboration via Yjs is straightforward.
- Re-transcribing a clip never invalidates edits made above the word level.
- AI ops (filler removal, profanity censor) emit edits, not direct media mutations — satisfies P6 + P10.

---

## 6. Async job + workflow plane

### 6.1 Temporal as the spine

**Every long op is a Temporal workflow.** Recording finalise, transcription, render, dub, clip generation, batch personalisation, scheduled publish, export to NLE, social posting — all of them.

Why Temporal: open-source (MIT), durable execution, automatic retries, signals (for human-in-the-loop pauses), schedule API. It's the single biggest reason we can promise P1 (crash-safe, resumable).

Workflows we'll define (illustrative):

- `IngestAssetWorkflow(asset_id)` → upload-finalise → transcode-to-mezzanine → transcribe → embed → notify
- `RenderProjectWorkflow(project_id, target)` → materialise edits → split into segments → fan out render tasks → stitch → checksum → publish
- `ClipGeneratorWorkflow(asset_id)` → score moments → propose clips → wait-for-user-approval signal → render selected
- `DubbingWorkflow(asset_id, target_lang)` → translate → TTS → lip-sync → mix → caption-translate
- `PublishWorkflow(project_id, channels[])` → poll-readiness → per-channel post → record analytics

Each workflow emits granular events on a NATS subject; Novu fans them out to webhooks, in-app inbox, push notifications, Slack/Teams.

### 6.2 Worker pools

- `worker-light` — orchestration, REST calls, OAuth refreshes. Small, many replicas.
- `worker-media` — FFmpeg / MLT / Remotion. CPU-heavy.
- `worker-ai-cpu` — Whisper.cpp, Piper, Argos, RemBG, LaMa-CPU.
- `worker-ai-gpu` — XTTS, SAM 2, ProPainter, Wav2Lip/MuseTalk, Flux, Llama-large.

Each worker advertises capabilities; Temporal task queues are named after capability classes. A laptop has only `worker-light` + `worker-media` + `worker-ai-cpu`; a GPU box adds `worker-ai-gpu`.

---

## 7. AI / ML inference plane

### 7.1 Local-first model registry

A `models.yaml` manifest lists every model the system can use, with: name, license, size, capability tag, default backend (Ollama / vLLM / native), hash, download URL. Worker startup pulls only what its capability set needs. Models cached on a shared volume (`/models`) keyed by hash → free across containers.

### 7.2 Hosted-API adapter pattern

Each AI capability has an interface:

```ts
interface Transcriber { transcribe(asset, opts): Promise<Transcript>; }
```

Implementations:

- `WhisperLocal` (Whisper.cpp, free, default)
- `WhisperX` (faster-whisper + diarization, free, GPU)
- `GroqAPI` (Groq distil-whisper free tier, optional, requires key)
- `DeepgramAPI` (paid, optional)

Operator chooses per workspace tier. Free tier = local default. **No code path is exclusive to a hosted API.**

Same shape for `Translator`, `TTS`, `LLM`, `ImageGen`, `VideoGen`, `Matter`, `Inpainter`, `LipSyncer`.

### 7.3 Quality tiers

Three quality presets — **draft / standard / max** — map to model selection. Free tier defaults to *draft* on heavy operations (smaller Whisper, Piper TTS, MADLAD translate); paid tiers default to *max*. Lets us honour P3 (every feature works on free) and P2 (no surprise paywall) — quality differs, capability doesn't.

### 7.4 Cold-start strategy

Models load lazily, kept warm with TTL (15 min idle → unload). On a laptop, only one large model is resident at a time; Temporal sequences GPU-bound tasks via a `gpu-mutex` activity if VRAM is tight.

---

## 8. Frontend / mobile

### 8.1 Web

- **Next.js** (App Router) for the marketing site + auth shell + dashboard.
- **Vite + React + TypeScript** for the heavy editor (loaded via dynamic import; Next handles routing).
- **TailwindCSS** + **shadcn/ui** (MIT).
- **TanStack Query** for server state; **Zustand** for editor state; **Yjs** for collaborative state.
- **Remotion** for both server render *and* preview component library (same React components in both places — single source of caption styling, etc.).
- **Tldraw** for the storyboard canvas (F2.3).
- **Plyr / Video.js** for embedded players (F7.x).
- **Sentry-compatible** error reporting via **GlitchTip** (self-hosted, OSS).

### 8.2 Mobile

- **Expo (React Native)** for both iOS + Android. EAS Local Build to avoid paid build minutes.
- Shared types + API client with web (monorepo via **Turborepo** or **Nx**, both OSS).
- Local capture buffered to SQLite; uploaded via tus.

### 8.3 Browser extension

- **WXT** framework, single codebase for Chrome / Edge / Firefox.
- Auth via the same Keycloak OIDC flow (PKCE).

### 8.4 Monorepo layout (sketch)

```
/apps
  /web        Next.js + Vite editor
  /mobile     Expo
  /extension  WXT
  /share      Static share/embed pages
/services
  /api        Fastify
  /worker     Temporal workers (per capability)
  /mcp        MCP server
/packages
  /sdk-ts     Generated from OpenAPI
  /editor-core (timeline model, edit ops, used by web + mobile)
  /caption-ui (Remotion components)
  /ui         shadcn primitives
/infra
  /compose    docker-compose files + profiles
  /helm       Kubernetes charts (for cloud burst)
  /terraform  Optional, for paid deployments
```

---

## 9. Realtime + collaboration

- **Yjs documents** per project, persisted via **Hocuspocus** server with Postgres backend.
- **LiveKit** for media rooms (F1.3) and for the producer side channel (F1.4) via data tracks.
- **NATS JetStream** as the event bus (lighter than Kafka, plenty for our scale).
- Awareness / presence cursors via Yjs awareness, no extra service.

Conflict model:
- Transcript edits → CRDT (Yjs).
- Timeline ops → CRDT (Yjs) on the materialised view.
- Rendering / publishing → single-writer (workflow holds a project lock).

---

## 10. Distribution / edge / CDN

The $0 plan leans on:

- **Cloudflare Tunnel** (free) to expose self-hosted ingress without a public IP.
- **Cloudflare R2** (free tier: 10 GB storage, no egress fees) for the `public/` bucket of share pages and embed manifests.
- **Cloudflare Pages** (free) for the static share/embed front-end and the trust center.
- **Caddy** as the reverse proxy with automatic Let's Encrypt for any custom domains (per-tenant white-label, F7.6, costs $0 because Let's Encrypt is free and Caddy automates).
- **HLS** streaming via FFmpeg → MinIO → Caddy (no special media server). Players are Plyr / Video.js with `hls.js`.

When R2 free tier is exceeded, we self-host MinIO behind Cloudflare CDN cache (cache hits = $0 egress).

---

## 11. Multi-tenant, isolation, compliance shape

- **Workspace ID is mandatory** on every row, bucket prefix, vector payload, queue task.
- **Postgres RLS** enforced. App sets `SET LOCAL app.workspace_id = ...` per request.
- **Keycloak realms or groups** per tenant for SSO/SAML/SCIM (F9.2).
- **Cerbos / OpenFGA** for fine-grained roles (F8.3 / F8.4 / F8.8).
- **Audit log** is append-only, hash-chained, exported daily to MinIO with object lock (S3 worm).
- **PII / PHI tags** on `assets` and `transcripts` propagate to render outputs; export pipelines check the tag against destination policy (F9.4).
- **Data residency** = region column on `workspaces`; storage adapters + Postgres routing layer respect it. A region is just another deployment of the same stack.

---

## 12. Observability & support

- **OpenTelemetry** SDKs everywhere (Node, Python, Go workers).
- **Prometheus** scrapes services; **Grafana** dashboards.
- **Loki** for logs; **Tempo** for traces.
- **GlitchTip** (OSS, Sentry-compatible) for error tracking.
- **Uptime Kuma** (OSS) for status page (F9.7 / P12).
- **PostHog OSS** (self-host) for product analytics — replaces Mixpanel / Amplitude, $0.

Support tooling:
- **Chatwoot** (OSS) for in-app support chat (P12).
- Ticket-to-incident bridge via webhooks.

---

## 13. Deployment paths

The same `docker compose` stack scales up:

| Stage | Hardware | What runs | $/month |
|---|---|---|---|
| **0. Laptop** | 16 GB MacBook | core + media + ai-cpu profiles | $0 |
| **1. Home server** | Used desktop + 1 consumer GPU (e.g. RTX 3060/4060) | all profiles | electricity only |
| **2. Single VPS** | Hetzner CX22 (€4) or Oracle Free Tier (Always Free Ampere A1: 4 vCPU / 24 GB RAM) | core + media; AI via owner's home GPU via Tailscale | $0 on Oracle Free Tier |
| **3. Multi-node** | k3s on 3 nodes (one with GPU) | full stack, replicated | hardware only |
| **4. Cloud burst** | Add hosted-API adapters for spikes | only when a customer is paying | pay-as-you-go |

Cloudflare Tunnel + Oracle Always-Free + a home GPU gets us to a globally reachable production-shaped deployment at literally $0 recurring.

K8s manifests (Helm charts) live in `/infra/helm` for the day a paying customer wants their own deployment.

---

## 14. Cost ledger — how each item stays at $0

| Concern | $0 path | Paid escape valve |
|---|---|---|
| Compute | Owner hardware + Oracle Always Free (A1 24 GB) | Hetzner / Fly / any VPS |
| Object storage | MinIO on owner disk + R2 free tier (10 GB) | R2 / S3 / B2 |
| CDN / egress | Cloudflare cache + Tunnel (free) | Bunny / Fastly |
| Database | Postgres in container | Supabase free → paid |
| DNS / TLS | Cloudflare DNS + Let's Encrypt | — |
| LLM inference | Ollama local | Groq free tier → OpenRouter → OpenAI |
| Transcription | Whisper.cpp local | Groq distil-whisper free → Deepgram |
| TTS | XTTS / Piper local | ElevenLabs |
| Image gen | Flux.1 schnell local | fal.ai / Replicate |
| Translation | MADLAD / Argos local | DeepL free → paid |
| Video gen | CogVideoX / AnimateDiff local | Runway / Pika |
| Auth | Keycloak self-host | Auth0 |
| Email | Mailpit (dev) / **Resend free tier** (3k/mo) / Amazon SES | Postmark |
| Push (mobile) | Web Push (free) + Expo Push (free) | — |
| Error tracking | GlitchTip self-host | Sentry |
| Analytics | PostHog self-host | PostHog Cloud |
| Status page | Uptime Kuma | StatusPage |
| Source / CI | GitHub Actions free minutes | — |
| Container registry | GHCR free | — |
| Mobile builds | Expo EAS local builds | EAS paid |
| App store fees | Apple $99/yr, Google $25 one-time | **Not $0** — earliest paid line item |
| Compliance audits (SOC 2 etc.) | **Not $0** — posture only; audits cost real money | Acknowledge in roadmap |

Outside the $0 envelope, by design: app store developer fees, third-party audit certifications, and any *commercial* model licenses (we'll avoid those — see §16).

---

## 15. Build order (what we ship first to validate the architecture cheaply)

Sequenced so each step proves a key piece of the architecture is real, not theoretical.

1. **`docker compose --profile core up` works.** Postgres + MinIO + Keycloak + Caddy + API + Web. Login lands on an empty dashboard.
2. **Upload + transcribe.** tus upload → Temporal `IngestAssetWorkflow` → Whisper.cpp → transcript visible. Proves the workflow + storage spine.
3. **Text-based edit + render.** Delete a word in the transcript → MLT render → MP4 download. Proves the edit model + render pipeline.
4. **LiveKit Rooms with local recording.** Two browsers join; upload per-track on stop. Proves realtime + multi-track ingest.
5. **Captions render + share URL.** Remotion captions burned in; share token serves HLS via Caddy. Proves distribution path.
6. **AI Co-pilot loop.** Ollama + LangGraph calls REST tools. "Remove fillers." Proves AI adapter pattern.
7. **Translate + dub.** MADLAD + XTTS + MuseTalk on a short clip. Proves the AI pool composability.
8. **Mobile capture → web project.** Expo app shoots video, tus uploads, web sees it. Proves cross-surface state.
9. **Webhooks + audit log.** Novu fires on render-complete; audit chain verifies. Proves trust hooks.
10. **Vertical pack JSON loads.** One pack (sermon repurpose) onboards a workspace with prompts + templates. Proves the config-not-code claim for verticals.

Anything not on this list is deferred until the above is green.

---

## 16. Risks and explicit non-goals (V1)

- **Model licenses.** Several attractive models are non-commercial (NLLB-200 CC-BY-NC, Wav2Lip, parts of SVD). We default to permissive alternatives (MADLAD, MuseTalk, Flux.1 schnell, AnimateDiff). We will *never* ship a non-commercial model behind a paid feature; OK to expose it on free tier with a clear disclosure, or behind a "bring your own model" toggle.
- **Eye contact (F4.3) quality** with OSS is below NVIDIA Maxine. We ship best-effort and label as beta.
- **Mobile lip-sync** quality is GPU-bound; mobile users get the cloud-render path (still local AI, just on a server) — no degraded UX, just routed work.
- **SOC 2 / ISO certification cost.** The *architecture* is audit-ready; the *audits* cost money and are explicitly excluded from the $0 envelope.
- **App store developer fees** are not avoidable.
- **Compliance with broadcast codecs** (ProRes, DNxHR) requires licensed encoders for true round-trip. We use OSS approximations and OTIO for project interchange; full ProRes round-trip is post-V1.
- **We are not building** our own video codec, our own LLM, our own SFU, our own database, our own auth, or our own search engine. If we're tempted, re-read principle #1.

---

*End of architecture.*
