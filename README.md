# Sahayak

> **Independent project. Not a government website.**
> This disclosure banner is a hard product constraint and appears on every screen of the product itself.

Sahayak is a voice-first guidance app that helps people in India work out **which government process applies to them** and **what to do next** — in their own language, by speaking rather than by filling in a form.

This repository holds the **implementation**. The specification set it is built from is maintained privately and is not published here; `DESIGN.md` is the one specification document included, because the code depends on it directly.

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

## Specification & design

The product is specified by documents **D1–D7** plus Appendix A, maintained privately outside this repository. They are not published here.

**`DESIGN.md` — D10, Design Direction** *is* in this repository, because the code cannot be read without it. It is the design system's source of truth: `app/tokens.css` derives every colour, type and spacing value from its sections, and roughly forty source comments cite it directly (`D10 §10.4`, `D10 10.9`).

D10 was authored in this repository rather than delivered with the batch set, and takes its number after the delivered documents so that D8 (assistive-tech audit method) and D9 (assumptions register) — referenced by the specs but not written — keep their slots. It is subordinate to D3, D5 and D6: where it appears to contradict them, they win.

### Conventions

- Screens are `S1`–`S11`; `S2b` is the typed-input variant, `S3e` the low-confidence escape, `SH1` a shared modal sheet.
- Tasks/journeys are `T1`–`T9`. Storage records are namespaced `sbn.*`.
- Copy strings are canonical English in the specs; every string ships in every enabled language before that language is switched on.
- Layouts are specified at a 360 px baseline.

---

## Project tracking

The session log (`progress.md`), decision record (`decision.md`) and defect log (`bugs.md`) are kept locally and are deliberately not tracked in this repository. Codes referenced from source comments and from this README — `DECISION-008`, `BUG-009` — resolve against those local files.

## Running it

```
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run typecheck    # tsc --noEmit
```

Node 20 or newer. The stack is Next.js (App Router) with TypeScript and no CSS framework: the tokens in `app/tokens.css`, derived from `DESIGN.md`, are the design system. See DECISION-008 for why, and for the five spec requirements that narrowed the choice.

## Status

Early implementation. The stack is chosen (DECISION-008) and the foundation is in place: design tokens, the string layer, global chrome, S1, the D4 persistence layer (T-LOCAL, T-IDB, T-SRV) and the T-CACHE service worker.

`/api/journey` is a development stub: in-memory, per-process, and not the backend. There is no test suite yet.

**Blocked on the author:** tasks T1 to T9 are referenced 43 times across the specs but never enumerated (BUG-009, P0). Only T1 is identifiable. S1's no-JS fallback, S5's journey map, S6 and the S3e browse journeys cannot be completed without the roster, and the missing entries are deliberately not invented: C4 requires a source and verification date on every seeded item, and D10 §10.2 forbids placeholder government content.

The Hindi strings are structurally complete but are placeholders, not translations (BUG-008). The hi-IN tile must not be enabled for real users until they are reviewed by a native speaker.
