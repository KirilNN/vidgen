# Decisions Log (ADRs)

> Lightweight architecture decision records. One entry per meaningful choice. Append-only; supersede with new entries that reference the old.
>
> Template:
> ```
> ## D-XXX — <short title>
> Date: YYYY-MM-DD · Owner: <role> · Status: proposed | accepted | superseded
> Context: <one paragraph>
> Decision: <what we will do>
> Alternatives considered: <list with one-line rejection rationale>
> Consequences: <what we accept by deciding this>
> Revisit-by: <date or trigger>
> Supersedes: D-YYY (if any)
> ```

---

## D-001 — Cloudflare Pages over Vercel for web hosting
Date: 2025-05 · Owner: CTO · Status: accepted
**Context:** We need to host the Next.js web app (`apps/web`) and the share/embed static app (`apps/share`) on a free, commercial-licensed CDN.
**Decision:** Use **Cloudflare Pages** for both. Custom domains via Cloudflare DNS; deploys via GitHub Actions on push to `main`.
**Alternatives considered:**
- *Vercel Hobby* — disallows commercial use on free tier; 100 GB/mo bandwidth cap. Rejected.
- *Netlify free* — commercial OK but 100 GB/mo bandwidth cap; CF Pages is unlimited.
- *Render Static Sites* — comparable to Netlify; weaker integration with the rest of the Cloudflare stack we're using.
**Consequences:** We standardize on Cloudflare's runtime. We use `@cloudflare/next-on-pages` for Next.js. No vendor lock-in at the data layer because the app code is portable Next.js + a thin Pages adapter.
**Revisit-by:** When we hit 500 builds/month (limit) or a feature requires a runtime CF Pages doesn't support.

---

## D-002 — Supabase as managed Postgres + Auth for Mode B
Date: 2025-05 · Owner: CTO · Status: accepted
**Context:** Mode B (managed free-tier deploy) needs a managed Postgres with `pgvector` and an OIDC auth provider, both free.
**Decision:** Use **Supabase free tier** for Postgres (with `pgvector`) and Auth (OIDC). **Metadata only** — never store media or large blobs.
**Alternatives considered:**
- *Neon* — branching is nice; no built-in auth, would force a separate auth service.
- *Self-host Postgres + Keycloak in Mode B* — defeats the point of Mode B (managed control plane).
- *Firebase* — Google lock-in; non-Postgres; rejected per arch E7.
**Consequences:** We accept the 500 MB DB / 5 GB egress / 7-day idle pause / 50k MAU limits. We accept that Supabase Auth's JWTs are Supabase-shaped (still OIDC-compatible). We must mitigate the idle pause with a cron-ping (D-009).
**Revisit-by:** First time any of the limits is hit, or first paid customer.

---

## D-003 — Cloudflare R2 as primary object storage
Date: 2025-05 · Owner: CTO · Status: accepted
**Context:** Video bytes (raw, derived, public/share assets) need durable, S3-compatible storage with affordable egress.
**Decision:** Use **Cloudflare R2** for all media in Mode B. Bucket layout matches arch §5.1 (`media-raw`, `media-derived`, `media-chunks`, `public`). Mode A uses MinIO with identical bucket names; the `Storage` adapter swaps between them by config.
**Alternatives considered:**
- *S3* — paid egress kills our $0 envelope at any meaningful share volume.
- *Backblaze B2* — $0.005/GB egress; we use it as a *backup* target (D-010), not primary.
- *Supabase Storage* — 1 GB free, too small; also adds Supabase to the byte path.
**Consequences:** Free egress on R2 is the single biggest lever for a video product. Media URLs are CF-served; the API never proxies bytes.
**Revisit-by:** When stored media > 10 GB (free tier cap). Paid R2 storage is still ~$0.015/GB-month.

---

## D-004 — Hybrid data-plane on Oracle Always Free A1 + home box behind Cloudflare Tunnel
Date: 2025-05 · Owner: CTO · Status: accepted
**Context:** API, workers, Temporal, Hocuspocus, LiveKit, AI models — these are long-lived and resource-hungry; serverless free tiers don't fit.
**Decision:** Run them on **Oracle Cloud Always Free A1** (24 GB RAM, 4 vCPU ARM, permanently free) for CPU-only workloads, plus an optional **home GPU box** linked over **Tailscale** for `ai-gpu` workloads, all exposed via **Cloudflare Tunnel** (no public IPs).
**Alternatives considered:**
- *Fly.io / Render / Railway free tiers* — none have a permanent free tier matching A1.
- *Hetzner CX22* — €4/mo, not free.
- *Self-host on home box only* — fine, but no static reachability without ongoing port-forwarding / DDNS.
**Consequences:** Single-region until we explicitly choose otherwise. Capacity ceiling is the A1 box; we'll scale by adding more home boxes or paying for VPS. Outbound from A1 to R2/Supabase is free (R2 has no egress fees; Supabase is light JSON).
**Revisit-by:** First sustained CPU > 70% on A1, or geographic latency complaints from design partners.

---

## D-005 — Groq + Gemini as default LLM/ASR burst adapters; Ollama is local default
Date: 2025-05 · Owner: AI/ML eng · Status: accepted
**Context:** The architecture (E3) mandates local-default AI with hosted adapters. We need a concrete hosted choice that is free.
**Decision:** Hosted adapters in priority order: **Groq** (fastest, free with rate limits — Llama 3.x + distil-Whisper), **Google Gemini API** (2M Flash tokens/day free — long context), **OpenRouter** (catch-all, pay-per-use). Router picks per quality tier. Ollama remains the local-default backend; arch §7.3 quality tiers select the backend automatically.
**Alternatives considered:**
- *OpenAI API only* — no free tier; lock-in to one vendor.
- *Together AI* — only $5 starter credit; not sustainable as default.
- *Cerebras* — fast and free; will add as a fourth burst adapter behind the same router once stable.
**Consequences:** Multi-vendor router from day 1 (matches `execution-plan.md` §3 build-vs-buy decision). All routed through Helicone (D-006) for caching + cost telemetry.
**Revisit-by:** Quarterly model benchmarks (per execution plan §5.6).

---

## D-006 — Helicone + LangFuse for AI gateway / observability / evals
Date: 2025-05 · Owner: AI/ML eng · Status: accepted
**Context:** We need (a) caching of duplicate LLM calls, (b) cost telemetry, (c) prompt + response tracing, (d) eval discipline — all free.
**Decision:** Wrap all LLM/ASR calls with **Helicone** (proxy, free 100k req/mo, transparent caching) and trace each call to **LangFuse Cloud** (50k observations/mo free). CI runs **Promptfoo** for regression evals.
**Alternatives considered:**
- *Portkey* — comparable; smaller free tier.
- *LangSmith* — LangChain-house tool; we're not on LangChain.
- *Roll our own* — distracts from the core product.
**Consequences:** Two more vendor accounts to manage; both are SDK-thin and trivially removable. Adapter pattern (T-211) means business logic doesn't care.
**Revisit-by:** When LLM volume exceeds either tool's free tier.

---

## D-007 — Supabase Auth over Keycloak for Mode B
Date: 2025-05 · Owner: CTO · Status: accepted
**Context:** Mode B should minimize operational surface. Keycloak is excellent but is one more service to maintain.
**Decision:** Use **Supabase Auth** in Mode B; Keycloak remains the Mode A default. The `Auth` adapter abstracts both behind OIDC.
**Alternatives considered:**
- *Clerk* — 10k MAU free, slicker UX; more vendor-shaped tokens than Supabase Auth.
- *WorkOS AuthKit* — 1M MAU free; we keep WorkOS in reserve for B2B SSO/SAML once we're selling to enterprise (F9.2).
- *Auth0 free* — only 7,500 MAU and limited social connections.
**Consequences:** Supabase becomes a tighter dependency in Mode B (DB + auth). Migration to a different auth provider would require a one-time JWT/identity migration; documented in the runbook.
**Revisit-by:** First enterprise customer requiring SAML/SCIM with custom IdP — at that point evaluate WorkOS Connect.

---

## D-008 — Sentry + PostHog Cloud + Grafana Cloud Free for observability in Mode B
Date: 2025-05 · Owner: CTO · Status: accepted
**Context:** Self-hosting GlitchTip + PostHog + Prometheus + Loki + Tempo on the A1 box uses RAM we'd rather give to media workers.
**Decision:** Use **Sentry free** (errors), **PostHog Cloud free** (analytics, flags, replays, experiments), **Grafana Cloud Free** (metrics + logs + traces, 14-day retention) in Mode B. Mode A keeps self-host versions.
**Alternatives considered:**
- *Self-host all of them on A1* — uses too much RAM; cuts media worker capacity.
- *BetterStack / Axiom for logs* — Grafana Cloud bundles three categories.
**Consequences:** Three new SaaS accounts; all use vendor-neutral protocols (Sentry SDK, PostHog SDK, OTel). Switching back to self-host is changing env vars + redeploying.
**Revisit-by:** When any free tier ceiling is exceeded.

---

## D-009 — GitHub Actions cron (or Cloudflare Worker Cron) to keep Supabase project active
Date: 2025-05 · Owner: CTO · Status: accepted
**Context:** Supabase free projects pause after 7 days of inactivity. A paused project breaks production demos.
**Decision:** Run a cron every 6 days that hits a Supabase health endpoint. **Primary:** Cloudflare Worker Cron Trigger (no dependence on GH Actions being enabled). **Backup:** a GitHub Actions scheduled workflow. Both documented in T-216.
**Alternatives considered:**
- *Just upgrade Supabase to Pro* — $25/mo, defeats $0.
- *Self-host Postgres* — defeats Mode B.
**Consequences:** One trivial Worker that costs nothing. The endpoint must be exposed publicly with rate-limiting; we anchor it to Turnstile-free internal Supabase health API.
**Revisit-by:** When we move off Supabase free.

---

## D-010 — Backblaze B2 as backup target for R2 `media-raw/`
Date: 2025-05 · Owner: CTO · Status: accepted
**Context:** R2 is durable, but we want cross-provider DR for irreplaceable user content.
**Decision:** Weekly incremental `rclone` sync of `media-raw/` to **Backblaze B2** (10 GB free, $0.005/GB egress thereafter). Restore tested quarterly.
**Alternatives considered:**
- *S3 Glacier Deep Archive* — cheaper at scale but adds AWS; not $0.
- *No backup* — unacceptable for user-generated content.
**Consequences:** ~$0 below 10 GB; ~$5/100 GB/mo above. Restore path documented.
**Revisit-by:** When stored media > 10 GB.

---

## D-011 — Cloudflare Turnstile for bot / abuse control on public endpoints
Date: 2025-05 · Owner: CTO · Status: accepted
**Context:** Public share view-counter, signup, contact form, waitlist — all are abuse vectors. We don't want reCAPTCHA (Google lock-in + paid above quotas).
**Decision:** Use **Cloudflare Turnstile** (free, unlimited). Server-side verify in API + Workers.
**Alternatives considered:**
- *reCAPTCHA v3* — Google lock-in, ad-tech baggage.
- *hCaptcha* — free tier OK, but Turnstile is better integrated with the rest of our CF stack.
**Consequences:** Tied to Cloudflare for an additional surface; acceptable given we're already CF-heavy.

---

## D-012 — Cloudflare Vectorize as alternate vector store (deferred)
Date: 2025-05 · Owner: AI/ML eng · Status: proposed
**Context:** pgvector on Supabase is our default vector store. Vectorize (30M queried dims/mo free) is attractive when search volume grows.
**Decision:** Keep pgvector as the default. Add a `VectorStore` adapter for Vectorize behind a feature flag; only enable per-workspace if/when the workspace's pgvector usage approaches the Supabase DB cap.
**Alternatives considered:** Pinecone (auto-pause hostile), Qdrant Cloud (1 GB free).
**Consequences:** Mostly architectural — the adapter exists, but pgvector remains primary.
**Revisit-by:** When transcript count per workspace exceeds 1,000.

---

## D-013 — Linear for issue tracking; GitHub Issues mirror for OSS
Date: 2025-05 · Owner: Founder · Status: accepted
**Context:** Per `execution-plan.md` we want fast issue management; we may open-source pieces of the product.
**Decision:** **Linear** for the team's internal tracking (free up to 250 issues; cheap above). Mirror selected issues to **GitHub Issues** for OSS contribution where relevant.
**Alternatives considered:** Pure GitHub Issues (slower UX for founder/team), Jira (too heavy), Shortcut (no compelling edge).
**Consequences:** Small monthly cost above 250 issues, acceptable.
**Revisit-by:** When monthly Linear cost > $50.

---

## D-014 — Defer SOC 2 / ISO audits; build the posture, don't buy the cert (yet)
Date: 2025-05 · Owner: CTO · Status: accepted
**Context:** arch §3.9 + §16 — certifications cost real money and require traction to justify.
**Decision:** Implement the *architectural posture* (audit log hash-chain, RLS, secret rotation, RBAC, data residency tag) per arch §11. Use **Comp AI** (OSS) to start collecting evidence. **Do not purchase Vanta/Drata until first enterprise pipeline justifies it** (R3 milestone in execution plan).
**Revisit-by:** First named enterprise prospect in the pipeline.

---

*Append new decisions below — never edit existing ones; supersede with a new entry that links back.*
