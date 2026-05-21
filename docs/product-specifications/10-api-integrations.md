# Pillar 10 — API & Integrations — detailed specifications

> **Pillar question:** "How can our product live inside our customer's stack?"
> **Release coverage:** R4 (F10.1–F10.6, F10.8), R4 (F10.7)

---

## F10.1 — Public REST API

**Release:** R4
**Summary:** Self-serve API for upload, transcribe, generate-clip, render, publish, get-analytics. Pay-as-you-go pricing from $10, no expiration on prepaid credits (Wayin model).

### Problem statement
Wayin's API-first + pay-as-you-go from $10 with no expiration is the most user-friendly API pricing in the market. Choppity has REST + webhooks. We match and exceed.

### Primary personas
Developer/builder customers, ISVs, agency tech leads, enterprise integrators.

### User stories
- As a developer I want to upload a video and get clips back via API.
- As a startup I want to embed video creation in my own product.
- As any user I want predictable pricing with no expiration on credits.

### Functional requirements
1. **API endpoints (REST + JSON):**
   - `POST /assets` — upload media (multipart or signed-URL).
   - `GET /assets/{id}` — get asset metadata + transcription.
   - `POST /projects` — create project.
   - `POST /projects/{id}/clips` — generate clips with viral score.
   - `POST /projects/{id}/renders` — render with options.
   - `POST /projects/{id}/posts` — schedule a social post.
   - `GET /analytics/{share_id}` — get share analytics.
   - `POST /transcribe` — standalone transcription.
   - `POST /translate` — standalone translation.
   - `POST /tts` — text-to-speech.
   - `POST /dub` — full dubbing job.
   - `POST /content-pack` — generate copywriter suite outputs.
2. **Authentication:** API keys per workspace; key rotation; scoped permissions.
3. **Rate limits per tier;** tier-aware error responses with reset times.
4. **Pricing:** pay-as-you-go starting at $10; credits never expire. Per-operation pricing transparent.
5. **Quotas:** explicit per endpoint per minute / hour / month.
6. **Webhooks** (see F9.6).
7. **Idempotency keys** on mutating endpoints.
8. **Pagination + filtering** standard on list endpoints.
9. **Versioned API** (`/v1/...`); deprecation policy 12 months notice.
10. **OpenAPI spec** published; auto-generated client SDKs in JS, Python, Ruby, Go.
11. **API console** in dashboard: try every endpoint, copy curl snippets.
12. **API logs** per workspace: every request visible with response + latency.

### UX flow
1. Settings → API → Generate Key → save.
2. Use key in curl / SDK; see logs in dashboard.

### Sentiment guardrails
- **P2:** prepaid credits never expire.
- **P11:** API and app share the same workspace, brand kit, billing.

### Acceptance criteria
- All listed endpoints documented + working at R4 launch.
- API uptime SLA 99.9%.
- Pricing transparency: actual charge matches docs 100%.

### Dependencies
- All pillar features expose their core operations to API.

### Metrics
- API users.
- API revenue.
- Average API spend per active key.

---

## F10.2 — Webhooks (cross-reference)

**Release:** R3
**Summary:** Subscribe to lifecycle events.

(See F9.6 for full spec — webhooks are documented under Trust because audit log is part of the same pillar there.)

---

## F10.3 — MCP Server

**Release:** R4
**Summary:** Model Context Protocol server exposing 15+ tools, callable from Claude Desktop, Claude Web, ChatGPT, Cursor, Kiro, Windsurf, Claude Code.

### Problem statement
ScaleReach + Wayin have MCP; Descript has it. Developer audience values the ability to drive the product from their AI client.

### Primary personas
Developer power users, AI-enthusiast prosumers, agency tech leads.

### User stories
- As a Claude user I want to ask Claude to generate clips from a video file.
- As a Cursor user I want to call our video toolchain from my IDE.
- As a power user I want my AI client to be a remote control for the product.

### Functional requirements
1. **MCP server endpoint** with at least 15 tools:
   - `upload_media`, `transcribe`, `generate_clips`, `render_project`, `add_captions`, `enhance_audio`, `generate_voiceover`, `translate_captions`, `dub_audio`, `create_brand_kit`, `schedule_post`, `get_analytics`, `search_library`, `create_share_link`, `generate_content_pack`.
2. **Client compatibility tested:** Claude Desktop, Claude Web, ChatGPT (when MCP support lands), Cursor, Kiro, Windsurf, Claude Code, custom MCP clients.
3. **Per-tool documentation** with example prompts.
4. **Auth via API key** (F10.1).
5. **Tool-call audit log** per workspace.

### UX flow
1. Settings → MCP → "Connect Claude Desktop" → guided setup with auth.
2. User in Claude says "Generate viral clips from this video URL"; agent calls our MCP server.

### Sentiment guardrails
- **P10:** MCP tool calls produce diffs the user can review in our app.

### Acceptance criteria
- 15+ tools live; tested with 4+ MCP clients.

### Dependencies
- F10.1.

### Metrics
- MCP installs.
- Tool calls per workspace.

---

## F10.4 — ChatGPT Plugin / Custom GPT

**Release:** R4
**Summary:** Installable GPT in the ChatGPT store that lets users create/edit videos by chatting in ChatGPT.

### Problem statement
Pictory has Pictory GPT; valuable acquisition surface.

### Primary personas
ChatGPT power users.

### User stories
- As a ChatGPT user I want to make videos without leaving the chat.

### Functional requirements
1. **Custom GPT** in the ChatGPT store with our branding.
2. **Actions covered:** generate video from text, generate clips, generate copy, schedule post.
3. **Auth flow:** sign in via OAuth on first action.
4. **Output:** results shown in chat with share links / preview thumbnails.

### UX flow
1. User installs GPT → asks "Make me a 30-sec product video about X" → result.

### Acceptance criteria
- GPT functional in ChatGPT store.

### Dependencies
- F10.1.

### Metrics
- GPT installs / sessions.

---

## F10.5 — Zapier + Make + n8n

**Release:** R4
**Summary:** First-class integrations with documented triggers and actions for each.

### Problem statement
Pictory + Wayin both have these. Standard expectation for SaaS.

### Primary personas
No-code builders, marketing ops, agency.

### User stories
- As a marketer I want a Zap that, when a new lead arrives in HubSpot, generates a personalized video.
- As a no-code builder I want Make/n8n to drive video creation from any event.

### Functional requirements
1. **Zapier app** with triggers (new project, render complete, post published) and actions (create project, generate clips, schedule post).
2. **Make module** equivalent.
3. **n8n node** equivalent.
4. **Triggers + actions catalog** matches the API capabilities.

### Acceptance criteria
- All 3 integrations live with parity.

### Dependencies
- F10.1.

### Metrics
- Zaps active.

---

## F10.6 — Chrome / Browser Extension

**Release:** R4
**Summary:** One-click capture-and-publish from any web page (YouTube URL → bring into project; selected text → blog-to-video; current tab → screen recording).

### Problem statement
Pictory has it; Wayin's parent has it. Frictionless capture surface.

### Primary personas
All personas.

### User stories
- As a creator browsing YouTube I want to send a video to my project with one click.
- As a writer reading a blog I want to highlight a paragraph and have it become a video.

### Functional requirements
1. **Chrome + Edge + Firefox versions** at minimum.
2. **Actions:**
   - "Send video to project" (YouTube, Vimeo, etc., where licensing allows).
   - "Send selected text to script-to-video."
   - "Send page URL to URL-to-video."
   - "Record current tab" (uses browser screen recorder API).
   - "Save link to Planner."
3. **Auth via existing session.**

### UX flow
1. Click extension → pick action → done.

### Acceptance criteria
- Works in top 3 browsers.

### Dependencies
- F1.1, F3.1.

### Metrics
- Extension installs.
- Actions per user per week.

---

## F10.7 — Round-Trip to Pro NLEs

**Release:** R4
**Summary:** Export timeline as XML/AAF/EDL for Premiere, FCP, Resolve, Pro Tools, Audition.

### Problem statement
Pro editors who outgrow our editor for one project shouldn't have to leave permanently.

### Primary personas
Solo Creator (advanced), Agency (high-end work).

### User stories
- As a pro editor I want to take my project to Premiere for final polish.

### Functional requirements
1. **Export formats:** Final Cut XML (FCPXML), Premiere XML/AAF, DaVinci Resolve XML/EDL, Pro Tools OMF, Avid AAF, Logic OMF.
2. **What survives:** all clips with timing, audio levels, video positioning, captions (as separate layer), markers.
3. **What doesn't survive (flattened to media):** AI-applied effects (relight, style transfer, inpainting) — exported as rendered media with notice.
4. **Re-import support:** changes made in Premiere can be re-imported as XML.

### UX flow
1. Export → Round-trip XML → pick format → download.

### Acceptance criteria
- ≥95% of edits intact on export to top 3 NLEs.

### Dependencies
- F2.2.

### Metrics
- XML exports per month.

---

## F10.8 — Podcast Host Publishing

**Release:** R4
**Summary:** One-click publish to Buzzsprout, Transistor, Castos, Captivate, Podbean, Spotify for Podcasters, Apple Podcasts.

### Problem statement
Podcasters need this to close the loop; Descript supports a similar set.

### Primary personas
Solo Creator (podcaster).

### User stories
- As a podcaster I want to publish to Buzzsprout / Transistor directly from the editor.

### Functional requirements
1. **OAuth per host.**
2. **Publish action:** audio file + episode title + description + show notes + season/episode.
3. **Status tracking:** Published / Failed.
4. **Re-publish updated episode** supported.

### Acceptance criteria
- All 7 hosts working.

### Dependencies
- F6.1 (show notes auto-generation).

### Metrics
- Podcast publishes per workspace.

---

*End of Pillar 10 — API & Integrations specifications.*
