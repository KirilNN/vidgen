# Pillar 1 — Capture (detailed specifications)

> **Pillar question:** "How do I record / import what I'll edit?"
> **Release coverage:** R1 (F1.1, F1.6 import basics), R2 (F1.2 zoom), R3 (F1.3, F1.4), R4 (F1.5, F1.5 QR, F1.7 unified cloud import)

---

## F1.1 — Screen + Webcam + Mic Recorder

**Release:** R1
**Summary:** A browser-based recorder that captures up to two screens + webcam + microphone simultaneously and writes every action to an auto-transcribed editable project, with crash-safe local buffering.

### Problem statement
"I want to record a tutorial without installing software, and I want the recording to be safe even if my browser crashes." Reddit: CapCut/HipClip lose users at this step due to crashes mid-recording.

### Primary personas
Solo Creator, In-house Marketer, B2B Sales/Founder, L&D Lead.

### User stories
- As a solo creator I want to start recording in two clicks so I don't lose momentum on an idea.
- As a marketer I want to record my screen and my webcam at the same time so my product demo has a presenter.
- As a sales founder I want to record two monitors at once so I can show side-by-side comparisons in a demo.
- As a tutorial maker I want my browser to crash without losing my recording so a 45-minute session isn't wasted.
- As a returning user I want my recording to auto-import into an editable project so I don't have to manually upload.

### Functional requirements
1. **Source selection:** screen (full / window / Chrome tab), webcam (front/external), microphone (system / external). User can enable any combination.
2. **Multi-screen capture:** up to 2 simultaneous displays. The user picks which displays before starting.
3. **Pre-recording check:** camera preview, mic level meter (with peak warning), screen preview, audio routing visible. Mandatory 3-second visual countdown to start.
4. **Recording controls:** Start / Pause / Resume / Stop. Spacebar starts/stops; M mutes mic; C toggles camera.
5. **Crash safety:** recording is buffered to local disk every 5 seconds. If browser/tab/OS crashes, the buffer persists. On next session, the user is prompted "We found an unfinished recording from [time] — recover?"
6. **Resolution & quality:** up to 1080p browser-only on free; up to 4K with optional desktop helper (R3).
7. **Length limits per tier:** Free 30 min; Creator 1 hr; Pro 2 hr; Team+ unlimited. When approaching limit, banner warns at 90%.
8. **Auto-import:** when the user clicks Stop, a project is auto-created, the recording is auto-uploaded with resumable upload, transcription starts immediately, and the editor opens to the project.
9. **Auto-transcription:** does not consume transcription credits (it's a recorder feature, not an AI feature).
10. **Auto-brand-kit:** if the user has a brand kit configured, the new project inherits brand colors/fonts/logo placeholder.
11. **Hotkey toolbar:** a small floating overlay during recording with timer, mic mute, cam toggle, pause, stop. User can drag it; it never appears in the recording itself.
12. **Permission flow:** first-time use walks through OS permissions (Mac screen recording, mic, cam) with deep links to system settings if denied.
13. **Audio-only mode:** mic-only recording mode for voice memos / podcast solo takes.

### UX flow
1. User clicks **Record** from the home dashboard or `+` button anywhere in the app.
2. Modal opens: choose sources (screen / cam / mic), preview each.
3. Click **Start** → 3-second countdown overlay → recording active with floating control bar.
4. User records, can pause/resume freely (pause markers logged for editor convenience).
5. User clicks **Stop** → "Saving..." progress → auto-import → editor opens.
6. If browser crashes mid-recording → on next visit, recovery modal appears.

### Inputs / Outputs
- **Inputs:** screen, webcam, mic streams; user choices of which to include.
- **Outputs:** a new project containing one or more synced tracks (video, screen-share track per display, audio); auto-transcribed and ready to edit.

### Edge cases & error handling
- **Permission denied mid-flow:** clear modal explains which permission failed; link to system settings.
- **Disk full:** stop recording, save what's captured, surface clear "free up disk" message.
- **Mic disconnected mid-recording:** continue recording the remaining tracks; flag a warning in the recovered project.
- **Bandwidth drops during upload:** resumable upload retries with exponential backoff; user can come back later to finish.
- **Two screens requested but one disconnected before start:** revert to one-screen capture; surface advisory.
- **Recording > tier limit:** auto-stop at limit, save what's captured, surface upgrade nudge (P2 — no surprise cutoff: the 90% warning is mandatory).
- **Camera-only with no mic:** allow; flag "Your recording has no audio" before stop.

### Sentiment guardrails
- **P1:** must crash-recover. CapCut + HipClip get repeatedly blamed for losing long recordings. We do not.
- **P12:** if any recording fails to upload, surface a real "Contact support" link with the project ID pre-filled. Never silently drop.

### Acceptance criteria
- 99.5% of recordings ≤2 hours complete successfully (recording started → editable project) measured monthly.
- Browser crash during a recording recovers the recorded content in ≥98% of crashes (test scenarios cover: tab close, OS sleep, browser crash, browser killed).
- First-time recording flow completes in ≤90 seconds for a user with permissions already granted.
- Auto-transcription starts within 5 seconds of Stop.

### Dependencies
- F2.4 (Transcription) for auto-transcription.
- F8.1 (Brand Kit) for auto-inheritance.
- F1.7 (resumable upload infrastructure shared with cloud import).

### Out of scope (for this feature)
- AI auto-zoom during recording (covered in F1.2).
- Remote multi-guest recording (covered in F1.3 — Rooms).
- Native mobile capture (covered in F1.5).
- 5K / ProRes capture (covered by optional desktop helper, scoped separately).

### Metrics
- Weekly recording sessions started / completed.
- % of recordings that import to projects and get a first edit within 24 hours.
- Crash-recovery success rate.
- Median time from Stop to "editor open with transcribed text visible."

---

## F1.2 — AI Speech-Triggered Auto-Zoom (Screen Recordings)

**Release:** R2
**Summary:** During or after screen recording, the AI listens to spoken content and dynamically zooms the screen capture to the region being discussed (e.g., "and over here in the settings panel..." → zoom to the settings panel).

### Problem statement
Screen recordings on small mobile screens are unwatchable when the screen is full of UI and the speaker is referring to a small region. Manual zoom keyframing is too slow.

### Primary personas
Solo Creator (tutorial), Sales Founder (demo), L&D Lead (training video).

### User stories
- As a tutorial creator I want my screen recording to zoom in automatically when I mention a UI element, so viewers can see what I'm talking about.
- As a viewer on mobile I want to read on-screen text without pinching, so I keep watching past the first 10 seconds.
- As the creator I want to override any wrong zoom with one click so the AI doesn't make my video weird.

### Functional requirements
1. **Detection of intent phrases:** "over here," "in this panel," "look at this," "you can see," "click on the X button," "this menu," + UI-element mentions ("the settings tab").
2. **Region inference:** combine spoken cue with visual analysis of the captured frame (mouse position, click events, OCR of on-screen text) to identify the zoom target.
3. **Zoom behaviour:** smooth ease-in zoom (default 1.5×, max 2.5×), hold for the duration of the spoken reference + 1.5 seconds buffer, ease-out back to fit.
4. **Visual marker:** in the timeline, each AI zoom shows as an editable keyframe block the user can drag, resize, replace, delete, or convert to manual.
5. **Mouse-following:** during zoomed sections, the zoom region follows the cursor smoothly (configurable: follow / locked).
6. **Sensitivity slider:** Off / Conservative / Balanced / Aggressive. Conservative only zooms on explicit "click X" / "see X" cues. Aggressive zooms on any UI mention.
7. **Per-clip toggle:** on by default for screen recordings; user can disable globally or per project.
8. **Preview-then-apply:** AI generates zoom suggestions; user reviews diff (see P10) before any are applied. One-click "Accept all" or per-zoom approve.
9. **Works in post:** can be applied to any imported screen recording, not only newly captured ones.

### UX flow
1. After a screen recording finishes (or on import), the editor offers "✨ Add AI auto-zoom — found 12 moments to enhance." (Optional toast.)
2. User clicks → side panel shows each suggested zoom with timestamp, transcript snippet, and a "Preview" thumbnail.
3. User can accept all, accept selectively, or skip. Accepted zooms appear in the timeline as keyframe blocks.
4. User can then drag / resize / modify any zoom like any other timeline item.

### Inputs / Outputs
- **Inputs:** screen recording with audio; user sensitivity preference.
- **Outputs:** a set of timestamped zoom keyframes in the timeline.

### Edge cases & error handling
- **Multiple screens captured:** AI infers which screen is being referenced; if ambiguous, default to the screen with recent mouse activity.
- **No clear UI target:** skip the suggestion rather than zoom to a random region.
- **Speaker is off-camera narration only (no cursor):** rely on transcript + OCR; if no clear region, suggest a "spotlight" effect instead.
- **Very fast speech / dense UI references:** group adjacent zooms; never zoom-in-out faster than every 3 seconds (prevents seasickness).
- **Recording without audio:** feature is N/A; gracefully not offered.

### Sentiment guardrails
- **P10 (human-in-the-loop):** zooms are SUGGESTIONS, not auto-applied silently. Diff/preview before commit. Choppity's auto-zoom is praised partially because it can be disabled.
- **P6 (reversible):** every applied zoom is a discrete timeline item the user can delete without affecting the rest.

### Acceptance criteria
- On a standard tutorial benchmark set, ≥80% of AI-suggested zooms are accepted by the user without modification.
- Zoom transitions are smooth (no jitter; no zoom faster than 3-second intervals).
- "Off" mode truly disables the feature including the toast prompt.

### Dependencies
- F1.1 (Screen Recorder) for capture context.
- F2.4 (Transcription) for intent detection.
- F2.6 (AI Co-pilot) infrastructure for suggestion review UI.

### Out of scope
- Auto-zoom in webcam-only or non-screen content (different problem).
- Auto-pan effects on still images (covered by Scenes/Layouts in F2.3).

### Metrics
- % of screen recordings where the user accepts ≥1 AI zoom.
- Average # of accepted zooms per recording.
- % of suggested zooms rejected (signals tuning needed if >40%).
- Median user-edit time per zoom (target: <5 seconds).

---

## F1.3 — Rooms (Remote Multi-Guest Recording)

**Release:** R3
**Summary:** Link-based remote-recording rooms where up to 10 participants record locally on their own devices (so internet glitches don't degrade quality), with a synced cloud-backup recording per participant and 7-day guest file recovery.

### Problem statement
Podcasters and customer-interview teams need broadcast-quality audio + video from guests who are anywhere in the world. Existing Zoom recordings are low quality and compressed; existing Riverside/Descript Rooms are desktop-only and lose guests who can't install software.

### Primary personas
Solo Creator (podcaster), In-house Marketer (customer interviews), Vertical Power User (sermon co-host).

### User stories
- As a podcast host I want to invite guests via a link and get studio-quality audio without asking them to install anything.
- As a guest I want to join from my browser on my laptop OR my phone and have my track recorded locally so my bad Wi-Fi doesn't ruin the take.
- As a producer I want a cloud backup of every track so if a guest's laptop dies, we don't lose them.
- As the editor I want each speaker's track separated so I can mix them properly.
- As a host I want to leave timestamped notes during the call ("good clip starts here") that sync into the editor.

### Functional requirements
1. **Room creation:** host clicks "New Room"; gets a shareable URL with optional password / waiting room.
2. **Up to 10 participants** including host; expandable in Enterprise tier.
3. **Local recording per participant:** each browser/app records the participant's video + audio to their local disk in high quality.
4. **Cloud backup recording:** in parallel, a lower-bitrate continuous stream uploads to our cloud as insurance.
5. **Per-track upload after session:** when the session ends, each local recording is uploaded to the project, preserving separate audio + video tracks per speaker.
6. **Guest file recovery:** if a guest closes their browser before upload completes, their recording remains on their device for **7 days**. They can revisit the room URL within 7 days and resume the upload from where it stopped.
7. **Resolution & quality:** up to 4K per participant; configurable per room (lower default for mobile guests for battery).
8. **Mobile guest support:** iOS Safari + Android Chrome can join, record locally, and upload. (Major differentiator: Descript Rooms is desktop-only.)
9. **Live monitoring for the host:** see each participant's mic level, recording status, signal strength, upload progress.
10. **In-session controls:** mute any guest, hide any guest from frame (without removing audio), drop a guest.
11. **Editor comments during recording:** host can drop timestamped text markers ("good answer," "tee up next question," "edit this out") that arrive in the editor as comments on the transcript.
12. **Lobby / waiting room:** new joins land in a lobby until host admits.
13. **Re-join during session:** dropped participants can re-join with their tracks preserved (new join becomes track N+1).
14. **Branding:** room lobby can show host's brand kit (logo, color).
15. **Recording session limits per tier per drive per month:** Free 2 hrs; Creator 5 hrs; Pro 15 hrs; Team 25 hrs; Business+ unlimited.
16. **Quality fallback:** if a participant's device can't sustain HD recording (CPU/disk limited), step down to 720p with explicit notice.

### UX flow
1. Host clicks **New Room** → optionally configures: password, waiting room on/off, default quality.
2. Host shares the link with guests via copy/paste, email, or in-app invite.
3. Guests open link → choose name + device check (mic/cam/connection test with auto-grade) → join lobby.
4. Host admits guests; session starts; participants see each other; host hits **Start Recording**.
5. During session: host can drop notes; producers (if F1.4) can manage; everyone records locally.
6. Host hits **Stop Recording** → "Uploading…" status per participant; guests can leave once upload reaches 100%.
7. Editor opens with all tracks separated, transcribed, ready to edit.

### Inputs / Outputs
- **Inputs:** participants' video + audio streams.
- **Outputs:** a project with one separated track per participant + a stitched preview + transcription + host comments imported.

### Edge cases & error handling
- **Guest's disk runs out:** stop their local recording, keep the cloud backup; surface advisory to host immediately.
- **Guest's browser crashes:** prompt for resume on rejoin within 7 days; if not, use the cloud backup.
- **Guest refuses cam:** allow audio-only join.
- **Bandwidth-too-low for cloud backup:** continue local recording; warn host.
- **More than 10 wanting to join:** put extras in lobby with "Room full" message.
- **Session > tier limit:** warn at 90%; auto-stop at 100% with content preserved.

### Sentiment guardrails
- **P1:** the cloud backup + 7-day guest recovery exist specifically to avoid the "lost the entire interview" pain that defines competitor failures.
- **P7:** mobile guest support is non-negotiable from day 1. Every competitor lacks this.
- **P11:** the editor opens with everything stitched and labeled; no separate "post-production import" step.

### Acceptance criteria
- Audio quality of locally-recorded guest tracks is indistinguishable from a local-only solo recording at the same bitrate (blind A/B test).
- 99% of completed sessions produce a usable, fully-recovered project within 30 minutes of session end.
- Mobile guests can join, record, and successfully upload from iOS Safari and Android Chrome.

### Dependencies
- F1.7 (resumable upload).
- F2.4 (multitrack transcription).
- F8.7 (Comments) for editor-comment sync.

### Out of scope
- Live streaming to YouTube/Twitch (different product).
- Real-time language interpretation (R5+).
- AI moderation during recording (R5+).

### Metrics
- Sessions/month per plan.
- % of sessions producing usable output ("session reliability").
- Average guest count per session.
- % of mobile guest joins.

---

## F1.4 — Control Room (Producer Mode)

**Release:** R3
**Summary:** Off-screen producers join a Rooms session to manage it without being recorded — start/stop, push-to-talk to hosts/guests, mute participants, monitor levels.

### Problem statement
Professional podcast and interview workflows have a director/producer separate from the on-screen host. Today that requires hacks (silent muted producer with no cam) or external software.

### Primary personas
In-house Marketer (interview series), Solo Creator (with editor), Vertical Power User (newsroom).

### User stories
- As a producer I want to start/stop the recording from outside the frame so the host can stay in flow.
- As a producer I want to whisper to the host without being heard by the guest, so I can prompt them.
- As a producer I want to monitor every guest's audio levels and mute someone whose mic is clipping.

### Functional requirements
1. **Producer join link:** distinct from guest link; producer joins the Room but does not appear in tracks or video grid.
2. **Producer count per session:** Business tier — 3; Enterprise — configurable.
3. **Push-to-talk:** producer holds a hotkey (default `T`) to speak; their audio is heard by selected recipients but not recorded into the session.
4. **Recipient targeting:** producer chooses who hears them — all participants, host only, specific guest, host + co-host.
5. **Session controls:** producer can Start/Stop recording, switch active layout, mute any participant's mic in the recording (note: physical mute, not just visual).
6. **Level monitoring:** producer sees real-time VU meters per participant with peak warnings.
7. **Drop participant:** producer can disconnect a misbehaving participant.
8. **Cue cards / teleprompter (R3+):** producer can send text snippets to host's screen as cues.
9. **Producer chat:** private text channel between producers (not in the recording).
10. **Recording state visibility:** all participants see a clear "REC" indicator when active.

### UX flow
1. Host invites producer via a separate **Invite Producer** button → producer link with role embedded.
2. Producer opens link → joins lobby with "Producer" badge → admitted.
3. Producer sees the standard guest grid PLUS a producer panel: level meters, controls, push-to-talk button.
4. Session runs; producer manages without appearing.
5. Producer chat history is exported separately (not in project).

### Edge cases & error handling
- **Producer accidentally enables cam:** warn "You're in producer mode and won't appear — but if you want to be visible, switch role."
- **Producer push-to-talk to a participant who has left:** audible feedback; cue card option to send text instead.
- **Multiple producers issuing conflicting commands:** last-write-wins on Start/Stop with a brief 2-second confirmation window.

### Sentiment guardrails
- **P10:** producer actions that affect the recording (mute, drop, stop) require explicit click — no hotkeys for destructive ops.
- **P12:** producer chat is logged for audit (without being in the published recording) so disputes can be resolved.

### Acceptance criteria
- Producer can join, talk to host without guest hearing, and start/stop recording in a single session without engineering escalation.
- Push-to-talk latency ≤200ms.
- Producer audio never appears in the exported project tracks.

### Dependencies
- F1.3 (Rooms).

### Out of scope
- Producer of a one-on-one Rooms session (allowed but the value is in multi-guest).
- AI auto-producer suggestions (R5).

### Metrics
- % of Rooms sessions using a producer.
- Producer-to-session ratio.
- # of producer-driven mute/stop events per session (sanity check).

---

## F1.5 — Native iOS + Android Apps

**Release:** R4
**Summary:** First-class native mobile apps for both platforms with capture (camera, mic, screen), project review/approve, comment, and schedule. Heavy editing remains on web/desktop; the loop closes on mobile.

### Problem statement
~60%+ of short-form creators work on phones. Every competitor except CapCut lacks this. P7 (mobile-first parity) is the single biggest competitive gap in the field.

### Primary personas
Solo Creator (TikTok-native), In-house Marketer (review/approve on the go), Sales Founder (record while traveling), Agency (multi-client approval).

### User stories
- As a creator I want to record a vertical video on my phone and have it instantly appear in the same project I'm editing on my laptop, without zipping/airdropping.
- As a marketer I want to review and approve a 30-second clip my team made from my desk-bound editor, while I'm on a train.
- As a sales rep I want to record a personalized loom-style video from my phone, with my brand kit applied, and share a link before my next meeting.
- As a creator I want push notifications when a render is done or a comment lands, so I don't keep refreshing.

### Functional requirements
1. **Capture surface (mobile):**
   - Camera capture (front + back + dual selfie+wide where supported).
   - Mic-only voice memo.
   - Screen recording (where OS allows; iOS ReplayKit / Android MediaProjection).
   - Each capture auto-uploads to the user's project library (resumable).
2. **Project library (mobile):** browse all projects, search by name, filter by status (in-progress / shared / scheduled).
3. **Mobile editor (light):**
   - Trim, split, reorder clips.
   - Auto-caption + caption style preset selection.
   - One-tap "Make a clip with AI" → triggers AI Clip Generator (F6.6) on a long source.
   - Approve / reject AI suggestions from the agent.
4. **Review + approve workflow:**
   - View any project shared with you.
   - Play with captions.
   - Comment on a timestamp.
   - Approve or request changes.
5. **Mobile scheduler:**
   - View calendar (F8.6).
   - Drag to reschedule.
   - Approve a scheduled post.
6. **Push notifications:** render complete; comment added; @mention; post published; post failed; approval requested.
7. **Brand kit auto-apply:** any mobile-captured content inherits the user's brand kit.
8. **Offline-tolerant capture:** captures saved locally; upload queues when online; no recording loss.
9. **Biometric sign-in:** Face ID / Touch ID / fingerprint.
10. **Light & dark mode** matching OS.
11. **Performance:** capture starts ≤2s after tap; app launch ≤1.5s on mid-tier devices (iPhone 12 / Pixel 6 baseline).

### UX flow
1. User opens app → biometric unlock → home tab shows: Record, My Projects, Inbox (notifications), Calendar.
2. Tap **Record** → camera with capture-mode picker → capture → upload visible in progress.
3. Tap **My Projects** → list → tap a project → light editor or review mode.
4. Inbox shows pending approvals, comments, render-done events.
5. Calendar shows scheduled posts; tap one to view/edit.

### Inputs / Outputs
- **Inputs:** mobile-captured media, comments, approvals.
- **Outputs:** projects synced to web, scheduled posts triggered, approvals routed.

### Edge cases & error handling
- **No connectivity during capture:** continue capturing; queue upload; show "1 pending upload" badge.
- **Low storage:** warn at 1GB free; refuse capture below 200MB free.
- **App killed mid-upload:** resume on next open.
- **Permissions denied:** explain why each is needed (cam/mic/photos/notifications) with link to Settings.
- **OS version too old:** graceful degradation with "some features unavailable" banner; never crash.

### Sentiment guardrails
- **P7:** the single most-cited cross-product gap. We don't ship "mobile in 2027"; we ship in R4.
- **P1:** mobile capture must never lose content.
- **P11:** the mobile app shares the user's web subscription, brand kit, projects, scheduled posts — one account.

### Acceptance criteria
- App Store + Play Store rating ≥4.5 after first 90 days, ≥10,000 reviews combined within a year.
- Capture-to-web-project median latency ≤30 seconds for a 60-second clip on a 4G connection.
- ≥40% of paying users active on mobile within 6 months of mobile launch.
- Crash-free session rate ≥99.5% (industry standard).

### Dependencies
- F1.7 (resumable upload).
- F2.6 (Co-pilot) for light AI ops.
- F7.7 (Social Scheduler).
- F8.7 (Comments) for review flow.

### Out of scope
- Full timeline editing on mobile (R5+; if at all — pro editors expect to be on a screen).
- Native mobile Rooms hosting (joining as a guest is in F1.3; hosting from mobile is R5+).
- Mobile-exclusive features ("only on mobile") — we don't fragment.

### Metrics
- Mobile MAU / web MAU ratio.
- % of projects with any mobile-originated content.
- Mobile capture → published-post conversion rate.

---

## F1.6 — QR-Code Mobile-to-Desktop Upload

**Release:** R4 (or R2 if mobile apps slip)
**Summary:** From the web editor, surface a QR code that, when scanned by any phone, lets the user upload media straight into the active project — no app install required.

### Problem statement
Power users on desktop frequently need to grab a quick photo or short clip from their phone into the current project. AirDrop / Google Drive / email is friction.

### Primary personas
All personas.

### User stories
- As a desktop user I want to drop a photo from my phone into the project I'm editing without leaving my chair.
- As a non-mobile-app user I want a way to send mobile media without installing anything.

### Functional requirements
1. **QR generation:** in the editor's `+ Add Media` menu, an option "From phone" generates a single-use QR code (expires in 10 minutes).
2. **Scan flow:** phone scans → mobile browser opens a focused upload page tied to the active project (no signup required for the same logged-in user; tokenized link).
3. **Multi-file selection:** user picks one or many files from phone gallery / camera roll.
4. **In-browser camera capture:** option to capture fresh content (photo / video) instead of picking from gallery.
5. **Upload progress visible on desktop:** the desktop editor shows real-time progress per file; files land in the project media library.
6. **Auto-place:** if the editor cursor is on the timeline, the uploaded file optionally appears at the playhead.
7. **Security:** the upload token is tied to the user session; cannot be reused or shared to other accounts.

### UX flow
1. Desktop editor → `+ Add Media` → "From phone" → QR appears.
2. User scans QR with phone → mobile browser opens upload page.
3. User picks files or captures fresh → tap Upload.
4. Progress visible on both phone and desktop.
5. When upload completes, files appear in desktop project; QR auto-invalidates.

### Edge cases & error handling
- **QR scanned by unauthorised phone:** if the user is not signed in, fall back to a sign-in prompt before allowing upload.
- **Phone loses connection mid-upload:** resume on reconnect.
- **Files too large for tier:** clear error with upgrade nudge.

### Sentiment guardrails
- **P11:** no separate app required.
- **P8:** the upload token expires fast; nothing persists on a phone.

### Acceptance criteria
- Scan-to-upload-page open ≤3 seconds on a typical 4G phone.
- 95% of uploads ≤100MB complete successfully on first try.

### Dependencies
- F1.7.

### Out of scope
- Bulk import of an entire camera roll (not the use case).
- QR for sharing finished projects (different flow — see F7.1 Public Share).

### Metrics
- % of sessions that use QR upload at least once.
- Files uploaded per QR session.

---

## F1.7 — Unified Cloud-Drive Import

**Release:** R1 (basic: Drive, Zoom, YouTube URL) → R4 (full set: Drive, Dropbox, OneDrive, Box, Zoom)
**Summary:** One-click import from major cloud drives and from YouTube URL into a new or existing project, with resumable upload infrastructure shared across the product.

### Problem statement
Users keep raw video in Google Drive, Dropbox, OneDrive, Box, or Zoom cloud recordings. They want to bring it into the editor without download-then-upload. HipClip's "5 cloud sources" is the breadth target.

### Primary personas
All personas. Especially marketers (cloud-stored brand assets), enterprises (Box/OneDrive), podcasters (Zoom interviews).

### User stories
- As a marketer I want to pick a file from Google Drive and have it in my project in seconds.
- As a podcaster I want to import a Zoom cloud recording without downloading 4GB to my Mac first.
- As any user I want to paste a YouTube URL and import the transcript + video (where licensing allows my own content).
- As a user with patchy Wi-Fi I want my upload to resume if it drops.

### Functional requirements
1. **Sources supported by R4:** Google Drive, Dropbox, OneDrive, Box, Zoom Cloud Recordings, YouTube URL (own content only).
2. **OAuth connect per source:** users connect each provider once; tokens stored securely; revocable from settings.
3. **File picker:** native-feeling picker per provider; supports search, recent, by-folder.
4. **Multi-file import:** import many files at once; each becomes a media asset in the project.
5. **Server-to-server transfer where supported:** for Drive/Dropbox/OneDrive/Box, content moves provider → our cloud directly (no client download/upload) to maximise speed.
6. **Resumable upload (for non-supported sources):** chunked uploads with resume on failure; visible progress.
7. **YouTube URL:** paste a URL → import transcript + downloadable video where the URL is the user's own channel OR has clearly permissive licensing. Block restricted content with clear messaging.
8. **Auto-transcribe on import.**
9. **Format normalization:** if format is exotic (e.g., AVCHD raw, surround multitrack), normalize for editing; preserve original.
10. **Progress UI:** unified progress center showing all imports / uploads / renders across the workspace.
11. **Audit log:** every cloud-import recorded with source / file ID / who triggered / when.

### UX flow
1. User clicks **+ Import** → picker shows local file / from-phone (F1.6) / from-cloud / from-URL.
2. User picks a source → OAuth flow if not connected → file picker → multi-select → Import.
3. Progress center shows status; user can continue editing in parallel.
4. As files complete, they appear in media library; if assigned to a project, transcription starts.

### Edge cases & error handling
- **OAuth token expired:** prompt re-auth inline without losing the import in progress.
- **File too large for tier:** surface upgrade path; allow import as a queued job on confirmation.
- **YouTube URL is restricted / private / age-gated:** clear error; do not attempt.
- **Cloud provider rate-limit:** automatic backoff with status visible to user.
- **Network drops:** resume.

### Sentiment guardrails
- **P1:** resumable uploads are core. Lost uploads = the universal HipClip/CapCut/Pictory complaint.
- **P11:** the same import surface across all features; not five separate "Connect Drive" buttons.
- **P8:** OAuth scopes minimised; only read access requested.

### Acceptance criteria
- Import a 1GB file from Google Drive completes in ≤2 minutes over a typical broadband connection (server-to-server).
- Resume works after a forced disconnect for ≥95% of attempted imports.
- All 6 cloud sources working in R4.

### Dependencies
- F2.4 (Transcription) for auto-transcribe on import.

### Out of scope
- Importing entire folders recursively (R5+).
- Two-way sync (we are not a Dropbox replacement; one-way import only).

### Metrics
- % of new projects that include at least one cloud-imported file.
- Import success rate per source.
- Median import time per GB per source.

---

*End of Pillar 1 — Capture specifications.*
