# Descript — Comprehensive Competitor Research

> **Purpose of this document.** Single source of truth for downstream agents tasked with designing / building a competing product. Every claim is sourced from the live Descript website (`descript.com` and its sub-pages) fetched on **2026-05-21**. Where the site itself is internally inconsistent or content is JS-rendered and not directly observable, that is explicitly flagged in §13 "Gaps & Uncertainties." **Do not extrapolate beyond what's stated here.**
>
> Primary sources consulted (verified):
> `/`, `/pricing`, `/ai-avatars`, `/brand-studio`, `/video-generator/ai-video-generator`, `/enterprise`, `/enterprise/learning-and-development`, `/security`, `/integrations`, `/about`, `/lenny`, `/transcription`, `/podcasting`, `/video`, `/video-editing`, `/screen-recorder`, `/screen-recording`, `/rooms`, `/captions`, `/ai-video`, `/underlord`, `/templates`, `/customers`, `/teams/media`, `/teams/tech`, `/clips`, `/ai-voices`, `/ai/youtube-description`, `/ai/podcast-show-notes`, `/ai/translate-video`, `/ai/edit-for-clarity`, `/ai/automatic-multicam`, `/ai/generate-video`, `/ai/remove-retakes`, `/eye-contact`, `/tools/green-screen`, `/studio-sound`, `/filler-words`, `/video-regenerate`, `/regenerate`, `/compare/descript-vs-{opus-clip,riverside,camtasia,google-vids,canva}`, `/use-case/{marketing-video,webinar-recording,tutorial-video,product-demo,educational-video,case-studies}`, `/sitemap.xml`.

---

## 1. Company & Product Identity

| Field | Value |
|---|---|
| Product name | Descript |
| Top-line positioning (home page) | "AI-editing for every kind of video. Direct your AI co-editor to do your video editing for you, or do it yourself with intuitive editing tools. With Descript, video editing is as easy as typing." |
| Core metaphor | "Editing video like a doc" — text-based editing via the transcript |
| Primary persona | Any team member who needs to ship video (marketing, sales, L&D, support, podcasters, creators, newsrooms) without a dedicated video team |
| Originator-of-category claim | Self-described as "the original text-based editor" (vs Riverside comparison) |
| Total funding | $100M raised |
| Lead investors | OpenAI Startup Fund, Andreessen Horowitz (a16z), Redpoint Ventures, Spark Capital |
| Notable angel investors | Daniel Gross, Devdatta Akhawe, Alex Blumberg, Jack Conte, Justine Ezarik (iJustine), Todd Goldberg, Jean-Denis Greze, John Lilly, Tobi Lutke (Shopify), Bharat Mediratta, Shishir Mehrotra (Coda), Casey Neistat, Brian Pokorny, Raghavendra Prabhu, Lenny Rachitsky, Naval Ravikant, Jay Simons, Jake Shapiro, Rahul Vohra (Superhuman), Ev Williams (Twitter/Medium) |
| Logo wall (customers shown on homepage / Lenny page) | Amazon, Canva, Salesforce, Figma, Apple, Okta, Spotify, Vox, Reuters, CBS, Microsoft, New York Times, Accenture, McKinsey, KPMG, Coca-Cola |
| Named newsroom/media customers (`/teams/media`) | BBC, New York Times, NPR, Vox, Reuters |
| Enterprise scale claim | "Over 500+ enterprises use Descript" |
| G2 social proof | 4.6 / 5 stars; 2026 "Best Software" awards in **Video Editing, AI Video Generators, Screen and Video Capture, Text to Speech** categories |
| Stated outcome claim (Enterprise page) | "2.5x more video output" with enterprise AI (note: no methodology disclosed) |
| Year AI voices launched | 2018 (early mover claim) |

---

## 2. Product Module Map (mental model)

Descript bundles ~10 distinct functional modules behind a single editor. Understanding the module boundaries is critical for any competitive build.

1. **Capture / Recording** — Screen recorder, Webcam recorder, Rooms (remote multi-guest), Control Room (producer mode)
2. **Transcription** — Multi-language ASR + multi-track + speaker diarization
3. **Editing surfaces** — (a) Text-based "doc-like" editor, (b) full multi-track Timeline, (c) Scenes/Layouts "slide deck" canvas
4. **AI co-editor (Underlord)** — agentic LLM that can take any action in the app via natural language
5. **AI media generation** — Text-to-video (via 3rd-party models), text-to-image, AI Avatars, AI Voices (TTS + voice clone)
6. **AI audio repair/enhancement** — Studio Sound, Regenerate Speech, Remove Filler Words, Remove Retakes, Edit for Clarity, Shorten Word Gaps
7. **AI video repair/enhancement** — Eye Contact, Green Screen, Automatic Multicam, Video Regenerate (lip-sync correction)
8. **Translation & dubbing** — Caption translation + AI audio dubbing in many languages
9. **Repurposing / publishing** — Create Clips, Captions, Show Notes, YouTube Descriptions, social posts, blog posts, Chapters
10. **Brand & collaboration** — Brand Studio, Custom layouts, Shareable web pages, Comments, Templates
11. **Integrations / Open API** — Import, publish, timeline export; Descript API (beta) + MCP

---

## 3. Editing Surfaces & Core Editor

### 3.1 Text-based editing (the flagship paradigm)
- Source: `/`, `/video`, `/video-editing`, `/podcasting`
- "If you know how the backspace key works, or how to copy-and-paste, then you already know how to make video in Descript."
- Workflow: ASR transcribes media → edit the transcript like a document → cuts to the transcript propagate to the underlying audio/video timeline.
- Copy/paste rearranges narrative; backspace removes words/clips; standard document mental model.
- Used across podcasts, video, screen recordings.

### 3.2 Timeline editor (multitrack)
- Source: `/video`, `/podcasting`, comparison tables
- "Complete set of professional editing tools."
- Multitrack timeline; visual navigation; precision controls for visual + audio detail; supports adjusting timing, removing cross-talk, color correction.
- Confirmed parity in compare tables: "Multi-track timeline editor ✅" on all plans.

### 3.3 Scenes & Layouts (slide-deck canvas)
- Source: `/video`, `/use-case/product-demo`, `/use-case/educational-video`
- Visual editor that treats segments as slides with layouts and animations — "the only real difference is, someone might actually watch your video."
- Stock layout packs: titles, captions, intros, slides (gallery, all plans).
- Custom layout packs: save/share with team (Hobbyist+, broader on Creator+).
- Remix gallery packs to keep brand colors/fonts consistent.
- Animations: variety of stock animations + ability to create custom animations (all paid plans).
- Smart transitions: auto-add fades/animations between scenes.
- Quick Design: auto-format single-scene projects with scenes/layouts/B-roll (Hobbyist+).
- Center Active Speaker: keep active speaker in center automatically.

### 3.4 Annotations (visual callouts)
- Source: `/use-case/tutorial-video`
- Click-and-drag arrows, circles, underlines, zooms, pans to direct viewer attention (especially for tutorials/screencasts).

### 3.5 Captions / Subtitles
- Source: `/captions`, pricing
- "Caption anything, instantly" — one-click animated captions in all plans (unlimited).
- "Dynamic captions": animated; stock styles or custom font/colors/word-highlighting/positioning.

---

## 4. Recording

### 4.1 Screen Recorder
- Source: `/screen-recorder`, `/screen-recording`, pricing
- Capture screen, webcam, mic in one tool.
- Up to **2 screens** can be shared and recorded simultaneously.
- After recording: automatic project setup; auto-imported into Rooms; auto-transcribed (without spending transcription minutes).
- Exposed via meta description: "Record your screen online for free. Capture your screen, webcam, and mic with Descript's screen recorder—then edit instantly and share with a link."

### 4.2 Rooms (remote multi-guest recording)
- Source: `/rooms`, `/podcasting`, pricing
- Crystal-clear audio + up to **4K video**, recorded locally on each participant's machine (internet glitches don't degrade quality).
- **Max 10 participants per session** (all plans).
- **Separate cloud backup recording** uploaded for every session (in addition to high-fidelity primary).
- **Guest file recovery** — if a guest's recording stalls, they can resume uploading their primary file for up to **7 days** after the session.
- **Editor comments** — timestamped comments added during recording sync into the project.
- **Recording session hours per drive per month** (gated):
  - Free: **2 hours**
  - Hobbyist: **5 hrs/mo**
  - Creator: **15 hrs/mo**
  - Business: **25 hrs/mo**

### 4.3 Control Room (producer mode)
- Source: home page (Rooms section), pricing
- Adds **off-screen producers** who can:
  - Start/stop recording
  - Use **push-to-talk** to speak to hosts/guests without being recorded themselves
- Availability: **Business plan onwards (3 producers on Business; not available below)**.

---

## 5. Transcription

Source: `/transcription`, pricing detail, changelog (via research).

- **Auto-transcription** of all imported or recorded media.
- **Multi-language ASR — 25 languages**: Catalan, Croatian, Czech, Danish, Dutch, English (US), Finnish, French (FR), German, Greek, Hindi, Hungarian, Italian, Latvian, Lithuanian, Malay, Norwegian, Polish, Portuguese (BR), Romanian, Slovak, Slovenian, Spanish (US), Swedish, Turkish. (Same on all plans.)
- **Speaker diarization**: "Detect 8+ speakers" automatically labeled.
- **Speaker Detective**: plays a clip of each unknown speaker so you can name them.
- **Multitrack transcription**: separate-track speaker labeling + accuracy improvements; can export retaining separate tracks.
- **Transcription glossary** (custom dictionary of brand terms / jargon) — Business plan and above.
- **Transcription models** (per changelog research):
  - Default: **ElevenLabs Scribe v2** (all languages)
  - Alternative: **Rev v2** (selectable; used historically as default for English; recommended for British English spellings)

Long-tail "transcription" SEO surface includes per-format conversion landing pages (sitemap):
`mp3-to-text`, `wav-to-text`, `m4a-to-text`, `aac-to-text`, `aiff-to-text`, `flac-to-text`, `pcm-to-text`, `mp4-to-text`, `mov-to-text`, `mpeg-to-text`, `m4v-to-text`, `h264-to-text`, `hevc-to-text`, plus source-context pages (`interview-to-text`, `meeting-to-text`, `lecture-to-text`, `voice-memo-to-text`, `tiktok-to-text`, `youtube-video-to-text`), plus per-language audio-to-text landing pages for ~20 languages.

---

## 6. AI Co-Editor — Underlord

Source: `/underlord`, `/templates`, home, multiple references.

**Positioning:** "The only AI video editor with the judgment you want in a collaborator, the expertise you want in a video pro, and all the tools it needs to make any video you want. This is vibe editing."

### 6.1 What Underlord can do
- Read your script, watch your video, decide what to do next.
- Make suggestions and take feedback.
- Knows everything Descript can do and how to do it ("Why go searching for answers on YouTube when you can just tell Underlord?").
- Execute multiple, tedious edits all at once.
- Tireless: redo things as many times as the user wants.
- Available as both a free-form chat and via **AI Templates** — pre-built customizable workflows that "guide Underlord to make exactly what you want."

### 6.2 Verbatim prompt examples shown on `/underlord`
- "This how-to video has good content but bad energy — HELP!"
- "Turn my CEO's rant about AI & productivity into a thought leadership video"
- "Hide my jumpcuts by adding zooms"
- "Edit this down to 2 minutes — focusing on when I talked about Freud"
- "Create a '5 common mistakes dentists make' video using the examples in this LinkedIn post"
- "Make the trailer for this webinar recording"
- "Add camera layouts every time I reference the new dashboard feature"

### 6.3 Underlord engineering details (changelog evidence)
- **Chat history**: persists per-user, per-project; syncs across browsers/devices; auto-titles past sessions.
- **Context picker (`@`)**: pin files, scenes, timestamps, layers to a request so Underlord targets exactly the right elements.
- **Edit-review pass**: after each editing turn, a second AI pass checks the diff against the request — catches unintended deletions, missed targets, overcorrections, out-of-scope operations; auto-corrects.
- **Reasoning models** are invoked for complex tasks (script writing, episode planning, multi-step edits).
- **Custom Models (Enterprise only)**: train Underlord on the company's own content — best scripts, clip-finding heuristics, social-post styles.

### 6.4 Tier availability
| Tier | Underlord access |
|---|---|
| Free | **Limited** trial |
| Hobbyist | Access |
| Creator | **Full access + 20+ AI tools** |
| Business / Enterprise | Full access + Brand-controlled |
| Enterprise | Custom Models (org-trained Underlord) |

---

## 7. AI Templates
Source: `/templates`

- Pre-built, "battle-tested" customizable workflows that direct Underlord to produce a particular kind of video.
- Gallery is showcased on the site; users can submit and get featured.
- All plans have access (Free = limited).

---

## 8. AI Media Generation

### 8.1 AI Video Generator (text-to-video)
Source: `/video-generator/ai-video-generator`, `/ai/generate-video`, `/ai-video`

- Tell Descript what you want → AI writes a script, generates a video, sets it up inside Descript for editing.
- Generate **bespoke B-roll**, whole scenes, short-form social, animated title cards, stylized background loops, scene cutaways.
- Style: **20+ pre-tested video styles** designed by Descript's design team; or user can write a prompt / drop in a reference image to create a reusable style.
- Underlord can match style to the tone of your script automatically.
- **Multi-model selector** — choose the best generative video model for each shot. Confirmed model lineup (research):
  - **Veo 3.1** (Google) — photorealistic + matching audio
  - **Pixverse 4.5**
  - **Hailuo 02**
  - **Seedance 2.0** — character consistency, motion physics, multi-shot
  - **GPT Image 2** (OpenAI) — character consistency, text-heavy images, infographic compositions
- "Generate video with the latest AI models" — **Creator tier and above** (Free / Hobbyist: not available).

### 8.2 AI Image Generation
Source: pricing ("Generate image"), `/tools/generate-ai-images`
- Prompt → image via Underlord, usable as B-roll, backgrounds, callouts.
- Available across paid tiers.

### 8.3 AI Avatars
Source: `/ai-avatars`, `/tools/ai-avatar-generator`, pricing, `/enterprise`

- **Avatar gallery**: 35+ pre-built avatars (all plans).
- **Text-prompt → avatar**: describe an avatar in words, get one (gated; explicitly **Enterprise only** on the Enterprise page, but pricing chart shows availability on lower tiers too; see §13 gap).
- **Image upload → custom avatar**: bring your own photo.
- **Avatar image stylization**: customize/stylize the avatar's look.
- **Workflow**: pick avatar → type script → avatar delivers the video.
- "Generate custom avatars from photo upload or text" — **Business plan** feature.

### 8.4 AI Voices (TTS + voice clone)
Source: `/ai-voices`, `/overdub` (legacy URL), pricing, changelog.

- **Stock AI speakers**: 25+ (Hobbyist), 60+ (Creator); named voices include Cedric, Carla, Emily.
- **Languages**: 20+ for TTS.
- **Voice clone**: create your own voice clone in as little as **~60 seconds**.
- **Restrictions**: clone YOUR OWN voice only; identity verification required; user owns the clone and decides whether to share.
- **Quality claim**: home-grown AI model (per page), not third-party TTS; trained on natural speech patterns; varies tone/rhythm/pauses (not robotic).
- **Native-sounding voices** (custom-trained per language) available in **14 languages**: English, Spanish (ES), Spanish (LatAm), French, Italian, German, Portuguese (BR), Polish, Dutch, Swedish, Hindi, Turkish, Chinese, Japanese, Korean — **Business plan only**.
- **Use cases**: voiceovers, error correction (type to re-record), narration, podcast intros, fixing mispronounced words.
- "Overdub" is the older brand name for voice cloning; the `/voice-clone` URL is a 404 (replaced by `/ai-voices`).

### 8.5 Stock library
Source: home, pricing, `/use-case/educational-video`
- Royalty-free videos, images, GIFs, music, sound effects.
- Search-result usage gating per plan: 5 results (Free), 12 (Hobbyist), Unlimited (Creator+).

---

## 9. AI Audio Repair & Enhancement

| Feature | What it does | Source |
|---|---|---|
| **Studio Sound** | "Regenerative" audio cleanup — isolates voice and *regenerates* clean audio (not filter-based). Removes background noise, echo, room reverb; enhances voice. Works on any recording environment (bedroom, phone, airport). | `/studio-sound`, `/podcasting` |
| **Remove Filler Words** | Removes "um," "uh," "you know," and "a dozen other filler words." Transcript-driven; one click; cites Independent + BYU Schwa Lab research showing speakers without fillers sound more educated/persuasive. | `/filler-words` |
| **Regenerate Speech** | Smooths over awkward edits by regenerating voice audio at edit points to match surrounding tone. Also injects energy into flat dialogue and removes localized noise. *Audio only, no lip-sync.* | `/regenerate` |
| **Edit for Clarity** | One-click pass that cuts filler words AND digressions, tangents, "scruff and fluff" — content-level, not just word-level. Designed as the first pass for unscripted content. | `/ai/edit-for-clarity` |
| **Remove Retakes** | Detects repeated lines in scripted content and keeps only the best take. | `/ai/remove-retakes` |
| **Shorten Word Gaps** | Shrinks or cuts silences and conversational gaps. | pricing |
| **Audio normalizer** | Long-tail SEO tool, `/tools/audio-normalizer-tool` |
| **Clean audio tool** | Long-tail SEO tool, `/tools/clean-audio-tool` |

---

## 10. AI Video Repair & Enhancement

| Feature | What it does | Source |
|---|---|---|
| **Eye Contact** | AI gaze correction — appears you're looking at the camera even while reading a script. Non-destructive; toggle on/off; can apply selectively. | `/eye-contact`, `/tools/ai-eye-contact`, `/tools/fix-eye-contact-videos` |
| **Green Screen** | AI subject isolation — no physical green screen needed. Non-destructive. Supports MP4, AVI, MOV, WMV, MKV, FLV. Composite over any video/image/GIF background. | `/tools/green-screen`, `/tools/remove-green-screen` |
| **Automatic Multicam** | Auto-cuts to the active speaker; adds reaction shots; switches to group shot during rapid exchanges; designed for Rooms multi-person recordings. | `/ai/automatic-multicam` |
| **Video Regenerate (Beta)** | Type to correct words in recorded video — AI clones your voice AND adjusts your mouth movements to match the new text. Identity verification required. | `/video-regenerate`, `/tools/ai-regenerate-audio` |
| **Generate image / Animate static images** | B-roll generation; can animate stills, visualize data, build social videos from scratch. | `/video`, `/ai-video` |

---

## 11. Translation, Dubbing & Captions

Source: `/ai/translate-video`, `/captions`, pricing, `/brand-studio`.

### 11.1 Caption translation — **61 languages**
Afrikaans, Armenian, Assamese, Azerbaijani, Belarusian, Bengali, Bosnian, Bulgarian, Catalan, Chinese, Croatian, Czech, Danish, Dutch, English, Estonian, Filipino, Finnish, French, Galician, Georgian, German, Greek, Hausa, Hindi, Hungarian, Indonesian, Italian, Japanese, Javanese, Kazakh, Korean, Latvian, Lithuanian, Luxembourgish, Macedonian, Malay, Malayalam, Marathi, Nepali, Norwegian, Polish, Portuguese, Punjabi, Romanian, Russian, Serbian, Sindhi, Slovak, Slovenian, Somali, Spanish, Swahili, Swedish, Tamil, Telugu, Thai, Turkish, Ukrainian, Vietnamese, Welsh.

### 11.2 Audio translation / AI dubbing — **30 languages**
Bulgarian, Chinese, Croatian, Czech, Danish, Dutch, English, Filipino, Finnish, French, German, Greek, Hindi, Hungarian, Indonesian, Italian, Japanese, Korean, Malay, Norwegian, Polish, Portuguese, Romanian, Russian, Slovak, Spanish, Swedish, Tamil, Turkish, Ukrainian.

### 11.3 Translation proofread
- Side-by-side review/edit of the translated script vs. the original — for accuracy and tone — inside the editor.
- **Enterprise only** (per pricing).

### 11.4 Native-sounding AI speakers (high-fidelity custom-trained)
- 14 languages (listed in §8.4). **Business+ only.**

### 11.5 "Do Not Translate" list
- Lock brand names, product names, jargon — they pass through untranslated. **Business+.**

### 11.6 Captions (display + branding)
- Animated captions, stock styles, customizable font/colors/word-highlighting/positioning (all plans, unlimited).
- Long-tail SEO surface: per-language caption pages (`add-{english,spanish,french,german,italian,portuguese,...}-captions-video`) and per-language dubbing pages (`{spanish,french,german,italian,...}-dubbing-tool`).

---

## 12. Repurposing & Publishing

| Feature | What it does | Source |
|---|---|---|
| **Create Clips** | One-click viral-clip detection; AI finds highest-engagement moments; 4 style templates (Bold, Editorial, Simple, Vintage); aspect-ratio conversion for YouTube Shorts, TikTok, Instagram Reels, LinkedIn; full editor for refinement. | `/clips`, `/tools/vertical-clip-maker` |
| **YouTube Descriptions** | One-click auto-generation from transcript. | `/ai/youtube-description` |
| **Podcast Show Notes** | Auto summary + timestamped chapters; targeted at Spotify/Apple Podcasts discoverability. | `/ai/podcast-show-notes` |
| **Chapter Generator** | Creates, names, inserts chapter markers. | `/ai/chapter-generator` |
| **Social Post Writer** | Multiple styles, hashtags. | `/ai/social-post-writer` |
| **Turn-into-Blog-Post** | Convert script into a blog post draft. | `/ai/turn-into-blog-post` |
| **Script Generator** | AI-generated podcast/video scripts. | `/ai/script-generator` |
| **Shareable web pages / embeds** | Standalone web page with shareable link + embeddable web player; customize access, resolution, transcript, comments, custom branding. Edits propagate to the live URL automatically (no re-upload). | pricing, `/use-case/educational-video`, `/use-case/webinar-recording` |
| **White-labeled publish pages** | Custom Drive name + logo on published pages (Creator+). | pricing |
| **Branded share pages** | Logo on Descript-hosted share page (Brand Studio). | `/brand-studio` |

---

## 13. Brand Studio (team brand governance)
Source: `/brand-studio`, `/use-case/marketing-video`, `/use-case/tutorial-video`, `/use-case/product-demo`, `/enterprise/learning-and-development`.

- **Business plan onwards.**
- Centralized hub for **layouts, fonts, colors, logos**.
- Remix Descript's gallery layout packs in brand style and save as your own; team-wide consistency.
- **Customized transcripts**: shared glossary of brand terms / industry jargon — improves ASR accuracy across all videos.
- **Admin-level permissions (Enterprise only)**: lock colors, fonts, media; off-brand choices disappear from picker.
- **Do Not Translate** list (see §11.5).
- **Branded share pages** with company logo.
- Target use cases: training videos, sales presentations, product demos, distributed teams.

---

## 14. Collaboration

Source: pricing, `/podcasting`, `/use-case/case-studies`, `/use-case/educational-video`.

- **Unlimited projects** on all plans.
- **Seats**: Free 1, Hobbyist 1, Creator 1–3, Business up to 5, Enterprise custom.
- **Simultaneous editing** (real-time collaboration) — confirmed via comparison tables.
- **Comments**: timestamped, in the transcript; stakeholders comment in-line via shared link, no video export needed for reviews.
- **Editor comments during recording** — sync into the project.
- **Shareable links with comments enabled** on published pages.

---

## 15. Integrations & API

Source: `/integrations`, changelog research.

### 15.1 Import into Descript (1-click)
Ecamm, Restream, SquadCast, Captivate, Zoom

### 15.2 Publish destinations
Wistia, Coursera, Google Drive, Blubrry, Buzzsprout, Captivate, Castos, eWebinar, Headliner, Hello Audio, Podbean, Podcast.co, Restream, Transistor, VideoAsk, YouTube, Slack, HubSpot

### 15.3 Timeline export (round-trip to pro NLEs)
Adobe Audition, Adobe Premiere, Apple Logic, Avid Pro Tools, Final Cut Pro, Reaper, DaVinci Resolve

- Non-destructive export — originals preserved, edits intact.
- Plan gating: Timeline export to pro NLEs requires **Creator+**.

### 15.4 Slack app
- Play Descript videos inside Slack messages.
- Comment-on-project, comment-on-published-page, first-view-of-page notifications via a Descript bot.

### 15.5 Descript API (Open Beta)
- Available to all users; token generated in account settings.
- Endpoints: import media, create/edit projects with Underlord, project search, folder support, composition targeting, publish triggers.
- **MCP (Model Context Protocol)** connector — Descript can be driven from Claude, ChatGPT, and other MCP-aware AI clients.

---

## 16. Pricing (full structure as observed)

### 16.1 Tier summary

| | Free | Hobbyist | Creator | Business | Enterprise |
|---|---|---|---|---|---|
| Billing target | per person/mo | per person/mo | per person/mo | per person/mo | Custom |
| Seats included | 1 | 1 | 1–3 (billed separately) | Up to 5 (billed separately) | Custom |
| Annual price displayed on site | Free | Hidden behind CTA on checkout pages | Hidden behind CTA | Hidden behind CTA | Custom contract |
| Media hours / mo | 1 hr (60 min) | 10 hrs (600 min) | 30 hrs (1800 min) + 5 bonus | 40 hrs (2400 min) + 10 bonus | Custom |
| AI credits / mo | 100 (one-time) | 400 | 800 + 500 bonus | 1500 + 1000 bonus | Custom |
| Top-up minutes | — | — | ✅ | ✅ | Custom |
| Top-up AI credits | — | — | ✅ | ✅ | Custom |
| Local export resolution | 720p | 1080p | 4K | 4K | 4K |
| Web-link export resolution | 720p | 1080p | 4K | 4K | 4K |
| Web-link export duration cap | 1 hr | 1 hr | 3 hrs | 3 hrs | Custom |
| Audio export duration | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |
| Watermark | Yes (Free only) | None | None | None | None |
| Cloud storage | 5 GB | 100 GB | 1 TB | 2 TB | Custom |
| Upload file size cap | up to 1 GB | up to 10 GB | up to 20 GB | up to 50 GB | Custom |
| Upload resolution cap | up to 4K | up to 4K | up to 5K | up to 5K | Custom |
| Upload bitrate cap | up to 150 mbps | up to 150 mbps | up to 1 gbps | up to 1 gbps | Custom |
| Advanced media formats (Apple ProRes, QuickTime RLE) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Live chat support (M–F 5am–5pm PT) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Priority support with SLA | ❌ | ❌ | ❌ | ✅ | ✅ |

### 16.2 Rooms (recording) gating

| | Free | Hobbyist | Creator | Business |
|---|---|---|---|---|
| Recording hrs / drive / mo | 2 hrs (one-time) | 5 hrs | 15 hrs | 25 hrs |
| Max participants | 10 | 10 | 10 | 10 |
| Control Room producers | ❌ | ❌ | ❌ | 3 |
| Separate cloud backup | ✅ | ✅ | ✅ | ✅ |
| Up to 2 screens shared | ✅ | ✅ | ✅ | ✅ |
| Auto project setup + transcription | ✅ | ✅ | ✅ | ✅ |
| Guest file recovery (7d) | ✅ | ✅ | ✅ | ✅ |
| Editor comments | ✅ | ✅ | ✅ | ✅ |

### 16.3 AI feature gating (selected)

| Feature | Free | Hobbyist | Creator | Business |
|---|---|---|---|---|
| Underlord | Limited | ✅ | ✅ (full) | ✅ (full + brand-aware) |
| Studio Sound | Limited | ✅ | ✅ | ✅ |
| Green Screen | Limited | ✅ | ✅ | ✅ |
| Eye Contact | Limited | ✅ | ✅ | ✅ |
| Remove Filler Words | Limited | ✅ | ✅ | ✅ |
| Shorten Word Gaps | Limited | ✅ | ✅ | ✅ |
| Edit for Clarity | Limited | ✅ | ✅ | ✅ |
| Remove Retakes | Limited | ✅ | ✅ | ✅ |
| Add chapters | Limited | ✅ | ✅ | ✅ |
| Automatic Multicam | Limited | ✅ | ✅ | ✅ |
| Generate image | Limited | ✅ | ✅ | ✅ |
| Generate video | ❌ | ❌ | ✅ | ✅ |
| Quick Design | Limited | ✅ | ✅ | ✅ |
| Center Active Speaker | Limited | ✅ | ✅ | ✅ |
| Create Clips / Highlights | Limited | ✅ | ✅ | ✅ |
| Underlord Write (brainstorm/rewrite/script) | Limited | ✅ | ✅ | ✅ |
| Publish drafts (social/blog/show-notes/summary) | Limited | ✅ | ✅ | ✅ |
| AI video maker (ChatGPT-script) | Limited | ✅ | ✅ | ✅ |
| TTS (Text-to-Speech) | Limited | ✅ | ✅ | ✅ |
| Regenerate (audio) | Limited | ✅ | ✅ | ✅ |
| Custom voice clones | Limited | ✅ | ✅ | ✅ |
| Stock AI speakers count | Limited | 25+ | 25+ | 60+ |
| Avatar gallery | Limited | ✅ | ✅ | ✅ |
| Text-prompt → avatar | Limited | ✅ | ✅ | ✅ |
| Avatar image stylization | Limited | ✅ | ✅ | ✅ |
| Custom avatar via image upload | Limited | ✅ | ✅ | ✅ |
| Translate captions (61 langs) | Limited | ✅ | ✅ | ✅ |
| Translate audio / dub (30 langs) | Limited | ✅ | ✅ | ✅ |
| Translation proofread | ❌ | ❌ | ❌ | ❌ (Enterprise only) |
| Native-sounding custom-trained voices (14 langs) | ❌ | ❌ | ❌ | ✅ |
| Stock media search results per query | 5 | 12 | Unlimited | Unlimited |
| Use stock layout packs | ✅ | ✅ | ✅ | ✅ |
| Create/share custom layout packs | ❌ | ✅ | ✅ | ✅ |
| Remix gallery layout packs | ❌ | ✅ | ✅ | ✅ |
| Brand Studio (white-labeled publish pages) | ❌ | ❌ | ✅ | ✅ |
| Transcription glossary | ❌ | ❌ | ❌ | ✅ |
| "Do Not Translate" list | ❌ | ❌ | ❌ | ✅ |

### 16.4 Enterprise tier (custom)
- Advanced security + **SSO + SCIM**
- Granular brand controls
- Custom AI credits, custom media minutes
- **Custom legal terms**
- Custom AI controls
- Flexible licensing
- Flexible billing
- **Custom Models** for Underlord (trained on org content)
- **AI Avatars** (page positions as Enterprise-exclusive for video creation at scale)
- Admin-level brand permissions (lockable brand assets)

### 16.5 Promotional / partner deals observed
- `/lenny` — one-year free for Lenny's Newsletter subscribers (Lenny Rachitsky is an individual investor).

---

## 17. Security, Compliance & Privacy

Source: `/security`, comparison pages, `/enterprise`.

| Area | Status |
|---|---|
| SOC 2 | ✅ (security page says "aligned with SOC 2"; compare pages explicitly claim **SOC 2 Type II**) |
| GDPR | ✅ |
| CCPA | ✅ |
| Privacy by Design framework | ✅ |
| Data at rest | **AES-256** encryption |
| Data in transit | HTTPS over **TLS 1.2** |
| Secret management | Encrypted storage from Google + Amazon; MFA required for employees on critical systems |
| Physical security | Formal plan, designated manager, locked-door office access |
| AI privacy | All AI features **opt-in**; AI voices require **user consent**; Descript does **not** auto-collect data from user systems |
| AI testing | AI behavior tested + monitored; annual security reviews + vulnerability scans |
| Vulnerability process | Continuous scanning; severity-prioritized resolution timelines |
| Trust report | Publicly viewable; enterprise prospects can search compliance requirements |
| SSO / SAML | ✅ Enterprise |
| SCIM provisioning | ✅ Enterprise |
| User provisioning | ✅ Enterprise |
| Custom legal terms | ✅ Enterprise |
| HIPAA | ❌ Not mentioned anywhere |
| ISO 27001 | ❌ Not mentioned |
| FedRAMP | ❌ Not mentioned |
| Data residency options | ❌ Not mentioned |
| Pen test reports | ❌ Not mentioned (only "vulnerability scans") |

---

## 18. Use Cases (positioning + recommended capabilities)

| Use case | URL | Headline | Recommended capability stack |
|---|---|---|---|
| Marketing video | `/use-case/marketing-video` | "Make good marketing video. Make it fast." | Text-based editing + Brand Studio + Translation (30+ langs) + AI credits + Custom avatars (Business) |
| Webinar recording | `/use-case/webinar-recording` | "Give your webinar some staying power" | Underlord cleanup + Brand Studio + instant share/embed link (auto-updating) |
| Tutorial video | `/use-case/tutorial-video` | "Make tutorial videos, quickly and easily" | Screen recorder + annotations (arrows/circles/zooms/pans) + Brand Studio + Translation/dubbing |
| Product demo | `/use-case/product-demo` | "If you can type, you can make product demo videos" | Screen + webcam record + text-based edit + Scenes + Brand Studio + Translation |
| Educational / training | `/use-case/educational-video`, `/enterprise/learning-and-development` | "Make better training video, faster, with AI" | Scenes/slides metaphor + Underlord first-pass + stock library + AI avatars + Eye Contact + auto-updating embed link |
| Customer case studies | `/use-case/case-studies` | "Actually-good case study videos, actually made by you" | Rooms + text-based editing + Underlord audio cleanup + Brand Studio |
| Newsroom / media | `/teams/media` | "Built for digital newsrooms moving at newsroom speed" | Reporter self-serve + Underlord + Studio Sound (field recordings) + one-edit-multi-format output |
| Tech GTM | `/teams/tech` | "Make video at the speed of GTM" | Marketing v1 + creative polish handoff + Brand Studio + sales-enablement repurposing |
| Sales enablement | `/enterprise` | (sub-use-case) | AI avatars + Brand Studio + custom decks |
| Customer support / how-to | `/enterprise` | (sub-use-case) | "Update by typing when product changes" + screen recording |
| Customer onboarding / success | `/enterprise` | (sub-use-case) | Brand Studio + translations |

---

## 19. Competitive Positioning (from Descript's own pages)

These are claims Descript makes about itself vs. competitors. Use as competitive intel signals; do not assume the competitors' feature sets are exactly as Descript describes.

### 19.1 vs. OpusClip — "Descript is OpusClip plus everything else"
Descript advantages claimed: multi-track editor, stock media library, Studio Sound, eye contact, Slides→video, SCIM, **256-bit vs 128-bit encryption**, user provisioning, integrations, 6x more processing (30h vs 5h), AI highlight reel, no project expiry. OpusClip parity: AI clips, animated captions, SOC 2, GDPR, SSO/SAML.

### 19.2 vs. Riverside — "Descript wins out over Riverside"
Descript advantages claimed: Studio Sound, eye contact, AI speakers, AI avatars, Underlord, Slides→video, SCIM, GDPR, **256-bit vs 128-bit**, unlimited seats (vs limited), TTS on all plans (vs Pro-only), more recording hours on higher plans. Parity: recording features (15h, 4K, 10 ppl), multi-track timeline, filler word removal, blur, green screen, transcription, SSO. **Same price point** ($24/user/mo Creator).

### 19.3 vs. Camtasia (+ Audiate) — "Descript helps you make video fast and in the cloud. Camtasia doesn't."
Descript advantages claimed: virtually all cloud/enterprise features (SOC 2, SSO/SAML, SCIM, cloud storage, simultaneous editing, smart transitions, AI clips, eye contact, cloud hosting with live-update embeds, Slides→video), **20+ translation languages vs 7**, integrations. Parity: text-based editing, custom layouts, GDPR. Price: claimed parity ("We also cost the same").

### 19.4 vs. Google Vids — "Make video at a scale that Google Vids just can't"
Descript advantages claimed: transcription, text-based editing, translation, AI-assisted editing, voice clone, Studio Sound. Parity: layouts, stock library, multi-track timeline, SOC 2, GDPR, SSO/SAML, SCIM, 256-bit AES, user provisioning, integrations, unlimited seats/storage.

### 19.5 vs. Canva — "Canva turns design templates into quick videos. Descript makes complex video editing simple."
Descript advantages claimed: recording (Canva ❌), remote recording, multi-track editing (vs basic only), transcription, AI audio enhancement, filler-word removal, eye contact, Overdub voice cloning, Slides→video, Underlord. Parity: cloud-based, shareable links, green screen, stock library, design templates, brand kit, comments, SOC 2, GDPR, SSO/SAML, SCIM, 256-bit AES, user provisioning, integrations.

### 19.6 Recurring "Descript-exclusive" claims across compare pages
- Text-based editing (categorical claim of origination)
- Underlord
- Studio Sound (vs OpusClip, Riverside, Camtasia, Google Vids)
- Eye contact correction (vs OpusClip, Riverside, Camtasia, Canva)
- Slides → video (all 5 comparisons)
- AI translation depth (vs Camtasia/Google Vids/OpusClip)
- Voice clone / Overdub (vs Canva, Google Vids)
- AI avatars (vs Riverside)
- Auto-updating embedded share links (vs Camtasia, recurring in use-case pages)

---

## 20. Long-tail SEO surface (functional implications)

The sitemap exposes 200+ tool-style landing pages organized into categories that mirror Descript's real product capabilities. For a competitor build, these are good signals of what users actually search for:

### 20.1 Free utility tools (top-of-funnel)
`happy-birthday-gif-maker`, `hashtag-generator`, `photo-video-maker`, `describe-video`, `intro-video-maker`, `change-video-aspect-ratio`, `video-storyboard-generator`, `add-broll-video`, `product-demo-video-maker`, `slide-to-video`, `generate-ai-images`, `add-captions-to-videos`, `screen-recording-tool`, `vertical-clip-maker`.

### 20.2 Format conversion (search intent: simple converter)
`audio-to-mp3-converter`, `mp4-converter`, `avi-to-mp4-converter`, `video-converter`.

### 20.3 Audio → text (per format)
`mp3-to-text`, `wav-to-text`, `m4a-to-text`, `aac-to-text`, `aiff-to-text`, `flac-to-text`, `pcm-to-text`, `mp4-to-text`, `mov-to-text`, `m4v-to-text`, `mpeg-to-text`, `h264-to-text`, `hevc-to-text`.

### 20.4 Source → text (per context)
`interview-to-text`, `meeting-to-text`, `lecture-to-text`, `voice-memo-to-text`, `tiktok-to-text`, `youtube-video-to-text`.

### 20.5 Per-language audio-to-text (20 languages)
Catalan, Croatian, Czech, Danish, Dutch, English, German, Greek, Hindi, Hungarian, Italian, Latvian, Lithuanian, Malay, Norwegian, Polish, Portuguese, Romanian, Slovak, Slovenian, Spanish, Swedish, Turkish (matches transcription languages).

### 20.6 Per-language audio translation (matrix, ~80 pages)
`translate-{src}-audio-to-{dst}` — examples: `translate-english-audio-to-{hindi,greek,turkish,swedish,spanish,slovenian,...}`, `translate-hindi-audio-to-{spanish,portuguese,malay,romanian,italian,french,finnish,dutch,danish,english}`, etc. Full source × destination matrix is partially populated, not symmetric.

### 20.7 Per-language captions (~25 pages)
`add-{english,swedish,greek,french,hungarian,finnish,dutch,chinese,portuguese,lithuanian,polish,italian,korean,japanese,norwegian,german,latvian,romanian,slovak,spanish,turkish,slovenian,hindi,malay,danish,czech,croatian,catalan}-captions-video`.

### 20.8 Per-language dubbing (~20 pages)
`{hindi,turkish,hungarian,swedish,chinese,portuguese,german,czech,croatian,french,slovak,italian,dutch,polish,danish,spanish,korean,romanian,malay,japanese,finnish,norwegian,english,greek}-dubbing-tool`.

### 20.9 Generative video / SEO playbooks
`generative-training-videos`, `generative-video-pixverse`, `generative-video-veo-guide`, `generative-video-stylized-background-loops`, `generative-video-for-podcasts`, `generative-video-for-youtube`, `generative-video-marketing`, `generative-video-product-demos`, `scale-video-production`, `ai-generative-video-guide`, `generative-video-b-roll`.

### 20.10 YouTube growth playbooks
`video-editing-for-youtube-growth`, `grow-youtube-audience`, `youtube-aeo-optimization`, `ai-youtube-script-generator`.

### 20.11 AI capability landing pages
`add-subtitles-video-solution`, `ai-regenerate-audio`, `ai-eye-contact`, `ai-avatar-generator`, `remove-green-screen`, `video-dubbing-tool`, `podcast-recording-tool`, `subtitle-translator-tool`, `clean-audio-tool`, `audio-normalizer-tool`, `translate-clip-subtitles`, `fix-eye-contact-videos`.

---

## 21. Tech Stack & AI Model Inventory (observed)

| Function | Model / vendor (per Descript's own marketing) |
|---|---|
| ASR (default) | **ElevenLabs Scribe v2** |
| ASR (alternative) | **Rev v2** |
| TTS / voice clone | **Descript's home-grown model** (per `/ai-voices` claim) |
| Generative video | **Google Veo 3.1**, **Pixverse 4.5**, **Hailuo 02**, **Seedance 2.0**, **OpenAI GPT Image 2** |
| Underlord LLM | Not disclosed; uses reasoning models for complex tasks; relationship implied via OpenAI Startup Fund investment |
| API integration spec | **Model Context Protocol (MCP)** — Descript callable from Claude, ChatGPT, etc. |

**File-format support** (per changelog research):
- Video containers: MP4, AVI, MOV, WMV, MKV, FLV, WebM
- Audio: MP3, WAV, M4A, AAC (raw ADTS), AIFF, FLAC, PCM, Opus (.opus in OGG)
- Images: standard + AVIF
- Surround: 5.1 and other surround files; downmixed to stereo by default; splittable into mono clips
- High-end formats (Creator+): Apple ProRes, QuickTime RLE

---

## 22. Platforms & Deployment

- **Desktop apps**: implied (historically Descript ships native Mac/Windows clients — not explicitly enumerated on observed marketing pages, but `web.descript.com` is referenced as the cloud editor for sign-up/checkout).
- **Web app**: `web.descript.com` — used for sign-up, checkout, and editing.
- **Browser-based screen recorder**: marketed as "record online for free" (Free tier, no install needed for basic capture).
- **Slack app**: Descript bot (notifications + inline video playback).

---

## 23. Stated Limits & Numbers Cheat Sheet

| Limit | Value |
|---|---|
| Transcription languages | 25 |
| Caption translation languages | 61 |
| Audio dubbing languages | 30 |
| Native-trained dubbing voices | 14 languages (Business+) |
| TTS stock voices | 25+ (Hobbyist/Creator), 60+ (Business) |
| TTS languages | 20+ |
| Avatar gallery | 35+ |
| AI video styles in library | 20+ |
| Voice clone creation time | ~60 seconds |
| Speaker diarization | 8+ speakers per recording |
| Rooms max participants | 10 |
| Rooms max screens shared | 2 |
| Rooms guest file recovery | 7 days |
| Business plan Control Room producers | 3 |
| AI credits per month | 100 / 400 / 800+500 / 1500+1000 |
| Media hours per month | 1 / 10 / 30+5 / 40+10 |
| Cloud storage | 5 GB / 100 GB / 1 TB / 2 TB |
| Upload file size | 1 GB / 10 GB / 20 GB / 50 GB |
| Upload resolution | 4K / 4K / 5K / 5K |
| Upload bitrate | 150 mbps / 150 mbps / 1 gbps / 1 gbps |
| Web-link export duration | 1 hr / 1 hr / 3 hrs / 3 hrs |
| Export resolution (local & web) | 720p / 1080p / 4K / 4K |
| Stock library search results visible | 5 / 12 / unlimited / unlimited |
| Live chat support hours | M–F 5am–5pm Pacific |
| G2 rating | 4.6 / 5 |
| Funding raised | $100M |
| Enterprise customer count | 500+ |
| Underlord usage claim | "Vibe editing"; "20+ AI tools" on Creator |
| Enterprise output uplift claim | 2.5× more video output (no methodology) |

---

## 24. Gaps, Inconsistencies & Things to Validate

These are points where Descript's own marketing is internally inconsistent or where the site (heavy JS) prevented direct verification. Flag for product planning.

1. **Translation language counts** are inconsistent across pages: "25+" on the translate feature page, "30+ with proofread" on Business pricing, "20+" on the L&D enterprise page. Most authoritative source: the pricing language list — **captions: 61, dubbing: 30**.
2. **AI Voices "5 languages" string** in the `/ai-voices` Translate sub-feature contradicts the 30/61 elsewhere — appears to be outdated copy.
3. **AI Avatars availability** — `/enterprise` says "AI Avatars: Enterprise only" but `/ai-avatars` and the pricing chart show avatar gallery / text-prompt / image-upload avatars available at Hobbyist tier. Likely the gating is on **custom-from-photo avatar generation** (Business) and **custom avatar training/library** (Enterprise), not all avatar usage.
4. **SOC 2 Type II vs SOC 2** — security page hedges ("aligned with SOC 2"); compare pages explicitly claim Type II. Likely Type II, but formal attestation should be verified via the trust report.
5. **HIPAA** is never mentioned. Relevant for healthcare/L&D buyers.
6. **No public list of full filler words removed** — "ums, uhs, you knows, and a dozen others" — exact dozen not enumerated.
7. **Video Regenerate** is marked Beta — no stated limits on text-length per regeneration, no GA date.
8. **Customers page** is JS-rendered — could not extract individual case studies; named customers come from logo walls and `/teams/media`.
9. **Underlord LLM identity** — not disclosed publicly, though OpenAI Startup Fund investment is a signal.
10. **Desktop vs web app capability parity** — not enumerated on marketing pages; historically Descript has both, but cloud editor at `web.descript.com` is the primary onboarding surface.
11. **Pricing dollar figures** — visible numbers/$/mo do not render in scraped markdown (rendered via JS). Reference points cited in compare pages: Creator = $24/user/mo (vs Riverside parity).
12. **"2.5x more video output"** enterprise claim has no methodology cited.
13. **Pen test transparency** — only "vulnerability scans" mentioned; no published pen test summary.
14. **No data residency** options mentioned (EU/US/etc.).
15. **No mobile app** mentioned anywhere on the observed marketing pages.
16. **Real-time collaboration concurrency limits** not disclosed.
17. **`/sdk` is a 404** — no public SDK page; API is open beta only.
18. **`/voice-clone` is a 404** — Overdub branding fully replaced by `/ai-voices`.

---

## 25. Suggested Feature Matrix for a Competitor Build

(Aggregated checklist derived from §3–§16. Use this as input to product scoping.)

**Must-have core (parity to Descript Free/Hobbyist):**
- Cloud project storage + browser-based editor
- Multi-track timeline + scene/layout canvas + text-based transcript editor
- ASR transcription in ≥25 languages with speaker diarization
- Animated captions with style options
- Screen recorder (≥2 screens), webcam recorder, mic capture
- Stock library (video/audio/images/GIFs)
- One-click filler-word removal, gap shortening, noise reduction
- TTS with 20+ stock voices
- Voice clone with identity verification
- Export to MP4 1080p, audio mix-down, shareable web page

**Differentiated / Pro (parity to Creator):**
- Agentic AI editor (Underlord equivalent) with chat history, context picker, self-review pass
- Text-to-video generation with multi-model selector
- AI image generation
- Eye contact correction
- Green screen (AI subject isolation)
- Auto-multicam
- Custom layout packs + remixable templates
- AI clip generator with viral scoring
- AI YouTube descriptions / show notes / chapters / social posts / blog posts
- 4K export, ProRes upload, timeline export to Premiere/FCP/Resolve/Audition/Pro Tools

**Team / Business:**
- Brand Studio (lockable layouts/fonts/colors/logos)
- Transcription glossary (brand-term dictionary)
- "Do not translate" list
- Translation proofread UI (side-by-side)
- Native-trained TTS voices in major languages
- Custom avatars from photo/text prompt
- Up to 5 seats, 2 TB storage, 50 GB uploads, 5K resolution, 1 gbps bitrate
- Control Room (producers, push-to-talk, off-screen control)
- Priority support with SLA

**Enterprise:**
- SSO + SAML + SCIM
- Custom legal terms, custom AI controls, custom billing
- Custom-trained AI ("Underlord trained on org content")
- Admin-level lockable brand assets
- Trust report + audit-aligned compliance posture (SOC 2 Type II, GDPR, CCPA)

**API / Ecosystem:**
- Public API with import / project / publish endpoints
- MCP server for AI-client integration (Claude/ChatGPT)
- Slack app
- 1-click publish to YouTube, Spotify-style podcast hosts (Buzzsprout, Transistor, Castos, Captivate, Podbean), Wistia, HubSpot, Coursera, Google Drive
- Round-trip to Adobe Premiere, Audition, FCP, DaVinci Resolve, Pro Tools, Logic, Reaper

**Compliance posture targets to match/exceed Descript:**
- SOC 2 Type II ✅
- GDPR + CCPA ✅
- AES-256 at rest, TLS 1.2+ in transit ✅
- Add (Descript gaps): HIPAA, ISO 27001, FedRAMP, EU/US data residency, published pen test summary, BAA support

---

## 26. Source Index (verified URLs)

Tier-1 (substantive content extracted):
- `/`, `/pricing`, `/about`
- `/underlord`, `/ai-voices`, `/ai-avatars`, `/brand-studio`
- `/video`, `/video-editing`, `/podcasting`, `/transcription`, `/captions`, `/rooms`, `/screen-recorder`, `/screen-recording`
- `/ai-video`, `/video-generator/ai-video-generator`, `/ai/generate-video`
- `/studio-sound`, `/filler-words`, `/regenerate`, `/ai/edit-for-clarity`, `/ai/remove-retakes`
- `/eye-contact`, `/tools/green-screen`, `/ai/automatic-multicam`, `/video-regenerate`
- `/clips`, `/ai/youtube-description`, `/ai/podcast-show-notes`, `/ai/translate-video`, `/templates`
- `/enterprise`, `/enterprise/learning-and-development`, `/security`, `/integrations`
- `/customers`, `/teams/media`, `/teams/tech`, `/lenny`
- `/compare/descript-vs-{opus-clip, riverside, camtasia, google-vids, canva}`
- `/use-case/{marketing-video, webinar-recording, tutorial-video, product-demo, educational-video, case-studies}`
- `/sitemap.xml` (full sitemap dump)

Tier-2 (404 / not found):
- `/sdk`, `/voice-clone`

Long-tail SEO surface enumerated in §20 (200+ pages, mostly programmatically generated).

---

*End of document.*
