# Pillar 9 — Trust, Compliance & Security — detailed specifications

> **Pillar question:** "How can a regulated buyer trust us with their content?"
> **Release coverage:** R3 (F9.1–F9.3), R4 (F9.6), R5 (F9.4, F9.5, F9.7)

> **Note on framing.** These features are spec'd from a Product perspective — what users see/get/configure. Implementation specifics (encryption algorithms, audit cadence, vendor selection) belong to security engineering and compliance leadership.

---

## F9.1 — SOC 2 Type II + ISO 27001 Certifications

**Release:** R3
**Summary:** Both certifications achieved and continuously maintained by R3. We hold both (Pictory has ISO; Descript has SOC 2 — we hold both).

### Problem statement
Enterprise procurement requires both for many buyers. Having both differentiates us from every competitor in the research set.

### Primary personas
Enterprise (procurement, security teams), Agency (passing to clients).

### User stories
- As an enterprise procurement lead I want to download the SOC 2 Type II report under NDA.
- As a security team I want assurance our content is handled per ISO 27001 standards.
- As any prospect I want to see compliance certifications on the public trust center.

### Functional requirements (from product perspective)
1. **Public trust center page** lists current certifications with last-audit date.
2. **Report downloads** available under click-through NDA (no sales call required for SOC 2 download).
3. **Continuous compliance monitoring** internally; we publish a quarterly summary.
4. **Re-attestation cadence** annual minimum.
5. **Per-feature compliance scope clear** (e.g., "AI Avatar from Photo is in scope; Voice Clone is in scope").

### Sentiment guardrails
- **P12:** procurement doesn't have to "talk to sales" to get the report.

### Acceptance criteria
- SOC 2 Type II current; ISO 27001 current.
- Reports downloadable from public site with NDA.

### Metrics
- # of NDA-protected report downloads/month (sales-qualified leads).

---

## F9.2 — SSO + SAML + SCIM

**Release:** R3
**Summary:** Enterprise SSO via SAML (Okta, Azure AD, Google, OneLogin, Auth0); user provisioning via SCIM.

### Problem statement
Enterprise table-stakes. Match Descript baseline.

### Primary personas
Enterprise (IT, security).

### User stories
- As an IT admin I want to provision/deprovision users via our IdP.
- As a security lead I want SSO with our SAML provider.
- As a finance lead I want offboarded employees to lose access automatically.

### Functional requirements
1. **SAML 2.0** supported with all major IdPs.
2. **SCIM 2.0** for user provisioning / deprovisioning / role mapping.
3. **OIDC** supported alongside SAML.
4. **Domain capture:** all users with company email auto-redirected to SSO.
5. **Just-in-time provisioning** on first login.
6. **Per-IdP role mapping** to our internal roles.
7. **Self-serve setup** in Admin → SSO settings.

### UX flow
1. Admin → SSO → pick IdP → configure → test → enable.
2. Users sign in via IdP.

### Sentiment guardrails
- **P12:** self-serve setup; no required vendor call.

### Acceptance criteria
- Tested IdPs: Okta, Azure AD, Google Workspace, OneLogin, Auth0.
- SCIM provisioning works end-to-end with all tested IdPs.

### Metrics
- % of Enterprise workspaces using SSO.

---

## F9.3 — GDPR + CCPA + EU/US Data Residency

**Release:** R3
**Summary:** GDPR + CCPA compliance from day 1. EU and US data residency options from R3 (differentiator vs CapCut for European buyers).

### Problem statement
Required for European and California-based customers. Residency unlocks regulated buyers.

### Primary personas
All personas in regulated geos.

### User stories
- As an EU customer I want all my content stored in EU data centers.
- As a Californian I want my CCPA rights honored.
- As a privacy-conscious user I want a clear DPA available.

### Functional requirements
1. **Data residency selection per workspace:** EU or US (more added per demand).
2. **All content (uploads, generated, transcripts) stored in selected region.**
3. **Subprocessor list public** with regions.
4. **DPA (Data Processing Agreement)** downloadable without sales call.
5. **Right to access:** export all user data as ZIP.
6. **Right to delete:** account deletion removes all data within 30 days.
7. **Cookie consent:** standard banner with granular control.
8. **Privacy disclosures plain English** on every AI feature.

### UX flow
1. Workspace setup → pick region (locked after creation; migration on request).
2. Settings → Privacy → download data / delete account.

### Sentiment guardrails
- **P8:** plain-English privacy; not legalese.
- **P12:** DPA accessible without sales gate.

### Acceptance criteria
- EU + US regions both live; isolation verified.
- Data export & delete work end-to-end.

### Metrics
- % of workspaces selecting EU.
- Data deletion request fulfillment time (median <72h).

---

## F9.4 — HIPAA + BAA Support

**Release:** R5
**Summary:** HIPAA-compliant operations + BAA (Business Associate Agreement) support for healthcare, telemedicine, mental-health, pharma content workflows.

### Problem statement
**Open lane.** No competitor in the research set has it. Unlocks an entire vertical.

### Primary personas
Healthcare, Telemedicine, Mental Health, Pharma.

### User stories
- As a hospital marketing team I want to make patient-story videos with HIPAA assurance.
- As a telemedicine company I want to record + edit session content compliantly.
- As a pharma marketer I want HIPAA-aligned content workflows.

### Functional requirements
1. **HIPAA-compliant infrastructure** for designated workspaces (separate hosting tier).
2. **BAA signing process:** self-serve for qualified customers; legal review available.
3. **Access controls:** all HIPAA workspace actions audit-logged.
4. **PHI handling:** explicit PHI controls — no PHI used for shared model training; ephemeral processing.
5. **Encryption at rest and in transit** at HIPAA-required standards.
6. **Designated training:** team members in HIPAA workspace must complete HIPAA training annotation.
7. **Breach notification SLA** in BAA.

### Sentiment guardrails
- **P8:** PHI isolation is sacrosanct.

### Acceptance criteria
- HIPAA workspace fully isolated; BAA signable; audit-ready.

### Metrics
- # of HIPAA workspaces.
- Healthcare ARPU.

---

## F9.5 — FedRAMP-Aligned Posture

**Release:** R5
**Summary:** FedRAMP-aligned posture to unlock public-sector content (state/local/education first; federal moderate later).

### Problem statement
Unlocks public-sector budget category. Long sales cycle but high ARPU.

### Primary personas
Government, Higher Ed.

### User stories
- As a state agency I want to make training videos in a FedRAMP-aligned environment.

### Functional requirements
1. **GovCloud-style hosting tier.**
2. **Required controls per FedRAMP Moderate baseline.**
3. **Documentation pack for procurement.**

### Acceptance criteria
- FedRAMP-aligned posture documented; one design partner customer live.

### Metrics
- Gov customers.

---

## F9.6 — Webhooks + Audit Logs

**Release:** R3
**Summary:** Subscribe to lifecycle events; full audit log of all actions in the workspace.

### Problem statement
Choppity has webhooks; enterprises need audit logs. Required for compliance.

### Primary personas
Enterprise, Agency, Developers.

### User stories
- As a developer I want webhook notifications for render complete.
- As a compliance officer I want a full audit of who did what when.

### Functional requirements
1. **Webhook events:** asset.uploaded, asset.transcribed, clip.generated, render.complete, render.failed, post.scheduled, post.published, post.failed, approval.requested, approval.granted, member.added, member.removed, brand_kit.changed, custom_model.trained, share.viewed (with consent).
2. **Webhook config:** URL endpoint, secret, retry policy, payload format (JSON).
3. **Webhook delivery dashboard:** see successes / failures / retries.
4. **Audit log:** every action in the workspace logged with timestamp, actor, target. Searchable, filterable, exportable.
5. **SIEM integration:** export audit log to Splunk / Datadog / Sumo Logic.
6. **Retention:** audit log retained per tier (90 days Free/Creator; 1 year Pro+; configurable Enterprise).

### UX flow
1. Integrations → Webhooks → Add endpoint → pick events → test.
2. Settings → Audit Log → filter / export.

### Sentiment guardrails
- **P8:** audit log immutable.

### Acceptance criteria
- All listed events fire reliably.
- Audit log captures 100% of actions.

### Dependencies
- F10.x (API infra).

### Metrics
- Workspaces with webhooks active.
- Audit log queries per Enterprise.

---

## F9.7 — Public Trust Center + Pen-Test Summary + AI Privacy Disclosures

**Release:** R5
**Summary:** A transparent public-facing page with latest SOC 2 report download (after NDA), latest pen-test summary, real-time uptime, current incident status, list of subprocessors, AI privacy controls, plus inline AI-feature data-flow disclosures.

### Problem statement
Trust is our moat (P8, P12). Competitors hide behind sales calls; we publish.

### Primary personas
Procurement, Security, Privacy-conscious users.

### User stories
- As a procurement lead I want everything I need to fast-path approval on one page.
- As a privacy user I want to know what each AI feature does with my data — inline.
- As a customer I want to see current uptime and incidents.

### Functional requirements
1. **Trust center page** (`/trust`):
   - Current certifications + downloadable reports.
   - Subprocessor list with regions + purposes.
   - Pen-test summary (latest, with executive summary public).
   - Real-time uptime + 90-day status history.
   - Incident communications log.
   - AI privacy controls overview.
   - DPA download.
   - HIPAA / GDPR / CCPA pages.
2. **Inline AI privacy disclosures:** every AI-feature surface has a small "ⓘ How your data is used" link with plain-English summary.
3. **Opt-in / opt-out matrix:**
   - "Share my content for model improvement" (default OFF).
   - "Use my voice clone across team" (default OFF).
   - "Allow AI to analyze my brand assets" (default ON, with opt-out).
4. **Per-feature data flow:** clear "your audio goes to X for transcription; deleted after 30 days; not used for training."

### UX flow
1. Public visits trust.com/trust → all info accessible.
2. User in app clicks ⓘ on any AI feature → sees data flow.

### Sentiment guardrails
- **P8:** these are the principles in operating form.
- **P12:** incident comms within 15 min of detection.

### Acceptance criteria
- Trust center live; quarterly pen-test summary updated.
- Every AI feature has inline disclosure.

### Metrics
- Trust center traffic.
- Procurement sales-cycle reduction (track by interview).

---

*End of Pillar 9 — Trust, Compliance & Security specifications.*
