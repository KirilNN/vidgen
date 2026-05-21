# Free-Tier Catalog — Every Cloud Service We Can Use For $0

> Companion to `hosting-options.md` (the *recommendation*) and `architecture.md` (the *contract*).
> This file is the **exhaustive reference**: every service category, every credible free tier, what breaks them, our pick.
>
> **Selection criteria** (in order):
> 1. **Truly free** (forever or with practical limits we won't hit at MVP).
> 2. **Commercial use allowed** on the free tier (kills Vercel Hobby, MongoDB Atlas eval, etc.).
> 3. **No vendor lock-in** — must be swappable behind an adapter (arch E7).
> 4. **Open-source if otherwise tied.** Self-hostable beats SaaS when comparable.
> 5. **Scales gracefully** — sane paid path; we don't get blackmailed at upgrade time.
>
> Picks marked ✅ are folded into `hosting-options.md` §3 recommended hybrid stack. Others are documented for completeness or future use.

---

## A. Compute & runtime

| Need | Free option | Limits (2025) | Verdict |
|---|---|---|---|
| Long-lived API/workers | **Oracle Cloud Always Free** ✅ | 1× ARM A1 instance: 4 vCPU, 24 GB RAM, 200 GB block, 10 TB egress/mo; permanent | Best free compute on the planet for our shape |
| Long-lived API/workers (alt) | Fly.io | No free tier as of 2024; $5/mo min usage | Skip |
| Container PaaS | Railway | $5 free credit/mo, then pay | Use for demos; not default |
| Container PaaS | Render | Web service free tier spins down at 15 min idle | Skip — kills async workflows |
| Edge functions | **Cloudflare Workers** ✅ | 100k req/day free, 10 ms CPU/req | For lightweight endpoints (view-counter beacon, webhook receiver, Supabase keep-alive) |
| Serverless functions | Netlify Functions | 125k invocations/mo | Backup edge runtime |
| Serverless functions | Deno Deploy | 100k req/day | Backup edge runtime |
| GPU compute | Google Colab free | Time-limited T4 | Use for one-off LoRA fine-tune jobs (F6.5) |
| GPU compute | Kaggle Notebooks | 30 hrs/week | Same |
| GPU compute | Modal | $30 trial credit | Burst capacity; one-time |
| GPU compute | Hugging Face Spaces | Free CPU; paid GPU | Public demos only |
| GitHub-hosted runners | **GitHub Actions** ✅ | 2,000 min/mo private; unlimited public | All CI + scheduled jobs |
| Dev environments | **GitHub Codespaces** | 120 core-hrs/mo free | Onboarding new contributors |
| Dev tunnels | **Cloudflare Tunnel** ✅ | Free, permanent | Expose home box to internet |
| Dev tunnels (temp) | ngrok | Free with limits | Local debugging only |
| Dev tunnels | smee.io | Free webhook proxy | GitHub webhook testing |

**Default compute plan:** Mode A = laptop / Oracle A1 free. Mode B = Cloudflare Pages (web) + Cloudflare Workers (edge endpoints) + Oracle A1 / home box (heavy data plane).

---

## B. Web hosting & static assets

| Need | Free option | Limits | Verdict |
|---|---|---|---|
| Web app (Next.js) | **Cloudflare Pages** ✅ | **Unlimited bandwidth, commercial OK**, 500 builds/mo, 20k files/site | Winner |
| Web app | Vercel Hobby | 100 GB/mo, **NO commercial use** | Avoid (license) |
| Web app | Netlify | 100 GB/mo, commercial OK | Acceptable backup |
| Web app | Render Static Sites | 100 GB/mo, commercial OK | Acceptable backup |
| Public share / embed | **Cloudflare Pages** ✅ | (same as above) | Share + embed app lives here |
| Trust center / docs | **Cloudflare Pages** ✅ | (same) | Astro / Next.js static export |
| Image optimization | Cloudflare Images | $5/mo for 100k — **not free** | Skip; use Sharp / Remotion locally |
| Image hosting | ImageKit | 20 GB bandwidth/mo free | Backup |

---

## C. Database & data stores

| Need | Free option | Limits | Verdict |
|---|---|---|---|
| **Postgres (metadata only)** | **Supabase** ✅ | 500 MB DB, 5 GB egress/mo, 7-day idle pause, 2 projects, 50k MAU auth | Default for Mode B — metadata only, never media |
| Postgres alt | Neon | 0.5 GB storage, branching, auto-suspend | Strong alt; no built-in auth |
| Postgres alt | Aiven free | Trial only as of 2024 | Skip |
| Postgres alt | Crunchy Bridge | No free tier | Skip |
| Postgres alt | Railway Postgres | $5 credit | Skip for prod |
| SQLite at the edge | **Cloudflare D1** | 5 GB free, 5M reads/day, 100k writes/day | For per-region edge caches |
| SQLite alt | Turso (libSQL) | 9 GB free, 500 dbs | Excellent for per-tenant edge DBs (R3+) |
| Cache (Redis API) | **Upstash Redis** ✅ | 10k cmds/day, 256 MB | Default Mode B cache |
| Cache (KV) | **Cloudflare KV** ✅ | 100k reads/day, 1k writes/day, 1 GB | Use for share-link metadata at edge |
| Cache (queue) | Upstash QStash | 500 messages/day | Lightweight job triggers |
| Vector DB | **pgvector on Supabase** ✅ | (Supabase limits) | Default; arch E7 portable |
| Vector DB alt | **Cloudflare Vectorize** | 30M queried dims/mo, 5M stored dims/mo free | Great alt if we lean into Workers AI |
| Vector DB alt | Qdrant Cloud | 1 GB free forever | Backup; native Qdrant API |
| Vector DB alt | Pinecone | Free starter pod, auto-pauses | Skip — auto-pause is hostile |
| Vector DB alt | Weaviate Cloud Sandbox | Free sandbox | Eval only |
| Search | **Meilisearch Cloud** ✅ | 100k docs, 1 GB | Default search; OSS portable |
| Search alt | Typesense Cloud | 100 MB free tier | Backup |
| Search alt | Algolia | 10k searches/mo free | Lock-in heavy; skip |
| Time-series | InfluxDB Cloud Serverless | 5 MB writes/5 min, 30-day retention | Skip — Grafana Cloud is more useful |
| Object storage | **Cloudflare R2** ✅ | 10 GB stored, **free egress**, 1M Class-A ops, 10M Class-B ops/mo | Default for all media |
| Object storage alt | Backblaze B2 | 10 GB free, $0.005/GB egress | Disaster-recovery backup target |
| Object storage alt | iDrive E2 | Trial only | Skip |
| Object storage alt | Cloudflare Workers Cache | Free with Workers | Use for hot HLS segments |

---

## D. Auth & identity

| Need | Free option | Limits | Verdict |
|---|---|---|---|
| OIDC auth | **Supabase Auth** ✅ | 50k MAU free | Default Mode B; portable OIDC |
| OIDC auth alt | Clerk | 10k MAU free | Better UX, slightly more lock-in |
| OIDC auth alt | WorkOS AuthKit | 1M MAU free | Strong for B2B SSO later |
| OIDC self-host | Keycloak | Unlimited (you run it) | Default Mode A |
| OIDC self-host alt | Zitadel | Unlimited self-host; cloud free tier limited | Lighter alternative to Keycloak |
| SSO (SAML/SCIM) | **WorkOS** | Up to 1M MAU free (Connect product) | Use later when enterprise SSO needed (F9.2) |
| Magic links / passkeys | Supabase Auth covers it | — | — |
| Bot/CAPTCHA | **Cloudflare Turnstile** ✅ | Free, unlimited | Replace reCAPTCHA on signup + share endpoints |
| Rate limiting | **Cloudflare WAF + rate limiting** | Free tier rules included | Use on share endpoints, webhooks |

---

## E. Background jobs & orchestration

| Need | Free option | Limits | Verdict |
|---|---|---|---|
| Workflow engine | **Temporal self-host** ✅ | (you run it) | Default — arch §6 |
| Workflow engine alt | Temporal Cloud | No real free tier | Skip until paying customer |
| Event-driven jobs | **Inngest** ✅ (adapter) | 50k steps/mo, 50 functions free | Excellent for low-volume webhook→action chains |
| Event-driven alt | Trigger.dev | Limited free | Skip |
| Job triggers | **Upstash QStash** | 500 messages/day | Backup for scheduled triggers |
| Cron / scheduling | **GitHub Actions cron** ✅ | Free; 5-min granularity | Default scheduled jobs (Supabase keep-alive ping, daily audit-chain export) |
| Cron / scheduling alt | **Cloudflare Workers Cron Triggers** | Free | Edge-side scheduling |
| Cron / scheduling alt | EasyCron / cron-job.org | Free tier | Backup |
| Webhook fan-out | **Novu Cloud** ✅ | 30k events/mo free | Default for in-app + Slack/Teams notifications |
| Webhook fan-out alt | **Svix** | 50k messages/mo free | Strong alt; more developer-y |
| Webhook fan-out alt | Hookdeck | 100k events/mo free | Backup; great debugger |
| Webhook fan-out alt | Inngest | (same as jobs) | Combined option |

---

## F. AI inference (the big spend trap)

The architecture mandates **local models are the default**. Hosted free tiers are *burst adapters* for when local can't keep up or quality matters.

| Capability | Hosted free option | Limits | Verdict |
|---|---|---|---|
| LLM | **Groq** ✅ | Free with rate limits (Llama 3 / 70B, mixtral, gemma); very fast | Default burst LLM |
| LLM | **Google Gemini API** ✅ | 2M tokens/day Flash; Pro lower | Default burst for long context |
| LLM | OpenRouter | Pay-per-use; some `:free` models | Fallback to any model |
| LLM | Cerebras | Free with rate limits | Excellent for sub-second Llama |
| LLM | Together AI | $5 trial credit | One-time |
| LLM | Hugging Face Inference API | Rate-limited free | Eval only |
| Transcription (ASR) | **Groq distil-whisper-large-v3** ✅ | Free with rate limits, very fast | Default burst ASR |
| Transcription | Deepgram | $200 credit on signup | One-time eval |
| Transcription | AssemblyAI | Trial credit | Skip |
| TTS | ElevenLabs | 10k chars/mo free | Eval only; commercial restricted on free |
| TTS | Cartesia | Trial credit | Skip default |
| Translation | DeepL API Free | 500k chars/mo, **non-commercial only on free** | Avoid in product; OK for internal |
| Translation | Google Translate | $300 GCP credit then pay | Skip |
| Image gen | **Cloudflare Workers AI** | 10k Neurons/day free | Lightweight image gen / classification |
| Image gen | fal.ai | $1 starter credit | One-time |
| Image gen | Together AI | $5 credit | One-time |
| Video gen | Replicate / fal | Pay per second; no real free | Skip; use local CogVideoX/AnimateDiff |
| Voice clone | (none free) | — | Local OpenVoice / F5-TTS only |
| AI gateway / caching | **Helicone** ✅ | 100k req/mo free, observability + caching | Cuts LLM cost via cache; logs prompts |
| AI gateway alt | Portkey | 10k req/mo free | Backup |
| LLM tracing | **LangFuse Cloud** ✅ | 50k observations/mo free | Default eval + tracing surface |
| LLM tracing alt | LangSmith | Limited free | Backup |
| LLM tracing alt | Braintrust | Free tier | Backup |
| Eval framework | **Promptfoo** | OSS, self-run | CI evals |

**Pattern:** every AI call goes through Helicone → router → (Ollama local | Groq | Gemini | OpenRouter), logged to LangFuse. The router is part of T-070's adapter design.

---

## G. Observability, errors, analytics

| Need | Free option | Limits | Verdict |
|---|---|---|---|
| Metrics + logs + traces | **Grafana Cloud Free** ✅ | 10k metric series, 50 GB logs, 50 GB traces, 50 GB profiles, 14-day retention, 3 users | **Replaces** Prometheus + Loki + Tempo self-host for Mode B; arch §12 |
| Logs | Axiom | 500 GB ingest/mo free | Strong alt |
| Logs | Logflare | Free tier | Backup |
| Errors | **Sentry** ✅ | 5k errors/mo, 10k perf txns/mo, 50 replays | Default error tracking |
| Errors self-host | GlitchTip | Free OSS | Mode A default |
| Product analytics | **PostHog Cloud** ✅ | 1M events/mo, 5k session replays | Default product analytics |
| Product analytics alt | Plausible | Self-host free; cloud paid | OSS option |
| A/B + flags | **PostHog Experiments** | Included with PostHog | One tool, two jobs |
| Feature flags | **GrowthBook Cloud** | Free tier | Backup |
| Feature flags self-host | Unleash | OSS | Mode A option |
| Status page | **BetterStack Uptime** | 10 monitors free, status page | Default public status |
| Status page alt | Healthchecks.io | 20 checks free | Cron health monitoring |
| Status page alt | UptimeRobot | 50 monitors free | Backup |
| Uptime probes | **Cronitor** | Free tier | Backup |
| Synthetic monitoring | Checkly | 10k checks/mo free | Cross-region E2E probes |
| RUM | PostHog has it | — | Use PostHog |

---

## H. Notifications, email, comms

| Need | Free option | Limits | Verdict |
|---|---|---|---|
| Transactional email | **Resend** ✅ | 3,000 emails/mo, 100/day | Default |
| Transactional email alt | Amazon SES | $0.10/1k after first 12 months trial | Cheap scale path |
| Transactional email alt | Postmark | 100/mo free | Backup |
| Marketing email / newsletters | **Loops** | 1k contacts free | Creator-friendly |
| Marketing email alt | Beehiiv | 2,500 subs free | If we run a newsletter |
| Marketing email alt | MailerLite | 1k subs, 12k emails/mo free | Backup |
| Email forwarding (hello@, support@) | **Cloudflare Email Routing** ✅ | Free, unlimited rules | Personal-style addresses without a mailbox |
| Web push | **Web Push (DIY)** ✅ | Free, browser standard | Default; no SaaS |
| Mobile push | **Expo Push** ✅ | Free, unlimited | Default |
| Push SaaS | OneSignal | 10k subscribers free | Skip — Expo + Web Push suffice |
| In-app chat / support | **Crisp** | 2 seats free, unlimited chats | Default Mode B support widget (P12) |
| In-app chat alt | Chatwoot self-host | OSS | Mode A default |
| Community | Discord | Free | Community channel |
| SMS | (none truly free) | Twilio $15 trial | Skip in V1 |

---

## I. Marketing, growth, content surface

| Need | Free option | Limits | Verdict |
|---|---|---|---|
| Landing page CMS | **Cloudflare Pages + MDX** ✅ | Free | Code-first; SEO-friendly |
| Long-tail SEO tool pages (per `execution-plan.md` §5.2) | **Cloudflare Pages + Next.js** ✅ | Free | Each tool is a route |
| Newsletter platform | **Beehiiv** / **Loops** | (see H) | Pick one |
| Docs site | **Mintlify** | Free for OSS | Strong default for API docs |
| Docs site alt | Docusaurus + Pages | Free | OSS path |
| Docs site alt | Nextra + Pages | Free | OSS path |
| API reference | **Scalar** ✅ | Free OSS | Embedded in our docs (arch §3.10) |
| Public roadmap | **Featurebase** | Starter free | Backup |
| Public roadmap alt | GitHub Discussions | Free | Use this — fewer SaaSes |
| Forms / waitlist | **Tally** | Unlimited forms free | Waitlist before launch |
| Forms alt | Cloudflare Forms (Pages) | Free | Code-first option |
| Booking (design-partner calls) | **Cal.com** | Cloud free tier; OSS self-host | Default |
| CRM (founder pipeline) | **HubSpot CRM** | Free | Customer-discovery interview tracking |
| Affiliate / referrals | (Stripe-native + Postgres) | DIY | Skip SaaS like Tolt until needed |

---

## J. Payments & monetization (when we're ready)

| Need | Choice | Cost | Verdict |
|---|---|---|---|
| Payments | **Stripe** | No monthly fee, 2.9% + 30¢ | Default once we sell |
| Payments | **Lemon Squeezy** | Merchant of Record, 5% all-in (handles VAT/tax) | Strong for indie launch |
| Payments | **Polar.sh** | Lower fees, OSS-friendly | Newer alt |
| Invoicing | Stripe built-in | Free | Use Stripe |
| Tax compliance | Lemon Squeezy / Stripe Tax | LS bundled; Stripe Tax priced | Critical at scale, defer in V1 |
| Trial usage metering | Postgres + custom | DIY | Don't buy yet |

---

## K. Trust, compliance, security (free tooling)

| Need | Free option | Limits | Verdict |
|---|---|---|---|
| Vulnerability scan (deps) | **Dependabot** ✅ | Free on GitHub | On |
| Vulnerability scan (code) | **GitHub CodeQL** ✅ | Free public; included for private with Advanced Security on certain plans | On where free |
| Container scan | **Trivy** ✅ | OSS, CI-friendly | Run in GitHub Actions |
| Container scan | Snyk | Limited free | Backup |
| Secrets scanning | **GitHub Secret Scanning** ✅ | Free public; included with GH Advanced Security private | On |
| SBOM | **GitHub Dependency Graph** | Free | On |
| Compliance evidence | **Comp AI** | OSS | Mentioned in arch §3.9 |
| SOC 2 SaaS (paid) | Drata / Vanta | Not free | Defer until paying customers |
| WAF / DDoS | **Cloudflare** ✅ | Free included | On |
| Bot management | Cloudflare Bot Fight Mode | Free | On |
| Audit logging | Postgres hash-chain (T-120) + R2 | Free | DIY |

---

## L. Developer experience & repos

| Need | Free option | Limits | Verdict |
|---|---|---|---|
| Git host | **GitHub** ✅ | Free private repos, unlimited collaborators | Default |
| Container registry | **GHCR** ✅ | Generous free | Default |
| Issue tracking | **Linear** | Free up to 250 issues | Default; cheap above |
| Issue tracking alt | **GitHub Issues + Projects** | Free unlimited | Mode-A-pure alternative |
| Docs / planning | Notion | Free small team | Founder workspace |
| Docs / planning alt | Obsidian + git | Free | Privacy-first |
| Codespaces | **GitHub Codespaces** | 120 core-hrs/mo free | Onboarding |
| Code review AI | Coderabbit / GreptileAI | Limited free | Optional |
| Dependency updater | Dependabot | Free | On |
| Pre-commit | Husky | OSS | On |

---

## M. Localization, i18n, internationalization

| Need | Free option | Limits | Verdict |
|---|---|---|---|
| Translation memory | **Crowdin** | Free for OSS | Use if we open-source the UI strings |
| TMS alt | Tolgee | OSS self-host; limited cloud free | Alt |
| LLM-based translation of UI copy | MADLAD local / Gemini Flash | Free | Use Gemini Flash for one-shot UI translation, MADLAD locally for runtime |

---

## N. AI evals & quality discipline

Per `execution-plan.md` §5.6 — evals harness from week 1.

| Need | Free option | Verdict |
|---|---|---|
| LLM tracing | **LangFuse Cloud** ✅ | Default |
| Eval framework | **Promptfoo** ✅ | OSS; in CI |
| Eval framework alt | DeepEval | OSS | Backup |
| Eval datasets | Hugging Face Datasets | Free | Source |
| Human eval UI | Argilla | OSS | Optional |
| Benchmarks vs competitors | DIY scripts | — | Per execution plan §5.6 |

---

## O. Realtime & collaboration

| Need | Free option | Limits | Verdict |
|---|---|---|---|
| CRDT sync (Yjs) | **Hocuspocus self-host** ✅ | (you run it) | Default — arch §9 |
| CRDT SaaS | Liveblocks | 100 MAU free | Lock-in heavy; skip |
| Presence / cursors | Yjs awareness | Free | Default |
| Realtime DB sync | **Supabase Realtime** | Included in Supabase | Use for project-list live updates |
| WebRTC SFU | **LiveKit self-host** ✅ | (you run it) | Default — arch §3.1 (F1.3) |
| WebRTC SaaS | LiveKit Cloud | Free dev tier, paid prod | Skip default |
| Pub/sub | Supabase Realtime / NATS / Upstash | All have free | Pick per deploy |

---

## P. Mobile-specific

| Need | Free option | Limits | Verdict |
|---|---|---|---|
| Mobile framework | **Expo** ✅ | OSS | Default — arch §8.2 |
| Mobile builds | EAS Local Build | Free (your machine) | Avoid paid EAS minutes |
| OTA updates | Expo Updates | Free tier | Default |
| App distribution beta | **TestFlight** | Free with Apple developer ($99/yr) | iOS beta |
| App distribution beta | Firebase App Distribution | Free | Android beta |
| Crash reporting | Sentry (mobile SDK) | Same free quota | Default |
| Push | Expo Push | Free | Default |
| App store fees | $99/yr Apple + $25 one-time Google | **Not free** | Accept |

---

## Q. Data / fixtures / sample assets

| Need | Free option | Verdict |
|---|---|---|
| Sample video clips | **Pexels** / **Pixabay** / **Coverr** | CC0 / free-license stock | Bundle in `fixtures/` for smoke tests |
| Sample voices | **CC0 voice donations** (Mozilla CV) | Free | Build XTTS voice library (arch §3.5 F5.4) |
| Sample background music | YouTube Audio Library / Pixabay Music | Free, royalty-free | Demo content |

---

## R. Things explicitly NOT worth using on free tier

These free tiers exist but cost more than they save (vendor lock-in, hostile pause behavior, restrictive license, weak quotas):

- **Vercel Hobby** — disallows commercial use; CF Pages strictly better.
- **MongoDB Atlas free** — wrong DB for our shape; we're Postgres-first per arch.
- **Firebase free** — Google ecosystem lock-in; the few free pieces (Firestore, Auth) duplicate Supabase with worse portability.
- **AWS Free Tier** — 12-month-only, complex billing; Oracle Always Free is permanently free with more resources.
- **Heroku free** — discontinued.
- **Liveblocks free** — beautiful product, but realtime lock-in is expensive to undo. Stick with Hocuspocus + Yjs.
- **Pinecone starter pod** — auto-pauses; hostile to demos. Use pgvector or Vectorize.
- **Algolia free** — minute quotas + lock-in.
- **LaunchDarkly free** — laughable quotas; PostHog flags or GrowthBook are fine.
- **DeepL free** — non-commercial license; can't ship to users on it.
- **Replicate / fal pay-per-second in default path** — only as a burst adapter behind a feature flag.

---

## S. The complete $0 Mode-B menu (one-page)

| Layer | Service | Adapter swap (in code) |
|---|---|---|
| Web hosting | Cloudflare Pages | (deploy target only) |
| Edge API | Cloudflare Workers | optional `EdgeFunction` adapter |
| Long-running API | Oracle A1 / home box | (compute target) |
| Database | Supabase Postgres (metadata only) | `DB` adapter = connection string |
| Auth | Supabase Auth | `Auth` adapter (OIDC) |
| Cache | Upstash Redis | `Cache` adapter (Redis wire) |
| Object storage | Cloudflare R2 | `Storage` adapter (S3 wire) |
| Vector DB | pgvector (Supabase) | `VectorStore` adapter |
| Search | Meilisearch Cloud | `Search` adapter |
| Workflows | Self-host Temporal on A1 | (or Inngest adapter for light flows) |
| Realtime | Hocuspocus on A1 | (or Supabase Realtime adapter) |
| WebRTC | LiveKit self-host on A1 | (or LiveKit Cloud dev tier) |
| Webhooks | Novu Cloud or Svix | `Notifier` adapter |
| Email | Resend | `Mailer` adapter |
| Email forwarding | Cloudflare Email Routing | (DNS config only) |
| Push (web) | Web Push DIY | — |
| Push (mobile) | Expo Push | — |
| LLM (default) | Ollama on home GPU | `LLM` adapter |
| LLM (burst) | Groq + Gemini + OpenRouter | (router behind same adapter) |
| ASR (default) | Whisper.cpp local | `Transcriber` adapter |
| ASR (burst) | Groq distil-whisper | (router) |
| AI gateway / cache | Helicone | (proxy, no code change in business logic) |
| AI tracing / evals | LangFuse Cloud + Promptfoo | (SDK + CI step) |
| Observability | Grafana Cloud Free | OTel exporter target |
| Errors | Sentry free | Sentry SDK |
| Analytics | PostHog Cloud free | PostHog SDK |
| Feature flags | PostHog (or GrowthBook) | `FeatureFlags` adapter |
| Status page | BetterStack | (config) |
| Synthetic monitoring | Checkly | (config) |
| Bot/CAPTCHA | Cloudflare Turnstile | (component) |
| CDN/WAF/DNS | Cloudflare | (config) |
| Cron | GitHub Actions + CF Workers Cron | (workflow files) |
| Domain | Cloudflare Registrar (at-cost) | (one-time) |
| Code | GitHub + GHCR | — |
| CI | GitHub Actions | — |
| Codespaces (dev) | GitHub Codespaces | — |
| Tunnel | Cloudflare Tunnel | (config) |
| Issues | Linear free or GitHub Issues | — |
| Docs site | Mintlify or MDX on Pages | — |
| Chat support | Crisp | (widget) |
| Booking | Cal.com | (link) |
| Forms / waitlist | Tally | (link) |
| Payments (when ready) | Stripe / Lemon Squeezy | `Billing` adapter |

**Recurring cost:** $0 + electricity + ~$1 domain. **Per-user variable cost:** approaches $0 because the heavy bytes (media) flow through Cloudflare R2 free egress, and the heavy compute (AI) runs on owner hardware or burst-free Groq/Gemini.

---

## T. When each ceiling hurts (revisited, complete)

In order of which limit will hit first:

1. **Cloudflare R2 10 GB stored** — after ~1 hr of 1080p user content stored. **First paid line item** at $0.015/GB/mo (~$1/mo for 100 GB).
2. **Supabase 7-day idle pause** — solved by GitHub Actions cron-ping every 6 days.
3. **Groq rate limits** — fall back to local Ollama (already wired).
4. **Cloudflare Pages 500 builds/mo** — limit per-PR previews to main-branch only.
5. **Upstash 10k cmds/day** — switch to self-hosted Redis on A1.
6. **PostHog 1M events/mo** — sample events in production once we cross 100k DAU.
7. **Sentry 5k errors/mo** — fix bugs (this should be the first signal something's wrong).
8. **Supabase 500 MB DB** — at ~6M transcript words (~500–800 hrs of content). Upgrade to Pro ($25/mo, 8 GB).
9. **Resend 3k emails/mo** — switch to Amazon SES ($0.10/1k) or upgrade Resend.
10. **Grafana Cloud 50 GB logs/mo** — sample logs, or self-host Loki.
11. **Cloudflare Workers 100k req/day** — at ~3M/mo; either pay ($5/mo for 10M) or move endpoints to A1.

---

*End of catalog. See `hosting-options.md` for the recommended stack, `tickets.md` for implementation work.*
