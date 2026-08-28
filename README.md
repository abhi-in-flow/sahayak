# Sahayak

> **Independent project. Not a government website.**
> This disclosure banner is a hard product constraint and appears on every screen of the product itself.

Sahayak is a voice-first guidance app that helps people in India work out **which government process applies to them** and **what to do next** — in their own language, by speaking rather than by filling in a form.

This repository currently holds the **specification set**. No implementation code has been written yet.

---

## What the product does

A user speaks their problem in their own language. A short Socratic question sequence narrows the situation down to a confident match, then produces a **journey** — an ordered, dependency-aware list of tasks with documents, costs, durations, offices and common failure points for each.

Core behaviors defined in the specs:

- **Voice first, typing always available.** Speak your situation; a typed path exists at every step.
- **Never return nothing.** If confidence stays low after five questions, the user is routed to a browsable list of common situations rather than a dead end.
- **Practice, not submission.** Guided form flows are mocked end to end and watermarked. Nothing is transmitted to any government system.
- **On-device document wallet.** Documents live in IndexedDB on one device, never sync, and are never transmitted.
- **Journey syncs, wallet does not.** The journey and answers persist to a backend keyed to a phone stub; documents stay on the device they were added to.
- **Honest about what is real.** A global "What's real and what's mocked" screen (S11) is reachable from every screen.

**Seeded coverage:** Assam (canonical) and Maharashtra (an assumed default, pending the D9 assumptions register). The state picker is deliberately limited to these two; any other state routes to national helpline content.

**Accessibility target:** WCAG 2.1 AA, with additional dynamic-focus, live-region and locale-format rules layered on top. Screen-reader labels are authored in the selected language, never English.

---

## Specification set

The specs are delivered in five batch files. Together they cover documents **D1–D7** plus Appendix A.

| File | Contents |
|---|---|
| `batch-1-D1-changelog-D2-flow.md` | D1 — Change Log & Resolution Summary · D2 — Flow Architecture |
| `batch-2-D3-screens-S1-S5-SH1.md` | D3 — Screen Specifications, Part 1 (S1–S5, shared component SH1) |
| `batch-3-D3-screens-S6-S11-appendixA.md` | D3 — Screen Specifications, Part 2 (S6–S11) · Appendix A — T1 form schema |
| `batch-4-D4-data-D5-errors.md` | D4 — Data & Persistence Contract · D5 — Error, Empty & Timeout Catalog |
| `batch-5-D6-a11y-D7-analytics.md` | D6 — Accessibility & Internationalization · D7 — Analytics & Observability |

**Not yet in this repository:** D8 (assistive-tech audit method) and D9 (assumptions register) are referenced by the delivered documents but not included.

### Reading order

1. **D2** — flow architecture, for the shape of the whole thing.
2. **D3** — screen specs, for per-screen entry/exit conditions and states.
3. **D4** — data and persistence, for what is stored where and what survives what.
4. **D5** — the single source of truth for every error and empty-state string (`E-nn` / `O-01` codes).
5. **D6** and **D7** — accessibility and analytics rules that apply across all screens.
6. **D1** — the change log, when you need to know *why* a rule reads the way it does.

### Conventions

- Screens are `S1`–`S11`; `S2b` is the typed-input variant, `S3e` the low-confidence escape, `SH1` a shared modal sheet.
- Tasks/journeys are `T1`–`T9`. Storage records are namespaced `sbn.*`.
- Copy strings are canonical English in the specs; every string ships in every enabled language before that language is switched on.
- Layouts are specified at a 360 px baseline.

---

## Project tracking

- `progress.md` — session log
- `decision.md` — architectural decision record
- `bugs.md` — defect log

## Status

Specification phase. Implementation has not started; no stack has been chosen or committed to.
