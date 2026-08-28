# Batch 4

# D4 — Data & Persistence Contract

## 4.1 Storage tiers

| Tier | Technology | Contents | Survives |
|---|---|---|---|
| T-MEM | Runtime memory | In-flight UI state: draft answer selection on the current S3 question, un-blurred field text, open sheets/modals, animation state | Nothing — rebuilt from lower tiers on render |
| T-LOCAL | `localStorage`, single versioned record `sbn.journey.v1` + `sbn.locale` + `sbn.savekey` | Locale (P1); transcript; `input_mode`; Socratic answers (incl. `unknown` and archived answers); computed journey graph + per-task status, ack numbers, archive list; S8 drafts keyed `draft.{taskCode}`; SH1 save key; dismissed-banner flags | Refresh, tab close, app kill, long absence. Cleared only by browser-profile clear |
| T-IDB | IndexedDB `sbn.wallet` | Document blobs, thumbnails, labels, sample flags | Same as T-LOCAL. **Never syncs, never transmitted** (P3 — hard constraint) |
| T-SRV | Backend, keyed by SH1 save key (Q-B) | Snapshot of `sbn.journey.v1` **minus wallet references' blobs**: transcript, answers, journey graph, statuses, ack numbers, drafts, locale | Cross-device. Written only after an SH1 success, then on every subsequent mutation (background) |
| T-CACHE | Cache API | Journey pack for the active journey (task content, provenance, office data) — cached on first S5 render (F3) | Refresh/kill; evictable by the browser (recovered via refetch, E-13 if offline) |

Writes to T-LOCAL happen **on every mutation** (P2); no explicit save exists anywhere. T-SRV writes are fire-and-forget with silent retry on next mutation (E-19 note only on S9's sync line).

## 4.2 Per-screen read/write contract

| Screen | Reads | Writes |
|---|---|---|
| S1 | `sbn.locale`, journey presence (Continue card) | `sbn.locale` on tile tap |
| S2 / S2b | Locale, transcript draft | Transcript on every change (blur + 5 s tick in S2b; capture completion in S2); `input_mode` |
| S3 | Transcript, answers, question history | Each recorded answer (incl. `unknown`); archived answers on invalidation; question history entry per view |
| S3e | Transcript | `journey.source = manual:{B#}` on browse selection; journey graph from the bundled B-definition |
| S4 | Answers, journey graph | Nothing (summary derived, never stored) |
| S5 | Journey graph, statuses, wallet index (for lock labels), diff record | Diff-banner dismissal flag; conditional-task clarifier answers (as Socratic answers) |
| S6 | Task pack (T-CACHE), wallet index, task status | Task status on "I've already done this"; recompute output |
| S7 | Wallet (T-IDB), task requirements | Document add/remove (T-IDB); readiness recompute output (T-LOCAL) |
| S8 | Task schema (bundled), wallet fields, answers (pre-fill), draft | `draft.{taskCode}` per step autosave (P4); on submit: status=done, ack number, draft deleted, practice output document → T-IDB (P1-3) |
| S9 | Full journey record, sync status | Nothing directly; hosts recompute via S4 |
| SH1 | — | `sbn.savekey`; triggers first T-SRV snapshot |
| S10 / S11 | Bundled static content, task context | Nothing |

## 4.3 Survival matrix

| Event | Transcript & answers | Journey + statuses | S8 draft | Wallet | Save key |
|---|---|---|---|---|---|
| Refresh / tab close | Kept | Kept | Kept | Kept | Kept |
| App kill / device restart | Kept | Kept | Kept | Kept | Kept |
| Long idle ("session expiry") | Kept — no session construct exists; S8 draft explicitly never discarded | Kept | Kept | Kept | Kept |
| Browser data clear | Lost locally; restorable from T-SRV via SH1 re-entry (device-2 flow) | Same | Restored from T-SRV snapshot | **Lost — by design, and stated in S9's device note** | Lost (user re-enters the number they chose) |
| Device 2 restore | Restored | Restored (incl. completion + ack numbers) | Restored | **Empty** — doc-gated tasks show the device note (P1-7) | Entered in SH1 |

## 4.4 Invalidation matrix — backward edits (P1-4, P5; authoritative)

Trigger: any Socratic answer edited from S4 (chips), S3 re-entry, or a conditional-task clarifier on S5. The graph recomputes deterministically from the full answer set. Per task, compare old→new graph:

| Case | Rule | User-visible treatment |
|---|---|---|
| Task in both, status any | **Preserve status, ack number, draft** (P5) | Appears unchanged; content refreshes if state changed |
| Task added | Enters with computed lock state | Diff banner "+ {task} (added because {answer})"; unlock animation if it becomes `Do now` |
| Task removed, not started | Drop from graph | Diff banner "– {task}" |
| Task removed, `In progress` (draft exists) | Archive task + its draft together | Diff banner; card in "No longer needed" with note "Your practice draft is kept with it" |
| Task removed, `Done` | **Archive, never delete** | "No longer needed" section; completion record intact |
| Q1 No→Yes | T1 rendered pre-completed (`Done`, note "You told us this is already registered"); no ack number | Certificate add-prompt fires once on next S5 render (P1-3 pattern) |
| Q1 Yes→No | T1 returns to `Do now`; a prior pre-completed flag clears; a genuine S8 completion is **preserved** (P5) with note "Completed here earlier" | Diff banner |
| Q2 state changed | Task identities (codes) persist → statuses preserved; pack refetched; provenance/fees/offices update | Diff banner + per-card note "Details updated for {state}" |
| Wallet document removed (P2-8) | Readiness recomputes; **completion never reverts** | Note on affected completed tasks (per D3 §S7) |

`unknown` → definite answer resolves "may not apply" flags in place; definite → `unknown` re-flags without touching status. Archived answers (S3 inapplicability rule) are retained in T-LOCAL for restoration if a later edit makes them applicable again — restored answers return pre-selected, never re-asked silently.

## 4.5 Concurrency & double-submit

| Surface | Rule |
|---|---|
| S8 Submit | Single-fire: disabled on first tap; ack number generated once per draft ID and stored before the result screen renders; replay of the submit action against a completed draft is a no-op returning the stored ack (P2-7) |
| SH1 Save | Idempotent per confirmation; repeat taps no-op |
| Multi-tab (P2-12) | Last-write-wins on T-LOCAL; `storage` event in the stale tab shows banner "This page was updated in another tab — Refresh"; no merge is attempted |
| T-SRV | Last-write-wins keyed on save key with server `updated_at`; device-2 restore always fetches before first write; mid-session conflict resolves to most recent write (acceptable: single human, prototype scope) |
| Recompute | Synchronous over T-LOCAL; a recompute triggered while one is in flight queues and runs against the final answer set (no interleaving) |

---

# D5 — Error, Empty & Timeout Catalog

Single source of truth for error copy; D3 references codes only. Canonical English shown; all strings ship in every enabled language with audio (A5). Telemetry: every row emits `error_shown` with property `code` (plus properties noted); event definitions in D7. No string blames the user; "invalid input" is banned.

## 5.1 Error catalog

| Code | Condition | Screen(s) | User-facing copy | Recovery path | Retry policy |
|---|---|---|---|---|---|
| E-01 | Audio preview playback fails | S1 | "Audio unavailable right now." | Note auto-clears 4 s; tile fully functional | None — cosmetic |
| E-02 | Empty or < 1 s audio capture | S2 | "We didn't hear anything. Try again." | Re-record, tap a chip, or type | Unlimited manual |
| E-03 | S3 model call fails or exceeds 6 s | S3 | Retry card: "This is taking longer than usual." · CTA "Try again" · after 2 failed visible retries add: "Browse common situations instead" | Retry → next question; tertiary → S3e | Auto: 1 silent retry (6 s timeout). Manual: unlimited; S3e offer from visible-fail #2 |
| E-04 | Transcription fails | S2 | "We couldn't turn that into text. Try once more." | Retry; **2nd consecutive failure auto-routes S2b**, note: "Typing works just as well." | Auto-route at 2 consecutive |
| E-05 | Mic permission denied | S2 | (On S2b arrival) "Typing works just as well." | S2b | None — user-controlled |
| E-06 | Permission revoked mid-session | S2 | "Microphone access was turned off. Your words so far are saved. Turn it back on in your browser settings to keep speaking." | Partial transcript preserved; re-enable path shown | Re-attempt on next mic tap |
| E-07 | Capture interrupted (call/app-switch) | S2 | "We paused when you left. What you said is saved." | Resume capture or edit partial transcript | Manual |
| E-08 | Empty text submit | S2b | "Say or type something first — a few words are enough." | Focus retained, inline | n/a |
| E-09 | Voice answer ambiguous ×2 on one question | S3 | "Tap the closest one." | Tap-only for this question; mic returns next question | Cap = 1 "Did you mean…" re-render |
| E-10 | Save-key not 10 digits (or empty) | SH1 | "Enter any 10-digit number you'll remember." | Inline, field retained | n/a |
| E-11 | Wrong practice code | SH1 | "The practice code is 0000." | Inline; "Send the code again" → toast "Practice code: 0000" | Unlimited |
| E-12 | S4 summary generation fails / > 2 s | S4 | *(none — silent fallback to rule-based summary)* | Automatic | Auto only; telemetry `fallback:rule_based` |
| E-13 | Journey pack fetch fails, no cache | S5 | "We couldn't load your steps. Check your connection and try again." | Retry card; cached pack served with stale note when available | Manual unlimited |
| E-14 | Document upload/processing fails | S7 | "That didn't save. Try again." | Failed chip on card + retry; partial data discarded | Manual unlimited |
| E-15 | Camera permission denied | S7 | "Camera is off. You can pick from your gallery or use a sample document." | Gallery / sample paths | Re-attempt on next camera tap |
| E-16 | Real-ID pattern (Aadhaar/PAN/16-digit) entered | S2, S2b, S7, S8 | "This looks like a real ID number. Never enter real ID numbers here — this is a practice tool." | Blocked at entry (P6); clears when pattern removed | n/a — hard block |
| E-17 | Storage quota exceeded | S7 | "Your device storage for this app is full. Remove a document to add another." | Removal list offered; never silent | n/a |
| E-18 | External official link unreachable | S6 | "The official site isn't responding. The office address below works without it." | Office path promoted to primary | Manual |
| E-19 | Background sync to server fails | SH1, S9 | (S9 sync line) "Saved on this device. We'll back it up when we can." | Local state authoritative; non-blocking | Silent retry on next mutation |
| E-20 | Device-2 restore fetch fails | S9 | "We couldn't fetch your saved progress." · "Try again" · "Start fresh instead" | Retry, or S1 | Manual unlimited |
| E-21 | Deep-link task absent from journey | S5 | "That step isn't part of your journey." | Notice banner, auto-dismiss 6 s | n/a — informational |
| E-22 | OS share sheet unavailable | S10, S5, S9 | *(no message — behavior substitution)* | Print-view fallback (browser print dialog) | n/a |
| O-01 | Offline | Global chip | "You're offline. Reading works; practice submission and voice need a connection." | Per-screen Disabled rows (D3); auto-clears on reconnect | Auto-detect |

## 5.2 Empty states (exhaustive)

Only two genuine empty states exist; every other screen's Empty row in D3 proves impossibility. S7 empty wallet: "Add one document here and it works for every step that needs it." (instructional, with reuse SVG). S9 no journey: "Nothing saved yet — let's start." → S1.

## 5.3 Timeout & threshold registry (single source for every number in the suite)

| Value | Meaning | Owner |
|---|---|---|
| 1.5 s | S1 tiles tappable on 3G | S1 Loading |
| 300 ms | Tap vs hold gesture threshold | S2 |
| 3 s | Silence after speech → auto-stop | S2 |
| 500 chars / 400 | Capture max / counter appears | S2, S2b |
| 5 s | S2b autosave tick (plus on blur) | S2b |
| 800 ms | Perceived "thinking" budget (pre-fetch covers it) | S3 |
| 6 s | Hard timeout per model attempt | S3 (E-03) |
| 2 s | S4 summary budget before rule-based fallback | S4 (E-12) |
| 500 ms | S8 pre-fill computation budget, then skip | S8 |
| 3 s | Max non-cancellable submit window | S8, SH1 |
| 4 s / 6 s | E-01 note / E-21 banner auto-clear | S1, S5 |
