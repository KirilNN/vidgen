# Product Specifications — Index

> **What this folder is.** The detailed companion to `product-roadmap.md`. Every feature in the roadmap is expanded here into an implementation-ready spec written in product-management language: user stories, functional requirements, UX flow, edge cases, acceptance criteria, dependencies, and sentiment guardrails.
>
> **What this folder is NOT.** Engineering architecture, technology choices, model selection, infrastructure, or code. Those decisions belong to the engineering pods after reading these specs.
>
> **How to use this.**
> - Each file = one pillar from the roadmap. A pod can own a pillar.
> - Every feature has a stable ID (e.g., `F1.1` = Capture pillar, feature 1). Reference by ID across PRDs, tickets, designs, tests.
> - Every feature ends with **Acceptance Criteria** that are testable. If a feature ships and the AC are not met, the feature is not done.
> - Every feature ends with **Sentiment Guardrails** drawn from `reddit-sentiment-scan.md`. These are not nice-to-haves; they are gating quality bars.

## Files

| # | Pillar | File | Features |
|---|---|---|---|
| 1 | Capture | [`01-capture.md`](01-capture.md) | F1.1–F1.7 |
| 2 | Edit | [`02-edit.md`](02-edit.md) | F2.1–F2.8 |
| 3 | Create | [`03-create.md`](03-create.md) | F3.1–F3.10 |
| 4 | Enhance | [`04-enhance.md`](04-enhance.md) | F4.1–F4.10 |
| 5 | Translate | [`05-translate.md`](05-translate.md) | F5.1–F5.5 |
| 6 | Repurpose | [`06-repurpose.md`](06-repurpose.md) | F6.1–F6.8 |
| 7 | Distribute | [`07-distribute.md`](07-distribute.md) | F7.1–F7.7 |
| 8 | Operate | [`08-operate.md`](08-operate.md) | F8.1–F8.9 |
| 9 | Trust & Compliance | [`09-trust-compliance.md`](09-trust-compliance.md) | F9.1–F9.7 |
| 10 | API & Integrations | [`10-api-integrations.md`](10-api-integrations.md) | F10.1–F10.8 |
| 11 | Vertical Packs | [`11-vertical-packs.md`](11-vertical-packs.md) | F11.1–F11.7 |

## Standard spec template (applied to every feature)

1. **Feature ID & Name**
2. **Release** (R1–R5, from the roadmap)
3. **One-line summary**
4. **Problem statement** — the user pain in their words
5. **Primary persona(s)**
6. **User stories** — "As a … I want … so that …" form
7. **Functional requirements** — numbered, testable behaviors
8. **UX flow** — the user journey end-to-end
9. **Inputs / Outputs** — what the user provides, what the product produces
10. **Edge cases & error handling**
11. **Sentiment guardrails** — Reddit-pain-derived constraints
12. **Acceptance criteria** — what must be true for the feature to be "done"
13. **Dependencies** — other features this needs
14. **Out of scope** — explicit exclusions for this feature
15. **Metrics** — how we measure success post-launch

## Cross-cutting product principles (apply to every feature)

These are summarised from `product-roadmap.md` §3 and are constraints on every feature in this folder:

- **P1 Stable at scale** — every long-running job must be resumable and crash-safe.
- **P2 Honest pricing** — no feature paywalled silently after the user adopts it.
- **P3 Generous free tier** — every feature works on free, only quotas differ.
- **P4 Verifiable AI** — every AI output links to its source moment.
- **P5 Publishable-from-first-pass** — auto-copy must clear the "good enough to publish" bar.
- **P6 Reversible workflow** — every stage re-enterable; AI ops undoable.
- **P7 Mobile-first parity** — capture, review, schedule must work on mobile from R4 at latest.
- **P8 Privacy-first** — no silent content training; clear data flow disclosures.
- **P9 AI quality across languages** — top 15 languages held to English-equivalent quality.
- **P10 Human-in-the-loop** — every AI change diffable, undoable, previewable.
- **P11 One product** — no per-module logins; one unified credit & subscription model.
- **P12 Real support with SLAs** — incident transparency, human chat on every paid tier.

Each feature spec calls out which principles are load-bearing for it.

---

*End of index.*
