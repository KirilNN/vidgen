# Execution Plan — From Specs to Shipped Product

> **What this is.** The operating plan for turning `product-roadmap.md` + `product-specifications/` into a real product in market. Written for the founder/CEO + founding team.
>
> **Companion to:** `product-roadmap.md` (the what), `product-specifications/` (the how-detailed), and the three research docs (the why).
>
> **Time horizon:** first 6 months (founding through public beta). Beyond that, the roadmap's R2–R5 cadence takes over.

---

## 0. North Star

Six months from kickoff, we have:
- A public-beta product covering Release 1 (Foundation) — text-based editor, AI co-pilot, clip generator, capture, share + embed.
- 5–10 named design partners using it weekly.
- 50,000 weekly free users; 5,000 paid Creator subscribers.
- A seed round closed ($3–5M).
- A team of 8–12 humans.

If we miss any of those, we don't move to R2 — we fix R1.

---

## 1. Phase 0 — Validate Before Build (Weeks 1–4)

### Objectives
- Confirm the 12 R1 features are actually what users want (not what we assumed).
- Tighten the wedge — which 3 features earn the signup.
- Secure 3–5 design-partner LOIs.

### Workstreams

**1.1 Customer discovery (20 interviews)**
- 4 interviews per persona × 6 personas = 24, target 20 completed.
- Structure: pain → current stack → workarounds → what would they switch for → willingness to pay.
- No selling. Record + transcribe. Tag against feature IDs.
- Owner: Founder.

**1.2 Buy-side validation (5 enterprise calls)**
- Target CIOs, CMOs, L&D heads.
- Pressure-test: SOC 2 / HIPAA / SCORM / personalization-at-scale premium.
- Validate Trust & Compliance pillar's market value.
- Owner: Founder.

**1.3 Clickable prototype (Figma)**
- Build R1 happy paths only: record → edit transcript → AI clip → share.
- Walk 10 users through; measure intent ("would you pay $X for this?").
- Owner: Designer (contractor if no full-time yet).

**1.4 Wedge selection**
- From interviews + prototype tests, pick the **3 features** that earn signups.
- Likely candidates: text-based editor (F2.1) + AI clip generator (F6.6) + native scheduler (F7.7). To be validated.
- Everything else in R1 supports these three.

**1.5 Design-partner LOIs**
- From the 20 interviews, identify the most engaged 10.
- Sign 3–5 to a 6-month design-partner agreement (early access, monthly feedback, case-study rights).
- Owner: Founder.

### Phase 0 exit criteria
- [ ] 20 interviews complete, transcribed, tagged.
- [ ] 3 R1 features confirmed as the wedge.
- [ ] 5 design partners signed.
- [ ] Re-prioritized R1 backlog (likely smaller than original spec).

---

## 2. Founding Team Shape (Hire weeks 2–16)

### Day 1 (or hire week 1)
| Role | Why first | Profile |
|---|---|---|
| **Founder / CEO** | The vision + capital + GTM | Probably you |
| **Founding Engineer / CTO** | Owns the architecture decisions specs explicitly didn't make | Senior, multi-stack, ships fast, opinionated |

### By month 2
| Role | Why | Profile |
|---|---|---|
| **Product Engineer #1 (frontend-leaning)** | Owns editor UX | Strong React; cares about UX; has shipped consumer-quality interfaces |
| **Product Engineer #2 (backend-leaning)** | Owns media + AI orchestration | Strong systems; has done video/audio pipelines or is willing to learn fast |
| **Designer** | Brand + product | Could be 0.5 FTE contractor first; full-time by month 3 |

### By month 4
| Role | Why | Profile |
|---|---|---|
| **AI/ML Engineer** | Owns model integration, prompts, evals | Has shipped LLM products; comfortable with multi-model orchestration |
| **Growth / DevRel** | Owns waitlist → signup → activation | Strong writer; community presence; has done early-stage growth |

### By month 6
| Role | Why | Profile |
|---|---|---|
| **PM / Operator** | You can stop being PM | Strong PM with shipped consumer or creator products |
| **Engineer #5** | Capacity for R2 | Generalist or specialist depending on weakest pod |

**Team at month 6: 8–10 humans.**

### Org structure: 3 pods at launch

| Pod | Owns | People |
|---|---|---|
| **Editor Core** | Capture + Edit + Enhance | 1 frontend eng + 1 backend eng + 0.5 designer |
| **AI Surface** | Co-pilot, clip gen, repurpose | 1 engineer + AI/ML eng + 0.5 designer |
| **Loop Close** | Share + embed + scheduler + planner | 1 engineer + growth (later) |

The PM / Founder is connective tissue between pods. AI/ML engineer floats.

---

## 3. Build-vs-Buy Decisions (Decide week 1)

| Capability | Decision | Vendor candidates | Notes |
|---|---|---|---|
| ASR | Buy | ElevenLabs Scribe v2, Rev, Deepgram, AssemblyAI | Multi-vendor router; evaluate quarterly |
| TTS / voice clone | Buy → hybrid | ElevenLabs, Cartesia, PlayHT | Build proprietary later for moat |
| Generative video | Buy | Veo (via Google), Pixverse, Hailuo, Seedance, Runway | Multi-model router behind one abstraction |
| Image gen | Buy | OpenAI, Flux, Ideogram | |
| LLM / agent | Buy | Anthropic + OpenAI + Google (multi-provider from day 1) | |
| Translation (text) | Buy | DeepL, GPT, Google | |
| Dubbing (audio) | Buy | ElevenLabs Dubbing, HeyGen, partner | |
| Cloud infra | Buy (one) | AWS or GCP — pick one, not both | |
| Object storage | Buy | S3 / GCS | |
| Real-time collab | Buy → wrap | Liveblocks / Yjs | |
| Live OAuth (social platforms) | Buy | Ayrshare or direct platform APIs | Evaluate buy-vs-build at month 3 |
| **Editor UI surface** | **Build** | — | Your moat |
| **Render pipeline** | **Build** | — | Your competitive differentiator |
| **AI orchestration / agent** | **Build (thin)** | Use foundation models, but the agent layer is yours | |
| **Brand kit / templates** | **Build** | — | |

**Heuristic:** buy anything that doesn't differentiate; build what's load-bearing.

**Action:** by end of week 1, founding engineer publishes a 1-page "stack decisions" doc covering these. Revisit quarterly.

---

## 4. R1 Build Plan (Weeks 6–24)

### Scope (R1 from roadmap)
- F1.1 Recorder, F1.7 cloud import (basic Drive/Zoom/YouTube)
- F2.1 transcript editor, F2.2 timeline, F2.3 scenes, F2.4 transcription, F2.5 captions, F2.6 Co-pilot, F2.7 templates
- F4.1 Studio Sound, F4.2 cleanup passes
- F6.6 clip generator (with viral score), F6.7 hook + thumbnail
- F7.1 share URL + view counter, F7.2 auto-updating embed
- F8.1 Brand Kit lite

### Milestone calendar

| Week | Milestone | Owner |
|---|---|---|
| 1 | Stack decisions published; repo bootstrapped; CI/CD live | CTO |
| 2 | Design system shipped (10 components); auth + workspace shells | Pod A + Designer |
| 3 | Transcription pipeline working end-to-end (upload → transcript) | Pod A |
| 4 | Text-based editor v0 — can delete words, cut media | Pod A |
| 5 | Timeline editor v0 — drag clips | Pod A |
| 6 | Co-pilot v0 — chat + 5 actions (cut, caption, clip, share, brand) | Pod B |
| 7 | Recorder v0 — screen + cam + mic, basic crash recovery | Pod C |
| 8 | **Internal dogfood begins** — team uses product daily | All |
| 9 | Studio Sound integrated | Pod A |
| 10 | Cleanup passes (fillers, gaps, clarity, retakes) | Pod A |
| 11 | Clip generator with viral score | Pod B |
| 12 | Hook overlay + thumbnail generator | Pod B |
| 13 | Captions with animated presets | Pod A |
| 14 | Scenes / storyboard canvas | Pod A |
| 15 | Public share URL + view counter | Pod C |
| 16 | Auto-updating embed | Pod C |
| 17 | Brand kit lite | Pod C |
| 18 | AI templates gallery (50+ templates) | Pod B |
| 19 | **Design partner private beta starts** | All |
| 20 | Feedback loop sprint #1 | All |
| 21 | Feedback loop sprint #2 | All |
| 22 | Feedback loop sprint #3 + stability hardening | All |
| 23 | Public-beta readiness review (acceptance criteria check) | All |
| 24 | **Public beta launch** | All |

### Quality gates
- **End of each week:** Friday demo. Anything not demoable is blocked, not delayed.
- **End of every feature:** acceptance criteria from spec verified + sentiment guardrails verified.
- **End of week 18:** all R1 features feature-complete; weeks 19–24 are stability + partner feedback only.

---

## 5. Parallel Motions (Start Week 1, Ongoing)

### 5.1 GTM foundations
- Week 1: domain, brand identity sprint, landing page with waitlist.
- Week 4: start building-in-public on X / LinkedIn / personal channels.
- Week 8: first content piece (founder essay on "what's wrong with AI video tools").
- Week 12: first long-tail SEO tool page live (e.g., free hashtag generator).
- Week 16: launch a creator newsletter or podcast tour for distribution leverage.
- Week 20: warm up Product Hunt + Hacker News audiences.
- Week 24: launch day.

### 5.2 SEO long-tail pages
- These are real acquisition surface (Descript has 200+; we should plan 30–50 by launch).
- Each is also a real working tool (audio-to-text, hashtag generator, AI thumbnail, AI hook).
- Ship them as part of R1 — Pod C owns alongside loop-close work after week 16.

### 5.3 Design partners (5–10)
- Recruit in Phase 0 (already in §1.5).
- Onboard week 19; weekly office hours; private Slack with team.
- Each commits to: weekly feedback call; case study rights; 6-month minimum.

### 5.4 Fundraise
- Week 4: convert research + roadmap to a v1 seed deck.
- Week 6: 5 friendlies-only meetings for feedback.
- Week 8: deck v2; start outreach to 30 target funds.
- Week 12: targeted close in 4–6 weeks.
- **Round size:** $3–5M for 18-month runway.
- **Valuation:** $15–30M post (range; depends on traction at time of raise).

### 5.5 Compliance prep
- Month 3: engage Vanta / Drata; start SOC 2 controls implementation.
- Month 6: first internal audit dry-run.
- Month 12: SOC 2 Type I; Month 18: Type II attestation (in time for R3 enterprise push).

### 5.6 Evals harness (AI quality discipline)
- AI/ML engineer's first deliverable: an evaluation harness covering: ASR accuracy, TTS naturalness (blind tests), clip selection quality, Copywriter output quality, viral score correlation.
- Run benchmarks monthly. Compare against Opus Clip, Vizard, Descript, CapCut. **Publish internally; visible to whole team.**

---

## 6. Customer-Discovery Interview Script (use in Phase 0)

> Each interview ~30 min. Record + transcribe. No selling. Tag answers against feature IDs in `product-specifications/`.

### Warm-up (3 min)
- "Tell me about your role and what you make."
- "Walk me through your last video project, start to finish."

### Pain & current stack (10 min)
- "What tools did you use? Why those?"
- "What did you hate about the process?"
- "What did you have to do manually that you wished was automated?"
- "What did you have to do in multiple tools that you wished was in one?"
- "When was the last time you abandoned a video project? What killed it?"

### Magic-wand (5 min)
- "If you had a magic wand, what would you change?"
- "If I gave you a tool that did X, would you switch tomorrow? Why or why not?"

### Willingness to pay (5 min)
- "What do you currently pay for video tools per month, across all of them?"
- "What would have to be true for you to pay $20/mo? $50/mo? $200/mo?"
- "What's a feature you'd pay extra for, on top of a base plan?"

### Wrap (3 min)
- "Who else should I talk to?"
- "Would you be open to trying an early version?"
- "Anything I should have asked but didn't?"

### Post-interview
- Within 24h: 1-page notes + tags against feature IDs.
- Update a running pattern board: which features came up most, which pain points repeated.

---

## 7. Risk Register

| # | Risk | Mitigation | Owner |
|---|---|---|---|
| R1 | Render reliability fails at scale | Senior infra lead from day 1; reliability is a featured concern in every sprint review | CTO |
| R2 | AI quality plateau (Choppity-tier not Opus-tier) | Evals harness from week 1; monthly benchmarks; willing to swap vendors quickly | AI/ML eng |
| R3 | Over-capitalization before distribution proven | Raise 18-month runway max; defer Series A until R2 metrics hit | Founder |
| R4 | Scope creep — building all 86 features | Discipline on R1 scope; nothing from R2 ships until R1 success metrics hit | PM / Founder |
| R5 | Incumbent response (Descript, Adobe, ByteDance) | Compete on trust + speed + design — not feature checklist | Founder |
| R6 | Founding engineer mismatch | Strong reference checks; 30-day mutual evaluation; clarity on equity vesting | Founder |
| R7 | Compliance not ready for R3 enterprise push | Start SOC 2 month 3; don't delay | CTO |
| R8 | Mobile parity slips past R4 | Treat as a hard R4 deadline; if at risk, cut scope elsewhere first | PM |
| R9 | Render-pipeline cost outpaces revenue | Per-feature unit-cost tracking from day 1; price overages with margin | Finance/Founder |
| R10 | Voice clone / avatar abuse | Identity verification + watermarking + audit log + clear policy ship with feature | Trust & Safety lead |

Review the register monthly. Add new risks as they emerge.

---

## 8. Operating Rhythms

| Cadence | Meeting | Purpose | Attendees |
|---|---|---|---|
| Daily | Pod standup (15 min) | Unblock | Pod members |
| Weekly | Demo Friday (45 min) | What shipped | Whole team |
| Weekly | User-research review (30 min) | What we learned | PM + founders + 1 from each pod |
| Bi-weekly | Cross-pod sync (45 min) | Dependencies, decisions | Pod leads + PM |
| Monthly | Metrics review (60 min) | Numbers vs goals | Whole team |
| Monthly | Eval benchmarks review | AI quality | AI/ML + whoever cares |
| Monthly | Risk register review | New risks, mitigations | Founders + PM + CTO |
| Quarterly | Strategy off-site (full day) | Roadmap, hiring, fundraise | Founders + leads |
| Quarterly | Customer advisory board call | Design partner feedback | Founders + design partners |

---

## 9. Decision Log

Maintain `decisions.md` (lightweight ADR). Every meaningful decision recorded:
- Date
- Context
- Decision
- Alternatives considered
- Owner
- Revisit-by date

Examples for week 1:
- "Choose AWS over GCP" — owner: CTO; revisit at 1000 users.
- "Multi-model AI router from day 1 (not single vendor lock-in)" — owner: AI/ML; revisit quarterly.
- "MVP scope: 12 R1 features, not all of R1's stretch list" — owner: PM; revisit after Phase 0 interviews.

---

## 10. Success Metrics (Month 6 Go/No-Go)

From `product-roadmap.md` §20 R1:
- [ ] 50,000 weekly active free users
- [ ] 5,000 paid Creator subscribers
- [ ] 99.5% render success rate on jobs ≤2 hours
- [ ] NPS ≥40
- [ ] No top recurring "buggy / crashes" sentiment in month 6 Reddit scan

**If we hit ≥4 of 5:** commit to R2 Creator Depth.
**If we hit ≤3 of 5:** stop new feature development; fix R1 until metrics hit. This is the most important discipline in the playbook.

---

## 11. What to Do This Week

If today is week 1, day 1:

| Day | Action |
|---|---|
| Monday | Book 10 user interviews for the next 2 weeks. Sign up for Calendly. |
| Monday | Buy the domain. Set up email. Create the company Linear. |
| Tuesday | Confirm founding engineer's start date. If not yet found: sourcing sprint. |
| Tuesday | Draft seed deck v0 outline. |
| Wednesday | Brand sprint — pick name, color, type. (Half day, no overthinking.) |
| Wednesday | Land the first 2 interviews. |
| Thursday | Start building Figma R1 prototype. |
| Thursday | Publish the "stack decisions" doc (CTO). |
| Friday | First public building-in-public post (X/LinkedIn). |
| Friday | Demo Friday #1 — even with nothing yet, set the ritual. |
| Weekend | Recover. Build for the long haul. |

---

## 12. Sources of Truth

| Doc | Purpose | Updated by |
|---|---|---|
| `descript-competitor-research.md` | Descript baseline | Frozen; refresh quarterly |
| `competitors-vs-descript.md` | Competitor breadth | Frozen; refresh quarterly |
| `reddit-sentiment-scan.md` | User pain & praise | Refresh quarterly |
| `product-roadmap.md` | Vision + sequencing | PM, monthly |
| `product-specifications/` | Per-feature specs | PM + pods, per release |
| `execution-plan.md` (this file) | How we operate | Founders + PM, monthly |
| `decisions.md` (to create) | ADR log | Whoever decides |

---

*End of execution plan.*
