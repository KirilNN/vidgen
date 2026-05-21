# Pillar 4 — Enhance (detailed specifications)

> **Pillar question:** "How do I fix the audio, the eyes, the lighting, the bad parts?"
> **Release coverage:** R1 (F4.1, F4.2), R3 (F4.3–F4.10)

---

## F4.1 — Studio Sound (Regenerative Audio Cleanup)

**Release:** R1
**Summary:** AI regenerates clean voice from noisy input (not a filter). Removes background noise, echo, room reverb. Works on bedroom, phone, airport recordings. Strength slider + "preserve room tone" mode + before/after preview.

### Problem statement
Most-loved Descript feature on Reddit for podcasters. Table stakes. **Reddit complaint:** "Studio Sound can over-process and sound robotic." We ship a strength slider and preserve-room-tone mode.

### Primary personas
Solo Creator (podcaster), In-house Marketer, Sales Founder, Vertical Power User.

### User stories
- As a podcaster recording in my bedroom I want my voice to sound studio-grade.
- As an interviewer I want to clean my guest's bad-quality Zoom audio without removing their voice character.
- As a creator I want to preview the cleaned vs raw audio before committing.
- As a careful user I want a strength slider so the AI doesn't over-process.

### Functional requirements
1. **One-click apply** on any audio clip or full project.
2. **Strength slider:** Light / Medium / Strong (default Medium).
3. **Preserve room tone toggle:** when ON, keeps subtle ambient signature to avoid the "fake studio" feel.
4. **Per-segment application:** apply only to a selection (e.g., guest track but not host track).
5. **Multitrack support:** different settings per speaker track.
6. **Before/after preview:** always available; user toggles to compare.
7. **Undo / revert** at any time.
8. **Batch apply:** apply to multiple imported files at once.
9. **Audio types handled:** background noise (HVAC, traffic, fans), room reverb / echo, low SNR, hum.
10. **Visual indicators:** the audio waveform shows pre/post comparison; spectral health summary visible ("Removed: -18dB background, -6dB reverb").
11. **Tier gating:** Free 5 min/mo; Creator 60 min/mo; Pro+ unlimited.

### UX flow
1. Editor → select audio clip → "Enhance with Studio Sound."
2. Choose strength → Preview → apply.
3. Before/after toggle persistent in editor.
4. User can revert or adjust at any time.

### Edge cases & error handling
- **Very poor input (intelligibility lost):** flag "Source quality too low for clean recovery — preview below" and let user decide.
- **Music + voice mixed:** allow but warn the music may be affected.

### Sentiment guardrails
- **P6:** strength slider + preserve mode + reversibility specifically address the "over-processed robotic" complaint.
- **P10:** before/after always visible; never silent.

### Acceptance criteria
- 90% of standard noisy-input benchmarks (bedroom, café, conference room) judged "broadcast-acceptable" at Medium strength.
- Over-processing complaints <5% of usage (sampled).

### Dependencies
- None (independent feature).

### Out of scope
- Music remastering (different problem; out of scope).

### Metrics
- Applications per project.
- Strength-distribution usage.
- Revert rate (high revert → quality issue).

---

## F4.2 — Filler Removal + Shorten Gaps + Edit for Clarity + Remove Retakes

**Release:** R1
**Summary:** One-click cleanup passes: Remove Filler Words (um/uh/like), Shorten Gaps (silences), Edit for Clarity (content-level cuts of digressions), Remove Retakes (keep best take of repeated lines).

### Problem statement
Reddit-loved "one-button magic" moments. Edit for Clarity is the differentiator — content-level, not just word-level.

### Primary personas
All personas; especially podcasters, marketers, course creators.

### User stories
- As a podcaster I want "um" and "uh" removed in one click without artifacts.
- As an editor I want awkward silences shrunk but not erased entirely.
- As a content creator I want digressions and tangents auto-cut.
- As anyone with multiple takes I want the AI to pick the best take and discard the rest.

### Functional requirements
1. **Remove Filler Words:**
   - Configurable list: um, uh, like, you know, sort of, kind of, basically, literally, right, so. User can add/remove.
   - Per-language filler lists.
   - One-click apply; smart crossfades hide cuts.
   - Show count: "Removed 217 fillers, saving 1:42."
2. **Shorten Word Gaps:**
   - Target gap length adjustable (default: cap at 0.5s).
   - "Don't shorten gaps longer than X" to preserve intentional pauses.
3. **Edit for Clarity:**
   - AI identifies tangents, digressions, repetitions, self-corrections.
   - Returns a diff in the transcript: strikethrough on suggested cuts.
   - User accepts all / per-cut accept/reject.
   - Configurable aggressiveness: Light / Standard / Aggressive.
4. **Remove Retakes:**
   - AI detects repeated lines (same content multiple times).
   - Picks the best take (latest by default; user can configure heuristic: latest / clearest / least-flubbed).
   - Returns diff.
5. **Combined "Auto Polish" mode:** runs all 4 in sequence with user-defined settings.
6. **Per-track / per-segment apply.**
7. **All operations reversible from a single undo step.**

### UX flow
1. Editor → Cleanup panel → choose pass(es) → preview diff → apply.
2. Each pass shows summary ("Cut 1:42 of fillers, 3:15 of gaps, 8 minutes of digressions").
3. User accepts all or per-change.

### Edge cases & error handling
- **Filler word that's part of a quote ("she said 'um, no'"):** AI considers context; conservative mode skips quoted speech.
- **Speaker uses "like" semantically ("it's like that"):** AI distinguishes filler from comparator.

### Sentiment guardrails
- **P10:** every cut shown as diff before commit.
- **P5:** Edit for Clarity must produce a coherent edit, not a chopped Frankenstein.

### Acceptance criteria
- Filler removal: 95% of fillers caught, <2% false positives.
- Edit for Clarity: user acceptance rate ≥70% of suggested cuts on sample.
- All 4 operations have visible undo.

### Dependencies
- F2.1 (transcript), F2.4 (transcription).

### Metrics
- Time saved per project (visible to user).
- Acceptance rate per cleanup pass.

---

## F4.3 — Eye Contact Correction

**Release:** R3
**Summary:** AI subtly redirects the speaker's gaze toward the camera even when they were looking at notes or another screen.

### Problem statement
Descript-exclusive vs most competitors. Salespeople, async-video users, course creators rely on it.

### Primary personas
Sales Founder, Solo Creator, L&D Lead.

### User stories
- As a salesperson I want my eyes to look at the camera even when I'm reading notes.
- As a course creator I want consistent eye contact across long lectures.
- As a careful user I want to control the strength so it doesn't look uncanny.

### Functional requirements
1. **Per-clip apply** on any video clip with a visible face.
2. **Strength slider:** Off / Light / Medium / Strong.
3. **Preview before commit.**
4. **Failure detection:** if the AI flags a clip where correction would look unnatural (extreme angle, occlusion), it warns and doesn't apply.
5. **Multiple faces:** apply to selected face(s) only; default to most prominent.
6. **Reversible per clip.**

### UX flow
1. Select clip → Enhance → Eye Contact → preview → apply.

### Edge cases & error handling
- **Extreme head turn:** AI declines; user notified.
- **Glasses with reflections:** lower confidence; warn.

### Sentiment guardrails
- **P10:** preview before apply; reversible.

### Acceptance criteria
- "Uncanny" rating <10% on sample.
- Failure detection blocks bad applications.

### Dependencies
- None.

### Out of scope
- Real-time eye contact during recording (R5+).

### Metrics
- Apply rate per recording.
- Strength distribution.

---

## F4.4 — Green Screen / Background Removal

**Release:** R3
**Summary:** AI subject isolation without a physical green screen. Replace background with stock, custom image, blur, or another video.

### Problem statement
Standard expectation. CapCut and Descript both have it.

### Primary personas
All personas.

### User stories
- As a creator I want to remove my messy room and replace it with a branded backdrop.
- As a marketer I want my product demo to have a clean white background.

### Functional requirements
1. **Per-clip apply** on any video clip with a person.
2. **Background replacement options:** stock images, brand image, solid color, branded brand-kit BG, video background, blur.
3. **Edge refinement:** hair edges, motion edges handled cleanly.
4. **Reverse-cutout option:** keep background, remove person (rare but useful).
5. **Animated backgrounds** supported (e.g., looped gradient).
6. **Preview live as user picks BG.**

### UX flow
1. Select clip → Background → pick replacement → preview → apply.

### Edge cases & error handling
- **Multiple people:** all isolated as foreground.
- **Difficult edges (transparent objects, fast motion):** AI warns when edge quality is low.

### Sentiment guardrails
- **P6:** reversible.

### Acceptance criteria
- Edge quality "broadcast-acceptable" on 90% of standard input on sample.

### Dependencies
- F8.1 (Brand Kit for branded backgrounds).

### Metrics
- Applications per project.
- Background type distribution.

---

## F4.5 — Automatic Multicam + Center Active Speaker

**Release:** R3
**Summary:** When there are multiple camera angles or speakers, AI auto-cuts between them based on who's talking, keeping the active speaker centered.

### Problem statement
Multi-guest recordings produce N tracks; AI assembling the best cut is a huge time-saver.

### Primary personas
Solo Creator (podcaster with video), In-house Marketer (interviews).

### User stories
- As a podcaster recording in Rooms I want the final video to auto-cut between guests based on who's speaking.
- As an interviewer I want the active speaker to be centered with the listener visible in side panel.

### Functional requirements
1. **Source detection:** identifies all speaker tracks in a multitrack project.
2. **Auto-cut:** generates a primary edit cutting between speakers based on voice activity + a configurable hysteresis (don't cut more than once per N seconds).
3. **Layout options:**
   - Single speaker fullscreen.
   - Active speaker + others as PIP gallery.
   - Split-screen for back-and-forth.
4. **Cinematic mode:** subtle re-framing and zoom on the active speaker.
5. **Manual override:** user can override any cut.
6. **Per-segment customization:** different layout per scene.

### UX flow
1. Multi-guest project → "Auto-multicam" → choose layout → preview → apply → tweak as needed.

### Edge cases & error handling
- **Overlap / cross-talk:** show both speakers in split-screen.
- **One mic dropped:** fall back to remaining tracks.

### Sentiment guardrails
- **P10:** auto-cut is a draft; user controls final.

### Acceptance criteria
- Auto-cut acceptance rate ≥70% on sample multi-guest projects.

### Dependencies
- F1.3 (Rooms) typically; works on any multitrack input.

### Metrics
- % of multi-guest projects using auto-multicam.

---

## F4.6 — Profanity Censor (with Caption Masking)

**Release:** R2
**Summary:** Three audio modes (classic bleep / silent mute / volume-reduced) PLUS caption masking (symbols, asterisks, underscores).

### Problem statement
Choppity-only differentiator. Crucial for ad-safe podcasts, family-friendly content, religious/educational verticals.

### Primary personas
Solo Creator (clean version), Vertical Power User (church, education), Agency.

### User stories
- As a podcaster I want a "clean" version of my episode for ad-safe distribution.
- As a church media lead I want all profanity automatically masked.
- As an educator I want symbols in captions where profanity occurred.

### Functional requirements
1. **Profanity list:** built-in list per language; user can extend (mark additional words as profanity) or reduce (whitelist).
2. **Audio modes:**
   - **Bleep:** classic 1kHz bleep tone covers the word.
   - **Mute:** silent gap.
   - **Volume-reduced:** word fades to 10% volume.
3. **Caption masking:**
   - Symbols (●●●●), asterisks (****), underscores (____), first-letter + asterisks (s***), or custom.
4. **Detection:** transcript-driven; high accuracy required since these are obvious mistakes.
5. **Per-word override:** user can unmask specific words.
6. **Two output versions:** keep both clean and explicit versions in the project; export either.
7. **Per-platform export:** "TikTok = always clean; LinkedIn = always clean; YouTube = explicit OK."

### UX flow
1. Editor → Cleanup → Profanity → choose modes → preview → apply.
2. Diff shows every detected word; user accepts/rejects per word.
3. Export options include both versions.

### Edge cases & error handling
- **False positives (e.g., place names that sound profane):** glossary override.
- **Profanity in another language:** per-language detection lists.

### Sentiment guardrails
- **P10:** per-word override; never blindly mute.

### Acceptance criteria
- 98% recall on standard profanity list per language.
- <1% false positive on sample non-profane corpus.

### Dependencies
- F2.4 (Transcription).

### Metrics
- Adoption rate.
- Per-platform clean-export rate.

---

## F4.7 — Lip-Sync Regeneration (Video Regenerate)

**Release:** R3
**Summary:** When user changes a word in the transcript, AI regenerates the speaker's mouth movement to match the new word — not just audio.

### Problem statement
Closes the loop for text-based editing on talking-head video. Without this, fixing a misspoken word leaves the mouth visibly wrong. Descript ships beta; we ship polished.

### Primary personas
Solo Creator, L&D Lead, Sales Founder.

### User stories
- As a podcaster I want to fix a misspoken price without re-recording, and have the speaker's mouth match.
- As an L&D lead I want to update course content as our product changes, without re-shooting.

### Functional requirements
1. **Trigger:** user replaces a word in the transcript → "Regenerate lip-sync for this segment?" prompt.
2. **Voice clone integration:** uses the user's voice clone (F3.4) for audio replacement.
3. **Visual regeneration:** AI re-renders the speaker's mouth for the affected segment with realistic lip movement matching the new word.
4. **Boundary smoothing:** transitions in/out of the regenerated segment are seamless.
5. **Length limit:** initially short segments (≤5 sec); R4+ longer.
6. **Preview before commit.**
7. **Watermark:** generated segment watermarked invisibly for provenance.

### UX flow
1. User edits transcript word → "Regenerate lip-sync?" → Yes → 30–60s processing → preview → accept.

### Edge cases & error handling
- **Speaker is off-camera:** audio-only regeneration; no lip-sync needed.
- **Extreme head angle:** AI may decline; warn user.

### Sentiment guardrails
- **P8:** watermarking + audit log; cannot be used to put words in someone's mouth they didn't say without consent.
- **P10:** preview always.

### Acceptance criteria
- ≥80% of regenerations rated visually acceptable.
- Watermark detectable in 100% of outputs.

### Dependencies
- F3.4 (Voice Clone).

### Out of scope
- Long-form lip-sync regeneration (R5+).

### Metrics
- Regenerations per workspace.
- Acceptance rate.

---

## F4.8 — AI Relight + AI Auto-Color

**Release:** R3
**Summary:** AI relighting (fix bad lighting), AI auto color correction (exposure + saturation balance).

### Problem statement
CapCut + HipClip have lighting tools; high value for tutorials and async-video recorded in poor lighting.

### Primary personas
Solo Creator, Sales Founder, In-house Marketer.

### User stories
- As a sales rep I want my underlit office video to look professional.
- As a creator I want auto color balance across multiple clips for consistency.

### Functional requirements
1. **AI Relight:**
   - Per-clip apply; AI estimates light sources and adds virtual fill / key.
   - Direction selector: front, side, top, custom.
   - Strength slider.
2. **AI Auto-Color:**
   - Per-clip: exposure, contrast, white balance, saturation normalized.
   - Per-project: match colors across all clips for consistency.
3. **Skin-tone preservation:** auto-color never makes faces look unnatural.
4. **Before/after preview.**
5. **Reversible.**

### UX flow
1. Select clip → Enhance → Relight or Auto-Color → preview → apply.

### Edge cases & error handling
- **Extreme low light:** AI warns recovery limited.

### Sentiment guardrails
- **P10:** preview always; reversible.

### Acceptance criteria
- ≥80% of low-light samples improved meaningfully.
- Skin-tone preservation 100% on diverse skin tones sampled.

### Dependencies
- None.

### Metrics
- Apply rate.

---

## F4.9 — AI Inpainting / Object Remove / People Remove / Text Remove

**Release:** R3
**Summary:** Click on a person/object/text in a video frame and have it removed cleanly across the whole clip.

### Problem statement
CapCut owns these; very high "wow" factor. Marketing/agency users use them constantly (remove a logo, remove a passerby, remove old text).

### Primary personas
In-house Marketer, Agency, Solo Creator.

### User stories
- As a marketer I want to remove an old logo from existing footage and replace with new branding.
- As a creator I want to remove a passerby from my video shot.
- As an editor I want to remove on-screen text and replace with updated copy.

### Functional requirements
1. **Object remover:** click on an object → AI tracks it across frames → removes with clean background fill.
2. **People remover:** select a person → AI removes across clip; reconstructs the background behind them.
3. **Text remover:** click on text → AI identifies the text region → removes and fills.
4. **Region inpainter:** brush a region → AI fills with surrounding-context-appropriate content.
5. **Reverse:** add an object (paste a generated object into a region).
6. **Preview frame-by-frame.**

### UX flow
1. Select clip → Inpaint tools → click target → preview → apply.

### Edge cases & error handling
- **Object moves a lot or is partially occluded:** AI may produce artifacts; offer manual frame-by-frame adjustment.
- **Reflective surfaces / mirrors:** flag low confidence.

### Sentiment guardrails
- **P6:** reversible per clip.

### Acceptance criteria
- ≥75% of removals on standard tasks rated "broadcast-acceptable."

### Dependencies
- None.

### Metrics
- Apply rate by tool.

---

## F4.10 — AI Style Transfer

**Release:** R3
**Summary:** Convert video to anime, 3D cartoon, oil painting, sketch, etc.

### Problem statement
Consumer-creator delight feature. Lifts free-tier engagement and viral marketing.

### Primary personas
Solo Creator (TikTok-native), Vertical Power User (gaming, comedy).

### User stories
- As a creator I want my video in anime style for a TikTok trend.
- As an entertainer I want oil-painting style for an art project.

### Functional requirements
1. **Style library:** 20+ styles (Anime, 3D Cartoon, Pixar, Oil Painting, Pencil Sketch, Watercolor, Comic, Cyberpunk, Vaporwave, etc.).
2. **Per-clip apply.**
3. **Strength slider:** Subtle / Full transformation.
4. **Frame-rate aware:** maintain smoothness; no flicker.
5. **Preview before apply.**
6. **Reversible.**

### UX flow
1. Select clip → Effects → Style Transfer → pick style → preview → apply.

### Edge cases & error handling
- **Identity drift across frames:** AI uses temporal consistency to avoid flicker.

### Sentiment guardrails
- **P10:** preview; reversible.

### Acceptance criteria
- 20+ styles; ≥80% rated visually consistent on sample.

### Dependencies
- None.

### Metrics
- Style usage distribution.

---

*End of Pillar 4 — Enhance specifications.*
