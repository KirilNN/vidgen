# Pillar 3 — Create (detailed specifications)

> **Pillar question:** "How do I make a video from scratch / an idea / a URL / a script?"
> **Release coverage:** R2 (F3.1–F3.6), R3 (F3.7), R4 (F3.8), R5 (F3.9–F3.10)

---

## F3.1 — Multi-Modal Input → Video (7 modalities)

**Release:** R2
**Summary:** Seven explicit input modalities, each a first-class workflow: Text-to-Video, Script-to-Video, URL-to-Video, Blog-to-Video, PPT-to-Video, Audio-to-Video, Image-to-Video.

### Problem statement
Pictory owns this surface (every input modality); none are in Descript. Marketers, course creators, bloggers think in their source format, not in "video." Meeting them where they are wins.

### Primary personas
In-house Marketer, Solo Creator, L&D Lead, Sales Founder.

### User stories
- As a marketer I want to paste our blog URL and get a narrated video summary in 3 minutes.
- As a course creator I want to upload my PowerPoint and have it become a narrated video with avatar.
- As a podcaster I want to take just the audio and have AI generate visuals on top.
- As a designer I want to upload my static images and have them animated with prompted motion.
- As a copywriter I want to describe a video in 1 paragraph and get a usable first draft.

### Functional requirements
Each modality is a separate "Create" entry point in the home dashboard, sharing common output rendering.

1. **Text-to-Video:**
   - Input: a paragraph describing the desired video.
   - Output: AI writes script → generates voiceover (F3.3) → generates B-roll (F3.2) → assembles into scenes → captions applied.
2. **Script-to-Video:**
   - Input: a user-written script (plain text, markdown, or paste from Google Docs).
   - Output: scene-by-scene video with voiceover + visuals matched to script content.
   - Per-line scene control: each paragraph becomes a scene; user can split/merge.
3. **URL-to-Video:**
   - Input: any web page URL.
   - Output: extract main text → summarize → script → narrated video. HTML-only at launch; PDF/Doc support added R3+.
   - Sourcing fidelity: every claim links to the source page section.
4. **Blog-to-Video:**
   - Same as URL-to-Video but optimized: respects H1/H2 structure as scenes; pulls images from the blog; uses post title as video title.
5. **PPT-to-Video:**
   - Input: PowerPoint .pptx or Keynote .key file.
   - Output: each slide → one scene. Slide text → voiceover script (or speaker notes if present). Slide visuals preserved or replaced with B-roll.
6. **Audio-to-Video:**
   - Input: a podcast / voice memo / lecture audio file.
   - Output: transcription → scene detection by topic → B-roll generated for each scene → assembled video.
   - Original audio preserved; visuals layered on top.
7. **Image-to-Video:**
   - Input: one or more still images.
   - Output: animated video with prompted motion ("zoom in," "pan left," "subtle parallax," "cinematic dolly"). Generated motion can include the still as a reference or a transformative animation.

### Cross-modality shared behaviors
- All outputs land in the standard editor (transcript + timeline + scenes). User can edit further.
- All outputs honor Brand Kit (F8.1).
- All outputs honor Brand Voice (F6.2) for tone of generated script.
- All outputs respect tier credit limits; show estimated credit cost before generation.
- All outputs go through the Co-pilot diff pattern: "Here's what I made — accept, edit, or regenerate."

### UX flow
1. User clicks **Create** → picks modality.
2. Picker shows input field appropriate to modality.
3. User provides input + selects style preferences (length, tone, voice, visual style) + clicks **Generate**.
4. Progress visible per scene; first scene visible within 30 seconds for fast modalities.
5. Result opens in editor; user can fully edit.

### Edge cases & error handling
- **URL with paywall / login required:** clear error; offer to upload the text manually.
- **PPT with proprietary fonts / animations:** preserve content; substitute fonts; flag what changed.
- **Audio in unsupported language:** offer translation path or fail clearly.
- **Image too small (<480px):** upscale or reject with reason.
- **Very long input (10-page blog):** chunk into multiple scenes; respect tier's max-length cap.

### Sentiment guardrails
- **P4:** URL/Blog modalities link every generated claim back to the source URL section.
- **P5:** generated voiceover script must clear "publishable from first pass" bar.
- **P6:** user can always edit / regenerate any scene without redoing the whole video.

### Acceptance criteria
- All 7 modalities ship by end of R2.
- For each modality, ≥75% of users on a sample task rate first-draft output as "usable with minor edits or better."
- Median end-to-end time:
  - Text-to-Video (1 paragraph → 30s video): ≤3 minutes.
  - URL-to-Video (1 blog post → 90s video): ≤4 minutes.
  - PPT-to-Video (10 slides → narrated): ≤5 minutes.
  - Audio-to-Video (60-min podcast → visualized): ≤15 minutes.

### Dependencies
- F3.2 (AI Video Generator for B-roll).
- F3.3 (TTS).
- F2.5 (Captions).
- F8.1 (Brand Kit).
- F6.2 (Brand Voice).
- F2.6 (Co-pilot for diff/regenerate flow).

### Out of scope
- Real-time text-to-video as you type (R5+).
- Animated character storytelling (handled separately by avatars).

### Metrics
- Modality usage distribution.
- First-draft acceptance rate per modality.
- Time-to-first-render per modality.

---

## F3.2 — AI Video Generator (B-roll, Scenes, Backgrounds)

**Release:** R2
**Summary:** Best-in-class generative video for B-roll, cutaways, animated title cards, stylized background loops, with a multi-model selector under the hood (user only picks a style).

### Problem statement
Generic stock B-roll is generic. Custom-generated B-roll matched to the script tone is the modern bar. Descript ships this with multiple models; we match.

### Primary personas
Solo Creator, In-house Marketer, L&D Lead.

### User stories
- As a creator I want to prompt "futuristic city skyline at sunset, cinematic" and get a usable 5-second B-roll clip.
- As a marketer I want B-roll that matches my brand colors and aesthetic.
- As a podcaster I want stylized background loops to play during my voice-only segments.
- As any user I want the AI to pick the best model for my shot without me knowing what "Veo" or "Pixverse" are.

### Functional requirements
1. **Prompt input:** plain text description of the desired clip; optional reference image upload.
2. **Style picker:** 20+ pre-tested visual styles ("Cinematic," "Documentary," "Anime," "3D animated," "Pixar-style," "Hand-drawn," "Photorealistic," etc.). User can create a custom style from a reference image and reuse it.
3. **Length presets:** 3s / 5s / 8s / custom.
4. **Aspect ratio:** matches project aspect ratio by default; can override.
5. **Multi-model under the hood:** the system picks the best model per shot. Power users can see and override the model choice.
6. **Brand Kit awareness:** generated B-roll incorporates brand colors / mood from the brand kit (when applicable).
7. **Co-pilot integration:** "Generate B-roll for this paragraph" → Co-pilot picks the shot brief from the script.
8. **Variants:** every generation produces 2–4 variants; user picks the best.
9. **Regenerate with notes:** user can ask for a tweak ("more vibrant," "less people," "wider shot") and get refined variants.
10. **Credit pricing visible:** before generation, show credit cost.
11. **Library:** generated B-roll auto-saved to the project's media library and to a "My Generations" pool reusable across projects.

### UX flow
1. In editor → "+ B-roll" → "Generate with AI."
2. User types prompt + picks style + length → sees credit cost → Generate.
3. 30–60s later, 2–4 variants visible; user picks one → drops on timeline.
4. User asks "make it more vibrant" → regenerate.

### Edge cases & error handling
- **Prompt violates content policy:** clear refusal with policy citation; offer alternative phrasing.
- **All variants are bad:** "Regenerate" doesn't double-charge; first regen included; subsequent at half cost.
- **Generation fails server-side:** auto-retry; refund credit if still fails; user sees clear status.

### Sentiment guardrails
- **P11:** the model picker is hidden by default; user just picks a style.
- **P10:** generated B-roll never auto-replaces existing B-roll; user always picks variant.

### Acceptance criteria
- ≥3 of 4 variants on average rated "usable" by users.
- Median generation time ≤90 seconds per variant.
- Cost transparency: actual credits charged == quoted credits 100% of the time.

### Dependencies
- F2.6 (Co-pilot integration).
- F8.1 (Brand Kit awareness).

### Out of scope
- Long-form (>30 sec) generative video clips (R5+).
- Avatar-led generative video (covered in F3.5 / F3.6).

### Metrics
- Generations per project.
- Variant pick rate (which variant wins).
- Regeneration rate (high regen rate → tuning needed).

---

## F3.3 — AI Voices (TTS)

**Release:** R2 (60+ voices, 20 languages) → R3 (200+ voices, native-trained in 14+ languages)
**Summary:** A catalog of natural-sounding stock voices with per-voice tone/emotion/pace controls. Top priority is "doesn't sound like AI."

### Problem statement
Pictory's #1 complaint is "robotic voices." CapCut's 200+ voices is the high-water mark. Reddit pain (P9) — voice quality is the audible give-away of "this was AI."

### Primary personas
All personas; especially course creators, podcasters fixing words, marketers with no on-camera talent.

### User stories
- As a course creator I want a voice that sounds human enough that students don't notice it's AI.
- As a podcaster I want to type a corrected word and have it spoken in the same voice as the rest of the episode.
- As a marketer I want 5 different voices for 5 different brand personas.
- As an international creator I want native-sounding voices in Spanish, French, Hindi, Japanese — not English-with-an-accent.

### Functional requirements
1. **Voice catalog:** 60+ at R2 launch; 200+ by R3.
2. **Voice metadata:** name, gender, age range, language, accent, mood (warm / authoritative / playful / serious / energetic), preview sample.
3. **Browse & filter:** by language, gender, mood, accent. Sort by popularity.
4. **Voice preview:** click any voice on the marketing site or in the editor → hear a 10-sec sample reading the user's own text.
5. **Per-voice controls:** emotion slider (neutral → energetic), pacing (slow / normal / fast), pitch (-3 to +3 semitones), pause length.
6. **Pronunciation overrides:** custom pronunciation map per workspace (brand names, exec names, place names). Honored across all voices.
7. **SSML-equivalent inline directives:** user can mark emphasis, pauses, breath in the script with visual controls (no XML required).
8. **Native-trained voices:** by R3, 14+ languages have voices trained natively (not English voices speaking other languages). Marked with a "Native" badge.
9. **Multi-voice scripts:** one script can have multiple voices for dialogue.
10. **"Don't sound like AI" review pass:** before export, an internal quality check flags robotic-sounding sections and suggests adjustments.
11. **Tier gating:**
    - Free: 5 stock voices, English-US only.
    - Creator: 30 voices, top 8 languages.
    - Pro: 60+ voices, 20 languages.
    - Business+: 200+ voices, native-trained in 14+ languages.

### UX flow
1. User opens voice picker → filters by language + mood.
2. Plays previews → picks voice.
3. Types script → adjusts emotion slider for specific sections.
4. Generates audio → previews → uses in project.

### Edge cases & error handling
- **Word the voice mispronounces:** user adds to pronunciation overrides → re-generate.
- **Very long script (>5000 words):** chunk and stitch seamlessly.
- **Numbers / dates / abbreviations:** smart speech (e.g., "$1.5M" → "one point five million dollars," configurable).

### Sentiment guardrails
- **P9:** native-trained voices in top 15 languages; published quality benchmarks.
- **P5:** "Doesn't sound like AI" review pass is a real automated check before export.

### Acceptance criteria
- Blind listener test: <30% can correctly identify Native voices as AI on 30-sec clips.
- 60+ voices at R2; 200+ at R3.
- Pronunciation overrides honored 100% of the time after applied.

### Dependencies
- F8.1 (Brand Kit can specify preferred voices).
- F6.2 (Brand Voice settings).

### Out of scope
- Singing voices (R5+).
- Real-time voice synthesis for live streaming (out of scope).

### Metrics
- Voice usage distribution.
- Per-voice "blind detection" benchmark score (sampled).
- Pronunciation override frequency.

---

## F3.4 — Voice Clone

**Release:** R2
**Summary:** Clone your own voice in ~60 seconds with identity verification. User owns the clone and decides whether to share.

### Problem statement
Descript Overdub is the model; ~60-second cloning is modern bar. Use cases: voiceover, error correction by typing, multilingual narration of the user's own voice. Identity verification is required to prevent abuse.

### Primary personas
Solo Creator (podcaster fixing words), Sales Founder (scaling personalized video), L&D Lead (course narration).

### User stories
- As a podcaster I want to type a correction and have it spoken in my own voice.
- As a creator I want to record once and produce voiceover in multiple languages in my own voice.
- As a salesperson I want personalized video pitches with my voice but personalized names.
- As a cautious user I want assurance no one can clone my voice without my permission.

### Functional requirements
1. **Training:** ~60 seconds of clean speech in a guided prompt session ("read this paragraph"). Higher-fidelity option: 5–10 minutes for premium clone.
2. **Identity verification:** user must record a verification phrase ("My name is X, today is Y, I consent to cloning my voice") that the system compares against the training sample. Voice clone tied to the verified user.
3. **Consent & revocation:** user can delete the clone at any time; deletion removes all model artifacts within 7 days.
4. **Sharing:** user can share their clone with specific teammates (Team+ tier). Recipient can use the clone but not share it further.
5. **Cross-language synthesis:** clone can speak in 14+ languages (with native-trained underlying models — F3.3 dependency).
6. **Voice clone in script-to-video:** clone is one of the voice options in F3.1 / F3.3.
7. **Voice clone in error correction:** in the text-based editor, user can type over a word, choose "Speak in [my clone]," and the audio is replaced (with smart crossfade).
8. **Watermarking:** every clone-generated audio has an inaudible AI watermark for provenance.
9. **Quality tier:**
   - Standard clone (60s training): usable for short fills, error corrections, social posts.
   - Premium clone (5+ min training): usable for full narrations.

### UX flow
1. User goes to Voices → "Create your voice clone."
2. Guided recording session (60 seconds OR 5 minutes for Premium).
3. Identity verification phrase recorded.
4. ~5 minutes processing → clone ready.
5. User previews clone reading any text; can iterate.

### Edge cases & error handling
- **User can't pass identity verification** (background noise, mismatched voice): retry; if persistent fail, escalate to manual review.
- **Clone quality is poor:** offer re-training with more data.
- **Attempted clone of someone other than the user:** identity verification blocks; account flagged.

### Sentiment guardrails
- **P8:** identity verification is mandatory; we don't sell "clone any voice from a YouTube clip."
- **P10:** every clone-generated output watermarked and logged.

### Acceptance criteria
- Standard clone (60s training) achieves blind listener test: <40% can correctly distinguish from source on 30-sec clips.
- Premium clone achieves <25%.
- Identity verification false-accept rate <1%.

### Dependencies
- F3.3 (TTS infrastructure for synthesis).

### Out of scope
- Cloning public figures (forbidden by policy).
- Real-time voice transformation in live calls (out of scope).

### Metrics
- # of clones created per month.
- Clone usage in projects.
- Revocation rate (high → trust signal needs investigation).

---

## F3.5 — AI Avatar Gallery

**Release:** R2
**Summary:** 35+ pre-built realistic avatars who read any script. Pick avatar → type script → finished talking-head video.

### Problem statement
Course creators, sales reps, L&D teams want a "presenter" they don't have to film. CapCut, Pictory, Descript all have this; we must match.

### Primary personas
L&D Lead, Sales Founder, Solo Creator (no on-camera talent), In-house Marketer.

### User stories
- As a course creator I want to pick a friendly female presenter and have her read my course modules.
- As a salesperson I want a polished avatar to deliver my outreach message at scale.
- As an L&D lead I want to switch avatars without re-recording.

### Functional requirements
1. **Avatar gallery:** 35+ at launch, diverse in gender, ethnicity, age, style. Each avatar has a name, description, and 10-sec preview.
2. **Avatar attributes:** appearance type (corporate / casual / friendly / energetic), default voice, backgrounds available.
3. **Composition:** pick avatar → pick TTS voice (default or other) → type script → choose background (solid color / branded / virtual environment / chroma).
4. **Gesture & emotion:** AI auto-adds natural gestures based on script content; user can adjust energy level slider.
5. **Multi-avatar scenes:** two avatars can appear in a single scene having a dialogue.
6. **Length limit:** up to 5 min per single avatar generation at R2; longer in R3.
7. **Brand Kit integration:** branded background, color treatment.
8. **Aspect ratios:** 9:16 / 1:1 / 16:9.

### UX flow
1. Create → Avatar Video → pick avatar → write script → pick background + voice → Generate.
2. Output appears in editor; user can edit script and regenerate.

### Edge cases & error handling
- **Script too long:** chunk into multiple avatars or warn.
- **Inappropriate script content:** policy refusal.

### Sentiment guardrails
- **P5:** avatar realism must be high enough to be usable in actual marketing/courses.

### Acceptance criteria
- 35+ avatars at R2.
- ≥75% of generated avatar videos rated "usable" by users.
- Median generation time: ≤2 min for a 60-sec avatar video.

### Dependencies
- F3.3 (TTS).

### Out of scope
- Avatar with body / full-frame motion (R5+).

### Metrics
- Avatars used per workspace.
- Avatar regeneration rate.

---

## F3.6 — Custom Avatar from Photo + Talking Avatar from Single Photo

**Release:** R2 (basic), R3 (high-fidelity)
**Summary:** Two related features: (a) upload a clean photo, get a custom branded avatar for repeated use; (b) upload any photo (employee, mascot, fictional character) and get a talking-head video with realistic lip sync.

### Problem statement
CapCut and Pictory have the single-photo talking head; Descript partially has avatar-from-photo. Combined they unlock huge use cases: sales (use my own face), education (faculty avatars), entertainment (animate a photo).

### Primary personas
Sales Founder, Solo Creator, In-house Marketer, L&D Lead.

### User stories
- As a sales founder I want my own face as a recurring avatar in personalised videos.
- As a marketer I want our CEO's face to animate a quote without filming.
- As a creator I want to make a fictional character talk for storytelling.

### Functional requirements
1. **Custom avatar from photo (persistent):**
   - Upload 1–5 photos of a real person (with consent verification for any real person).
   - System generates a reusable avatar with the person's likeness, default voice, configurable backgrounds.
   - Stored in the user's avatar library; reusable across projects.
2. **Single-photo talking avatar (one-off):**
   - Upload any photo → enter script → generate a talking-head video with lip sync.
   - Maximum 60 sec at R2; up to 5 min by R3.
3. **Consent flow:**
   - For any photo of a real person (other than the account holder), uploader must attest consent.
   - For account holder's own photo: identity verification required (similar to voice clone).
   - Public figures: blocked.
4. **Identity watermark:** generated talking-avatar output watermarked for provenance.
5. **Voice pairing:** pair with TTS voice (F3.3) or voice clone (F3.4) for full-fidelity persona.
6. **Quality controls:** adjust lip-sync strength, head movement amount, eye movement.
7. **Background:** preserve original photo background, replace with solid / brand color / scene / chroma.

### UX flow
1. Create → Talking Avatar → upload photo → consent attestation → write script → pick voice → Generate.
2. Output appears in editor; user can regenerate with edits.

### Edge cases & error handling
- **Low-quality photo (low-res / blurry / extreme angle):** offer to enhance or reject.
- **Photo of multiple people:** ask which face to animate.
- **Public-figure detection:** if the system recognizes a public figure, block with explanation.
- **Cartoon / illustration:** allowed; identity verification N/A.

### Sentiment guardrails
- **P8:** consent attestation + identity verification + watermark + audit log. We do not enable deepfakes.
- **P10:** every output reviewable before publish.

### Acceptance criteria
- Lip-sync quality acceptable up to 60 sec at R2; up to 5 min at R3.
- 100% of public-figure attempts blocked.
- Consent attestation logged and auditable.

### Dependencies
- F3.3 (TTS) or F3.4 (Voice Clone).

### Out of scope
- Full-body animation (R5+).
- Voice + face cloning without consent (forbidden).

### Metrics
- Talking-avatar generations per month.
- Consent refusal rate.
- Quality complaints per output.

---

## F3.7 — Voice Changer Effects

**Release:** R3
**Summary:** Post-process voice changers (robot, chipmunk, monster, anonymize-source, gender-shift) applied to any audio track.

### Problem statement
CapCut and TikTok-native creators expect this. Not the biggest revenue driver but a delight feature; useful for storytelling, anonymization, comedy.

### Primary personas
Solo Creator (TikTok-native), Vertical Power User (gaming, comedy).

### User stories
- As a creator I want a "monster" voice effect for spooky content.
- As an interviewer I want to anonymize a source's voice while keeping speech intelligible.
- As a comedy creator I want a "chipmunk" effect for one segment.

### Functional requirements
1. **Effect library:** 20+ presets (Robot, Chipmunk, Monster, Phone, Underwater, Anonymous, Gender-shift male→female, Gender-shift female→male, Whisper, Megaphone, Radio, Vintage, Auto-tune, etc.).
2. **Per-clip application:** apply to any audio clip on the timeline; can be reversed.
3. **Per-segment application:** apply to a transcript-selected segment; the effect is bounded by selection.
4. **Strength slider:** how strong the effect is.
5. **Preview before apply.**

### UX flow
1. Select audio clip or transcript range → Effects panel → pick effect → preview → apply.

### Edge cases & error handling
- **Effect makes speech unintelligible:** warn user; allow override.

### Sentiment guardrails
- **P6:** reversible.

### Acceptance criteria
- 20+ effects available; all reversible.

### Dependencies
- F4 (audio infrastructure).

### Metrics
- Effect usage frequency per workspace.

---

## F3.8 — AI Brainstorming

**Release:** R4
**Summary:** "I want to make a video about X" → AI returns topic angles, storyboard outlines, hook variations, suggested length, suggested platforms.

### Problem statement
Closes the cold-start gap. CapCut productized this; users love it.

### Primary personas
Solo Creator, In-house Marketer.

### User stories
- As a creator stuck on what to make I want to brainstorm video ideas with the AI.
- As a marketer I want hook variations for an existing topic.
- As any user I want a storyboard outline before I start scripting.

### Functional requirements
1. **Topic → ideas:** user types a topic; AI returns 5–10 angle ideas with hooks, length recommendations, platform fit.
2. **Idea → storyboard:** pick an idea; AI returns a scene-by-scene storyboard outline.
3. **Hook variations:** for any chosen idea, 5–10 hook variations (different angles, lengths, styles).
4. **Brand Voice aware:** uses F6.2 to tailor ideas.
5. **Save to Planner:** every idea / storyboard can be saved as a card in the Content Planner (F8.5).

### UX flow
1. Home → Brainstorm → type topic → see ideas → pick one → see storyboard → save to planner OR straight to Script-to-Video.

### Sentiment guardrails
- **P4:** when AI cites trends or "what's working on TikTok," it links to actual examples (or marks as inferred).

### Acceptance criteria
- ≥60% of brainstormed ideas rated "would consider making" by users on sample.

### Dependencies
- F2.6 (Co-pilot), F8.5 (Planner), F6.2 (Brand Voice).

### Out of scope
- Trend prediction without data sources (we don't fake trends).

### Metrics
- Brainstorm sessions / week.
- Idea → script → render conversion funnel.

---

## F3.9 — AI Character Generator (with Identity Consistency)

**Release:** R5
**Summary:** Generate a fictional character that stays visually consistent across many generations (same face, outfit, voice).

### Problem statement
Course creators, fiction creators, marketers building recurring mascots need this. CapCut owns it currently.

### Primary personas
Solo Creator (animated content), L&D Lead (course mascot), In-house Marketer (brand character).

### User stories
- As a marketer I want a brand mascot character that looks identical across all videos.
- As a creator I want a fictional protagonist consistent across episodes.

### Functional requirements
1. **Character creation:** prompt + style + attributes (age, gender, outfit, distinctive features) → character generated with multiple poses/expressions.
2. **Character library:** saved in workspace; reusable across projects.
3. **Identity consistency:** generations of the same character maintain facial features, outfit, color palette (±5% tolerance verified by automated face-similarity).
4. **Variants:** clothing changes, expressions, environments — without breaking identity.
5. **Voice pairing:** optional TTS voice pinned to character.

### UX flow
1. Characters → New → describe character → generate → save.
2. In any project, drop character into a scene → generate scene with character.

### Sentiment guardrails
- **P8:** characters cannot resemble real public figures (similarity check).
- **P6:** character library editable, deletable.

### Acceptance criteria
- Same-character generations measure ≥85% facial similarity (automated benchmark).

### Dependencies
- F3.2 (Video Generator).

### Out of scope
- Cloning fictional copyrighted characters (forbidden by policy).

### Metrics
- Characters created per workspace.
- Character reuse rate.

---

## F3.10 — Niche Generators

**Release:** R5
**Summary:** AI tattoo, AI product-shot, AI book-cover, AI hairstyle preview, etc. — only those with clear top-of-funnel SEO value.

### Problem statement
CapCut uses these as SEO and acquisition tools. We ship 3–5 with validated demand, not all of them.

### Primary personas
Top-of-funnel visitors; convert to core users.

### User stories
- As a discoverer I land on "AI tattoo generator" via search; try it; sign up.
- As an entrepreneur I want product-shot mockups without a photographer.

### Functional requirements
1. **Each niche tool:** dedicated landing page; quick generation flow; signup gate for download/export at higher resolution.
2. **Shared infrastructure:** all use F3.2 generation backend.
3. **SEO landing pages:** each tool ranks for its long-tail query.
4. **Conversion path:** "Like this? Try our full editor" CTA on every output.

### UX flow
1. User lands from search → tries tool → output watermarked / low-res → signup unlocks full quality.

### Sentiment guardrails
- **P3:** the basic tool works without signup; only export quality gated.

### Acceptance criteria
- Each niche tool ranks top-10 on its target query within 6 months.
- ≥5% of tool users sign up.

### Dependencies
- F3.2.

### Out of scope
- 50 generators with no clear value (we ship 3–5 chosen for impact).

### Metrics
- Tool traffic per month.
- Tool-to-signup conversion rate.

---

*End of Pillar 3 — Create specifications.*
