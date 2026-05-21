# Pillar 8 — Operate (Brand, Collaboration, Planning) — detailed specifications

> **Pillar question:** "How does our team plan, brand, collaborate, and operate the workflow?"
> **Release coverage:** R1 (F8.1 lite), R2 (F8.5, F8.6, F8.9), R3 (F8.1 full, F8.2, F8.3, F8.4, F8.7), R5 (F8.8)

---

## F8.1 — Brand Kit (Lite → Full)

**Release:** R1 (Lite) → R3 (Full Brand Studio)
**Summary:** R1: logo, primary/secondary colors, brand fonts. R3: lockable custom layouts, branded templates, branded share pages, branded intros/outros, branded captions, branded export, admin enforcement.

### Problem statement
Marketing / agency tier won't adopt without it. Lockable brand assets are an admin lever Descript ships at Business tier.

### Primary personas
In-house Marketer, Agency, Sales Founder, Enterprise.

### User stories
- As a marketing lead I want every video produced by my team to use our exact brand colors and fonts.
- As an admin I want to lock the brand kit so junior team members can't override it.
- As an agency I want a different brand kit per client.
- As a creator I want one-click "apply brand kit" to inherit logo + colors + fonts + intros + outros.

### Functional requirements
**R1 Lite:**
1. **One brand kit per workspace.**
2. **Logo upload:** primary + favicon variants.
3. **Brand colors:** primary, secondary, accent, background, text (with hex / RGB / HSL).
4. **Brand fonts:** upload custom fonts OR pick from Google Fonts; assign to heading / body / caption.
5. **Application:** brand kit appears as a one-click apply in scenes, captions, share page, share embed.

**R3 Full Brand Studio:**
6. **Multiple brand kits per workspace** (Agency: one per client).
7. **Branded scene/layout packs:** templated arrangements with brand styling pre-applied.
8. **Branded intros / outros:** reusable intro/outro segments inserted at one click.
9. **Branded caption styles:** Brand-locked caption presets.
10. **Branded share pages & player skin.**
11. **Brand watermark:** logo overlay control per project / per export.
12. **Admin lock:** specific assets / styles locked from override; junior members cannot change.
13. **Brand asset library:** centralized library of approved logos, B-roll, fonts, music, stock.
14. **Brand consistency monitor:** dashboard showing recent outputs and brand-rule violations.
15. **Brand approval workflow:** designated reviewer can approve / reject brand-violating outputs.
16. **Brand voice integration:** F6.2 links to brand kit.

### UX flow
1. Settings → Brand Kit → upload logo + pick colors + fonts → Save.
2. New project → "Brand Kit: [Default]" applied; user picks alternative if multi-kit.
3. Admin → lock assets; team members see locked items grayed out.

### Edge cases & error handling
- **Conflicting brand kit + project-level override:** project-level wins unless locked.
- **Font fails to load on viewer's browser:** fallback to web-safe with notice.

### Sentiment guardrails
- **P11:** brand kit cascades everywhere (editor, captions, share, export, social posts).
- **P5:** branded AI outputs (copy, captions) all honor brand voice (F6.2).

### Acceptance criteria
- Brand kit applied in <2 sec across all surfaces.
- Lockable assets cannot be overridden without admin permission.
- 100% of caption / share / export surfaces inherit brand kit.

### Dependencies
- F6.2 (Brand Voice), F2.5 (Captions), F2.3 (Scenes), F7.1 (Share).

### Out of scope
- Brand-asset DAM beyond images/fonts/music (R5+ if demanded).

### Metrics
- % of paying workspaces with brand kit configured.
- Brand-kit-applied output rate.

---

## F8.2 — Real-Time Collaborative Editing

**Release:** R3
**Summary:** Multiple cursors on same project, comments on transcript or timeline, @mentions trigger notifications, conflict-free editing.

### Problem statement
Standard expectation for team product in 2026.

### Primary personas
In-house Marketer, Agency, L&D Lead.

### User stories
- As a team we want to edit the same project simultaneously without overwriting each other.
- As a producer I want to see where my co-editor is working in real-time.
- As a reviewer I want to drop a comment on a specific moment.

### Functional requirements
1. **Multi-user cursors:** each user has a colored cursor visible to others in the transcript / timeline.
2. **Presence indicator:** who's currently in the project.
3. **Conflict-free edits:** operational transforms or CRDT; non-overlapping edits merge cleanly.
4. **Comments:**
   - On transcript words.
   - On timeline regions.
   - Threaded replies.
   - @mention sends notification.
   - Resolve / unresolve.
5. **Activity feed:** per-project changelog (who did what, when).
6. **Locked sections:** a user can lock a section while they edit it; others see "Locked by [name]."
7. **Concurrent rendering safe:** rendering / exporting doesn't block edits.

### UX flow
1. Two users open same project → both see each other's cursors.
2. User A comments on a transcript word → @mentions User B.
3. User B sees notification → clicks → jumps to comment → replies → resolves.

### Sentiment guardrails
- **P1:** large project collab must not degrade performance.
- **P10:** every action visible in activity feed.

### Acceptance criteria
- 5 simultaneous users on a project without performance degradation.
- No edit conflicts on non-overlapping changes.

### Dependencies
- F2.1, F2.2.

### Out of scope
- Voice/video chat inside the editor (R5+).

### Metrics
- Concurrent users per project.
- Comments per project.

---

## F8.3 — Roles & Permissions

**Release:** R3
**Summary:** Workspace + project-level roles — Editor / Approver / Stakeholder (read+comment) / Viewer.

### Problem statement
Standard for team products. Pictory + Choppity have it; we match.

### Primary personas
In-house Marketer, Agency, L&D Lead, Enterprise.

### User stories
- As an admin I want to give editors edit access, stakeholders comment-only, viewers read-only.
- As an agency I want client stakeholders to comment but not edit.
- As an admin I want to revoke access in one click.

### Functional requirements
1. **Roles per workspace:** Admin / Editor / Stakeholder / Viewer.
2. **Role permissions matrix:**
   - Admin: everything + billing + member management.
   - Editor: create, edit, render, schedule, publish.
   - Approver (R4): same as editor + can approve scheduled posts.
   - Stakeholder: view + comment + approve where permitted.
   - Viewer: view only.
3. **Project-level overrides:** specific projects can have different role assignments.
4. **Guest access:** invite external collaborators (per-project, limited role).
5. **Audit log:** role changes logged.

### UX flow
1. Settings → Members → Invite / change role.
2. Per-project Share → role override for specific users.

### Sentiment guardrails
- **P8:** role changes audit-logged.

### Acceptance criteria
- Role enforcement 100% reliable in all editing surfaces.

### Dependencies
- F8.2.

### Metrics
- # of workspaces using role granularity.

---

## F8.4 — Full Brand Studio (Admin Governance)

**Release:** R3
**Summary:** Dedicated brand-governance surface where admins upload + lock brand assets, create branded scene/layout packs, approve outputs, track consistency.

(See F8.1 R3 section for detail. Treated as the admin counterpart of F8.1.)

### Functional requirements (admin-specific additions to F8.1)
1. **Approval queue:** all generated/scheduled outputs reviewed by an approver before publish (optional, per workspace).
2. **Brand consistency dashboard:** % of recent outputs honoring brand kit; offending outputs visible.
3. **Asset locks:** any brand asset can be locked (cannot be modified by editors).
4. **Versioned brand kits:** brand kit changes versioned; rollback supported.
5. **Asset usage reporting:** which logo/colors/fonts are used where.
6. **Team-wide brand alert:** "Your logo is being used in 12 projects this week."

### Sentiment guardrails
- **P12:** approval queue surfaces blockers visibly; reviewers get nudges.

### Acceptance criteria
- Approval queue functional end-to-end.
- Brand consistency dashboard accurate.

### Metrics
- Approval rate.
- Brand consistency score per workspace.

---

## F8.5 — Content Planner (Kanban)

**Release:** R2
**Summary:** A board where ideas live as cards; cards move through Idea → Drafted → Approved → Scheduled → Published. Cards link to projects + scheduled posts. Each card holds platform-specific copy previews, target dates, approval comments.

### Problem statement
Choppity-unique. Closes the "ideation → execution" loop inside one product. Reddit positively cited.

### Primary personas
Solo Creator, In-house Marketer, Agency.

### User stories
- As a creator I want a Kanban board for video ideas in development.
- As a marketing lead I want to track every video from idea through publish.
- As an agency I want a board per client.

### Functional requirements
1. **Default columns:** Ideas / Drafted / Approved / Scheduled / Published. User can customize.
2. **Cards:**
   - Title.
   - Description.
   - Owner.
   - Due date.
   - Tags (platform, campaign, vertical).
   - Linked project (when one is created from the card).
   - Linked scheduled posts.
   - Comments / approval history.
3. **Card creation surfaces:** from Brainstorm (F3.8), from any project, manually.
4. **Drag between columns:** standard Kanban UX.
5. **List + table view alternatives.**
6. **Filter / search.**
7. **Multiple boards per workspace** (e.g., one per client for agencies).
8. **Calendar integration:** card with due date appears in calendar (F8.6).
9. **Notifications:** card moved / due-date approaching / @mention.

### UX flow
1. Planner → New card → fill in or generate from Brainstorm → drag through stages.
2. When card hits "Approved," user can one-click "Create project from card."

### Sentiment guardrails
- **P11:** planner is part of the product, not a separate app.

### Acceptance criteria
- Smooth Kanban interactions; cards load instantly.

### Dependencies
- F3.8 (Brainstorm), F8.6 (Calendar), F7.7 (Scheduler).

### Metrics
- Cards per workspace.
- Card-to-published-post conversion rate.

---

## F8.6 — Content Calendar

**Release:** R2
**Summary:** Date / platform / status / campaign view of what's scheduled to publish where and when. Drag-to-reschedule, conflict detection.

### Problem statement
Choppity unique. Standard for any marketing tool with scheduling.

### Primary personas
In-house Marketer, Agency, Solo Creator.

### User stories
- As a marketing lead I want to see our whole publishing month at a glance.
- As any user I want to drag a post to reschedule.
- As an agency I want a calendar per client.

### Functional requirements
1. **Calendar views:** Month / Week / Day / Agenda.
2. **Color coding:** by platform, by campaign, by status.
3. **Drag-to-reschedule.**
4. **Conflict detection:** "You have 3 posts scheduled within 1 hour on TikTok."
5. **Campaigns:** group posts under named campaigns.
6. **Filter:** by platform, campaign, status, creator.
7. **Print / export:** PDF or CSV for stakeholders.
8. **Sync with external calendars:** read-only ICS feed.

### UX flow
1. Calendar tab → see all scheduled posts → drag to reschedule.

### Sentiment guardrails
- **P10:** any reschedule shows confirmation if move >24h.

### Acceptance criteria
- Calendar performance smooth with 200+ scheduled posts.
- Conflict detection accurate.

### Dependencies
- F7.7 (Scheduler), F8.5 (Planner).

### Metrics
- Active calendar users.
- Posts scheduled per month per workspace.

---

## F8.7 — Comments + Approval Workflows

**Release:** R3
**Summary:** Timestamped comments on transcript + timeline. Approval workflows ("needs Marketing Director sign-off before publish"). Audit trail.

### Problem statement
Standard for team products; differentiator at depth (Choppity has it; Descript at workspace level).

### Primary personas
In-house Marketer, Agency, L&D Lead, Enterprise.

### User stories
- As a reviewer I want to comment on a specific word/moment with @mention.
- As an admin I want all scheduled posts to require approval.
- As any user I want comment threads, not just single comments.

### Functional requirements
1. **Comments on:** transcript words, timeline regions, scenes, share-page playback.
2. **Threaded replies.**
3. **@mention** with notifications (in-app, email, Slack/Teams via F8.9).
4. **Resolve / unresolve.**
5. **Filter:** Open / Resolved / @me.
6. **Approval workflow:**
   - Workspace setting: "All scheduled posts require approval by [role/user]."
   - Pending posts queued; approvers notified.
   - Approve / Reject (with reason) / Edit and re-submit.
7. **Audit trail:** every comment, edit, approval logged.
8. **Comments on share page:** stakeholders without account can leave email-gated comments (configurable).

### UX flow
1. Right-click any word → Comment → @mention → Send.
2. Reviewer gets notification → clicks → opens project at that moment → replies/resolves.

### Sentiment guardrails
- **P12:** approvals don't get lost; reminders + escalation if pending >48h.

### Acceptance criteria
- 100% delivery of @mention notifications.
- Approval workflow blocks publish until approved.

### Dependencies
- F8.2 (Collab), F8.3 (Roles), F8.9 (Notifications).

### Metrics
- Comments per project.
- Approval cycle time.

---

## F8.8 — Multi-Client Agency Workspace

**Release:** R5 (or earlier if demand)
**Summary:** Per-client brand kits, per-client content calendars, per-client billing exports, per-client white-labeled share pages, single dashboard across all clients.

### Problem statement
Agencies are a high-ARPU underserved segment. Currently they hack with multiple seats / multiple accounts.

### Primary personas
Agency.

### User stories
- As an agency I want one login that gives me access to 12 client workspaces.
- As an agency owner I want to switch between clients in 1 click.
- As a finance person I want billing exports per client.

### Functional requirements
1. **Agency org tier:** an "umbrella" account containing many child workspaces (one per client).
2. **Client switcher:** in-app dropdown to switch active client.
3. **Per-client brand kits, planners, calendars, schedulers, share pages.**
4. **Cross-client dashboard:** see all active projects across all clients.
5. **Per-client billing:** itemized usage and exports.
6. **Per-client white-label share + player.**
7. **Team member assignment:** team members assignable to specific clients only.

### UX flow
1. Agency owner adds new client → new workspace provisioned → optionally white-labeled.
2. Team members invited to specific clients.

### Sentiment guardrails
- **P11:** one login; not "log in to each client separately."

### Acceptance criteria
- Client switcher latency <500ms.
- Billing exports accurate.

### Dependencies
- F8.1, F7.6.

### Metrics
- Agencies with multiple clients.
- ARPU agency vs single-account.

---

## F8.9 — Slack / Teams Notifications

**Release:** R2
**Summary:** Render-complete, comment-added, scheduled-post-published, approval-needed → routed to chosen Slack/Teams channels.

### Problem statement
Where teams already work. Reduces context-switching.

### Primary personas
In-house Marketer, Agency, Enterprise.

### User stories
- As a marketer I want notifications in our team's Slack channel when a render is done.
- As an approver I want a Slack ping when a post needs approval.
- As any user I want to control which events notify me.

### Functional requirements
1. **Integrations:** Slack (workspace install), Microsoft Teams.
2. **Per-workspace channel mapping:** "Render complete → #content," "Approval needed → #marketing-leads."
3. **Per-user DMs:** opt-in for personal notifications.
4. **Notification types:** render complete, render failed, comment added, @mention, approval requested, approval granted, post scheduled, post published, post failed.
5. **Inline previews:** Slack messages include thumbnail + link.
6. **Configurable filtering.**

### UX flow
1. Integrations → Slack → install → pick channels per event.
2. Events fire → Slack messages arrive.

### Sentiment guardrails
- **P11:** notifications work without leaving Slack to acknowledge.

### Acceptance criteria
- Slack + Teams both functional.
- Delivery latency <30 sec from event to message.

### Dependencies
- F10.5 (Zapier infra) — different stack.

### Metrics
- % of workspaces with Slack connected.
- Notifications sent per workspace per week.

---

*End of Pillar 8 — Operate specifications.*
