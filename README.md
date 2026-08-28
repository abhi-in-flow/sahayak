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

### Where to start

The specifications are not published here, so the reading order is the code:

1. **`DESIGN.md`** — the design direction, and the only specification document in the repository. Everything visual derives from it.
2. **`app/tokens.css`** — the design system in practice; every value traces to `DESIGN.md` §10.3, §10.5 and §10.6.
3. **`app/_lib/`** — the persistence layer (`storage/`), the string layer (`i18n/`) and the seeded domain data.
4. **`app/`** routes — the screens, each implementing the `S`-code named in its comments.

For anyone with access to the private specification set, those documents read D2 → D3 → D4 → D5 → D6 and D7 → D1, with D10 (`DESIGN.md`) last.

### Codes

Source comments throughout the repository reference the specification set by code. The families are:

| Code | Meaning |
|---|---|
| `D1`–`D7`, `D10` | Specification documents. `D10` is `DESIGN.md`, the only one published here. `D8` and `D9` are cited by the others but were never written. |
| `S1`–`S11` | Screens. `S2b` is the typed-input variant of `S2`, `S3e` the low-confidence escape from `S3`, and `SH1` a shared modal sheet rather than a screen. |
| `T1`–`T9` | Tasks within a journey. Only `T1` is currently identifiable (BUG-009). |
| `C1`–`C7` | Hard product constraints. `C1` is the non-dismissible "not a government website" disclosure carried on every screen; `C4` requires every seeded government fact to carry a source and a verification date. |
| `E-nn`, `O-01` | Error, empty-state and offline strings. D5 is their single source of truth. |
| `T-LOCAL`, `T-IDB`, `T-SRV`, `T-CACHE` | The four persistence tiers: a single versioned `localStorage` record, the IndexedDB document wallet, the server-side journey store, and the Cache API journey pack. |
| `sbn.*` | Namespace for every stored record. |
| `BUG-nnn`, `DECISION-nnn` | Entries in the local-only defect log and decision record — see [Project tracking](#project-tracking). |

Two further conventions: copy strings are canonical English in the specs, and every string ships in every enabled language before that language is switched on; layouts are specified at a 360 px baseline.

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
