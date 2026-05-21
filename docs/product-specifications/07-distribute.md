# Pillar 7 — Distribute (detailed specifications)

> **Pillar question:** "How do I publish, share, schedule, embed, host the video?"
> **Release coverage:** R1 (F7.1, F7.2), R2 (F7.7), R4 (F7.3, F7.4, F7.5, F7.6)

---

## F7.1 — Public Share URL with View Counter

**Release:** R1
**Summary:** Every project has a public web page with the video player, captions, chapters, and a live view counter — no signup needed for viewers.

### Problem statement
ScaleReach productized the counter; users love public proof of distribution. Descript has share pages but no counter visibility.

### Primary personas
All personas.

### User stories
- As a creator I want to share a link that anyone can watch without an account.
- As a marketer I want to see how many people watched.
- As a sales rep I want to know my prospect viewed the personalized video.
- As any user I want the URL to be clean and short.

### Functional requirements
1. **Auto-generated public URL:** every project gets a shareable URL (`/share/<slug>`).
2. **Custom slug option:** Team+ tier can set custom slug (`/share/q4-launch`).
3. **Public player:** clean player with captions, chapters, transcript, language toggle.
4. **View counter (live):** visible on the page; counts unique views (configurable: total / unique).
5. **Access controls:**
   - Public (default).
   - Password-protected.
   - Email-gated (viewer enters email to watch).
   - Domain-restricted (only @company.com).
6. **Watermark control:** optional brand watermark in corner.
7. **Branding:** Brand Kit logo/color applied; Custom domain on Business+ (`videos.company.com`).
8. **Analytics:** view count, geo distribution, watch time, drop-off curve, device breakdown.
9. **Embed snippet:** copy embed code to put in other websites.
10. **Social meta tags:** auto-generated OpenGraph image (thumbnail), title, description for nice link previews.
11. **Disable / revoke:** instant kill switch; URL returns "Video unavailable" message.

### UX flow
1. Editor → Share → URL ready.
2. Copy URL → paste anywhere.
3. View counter and basic analytics on the share's settings panel.

### Edge cases & error handling
- **Project deleted:** URL returns 404 with branded page.
- **Password reset:** old password invalid immediately.

### Sentiment guardrails
- **P12:** uptime SLA on public share infrastructure.
- **P8:** access controls audit-logged.

### Acceptance criteria
- Share page loads in <2s globally.
- View counter accurate within 1 minute lag.
- Embeds work on every major platform (Notion, Slack, LinkedIn, blogs).

### Dependencies
- F8.1 (Brand Kit).

### Metrics
- Shares created per workspace.
- Average views per share.

---

## F7.2 — Auto-Updating Embed Link

**Release:** R1
**Summary:** When the user edits a video, the embedded version updates everywhere it's been embedded — same URL, new content.

### Problem statement
Descript-loved feature; critical for marketing teams shipping iterative video (e.g., product update videos).

### Primary personas
In-house Marketer, L&D Lead, Sales Founder.

### User stories
- As a marketer I want to embed a product video in our docs and have it auto-update when we edit it.
- As an L&D lead I want course videos to update across all embedded locations when content changes.

### Functional requirements
1. **Persistent URL across edits:** the same URL serves the latest version of the project.
2. **Edit-then-publish workflow:** the user can edit privately; clicking "Publish" updates the live embed.
3. **Version history:** keep all past published versions; user can roll back.
4. **Notification on update:** optional — notify embed locations or send a webhook.

### UX flow
1. Edit project → "Update published version" button.
2. Live embed updates within seconds; viewers see new content on next play.
3. Past versions accessible from version history.

### Sentiment guardrails
- **P6:** rollback always available.

### Acceptance criteria
- Published update propagates globally in ≤30 seconds.
- Version history retained for ≥1 year.

### Dependencies
- F7.1.

### Metrics
- Edits-then-republish per share.

---

## F7.3 — Interactive Video Hosting

**Release:** R4
**Summary:** A hosted video player supporting AI-generated in-video chapters, knowledge checks/quizzes at chapter boundaries, clickable CTAs, view analytics, and re-watch heatmaps.

### Problem statement
Pictory Central is the model. L&D, sales enablement, course creators need this. None of Descript's competitors except Pictory have it.

### Primary personas
L&D Lead, In-house Marketer, B2B Sales Founder.

### User stories
- As an L&D lead I want a video with chapters and quizzes that tracks learner progress.
- As a marketer I want clickable CTAs inside my video ("Book a demo" overlay).
- As a sales rep I want to see exactly where my prospect dropped off.
- As a creator I want a heatmap showing what people re-watched.

### Functional requirements
1. **Chapter generation:**
   - AI auto-creates chapters from transcript.
   - User can edit / add / remove chapters.
   - Chapter UI in player (clickable, scrubbable).
2. **Knowledge checks (quizzes):**
   - Multiple-choice or open-ended at any chapter boundary.
   - AI suggests questions from chapter content.
   - User edits / writes own.
   - Pass / fail logic; required vs optional.
   - Score tracking.
3. **Clickable CTAs:**
   - Time-bounded overlays (e.g., "Book a demo" appears at 1:00, dismisses at 1:30).
   - Multiple per video.
   - Style customizable (button / banner / corner badge).
   - URL or in-product action.
4. **View analytics:**
   - Watch time per viewer.
   - Drop-off curve.
   - CTA click-through rate.
   - Quiz scores aggregate.
5. **Heatmaps:**
   - Aggregate re-watch heatmap (what 100 viewers watched most).
   - Per-viewer playback timeline (Sales tier — for sales reps to see prospect behavior).
6. **Lead capture:** quiz answers + CTA clicks captured to CRM integrations.

### UX flow
1. Editor → Hosting → enable Interactive features.
2. Add chapters / quizzes / CTAs.
3. Publish.
4. View analytics dashboard.

### Sentiment guardrails
- **P8:** viewer-level tracking only with disclosure.

### Acceptance criteria
- Interactive features render correctly on all major browsers + mobile.
- Analytics accurate within 5 minutes.

### Dependencies
- F7.1.

### Metrics
- % of Team+ projects using interactive features.
- Quiz completion rates.

---

## F7.4 — SCORM Export to LMS

**Release:** R4
**Summary:** Export any project as a SCORM 1.2 / 2004 package importable into corporate LMSes (Brightspace, Cornerstone, Workday Learning, SAP SuccessFactors, Moodle).

### Problem statement
Unlocks the L&D budget category. Pictory enterprise has this; nobody else.

### Primary personas
L&D Lead, Enterprise.

### User stories
- As an L&D lead I want to deliver my video through our SAP SuccessFactors LMS.
- As a corporate trainer I want SCORM packages with embedded quizzes that report to the LMS.

### Functional requirements
1. **SCORM 1.2 + SCORM 2004 + xAPI** output formats.
2. **Bundled content:** video + captions + chapters + quizzes packaged.
3. **LMS reporting:** quiz scores, completion, time spent reported via SCORM protocol.
4. **Tested LMS compatibility:** Brightspace, Cornerstone, Workday Learning, SAP SuccessFactors, Moodle, TalentLMS, Docebo.
5. **Custom branding** preserved.

### UX flow
1. Editor → Export → SCORM → choose version → download package.
2. Admin uploads to LMS; verified.

### Sentiment guardrails
- **P11:** export is one-click; not "talk to sales."

### Acceptance criteria
- Successful import to 5+ major LMSes.
- Reporting accurate per SCORM spec.

### Dependencies
- F7.3.

### Metrics
- SCORM exports per Enterprise workspace.

---

## F7.5 — Personalization at Scale

**Release:** R4
**Summary:** Render the same base video as N variants, where each variant has personalized name/company/role/region/account in the script, on-screen text, and (optionally) the dubbed voiceover.

### Problem statement
Sales outreach + ABM marketing love this. Pictory enterprise has it; massive ASP uplift.

### Primary personas
B2B Sales Founder, In-house Marketer (ABM).

### User stories
- As a sales rep I want to send 500 prospects a "Hi [name], saw [company]..." video without filming 500 times.
- As an ABM marketer I want one base video, 50 account-personalized variants.

### Functional requirements
1. **Base template:** the source video with merge tags (`{{first_name}}`, `{{company}}`, `{{role}}`, etc.).
2. **Data source:** CSV upload, CRM integration (HubSpot, Salesforce, Outreach), Zapier.
3. **Personalized fields:**
   - Script text → re-synthesized voiceover (TTS or voice clone).
   - On-screen text overlays → re-rendered.
   - Background / logo per account.
4. **Batch rendering:** 100s–1000s of variants generated and exported.
5. **Per-variant unique URL** for view tracking per recipient (links to F7.1 + F7.3).
6. **Reporting:** which variants were watched, by whom, how long.
7. **CRM write-back:** view events synced back to CRM.

### UX flow
1. Editor → Personalize → mark merge fields → upload CSV → review preview of 3 variants → Render all.
2. Output: list of URLs per recipient.

### Sentiment guardrails
- **P8:** data handling disclosed; PII never used to train shared models.

### Acceptance criteria
- 1000-variant batch completes in ≤2 hours.
- Per-variant URLs trackable individually.

### Dependencies
- F3.3 / F3.4, F7.1, F7.3, F10 (CRM integrations).

### Out of scope
- A/B testing within personalization (R5+).

### Metrics
- Variants rendered per workspace.
- View-rate per personalized variant.

---

## F7.6 — Iframe Embedding + White-Label Hosting (Enterprise)

**Release:** R4
**Summary:** Embed the player or specific projects in another product with the host's branding instead of ours.

### Problem statement
Enterprise customers want videos in their help center, KB, LMS, etc. with their own branding.

### Primary personas
Enterprise, Agency.

### User stories
- As an Enterprise admin I want our help center videos to look like they're ours, not "powered by [our product]."
- As an agency I want a white-labeled client-review portal.

### Functional requirements
1. **Iframe embed:** standard embed code; sized responsively.
2. **White-label mode (Enterprise):**
   - Custom domain (`videos.company.com`).
   - Custom logo and colors.
   - "Powered by" branding removable.
3. **Custom player skin:** colors, buttons, fonts.
4. **Disable analytics on viewer side** (only owner sees).

### UX flow
1. Share → Embed → copy iframe code OR configure white-label settings (Enterprise).

### Sentiment guardrails
- **P8:** custom domain DNS verification required.

### Acceptance criteria
- Embed works on top 20 web platforms.
- White-label end-to-end with custom domain functional.

### Dependencies
- F7.1.

### Metrics
- Embeds per share.
- White-label adoption among Enterprise.

---

## F7.7 — Native Social Scheduler

**Release:** R2
**Summary:** Schedule and publish directly to TikTok, Instagram (Reels/Feed/Stories), YouTube (Shorts/regular), X, LinkedIn (personal + company), Facebook (personal + pages), Threads. Drip scheduling, visual calendar, multi-account per platform, queue management, optimal-time recommendations.

### Problem statement
Choppity + ScaleReach have it; Descript doesn't. Reddit data: users tolerate weak features but won't tolerate leaving the tool to post.

### Primary personas
All personas; especially Solo Creator, In-house Marketer, Agency.

### User stories
- As a creator I want to schedule 30 days of TikTok posts from 1 long video.
- As an agency I want to manage multiple client IG accounts from one dashboard.
- As a marketer I want optimal-time recommendations per platform.
- As any user I want to see my entire posting calendar in one view.

### Functional requirements
1. **Platforms supported (R2 launch):** TikTok, Instagram (Reels / Feed / Stories), YouTube (Shorts / regular videos), X / Twitter, LinkedIn (personal + company pages), Facebook (personal + pages).
2. **Platforms added later:** Threads (when API available), Pinterest, BlueSky.
3. **Connect accounts:** OAuth per platform; multiple accounts per platform.
4. **Per-post fields:** caption / description / hashtags (auto-suggested), thumbnail (auto or custom), schedule time, audience visibility.
5. **Drip scheduling:** "Post 1 clip per day for 30 days from this upload" → auto-distribute.
6. **Visual calendar:** month / week / day view; drag-to-reschedule.
7. **Multi-account:** 5+ accounts per platform (more on higher tiers).
8. **Optimal time recommendations:** per platform, per audience, AI-suggested with reasoning ("Best times for your audience on TikTok: Tue/Thu 8pm ET").
9. **Per-platform format optimization:** auto-format aspect ratio, captions, hashtag count per platform best practices.
10. **Approval workflow:** posts can require approval (Team+); approver gets notification.
11. **Post status tracking:** Scheduled / Posting / Posted / Failed (with retry).
12. **Failed-post handling:** auto-retry; notify user; show error reason.
13. **Cross-post:** one upload → multi-platform with per-platform copy variations.
14. **Bulk operations:** select many posts → reschedule, pause, delete.

### UX flow
1. From any clip / video → Schedule → pick platform(s) → fill caption (AI-suggested) → pick date/time → Schedule.
2. Calendar view shows all upcoming posts.
3. When time arrives, post goes live automatically; user notified.

### Edge cases & error handling
- **Platform API outage:** queue posts; retry on recovery; notify user.
- **OAuth token expired:** prompt re-auth.
- **Platform-specific rejection (too long, banned hashtag):** clear error.

### Sentiment guardrails
- **P12:** failed posts surface with real reason and "Contact support" path.
- **P11:** scheduler is part of the editor, not a separate tool.

### Acceptance criteria
- All 6 platforms working at R2 launch.
- Successful post rate ≥98% (excluding platform outages).
- Optimal-time recommendations measurably improve engagement (track over time).

### Dependencies
- F6.1, F6.6, F6.7.

### Out of scope
- TikTok Shop integration (R5; commerce-adjacent).

### Metrics
- Posts scheduled per workspace.
- Cross-platform usage.
- Optimal-time adoption.

---

*End of Pillar 7 — Distribute specifications.*
