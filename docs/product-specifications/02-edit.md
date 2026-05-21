# Pillar 2 — Edit (detailed specifications)

> **Pillar question:** "How do I cut, restructure, polish what I recorded?"
> **Release coverage:** R1 (F2.1–F2.7), R2 (F2.8 templates depth)

---

## F2.1 — Text-Based Editing (Transcript = Video)

**Release:** R1
**Summary:** The auto-generated transcript IS the editing surface. Deleting a word in the transcript removes the corresponding audio/video; copy-paste rearranges narrative; backspace cuts; speaker labels are sticky.

### Problem statement
Timeline-based editing is the #1 reason people don't make video. Reddit consistently calls text-based editing "the killer feature" and "the tool that changed how they edit." Table-stakes for any modern AI video studio.

### Primary personas
All personas — every persona uses this surface.

### User stories
- As a podcaster I want to delete a 3-minute tangent by selecting paragraphs and pressing Delete.
- As a marketer I want to rearrange the order of guest answers by cut-paste in the transcript.
- As an editor I want word-level precision — click a word, hit play, hear it; double-click a word, edit just that word.
- As a returning user I want my cuts to never reveal "this was edited" — smart crossfades hide every cut.
- As a collaborator I want my teammates' edits to merge with mine without overwriting.

### Functional requirements
1. **Editable transcript surface:** the transcript is the primary editing canvas; every word is a clickable, selectable, deletable unit linked to its audio/video timestamps.
2. **Cut, copy, paste, delete:** standard keyboard shortcuts (Ctrl/⌘+X/C/V/Backspace). Deleting words deletes underlying media. Pasting words from elsewhere in the transcript moves the underlying media.
3. **Selection respects natural boundaries:** double-click selects word; triple-click selects sentence; quadruple-click selects paragraph; Cmd+A selects all.
4. **Word-level click-to-play:** clicking any word seeks the playhead to that word; Space toggles play.
5. **Smart crossfading:** every cut auto-applies a 30–80ms audio crossfade to hide the seam. User can disable per-project ("Hard cuts only").
6. **Tidy edits preference:** an option to round cuts to the nearest natural pause/breath boundary (so cuts feel less jagged). Default ON for podcast template; OFF for tight comedy template.
7. **Speaker labels:** auto-detected; rename across all occurrences in one click; label color customisable.
8. **Filler words highlighted:** "um/uh/like/you know" displayed in a subtle dimmed style; user can configure visibility.
9. **Strikethrough mode:** instead of hard delete, user can strike a word to "preview a cut" — see the resulting video before committing.
10. **Sync with timeline:** any edit in the transcript is reflected in the timeline in real-time and vice versa. Editing in either surface is non-destructive to the other.
11. **Undo / Redo:** full undo stack per session, ≥100 steps.
12. **Search (Cmd+F):** find any text in the transcript; matches highlighted; navigate with arrows.
13. **Find & Replace:** especially useful for replacing repeated misspellings of brand terms.
14. **Comments at word level:** click a word → Comment → @mention a teammate.
15. **Disfluency report:** sidebar shows count of fillers, gaps, retakes — one-click remove (links to F4.2).

### UX flow
1. User opens a project → transcript visible in the main pane, timeline below, preview top-right.
2. User reads, deletes paragraphs they don't want, types correction for a misheard word.
3. Each action updates the timeline and preview live.
4. User hits Cmd+S (autosaved) → leaves; returns; project intact.

### Inputs / Outputs
- **Inputs:** auto-transcribed media (from F2.4).
- **Outputs:** an edited transcript that maps deterministically to an edited timeline.

### Edge cases & error handling
- **Mis-transcribed word with wrong timestamp:** user can manually adjust the timestamp anchor of a word (right-click → "Realign timing").
- **Multiple speakers talking over each other:** transcript shows overlapping speakers with offset visual; user can edit either independently.
- **User pastes a word from outside the transcript:** disallow — words must originate in the project's media (otherwise underlying audio doesn't exist). Surface clear error.
- **Long transcripts (10+ hours):** virtualised rendering — performance never degrades below 60fps scroll.
- **Edit during transcription-in-progress:** allow; new transcript lines append; user's existing edits preserved.

### Sentiment guardrails
- **P10:** transcript edits are reversible; preview-before-commit available via strikethrough mode.
- **P1:** must scale to 10-hour transcripts without lag (Descript's complaint).

### Acceptance criteria
- Scroll, click, edit performance at 60fps for transcripts up to 12 hours.
- Cuts inaudible in 95% of cases (blind A/B vs a human-edited reference).
- Round-trip with F2.2 timeline: edit in either reflects in the other within 200ms.

### Dependencies
- F2.4 (Transcription).
- F4.x (Smart audio crossfade infrastructure).

### Out of scope
- Editing video frame-level by clicking the transcript (use timeline F2.2 for that).
- Auto-rewriting text to fix grammar (that's F6.x AI Copywriter for transformed outputs, not source).

### Metrics
- % of edits done in transcript vs timeline (we want transcript to be the dominant surface).
- Edit-action-to-rendered-preview latency.
- User-reported "audible cut" rate (sampled).

---

## F2.2 — Multi-Track Timeline Editor

**Release:** R1
**Summary:** A full professional multi-track timeline: video, audio, captions, music, B-roll, layers. Frame-precise trim, ripple delete, color correction, audio ducking. Round-trips to Premiere / FCP / Resolve via XML/AAF/EDL.

### Problem statement
Reddit complaint about Descript: "Not a pro video editor — lacks keyframing, effects, precise multitrack control." The 20% of jobs that need frame precision lose pro creators if absent.

### Primary personas
Solo Creator (advanced), Agency, L&D Lead (precise course timing), Newsroom.

### User stories
- As a video editor I want to scrub frame-by-frame and trim to a specific frame.
- As a sound editor I want to duck music under voice automatically.
- As a colourist I want per-clip color adjustments (exposure, contrast, saturation, white balance).
- As an editor I want to keyframe opacity, position, scale on any clip.
- As a creator I want to round-trip my timeline to Premiere if I outgrow our editor for one project.

### Functional requirements
1. **Tracks:** unlimited video layers, unlimited audio layers, separate caption layer, separate music layer, B-roll layer.
2. **Clip operations:** trim, split (S key), ripple delete, slip, slide, roll edits.
3. **Frame precision:** play at variable speed; J/K/L scrubbing; arrow keys frame-step; numpad goto-timecode.
4. **Keyframes:** opacity, position, scale, rotation, blur, color tint on every video clip; volume, pan on every audio clip.
5. **Color correction (per-clip):** exposure, contrast, highlights, shadows, saturation, vibrance, white balance, LUT slot.
6. **Color presets:** save and reuse per-project LUT-equivalent presets.
7. **Audio ducking:** select a voice track + music track → "Duck music under voice" → music auto-attenuates by configurable dB during voice presence.
8. **Audio EQ + compression presets:** "Podcast voice," "Music master," "Voiceover," "Phone-quality cleanup" presets per clip.
9. **Markers:** drop named markers on the timeline; visible to collaborators.
10. **Lock / hide tracks:** lock prevents edits; hide removes from preview.
11. **Magnetic timeline option:** clips snap to each other and to playhead by default; can be disabled.
12. **Round-trip export:** Final Cut XML, Premiere XML/AAF, DaVinci Resolve XML/EDL, Avid AAF, Pro Tools/Logic OMF audio-only.
13. **Render preview while editing:** background renders updates; instant scrub on most edits.
14. **Snap-to-transcript-word:** scrubbing the timeline visually highlights the word in the transcript and vice versa.

### UX flow
1. User opens a project → toggle "Timeline view" (or split-view with transcript).
2. Drag clips around, trim, add color, keyframe.
3. Save preset → drop on other clips.
4. Export to Premiere → file opens cleanly in Premiere with all tracks intact.

### Inputs / Outputs
- **Inputs:** source media; edits.
- **Outputs:** an edit decision list (EDL/XML) usable internally and exportable to NLEs.

### Edge cases & error handling
- **Very dense timelines (100+ clips):** virtualised rendering; never drop below 30fps on a typical laptop.
- **Conflicting edits between transcript and timeline:** last-write-wins; show conflict toast.
- **Export to Premiere with effects Premiere doesn't have:** flatten those effects to media in the export; clearly note in export summary.

### Sentiment guardrails
- **P6:** every operation reversible; non-destructive on source media.
- **P1:** large project performance is the key Reddit complaint — must hold up.

### Acceptance criteria
- Timeline performance ≥30fps with 200 clips loaded.
- Round-trip XML to Premiere loads with ≥95% of edits intact.

### Dependencies
- F2.1 (transcript sync).
- F4.x (audio processing).

### Out of scope
- Plugin marketplace (we are not Premiere; R5+).
- 3D / motion graphics suite (we are not After Effects).

### Metrics
- % of projects that touch the timeline view at least once.
- Round-trip-to-NLE export volume per month.

---

## F2.3 — Scenes & Storyboard Canvas

**Release:** R1
**Summary:** A "slide deck" view of the video where each scene is a card with layout, text overlays, media, and transitions. Drag scenes to reorder. Stock + custom layout packs.

### Problem statement
Many videos (tutorials, courses, product demos, marketing explainers) are mentally structured as a sequence of scenes/slides. The timeline is the wrong canvas for that thinking; PowerPoint is the wrong tool for video.

### Primary personas
In-house Marketer, L&D Lead, Sales Founder, Solo Creator (educational).

### User stories
- As a marketer I want to build my video as a sequence of branded scenes, not a timeline.
- As a course creator I want my video to look like a slide deck with talking head + text + B-roll per scene.
- As a sales rep I want to drop a "Pricing" scene into my demo from the brand kit's template library.
- As any user I want "Quick Design" to one-click format my raw recording into branded scenes.

### Functional requirements
1. **Scene unit:** a contiguous segment of the project with a layout, optional text overlays, optional B-roll, transition into / out of, and duration tied to the underlying media.
2. **Layouts:** templated arrangements (talking head + caption, talking head + B-roll PIP, talking head + 3-bullet list, full B-roll, split screen, etc.). 30+ stock layouts at launch.
3. **Layout packs:** stock packs (Marketing, Tutorial, Podcast Clip, Course); each pack is a coordinated set of layouts.
4. **Custom layouts:** save any arrangement as a custom layout; share with team via brand kit.
5. **Quick Design:** one-click "format this project into scenes" — AI identifies natural scene breaks and applies layouts.
6. **Smart transitions:** auto-add appropriate transitions (fade / cut / wipe / scale) based on scene type. User can override per transition.
7. **Center Active Speaker:** when multiple speakers, AI keeps the active speaker centered in the layout.
8. **Animations:** stock entry/exit/emphasis animations on overlays; custom animation curves savable.
9. **Scene reorder:** drag to reorder; underlying media re-cuts deterministically.
10. **Per-scene brand kit override:** a scene can use a different layout pack than the project default.

### UX flow
1. User toggles "Scenes view" → cards visible in a horizontal storyboard.
2. User clicks **Quick Design** → AI proposes a scene structure with applied layouts → user accepts or tweaks.
3. User drags a scene to reorder, applies a different layout from a sidebar, drops B-roll into a placeholder.
4. Switching to timeline view shows the same edits, with scene boundaries as colored regions.

### Edge cases & error handling
- **Quick Design on a 2-hour video:** chunk into manageable sub-storyboards rather than 200 scenes on one canvas.
- **A custom layout uses a deleted font:** fall back to default brand font; surface advisory.

### Sentiment guardrails
- **P6:** scenes are non-destructive on source; can always switch back to timeline.
- **P5:** Quick Design outputs publishable result 80%+ of the time, otherwise it's a parlor trick.

### Acceptance criteria
- Quick Design completes for a 30-minute video in ≤2 minutes and produces a usable first draft.
- Drag-reorder of any scene reflects in transcript and timeline within 200ms.

### Dependencies
- F2.1, F2.2, F8.1 (Brand Kit).

### Out of scope
- Full motion-graphics authoring (R5+ via partner).

### Metrics
- % of projects that use scenes view.
- % of projects where Quick Design was accepted with <3 edits.

---

## F2.4 — Transcription

**Release:** R1 (25+ languages) → R2 (50+) → R3 (with glossary, do-not-translate list)
**Summary:** Automatic, multi-language ASR with speaker diarization, multitrack support, custom glossary for brand terms, and "do not translate" list.

### Problem statement
Underlies every text-based feature in the product. Quality bar must match or exceed Descript (ElevenLabs Scribe v2 / Rev v2-class accuracy). Reddit pain: ASR degrades on accents / non-English / overlapping speech.

### Primary personas
All personas.

### User stories
- As a podcaster I want my interview transcribed automatically in under 2 minutes for a 60-minute episode.
- As a multi-language creator I want accurate transcription in Spanish, French, Hindi, Japanese.
- As a team I want our brand names ("Acme," "BluePill") never misspelled in transcripts.
- As a translator I want our exec names not translated into other languages.
- As a podcaster with multitrack recordings I want each speaker's track transcribed separately for accuracy.

### Functional requirements
1. **Auto-transcription on import / capture.**
2. **Languages at launch:** 25+ (Catalan, Croatian, Czech, Danish, Dutch, English-US/UK/AU/IN, Finnish, French-FR/CA, German, Greek, Hindi, Hungarian, Italian, Latvian, Lithuanian, Malay, Norwegian, Polish, Portuguese-BR/PT, Romanian, Slovak, Slovenian, Spanish-US/ES/LatAm, Swedish, Turkish).
3. **Language auto-detect:** for files without specified language; user can override.
4. **Speaker diarization:** 8+ speakers per session; auto-labeled "Speaker 1, Speaker 2..."; user renames once and labels persist.
5. **Speaker Detective:** click an unknown speaker → app plays 5 representative clips to help user identify and label.
6. **Multitrack transcription:** when a recording has separate tracks per speaker, transcribe each track independently and merge into a unified transcript (eliminates cross-talk errors).
7. **Custom glossary (per workspace):** list of brand terms, product names, exec names, jargon. ASR weights these in; transcripts honor them.
8. **Do-not-translate list:** items here remain in original language in all dubbing / translation outputs.
9. **Confidence scoring:** low-confidence words visually marked (subtle underline). Click → see top 3 alternatives → swap.
10. **Re-transcribe action:** user can request re-transcription with a different language or after editing the glossary.
11. **Punctuation + capitalization:** automatic; configurable per project (e.g., "All caps for ALL CAPS PERSON").
12. **Profanity handling:** option to mask, asterisk, or leave verbatim.

### UX flow
1. Media imported → "Transcribing in [language] — 35% complete" progress.
2. Transcript appears with speakers, punctuation, low-confidence markers.
3. User adds brand term to glossary → "Re-transcribe with glossary?" prompt.
4. User clicks a low-confidence word → top alternatives → picks correct one.

### Inputs / Outputs
- **Inputs:** audio (single or multitrack), language preference, glossary, DNT list.
- **Outputs:** time-stamped transcript with speakers, punctuation, confidence per word.

### Edge cases & error handling
- **Mixed-language content:** detect dominant language; surface "Mixed languages detected — segment-level transcription available" option.
- **Very poor audio:** still produce best-effort transcript with high low-confidence marker density; suggest running Studio Sound (F4.1) first.
- **Multitrack files with empty tracks:** ignore silent tracks gracefully.

### Sentiment guardrails
- **P9:** top 15 languages held to documented accuracy benchmarks; we publish WER (word error rate) numbers per language per quarter.
- **P4:** every transcript word links to its source timestamp — that's how F4 verifiability works.

### Acceptance criteria
- Median transcription time ≤2× real-time on a 60-minute file (i.e., ≤30 minutes wall-clock).
- WER ≤7% on clean English audio; ≤15% on clean top-15 non-English; published per language.
- Custom glossary terms honored ≥95% of the time after applied.

### Dependencies
- F1.7 (import).
- F4.1 (Studio Sound) for low-quality input handling.

### Out of scope
- Real-time live transcription (R5+; meeting-tool adjacent).
- Sentiment / emotion tags in transcript (R3+ as separate feature).

### Metrics
- Median ASR time per minute of audio.
- WER per language (sampled).
- Glossary adoption rate.

---

## F2.5 — Animated Captions / Subtitles

**Release:** R1
**Summary:** One-click dynamic, animated captions with stock styles, custom font/color/highlight/position, word-level highlighting, Hormozi/karaoke/bounce/pop/fade presets.

### Problem statement
Captions are why CapCut won the mass-market. Auto-on-by-default + word-level highlight + drag-to-reposition is the modern table-stakes bar.

### Primary personas
All personas; especially short-form creators.

### User stories
- As a TikTok creator I want one-click captions in Hormozi style with keywords highlighted.
- As a creator I want to drag the captions to the bottom or side without code.
- As a brand I want my captions in brand color and font.
- As a viewer I want captions readable on mobile without zooming.

### Functional requirements
1. **Caption generation:** auto-generated from transcript; appears immediately after transcription.
2. **Style library:** 20+ stock styles including:
   - Hormozi (large, all-caps, neon yellow keyword highlight)
   - Karaoke (word-by-word color fill)
   - Pop (each word pops in with bounce)
   - Fade (gentle fade per word/line)
   - Subtle (minimal, broadcast-style)
   - Custom (user-defined)
3. **Per-style controls:** font family (Google Fonts + brand fonts), size, weight, color, stroke/outline, shadow, background pill, line spacing, max chars per line, max lines on screen.
4. **Keyword highlighting:** auto-detect "power" words OR user list of keywords → highlight in brand color.
5. **Word-level timing:** every word shown at its spoken timestamp; not line-by-line.
6. **Drag-to-reposition:** click and drag captions on the preview canvas; live snap to safe-zone guides (top / center / bottom / above-fold-mobile / above-comment-area).
7. **Per-platform safe zones:** preset safe zones for TikTok / Instagram Reels / YouTube Shorts / X / LinkedIn.
8. **Punctuation behavior:** option to hide trailing periods, hide commas, force all-caps, etc.
9. **Emoji injection:** AI suggests relevant emojis at semantically appropriate moments (configurable density: none / sparse / rich).
10. **Editable text:** any caption word editable inline → re-syncs to audio.
11. **Multi-line captions:** user controls max 1, 2, or 3 lines per frame.
12. **Burned vs soft subtitles:** export choice — burn into video, ship as SRT/VTT sidecar, or both.
13. **Multiple language tracks:** add caption tracks in other languages (links to F5.1 Translate).
14. **Caption-only export:** export SRT/VTT without rendering video.

### UX flow
1. After transcription, captions appear in preview by default (style: "Subtle" default; user can change).
2. User picks a different style from style gallery → preview updates live.
3. User drags captions on preview to desired position; snap guides assist.
4. User adds keyword "exclusive" to highlight list → all occurrences highlighted yellow.
5. Export with burned captions.

### Edge cases & error handling
- **Very long single words / URLs:** wrap or truncate per setting; never overflow safe zone.
- **Very fast speech:** auto-shorten captions to keep readability (max chars per second cap).
- **Multi-speaker overlapping captions:** color per speaker or split-screen treatment.
- **User-defined font fails to load (missing OS font):** fallback to brand kit default with notice.

### Sentiment guardrails
- **P5:** captions look broadcast-ready without manual cleanup.
- **P11:** caption styles live in brand kit; one source of truth across projects.

### Acceptance criteria
- 95% of one-click captions on a 60-second clip pass a "no edits needed" review (sampled).
- All Caps and brand color application correct in 99% of cases.
- Drag-to-position works on iOS Safari, Chrome (mobile), and all major desktop browsers.

### Dependencies
- F2.4 (Transcription), F8.1 (Brand Kit), F5.1 (Translate).

### Out of scope
- Custom animations on per-letter motion (R5+ via partner).

### Metrics
- % of projects exporting with captions on.
- Style-distribution histogram (which styles are picked).

---

## F2.6 — AI Co-pilot ("Studio Assistant")

**Release:** R1 (foundational), enhanced in every release
**Summary:** An agentic AI that reads the script, watches the video, takes natural-language instructions, and executes multi-step edits across all pillars. Persistent chat, context picker, edit-review diff pass.

### Problem statement
Descript's Underlord is the model but Reddit shows brand awareness gap. A competitor can win the agent narrative with sharper UX, louder verifiability, and tighter human-in-the-loop.

### Primary personas
All personas.

### User stories
- As a creator I want to type "edit this down to 2 minutes focusing on pricing" and have the agent do it, then show me what changed.
- As a marketer I want to say "make this look like our brand and add captions" and have it apply Brand Kit + captions automatically.
- As a podcaster I want a persistent chat in this project so I can refer back to previous instructions.
- As a power user I want to @mention a file, scene, or timestamp to scope my request precisely.
- As a cautious user I want to see exactly what the AI changed before any edit is committed.

### Functional requirements
1. **Chat surface:** a side panel in the editor; conversation history per project; auto-titled sessions.
2. **Cross-device sync:** chat history follows the user across web, desktop helper, and mobile.
3. **Context picker (`@`):** type `@` to attach context: `@file`, `@scene`, `@timestamp`, `@layer`, `@brandkit`. Multiple `@` items per message.
4. **Capability map:** the agent can take any action a user can take in the product. Examples:
   - Cut, paste, trim, reorder.
   - Apply Brand Kit / Layout / Caption Style.
   - Generate clips, summaries, social posts.
   - Trigger Studio Sound, filler removal.
   - Translate, dub.
   - Generate B-roll.
   - Schedule a post.
   - Comment / @mention a teammate.
5. **Multi-step planning:** the agent decomposes a request into a sequence of actions, executes them, and reports.
6. **Edit-review diff pass:** after every editing turn, a visible diff panel shows: what was deleted, what was added, what was reordered. User clicks "Accept all," "Reject all," or per-change accept/reject.
7. **Reasoning mode toggle:** simple tasks use a fast model; complex tasks (script writing, multi-step edits, episode planning) use a reasoning model. User can force either.
8. **Persistent memory:** the agent learns user preferences over sessions (see F6.3 — "AI remembers your workflows").
9. **Custom Models (Enterprise):** trained on the org's own best content; identified by name in the model picker.
10. **Templates entry point:** the templates gallery (F2.7) is one-click "Apply this template via Co-pilot."
11. **Verifiability:** when the agent cites a moment ("at 12:43 you mentioned pricing"), it links to the timestamp; when it quotes the user, it shows the source.
12. **Refusal behavior:** if asked to do something destructive (e.g., delete a whole project), the agent refuses and asks for explicit confirmation through a different surface.
13. **"What can you do?" surface:** users can ask the agent to list its current capabilities; the answer is grounded in the actual feature set, not invented.
14. **Tool calls visible:** when the agent applies "Studio Sound" or "Add Captions," that action is logged in the chat with a click-to-undo.

### UX flow
1. User opens project → side panel shows Co-pilot chat.
2. User types: "Turn my CEO's rant about AI productivity into a thought-leadership video. Add captions, use our brand kit, target 90 seconds."
3. Agent confirms its plan: "1. Identify the AI/productivity segment (00:08:12–00:22:45); 2. Cut to 90s focusing on top quotes; 3. Apply Brand Kit; 4. Add Hormozi captions; 5. Generate hook overlay. Proceed?"
4. User clicks Proceed → progress visible step by step.
5. Diff panel appears: green = added, red = removed, yellow = reordered. User accepts.
6. Result is in the editor; user can continue editing manually.

### Inputs / Outputs
- **Inputs:** natural-language requests; `@` context attachments; the current project state.
- **Outputs:** executed edits with a diff; written responses; tool-call logs.

### Edge cases & error handling
- **Ambiguous request:** agent asks 1 (max 2) clarifying questions before acting.
- **Request exceeds plan capacity:** agent estimates credit cost upfront and asks for confirmation.
- **Agent makes a wrong edit:** one-click revert via the diff or via the chat message.
- **Agent hits content policy:** clear refusal with a reason and alternative suggestions.
- **Long-running task:** progress visible; user can navigate away and return; result waits for them.

### Sentiment guardrails
- **P4:** every claim the agent makes about the source is timestamped.
- **P10:** every edit shown as a diff before commit; one-click undo always available.
- **P5:** when generating copy, output is grounded in actual source content.

### Acceptance criteria
- ≥80% of single-turn requests on a benchmark of 100 user-written prompts produce a "would accept" output (rated by independent reviewers).
- Diff panel surfaces every change made; nothing happens silently.
- Persistent chat history accurate across browser sessions and devices.

### Dependencies
- Every other pillar (the agent is the horizontal layer).
- F4 (verifiability infra), F6.2 (Brand Voice), F6.3 (memory).

### Out of scope
- Voice-driven agent interaction (R4+; possible mobile feature).
- Agent that acts without user prompting (we don't auto-edit silently).

### Metrics
- Agent acceptance rate (% of edits accepted vs rejected).
- # of agent turns per project (signal of value).
- "Useful response" rating per message (thumbs).
- Reasoning-mode usage share.

---

## F2.7 — AI Templates / Workflow Gallery

**Release:** R1
**Summary:** A gallery of pre-built, customizable workflows that direct the AI Co-pilot to produce a specific kind of output (e.g., "Podcast trailer from interview," "Webinar → 5 shorts + blog + LinkedIn post").

### Problem statement
Agentic AI has a cold-start problem ("what should I ask it?"). Templates are the discoverability layer.

### Primary personas
All personas, especially new users.

### User stories
- As a new user I want to see what the AI can do without typing a prompt.
- As a power user I want to save my custom workflow as a template I can reuse.
- As a podcaster I want a template that turns my 60-min interview into a trailer + 10 clips + show notes.
- As a community member I want to share my best template with other users.

### Functional requirements
1. **Gallery:** browsable by category (Podcast / Tutorial / Marketing / Sales / Course / Sermon / Real Estate / Gaming / etc.) and by tag (Short-form / Long-form / Translate / Repurpose).
2. **Template = prompt + parameters + suggested settings:**
   - The system prompt the agent will use.
   - Parameter fields for the user (e.g., "Target length: 60s / 90s / 2min").
   - Suggested settings (e.g., "use Brand Kit X").
3. **Customize before apply:** user can edit any field before launching.
4. **One-click apply:** "Use this template" → opens Co-pilot with the prompt pre-filled and parameters ready.
5. **Save as template:** any successful Co-pilot session can be saved as a new template, shared to team or community.
6. **Community submissions:** users can submit templates to a curated public gallery; we review for quality.
7. **Team templates:** workspaces can have private templates only visible to the team.
8. **Featured / trending:** editorial slots highlight new and high-quality templates.
9. **Compatibility checks:** template requires Brand Kit / specific features → if not available on user's plan, show clearly.

### UX flow
1. User opens **Templates** → browses gallery.
2. Picks "Webinar → 5 shorts" → reads description, sees example output.
3. Customizes target length and caption style → clicks **Use template**.
4. Co-pilot opens with prefilled prompt → user adds the source video via `@file` → executes.

### Edge cases & error handling
- **Template references a deprecated capability:** surface warning; template is hidden from gallery if more than 30 days deprecated.
- **User on free tier without required feature:** show "Requires Creator tier" with clear path.

### Sentiment guardrails
- **P5:** featured templates produce publishable output 80%+ of the time (we curate hard).
- **P10:** templates always go through the Co-pilot diff flow — no silent execution.

### Acceptance criteria
- 50+ templates at R1 launch; 90+ by R2.
- "Use template" → first edit completed in ≤3 minutes for typical use cases.

### Dependencies
- F2.6 (Co-pilot).

### Out of scope
- Paid template marketplace (R5+).

### Metrics
- % of new users who run a template in their first session.
- Template adoption rate (which are popular).
- Template-completion rate (% that go to publish vs abandon).

---

## F2.8 — 90+ Workflow Templates by Vertical

**Release:** R2
**Summary:** Beyond the generic gallery, named workflow packs by industry / use case: Podcast Repurpose, Customer Interview Story, Webinar Cutdown, Sermon Pack, Real Estate Listing, Sales Outreach Loom, Course Lesson, Twitch-to-TikTok, etc.

### Problem statement
HipClip's "90+ workflows" positioning resonates because it answers "is this for me?" instantly. Each template is also an SEO landing page (and bridges to F11 Vertical Packs).

### Primary personas
All personas, especially vertical power users.

### User stories
- As a pastor I want a "Sermon → 5 shorts + devotional thread + transcript" workflow.
- As a realtor I want a "Property listing → 30-sec walkthrough + social posts + MLS export" workflow.
- As a coach I want a "Customer testimonial → quote graphic + 60-sec social + LinkedIn post" workflow.

### Functional requirements
1. **Vertical packs:** Podcast / Marketing / Sales / Course / Sermon / Real Estate / Gaming / Newsroom / Agency (+ more added over time).
2. **Each pack contains 5–15 templates:** end-to-end workflows specific to the vertical.
3. **Vertical onboarding:** during signup, ask "What kind of videos do you make?" → recommend a pack.
4. **Each template is also an SEO landing page:** "/templates/sermon-to-5-shorts" indexed for SEO with example outputs.
5. **Telemetry:** track which packs / templates convert best by vertical for refinement.

### UX flow
1. Templates gallery → filter by vertical → see the pack.
2. Try a template → result demonstrates the workflow value → user discovers other templates in the pack.

### Sentiment guardrails
- **P5:** quality bar per template; we don't ship 90 mediocre templates.
- **P11:** templates feel like one product, not 90 separate apps.

### Acceptance criteria
- 90+ templates available by end of R2.
- Each template has at least one example output published in the gallery.
- ≥30% of new signups choose a vertical pack during onboarding.

### Dependencies
- F2.7 (templates infrastructure).

### Out of scope
- Vertical-specific UI changes (those are F11 Vertical Packs).

### Metrics
- Template usage per pack.
- Vertical onboarding → activation rate.
- SEO traffic per template page.

---

*End of Pillar 2 — Edit specifications.*
