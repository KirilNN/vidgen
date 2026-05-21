# Pillar 11 — Vertical Workflow Packs — detailed specifications

> **Pillar question:** "Is this product for MY industry?"
> **Release coverage:** R5 (most packs); R3 (Sales async-video as first vertical pilot)

> **Pack structure.** Each vertical pack is a bundle of:
> 1. **Branded templates** (caption styles, scene layouts, intros/outros)
> 2. **Workflow recipes** (from F2.7/F2.8 — pre-built Co-pilot workflows)
> 3. **Co-pilot persona** (Brand Voice + ICP defaults for the vertical)
> 4. **Presets** (caption / cropping / aspect / output defaults)
> 5. **Landing page** at `/for/[vertical]` for SEO and acquisition
> 6. **Onboarding** if user selects the vertical during signup

---

## F11.1 — Digital Ministry / Sermon Repurposing Pack

**Release:** R5
**Summary:** Sermon → multi-week clip series, devotional shorts, social posts, transcript for church website, translated captions for global congregations.

### Problem statement
HipClip + Choppity tap this vertical; nobody owns it.

### Primary personas
Church media leads, pastors, ministry communications teams.

### User stories
- As a church media lead I want to take Sunday's sermon and generate a 5-week social campaign.
- As a pastor I want devotional shorts pulled from key sermon moments with scripture overlays.
- As a global ministry I want translated captions for 10 language congregations.

### Functional requirements
1. **Sermon-specific templates:**
   - "Sermon → 5 weekly shorts" workflow.
   - "Devotional thread from sermon" (X / IG carousel).
   - "Sermon notes for church website" (blog format).
   - "Sermon trailer for upcoming week."
2. **Scripture overlay system:** AI detects scripture references in transcript → auto-overlay scripture text + reference (NIV / ESV / KJV / NASB / configurable).
3. **Sermon series organization:** group sermons by series; cross-link.
4. **Profanity-clean by default** (F4.6).
5. **Branded caption styles:** church-brand-consistent.
6. **Worship-music-friendly audio handling:** preserves music sections during voice cleanup.
7. **Vertical onboarding:** select "Ministry / Church" during signup → pack activated.

### UX flow
1. Pack member uploads sermon → AI runs workflow → series of outputs ready.

### Sentiment guardrails
- **P5:** scripture references must be accurate (manual review prompt for low-confidence).
- **P11:** all features feel native to the vertical.

### Acceptance criteria
- Pack functional with 10+ templates.
- Scripture detection accuracy ≥95% on top translations.

### Dependencies
- F2.7, F4.6, F5.1, F8.1.

### Metrics
- Pack adoption.
- Sermons processed per month per workspace.

---

## F11.2 — Real Estate Pack

**Release:** R5
**Summary:** Listing video → 30-sec walkthrough + social shorts + MLS-formatted exports + school/neighborhood overlay templates.

### Problem statement
Choppity has hints; clear lane.

### Primary personas
Real estate agents, brokerage marketing teams.

### User stories
- As an agent I want a 30-sec social walkthrough from my listing video.
- As a brokerage I want consistent branded listing videos across agents.
- As a marketer I want neighborhood/schools/amenities overlays auto-generated.

### Functional requirements
1. **Templates:**
   - "Listing → 30s social walkthrough."
   - "Property reel with stats overlay."
   - "Open house promo."
   - "Just sold / Just listed" announcements.
2. **Stats overlay system:** integrate with MLS data (where licensing allows) — price, bed/bath, sq ft auto-overlay.
3. **Neighborhood overlays:** AI generates overlays for nearby schools, amenities (with source data attribution).
4. **MLS-formatted export:** correct resolution + aspect for major MLS feeds.
5. **Agent profile integration:** agent headshot / contact info on every video.
6. **Brand kit per brokerage with sub-brands per agent.**

### Acceptance criteria
- Pack functional with 8+ templates.

### Dependencies
- F2.7, F8.1.

### Metrics
- Listings processed.

---

## F11.3 — Gaming Pack

**Release:** R5
**Summary:** Twitch → TikTok clip generator, gameplay highlight detection, Subway Surfers / Minecraft / GTA split-screen backgrounds, ASMR generator, gameplay-specific captions.

### Problem statement
ScaleReach + CapCut have it (split-screen gameplay backgrounds are ScaleReach-unique). Massively underserved at quality.

### Primary personas
Gamers, streamers, Twitch creators.

### User stories
- As a streamer I want my best moments auto-clipped from VODs.
- As a gamer I want Subway Surfers gameplay split-screen for TikTok virality.
- As a creator I want gameplay-specific caption styles.

### Functional requirements
1. **Twitch / YouTube Gaming integration:** import VODs directly.
2. **Highlight detection:** AI detects exciting gameplay moments (kills, wins, reactions, audio peaks).
3. **Gameplay split-screen backgrounds:** library of Subway Surfers, Minecraft parkour, GTA, satisfying cooking videos, etc.
4. **Gaming caption styles:** large, animated, gaming-aesthetic.
5. **ASMR generator:** combine gameplay audio with ambient ASMR layers.
6. **Speedrun timer overlay templates.**
7. **Donation / sub overlay templates.**

### Acceptance criteria
- 10+ gameplay backgrounds.
- Highlight detection ≥70% acceptance on sample.

### Dependencies
- F2.7, F6.6.

### Metrics
- Twitch imports.
- Pack ARPU.

---

## F11.4 — Sales Async-Video Pack

**Release:** R3 (pilot), expanded R5
**Summary:** Personalized loom-style messages with branded share page, view tracking, CTA clicks, integration with Salesforce / HubSpot / Outreach.

### Problem statement
Big lane — competitors do this generically. Sales is where personalization at scale lives.

### Primary personas
B2B Sales reps, SDR / BDR teams, founders.

### User stories
- As a sales rep I want to send personalized videos to prospects and see who watched.
- As a sales leader I want video metrics in our CRM.
- As an SDR I want bulk-personalized videos from a CSV upload.

### Functional requirements
1. **Templates:**
   - "Cold outreach video" (with `{{name}}`, `{{company}}` merge fields).
   - "Follow-up after meeting."
   - "Demo recap."
   - "Pricing walkthrough."
2. **CRM integration:** HubSpot, Salesforce, Outreach, Apollo bi-directional.
3. **View tracking:** per-recipient (linked to F7.5).
4. **CTA buttons:** "Book a demo," "Reply to this video."
5. **Bulk personalization** (F7.5).
6. **Pre-built scripts:** by industry, role, situation.
7. **Brand kit per sales rep within team brand.**

### Acceptance criteria
- CRM bi-sync working with top 3.

### Dependencies
- F7.5, F10.5.

### Metrics
- Per-rep video count.
- Reply / meeting-booked rate.

---

## F11.5 — Course / Education Pack

**Release:** R5
**Summary:** Course lesson template, chapter quizzes, SCORM export, AI knowledge-check generation, student-progress analytics.

### Problem statement
L&D and education buyers want this; SCORM (F7.4) is the unlock.

### Primary personas
Course creators, L&D teams, educators.

### User stories
- As a course creator I want lesson templates with quizzes built in.
- As an L&D lead I want to export to our LMS.
- As an educator I want student-progress analytics.

### Functional requirements
1. **Templates:**
   - "Lecture lesson" (talking head + slides + B-roll).
   - "Tutorial walkthrough" (screen + voiceover).
   - "Module trailer."
2. **AI knowledge checks:** generate quiz questions from lesson content (linked to F7.3).
3. **SCORM export** (F7.4).
4. **Captioning best practices** (high readability defaults).
5. **Module organization:** group lessons into courses; cross-link.

### Acceptance criteria
- Pack works end-to-end with LMS export.

### Dependencies
- F7.3, F7.4.

### Metrics
- Courses produced.
- LMS integrations active.

---

## F11.6 — Newsroom / Media Pack

**Release:** R5
**Summary:** Reporter self-serve template, field-recording cleanup defaults, one-edit-multi-format output, fast-publish to YouTube/Twitter/X with auto-thumbnail + headline copy.

### Problem statement
Descript explicitly serves this (BBC, NYT, NPR, Vox, Reuters as logos); we match.

### Primary personas
Newsrooms, digital media orgs.

### User stories
- As a reporter I want to file a video story from the field quickly.
- As a newsroom editor I want one source video to produce TV, web, social variants.
- As a video editor I want field-recording cleanup defaults so I don't tune every project.

### Functional requirements
1. **Templates:**
   - "News field report."
   - "Studio interview."
   - "Breaking news short."
   - "Documentary segment."
2. **Field-recording cleanup defaults:** aggressive Studio Sound + Edit for Clarity preset.
3. **Multi-format output:** TV (16:9 1080p), web (1080p 16:9 with captions), social (9:16 1:1 with hooks).
4. **Speed-to-publish:** fast-track render queue.
5. **Compliance-friendly:** archive every input source per news ethics standards.

### Acceptance criteria
- Pack functional with newsroom workflow examples.

### Dependencies
- F2.7, F4.1, F4.2, F6.6.

### Metrics
- Newsroom workspaces.

---

## F11.7 — Multi-Client Agency Pack

**Release:** R3 (basic), R5 (full)
**Summary:** Per-client brand kits, white-label client review portals, billing splits, multi-account social scheduling per client. (Functional spec mostly in F8.8.)

### Problem statement
Agencies are high-ARPU underserved. Addressed via F8.8 multi-client workspace.

### Primary personas
Agency.

### User stories
- (See F8.8.)

### Functional additions for the pack
1. **Templates by client industry:** ad-creative templates for D2C / B2B / SaaS / Beauty / Fitness clients.
2. **Per-client co-pilot persona.**
3. **Multi-client dashboard with billing breakdown.**
4. **White-label client review portal:** client reviews and approves without our branding visible.

### Acceptance criteria
- Pack functional + integrated with F8.8.

### Dependencies
- F8.8, F7.6.

### Metrics
- Agencies with multi-client setup.
- Per-agency ARPU.

---

*End of Pillar 11 — Vertical Workflow Packs specifications.*

---

# Final notes (across all pillars)

## Coverage check

| Pillar | Features | File |
|---|---|---|
| 1 | 7 | `01-capture.md` |
| 2 | 8 | `02-edit.md` |
| 3 | 10 | `03-create.md` |
| 4 | 10 | `04-enhance.md` |
| 5 | 5 | `05-translate.md` |
| 6 | 8 | `06-repurpose.md` |
| 7 | 7 | `07-distribute.md` |
| 8 | 9 | `08-operate.md` |
| 9 | 7 | `09-trust-compliance.md` |
| 10 | 8 | `10-api-integrations.md` |
| 11 | 7 | `11-vertical-packs.md` |
| **Total** | **86 features** | **11 files** |

## How to use these specs for engineering

1. **Each pod takes a pillar.** Capture pod, Edit pod, Create pod, etc.
2. **Each feature spec is the input to one or more PRDs.** Designers + engineers translate the spec into wireframes, technical design, tickets.
3. **The Acceptance Criteria in each spec are the gating tests.** A feature ships only when its AC are demonstrably met.
4. **Sentiment Guardrails are non-negotiable.** They translate Reddit pain points into product constraints; do not silently waive them.
5. **Dependencies determine sequencing.** Within and across pillars, the dependencies graph determines what can be built in parallel.
6. **Metrics define post-launch success.** Track per-feature metrics from day 1.

## Linking back

- **Roadmap (vision + sequencing):** `../product-roadmap.md`
- **Source research:**
  - `../descript-competitor-research.md`
  - `../competitors-vs-descript.md`
  - `../reddit-sentiment-scan.md`

When a feature spec mentions a specific competitor behavior, source quote, or sentiment pattern, the source document holds the validation evidence.

---

*End of detailed product specifications.*
