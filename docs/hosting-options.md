# Hosting Options — Local vs Managed Free-Tier vs Hybrid

> Companion to `architecture.md` (which mandates local-first OSS + $0) and `build-plan.md`.
> This doc compares the **local-Docker** path with a **managed-free-tier** path, and recommends a **hybrid** as the default for getting from laptop to public demo with $0 recurring spend.

> This file is the **recommendation**. For the *exhaustive* free-tier menu (every category, every alternative, what breaks them), see `free-tier-catalog.md`.

## TL;DR

| Question | Answer |
|---|---|
| Can we use Supabase / Vercel / etc. to skip self-hosting? | **Partially.** Use **Cloudflare Pages** (not Vercel — Vercel free disallows commercial use). Use **Supabase** for metadata DB + auth only — never for video bytes (500 MB DB, 1 GB file storage caps you fast). |
| Does the architecture allow it? | **Yes** — arch §3.x explicitly says every component is an *adapter*. Storage, auth, LLM all already have a hosted-API adapter pattern (arch §7.2). |
| Does it break the $0 promise? | **Not for early stage.** It actually makes $0 easier because you skip ops. It breaks the moment you exceed a free tier — usually because of video bytes. |
| What's the failure mode? | **Video storage and egress.** Every managed free tier collapses under video. Plan for object storage to be the first paid line item or self-hosted from day one. |
| Net recommendation | **Hybrid:** managed control-plane (DB/auth/web/cache) + self-hosted data-plane (media, AI workers) on owner hardware + Cloudflare for edge. |

---

## 1. The two deployment modes

The architecture already documents Mode A (arch §13). Mode B is the new option this doc adds. **Both share the same code** because of arch's adapter pattern (E3, E7). Switching modes is config, not a rewrite.

### Mode A — Local / Self-host (what the arch + tickets currently build)

`docker compose up` on a laptop or a single VPS (Oracle Always Free A1: 4 vCPU / 24 GB RAM permanently free). All OSS. $0 forever. Full control.

**Use when:**
- You want the lowest absolute cost at any user scale.
- You want zero vendor lock-in.
- You're OK running infra.

### Mode B — Managed free-tier (new path this doc adds)

Plug-and-play hosted services for the *control plane*, owner hardware (or none, in MVP) for the *data plane*. Closer to a Vercel-style developer experience.

**Use when:**
- You want to ship a public demo this week with minimum ops.
- You're not ready to manage Postgres / Keycloak / MinIO.
- Traffic is small (early users, design partners).

**Stops working when:**
- Total stored video > a few GB.
- Daily AI inference > free-tier rate limits.
- You need always-on (Supabase pauses idle free projects after 7 days).

---

## 2. Component-by-component — free-tier picks (2025 limits)

| Arch component | Mode A (local OSS) | Mode B (managed free) | Free-tier ceiling that breaks you |
|---|---|---|---|
| **Web app hosting** | Caddy + Next.js container | **Cloudflare Pages** ✅ | Unlimited bandwidth, commercial OK, 500 builds/mo, 20k files/site |
| ⚠️ Don't use Vercel | — | Vercel Hobby ❌ | Forbids commercial use; 100 GB/mo |
| **Static share/embed** | Caddy serving HLS | **Cloudflare Pages** | same |
| **Postgres + pgvector** | Postgres container | **Supabase** ✅ | 500 MB DB, 5 GB egress/mo, **pauses after 7 days idle**, 2 free projects |
| ⚠️ Postgres is **metadata only** | (same) | (same) | Never store media bytes in Postgres or Supabase file storage. Media → R2. |
| **Auth (OIDC)** | Keycloak container | **Supabase Auth** or **Clerk** | Supabase: 50k MAU. Clerk: 10k MAU |
| **Object storage** | MinIO container | **Cloudflare R2** ✅ | 10 GB stored, 1M Class-A ops/mo, 10M Class-B ops/mo, **free egress** |
| Backup R2 path | — | **Backblaze B2** | 10 GB free, $0.005/GB egress (R2 is better) |
| **Cache / Redis** | DragonflyDB container | **Upstash Redis** | 10k commands/day, 256 MB, serverless |
| **Vector DB** | pgvector | pgvector on Supabase | (same as DB) — or Qdrant Cloud 1 GB free cluster |
| **Search** | Meilisearch container | **Meilisearch Cloud free** | 100k docs, 1 GB |
| **Workflow engine** | Temporal self-host | **Temporal Cloud** ❌ no real free tier | Self-host Temporal on Oracle Free A1 — see §3 |
| Alt: event-driven only | — | **Inngest** free | 1k steps/day, 50 functions — different abstraction, not a Temporal replacement |
| **Event bus / webhooks** | NATS + Novu containers | **Novu Cloud free** | 30k events/mo |
| **Email** | Mailpit (dev) | **Resend** ✅ | 3,000 emails/mo, 100/day |
| **Mobile push** | Web Push | **Expo Push** ✅ | Unlimited free |
| **Observability (metrics+logs+traces)** | Prometheus+Loki+Tempo | **Grafana Cloud Free** ✅ | 10k metric series, 50 GB logs, 50 GB traces, 14-day retention |
| **Error tracking** | GlitchTip container | **Sentry** ✅ | 5k errors/mo, 10k performance txns/mo |
| **Analytics** | PostHog self-host | **PostHog Cloud** ✅ | 1M events/mo, 5k recordings/mo |
| **Status page** | Uptime Kuma container | **BetterStack** | 10 monitors free |
| **Support chat** | Chatwoot container | **Crisp** | unlimited agents, basic |
| **CDN / TLS / DNS** | Cloudflare Tunnel | **Cloudflare** ✅ | already free, unchanged |
| **Email forwarding** | — | **Cloudflare Email Routing** ✅ | unlimited rules, `hello@`, `support@` for free |
| **Bot / CAPTCHA** | — | **Cloudflare Turnstile** ✅ | free, unlimited |
| **WAF / DDoS / rate-limit** | — | **Cloudflare** ✅ | free included |
| **AI gateway + caching** | — | **Helicone** ✅ | 100k req/mo, cuts repeat LLM cost via cache |
| **LLM tracing / evals** | Promptfoo CI | **LangFuse Cloud** ✅ | 50k observations/mo |
| **Edge functions** | — | **Cloudflare Workers** ✅ | 100k req/day — share beacon, webhook receivers, Supabase keep-alive cron |
| **Booking (design partners)** | — | **Cal.com** ✅ | free cloud tier |
| **CRM (founder pipeline)** | — | **HubSpot CRM** | free |
| **Forms / waitlist** | — | **Tally** | unlimited forms free |
| **Docs site** | MDX in repo | **Mintlify** or MDX on Pages | free for OSS |
| **Container registry** | GHCR | **GHCR** | unlimited public, generous private |
| **CI/CD** | GitHub Actions | **GitHub Actions** | 2,000 min/mo private; unlimited public |
| **AI: LLM** | Ollama local | **Groq** ✅ (Llama 3.x + distil-Whisper) | 30 req/min, 6k tokens/min, free |
| | | **Google Gemini** | 2M tokens/day Flash, free |
| | | **OpenRouter** | pay-per-use, some free models |
| | | **Cerebras** | free with rate limits |
| **AI: Transcription** | Whisper.cpp local | **Groq distil-Whisper** ✅ | very fast, free within rate limits |
| **AI: TTS** | XTTS v2 / Piper local | ❌ no usable free TTS | Self-host XTTS on home GPU or pay ElevenLabs |
| **AI: Translation** | MADLAD local | **DeepL API** | 500k chars/mo free — but commercial use restricted on free |
| | | **Google Translate** | $300 GCP credit then pay |
| **AI: Image gen** | Flux.1 schnell local | **Together AI** | $5 credit; **fal.ai** $1 credit; **HF Inference** rate-limited free |
| **AI: Video gen** | CogVideoX / AnimateDiff local | ❌ no free | Self-host on home GPU |
| **AI: Voice clone** | OpenVoice / F5-TTS local | ❌ no free | Self-host |
| **AI: Lip-sync (MuseTalk)** | self-host (needs GPU) | ❌ no free | Self-host on home GPU |
| **Heavy media render** | MLT + FFmpeg worker container | ❌ no free | Self-host (Oracle A1 ARM works for FFmpeg without GPU; for Remotion + GPU use home box) |
| **Realtime (Yjs)** | Hocuspocus container | **Liveblocks** | 100 MAU free — but lock-in; prefer Hocuspocus on a small VPS |

✅ = strongly recommended for Mode B
❌ = no acceptable free tier; self-host instead

---

## 3. Recommended hybrid stack (the **default** for new deploys)

This is the path I'd take to get a real public demo with $0 recurring. It honors arch's no-lock-in rule because every managed service is behind an adapter we already have or already plan.

```
                 ┌──────────────── EDGE ────────────────┐
                 │ Cloudflare Pages (web app, static)   │
                 │ Cloudflare R2 (public/share bucket)  │
                 │ Cloudflare Tunnel → home box / Oracle │
                 └──────────────────────────────────────┘
                              │
        ┌─────────────────────┼────────────────────────┐
        │                     │                        │
   ┌────▼─────┐         ┌─────▼─────┐            ┌─────▼─────┐
   │ Supabase │         │ Upstash   │            │ R2 bucket │
   │ Postgres │         │ Redis     │            │ media-*   │
   │ + Auth   │         │ (cache)   │            │ + public/ │
   │ + pgvec  │         │           │            │           │
   └──────────┘         └───────────┘            └───────────┘
                              │
   ┌──────────────────────────┼──────────────────────────┐
   │            OWNER HARDWARE (home box) or              │
   │            ORACLE ALWAYS FREE (A1, 24 GB ARM)        │
   │                                                      │
   │  Fastify API ──► Temporal ──► Workers ──► AI/Media   │
   │  Hocuspocus realtime              (FFmpeg / MLT /    │
   │  Novu (self-host or cloud free)    Whisper / Ollama  │
   │                                    / XTTS / etc.)    │
   └──────────────────────────────────────────────────────┘

   AI hot-burst → Groq (LLM + ASR) + Together/fal.ai (image)
                  via existing adapters when local is too slow
```

**Why this shape:**
- **Control plane** (auth, metadata, sessions, cache) lives in managed free tiers. You don't manage it; uptime is someone else's problem.
- **Data plane** (video bytes, AI inference, rendering) lives on owner hardware behind Cloudflare Tunnel. Bytes never traverse a paid CDN egress.
- **Cloudflare R2** holds public/shared media — free egress is the single most important $0 win for a video product.
- **Hosted-API adapters** (Groq, Gemini, etc.) handle bursts when local can't keep up — same code, swappable per request.

### Concrete monthly cost at MVP scale (10–100 design partners)

| Item | $/mo |
|---|---|
| Cloudflare Pages | 0 |
| Cloudflare R2 (≤10 GB stored, free egress) | 0 |
| Supabase Free | 0 |
| Upstash Free | 0 |
| Sentry Free | 0 |
| Resend Free | 0 |
| PostHog Cloud Free | 0 |
| GitHub Actions Free | 0 |
| Owner home box electricity | ~$5–15 |
| Oracle Always Free A1 (alt to home box) | 0 |
| Domain (mandatory) | ~$1 (e.g. `.app` on Cloudflare Registrar at-cost) |
| **Total** | **~$0–15/mo** |

At any meaningful traction this grows (see §5).

---

## 4. What changes in the code

Less than you'd think. The architecture already has adapter interfaces (arch §7.2). What we add:

| Existing interface | New Mode-B adapter |
|---|---|
| `Storage` (MinIO default) | `R2Storage` — same S3 SDK, different endpoint + creds |
| `Database` (Postgres) | Just a different connection string — Drizzle works against any Postgres |
| `Auth` (Keycloak OIDC) | **Either** keep Keycloak self-host **or** swap to `SupabaseAuth` adapter (also OIDC-compatible) |
| `Cache` (Redis) | Upstash is wire-protocol Redis — change `REDIS_URL` only |
| `LLM` (`OllamaLocal`) | `GroqAdapter`, `GeminiAdapter` already planned in T-070 |
| `Transcriber` (Whisper.cpp) | `GroqDistilWhisper` adapter (already enumerated in arch §7.2) |
| `Notifier` (Novu self-host) | Novu Cloud (same SDK, different base URL) |

**Mode is selected by env vars**, not by code. `.env.local` vs `.env.cloud` vs `.env.hybrid`. The same Docker Compose runs the data plane on whatever box you point it at.

---

## 5. When each free tier breaks (be honest about ceilings)

The architecture is honest about non-goals (arch §16). This doc continues that.

| Free tier | Breaks when… | What to do |
|---|---|---|
| Supabase 500 MB DB | ~50k-100k transcript words + user metadata for ~1k projects | Upgrade Supabase Pro ($25/mo, 8 GB DB) **or** move DB to owner hardware |
| Supabase 1 GB file storage | After ~10 short clips. **Don't use it for media at all.** | All media stays in R2 — Supabase file storage is unused in our setup |
| Supabase 5 GB egress | After ~5,000 heavy editor sessions / month — *plenty* for early stage since we only ship metadata + transcripts over it (media is fetched directly from R2, not via Supabase) | Add Cloudflare cache for read-heavy endpoints, or upgrade |
| Supabase 7-day idle pause | Demo not used for a week | GitHub Actions cron-ping endpoint every 6 days (1-line workflow) |
| Cloudflare R2 10 GB stored | After ~1 hour of 1080p video | Pay $0.015/GB-month — still cheap; R2 stays best price |
| Cloudflare R2 1M Class-A ops/mo | Many concurrent users uploading | Almost never an issue for early stage |
| Cloudflare Pages 500 builds/mo | Heavy PR activity | Use main-only builds + preview-on-demand |
| Upstash 10k cmds/day | A few hundred users actively cached | Move cache to home box Redis |
| Sentry 5k errors/mo | If you're crashy 😬 | Fix bugs |
| Groq rate limits | Heavy AI usage | Local Ollama fallback (already wired) |
| Resend 100/day | Mass-email moments | Switch to Amazon SES ($0.10/1k) or upgrade |

The shape is: **all-free at MVP, ~$25–50/mo at hundreds of users, ~$200–500/mo at thousands** — still well below incumbent tooling.

---

## 6. Decisions to record (add to `decisions.md`)

If you adopt this hybrid, log these ADRs:

1. **D-001 Cloudflare Pages over Vercel for hosting** — Vercel Hobby forbids commercial use; Pages allows it with unlimited bandwidth.
2. **D-002 Supabase Postgres + Auth (free) as managed control plane for MVP** — accept the 7-day pause + 500 MB DB; ping cron mitigates pause. Revisit at 100 paying customers.
3. **D-003 Cloudflare R2 for all media (raw + derived + public)** — best free egress; S3 API portable.
4. **D-004 Hybrid data plane on home box / Oracle A1 for media + AI workers** — keeps bytes off paid CDN egress; runs OSS AI without paying per-token rates.
5. **D-005 Groq as the default LLM/ASR burst adapter** — free tier covers MVP traffic; Ollama remains the local default.
6. **D-006 Defer Keycloak; use Supabase Auth for V1** — recoverable later (OIDC migration is documented). Saves an ops surface.
7. **D-007 Defer GlitchTip; use Sentry free** — same SDK; can swap later.

Each of these is reversible because the architecture's adapters keep our business logic clean of vendor specifics.

---

## 7. New tickets (added to `tickets.md`)

Three new deploy tickets (T-210, T-211, T-212) cover the hybrid path. They sit alongside T-204 (Cloudflare Tunnel) and T-205 (Helm) and are independent of Phases 1–15.

- **T-210** — Provision managed free-tier services (Supabase, R2, Upstash, Cloudflare Pages, Resend, Sentry, PostHog)
- **T-211** — Implement adapter switches (env-driven Storage/DB/Auth/Cache/LLM/ASR/Notifier selection)
- **T-212** — Deploy data-plane stack to Oracle Always Free A1 via Cloudflare Tunnel + GitHub Actions

Each is self-contained and can be picked up by an agent once Phase 1 is green.

---

## 8. What we explicitly DON'T do (cost traps)

- **No paid SaaS in any default code path.** Hosted APIs are adapters, opt-in.
- **No Vercel Pro just for Next.js.** Cloudflare Pages serves Next.js (with `@cloudflare/next-on-pages`) for free.
- **No serverless functions for media work.** Vercel/Cloudflare Functions cap at ≤15 min and can't host FFmpeg comfortably. Media stays on long-lived workers.
- **No pay-per-second GPUs from Replicate/fal in the default path.** Owner GPU box + local models. Hosted GPU is a burst adapter only.
- **No Liveblocks-style realtime SaaS lock-in.** Hocuspocus + Yjs are mature OSS; lock-in cost > ops cost.
- **No third-party feature-flag SaaS.** Postgres + `flags` table + a 200-line library beats LaunchDarkly's free tier limits.
- **No SOC2 SaaS attestation buy-in before revenue.** Arch §16 already calls this out.

---

*End of hosting options. See `tickets.md` for the implementation tickets (T-210+).*
