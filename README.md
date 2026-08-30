# Sahayak

> **Independent project. Not a government website.**
> This disclosure banner is a hard product constraint and appears on every screen of the product itself.

Sahayak is a voice-first civic guide for India. A person speaks or types a problem in their language. A short Q&A produces a **journey** — documents, costs, offices, and official links — from a static directory snapshot. It never submits forms, takes payments, or talks to a live government system. Practice forms stay mocked.

Live: [sahayak-main-seven.vercel.app](https://sahayak-main-seven.vercel.app)

This repository is the **implementation**. The specification set it is built from is maintained privately and is not published here. `DESIGN.md` is the one specification document included, because the code depends on it directly.

---

## What the product does

The main path is the talk screen (`/capture`):

1. Speak or type what you need (example chips: bakijai, income certificate, death certificate).
2. Sahayak asks only for district or city, which listed service, or whether you already applied.
3. When that is clear, it builds a journey with official listing URLs from the snapshot.

Core behaviors:

- **Voice first, typing always available.** Mic needs HTTPS (or localhost). `npm run dev:https` is for LAN testing.
- **Never return nothing.** If the match stays weak, the older Socratic loop and common-situation browse still exist.
- **Practice, not submission.** Guided form flows are mocked and watermarked. Nothing is transmitted to any government system.
- **On-device document wallet.** Documents live in IndexedDB on one device, never sync, and are never transmitted.
- **Honest about what is real.** A global "What's real and what's mocked" screen (S11) is reachable from every screen.

**Languages on the home tiles:** English, Hindi, Kannada, Marathi, Assamese. Speech (STT/TTS) and the reply follow the selected language. Kannada, Marathi, and Assamese chrome still reuse English UI copy; the example chips and voice path are native.

**State picker:** Assam, Maharashtra, Karnataka, or other. That choice filters directory rows (state or National). Seeded registrar facts are Assam-first.

**Accessibility target:** WCAG 2.1 AA, with additional dynamic-focus, live-region and locale-format rules. Screen-reader labels should be in the selected language.

---

## How retrieval works

The India.gov / state directory is English. Spoken Indic text is not sent raw to Weaviate.

1. A **query-writer** maps a known service (or asks Sarvam on an unknown first turn) to a short English search, or **skips** search on follow-ups such as a district name.
2. Weaviate **hybrid** search (`CivicService`) uses that English string, keyword-heavy (`alpha` 0.25), filtered by onboarded state or National.
3. Off-topic hits (for example a building permit on a death-certificate ask) are dropped. Known example chips always merge their seed rows from `app/_lib/rag/corpus.json`.
4. The reply model sees only that snapshot. Follow-up turns reuse the last snapshot instead of searching again.

If Weaviate is unset, retrieval falls back to keyword overlap on the seed corpus.

Re-index (local, needs `.env.local` and a local `services-corpus.json` that is not in this repo):

```
npm run rag:index
```

---

## Specification & design

The product is specified by documents **D1–D7** plus Appendix A, maintained privately outside this repository. They are not published here.

**`DESIGN.md` — D10, Design Direction** *is* in this repository, because the code cannot be read without it. It is the design system's source of truth: `app/tokens.css` derives every colour, type and spacing value from its sections. Accent is deep teal `#0A5654`. Tricolour and government-navy treatments are banned.

### Where to start

1. **`DESIGN.md`** — visual and interaction language.
2. **`app/tokens.css`** — the design system in practice.
3. **`app/_lib/agent/run.ts`** — talk-path agent (query plan → retrieve → reply).
4. **`app/_lib/rag/`** — seed corpus, query writer, Weaviate retrieve.
5. **`app/capture/_components/TalkScreen.tsx`** — the live talk UI.

For anyone with access to the private specification set, those documents read D2 → D3 → D4 → D5 → D6 and D7 → D1, with D10 (`DESIGN.md`) last.

### Codes

Source comments throughout the repository reference the specification set by code:

| Code | Meaning |
|---|---|
| `D1`–`D7`, `D10` | Specification documents. `D10` is `DESIGN.md`, the only one published here. `D8` and `D9` are cited by the others but were never written. |
| `S1`–`S11` | Screens. `S2b` is the typed-input variant of `S2`, `S3e` the low-confidence escape from `S3`, and `SH1` a shared modal sheet rather than a screen. |
| `T1`–`T9` | Tasks within a journey. Agent-built steps use `A1`… codes; `T1` remains the seeded death-certificate practice path. |
| `C1`–`C7` | Hard product constraints. `C1` is the non-dismissible "not a government website" disclosure; `C4` requires every seeded government fact to carry a source and a verification date. |
| `E-nn`, `O-01` | Error, empty-state and offline strings. D5 is their single source of truth. |
| `T-LOCAL`, `T-IDB`, `T-SRV`, `T-CACHE` | The four persistence tiers: a single versioned `localStorage` record, the IndexedDB document wallet, the server-side journey store, and the Cache API journey pack. |
| `sbn.*` | Namespace for every stored record. |
| `BUG-nnn`, `DECISION-nnn` | Entries in the local-only defect log and decision record — see [Project tracking](#project-tracking). |

Two further conventions: copy strings are canonical English in the specs, and every string ships in every enabled language before that language is switched on; layouts are specified at a 360 px baseline.

---

## Project tracking

The session log (`progress.md`), decision record (`decision.md`) and defect log (`bugs.md`) are kept locally and are deliberately not tracked in this repository. Codes referenced from source comments and from this README — `DECISION-008`, `BUG-009` — resolve against those local files.

Hackathon constraints for the original build window are in `HACKATHON.md`.

---

## Running it

```
npm install
cp .env.example .env.local   # then fill keys
npm run dev                  # http://localhost:3000
npm run dev:https            # LAN mic testing
npm run build
npm run typecheck
npm test
```

Node 20 or newer. Next.js App Router, TypeScript, no CSS framework: tokens in `app/tokens.css` from `DESIGN.md`.

### Environment

| Variable | Used for |
|---|---|
| `SARVAM_API_KEY` | Speech-to-text, text-to-speech, query writer, reply model |
| `WEAVIATE_URL` | Cloud Weaviate host for the civic snapshot |
| `WEAVIATE_API_KEY` | Weaviate API key |

Without Sarvam, talk falls back to the saved directory text. Without Weaviate, retrieval uses the seed corpus only.

---

## Status

Talk-first path is what production runs: home → capture → journey, with Sarvam voice and Weaviate RAG when keys are set.

`/api/journey` is still a development stub: in-memory, per-process, and not the backend. Tests cover retrieval aliases, the query-writer plan, voice helpers, and the T-LOCAL store contract.

Hindi UI strings are structurally complete but many remain placeholders (BUG-008). Kannada, Marathi, and Assamese tiles use English chrome with native chips and speech. Do not treat those tiles as fully translated.

The older Socratic screens (S3–S4) and the T1 practice form remain for the seeded death-certificate path and as a fallback when the live model is down.
