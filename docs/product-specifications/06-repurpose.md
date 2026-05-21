# Pillar 6 — Repurpose (detailed specifications)

> **Pillar question:** "How do I turn one long video into clips, blog, threads, carousels?"
> **Release coverage:** R1 (F6.6 basic clip gen), R2 (F6.1, F6.2, F6.3, F6.4, F6.7), R3 (F6.5 custom models), R3 (F6.8)

---

## F6.1 — AI Copywriter Suite

**Release:** R2
**Summary:** One video in → six written assets out, each fully editable: blog post, LinkedIn article, email newsletter, X thread, Instagram carousel concept, quote graphics. Plus show notes, descriptions, hashtags, chapters.

### Problem statement
HipClip owns this. Reddit explicitly loves it ("replace Jasper + ChatGPT + Captions"). The "publishable-from-first-pass" bar (P5) is what makes or breaks this feature. The universal complaint about Descript/Choppity/Pictory auto-copy is "generic and needs an hour of editing."

### Primary personas
Solo Creator, In-house Marketer, B2B Sales Founder, Agency.

### User stories
- As a podcaster I want my episode automatically transformed into an SEO blog post, X thread, IG carousel, and LinkedIn article.
- As a marketer I want our customer interview turned into a quote graphic + email newsletter + LinkedIn post.
- As any user I want the AI output to honor my brand voice and not sound generic.
- As a careful user I want every claim in the output linked to the source video moment.
- As an editor I want to regenerate just one paragraph without redoing the whole post.

### Functional requirements
1. **Output types:**
   - **Blog post** (800–1200 words, SEO-optimized): H1 title, meta description, H2/H3 structure, intro hook, body, conclusion with CTA.
   - **LinkedIn article** (600–800 words): professional voice, native LinkedIn format, hashtag suggestion.
   - **LinkedIn post** (150–300 words): hook + body + CTA.
   - **Email newsletter** (250–350 words): subject line, preview text, body with CTA.
   - **X / Twitter thread** (8–10 tweets): hook tweet + body + closing CTA, native cadence with line breaks.
   - **Instagram carousel concept** (8–10 slides): slide text + visual direction per slide (e.g., "Slide 3: Stat card — 87% with red highlight").
   - **Quote graphics** (5–10 pull quotes): powerful quotes from the source, ready to drop into Brand Studio templates.
   - **Show notes** (podcast standard format): summary + chapters + guest links + sponsor placeholders.
   - **YouTube description** (SEO-optimized with chapters and tags).
   - **Hashtag sets** per platform (TikTok / IG / X / LinkedIn).
   - **Video chapters** with timestamps.
2. **Brand Voice + ICP honored:** every output honors the user's Brand Voice settings (F6.2) and ICP profile.
3. **Grounded outputs:** every factual claim links to a source timestamp (P4). User clicks → jumps to the moment in the video.
4. **One-click generate all:** "Generate full content pack" produces all 9 outputs at once.
5. **Per-output regenerate:** "Regenerate this paragraph" / "Regenerate this tweet" with optional notes.
6. **Tone presets:** Thought-leader / Explainer / Casual / Formal / Playful / Authoritative.
7. **Length controls:** target word count adjustable.
8. **Source filter:** generate from full video, selection, or specific scene.
9. **Multi-language:** generate in any of the 100+ supported languages.
10. **Export formats:**
    - Blog: HTML, Markdown, copy to clipboard.
    - LinkedIn / X / IG: copy with formatting preserved.
    - Email: copy-paste into Mailchimp / Substack / generic.
    - Quote graphics: PNG/JPG ready for posting.
11. **Save as draft to Planner (F8.5):** any generated asset can be saved as a Planner card.
12. **Schedule to Scheduler (F7.7):** any generated social asset can be scheduled directly.

### UX flow
1. Editor → Repurpose → Content Pack → pick outputs → tone / length / language → Generate.
2. ~2 minutes processing → all outputs visible in side-by-side panels.
3. User reviews each → edits inline → regenerates parts → exports / schedules / saves.

### Inputs / Outputs
- **Inputs:** project + tone preferences.
- **Outputs:** structured text assets per type.

### Edge cases & error handling
- **Source too short (<60 sec):** disable blog generation; suggest social post only.
- **Source non-English:** generate in same language or translate first.
- **Brand voice undefined:** prompt user to set one; offer generic neutral as fallback.

### Sentiment guardrails
- **P5:** 80%+ of outputs publishable without editing (we measure this).
- **P4:** every claim sourced to a video timestamp.
- **P11:** all outputs in one panel; not 9 separate generators.

### Acceptance criteria
- All 9 output types ship by end of R2.
- "Publishable as-is" rating ≥80% on user surveys.
- 100% of factual claims link to source timestamps.

### Dependencies
- F2.4 (Transcription), F6.2 (Brand Voice), F2.6 (Co-pilot infra), F7.7 (Scheduler), F8.5 (Planner).

### Out of scope
- Long-form (5000+ word) writing (R5+).
- Visual graphic auto-generation (covered by Brand Studio for quote graphics; pure design out of scope).

### Metrics
- Pack generations per project.
- Per-output "publishable as-is" rate.
- Time-to-publish funnel.

---

## F6.2 — Brand Voice & ICP Guidelines

**Release:** R2
**Summary:** A persistent workspace setting where the user defines Brand Voice (samples, tone words, banned/required words) and ICP profiles (target audiences). All AI text outputs honor these automatically.

### Problem statement
HipClip-unique. Solves the universal "AI sounds generic" complaint (P5). Without this, every AI output looks the same as every other product's.

### Primary personas
In-house Marketer, Agency, B2B Sales Founder.

### User stories
- As a marketer I want our blog AI output to sound like our brand, not "generic AI."
- As an agency I want different brand voices per client.
- As a B2B founder I want our LinkedIn copy to use our positioning language consistently.
- As a writer I want to give the AI examples of our best writing so it learns our style.

### Functional requirements
1. **Brand Voice fields (per workspace, multiple voices supported for agencies):**
   - Voice name.
   - 3–5 sample paragraphs of "great" brand writing.
   - Tone words (e.g., "expert-but-not-stuffy, warm, evidence-based, no jargon").
   - Banned words.
   - Required / preferred words (brand-specific phrases).
   - Formality level (1–5).
   - Reading level (e.g., Grade 8 vs Grade 12).
2. **ICP Profile fields (multiple ICPs per workspace):**
   - ICP name.
   - Role, seniority, industry.
   - Pain points.
   - Goals / outcomes they care about.
   - Language patterns they use.
3. **Tone templates:** save presets that combine Voice + ICP for a content type (e.g., "Founder LinkedIn voice for CTOs").
4. **Active Voice/ICP per project:** project-level setting; defaults from workspace.
5. **Voice analyzer:** drop in a URL of existing brand content; AI extracts a starter Brand Voice for review.
6. **Continuous learning:** every accepted edit to AI output is logged as a signal; over time, the Voice refines.
7. **Multi-Brand support:** Agency tier supports many brands.

### UX flow
1. Settings → Brand Voice → New → name + paste samples + tone words + banned/required words → Save.
2. Repeat for ICPs.
3. In any AI-generation surface, see "Voice: [name] | ICP: [name]" with picker.
4. Outputs honor settings.

### Edge cases & error handling
- **Conflicting tone words and banned words:** flag to user.
- **Brand Voice with very little training data:** AI works but warns "Adding more samples improves quality."

### Sentiment guardrails
- **P5:** this is the lever that makes AI output "publishable from first pass."
- **P10:** continuous learning is opt-in.

### Acceptance criteria
- Brand Voice setting changes the AI output measurably (blind test: ≥80% of users can identify which output used their Brand Voice vs default).
- ICP profile usage increases output relevance per audience-targeted task.

### Dependencies
- F6.1 (Copywriter), F2.6 (Co-pilot).

### Metrics
- % of workspaces with at least one Brand Voice set.
- Voice/ICP usage per generation.

---

## F6.3 — Persistent Workflow Memory

**Release:** R2
**Summary:** The AI Co-pilot remembers user preferences across sessions: "you usually want shorts under 60s with hook overlays in red, captions at bottom, Hormozi style." After 5–10 projects, the AI can produce a near-final draft with a one-line prompt.

### Problem statement
HipClip-unique today. Differentiates an agent that improves with use from one that resets every session.

### Primary personas
Solo Creator (repeat workflows), In-house Marketer (template-heavy), Sales Founder.

### User stories
- As a podcaster I want the AI to remember I always want 6 clips per episode in 9:16 with Hormozi captions.
- As a marketer I want the AI to remember our preferred hook styles and CTA formats.
- As any user I want to give a one-line prompt after using the product for a month.

### Functional requirements
1. **Per-user memory store:** observable patterns from accepted edits, repeated prompts, settings changes.
2. **Visible memory panel:** "Things I remember about you" — user can view, edit, delete any item.
3. **Categories of memory:** preferred caption styles, preferred clip lengths, preferred aspect ratios, preferred Brand Voice settings, common request patterns, banned topics, frequent collaborators.
4. **Opt-in / opt-out:** user can disable memory entirely.
5. **Per-workspace vs per-user:** distinguish individual preferences from team-shared.
6. **Resets:** user can clear all memory; auto-resets if user is inactive >180 days.
7. **Transparent application:** when the AI applies memory, it says "Applied your usual 9:16 + Hormozi + bottom-captions defaults."
8. **Sharing memory:** Enterprise can share memory across team for consistency.

### UX flow
1. Settings → AI Memory → see learned items, edit/delete.
2. In Co-pilot, applied memory is annotated in responses.

### Sentiment guardrails
- **P8:** memory is opt-in transparent; user controls it.
- **P10:** every application of memory is visible, undoable.

### Acceptance criteria
- After 10 sessions, memory-influenced outputs accepted at ≥70% rate.
- Memory panel always reflects current state; deletions immediate.

### Dependencies
- F2.6 (Co-pilot).

### Metrics
- % of users with memory enabled.
- Memory-influenced output acceptance rate.

---

## F6.4 — Custom AI Personas

**Release:** R3
**Summary:** Save reusable AI "modes" (e.g., "Sales BDR — concise, urgent, value-led"; "Training — patient, jargon-free") combining voice clone + tone + writing style + visual templates.

### Problem statement
Beyond Brand Voice, teams need different "voices" for different purposes. A Sales persona ≠ a Training persona ≠ a Marketing persona.

### Primary personas
In-house Marketer, B2B Sales Founder, L&D Lead, Agency.

### User stories
- As a sales team we want a "BDR Outreach" persona producing concise direct videos.
- As an L&D lead I want a "Patient Trainer" persona for course content.
- As a marketing team we want a "Brand Storyteller" persona for thought leadership.

### Functional requirements
1. **Persona = bundle:** Brand Voice + ICP + preferred voice clone or TTS voice + preferred avatar + preferred templates + preferred caption style.
2. **Library:** per-workspace; multiple personas per workspace.
3. **One-click switch:** in any generation surface, switch persona; entire output adapts.
4. **Persona analytics:** see which personas perform best per platform.

### UX flow
1. Settings → Personas → New → bundle settings → save.
2. In any generation, pick persona from dropdown.

### Sentiment guardrails
- **P11:** one persona setting cascades through every output surface.

### Acceptance criteria
- Personas can be created in <5 min; persona switch updates all relevant defaults instantly.

### Dependencies
- F6.2, F3.3, F3.4, F3.5, F8.1.

### Metrics
- Personas per workspace.

---

## F6.5 — Custom-Trained Models (Enterprise)

**Release:** R3
**Summary:** Train the AI Co-pilot on the org's best content — their highest-performing scripts, preferred clip moments, social-post styles — so it produces output that sounds like them.

### Problem statement
Descript's Enterprise wedge. Enterprise buyers will pay a premium for "AI that sounds like our company."

### Primary personas
Enterprise (Fortune 500), Agency (per-client custom models).

### User stories
- As an enterprise we want the AI to learn from our top-performing 100 videos and produce in that style.
- As an agency we want a custom model per client.

### Functional requirements
1. **Training data ingestion:** upload past content, mark as "exemplary" / "average" / "bad."
2. **Aspects trainable:** writing style, clip selection criteria, visual style preferences, voice / pace patterns.
3. **Training timeline:** kickoff with onboarding; first usable model in 2–4 weeks.
4. **Version control:** every retraining is a new model version; can revert to previous.
5. **Model isolation:** customer's data isolated; never used for any other customer.
6. **Audit log:** every use of custom model logged.
7. **Per-tenant pricing.**

### UX flow
1. Enterprise admin → Custom Models → New → upload data → mark quality → kickoff training.
2. After training, the model is selectable in Co-pilot.

### Sentiment guardrails
- **P8:** customer content isolation is binding; verify with audits.

### Acceptance criteria
- Custom model demonstrably differs from default (blind test).
- Customer data never leaks to other tenants.

### Dependencies
- F2.6, F9.x (security/compliance).

### Out of scope
- Self-serve training (R5+; today requires onboarding).

### Metrics
- # of custom models live.
- Customer retention with custom models (should be high).

---

## F6.6 — AI Clip Generator (Long → Short)

**Release:** R1
**Summary:** Drop a long video, get 15–30+ short-form clips with viral-score ranking, auto-reframe, animated captions, hook overlay, thumbnail, ready-to-schedule status.

### Problem statement
Most contested feature in the entire competitor set. Quality of clip selection is the differentiator — Choppity and Pictory get dinged for it; Vizard and Opus Clip lead.

### Primary personas
Solo Creator (podcaster, YouTuber), In-house Marketer, Vertical Power User.

### User stories
- As a podcaster I want to drop a 60-min interview and get 15 shareable shorts with high viral potential.
- As a marketer I want clips ranked by predicted virality with explainable reasons.
- As a creator I want each clip pre-captioned, pre-reframed, pre-thumbnail'd, ready to schedule.
- As a power user I want to prompt "find product feature mentions" and get those clips specifically.

### Functional requirements
1. **Input:** any video / audio source.
2. **Clip count:** AI returns 15–30+ candidate clips (configurable up to 50).
3. **Viral score (0–100) per clip** with explicit driver breakdown:
   - Hook Strength (40%)
   - Pacing (35%)
   - Engagement (25%)
   - Per-clip the breakdown is visible.
4. **Auto-reframe:** 9:16 / 1:1 / 16:9 with face/active-speaker tracking.
5. **Animated captions** applied by default (style configurable).
6. **AI Hook Overlay** (auto first-3-second attention text per clip — see F6.7).
7. **AI Thumbnail** (auto-generated per clip — see §F6.7 part 2).
8. **Speaker tracking:** keep active speaker centered; split-screen for back-and-forth.
9. **Filters / sorts:** by viral score, by duration, by topic, by speaker.
10. **Categories:** AI tags each clip — Hook, Story, Insight, Quote, Product Feature, Testimonial, Joke.
11. **Custom prompts (per F6.7 below):** "find funniest parts," "find product mentions."
12. **Preview / edit / regenerate per clip.**
13. **Schedule directly from clip view** (F7.7 integration).
14. **Bulk export.**
15. **Processing time SLA:** <5 min for 60-min input on standard tier.

### UX flow
1. Editor → Repurpose → Generate Clips → settings (count, aspect, caption style, length range) → Generate.
2. ~5 min later, gallery of clips sorted by viral score.
3. User clicks clip → preview → edit → approve → schedule.

### Edge cases & error handling
- **Source has no speech:** generate clips by visual moment detection instead.
- **Source too short (<5 min):** generate fewer clips; warn.
- **Heavy cross-talk:** still generate; flag low confidence on affected clips.

### Sentiment guardrails
- **P5:** clip quality bar is high — must beat Choppity/Pictory perceptions; aim for Vizard/Opus-class.
- **P4:** viral score is explainable, not a black box number.
- **P6:** every clip is editable; regen with notes.

### Acceptance criteria
- Median 15+ clips per 60-min input.
- Average user-acceptance rate per clip ≥40% (industry-leading bar).
- Processing time ≤5 min for 60-min input.
- Viral score correlation with actual platform performance documented over time.

### Dependencies
- F2.4, F2.5, F4.5, F6.7, F8.1, F7.7.

### Out of scope
- Auto-publishing without review (violates P10).

### Metrics
- Clips generated per workspace.
- Clip-to-post conversion rate.
- Viral score → actual performance correlation (track over time).

---

## F6.7 — Custom Clip Prompts + AI Hook Overlay + AI Thumbnail

**Release:** R2
**Summary:** Three related clip-enhancement features: (a) custom prompts to find specific moments, (b) AI hook overlay on first 3 seconds, (c) AI thumbnail per clip with best frame + text overlay + platform format.

### Problem statement
ScaleReach + HipClip + Wayin differentiators. Hugely useful for marketers, PR clipping, and short-form virality.

### Primary personas
Solo Creator (short-form), In-house Marketer, Agency.

### User stories
- As a marketer I want to prompt "find every moment about pricing" and get those clips.
- As a creator I want every clip to have an auto-generated hook overlay so viewers stay past 3 seconds.
- As a poster I want a custom thumbnail per clip with the best frame + overlay text.

### Functional requirements
1. **Custom prompts:**
   - Free-form text: "Find the funniest parts," "Find product feature mentions," "Find moments where the guest tells a personal story."
   - Multiple prompts per video → multiple clip sets.
   - Returns clips with explanation ("Selected because: speaker laughed twice in this segment").
2. **AI Hook Overlay:**
   - Generated for each clip: a short attention-grabbing text overlay on the first 3 seconds.
   - Variants: 3–5 hook options per clip; user picks.
   - Editable text + style + position.
   - Brand kit font/color honored.
3. **AI Thumbnail Generator:**
   - For each clip, AI picks best frame (face visible + good expression + clean composition).
   - Auto-adds text overlay (headline pulled from the clip's hook or topic).
   - Platform-specific aspect ratios (YT thumbnail 16:9; IG 1:1 / 4:5; TikTok 9:16).
   - Multiple variants per clip; user picks or regenerates.
   - Brand kit honored.

### UX flow
1. After clip generation, each clip shows: viral score + hook overlay variants + thumbnail variants.
2. User picks preferred hook + thumbnail; both editable; one-click apply.

### Sentiment guardrails
- **P10:** never auto-apply; always show variants for user pick.
- **P11:** hook overlay and thumbnail share brand kit defaults.

### Acceptance criteria
- ≥80% of clips have at least one acceptable hook overlay variant.
- ≥80% of clips have at least one acceptable thumbnail variant.
- Custom prompt returns ≥3 relevant clips for typical prompts on 60-min content.

### Dependencies
- F6.6, F8.1.

### Metrics
- Hook overlay acceptance rate.
- Thumbnail acceptance rate.
- Custom prompt usage frequency.

---

## F6.8 — Natural-Language Video Search

**Release:** R3
**Summary:** "Show me every moment where someone said X" across one video or the entire library.

### Problem statement
Wayin / Choppity ClipAnything differentiator. Essential for power users with large content libraries.

### Primary personas
In-house Marketer (asset search), Agency (multi-client search), Newsroom.

### User stories
- As a marketer I want to find every clip in our 200-video library where someone mentioned "GDPR."
- As a podcaster I want to find every moment my guest told a story about their first job.
- As any user I want semantic search, not just keyword.

### Functional requirements
1. **Library-wide search:** across all projects in the workspace.
2. **Per-project search:** within current project.
3. **Semantic + keyword:** AI understands intent; not just literal match.
4. **Results:** clip preview + timestamp + project + transcript snippet.
5. **Filters:** by date, by project, by speaker, by tag.
6. **One-click clip generation** from any search result.
7. **Saved searches.**
8. **Recent searches.**

### UX flow
1. Search bar in header → query → results visualized.
2. Click result → jump to that moment in source project.
3. Right-click → "Make clip from this."

### Sentiment guardrails
- **P4:** results always link to source moments.

### Acceptance criteria
- Top-3 result relevance ≥80% on benchmark queries.
- Search latency ≤2s for library <1000 videos.

### Dependencies
- F2.4 (Transcription for indexing).

### Metrics
- Searches per workspace.
- Search-to-clip-creation conversion.

---

*End of Pillar 6 — Repurpose specifications.*
