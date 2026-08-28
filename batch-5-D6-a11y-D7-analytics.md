# Batch 5

# D6 — Accessibility & Internationalization Spec

Target: **WCAG 2.1 AA** (Register Q9), with §5.3 rules A1–A8 layered on top. This document adds what A1–A8 lack: dynamic focus, announcements, and locale behavior. All rules apply in every enabled language; screen-reader labels are authored in the selected language, never English (A7).

## 6.1 Focus order per screen

Focus order follows visual order top-to-bottom; the table names the anchors that matter. The disclosure banner is `role="note"`, in the tab order once at the top of every screen; the global footer link (→ S11) is last on every screen. Both are omitted below.

| Screen | Focus order (interactive elements) | Initial focus on entry |
|---|---|---|
| S1 | [Back to your question (entry c)] → [Continue card (cond.)] → tiles (reading order) → speaker icon per tile → mic CTA → "Type instead" | First heading (`h1` announced), not a control — no focus steal on load |
| S2 | Language pill → chips → mic → Stop (Listening only) → transcript field → "Say it again" → Confirm → "Type instead" | Heading; after capture completes: transcript field |
| S2b | Chips → text field → Submit → "Speak instead" | Text field (entry a); text end (entries b/c) |
| S3 | Back → speaker → answer options in order → "I'm not sure" → voice mic | Question text (`h1`, focus moved here on every question render — see 6.2) |
| S3e | Transcript card (readable, not focusable) precedes → exit 1 → exit 2 → [browse cards B1–B6 when expanded] → exit 3 | Headline |
| S4 | Speaker → chips in summary order → consequence preview (text) → primary CTA → "Something's wrong" | Summary statement |
| S5 | [Manual/diff banner + its controls] → "Do this first" card → task cards in rail order (locked cards focusable — expanders) → ["No longer needed" toggle] → document banner → "Change my answers" → share/print → "Save this list" | Heading; after recompute: diff banner (6.2) |
| S6 | Checklist "Add" actions in order → portal link → map link → primary CTA → "I've already done this" → "I need help" | Title |
| S7 | Coverage summary (text) → document cards → per-card Add/Remove → ["Continue to {task}" when shown] | Heading; entry (e): the target document's Add control |
| S8 | Mock banner (note) → step fields in order (each: field, then its "why we ask" disclosure, then voice input) → Back → Next/Submit → Cancel | First field of the step |
| S9 | "Next" card → completed list items → waiting list items → sync line control → "Change my answers" → "Full journey" → share/print | Heading; entry (a): the unlock announcement fires first (6.2) |
| S10 | Office block links (map, tap-to-call/copy) → checklist print → helplines → legal-aid link | Heading |
| S11 | List (readable) → Back | Heading |
| SH1 | Field → helper → CTA → resend (step 2) → close | Phone field (step 1) / OTP field (step 2). Focus **trapped** in the sheet; Esc/scrim/close returns focus to the invoking control |

Visible focus ring everywhere (A8); touch targets ≥ 48 × 48 px, primary CTAs ≥ 56 px (A3); contrast ≥ 4.5:1 text, ≥ 3:1 boundaries (A4).

## 6.2 Dynamic focus & announcements (closes P1-8)

Two global live regions exist: `#announce-polite` (`aria-live="polite"`) and `#announce-assertive` (`role="alert"`). Rules, by transition:

| Transition | Focus target | Announcement (pattern, localized) | Channel |
|---|---|---|---|
| S3 question advance | New question text (`tabindex="-1"`, programmatic focus) | "Question {n} of {m}. {question text}" | Focus move itself announces; no live region needed |
| S3 Thinking | Unmoved | "Finding the next question" | polite |
| S3 E-03 retry card | Card heading | E-03 copy | assertive |
| S3 → S4 / S4 render | Summary statement | "Here's what we understood. {summary}" | Focus move |
| S4 return-from-chip-edit | The edited chip | "Updated. {new chip value}. {consequence preview}" | polite |
| S4 → S5 first render | S5 heading | "{n} things to do. First: {task}." | polite |
| S5/S9 recompute | Diff banner | "{a} steps added, {r} removed." | polite |
| Task unlock (S5, S9 entry a) | Unmoved (animation plays) | "{task} is now unlocked." | polite |
| S6 completion flow confirm | Returns to S5 per flow | "{task} marked done. {unlocked task} is now unlocked." | polite |
| S7 add success | The new card | "Added. This also completes the document step for {k} other tasks." | polite |
| S8 step advance / back | First field of the step | "Step {s} of 4. {step title}" | Focus move |
| S8 validation on Submit | **First offending field** | Error summary rendered at top: "{count} things need a look" listing field names as in-page links | assertive (summary), then focus |
| S8 result | Result heading | "Done. Practice number {ack}." | Focus move |
| SH1 open / close | Per 6.1 trap | "Save your progress. This is a practice login." / (close) silence | polite on open |
| Any E-code inline error | Field keeps focus | Error text via `aria-describedby` on the field | assertive for blocking errors (E-16), polite otherwise |
| O-01 offline / reconnect | Unmoved | O-01 copy / "You're back online." | polite |

Loading states: every skeleton region carries `aria-busy="true"`; determinate progress bars expose `aria-valuenow`. Audio read-aloud (A5) never traps focus and is stoppable with the same speaker control.

## 6.3 Text expansion & scaling

All layouts survive 200% browser text scaling (A2) and +40% string expansion (Hindi and future languages) without truncation: chips wrap to two lines before ellipsis; status chips never truncate the status word; buttons grow vertically. Minimum body 16 px, primary actions 18 px. `{expected}` counts and interpolated task names are the only variable-length insertions in headings; both wrap.

## 6.4 RTL & locale formats (closes P2-1; general case per Register Q6)

- **RTL rule:** layout direction is driven by the locale's script (`dir="rtl"` at the root for RTL locales). Mirrors: reading order, rail alignment (S5 timeline), Back placement, progress direction, chevrons. Does **not** mirror: numerals within numbers, media controls (waveform, audio scrub), phone-number display. The two shipped languages are LTR; the rule exists so an RTL language (e.g., Urdu) is a content addition, not a layout rework.
- **Locale tokens:** all dates render and validate via `{date_format}` per locale (en-IN: `DD-MM-YYYY`; hi-IN: same digits, Devanagari month names in prose contexts); guidance copy uses `{date_example}` generated from the token — no hardcoded date string exists anywhere (S8's "12-03-2024" is deleted). Numbers use `{number_format}` (Indian grouping: 1,00,000). The S8 date picker stores ISO 8601 internally; display is token-driven.
- **Script handling:** transcript and free-text fields accept any script regardless of locale (per S2b rule); code-mixed text preserved as entered.

---

# D7 — Analytics & Observability Spec

Scope note: the audit excluded telemetry from *scoring* (Register Q5, CTO-owned); this deliverable is emitted regardless because the suite requires production detection of its own failure modes. No event ever carries transcript text, answer values beyond enumerated codes, document content, or the save key (C6-aligned; `save_key_hash` only, salted).

## 7.1 Common properties

Every event: `session_id`, `journey_id` (nullable), `locale`, `input_mode`, `screen`, `online` (bool), `ts`.

## 7.2 Event catalog

| Event | Fires | Properties |
|---|---|---|
| `screen_view` | Every screen render, incl. S3 per-question | `screen`, `question_n` (S3) |
| `language_selected` | S1 tile | `locale` |
| `capture_completed` | S2/S2b submit | `mode` (voice/text/chip/mixed), `char_count`, `capture_retries` |
| `question_answered` | S3 answer recorded | `question_id`, `answer_type` (option/unsure/voice), `n`, `confidence_band` (bucketed: <0.5 / 0.5–0.8 / ≥0.8) |
| `loop_exited` | S3 exit machine fires | `exit` (`conf_met` / `widest_safe` / `s3e` / `error_optout`), `n`, `confidence_band` |
| `summary_confirmed` | S4 primary CTA | `edits_made` (count), `fallback` (model/rule_based) |
| `journey_created` | First S5 render of a graph | `task_count`, `source` (socratic/manual:{B#}), `state`, `unknown_count` |
| `journey_recomputed` | Any backward-edit recompute | `added`, `removed`, `archived`, `trigger` (chip/somethings_wrong/clarifier/q1_flip) |
| `task_opened` | S6 render | `task_code`, `lock_state`, `via` (map/dashboard/deeplink/unlock_chain) |
| `task_completed` | S8 submit or "already done" | `task_code`, `route` (mock_submit/already_done), `unlocked_count` |
| `doc_added` / `doc_removed` | S7 | `doc_type`, `method` (camera/gallery/sample), `newly_ready_tasks` |
| `mock_submitted` | S8 single-fire | `task_code`, `steps_completed`, `prefill_used` (count), `validation_failures` (count) |
| `save_created` / `restore_completed` | SH1 success / device-2 restore | `save_key_hash`, `device_ordinal` (1/2+) |
| `error_shown` | Every D5 row | `code`, `screen`, `attempt_n`, `auto` (bool) |
| `fallback_taken` | Any automatic degradation | `from` → `to` (e.g., `voice→text`, `model_summary→rule_based`, `share→print`) |

## 7.3 Funnel definition

Primary funnel (mirrors the minimum demonstrable path):
`language_selected` → `capture_completed` → `loop_exited(exit=conf_met|widest_safe)` → `summary_confirmed` → `journey_created` → `task_opened(T1)` → `doc_added` → `mock_submitted(T1)` → `task_completed` → `screen_view(S9)`.
Secondary funnels: recovery (`loop_exited(exit=s3e)` → `journey_created(source=manual)`) and durability (`save_created` → later-session `screen_view(S9)` → `restore_completed`).

## 7.4 P0/P1 failure-mode detection (the observability contract)

| Finding | Production signal that the defect (or its regression) exists | Alert condition |
|---|---|---|
| P0-1 | `loop_exited` missing for sessions with `question_answered(n=5)`; or `exit=s3e` rate for `confidence_band=0.5–0.8` > 0 | Any occurrence — the widest-safe band must never reach S3e |
| P0-2 | `screen_view(S9)` with no preceding same-session tap event from S1 Continue (auto-redirect regression) | Any occurrence |
| P0-3 / S8 | `mock_submitted` with `validation_failures` p95 spike, or funnel drop S8-step2→step3 | Drop > 25% vs baseline |
| P1-1 | Route assertions: `screen_view` sequence violating D2's edge set (e.g., S4→S2) | Any occurrence |
| P1-2 | `error_shown(E-03)` rate; `attempt_n≥3` share; `exit=error_optout` count | E-03 > 5% of S3 sessions |
| P1-3 | `task_completed(T1)` without subsequent `doc_added(doc_type=death_cert)` within the session and no "later" prompt event | Rate > 10% |
| P1-4 | `journey_recomputed` where `removed>0` with no `screen_view` containing the diff banner impression event | Any occurrence |
| P1-5 | `question_answered(question_id=Q2)` with any value outside the seeded set | Any occurrence — picker constraint breached |
| P1-6 | `error_shown(E-10\|E-11)` retry loops > 3 per session | Rate spike |
| P1-7 | `restore_completed(device_ordinal≥2)` followed by `error_shown` on wallet reads | Any occurrence |
| P1-8 | Not detectable via events — verified by the D8 audit method (assistive-tech test pass) | n/a |
| P1-9 | `journey_created(source=manual)` count = 0 over 7 days while `loop_exited(exit=s3e)` > 0 | Browse path dead in practice |
| P2-6/P2-7 | Duplicate ack: two `mock_submitted` with same `journey_id`+`task_code` | Any occurrence |
