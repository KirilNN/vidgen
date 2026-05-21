# Pillar 5 — Translate (detailed specifications)

> **Pillar question:** "How do I reach a non-English audience?"
> **Release coverage:** R2 (F5.1, F5.2, F5.5), R3 (F5.3, F5.4)

---

## F5.1 — Caption / Subtitle Translation (100+ Languages)

**Release:** R2
**Summary:** Auto-translate captions/subtitles into 100+ languages with side-by-side proofread UI.

### Problem statement
Descript's 61 languages is the floor; Wayin and CapCut hit 100+. Caption translation is the lowest-friction internationalization path.

### Primary personas
Solo Creator (global audience), In-house Marketer (multi-region), L&D Lead (global training).

### User stories
- As a creator I want to translate my English captions into Spanish, French, Hindi, Japanese, Portuguese with one click each.
- As a translator I want to review and edit translated captions side-by-side with the source.
- As any user I want my brand terms / exec names not translated.

### Functional requirements
1. **Languages supported:** 100+ at R2 launch (matching Wayin/CapCut breadth).
2. **One-click translate:** select source caption track → pick target language → translation appears as a new caption track.
3. **Side-by-side proofread UI:** source caption + translated caption visible together; user can edit translated text inline; source is read-only.
4. **Do-not-translate list (DNT):** workspace-level list of terms (brand names, product names, exec names, place names) preserved verbatim in translation. Honored across all translations.
5. **Multiple target languages per project:** add as many translation tracks as needed; each independently editable.
6. **Re-translate action:** if source captions edited, retranslate the affected lines (or full track) preserving manual edits where possible.
7. **Quality scoring:** per-line confidence flagged; low-confidence lines visually marked.
8. **Export per language:** SRT/VTT per language; burned-in option per export.
9. **Tier gating:** 5 target languages on Creator; 30 on Pro; 100+ on Business+.

### UX flow
1. Editor → Captions → "+ Translate" → pick target language → translation appears as a new track.
2. Proofread UI: source on left, translation on right; click to edit; save.
3. Export → choose which caption tracks to include / burn / sidecar.

### Edge cases & error handling
- **Idioms that don't translate cleanly:** AI flags as low confidence.
- **Length mismatch:** translated text longer than source line may overflow safe zone — auto-shorten with hints, or two-line wrap.
- **RTL languages (Arabic, Hebrew):** display right-to-left; ensure rendering correctness.

### Sentiment guardrails
- **P9:** translation quality benchmarks published per language.
- **P10:** translations editable; manual edits preserved on retranslate where possible.

### Acceptance criteria
- 100+ languages at R2.
- BLEU score ≥35 (or equivalent metric) on standard test set for top-30 languages.
- DNT honored 100% of time.

### Dependencies
- F2.5 (Captions), F2.4 (Transcription), F8.x (DNT list configuration).

### Metrics
- Languages used per workspace.
- Edit rate per language (high edit rate → quality issue).

---

## F5.2 — Bilingual Subtitle Display

**Release:** R2
**Summary:** Show original + translated subtitles simultaneously on the same video.

### Problem statement
Wayin-only differentiator (per `competitors-vs-descript.md`). Loved by language learners, international podcast audiences, dubbed content viewers.

### Primary personas
Solo Creator (international audience), L&D Lead (language teaching), Vertical Power User (church / multilingual congregation).

### User stories
- As a language learner viewer I want to see English and Spanish subtitles together.
- As a creator targeting a bilingual community I want both languages on screen.

### Functional requirements
1. **Bilingual display mode:** select source + target → both displayed.
2. **Layout options:**
   - Source above, translation below.
   - Translation above, source below.
   - Side-by-side (16:9 only).
3. **Per-line styling:** different colors / sizes for source vs translation.
4. **Three display modes:** Translated-only, Original-only, Bilingual.
5. **Export:** burn bilingual into video OR ship as combined SRT with two-line entries.
6. **Mobile readability:** auto-shrink font when both languages visible to maintain readability on 9:16.

### UX flow
1. Captions panel → Display mode → Bilingual → pick languages → preview → apply.

### Edge cases & error handling
- **Three or more languages requested:** allow up to 2 simultaneous; offer separate tracks for more.
- **Mismatched line lengths:** auto-shorten or wrap.

### Sentiment guardrails
- **P5:** readable on mobile (text not too small).

### Acceptance criteria
- Bilingual display works on all major platforms.
- Both languages legible on iPhone-sized screens at default font.

### Dependencies
- F5.1.

### Metrics
- Bilingual usage rate.

---

## F5.3 — AI Dubbing (Voice Translation)

**Release:** R3
**Summary:** Translate spoken audio into another language using the original speaker's voice (cloned).

### Problem statement
Descript ships 30+ languages with 14 native-trained; CapCut claims 100+. Quality bar set by ElevenLabs / HeyGen. Must hit native-speaker acceptability in top 15 languages.

### Primary personas
Solo Creator (international expansion), In-house Marketer (multi-region campaigns), L&D Lead (multilingual training), Sales Founder (multi-region outreach).

### User stories
- As a podcaster I want my English episode dubbed into Spanish using my own voice clone.
- As a marketer I want a single product video dubbed into 10 languages for our global launch.
- As any user I want the dubbed mouth movements to match (lip-sync re-render).
- As a translator I want a side-by-side proofread UI before committing.

### Functional requirements
1. **Voice source options:**
   - User's voice clone (F3.4) speaking the translated language.
   - Generic stock voice in target language.
   - Native-trained voice in target language (F5.4).
2. **Workflow:** source audio → transcribe (F2.4) → translate → synthesize with chosen voice → mux back into video.
3. **Lip-sync re-render (optional):** for talking-head video, re-render mouth movement to match new audio (depends on F4.7).
4. **Side-by-side proofread:** source transcript + translated transcript visible; user can edit translation before synthesis.
5. **DNT list honored.**
6. **Per-segment regeneration:** edit one line → regenerate just that line.
7. **Languages supported:** 30+ at R3 launch.
8. **Quality tier:**
   - Standard: stock voice in target language.
   - Premium: voice clone in target language.
   - Cinematic: voice clone + lip-sync re-render.
9. **Mixed-language original:** segment-by-segment dubbing.

### UX flow
1. Editor → Translate Audio → pick target language → pick voice option → preview translated script → edit → confirm → process.
2. Output added as a new track; user can mix between original and dubbed.

### Edge cases & error handling
- **Cultural / idiomatic translation issues:** flag low-confidence; surface for editor review.
- **Very long content (>1 hour):** chunk processing with progress.
- **Source has multiple speakers:** dub each speaker separately, maintaining each one's distinct voice.

### Sentiment guardrails
- **P9:** native-quality bar in top 15 languages; published benchmarks.
- **P4:** user can always see source-to-translation mapping line by line.

### Acceptance criteria
- 30+ languages at R3.
- Native-speaker acceptability rating ≥4/5 for top 15 languages.
- Lip-sync option produces visually acceptable output ≥75% of clips ≤30 sec.

### Dependencies
- F2.4, F3.3, F3.4, F4.7, F5.1.

### Metrics
- Dubbings per workspace.
- Languages used.
- Lip-sync acceptance rate.

---

## F5.4 — Native-Trained Dubbing Voices

**Release:** R3
**Summary:** Dubbing voices custom-trained per language rather than generic-translated. 14+ languages at Business tier (Descript baseline) → 20+ by R5.

### Problem statement
Generic TTS in non-English languages sounds robotic / accented (English voice speaking French). Native-trained voices solve this.

### Primary personas
Multi-region marketing teams, global L&D, international podcasters.

### User stories
- As a Spanish-language podcaster I want a Mexican-Spanish native voice, not "Spanish with a US English accent."
- As a French marketer I want Parisian and Quebecois variants distinguished.
- As a Japanese course creator I want a native male/female voice that sounds like a Japanese teacher.

### Functional requirements
1. **Languages with native voices (R3 launch — 14):** English, Spanish (ES/LatAm), French (FR/CA), Italian, German, Portuguese (BR), Polish, Dutch, Swedish, Hindi, Turkish, Chinese (Mandarin), Japanese, Korean.
2. **Languages added by R5:** Arabic, Indonesian, Vietnamese, Thai, Hebrew, Russian, Ukrainian, Czech.
3. **Per language:** 5–10 distinct voices (gender, age, mood).
4. **Voice metadata:** marked "Native" badge in voice picker; user sees the difference clearly.
5. **Regional accents:** distinguished where culturally meaningful (Spanish: ES vs LatAm vs Mexican; French: FR vs CA; Portuguese: BR vs PT; English: US vs UK vs AU vs IN).
6. **Tier gating:** Business+ only.

### UX flow
- Standard voice picker with "Native" filter on. Marked clearly.

### Sentiment guardrails
- **P9:** quality bar must be measurably native-speaker-acceptable.

### Acceptance criteria
- 14 languages at R3; 20+ at R5.
- Native-speaker acceptability ≥4/5 per language.

### Dependencies
- F3.3.

### Metrics
- Native voice usage vs generic.

---

## F5.5 — Caption Translation Display Modes

**Release:** R2
**Summary:** Three explicit modes for caption display: Translated only, Original only, Bilingual (both side-by-side).

### Problem statement
Different audiences want different views. Wayin productized this as 3 explicit modes.

### Primary personas
Solo Creator, In-house Marketer.

### User stories
- As a creator I want viewers to choose their preferred caption mode.
- As an editor I want to export per mode.

### Functional requirements
1. **Per-export mode selection:** choose mode at export.
2. **Player mode toggle:** in the public share page (F7.1), viewer can toggle modes if the project has both.
3. **Settings persist** per workspace default.

### UX flow
- Export panel: Caption mode → Original / Translated / Bilingual.
- Public share page: viewer-side dropdown.

### Sentiment guardrails
- **P11:** one feature, consistent across editor + player + export.

### Acceptance criteria
- All 3 modes work in player + export.

### Dependencies
- F5.1, F5.2.

### Metrics
- Mode usage on share pages.

---

*End of Pillar 5 — Translate specifications.*
