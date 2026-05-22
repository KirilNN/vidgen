# Product Roadmap — "All-in-One AI Video Studio"

> **Working code name:** *Studio* (placeholder — replace with chosen brand)
>
> **Author lens.** Written from a Product Management perspective: features described in product language (what they are, who they're for, why they matter, what "good" looks like). No engineering, model selection, or architectural detail.
>
> **Inputs to this roadmap.**
> 1. `descript-competitor-research.md` — the deep Descript feature catalog (the "category baseline" we must match)
> 2. `competitors-vs-descript.md` — Choppity, Pictory, ScaleReach, CapCut, Wayin, HipClip feature gaps relative to Descript (the "additive surface")
> 3. `reddit-sentiment-scan.md` — what real users praise and complain about across the 7 products (the "design constraints from real life")
>
> **Reading order.** §1 Vision → §2 Personas → §3 Guiding Principles (sentiment-driven) → §4 Product Pillars → §5 Phased Roadmap → §6–15 Per-pillar feature descriptions → §16 Packaging & Pricing → §17 Success Metrics → §18 Anti-features → §19 GTM Surface.

---

## 1. Product Vision

**What we are building:** an end-to-end AI video studio that lets *any team member* — creator, marketer, podcaster, educator, sales rep, founder — turn raw recordings, scripts, blogs, slides, URLs, or even ideas into finished, multi-format video, and then plan, repurpose, distribute, and measure that video — all in one trustworthy product.

**One-line positioning:** *"The only AI video studio that goes from idea to scheduled post — without the bugs, the ByteDance, or the bait-and-switch pricing."*

**Why now.** The competitive landscape (synthesised from research) splits into three camps with clear gaps:
- **Descript** owns the *editor + recorder + agentic AI* surface but is stability-bound on large projects, lacks mobile, lacks a publishing/scheduling layer, and is widely perceived as expensive with a stingy free tier.
- **CapCut** owns *consumer AI breadth + mobile parity* but is structurally blocked from enterprise/regulated use due to ByteDance ownership and is actively losing trust to paywall creep.
- **Vertical specialists** (Choppity, ScaleReach, HipClip, Pictory, Wayin) each own a wedge (clip planning, hook overlays, content repurposing, blog-to-video, verifiable summaries) — but none unify the stack.

A trustworthy, US/EU-domiciled, all-in-one product that combines Descript's editor depth with CapCut's AI breadth, HipClip's writing suite, Choppity's planner+scheduler, ScaleReach's clip intelligence, Pictory's input modalities, and Wayin's verifiable AI — while explicitly designing around the universal Reddit pain points — has a clear lane.

**What we are NOT building.** A generic AI image generator. A pure timeline NLE (DaVinci/Premiere replacement). A live streaming platform. A meeting recorder competing with Otter/Fireflies. These are adjacent and out of scope at launch.

---

## 2. Target Personas

We design for six concrete personas. Each row drives feature prioritization.

| Persona | What they record | What they need to ship | Pain we solve |
|---|---|---|---|
| **Solo Creator / Podcaster** | Interviews, solo monologues, screen tutorials | Long-form episode + 10–30 short clips + captions + show notes + social posts | "Editing eats my week; AI tools each do 20% of my job" |
| **In-house Marketer / Content Lead** | Webinars, customer interviews, product launches | Brand-consistent marketing videos + blog versions + social distribution + analytics | "Five tools, three subscriptions, no brand control, no scheduler" |
| **B2B Sales / Founder** | Demo recordings, async loom-style updates | Personalized videos, branded share pages, view tracking | "I need a stable async-video tool that doesn't look like a toy" |
| **L&D / Training Lead** | SME interviews, internal tutorials, courses | Translated, accessible, LMS-deliverable videos with quizzes and CTAs | "Authoring tools are PowerPoint; modern AI tools don't export to SCORM" |
| **Agency / Multi-client Operator** | Client recordings of all shapes | Per-client brand kits, white-label delivery, scheduled posts, multi-account dashboards | "I need to manage 12 clients without 12 logins" |
| **Vertical Power User** (church, real estate, coach, gamer) | Sermons, listings, classes, gameplay | Workflow-specific outputs (sermon clips, listing reels, course shorts, Twitch-to-TikTok) | "Generic tools don't know my format" |

**Not a primary persona (but accessible if they show up):** TikTok-native Gen Z meme creators (CapCut's stronghold). We don't compete on the same pricing or virality model.

---

## 3. Guiding Principles (Sentiment-Driven Design Constraints)

These come directly from the universal Reddit themes (`reddit-sentiment-scan.md` §9). Every feature in this roadmap must be checked against these. They are non-negotiable.

| # | Principle | What this means in practice | What we will NOT do |
|---|---|---|---|
| **P1** | **Stable at scale** | Long-form (≥2 hr) recordings, multi-hour projects, large file uploads, and big render jobs must complete reliably. Resumable uploads, auto-save every action, transparent render-queue status. | Ship a feature whose 80th-percentile job fails or stalls. |
| **P2** | **Honest pricing** | Single transparent pricing page, no login wall, predictable upgrade paths, monthly *and* annual on every tier, pay-as-you-go overage for credits. Pricing changes announced 90 days in advance with grandfathering. | Hide pricing behind login (CapCut), force annual upgrade for one-month shortage (Pictory), silently move features behind paywalls (CapCut). |
| **P3** | **Generous free tier (not a demo)** | Free tier ships *all* core features at reduced quotas — never gated by feature, only by volume. No watermark on free output if the user explicitly chose a free tier. Free credits roll over 30 days, not zero. | Make the free tier a 3-project trial (Pictory) or a feature-stripped demo (Descript). |
| **P4** | **Verifiable AI** | Every AI-generated output (summary, clip, claim, quote) shows the source moment with a timestamp link. AI never asserts something without provenance. AI never silently rewrites the user's content beyond the requested scope. | Generate "show notes" that look fluent but aren't grounded in the actual audio. |
| **P5** | **Publishable-from-first-pass copy** | Auto-generated descriptions, show notes, titles, social posts must clear the "good enough to publish without editing" bar 80%+ of the time. We hold this metric and measure it. | Ship a "show notes" feature that needs an hour of editing (the universal complaint). |
| **P6** | **Reversible workflow** | Any stage of the pipeline can be re-entered without losing work. Regenerating a clip doesn't destroy existing edits. Changing the script doesn't void the brand kit. Undo across AI operations. | Lock the user into a one-way pipeline ("can't go back to edit story structure" — Pictory). |
| **P7** | **Mobile-first parity for capture and review** | Native iOS + Android apps from V1 with capture, review, approve, schedule. Heavy editing can stay on web/desktop but the loop closes on mobile. | Treat mobile as a "phase 4" afterthought (Descript, Pictory, Choppity, HipClip, Wayin, ScaleReach — none have it). |
| **P8** | **Privacy-first ownership story** | US + EU data residency from day one. Customer content never used to train shared models without explicit opt-in. Clear plain-English data policies. No ByteDance / no CCP-adjacent ownership. | Use customer content silently for model training. |
| **P9** | **AI quality across languages** | TTS, ASR, dubbing, and captions are held to English-equivalent quality bars in the top 15 languages (not "supported but unusable"). | Claim "100 languages" while top creators in 5 of them say it's robotic/inaccurate. |
| **P10** | **Human-in-the-loop, never a black box** | Every AI action is editable, undoable, and shows what it changed. AI suggestions can be accepted partially. The user is the editor; the AI is the assistant. | Auto-apply a destructive AI edit without a diff/preview. |
| **P11** | **One product, not five subscriptions** | The recorder, the editor, the agent, the writing suite, the planner, and the scheduler are one continuous experience. Switching surfaces never asks for a new login or new credit balance. | Sell a "Pro Writer add-on" that requires separate setup. |
| **P12** | **Real human support, real SLAs** | Live chat with a real human on every paid tier. Public incident page. Status updates within 15 minutes of any outage. | Hide behind chatbots during outages (HipClip / Pictory pain). |

---

## 4. Product Pillars

The product is one app, but it is mentally decomposed into **eight pillars**. Every feature in the roadmap maps to one. Pillars define team ownership lines later.

| # | Pillar | Mental model | Core question it answers |
|---|---|---|---|
| 1 | **Capture** | Get media in | "How do I record / import what I'll edit?" |
| 2 | **Edit** | Shape what's there | "How do I cut, restructure, polish?" |
| 3 | **Create** | Generate what's not there | "How do I make a video from scratch / an idea / a URL?" |
| 4 | **Enhance** | Make it better | "How do I fix the audio, the eyes, the lighting?" |
| 5 | **Translate** | Cross borders | "How do I reach a non-English audience?" |
| 6 | **Repurpose** | Multiply output | "How do I turn one long video into clips + blog + threads + carousels?" |
| 7 | **Distribute** | Get it out | "How do I publish, share, schedule, embed, host?" |
| 8 | **Operate** | Run the business | "How do I plan, collaborate, brand, secure, integrate?" |

Most user stories cross multiple pillars. The AI Co-pilot (described in Pillar 2) is the **horizontal layer** that orchestrates across all eight.

---

## 5. Phased Roadmap (5 Releases)

Each release is internally consistent (a usable product on its own). Personas served grow over time. Features are pulled forward only if they're sentiment-critical (e.g., mobile parity, generous free tier).

### Release 1 — **Foundation** (the credible MVP — months 1–6)
**Goal:** Match Descript's *core* editor + recorder + agent + share loop, but with the stability, free-tier, and pricing posture that Descript is criticised for. Web only.

**Who it serves:** Solo Creator, In-house Marketer.

**Pillars covered:** Capture (basic), Edit (full), Enhance (audio essentials), Repurpose (clips + captions + show notes), Distribute (share link + embed), Operate (brand kit lite).

**Must-have feature set (numbered, mapped to §6–§13):**
1. Browser-based editor with text-based transcript editing + multi-track timeline + scene/storyboard canvas (§7.1, §7.2, §7.3)
2. Auto-transcription, multi-language ASR (25+ languages), speaker diarization (§7.4)
3. Screen recorder + webcam + mic capture, up to 2 screens (§6.1)
4. AI Co-pilot ("Studio Assistant") with chat history, context picker, edit-review diff pass (§7.6)
5. AI Templates / workflow gallery (§7.7)
6. AI clip generator with **viral score + driver breakdown** (§10.1)
7. Animated captions (unlimited, all plans) with Hormozi/karaoke/bounce presets (§7.5)
8. Studio Sound (regenerative audio cleanup), Remove Filler Words, Shorten Gaps (§9.1, §9.2)
9. Public share URL with view counter (§12.1)
10. Auto-updating embed link (§12.2)
11. Brand Kit Lite — logo, colors, fonts (§13.1)
12. **Sentiment-critical guardrails baked in from day 1:** transparent pricing page (P2), generous free tier (P3), AI verifiability (P4), stability monitoring (P1).

### Release 2 — **Creator Depth** (months 7–12)
**Goal:** Win the solo creator + podcaster + repurposer market by adding everything HipClip + Choppity + ScaleReach + parts of Pictory have over Descript today.

**Who it adds:** Podcasters, Repurposers, Agencies (with multi-client kits).

**New features:**
- **AI Copywriter Suite:** blog (800–1200 words), LinkedIn article (600–800 words), email newsletter (250–350 words), X thread (8–10 tweets), Instagram carousel concept (8–10 slides with visual direction), quote-graphic extraction (§11.1)
- **Brand Voice & ICP Guidelines** system that all AI outputs honor (§11.2)
- **Persistent workflow memory** ("the AI remembers how I work") (§11.3)
- **Content Planner** (Kanban) + **Content Calendar** (date/platform/status view) (§14.1, §14.2)
- **Native Social Scheduler** to TikTok, IG, YT Shorts, X, LinkedIn, Facebook — with drip scheduling, calendar view, multi-account per platform (§14.3)
- **AI Hook Overlay** — auto first-3-second attention text on every clip (§10.2)
- **AI Thumbnail Generator** — best-frame + text overlay + platform formats (§10.3)
- **Profanity Censor** with bleep / mute / volume-reduced + caption masking (§9.6)
- **AI speech-triggered auto-zoom** in screen recordings (§6.2)
- **Image-to-video, audio-to-video, URL-to-video, Blog-to-video, PPT-to-video** input modes (§8.1)
- **Voice Clone** (~60s training, identity-verified) + **TTS** (60+ voices, 20+ languages) (§8.3, §8.4)
- **AI Avatar gallery** (35+) + custom avatar from photo (§8.5)
- **Talking avatar from a single photo** (§8.6)
- **Bilingual subtitle display** (original + translated side-by-side) (§10.5)
- **90+ workflow templates** organized by use case (podcast clip / interview repurpose / webinar shortform / etc.) (§7.8)
- **Free public SEO tools** (YouTube tag/title/description gen, transcript converter) as top-of-funnel pages (§19.3)

### Release 3 — **Team & Trust** (months 13–18)
**Goal:** Win in-house teams, agencies, and trust-sensitive buyers.

**Who it adds:** Marketing teams, Sales orgs, Agencies, Enterprise pilots.

**New features:**
- **Rooms** — remote multi-guest recording, locally captured, up to 10 participants, 4K, cloud backup, 7-day guest recovery (§6.3)
- **Control Room** (producers, push-to-talk) (§6.4)
- **Real-time collaborative editing** with cursors, comments, @mentions on timestamps (§13.2)
- **Roles & permissions** (editor / approver / stakeholder / viewer) (§13.3)
- **Full Brand Studio** — lockable custom layouts/templates, brand-asset library, admin-level brand governance (§13.4)
- **Eye Contact correction** (§9.3)
- **Green Screen / background removal** (§9.4)
- **Automatic Multicam / Center Active Speaker** (§9.5)
- **Lip-sync regen** for small fixes (§9.7)
- **AI relight + auto-color** (§9.8)
- **AI inpainting / object remove / people remove / text remove** (§9.9)
- **AI style transfer** (anime, 3D cartoon, oil paint) (§9.10)
- **Voice changer** effects (§8.7)
- **Native-trained dubbing voices** in 14+ languages (§10.4)
- **Transcription glossary** + "Do not translate" list (§7.4)
- **Custom AI personas** (sales BDR voice, training voice, etc.) (§11.4)
- **SOC 2 Type II + ISO 27001** certification (§15.1)
- **SSO + SAML + SCIM** (§15.2)
- **GDPR + CCPA + EU/US data residency** (§15.3)
- **Webhooks** (asset / render / publish lifecycle events) (§16.2)

### Release 4 — **Distribution & Reach** (months 19–24)
**Goal:** Close the loop from "video made" to "video delivered, measured, and learned from."

**Who it adds:** Marketers chasing attribution, L&D teams needing LMS, sales chasing per-prospect personalization.

**New features:**
- **Native iOS + Android apps** with capture, review, approve, schedule (§6.5)
- **QR-code mobile-to-desktop upload** (§6.6)
- **Interactive Video Hosting** — chapters, in-video quizzes / knowledge checks, clickable CTAs, view analytics, heatmaps (§12.3)
- **SCORM export to LMS** (§12.4)
- **Personalization at scale** — same video, different variants per role/region/account/individual (§12.5)
- **Iframe embedding + white-label hosting** (Enterprise) (§12.6)
- **Public REST API** with pay-as-you-go pricing from $10, no expiration (§16.1)
- **MCP server** with explicit Claude / ChatGPT / Cursor / Kiro / Windsurf support (§16.3)
- **ChatGPT plugin / custom GPT** (§16.4)
- **Zapier + Make + n8n** as first-class integrations (§16.5)
- **Chrome / browser extension** for one-click publishing (§16.6)
- **Cloud-drive import:** Google Drive, Dropbox, OneDrive, Box, Zoom, YouTube URL (§6.7)
- **Affiliate program** (25% lifetime, 30-day cookie, transparent dashboard) (§19.4)
- **AI Brainstorming** — topic ideas → storyboard outlines → script (§8.8)

### Release 5 — **Verticals & Regulated** (months 25–36)
**Goal:** Land regulated verticals and vertical land-grabs CapCut/Descript don't address.

**Who it adds:** Healthcare, Government, Financial Services, Church/Ministry, Real Estate, Gaming, Education, B2B Agencies.

**New features:**
- **HIPAA compliance** + **BAA support** (§15.4) — *nobody in the field has this; clear lane*
- **FedRAMP-aligned posture** (§15.5)
- **Custom-trained models** ("AI trained on your org's best content") (§11.5)
- **Vertical workflow packs:**
  - Digital Ministry / Sermon Repurposing (§17.1)
  - Real Estate property videos (§17.2)
  - Gaming (Twitch-to-TikTok, gameplay templates, Subway/Minecraft split-screen) (§17.3)
  - Sales async-video (§17.4)
  - Education / Course creation (§17.5)
  - Newsroom / Media (§17.6)
- **Multi-client agency workspace** — per-client brand kits, white-label client portals, billing splits (§17.7)
- **Pen-test report + public trust center** (§15.6)
- **AI character generator with identity consistency** (§8.9)
- **Niche generators** (AI tattoo, AI ad-product mockup, etc.) (§8.10) — *only if vertical demand justifies*

---

## 6. Pillar 1 — Capture

### 6.1 Screen Recorder
**What it is.** A one-click browser-based recorder for screen + webcam + mic, capturing up to two displays simultaneously and writing every action to an auto-transcribed editable project.

**Why it matters.** Tutorials, product demos, and async-video sales updates are the highest-velocity use cases. The recorder is often the first thing a new user touches. It must be friction-free and produce immediately editable output.

**What "good" looks like.**
- Works in browser without installing anything for sessions up to 1 hour.
- Native desktop helper (optional) unlocks 2+ hour sessions, 5K capture, ProRes-quality export.
- Auto-imports into a project, auto-transcribes, auto-detects speaker, auto-applies brand kit if configured.
- Pause/resume mid-recording without artifacts.
- Crash recovery: if browser dies, the recording survives and resumes from disk on next session.

**Sentiment guardrails.** Reliability is the bar; CapCut and HipClip lose users at this step. Local-first capture + cloud backup + crash recovery are non-negotiable (P1).

### 6.2 AI Speech-Triggered Auto-Zoom (Screen Recordings)
**What it is.** During screen recording, the AI listens to what the speaker says and dynamically zooms the screen capture to the relevant region (e.g., "and over here in the settings panel…" → zoom to settings panel).

**Why it matters.** Screen recordings without zoom are unwatchable on mobile. Choppity owns this feature; nobody else does. Adoption is high once tried.

**What "good" looks like.** Detects intent within 1–2 seconds; smooth zoom-in/zoom-out transitions; never zooms to the wrong region in >5% of cases; user can override with a click.

### 6.3 Rooms (Remote Multi-Guest Recording)
**What it is.** A guest-link-based remote-recording experience where up to 10 participants record locally (so internet glitches don't degrade quality), with each track separated, and a synced cloud backup of every track.

**Why it matters.** Podcasters and customer-interview workflows live or die on this. Riverside and Descript Rooms own this category; nobody else in the competitor set has it.

**What "good" looks like.**
- Up to 4K per participant.
- Each guest's primary recording stays on their device for at least 7 days; if upload stalls, they can resume.
- A *separate* cloud-backup recording is uploaded continuously as insurance.
- Timestamped editor comments added during the recording sync into the project immediately.
- Mobile guest support (every other Rooms tool is desktop-only — clear differentiation).

### 6.4 Control Room (Producer Mode)
**What it is.** Off-screen producers who can start/stop recording, push-to-talk to hosts/guests without being recorded themselves, monitor levels, and manage the session.

**Why it matters.** Higher-end podcast workflows require this. Descript gates it to Business tier; we follow the same gating logic.

**What "good" looks like.** 3 simultaneous producers per session, push-to-talk latency <200 ms, audio monitoring, ability to mute any guest's mic, ability to drop a guest who joined the wrong link.

### 6.5 Native Mobile Apps (iOS + Android)
**What it is.** First-class iOS and Android apps with: camera capture (front, back, dual), screen recording, voice memo, review-and-approve, comment, schedule. Heavy editing remains on web/desktop.

**Why it matters.** The single biggest competitive gap in the field (P7). Every product except CapCut lacks this. ~60%+ of short-form content creators work on phones.

**What "good" looks like.**
- Full project sync to the web editor in seconds.
- Mobile-recorded content arrives pre-transcribed.
- Push notifications when an AI render completes, when a comment lands, when a scheduled post publishes.
- Mobile users can run the AI clip generator and approve outputs on a phone.

### 6.6 QR-Code Mobile-to-Desktop Upload
**What it is.** From the desktop editor, surface a QR code that, when scanned by a phone, lets the user upload any video/photo straight into the active project.

**Why it matters.** Frictionless cross-device handoff for users without a native app installed. CapCut popularized this; users love it.

### 6.7 Cloud-Drive Import (Unified)
**What it is.** One-click import from Google Drive, Dropbox, OneDrive, Box, Zoom, and YouTube URL.

**Why it matters.** Universal expectation. HipClip is the only competitor with the full set; we match.

---

## 7. Pillar 2 — Edit

### 7.1 Text-Based Editing (the Flagship Paradigm)
**What it is.** The transcript *is* the edit. Delete a word, the audio/video deletes. Copy-paste rearranges narrative. Backspace cuts.

**Why it matters.** This is the single most-praised feature in Reddit sentiment across the entire field. It is **table stakes**, not a differentiator. We must match Descript here at parity.

**What "good" looks like.**
- Cuts feel instant; never reveal "we just spliced video."
- Smart audio crossfading hides edit boundaries automatically.
- Word-level click-to-play; double-click selects a word; triple-click selects a sentence.
- Selection respects natural breath/pause boundaries (a "tidy edits" preference).
- Speaker labels are sticky and editable.

### 7.2 Multi-Track Timeline Editor
**What it is.** A full professional multi-track timeline: video, audio, captions, music, B-roll, layers. Frame-precise trim, ripple delete, color correction, audio ducking.

**Why it matters.** Reddit complaint about Descript: "not a pro video editor." A modern AI video studio still needs the timeline for the 20% of jobs that require frame precision (P6, reversible). Without it, we lose serious creators.

**What "good" looks like.**
- Round-trips with Premiere/FCP/Resolve via XML/AAF/EDL.
- Keyframe-able opacity, position, scale on every clip.
- Audio: ducking, normalization, per-track gain, EQ presets.

### 7.3 Scenes & Storyboard Canvas
**What it is.** A "slide deck" view where each scene is a card with layout, text overlays, media, and transitions. Reorder scenes by drag-and-drop.

**Why it matters.** The Descript-popular "video as slides" metaphor; especially valuable for tutorials, courses, product demos, marketing explainers.

**What "good" looks like.**
- Stock layout packs + custom layouts savable to brand kit.
- "Quick Design" one-click reformat of a single recording into a polished scene-based video.
- "Center active speaker" automatic layout for multi-person recordings.
- Smart transitions auto-applied between scenes; user can override per transition.

### 7.4 Transcription
**What it is.** Automatic, multi-language ASR with speaker diarization, multitrack support, and a custom-glossary for brand terms / jargon.

**Why it matters.** Underlies every text-based feature in the product. Quality bar must match or exceed Descript (ElevenLabs Scribe v2 / Rev v2-class accuracy).

**What "good" looks like.**
- 25+ ASR languages at launch; expand to 50+ by R3.
- Speaker diarization handles 8+ speakers.
- "Speaker Detective" plays a clip of each unknown speaker for naming.
- Per-team transcription glossary (brand terms, product names, exec names) auto-applied.
- "Do not translate" list honored across translation outputs.
- Accents and non-English audio held to documented accuracy benchmarks per language (P9).

### 7.5 Captions / Subtitles
**What it is.** One-click dynamic, animated captions; stock styles plus custom font/color/highlight/position; word-level highlighting; Hormozi/karaoke/bounce/pop/fade presets.

**Why it matters.** Single biggest reason CapCut won the mass-market. Auto-captions on by default; users can edit text inline; drag-to-reposition on the preview canvas. Word-level highlighting in brand color is the modern expectation.

### 7.6 AI Co-pilot ("Studio Assistant")
**What it is.** An agentic AI editor that reads the script, watches the video, takes instructions in plain language, and executes multi-step edits across any pillar of the product.

**Why it matters.** Descript's Underlord is the model; Reddit data shows the brand awareness gap is real ("Underlord didn't reach users"). A competitor can win the agentic narrative with sharper UX and louder marketing.

**What "good" looks like.**
- **Chat history** persists per project, per user, across devices.
- **Context picker (`@`)** to pin files, scenes, timestamps, layers to a request.
- **Edit-review diff pass:** after every edit, a visible diff of what the AI changed; one-click revert any part (P10).
- **Verifiability:** when the AI cites a moment, it links to the exact timestamp (P4).
- **Reasoning models** for complex multi-step requests (script writing, episode planning, batch ops).
- **Custom Models** (Enterprise) trained on the org's own best content.
- **Examples it must handle out of the box:**
  - "Edit this down to 2 minutes focusing on when I talked about pricing."
  - "Add camera layouts every time I reference the dashboard."
  - "Make the trailer for this webinar."
  - "Turn this rant into a thought-leadership LinkedIn post and a 60-sec clip."

### 7.7 AI Templates / Workflow Gallery
**What it is.** A gallery of pre-built, customizable workflows that direct the AI Co-pilot to produce a specific kind of output (e.g., "Podcast trailer from interview," "Webinar → 5 shorts + blog + LinkedIn post").

**Why it matters.** Reduces the cold-start problem with agentic AI. Templates are the discoverability layer.

**What "good" looks like.** 50+ templates at launch; users can submit; community-curated gallery; templates editable as plain English.

### 7.8 90+ Workflow Templates by Vertical
**What it is.** Beyond the generic gallery, named workflow packs by industry / use case: Podcast Repurpose, Customer Interview Story, Webinar Cutdown, Sermon Pack, Real Estate Listing, Sales Outreach Loom, Course Lesson, Twitch-to-TikTok, etc.

**Why it matters.** HipClip's "90+ workflows" positioning resonates with buyers because it answers "is this for me?" instantly. Each template is also an SEO landing page.

---

## 8. Pillar 3 — Create

### 8.1 Multi-Modal Input → Video
**What it is.** Six explicit input modalities, each a first-class workflow:
1. **Text-to-Video** — describe the video, get a finished short.
2. **Script-to-Video** — paste a script, get scenes + voiceover + B-roll.
3. **URL-to-Video** — paste a blog/page URL → narrated, illustrated video.
4. **Blog-to-Video** — same, optimized for blog-post-as-input.
5. **PPT-to-Video** — upload a PowerPoint/Keynote, get narrated video.
6. **Audio-to-Video** — podcast audio → visualized video.
7. **Image-to-Video** — stills → animated video with prompted motion.

**Why it matters.** Pictory owns this surface (every input modality); none are in Descript. Marketers, course creators, and bloggers think in their source format, not in "video." Meeting them where they are wins.

**What "good" looks like.** Each input mode produces a coherent first draft in <3 minutes for typical inputs. Outputs are immediately editable in the main editor (P6, reversible).

### 8.2 AI Video Generator (Generative B-roll, Scenes, Backgrounds)
**What it is.** Best-in-class generative video for B-roll, cutaways, animated title cards, stylized background loops.

**What "good" looks like.**
- Multi-model selector under the hood; the user just picks a style. We benchmark and rotate the best models.
- 20+ pre-tested visual styles + custom-style-from-reference-image.
- The AI Co-pilot matches generated style to the script tone automatically.

### 8.3 AI Voices (TTS)
**What it is.** A catalog of natural-sounding stock voices across 20+ languages, with per-voice tone/emotion/pace controls.

**Why it matters.** Pictory's biggest complaint is "robotic voices." This is the single sharpest TTS-quality bar in the market (P9).

**What "good" looks like.**
- 60+ voices at launch, 200+ by R3. (CapCut's 200+ is the high-water mark.)
- 14+ "native-trained" voices (not just translations of English voices) by R3.
- Per-voice samples on the marketing site before signup.
- Emotion / energy / pacing sliders.
- "Don't sound like AI" review pass that flags robotic output before export.

### 8.4 Voice Clone
**What it is.** Clone your own voice in ~60 seconds with identity verification. The user owns the clone and decides whether to share it.

**Why it matters.** Descript's Overdub is the model; ~60-second cloning is the modern table-stakes timing. Use cases: voiceover, error correction by typing, multilingual narration of the user's own voice.

**What "good" looks like.**
- Identity verification required (the cloned voice must be the user's).
- Clear consent + revocation UX.
- Clone usable across all TTS surfaces (script-to-video, error-correction, etc.).
- Quality bar: in blind tests, listeners cannot reliably distinguish from the source voice on 80%+ of clips ≤30 seconds.

### 8.5 AI Avatar Gallery
**What it is.** 35+ pre-built realistic avatars who read any script. Pick avatar → type script → finished talking-head video.

**Why it matters.** Course creators, sales reps, and L&D teams want a "presenter" they don't have to film. CapCut, Pictory, Descript all have this; we must match.

### 8.6 Custom Avatar from Photo (and Single-Photo Talking Avatar)
**What it is.** Two related features:
1. Upload a clean photo, get a custom branded avatar.
2. Upload *any* photo (employee, mascot, fictional character) and get a talking-head video with realistic lip sync.

**Why it matters.** CapCut and Pictory have the single-photo talking head; Descript partially has the avatar-from-photo. Combined they unlock huge use cases for sales / marketing / education.

**What "good" looks like.** Identity-verified for any photo of a real person. Clear watermark on output if the consent is missing. Lip-sync quality acceptable up to 60 sec clips at launch, longer by R3.

### 8.7 Voice Changer Effects
**What it is.** Real-time and post-process voice changers (robot, chipmunk, monster, anonymize-source, gender-shift).

**Why it matters.** CapCut and TikTok-native creators expect this. Optional but a delight for the consumer/creator segment.

### 8.8 AI Brainstorming
**What it is.** "I want to make a video about X" → AI returns topic angles, storyboard outlines, hook variations, suggested length, suggested platforms.

**Why it matters.** Closes the cold-start gap. CapCut productized this; users love it.

### 8.9 AI Character Generator (with Identity Consistency)
**What it is.** Generate a fictional character that stays visually consistent across many generations (same face, outfit, voice).

**Why it matters.** Course creators, fiction creators, marketers building a recurring mascot need this. CapCut owns it currently.

### 8.10 Niche Generators
**What it is.** AI tattoo generator, AI product-shot generator, AI book-cover generator, AI hairstyle preview, etc.

**Why it matters.** CapCut uses these as SEO surfaces and acquisition. We ship the 3–5 that have clear top-of-funnel value (validated by vertical research), not all of them.

---

## 9. Pillar 4 — Enhance

### 9.1 Studio Sound (Regenerative Audio Cleanup)
**What it is.** Not a filter — the AI *regenerates* clean voice from noisy input, removing background noise, echo, room reverb. Works on bedroom, phone, airport recordings.

**Why it matters.** Most-loved Descript feature on Reddit for podcasters. Table stakes.

**Sentiment guardrail.** Reddit complaint: "Studio Sound can over-process and sound robotic." We ship a strength slider (light / medium / strong) and a "preserve room tone" mode. Always show before/after.

### 9.2 Remove Filler Words + Shorten Gaps + Edit for Clarity + Remove Retakes
**What it is.** One-click cleanup passes:
- **Remove Filler Words** — "um, uh, you know" auto-removed with smart crossfades.
- **Shorten Gaps** — silence/breath gaps shrunk.
- **Edit for Clarity** — content-level: cuts digressions, tangents, "scruff and fluff."
- **Remove Retakes** — detects repeated lines, keeps best take.

**Why it matters.** The "one-button magic" moments Reddit loves. Edit for Clarity is the differentiator — it works at content level, not just word level.

### 9.3 Eye Contact Correction
**What it is.** AI subtly redirects the speaker's gaze toward the camera even when they were looking at notes or another screen.

**Why it matters.** Descript-exclusive vs most competitors. Salespeople, async-video users, course creators rely on it.

**What "good" looks like.** Adjustable strength; user can preview before/after; flag obvious failures.

### 9.4 Green Screen / Background Removal
**What it is.** AI subject isolation without a physical green screen. Replace background with stock, custom image, blur, or another video.

### 9.5 Automatic Multicam + Center Active Speaker
**What it is.** When there are multiple camera angles or speakers, the AI automatically cuts between them based on who's talking, keeping the active speaker centered.

### 9.6 Profanity Censor (with Caption Masking)
**What it is.** Three audio modes (classic bleep / silent mute / volume-reduced) **plus** caption masking (symbols, asterisks, underscores).

**Why it matters.** Choppity-only differentiator today. Crucial for ad-safe podcasts, family-friendly content, religious/educational verticals.

### 9.7 Lip-Sync Regeneration (Video Regenerate)
**What it is.** When the user changes a word in the transcript, the AI regenerates the speaker's mouth movement to match — not just the audio.

**Why it matters.** Closes the loop for text-based editing on talking-head video. Descript ships this as beta; we ship it as a polished feature.

### 9.8 AI Relight + AI Auto-Color
**What it is.** AI relighting (fix bad lighting), AI auto color correction (exposure + saturation balance).

**Why it matters.** CapCut and HipClip have lighting tools; nobody else does well. High value for tutorials and async-video recorded in poor lighting.

### 9.9 AI Inpainting / Object Remove / People Remove / Text Remove
**What it is.** Click on a person/object/text in a video frame and have it removed cleanly across the whole clip.

**Why it matters.** CapCut owns these; very high "wow" factor. Marketing/agency users use them constantly (remove a logo, remove a passerby, remove old text).

### 9.10 AI Style Transfer
**What it is.** Convert video to anime, 3D cartoon, oil painting, sketch, etc.

**Why it matters.** Consumer-creator delight feature. Not the biggest revenue driver but lifts free-tier engagement and viral marketing.

---

## 10. Pillar 5 — Translate

### 10.1 Caption / Subtitle Translation (100+ Languages)
**What it is.** Auto-translate captions/subtitles into 100+ languages with side-by-side proofread UI.

**Why it matters.** Descript's 61 is the floor; Wayin and CapCut hit 100+. The "Translated only / Original only / Bilingual" toggle is a Wayin-unique we should match.

### 10.2 Bilingual Subtitle Display
**What it is.** Show original + translated subtitles simultaneously on the same video.

**Why it matters.** Wayin-only differentiator. Loved by language learners, international podcast audiences, dubbed content viewers.

### 10.3 AI Dubbing (Voice Translation)
**What it is.** Translate the spoken audio into another language using the original speaker's voice (cloned).

**Why it matters.** Descript ships 30+ languages with native-trained voices in 14; CapCut claims 100+. The quality bar is set by ElevenLabs / HeyGen. We must hit native-speaker acceptability in at least the top 15 languages (P9).

**What "good" looks like.**
- Lip-sync re-renders in dubbed video so mouth matches translated words.
- Side-by-side proofread UI before commit.
- "Do not translate" list (brand names, product names, exec names) honored.

### 10.4 Native-Trained Dubbing Voices
**What it is.** Dubbing voices custom-trained per language rather than generic-translated. 14+ languages at Business tier minimum (Descript baseline).

### 10.5 Caption Translation Display Modes
**What it is.** Three explicit modes: Translated only, Original only, Bilingual (both side-by-side).

---

## 11. Pillar 6 — Repurpose

### 11.1 AI Copywriter Suite
**What it is.** One video in → six written assets out, each fully editable:
1. **Blog post** (800–1200 words, SEO-optimized with H2/H3 structure and meta)
2. **LinkedIn article** (600–800 words, professional voice)
3. **Email newsletter** (250–350 words, with a CTA)
4. **X/Twitter thread** (8–10 tweets, hook-led, native cadence)
5. **Instagram carousel concept** (8–10 slides with visual direction for each slide)
6. **Quote graphics** (powerful pull quotes surfaced, ready to drop into Brand Studio templates)

**Plus:** Show notes, podcast summaries, YouTube descriptions, hashtag sets, video chapters with timestamps.

**Why it matters.** HipClip owns this; Reddit explicitly loves it. The "publishable-from-first-pass" bar (P5) is what makes or breaks this feature.

**What "good" looks like.**
- Outputs honor the user's Brand Voice & ICP (§11.2).
- Outputs are grounded (every claim links to a video timestamp — P4).
- 80%+ of outputs publishable with <5 minutes of editing.
- Tone presets: thought-leader / explainer / casual / formal / playful.

### 11.2 Brand Voice & ICP Guidelines
**What it is.** A persistent workspace setting where the user defines:
- **Brand voice:** sample paragraphs, tone words ("expert but not stuffy"), banned words, must-use words.
- **ICP profiles:** target persona descriptions, their pain points, their language patterns.
- **Tone templates:** preset configurations for different content types.

All AI text outputs honor these automatically.

**Why it matters.** HipClip-unique today. Solves the universal "AI output sounds generic" complaint (P5).

### 11.3 Persistent Workflow Memory
**What it is.** The AI Co-pilot remembers user preferences across sessions: "you usually want shorts under 60 seconds with hook overlays in red, captions at the bottom, Hormozi style." After 5–10 projects, the AI can produce a near-final draft with a one-line prompt.

**Why it matters.** HipClip-unique; differentiates an agent that improves with use from one that resets every session.

### 11.4 Custom AI Personas
**What it is.** Save reusable AI "modes" (e.g., "Sales BDR voice — concise, urgent, value-led"; "Training voice — patient, explanatory, jargon-free") that combine voice clone + tone + writing style + visual templates.

### 11.5 Custom-Trained Models (Enterprise)
**What it is.** Train the AI Co-pilot on the org's best content — their highest-performing scripts, their preferred clip moments, their social-post styles — so it produces output that sounds like *them*, not a generic AI.

**Why it matters.** Descript's Enterprise wedge. We match.

### 11.6 AI Clip Generator (Long → Short)
**What it is.** Drop a long video, get 15–30+ short-form clips with viral-score ranking, auto-reframe (9:16 / 1:1 / 16:9), animated captions, hook overlay, thumbnail, and ready-to-schedule status.

**Why it matters.** This is the most contested feature in the entire competitor set. ScaleReach, Choppity, Opus Clip, Vizard, HipClip, Pictory, Wayin all live or die on it. Reddit consistently says the *quality of clip selection* is the differentiator — Choppity and Pictory get dinged for it; Vizard and Opus Clip lead.

### 11.7 Custom Clip Prompts
**What it is.** Beyond "give me viral clips," the user can prompt: "find the funniest parts," "find every mention of pricing," "find moments where the guest tells a personal story," "find product-feature demos."

**Why it matters.** ScaleReach + HipClip + Wayin differentiator. Massively useful for marketers and PR clipping.

### 11.8 Natural-Language Video Search
**What it is.** "Show me every moment where someone said X" / "find the part about pricing" — across one video or across an entire library.

**Why it matters.** Wayin / Choppity ClipAnything differentiator. Essential for power users.

---

## 12. Pillar 7 — Distribute

### 12.1 Public Share URL with View Counter
**What it is.** Every project has a public web page with the video player, captions, chapters, and a live view counter — no signup needed for viewers.

**Why it matters.** ScaleReach productized the counter; users love public proof of distribution. Descript has share pages but no counter visibility.

### 12.2 Auto-Updating Embed Link
**What it is.** When the user edits a video, the embedded version updates everywhere it's been embedded — same URL, new content.

**Why it matters.** Descript-loved feature; critical for marketing teams shipping iterative video.

### 12.3 Interactive Video Hosting
**What it is.** A hosted video player that supports:
- AI-generated in-video **chapters**.
- **Knowledge checks / quizzes** at chapter boundaries.
- **Clickable CTAs** (book a demo, download a resource, jump to next video).
- **View analytics** (watch time, drop-off curve, click-through on CTAs, quiz scores).
- Heatmaps of where viewers re-watch.

**Why it matters.** Pictory Central is the model. L&D, sales enablement, course creators need this. None of Descript's competitors except Pictory have it.

### 12.4 SCORM Export to LMS
**What it is.** Export any project as a SCORM package importable into corporate LMSes (Brightspace, Cornerstone, Workday Learning, SAP SuccessFactors).

**Why it matters.** Unlocks the L&D budget category. Pictory enterprise has this; nobody else.

### 12.5 Personalization at Scale
**What it is.** Render the *same* base video as N variants, where each variant has personalized name/company/role/region/account in the script, on-screen text, and (for advanced) the dubbed voiceover.

**Why it matters.** Sales outreach + ABM marketing love this. Pictory enterprise has it; massive ASP uplift.

### 12.6 Iframe Embedding + White-Label Hosting (Enterprise)
**What it is.** Embed the entire player or specific projects in another product (e.g., a knowledge base, a help center) with the host's branding instead of ours.

### 12.7 Native Social Scheduler
**What it is.** Schedule and publish directly to:
- TikTok
- Instagram (Reels, Feed, Stories)
- YouTube (Shorts, regular)
- X / Twitter
- LinkedIn (personal + company pages)
- Facebook (personal + pages)
- Threads (when API available)

With **drip scheduling** (post 1 clip per day for 30 days from one upload), visual calendar, **multiple accounts per platform**, queue management, optimal-time recommendations.

**Why it matters.** Choppity + ScaleReach have it; Descript doesn't. Reddit data shows users tolerate a single weak feature in a tool but won't tolerate having to leave the tool to post.

---

## 13. Pillar 8 — Operate (Brand, Collaboration, Planning, Comms)

### 13.1 Brand Kit (Lite → Full)
**What it is.** From R1: logo, primary/secondary colors, brand fonts. From R3: lockable custom layouts, branded templates, branded share pages, branded intros/outros, branded captions, branded export.

**Why it matters.** Marketing/agency tier won't adopt without it. Lockable brand assets are an admin lever Descript ships at Business tier; we match.

### 13.2 Real-Time Collaborative Editing
**What it is.** Multiple cursors on the same project, comments on transcript or timeline, @mentions trigger notifications, conflict-free editing.

**Why it matters.** Standard expectation for any team product in 2026.

### 13.3 Roles & Permissions
**What it is.** Editor / Approver / Stakeholder (read+comment only) / Viewer. Per-project and per-workspace.

### 13.4 Full Brand Studio
**What it is.** A dedicated brand-governance surface where admins:
- Upload and lock brand assets (logos, fonts, colors, intros, lower-thirds).
- Create branded scene/layout packs that all team videos inherit.
- Approve or reject brand-violating outputs.
- Track brand consistency across the team's published content.

### 13.5 Content Planner (Kanban)
**What it is.** A board where ideas live as cards; cards move through Idea → Drafted → Approved → Scheduled → Published. Cards link to projects and to scheduled posts. Each card holds platform-specific copy previews, target dates, and approval comments.

**Why it matters.** Choppity-only. Closes the "ideation → execution" loop inside one product.

### 13.6 Content Calendar
**What it is.** A date/platform/status/campaign view of what's scheduled to publish where and when. Visual time blocks, drag-to-reschedule, conflict detection.

### 13.7 Comments + Approval Workflows
**What it is.** Timestamped comments on the transcript and timeline. Approval workflows (e.g., "needs Marketing Director sign-off before publish"). Audit trail of who changed what.

### 13.8 Multi-Client Agency Workspace
**What it is.** Per-client brand kits, per-client content calendars, per-client billing exports, per-client white-labeled share pages, single dashboard across all clients.

**Why it matters.** Agencies are a high-ARPU underserved segment. R5 / R3 (depending on demand).

### 13.9 Slack / Teams Notifications
**What it is.** Render-complete, comment-added, scheduled-post-published, approval-needed → routed to chosen Slack/Teams channels.

---

## 14. Pillar 8a — Content Operations Stack (Planner + Calendar + Scheduler)

(Pulled out for emphasis because this combination is a real competitive gap vs Descript.)

### 14.1 Content Planner
*See §13.5.*

### 14.2 Content Calendar
*See §13.6.*

### 14.3 Social Scheduler
*See §12.7.*

**Why this trio matters together.** The "ideas board → calendar → publishing queue" workflow is what Choppity uses to position itself as a unified solution and what ScaleReach uses to undercut Descript. Shipping any one of these without the others is a half-measure; shipping all three creates a moat.

---

## 15. Pillar 8b — Trust, Compliance & Security

### 15.1 SOC 2 Type II + ISO 27001
Both certifications by R3 (Pictory has ISO, Descript has SOC 2 — we hold both).

### 15.2 SSO + SAML + SCIM
Enterprise table stakes. Match Descript.

### 15.3 GDPR + CCPA + EU/US Data Residency
Residency from day 1 (Descript has neither). Differentiator vs CapCut for European buyers.

### 15.4 HIPAA + BAA Support
**Open lane.** No competitor in the research set has it. Unlocks healthcare, telemedicine, mental-health, and pharma content workflows.

### 15.5 FedRAMP-Aligned Posture
Unlocks public-sector content.

### 15.6 Public Trust Center + Pen-Test Summary
Transparent public-facing page with: latest SOC 2 report download (after NDA), latest pen-test summary, real-time uptime, current incident status, list of subprocessors.

### 15.7 AI Privacy Defaults
- All AI features explicitly opt-in.
- Customer content never used to train shared models without opt-in.
- Voice clone requires identity verification.
- Avatar from photo requires consent verification for any photo of a real person.
- Plain-English data summary on every AI surface ("this sends your audio to X for transcription; your content is deleted after 30 days").

---

## 16. Pillar 8c — API & Integrations

### 16.1 Public REST API
**What it is.** Self-serve API for: upload, transcribe, generate-clip, render, publish, get-analytics. Pay-as-you-go pricing from $10, no expiration on prepaid credits (Wayin model).

### 16.2 Webhooks
**What it is.** Subscribe to lifecycle events: asset.uploaded, asset.transcribed, clip.generated, render.complete, post.scheduled, post.published, post.failed.

### 16.3 MCP Server
**What it is.** A Model Context Protocol server with 15+ tools, callable from Claude Desktop, Claude Web, ChatGPT, Cursor, Kiro, Windsurf, Claude Code. Devs and power users can drive the product from their AI client.

### 16.4 ChatGPT Plugin / Custom GPT
**What it is.** Installable GPT in the ChatGPT store that lets users create/edit videos by chatting in ChatGPT.

### 16.5 Zapier + Make + n8n
First-class integrations with documented triggers and actions for each.

### 16.6 Chrome / Browser Extension
**What it is.** One-click capture-and-publish from any web page (YouTube URL → bring into project; selected text → blog-to-video; current tab → screen recording).

### 16.7 Round-Trip to Pro NLEs
Export timeline as XML/AAF/EDL for Premiere, FCP, Resolve, Pro Tools, Audition.

### 16.8 Podcast Host Publishing
One-click publish to Buzzsprout, Transistor, Castos, Captivate, Podbean, Spotify for Podcasters, Apple Podcasts.

---

## 17. Vertical Workflow Packs (R5)

Each is a bundle of: branded templates + workflow recipes + Co-pilot personas + presets + landing page.

### 17.1 Digital Ministry / Sermon Pack
Sermon → multi-week clip series, devotional shorts, social posts, transcript for church website, translated captions for global congregations. HipClip + Choppity tap this; nobody owns it.

### 17.2 Real Estate
Listing video → 30-sec walkthrough, social shorts, MLS-formatted exports, school/neighborhood overlay templates. Choppity has hints; clear lane.

### 17.3 Gaming
Twitch → TikTok clip generator, gameplay highlight detection, Subway Surfers / Minecraft / GTA split-screen backgrounds, ASMR generator, gameplay-specific captions. ScaleReach + CapCut have it.

### 17.4 Sales Async Video
Personalized loom-style messages with branded share page, view tracking, CTA clicks, integration with Salesforce / HubSpot. Big lane — competitors do this generically.

### 17.5 Course / Education
Course lesson template, chapter quizzes, SCORM export, AI knowledge-check generation, student-progress analytics.

### 17.6 Newsroom / Media
Reporter self-serve template, field-recording cleanup defaults, one-edit-multi-format output, fast-publish to YouTube/Twitter/X with auto-thumbnail and headline copy.

### 17.7 Agency Multi-Client
Per-client brand kits, white-label client review portals, billing splits, multi-account social scheduling per client. See §13.8.

---

## 18. Anti-Features (Things We Will NOT Build)

These are explicit "no" decisions, each tied to a sentiment or strategic reason.

| Anti-feature | Why we're not doing it |
|---|---|
| Generic AI image gen as a standalone product | Adjacent, commoditized; we ship it only inside the editor as B-roll generation. |
| Live streaming | Different infrastructure problem; out of scope. |
| Meeting transcription competitor (Otter/Fireflies) | Adjacent market; we ship Zoom *import*, not real-time meeting capture. |
| One-way "auto-publish without review" mode | Violates P6 (reversible) and P10 (human-in-the-loop). Always require user approval to publish. |
| Hidden pricing page | Violates P2. |
| Free tier without all core features | Violates P3. |
| Feature deprecation moved to a higher tier mid-cycle | Violates P2 (CapCut pain). Once it's in your tier, it stays in your tier until you renew. |
| AI outputs without source links / provenance | Violates P4. |
| Trip-wire trial → paid auto-conversion without warning | Violates P2 (Pictory pain). All auto-conversions require 7-day reminder + 1-click cancel. |
| ByteDance / CCP-adjacent ownership or hosting | Violates P8 and the explicit market gap CapCut leaves open. |
| Watermarks on free-tier output by default | Violates P3 (Pictory pain). Optional badge for sharing love; never a forced watermark. |
| Workflow lock-in (cannot re-enter a stage) | Violates P6 (Pictory pain). |
| Mobile as "phase 4" afterthought | Violates P7. Mobile capture is R1; full mobile parity is R4 hard date. |
| English-only AI quality bar | Violates P9. |
| Chatbot-only support during outages | Violates P12. |

---

## 19. Packaging & Pricing Philosophy

Detailed pricing TBD in commercial planning; principles here.

### 19.1 Tier Structure
| Tier | Audience | Key principle |
|---|---|---|
| **Free** | Trial users, hobbyists, students | All core features, generous quotas, no watermark unless user opts in. Free credits roll over 30 days. |
| **Creator** ($15–25/mo) | Solo creator, podcaster, freelancer | All AI features, higher quotas, brand kit, social scheduler, AI writing suite. |
| **Pro** ($30–50/mo) | Power creator, growing solopreneur | Above + voice clone, custom avatar, generative video, higher render priority. |
| **Team** ($100–200/mo) | In-house teams, agencies | Above + real-time collab, roles, Brand Studio, multiple seats, Rooms. |
| **Business** ($300–500/mo) | Established orgs | Above + Control Room, native-trained dubbing voices, interactive hosting, analytics. |
| **Enterprise** (custom) | Regulated/large orgs | Above + SSO/SCIM, custom models, HIPAA, residency, SLA, dedicated CSM, white-label. |

### 19.2 Add-Ons (Independent of Tier)
- **Pay-as-you-go API credits** — $10 starting balance, no expiration.
- **Extra render priority** — bump to "Highest" queue.
- **Extra storage** — by 100 GB blocks.
- **Extra voice-clone minutes / dubbing minutes / generative-video credits** — predictable per-unit pricing.

### 19.3 Free Public Top-of-Funnel Tools
Each is a public, indexable landing page and a real product:
- YouTube tag generator
- YouTube title generator
- YouTube description generator
- Hashtag generator
- Audio-to-text converter (per format: mp3, wav, m4a, mp4, mov)
- Audio translator (source → destination matrix)
- Caption generator
- Video compressor / converter / aspect-ratio changer
- AI thumbnail generator
- AI hook generator (write the first 3 seconds)
- Storyboard generator
- AI script-to-storyboard

**Why.** Choppity and HipClip use these for organic acquisition. Descript has 200+ of these landing pages. Each tool both ranks for long-tail SEO and is a real user touchpoint that converts to signup.

### 19.4 Affiliate Program
25% lifetime, 30-day cookie, $50 payout minimum, transparent dashboard. ScaleReach-style.

### 19.5 Pricing Communication Rules
- One transparent pricing page, no login required to see all tiers.
- Monthly and annual on every tier (annual = 50% off month at most aggressive; never less than 30% off).
- All quotas visible; no asterisks.
- 90-day notice for any price change; existing customers grandfathered for 12 months.
- "Compare yourself to our competitors" honest table on the pricing page.

---

## 20. Success Metrics (Per Release)

Each release has a measurable win condition. If we miss it, we don't ship the next release until we patch.

### R1 — Foundation
- 50,000 weekly active free users.
- 5,000 paid Creator subscribers.
- 99.5% render success rate on jobs ≤2 hours (P1).
- NPS ≥ 40 (founders + early users).
- Reddit sentiment scan in month 6: no recurring "buggy / crashes" complaint at the top of mentions.

### R2 — Creator Depth
- 25,000 paid (Creator + Pro combined).
- AI Copywriter "publishable from first pass" rate ≥80% in user surveys (P5).
- Social Scheduler used by ≥40% of Creator+ subscribers.
- Net-new persona acquired: podcasters (measurable via signup survey).

### R3 — Team & Trust
- 500 Team/Business workspaces.
- SOC 2 Type II + ISO 27001 active.
- First Fortune 500 logo signed.
- Rooms used in ≥30% of podcaster sessions.

### R4 — Distribution & Reach
- Native mobile apps in App Store + Play Store with ≥4.5 stars.
- Pay-as-you-go API generating ≥$50K MRR.
- Interactive video hosting used by ≥20% of Business+ subscribers.

### R5 — Verticals & Regulated
- First HIPAA-covered customer signed.
- ≥3 vertical packs each driving ≥1,000 paid customers.
- Agency tier averaging ≥10 clients per agency workspace.

---

## 21. Open Questions for Founders / Investors

1. **Pricing currency:** Aggressively undercut Descript (ScaleReach plays this), match it, or premium it on trust+verticals? *Recommended:* match on Creator, undercut on Free, premium on Enterprise via HIPAA.
2. **Mobile go-to-market:** Free mobile-only consumer app to attack CapCut's gap, or paid prosumer mobile experience from day 1? *Recommended:* free mobile capture + review; paid editing.
3. **Brand voice:** Trustworthy/professional (vs CapCut's chaos) or creator-native (vs Descript's enterprise tone)? *Recommended:* trustworthy + warm; "the grown-up CapCut, the friendly Descript."
4. **API-first or app-first?** Wayin is API-first; Descript is app-first; ScaleReach is balanced. *Recommended:* App-first with strong API as a multiplier.
5. **Voice-clone TOS:** Allow voice clones of public figures by users who claim consent? *Recommended:* no — identity verification required for all clones.
6. **Customer content for training:** Opt-in benefit ("share your content, get higher quotas") or never? *Recommended:* never; trust is our moat.

---

## 22. Build-Order Cheat Sheet (one-page version for execs)

| Release | Theme | What ships | Hard guardrails |
|---|---|---|---|
| **R1 (m1–6)** | Foundation: editor + recorder + AI agent + share. Web only. | Text-based editor, multi-track timeline, scene canvas, transcription, captions, screen+webcam recorder, AI Co-pilot, AI Templates, AI Clip Generator with viral score, Studio Sound, filler removal, public share with view counter, auto-updating embed, Brand Kit Lite. | Stability (P1), honest pricing (P2), generous free tier (P3), verifiable AI (P4). |
| **R2 (m7–12)** | Creator Depth: repurpose + plan + publish + voices + avatars. | AI Copywriter suite, Brand Voice & ICP, persistent memory, Content Planner, Content Calendar, Social Scheduler, AI Hook Overlay, AI Thumbnail Generator, Profanity Censor, AI auto-zoom, multi-modal input (URL/Blog/PPT/Audio/Image to video), Voice Clone, TTS 60+ voices, Avatar gallery, custom avatar from photo, talking avatar from single photo, bilingual subtitles, 90+ workflow templates, free SEO tools as top-of-funnel. | Publishable-first-pass copy (P5), reversible workflow (P6). |
| **R3 (m13–18)** | Team & Trust: Rooms + Brand Studio + collab + security. | Rooms (remote multi-guest), Control Room, real-time collab, roles, Brand Studio, eye contact, green screen, multicam, lip-sync regen, AI relight + color, AI inpainting/object removal, AI style transfer, voice changer, native-trained dubbing voices, transcription glossary, SOC 2 Type II + ISO 27001, SSO/SAML/SCIM, GDPR/CCPA, EU/US residency, webhooks. | Mobile-first parity (P7), privacy-first (P8). |
| **R4 (m19–24)** | Distribution & Reach: mobile + hosting + API. | iOS + Android native apps, QR upload, Interactive video hosting (chapters/quizzes/CTAs/analytics), SCORM export, personalization at scale, iframe + white-label, REST API + pay-as-you-go, MCP server, ChatGPT plugin, Zapier+Make+n8n, Chrome extension, cloud-drive import (Drive/Dropbox/OneDrive/Box/Zoom), affiliate program, AI brainstorming. | AI quality across languages (P9), human-in-the-loop (P10). |
| **R5 (m25–36)** | Verticals & Regulated: HIPAA + vertical packs + custom models. | HIPAA + BAA, FedRAMP-aligned, custom-trained models, vertical packs (Ministry / Real Estate / Gaming / Sales / Education / Newsroom / Agency), public trust center + pen-test summary, AI character generator with identity consistency, niche generators. | One product not five subscriptions (P11), real human support with SLA (P12). |

---

## 23. Source Provenance

Every feature in this roadmap traces to one or more of:
- `descript-competitor-research.md` (Descript baseline)
- `competitors-vs-descript.md` (additive features from Choppity, Pictory, ScaleReach, CapCut, Wayin, HipClip)
- `reddit-sentiment-scan.md` (universal pain / praise patterns → guiding principles + anti-features)

When a downstream agent (PRD writer, design lead, engineering planner) needs more detail on any feature, they should consult the source document for the feature's origin and validation evidence before scoping the work.

---

*End of roadmap document.*
