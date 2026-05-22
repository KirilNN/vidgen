# 6-Competitor Comparative Research — Choppity, Pictory, ScaleReach, CapCut, Wayin, HipClip

> **Companion to** `descript-competitor-research.md`. Use both documents together.
>
> **Purpose.** For each of the 6 products, capture an exhaustive feature catalog from their live websites (fetched 2026-05-21), then synthesize:
> 1. Where each overlaps with Descript
> 2. Which features they have that **are NOT in the Descript research**
> 3. A consolidated list of "new features" to add to the master spec
>
> **Validation discipline.** Every claim is sourced to the live site. Where a site blocked crawling (e.g. Wayin's pricing returned 403; CapCut walls pricing behind login), that gap is explicitly flagged.
>
> **Sources actually crawled** are listed at the end of each product section.

---

## 0. At-a-Glance Comparison Matrix

Read down a row to see which products offer each capability. ✅ = explicitly offered. ❌ = not mentioned. ⚠️ = ambiguous / partial / gated.

| Capability | Descript | Choppity | Pictory | ScaleReach | CapCut | Wayin | HipClip |
|---|---|---|---|---|---|---|---|
| **Text-based editing (transcript = video)** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Multi-track timeline editor** | ✅ | ⚠️ (power-user) | ❌ | ⚠️ basic | ✅ | ❌ | ❌ |
| **Scenes / storyboard canvas** | ✅ | ❌ | ✅ | ❌ | ✅ template | ❌ | ❌ |
| **Agentic AI co-editor (chat → edit)** | ✅ Underlord | ❌ | ⚠️ Pictory GPT | ⚠️ MCP only | ✅ Video Studio | ❌ | ✅ core UX |
| **AI clip detection (long → shorts)** | ✅ Create Clips | ✅ core | ✅ highlights | ✅ core (15/video) | ❌ | ✅ core | ✅ core |
| **AI viral-score (0–100)** | ❌ | ✅ relevancy % | ❌ | ✅ 0–100 + drivers | ❌ | ❌ | ✅ scored |
| **AI hook overlay (auto first-3s)** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **AI thumbnail generator** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **AI auto-reframe (face-tracking 9:16)** | ✅ Multicam | ✅ Magic Reframe™ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **AI speaker tracking (multi-cam-style)** | ✅ Center Active Speaker / Multicam | ✅ | ❌ | ⚠️ basic | ❌ | ❌ | ❌ |
| **Split-screen gameplay backgrounds (Subway/Minecraft)** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Profanity censor (bleep/mask)** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **AI audio enhancement (noise / echo)** | ✅ Studio Sound | ❌ | ✅ noise rm | ❌ | ✅ | ❌ | ✅ |
| **Filler-word removal** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Silence removal** | ✅ Shorten Gaps | ❌ | ✅ | ✅ tool | ❌ | ❌ | ✅ |
| **Eye-contact correction** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Lip-sync regen (mouth match)** | ✅ Video Regenerate β | ❌ | ❌ | ❌ | ✅ talking avatar | ❌ | ❌ |
| **AI relight / AI color** | ⚠️ color tools | ❌ | ❌ | ❌ | ✅ Relight + auto-color | ❌ | ✅ lighting |
| **AI body effects (face / body morph)** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **AI style transfer (anime / 3D / oil-paint)** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **AI inpainting / object remove (people, text)** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **AI background removal (green-screen-less)** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Talking avatar from a single photo** | ⚠️ partial | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **AI avatars (gallery / talking head)** | ✅ 35+ | ❌ | ✅ launching | ❌ | ✅ 100+/1000+ cats | ❌ | ❌ |
| **Voice clone** | ✅ ~60s | ❌ | ✅ Pro+ | ❌ | ✅ seconds | ❌ | ❌ |
| **TTS / stock AI voices** | ✅ 60+ voices, 20+ langs | ❌ | ✅ 29 langs ElevenLabs | ❌ | ✅ 200+ voices | ❌ | ❌ |
| **Voice changer (robot/chipmunk etc.)** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **AI dubbing (voice translation)** | ✅ 30 langs | ❌ | ✅ ElevenLabs | ❌ | ✅ 100+ | ❌ | ❌ |
| **Caption / subtitle translation** | ✅ 61 langs | ❌ | ⚠️ 11+ | ❌ | ✅ 100+ | ✅ **100+ bilingual** | ✅ ~50 |
| **Bilingual subtitles (original + translated)** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ unique | ❌ |
| **Text-to-video (full generative)** | ⚠️ Underlord + Veo etc. | ❌ | ✅ ReelFast | ❌ | ✅ Dreamina Seedance 2.0 | ❌ | ❌ |
| **URL-to-video (blog/page scrape)** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **PPT-to-video** | ⚠️ slides-to-video | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Audio-to-video (podcast → visualized)** | ⚠️ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Image-to-video (animate stills + prompt)** | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **AI image generation** | ✅ | ❌ | ✅ AI Studio | ❌ | ✅ Seedream 5.0 / Nano Banana Pro | ❌ | ❌ |
| **AI character generator (consistent)** | ⚠️ via models | ❌ | ❌ | ❌ | ✅ batch one-click | ❌ | ❌ |
| **AI tattoo / niche generators** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Stock media library (built-in)** | ✅ | ❌ | ✅ 18M+15K music | ❌ | ✅ massive | ❌ | ⚠️ basic music |
| **Music / SFX library** | ✅ | ⚠️ uploads only | ✅ Melodie 15K | ⚠️ via backgrounds | ✅ trendy library | ❌ | ✅ |
| **Templates library (designs / packs)** | ✅ AI Templates | ✅ brand templates | ⚠️ scripts | ❌ | ✅ millions w/ counts | ❌ | ✅ 90+ workflows |
| **Workflow templates (90+ playbooks)** | ⚠️ AI Templates | ❌ | ⚠️ scripts | ❌ | ❌ | ❌ | ✅ unique |
| **Content planner (Kanban / ideas board)** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Content calendar** | ❌ | ✅ | ❌ | ✅ scheduler | ❌ | ❌ | ❌ |
| **Native social scheduler (TikTok/IG/YT/X/LI/FB)** | ❌ | ✅ 6 platforms | ⚠️ via Zapier | ✅ 5 platforms | ❌ not confirmed | ⚠️ direct share | ❌ |
| **AI writes blog / newsletter / threads from video** | ⚠️ basic | ❌ | ❌ | ❌ | ⚠️ AI writer | ❌ | ✅ full suite |
| **AI ad-copy / ad-script generator** | ❌ | ❌ | ✅ | ❌ | ⚠️ | ❌ | ❌ |
| **Brand voice / ICP personalization** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ unique |
| **"AI remembers your workflows" (persistent memory)** | ⚠️ Underlord chat | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ claimed unique |
| **AI script generator (topic → script)** | ✅ | ❌ | ✅ | ❌ | ✅ AI writer | ❌ | ✅ |
| **AI YouTube tag / title / desc generators (free SEO tools)** | ⚠️ description only | ✅ free tools | ❌ | ❌ | ❌ | ❌ | ✅ free tools |
| **Public share URL (anyone can view/embed, no account)** | ✅ Drive pages | ⚠️ embed | ❌ | ✅ + view counter | ⚠️ links | ❌ | ❌ |
| **Auto-updating embeds (URL persists across edits)** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Interactive video hosting (chapters/quiz/CTA/SCORM)** | ❌ | ❌ | ✅ Pictory Central | ❌ | ❌ | ❌ | ❌ |
| **LMS / SCORM export** | ❌ | ❌ | ✅ Enterprise | ❌ | ❌ | ❌ | ❌ |
| **Natural-language video search ("find moment about X")** | ⚠️ via Underlord | ✅ ClipAnything | ⚠️ scene detect | ⚠️ custom prompts | ❌ | ✅ core | ❌ |
| **Screen recorder (in-app)** | ✅ | ✅ (Jan 2026) + AI zoom + auto-reframe | ✅ Smart Screen Recorder | ❌ | ❌ web; ✅ mobile | ❌ | ❌ |
| **AI auto-zoom in screen recordings** | ❌ | ✅ speech-triggered | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Multi-guest remote recording (podcast-style)** | ✅ Rooms | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Producer / Control Room mode** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Mobile native app (iOS / Android)** | ❌ | ❌ | ❌ | ❌ | ✅ both | ❌ | ❌ |
| **Native desktop app (Mac/Win)** | ✅ historically | ❌ | ❌ | ❌ | ✅ both | ❌ | ❌ |
| **QR-code upload from mobile to web** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Cloud-drive import (Drive/Dropbox/OneDrive/Box/Zoom)** | ⚠️ Zoom + Drive | ⚠️ YouTube | ⚠️ | ❌ | ✅ Drive + Dropbox | ❌ | ✅ all 5 |
| **Public REST API (self-serve)** | ✅ open beta | ✅ + webhooks | ⚠️ Enterprise only | ❌ | ❌ | ✅ pay-as-you-go from $10 | ⚠️ Enterprise on req |
| **MCP server (callable from Claude/ChatGPT/Cursor)** | ✅ | ⚠️ n8n flows | ❌ | ✅ 15 tools | ❌ | ✅ + OpenClaw + Claude Code | ❌ |
| **Zapier integration** | ⚠️ via Slack only | ❌ | ✅ | ❌ | ❌ | ⚠️ via Make/n8n | ❌ |
| **n8n / Make integration** | ❌ | ✅ n8n on API page | ✅ Make | ❌ | ❌ | ✅ both | ❌ |
| **ChatGPT plugin / Custom GPT** | ⚠️ via MCP | ❌ | ✅ Pictory GPT | ❌ | ❌ | ❌ | ❌ |
| **Chrome / browser extension** | ❌ | ❌ | ✅ for publishing | ❌ | ❌ | ✅ (parent Wayin) | ❌ |
| **Brand kit / Brand Studio** | ✅ Business+ | ✅ Pro tier | ✅ all paid | ✅ v0.5 | ⚠️ | ❌ | ✅ logos+colors |
| **Whitelabel / iframe embedding** | ❌ | ✅ Enterprise | ❌ | ❌ | ❌ | ❌ | ✅ Enterprise |
| **Affiliate program** | ❌ | ⚠️ unknown | ⚠️ | ✅ 25% lifetime | ❌ | ❌ | ❌ |
| **Real-time collaborative editing** | ✅ | ❌ | ✅ | ❌ | ✅ "cloud collab" | ❌ | ❌ |
| **Roles & permissions** | ⚠️ Enterprise | ✅ editor/manager/stakeholder | ✅ | ⚠️ Agency | ⚠️ | ❌ | ❌ |
| **Comments on transcript / project** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ markings |
| **Free tier (forever)** | ✅ 1 hr/mo | ✅ 1 hr/mo | ❌ 3-project trial | ✅ 30/50 min | ✅ | ✅ via parent | ✅ first video |
| **SOC 2 (Type II)** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **ISO 27001** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **GDPR / CCPA** | ✅ both | ⚠️ implied | ⚠️ implied | ✅ both | ⚠️ supplements | ❌ | ❌ |
| **HIPAA** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **SSO (Enterprise)** | ✅ | ✅ Enterprise | ✅ Enterprise | ❌ | ❌ | ❌ | ❌ |
| **SAML / SCIM** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **256-bit AES at rest** | ✅ | ⚠️ vague | ⚠️ | ✅ stated | ⚠️ | ❌ | ❌ |

---

## 1. Choppity (choppity.com)

### Identity
- **Tagline:** "Turn podcasts and long-form videos into 30+ short viral clips with AI"
- **Company:** Mizko Media Pty Ltd, **100% bootstrapped** (no VC) — UK + US data residency
- **Founder:** Michael Wong (215K YouTube subs, 400K cross-platform)
- **Scale claims:** 100,000+ users, 800K+ clips, 200K+ hours saved
- **Customers cited:** AutoTrader, SmartLead.ai, EfficientApp, AwesomeCast

### Core feature set
- **AI Short-Clip Generator** — auto-creates 20–50+ short clips per long video with semantic moment detection (emotional cues, hooks, humor)
- **ClipAnything** — keyword/phrase search → jump → 1-click clip with **Magic Reframe™** auto-framing
- **Relevancy scoring %** on every clip
- **AI Animated Captions** — claimed 97% accuracy, 97 languages, Hormozi-style preset, keyword highlighting
- **Auto-Reframing** — 9:16 / 1:1 / 16:9, multi-speaker split-screen for panels
- **Active speaker tracking** — face/gesture/body
- **Profanity Censoring** — three modes (classic bleep / silent mute / volume-reduced) + caption masking with symbols/asterisks/underscores **[NOT in Descript]**
- **Transcript-based editing** with B-roll/image/emoji insertion at transcript position
- **Brand Templates** — custom fonts (upload), colors, logos, caption style
- **Screen Recorder** (launched Jan 2026): screen + webcam + audio, **AI speech-triggered auto-zoom**, auto-portrait-reframe **[zoom is NOT in Descript]**
- **Content Planner (Kanban + table/list)** for ideas/drafts/approvals, rich notes per card, platform-specific previews **[NOT in Descript]**
- **Content Calendar** — date/platform/status/campaign view **[NOT in Descript]**
- **Social Scheduler** — direct publish/schedule to YouTube, TikTok, Instagram, Facebook, X, LinkedIn **[Descript has integrations but no native scheduler/calendar]**
- **Public API** at `api2.choppity.com/v1` with **webhooks** (asset.creation.succeeded, asset.analysis.succeeded, project.render.succeeded, post.published, etc.)
- **n8n flows** referenced on API page
- **Whitelabel + iframe embedding** (Enterprise)
- **No** TTS, voice clone, dubbing, generative video, AI avatars, stock library, mobile app, SOC 2, SCIM

### Pricing
| Plan | Monthly | Annual | Seats | Upload/mo | Storage | Templates |
|---|---|---|---|---|---|---|
| Free | $0 | $0 | 1 | 1 hr | 2 GB | 1 |
| Starter | $15 | $7.50 | 1 | 3 hrs | 40 GB | 1 |
| Pro | $28 | $14 | 2 | 5 hrs | 100 GB | 4 |
| Enterprise | Custom | Custom | ∞ | ∞ | ∞ | ∞ |

### What Choppity has that Descript doesn't
1. **Profanity censoring with caption masking** (3 modes)
2. **Built-in social-media post scheduler** to 6 platforms
3. **Content Planner (Kanban ideas board)**
4. **Content Calendar**
5. **AI speech-triggered auto-zoom for screen recordings**
6. **Webhook system** (asset/render/post lifecycle events)
7. **Relevancy %** scoring on every clip
8. **97-language caption generation** (vs 25 for Descript ASR)
9. **Roles for stakeholders** (editor/manager/stakeholder)
10. **Public **iframe** embedding & whitelabel** at Enterprise
11. **Affiliate-friendly bootstrapped narrative + lower entry price** ($7.50/mo)

---

## 2. Pictory (pictory.ai)

### Identity
- **Tagline:** "Generate Videos in Minutes from Text"
- **Company:** Pictory Corp (US-based, US hosting)
- **Scale claims:** Trusted by 20,000+ companies, 23.4K customers, 500+ 5-star reviews, 4.7/5 Capterra
- **Customer logos:** Pearson, Kajabi, Coursera, Royal Canin, D2L (Brightspace), Colibri Group
- **Tech partners:** Google, Amazon, Microsoft, OpenAI, ElevenLabs, Getty Images, StoryBlocks, Melodie, Zapier, Make

### Core feature set
- **7 input modalities** → video:
  - **Text-to-Video** (ReelFast tech)
  - **URL-to-Video** (blog/webpage scrape — HTML only, no PDF/Word/Docs) **[NOT in Descript]**
  - **Script-to-Video**
  - **Blog-to-Video** **[NOT in Descript]**
  - **Audio-to-Video** (podcast → visualized) **[NOT in Descript]**
  - **PPT-to-Video** **[Descript has slides→video but PPT upload is distinct]**
  - **Image-to-Video**
- **AI Studio** — embedded generative panel for text-to-image + text-to-video clip generation
- **AI Script Generator** + **AI Ad-Script Generator** (set platform / tone / goal / length) **[Descript has generic script gen, not ad-specific]**
- **AI Avatars** as digital presenters in scenes (Professional+)
- **AI Voices via ElevenLabs** — 29 languages, per-plan minute quotas (60/120/240/custom)
- **Standard voices** (Pictory's own) — unlimited on Pro+, 7 languages
- **Voice cloning** (Pro+)
- **Video Highlights / Auto-Summarize** — Zoom/Teams/webinar/podcast → highlight clips
- **Storyboard editor** (visual scene-by-scene)
- **Smart scene detection** — AI auto-breaks video into editable scenes
- **Brand Kit** — 1 (Starter) / 5 (Pro) / 10 (Team) / unlimited (Ent)
- **Stock media library** — 5M (Starter) / 18M (Pro+) from Getty + StoryBlocks; 15K music tracks from Melodie/Melod.ie
- **Smart Screen Recorder** with AI silence + filler-word removal + auto-captions
- **Pictory GPT** — ChatGPT plugin for video creation by chatting in ChatGPT **[NOT in Descript]**
- **Pictory Central** (Enterprise) — interactive video **hosting** platform with: AI-generated chapters, **quizzes / knowledge checks**, **clickable CTAs in-video**, **SCORM export for LMS** **[NONE of this is in Descript]**
- **Personalization at scale** (Enterprise) — videos tailored by role/region/account/individual
- **Zapier + Make** integrations
- **Chrome extension** for publishing workflows

### Pricing
| Plan | Annual | Monthly | Seats | Minutes/mo | Storage | Brand Kits | ElevenLabs voice min/mo | Stock |
|---|---|---|---|---|---|---|---|---|
| Free Trial | $0 | $0 | 1 | 3 projects only | — | — | — | — |
| Starter | $29 | ~$36 | 1 | 200 | 5 GB | 1 | 60 | 5M |
| Professional | $59 | ~$79 | 1 | 600 | 20 GB | 5 | 120 | 18M |
| Team | $199 | ~$249 | 3+ | 1,800 shared | 100 GB | 10 | 240 | 18M |
| Enterprise | Custom | Custom | 10+ | Custom | Custom | ∞ | Custom | 18M |

### What Pictory has that Descript doesn't
1. **URL-to-Video** (scrape any webpage / blog URL → narrated video) **[major]**
2. **Blog-to-Video** workflow as distinct mode
3. **Audio-to-Video** (podcast audio → AI-generated visuals on top)
4. **PPT-to-Video** (upload deck → narrated video)
5. **AI Ad-Script Generator** (goal/length/tone-specific)
6. **Pictory GPT** — installable ChatGPT plugin
7. **Pictory Central** interactive video hosting:
   - **AI-generated in-video chapters with knowledge checks/quizzes**
   - **Clickable CTAs in-video**
   - **SCORM export** for LMS
8. **Personalization at scale** — same video, different variants per role/region/account
9. **ISO 27001 certification** (Descript only has SOC 2)
10. **Zapier + Make** as first-class integrations
11. **Chrome extension**
12. **18M-asset stock library** (Getty + StoryBlocks + 15K Melodie tracks) — Descript has stock but not at this scale, and not from these specific licensors
13. **AI Studio** — embedded generative-AI panel as a UX surface (Descript has the capability, not as a unified named panel)

---

## 3. ScaleReach AI (scalereach.ai)

### Identity
- **Tagline:** "Turn One Video Into 15 Viral Shorts Automatically"
- **Stage:** Very new (v0.1 launched Jan 1, 2026; on v0.5 by Mar 2026)
- **Founder:** Hevin K (single founder); Delaware incorporated; founder@personal support on all paid tiers
- **No customer logos** — uses competitor comparison tables (vs Vizard, vs Opus Clip) as social proof

### Core feature set
- **15 clips per video** (vs Opus Clip 10, Vizard 10)
- **Viral Score 0–100** with explicit driver breakdown: **Hook Strength 40% / Pacing 35% / Engagement 25%** — trained on 10K+ viral clips **[unique granularity]**
- **AI Hook Overlay** — auto first-3-seconds attention text **[NOT in Descript]**
- **AI Thumbnails** — auto-generated per clip, AI picks best frame + adds text overlay, platform-formatted **[NOT in Descript]**
- **AI Reframe** with multi-speaker detect, manual override
- **Captions** — word-level, 100+ languages, **Deepgram-powered**, animations (bounce/pop/fade/karaoke), keyword highlight, SRT/VTT export
- **Custom clip prompts** ("find the funniest parts", "find product feature mentions")
- **Split-screen gameplay backgrounds**: Subway Surfers, Minecraft, GTA 5 + Blur/Mirror/Zoom + gradient presets (Midnight/Ocean/Sunset) **[unique]**
- **Native social scheduler** — TikTok, IG Reels, YouTube Shorts, X, LinkedIn — drip scheduling, visual calendar, multiple accounts per platform
- **MCP server with 15 tools** — works with Claude.ai (browser), Claude Desktop, **Cursor, Kiro, Windsurf** (Descript MCP integrations don't enumerate these IDEs)
- **Public share links** `scalereach.ai/clip/[id]` — embed anywhere, no account, **live view counter**
- **~2 min processing for 1-hour video**
- **AI Video Summarizer** (extract 30–60s key segments)
- **Brand Kit** (logo + colors + fonts auto-apply)
- **25% lifetime affiliate program** with 30-day cookie
- **Team workspaces** (Agency: 10 members, 10 workspaces)
- **Founder personal support** on every paid tier
- **No** TTS, voice clone, dubbing, generative video, avatars, mobile, public API

### Pricing
| Plan | Monthly | Annual | Minutes | Video length | Upload | Quality | Social accts | Workspaces |
|---|---|---|---|---|---|---|---|---|
| Free | $0 | $0 | 50 one-time | 30 min | 2 GB | FHD | 0 | — |
| Starter | $19 | $10 | 200/mo | 2h | 4 GB | 1080p | 1 | 1 |
| Pro | $29 | $12.50 | 400/mo | 3h | 4 GB | 4K | 5 | 3 |
| Agency | $99 | $49 | 5,000/mo | 3h | 4 GB | 4K | ∞ | 10 |
| Enterprise | Custom | Custom | ∞ | Custom | Custom | — | — | — |

### What ScaleReach has that Descript doesn't
1. **AI Hook Overlay** (auto first-3-seconds text)
2. **AI Thumbnail generator** (per-clip, platform-formatted)
3. **Explicit virality scoring with weighted drivers** (Hook 40% / Pacing 35% / Engagement 25%)
4. **Split-screen gameplay/animated backgrounds** (Subway Surfers, Minecraft, GTA 5, blur/mirror/zoom, gradients)
5. **Public share link with live view counter** (Descript shares pages but no public view counter is documented)
6. **Drip scheduling with built-in social calendar**
7. **MCP server with explicit Cursor / Kiro / Windsurf** compatibility
8. **Founder personal support** as a productized perk
9. **25% lifetime affiliate program** (productized)
10. **Multiple social accounts per platform** (e.g., 5 IG accounts on Pro)
11. **Queue priority tiers** ("Standard / High / Highest") for processing time
12. **AI processing time SLA-ish** ("~2 min for 1-hour video")
13. **Verticals-as-landing-pages**: gaming, ASMR, Twitch-to-TikTok, Minecraft, Subway Surfers, sports highlights, news, fitness, etc.

---

## 4. CapCut (capcut.com)

### Identity
- **Tagline:** "AI-Powered Photo & Video Editor for Everyone"
- **Owner:** **ByteDance Pte. Ltd.** (Singapore registered) — TikTok's parent
- **Scale:** **100M+ downloads, 100K+ creators, 4.7 App Store**, 20+ UI languages, 100+ caption languages
- **Business arm:** **Pippit AI** at `capcut.com/business` — "The Simplest Creative Agent" — TikTok ecosystem integration (TikTok, TikTok Shop, TikTok Ads, TikTok Live, CapCut, Seed)
- **Pricing:** **Walled behind login** — no public pricing page accessible (major intel gap)

### Core feature set (the most expansive of the 6)

**Video editing**
- Cut/trim/split/reverse/mirror, multi-track timeline, transitions, filters, text, stickers, SFX, color grading, auto-reframe
- **AI relight** **[NOT in Descript]**
- **AI color correction** (auto-balance exposure & saturation) **[Descript has color tools but not AI-auto-balance as a named feature]**
- **AI style transfer** (3D cartoon, anime, oil painting — via Dreamina Seedance 2.0) **[NOT in Descript]**
- **AI body effects** (face/body morph) **[NOT in Descript]**

**Image editing (CapCut is also a serious image editor)**
- AI background remover, image enhancer/upscaler, batch image resizer
- **AI inpainting** (fill/modify areas) **[NOT in Descript]**
- **AI people remover** **[NOT in Descript]**
- **AI text remover** (remove text from images) **[NOT in Descript]**
- **Face cutout**
- **Chroma key** (pixel-level)
- AI-generated background replacement

**AI generation (the deepest stack of the 6)**
- **Dreamina Seedance 2.0** — text-to-video + image-to-video (cinematic, cartoon-3D, realistic film) — explicitly proprietary
- **Seedream 5.0** — text-to-image, 2K native + 4K upscale
- **Nano Banana Pro** — image gen with **consistent character identity across generations**
- **Text-to-image** with reference images
- **AI Design** — layout gen for social media, covers, marketing materials **[NOT in Descript]**
- **AI brainstorming** — topics, storyboard outlines, content ideas
- **Video Studio AI Agent** — "chat with CapCut's AI editor and it'll build a video from scratch, style, avatar, everything" (agentic, like Underlord)

**AI Avatars (the broadest catalog)**
- **100+ digital avatars; 1000+ digital human categories** (vs Descript 35+)
- **Custom avatar clone from a short video upload**
- **Talking avatar from a single photo** (lip-sync animation) **[Descript Video Regen is similar but for existing footage; talking photo is distinct]**
- **150+ AI voiceovers for avatars**
- Export up to **8K**

**Text & audio**
- **TTS — 200+ AI voices** (gender, age, style, language)
- **Voice clone** in seconds
- **Voice changer** (robot, chipmunk, many effects) **[NOT in Descript]**
- AI voiceover generator
- **Audio translator** — 100+ languages, audio-visual translation
- Auto captions (multi-lang, SRT/VTT export)
- Subtitle translator
- Background noise removal, voice enhancer, extract audio (MP3/WAV)
- Online audio editor, AI writer (script/text gen)

**Templates** — millions, shown with use-count social proof (873K, 934K uses, etc.)

**Automation / Smart features**
- One-click export optimization
- Cloud import (Drive, Dropbox)
- **QR-code mobile-to-desktop file upload** **[NOT in Descript]**
- Batch image scaling, batch character creation, auto-layout

**Niche AI tools** — AI tattoo generator, AI character generator (consistent), AI people remover, AI text remover

### Security caveats (CapCut's biggest enterprise blocker)
- **No SOC 2, ISO 27001, HIPAA, SSO, SAML, SCIM, data residency**
- Privacy policy discloses: face/body feature data **collected from User Content**, auto-caption text used to **train AI**, content **pre-uploaded to servers before user saves** (for AI captioning/recommendations), data **shared with ByteDance corporate group entities globally**, used for personalized advertising, Singapore arbitration, **$50 USD liability cap**

### Platforms
- **Web + Mac + Windows + iOS + Android** — only product in this list with full platform coverage

### What CapCut has that Descript doesn't
1. **AI relight** (lighting correction as AI feature)
2. **AI auto-color correction** (named feature)
3. **AI style transfer** (anime, 3D cartoon, oil painting)
4. **AI body effects** (face / body morph)
5. **AI inpainting** (image / video object fill)
6. **AI people remover** (image / video)
7. **AI text remover** (remove text from image)
8. **AI character generator** with **identity consistency across generations** (Nano Banana Pro)
9. **Talking avatar from a single photo** (animate any face)
10. **Voice changer** (robot, chipmunk, etc.)
11. **AI Design** — layout/poster/cover generation (graphic design, not just video)
12. **AI brainstorming** (topics, storyboard ideas)
13. **AI Studio "Chat-to-video" agent surface** (similar to Underlord but explicitly markets generative-from-scratch)
14. **Image-only editor** as a co-equal surface (full photo editor)
15. **Mobile apps (iOS + Android)** with capture
16. **QR-code mobile-to-desktop upload**
17. **Batch processing** (batch image scale, bulk character gen)
18. **AI tattoo generator + other niche generators**
19. **8K avatar export**
20. **1000+ digital human categories** (vs Descript 35+)
21. **150+ avatar-specific voiceovers**
22. **TikTok Shop / TikTok Ads / TikTok Live integration** (Pippit AI)
23. **Massive template library with use-count social proof**

---

## 5. Wayin Video (wayin.ai/wayinvideo/)

### Identity & access notes
- ⚠️ **wayin.ai pricing/about/tools/api endpoints all returned HTTP 403** — data partially recovered from Wayback Machine; live-product pricing for the WayinVideo app **not publicly accessible**
- **Two products under one brand:** "Wayin AI" Chrome extension (video Q&A/summarization) + "WayinVideo" web app at `v.wayin.ai` (formerly Videohunt.AI)
- **Tagline:** "AI Video Clipper — Turn Long Videos into Share-Ready Shorts"
- **No funding / customer logos disclosed**
- **Quantitative claim:** "100+ languages"

### Core feature set
- **AI Clip Maker** — auto highlight detection + speaker change + pacing
- **AI Video Search / "Find Moments"** — natural-language search inside video ("type a phrase, find the moment") **[Descript has this via Underlord but Wayin makes it a top-level workflow]**
- **AI Video Summarizer** — 1-paragraph + timestamped outline, 100+ langs
- **AI Transcription** (speaker labels, timestamps)
- **AI Caption Generator** (animated, multilingual, platform templates)
- **AI Video Reframe** — face/object tracking, 9:16 / 1:1 / 16:9
- **Subtitle Translation** to **100+ languages** with three display modes: **Translated Only / Original Only / Bilingual (side-by-side)** **[bilingual side-by-side captions are NOT in Descript]**
- **Auto Title / Description / Hashtag** generation per clip
- Paste YouTube link OR upload
- **No** TTS, voice clone, audio dubbing (text translation only), generative video, avatars, recording, timeline editor, collaboration, security certs, mobile

### Public API
- Pay-as-you-go from $10, no expiration
- Endpoints: clipping, transcription, summarization, find moments, animated captions, reframe
- Integrates with **n8n, Make, MCP, OpenClaw, Claude Code**
- Claim: "Generate hundreds of clips from long videos automatically"

### What Wayin has that Descript doesn't
1. **Bilingual subtitle display mode** (original + translated simultaneously, side-by-side) **[unique among all 7]**
2. **Native natural-language video moment search** as a named top-level workflow ("find any moment in video")
3. **Public REST API with pay-as-you-go starting at $10** (no expiration on usage) — extremely accessible developer pricing
4. **Explicit MCP + OpenClaw + Claude Code integrations**
5. **n8n + Make** as first-class integrations
6. **Auto title + description + hashtag** generated together (per clip)
7. **Subtitle translation to 100+ languages** (vs Descript's 61 for captions)
8. **Bulk clip generation via API** ("hundreds of clips from long videos automatically")
9. **Chrome extension** (Wayin AI parent product) for video understanding / Q&A — a different but adjacent integration surface

---

## 6. HipClip AI (hipclip.ai)

### Identity
- **Tagline:** "Promote your videos & podcasts 10x faster"
- **Positioning hook:** "Replace Opus, Descript, Jasper, ChatGPT, CapCut, Captions, & more"
- **App URL:** `studio.hipclip.ai`
- **Mission:** "Building the future of content creation: a human-AI storyteller"
- **Stats:** 3,400+ creators, 2,900+ podcasters
- **Named customer:** @vabankpod (grew 100 → 7,000 subs in 6 months)
- **Team:** Artem, Max, Michael (no surnames)
- **Funding:** Not disclosed

### Core feature set

**Video features**
- AI viral clip detection (engagement-scored)
- **Chat-based AI co-creator** — entire UX is conversational ("tell AI what you want, it creates the clip") **[Descript has Underlord chat but HipClip makes chat the primary interface vs an assist mode]**
- Auto captions (animated, customizable)
- Text-based trimming (delete transcript text → cut video)
- Horizontal-to-vertical conversion (9:16 / 1:1 / 16:9)
- Filler word removal
- Silence removal (with threshold)
- Branding (logos/colors/visual identity)
- Music addition (drag-drop, fades, volume)
- Text overlays
- Transitions & animations library
- AI audio enhancement
- **AI lighting adjustment** **[not in Descript as a named feature]**
- Marking / highlighting transcript segments
- Export MP4

**AI writing / content suite (this is HipClip's depth)** **[mostly NOT in Descript]**
- AI Copywriter (chat-based for posts/blogs/newsletters/emails)
- **Blog post generation** (800–1200 words SEO-optimized)
- **LinkedIn articles** (600–800 words)
- **Email newsletters** (250–350 words with CTAs)
- **Twitter/X threads** (8–10 tweets)
- **Instagram carousel concepts** (8–10 slides with visual direction)
- Quote post extraction (powerful quotes for branded graphics)
- Show notes / podcast summaries
- Metadata extraction (title/desc/tags)
- Translation of written content to any language

**AI intelligence**
- AI transcription with timestamps
- AI summarization
- **Brand Voice & ICP Guidelines** — custom writing guidelines, ICP profiles, tone templates **[NOT in Descript]**
- **AI remembers your workflows** (persistent context/memory across sessions) — claimed unique vs every competitor in their comparison **[NOT in Descript]**
- **90+ pre-made workflow templates** in categories: Ads, Brand Marketing, Social Media, Content Repurposing, Customer Interviews, **Digital Ministry** **[unique vertical]**
- **Autocomplete by Hipclip** (newest launch — details sparse)
- **Free SEO tools** (public): YouTube tag generator, title generator, description generator, transcript converter

**Supported languages:** ~48 explicit variants including regional Englishes (US/AU/IN/NZ/UK), regional Spanishes/Portuguese, simplified/traditional/Cantonese Chinese, Flemish, Hindi Latin

### Integrations
- **Upload:** local, **Google Drive, Zoom, Dropbox, OneDrive, Box** (the broadest cloud-import list of the 6)
- YouTube URL import for transcript
- Output: MP4 → manual upload to TikTok/IG/YT/LI/FB/X (no native scheduler)
- API: Enterprise only, "upon request"
- White-label: Enterprise only

### Pricing
| Plan | Price | Details |
|---|---|---|
| Self-Serve | **$20/mo** flat (with first video free) | full app + AI agent + clip maker + captions + resize + filler removal + branding + AI writing + 90+ workflows + 35+ langs |
| Enterprise/Plus | **From $250/video** | volume-dependent; includes professional content creators + AI tools; award-winning branding agencies on request; white-label/API on request |

### What HipClip has that Descript doesn't
1. **Chat-as-primary-UX** (every action through conversational AI, not as a side panel)
2. **AI Copywriter** — full written-content suite from video:
   - **Blog posts (800–1200 words, SEO-optimized)**
   - **LinkedIn articles (600–800 words)**
   - **Email newsletters (250–350 words with CTAs)**
   - **Twitter/X threads (8–10 tweets)**
   - **Instagram carousel concepts (8–10 slides with visual direction)**
   - **Quote-post extraction** for branded graphics
3. **Brand Voice & ICP Guidelines system** (custom writing guidelines + ICP profiles + tone templates that the AI uses)
4. **"AI remembers your workflows"** — persistent user/context memory across sessions
5. **90+ pre-made workflow templates** across vertical categories (Ads / Brand / Social / Repurpose / Customer Interviews / **Digital Ministry**)
6. **Autocomplete by Hipclip** (newest feature, exact mechanics undisclosed)
7. **Onboarding captures user goals / priorities / roadblocks** to tailor AI behavior
8. **Free public SEO tools** as top-of-funnel (YT tag/title/description gens, transcript converter)
9. **Cloud import from Google Drive + Zoom + Dropbox + OneDrive + Box** (Descript only confirmed Zoom + Drive)
10. **$20/mo flat pricing** positioned as "replace Opus + Descript + Jasper + ChatGPT + CapCut + Captions"
11. **Ministry / church vertical workflows** (sermon repurposing as a first-class workflow category)

---

## 7. Master "What's NEW vs Descript" — Consolidated Feature List

This is the synthesis. **Every item below is a real, validated feature on at least one of the 6 products that does NOT appear in the existing Descript research.** Group by theme. Use as direct input to product spec.

### 7.1 AI clip-creation enhancements
- **Viral score with explicit weighted drivers** (Hook % / Pacing % / Engagement %) trained on a labeled viral corpus — ScaleReach
- **Per-clip "relevancy %"** confidence score visible in UI — Choppity
- **AI Hook Overlay** — auto-generated first-3-second attention text on every clip — ScaleReach
- **AI Thumbnail generator** — picks best frame + adds text overlay, platform-formatted (YT vs IG vs TT) — ScaleReach
- **Bulk-clip generation via API** ("hundreds of clips from long videos automatically") — Wayin
- **Queue priority tiers** ("Standard / High / Highest") productized as a paid perk — ScaleReach
- **AI processing-time SLA-ish claims** ("~2 min for 1-hr video") — ScaleReach
- **Custom-prompted clip extraction** ("find the funniest parts," "find product-feature mentions") — ScaleReach, Wayin, HipClip
- **Speaker insights / topics / memorable phrases / jokes / testimonials / product features** as discrete clip-type filters — ScaleReach

### 7.2 Short-form aesthetic tools
- **Split-screen with gameplay backgrounds** (Subway Surfers, Minecraft, GTA 5) — ScaleReach
- **Blur / Mirror / Zoom backgrounds** — ScaleReach
- **Gradient background presets** (Midnight / Ocean / Sunset) — ScaleReach
- **Hormozi-style caption preset** as a named in-app preset — Choppity
- **Caption animations**: bounce, pop, fade, karaoke — ScaleReach
- **Keyword highlighting in captions** with brand color — ScaleReach, Choppity
- **Drag-to-reposition caption on preview canvas** — ScaleReach

### 7.3 Audio/video repair (CapCut & Choppity additions)
- **AI relight** — lighting correction as a discrete feature — CapCut, HipClip
- **AI auto-color correction** (exposure + saturation balance) — CapCut
- **AI style transfer** (3D cartoon, anime, oil painting) — CapCut
- **AI body effects** (face/body morph) — CapCut
- **AI inpainting** (fill/modify image or video areas) — CapCut
- **AI people remover** from images/video — CapCut
- **AI text remover** from images — CapCut
- **Voice changer** (robot, chipmunk, etc.) — CapCut

### 7.4 Profanity / moderation
- **Profanity censoring** with three modes (classic bleep / silent mute / volume-reduced) **+** caption masking (symbols / asterisks / underscores) — Choppity

### 7.5 Screen-recording differentiation
- **AI speech-triggered auto-zoom** during screen recording (zooms in based on spoken content) — Choppity
- **Auto-portrait reframing** specifically for landscape screen recordings → 9:16 — Choppity
- **AI silence + filler-word removal** during screen recording (real-time post-process) — Pictory
- **Mobile screen capture** (no Descript app) — CapCut

### 7.6 Generative-AI surfaces Descript doesn't have
- **URL-to-Video** (paste blog/page URL → narrated video) — Pictory
- **Blog-to-Video** as a distinct workflow — Pictory
- **Audio-to-Video** (podcast audio → visualized video) — Pictory
- **PPT-to-Video** (PowerPoint upload → narrated video) — Pictory
- **AI Design** — auto-layout for social posts, covers, marketing materials (graphic design, not video) — CapCut
- **AI character generator** with **identity consistency across generations** (Nano Banana Pro) — CapCut
- **AI tattoo generator + other niche generators** — CapCut
- **AI brainstorming** (topics + storyboard outlines + content ideas as a named feature) — CapCut
- **Talking avatar from a single photo** (lip-sync animation on still photo) — CapCut, Pictory
- **AI Studio as a unified named panel** for image+video generation inside the editor — Pictory

### 7.7 Translation / localization enhancements
- **Bilingual subtitle display** (original + translated side-by-side, simultaneous) — Wayin
- **Translated-only / Original-only / Bilingual** as three explicit display modes — Wayin
- **Subtitle translation to 100+ languages** (Descript caption translation is 61) — Wayin, CapCut, Choppity
- **150+ avatar-specific voiceovers** — CapCut
- **TTS catalog of 200+ voices** (Descript 60+) — CapCut

### 7.8 AI writing / content suite (HipClip's strength)
- **Blog post generator** (800–1200 words SEO-optimized) — HipClip
- **LinkedIn article generator** (600–800 words) — HipClip
- **Email newsletter generator** (250–350 words with CTAs) — HipClip
- **Twitter/X thread generator** (8–10 tweets) — HipClip
- **Instagram carousel concept generator** (8–10 slides with visual direction) — HipClip
- **Quote post extractor** (surface powerful quotes for branded social graphics) — HipClip
- **Free public SEO tools** (YT tag gen, title gen, desc gen, transcript converter) as top-of-funnel — HipClip, Choppity
- **Ad-script generator** with goal/platform/length/tone parameters — Pictory
- **Auto title / description / hashtag** generated together per clip — Wayin

### 7.9 Personalization & memory layer
- **AI remembers your workflows** (persistent context/memory across sessions) — HipClip
- **Brand Voice & ICP Guidelines** (custom writing guidelines + ICP profiles + tone templates the AI uses) — HipClip
- **Onboarding captures user goals/priorities/roadblocks** to tailor AI behavior — HipClip
- **Personalization at scale** — same video, different variants per role/region/account/individual (enterprise dynamic-video) — Pictory

### 7.10 Workflow templates depth
- **90+ pre-made workflow templates** across verticals: Ads, Brand Marketing, Social, Repurpose, Customer Interviews, **Digital Ministry** — HipClip

### 7.11 Content operations (planner + calendar + scheduler stack)
- **Content Planner (Kanban + table/list view)** — ideas → drafts → approvals with rich notes and platform-specific previews — Choppity
- **Content Calendar** (date / platform / status / campaign view) — Choppity
- **Native social scheduler with drip scheduling** to TikTok / IG / YT / X / LI / FB — Choppity (6 platforms), ScaleReach (5 platforms)
- **Multiple social accounts per platform** (e.g., 5 IG accounts) — ScaleReach
- **Visual calendar view of scheduled posts** — Choppity, ScaleReach

### 7.12 Distribution / publishing additions
- **Public share URL with live view counter** (no account needed) — ScaleReach
- **Interactive video hosting** (Pictory Central):
  - In-video AI-generated chapters
  - **In-video quizzes / knowledge checks**
  - **Clickable CTAs inside video**
  - **SCORM export to LMS** — Pictory (Enterprise)
- **iframe embedding** + **whitelabel** at Enterprise — Choppity
- **TikTok Shop / TikTok Ads / TikTok Live integration** (Pippit AI) — CapCut

### 7.13 Integrations Descript doesn't list
- **Public REST API with pay-as-you-go from $10** (no expiration on usage) — Wayin
- **Webhooks** (asset.created, asset.analyzed, render.completed, post.published/scheduled/failed) — Choppity
- **n8n / Make as first-class integrations** — Wayin, Pictory
- **Zapier (as first-class)** — Pictory
- **ChatGPT plugin / Pictory GPT** (installable) — Pictory
- **MCP with explicit Cursor / Kiro / Windsurf** support enumerated — ScaleReach
- **OpenClaw + Claude Code** integrations enumerated — Wayin
- **QR-code mobile-to-desktop file upload** — CapCut
- **Cloud import from Drive + Dropbox + OneDrive + Box + Zoom** as a unified list — HipClip
- **Chrome extension for publishing workflows** — Pictory
- **Affiliate program** as productized perk (25% lifetime, 30-day cookie, dashboard, $50 payout min) — ScaleReach

### 7.14 Pricing / monetization patterns Descript doesn't expose
- **Pay-per-video enterprise pricing** ($250+/video) — HipClip
- **Pay-as-you-go API pricing from $10, no expiration** — Wayin
- **Drip/scheduling included at $12.50/mo** (positioned as undercut vs $29 competitors) — ScaleReach
- **No-credit-card free tier** as a hero CTA — Choppity, ScaleReach, CapCut, Wayin
- **First-video-free trial** — HipClip
- **Founder personal support** on all paid tiers — ScaleReach
- **Annual = 50% off monthly** — Choppity
- **Bootstrapped narrative** as a positioning angle — Choppity
- **Replace-the-stack pitch** ("replace Opus + Descript + Jasper + ChatGPT + CapCut + Captions") — HipClip

### 7.15 Platform reach
- **iOS + Android native apps** with camera capture — CapCut (only one in the 6)
- **Mac + Windows desktop apps** — CapCut

### 7.16 Security / compliance Descript could match or exceed
- **ISO 27001** (in addition to SOC 2) — Pictory
- **Specific note: "data hosted in United States"** as residency-style transparency — Pictory
- **Specific note: "UK + US data storage"** in privacy policy — Choppity
- Conversely, every product **lacks HIPAA** — open compliance lane

### 7.17 Verticals / use-case land-grabs Descript doesn't enumerate
- **Gaming** (Twitch-to-TikTok, gameplay highlights, ASMR generator, Subway-Surfer / Minecraft templates) — ScaleReach, CapCut
- **Digital Ministry / Church / Sermon repurposing** — HipClip, Choppity
- **Real estate property videos** — Choppity
- **E-commerce / TikTok Shop product videos** — CapCut (Pippit AI)
- **Sales outreach via short-form** — Choppity, ScaleReach
- **Coaches / Fitness / Lifestyle / Education influencers** as named ICPs — ScaleReach
- **News / media organizations** — ScaleReach
- **B2B marketing agencies (multi-client workflows)** — Choppity, HipClip, ScaleReach

### 7.18 UX patterns to consider
- **Chat as the primary editing interface** (vs side-panel assist) — HipClip
- **"Co-pilot onboarding"** that captures user goals → tailors AI defaults — HipClip
- **Workflow templates as a discoverability layer** (90+ playbooks) — HipClip
- **Free SEO tools as top-of-funnel** (each tool = an indexable landing page) — Choppity, HipClip
- **Vertical-specific landing pages** as a growth surface — ScaleReach, CapCut, Choppity
- **Comparison/alternatives pages with explicit feature tables** — ScaleReach, HipClip, (and Descript)

---

## 8. Where Each Product Overlaps with Descript (Quick Map)

| Product | Strong overlap with Descript | Where Descript clearly wins |
|---|---|---|
| **Choppity** | Text-based editing, screen recorder, AI captions, clipping, brand templates, Zoom import | Underlord agent, voice/avatar/dubbing AI, Rooms (multi-guest record), SOC 2, ISO equiv, Brand Studio depth, timeline editor, 200+ feature surface |
| **Pictory** | Stock library, brand kit, scene editing, transcription, screen recorder | Rooms / multi-guest record, Underlord agent, native social scheduler is absent in both, but Descript has voice clone + dubbing depth + more transcription langs (25 ASR + 61 caption translations) |
| **ScaleReach** | Clipping, captions, reframe, brand kit, text-based editing | Underlord, voice/avatar/dubbing AI, Rooms, timeline, mobile-via-web, security, enterprise, API surface, generative video |
| **CapCut** | Stock, templates, AI background removal, voice clone, TTS, dubbing, generative video/image, AI agent | Text-based editing as primary surface, Rooms, multi-guest record, enterprise security (SOC 2, SSO, SCIM), transparent pricing, transcript-as-editor, podcast-grade audio, brand governance, API + MCP, OpenAI-Startup-Fund-style enterprise narrative |
| **Wayin** | Captions, transcription, reframe, clipping, API+MCP | Almost everything — Wayin is API-first, no editor; Descript wins on full editor, voice/avatar/dubbing, recording, collaboration, security, mobile parity |
| **HipClip** | Text-based editing, AI clipping, brand kit, audio enhancement, transcription | Voice/avatar/TTS/dubbing, Rooms (multi-guest), generative video, timeline, Brand Studio depth, SOC 2, mobile/desktop apps, real-time collaboration, integrations |

---

## 9. Recommended Additions to the Master Build Spec

Drawing from §7, the **highest-signal additions** to consider for a product that wants to be "Descript + everything missing":

**Tier 1 (clear category-table-stakes that Descript doesn't have but the rest of the field does):**
1. Native social scheduler (TikTok, IG Reels, YT Shorts, X, LinkedIn, Facebook) with calendar view + drip scheduling + multi-account
2. Content planner (Kanban board for ideas → drafts → approvals)
3. Public share URL with view counter for unauthenticated viewers
4. Native mobile apps (iOS + Android) with camera capture
5. Bilingual subtitle display (original + translated side-by-side)
6. Webhooks (asset / render / publish lifecycle events)
7. Zapier + Make + n8n as first-class integrations
8. AI Hook Overlay (auto first-3-second attention text)
9. AI Thumbnail generator
10. Explicit Viral Score with weighted drivers

**Tier 2 (strong differentiators if scoped well):**
11. Profanity censor with bleep/mute/mask + caption symbol substitution
12. AI speech-triggered auto-zoom for screen recordings
13. AI relight + AI auto-color
14. AI inpainting / object remove / people remove / text remove
15. AI style transfer (anime, 3D cartoon, oil painting)
16. AI character generator with identity consistency
17. Split-screen with gameplay/animated backgrounds
18. URL-to-video, Blog-to-video, PPT-to-video, Audio-to-video as distinct workflows
19. Talking-avatar-from-a-single-photo
20. AI Copywriter suite (blog / LinkedIn / newsletter / X-thread / IG-carousel / quote-graphic generation)
21. "AI remembers your workflows" persistent memory layer
22. Brand Voice + ICP Guidelines system
23. Onboarding flow that captures user goals → tailors AI defaults
24. 90+ workflow templates by vertical (incl. Ministry, Gaming, Real Estate)
25. Interactive video hosting (in-video chapters / quizzes / CTAs) + SCORM export
26. ISO 27001 (in addition to SOC 2 Type II)
27. HIPAA (open lane — nobody in this list has it)
28. Pay-as-you-go API pricing tier ($10 starter)
29. Affiliate program (25% lifetime)
30. ChatGPT plugin / custom GPT
31. Queue-priority tiers as a paid perk
32. QR-code mobile-to-desktop upload

**Tier 3 (vertical land-grabs):**
33. Gaming clip generator (Twitch-to-TikTok, gameplay templates)
34. Digital Ministry / Sermon repurposing workflows
35. Real estate property video workflows
36. TikTok-Shop-style commerce integration (or its YouTube/IG equivalent)
37. Coach / Fitness / Lifestyle / Education influencer ICPs as landing pages
38. Free SEO tools (YT tag/title/desc generators, transcript converters) as top-of-funnel

---

## 10. Crawl Source Index (verified URLs per product)

- **Choppity:** home, sitemap.xml, pricing, features, AI feature pages, ideas board, calendar, scheduler, API docs (api2.choppity.com/v1 referenced), privacy, terms, changelog (/whats-new), 20+ free tool pages
- **Pictory:** home, pricing, /text-to-video, /url-to-video, /script-to-video, /blog-to-video, /audio-to-video, /ppt-to-video, /image-to-video, /ai-studio, /ai-script-generator, /ad-script-generator, /ai-avatars, /pictory-gpt, /storyboard-editor, /smart-screen-recorder, /pictory-central, Enterprise page (badges visible)
- **ScaleReach:** home, sitemap.xml, pricing, /mcp/, /privacy, /terms, /changelog, /affiliate, ~20 /tools/* pages, /business/podcast, /business/marketing, /gaming-clip-generator, /alternatives/opus-clip, /alternatives/vizard
- **CapCut:** home, sitemap.xml, capcut.com/business (Pippit AI), online video editor pages, AI avatars, AI voice clone, AI text-to-video, voice changer, image gen pages, online editor, privacy policy (full read), various tool pages. **Pricing page: 404 / login-walled.**
- **Wayin:** wayin.ai/ (live), /wayinvideo/ (live), API page (via Wayback), pricing recovered from Wayback Machine April–Sept 2025 snapshots. ⚠️ /pricing/, /about/, /tools/*, /api/ return **HTTP 403** on the live site
- **HipClip:** home, /pricing, /supported-languages, /workflow-categories, /post/* (blog), /privacy, free SEO tool pages (YT tag/title/desc/transcript), workflow comparison pages

---

*End of document.*
