# Batch 3

# D3 — Screen Specifications (Part 2: S6–S10, S11) + Appendix A

Conventions from Batch 2 apply unchanged (copy codes → D5; banner, honesty chip, footer → S11 on every screen; N3 mirroring throughout).

---

## S6 — Task Detail

**Purpose.** Everything about one task: what, documents, where, cost, duration, common failure; clean handoff to mock submission or the real-world offline path.

**Entry conditions.** (a) S5 unlocked task card. (b) S5 locked-card expander "Go to the task that unlocks this" (targets the unlocking task, which is unlocked by definition). (c) S9 next/completed task (completed → read-only mode). (d) S7 "Continue to {task}". (e) Deep link with journey context (N5); if the task is locked → read-only mode with a prominent path to the unlocking task. (f) S8 Abandon.

**Exit conditions.** Primary CTA per the CTA rule below. "I've already done this" → completion flow → S5. "I need help with this" → S10. Documents missing → S7. Back → S5.

**CTA rule (authoritative; closes P2-10, corrects D7).** Evaluated per task, in order:
1. Required documents missing → primary CTA "Add the missing documents first" → S7.
2. Docs complete ∧ mock flow exists for this task → "Start this step (practice)" → S8.
3. Docs complete ∧ online path exists, no mock → "Take me to the official site" → external via N6 interstitial.
4. No online path → primary CTA "Where to go" → S10. No disabled ghost button is ever shown for a path that doesn't exist.

**Layout & component inventory**

| Component | Spec |
|---|---|
| Title & purpose | Plain language: "Death certificate — the document almost everything else needs" |
| Status & dependencies | What is done, what remains; read-only mode shows "Completed on {date} · Ref {ack}" |
| Documents needed | Checklist computed against S7 wallet in real time; each item: ✓ if in wallet, "Add" action if not |
| Where | Online portal link (official, via interstitial) **and** nearest physical office with map link — both, always |
| Fee | Amount + "Paid on the government site, not here." (C6) |
| Timeline | Realistic range, e.g. "Usually 7–21 days" |
| Common rejection reasons | 2–3 bullets |
| Provenance | Source link + last-verified date + state (C4) |
| Primary CTA | Per CTA rule |
| Secondary CTA | "I've already done this" |
| Tertiary | "I need help with this" → S10 |

**Completion flow ("I've already done this" — closes P1-3).** Tap → confirm sheet: "Mark '{task}' as done?" [Yes, it's done / Cancel]. On confirm, if the task produces an output document: prompt "Do you have the {document}? " [Add it now → S7 with that document's Add flow open / I'll add it later]. Task marked complete either way; graph recomputes; return to S5 with the unlock transition visible. "Add it later" leaves dependent tasks doc-gated with the standard "Add" actions — no unexplained state.

**Core states**

| State | Trigger | Behaviour | Copy | Exit |
|---|---|---|---|---|
| Default | Task content available (journey pack, F3) | Full layout per CTA rule; read-only mode disables both CTAs, keeps content and help | As inventory | Per exits |
| Loading | First render before pack cache is warm | Skeleton: title, checklist rows, CTA placeholder | None | Default, or Error |
| Empty | Cannot occur — a task card exists only if its pack content exists; a pack fetch failure surfaces as S5 E-13 before S6 is reachable | — | — | — |
| Error | External link unreachable (E-18, detected on tap) | Office-address path promoted to primary; inline note on the link | E-18 | User uses office path or retries link |
| Disabled | Offline (O-01) | Content readable (F3); rule-2 CTA replaced by chip "Practice submission needs a connection"; external-link CTA disabled with O-01 note; office path and checklist remain live | O-01 | Connectivity returns |

**Interactive elements.** Primary CTA: enabled per rule; disabled on first tap. "I've already done this": destructive-adjacent → confirmation sheet as above (completion is reversible only via answer edits, so confirm is mandatory). Checklist "Add": → S7 with that document pre-focused. Map link: opens OS maps. All: first tap wins.

**Validation.** No direct inputs.

**Back navigation.** Back → S5. From entry (e) with no prior in-app history, Back still → S5 (journey context exists by definition).

**Edge cases.** Locked via deep link → read-only + "This step needs {document} first — Go to {unlocking task}". Read-only completed task (entry c) → content + provenance visible, CTAs replaced by completion record. Interstitial (N6) precedes every external navigation: "You're leaving this prototype and going to an official government site." [Continue / Stay].

---

## S7 — Document Wallet

**Purpose.** One document, supplied once, reused everywhere — and visible coverage.

**Entry conditions.** (a) S5 reuse banner. (b) S6 docs-missing route or checklist "Add". (c) S8 auto-add confirmation ("View in wallet"). (d) Deep link (N5). (e) S6 completion-flow "Add it now" (target document's Add flow opens immediately).

**Exit conditions.** Return to originating screen (S6 or S5) via Back. "Continue to {task}" (shown when an add newly satisfies a task) → S6.

**Layout & component inventory**

| Component | Spec |
|---|---|
| Coverage summary | "You have {h} of {t} documents. These unlock {u} of {n} steps." |
| Document cards | Name, thumbnail/icon, status chip (`Have it` / `Need it` / `Sample loaded`), "used by" list naming every consuming task |
| Reuse visualisation | Static SVG: one document node, lines to consuming tasks; no graph library |
| Add action | Per needed document: Camera capture / Gallery / "Use sample document" |
| Mock-data notice | Global + per-card: "Prototype uploads are stored in your browser only and are not sent anywhere." (C3, P3) |

**Core states**

| State | Trigger | Behaviour | Copy | Exit |
|---|---|---|---|---|
| Default | Wallet has ≥ 1 document | Full layout; adding a document recomputes readiness across all tasks and shows positive confirmation: "This also completes the document step for {k} other tasks." | As inventory | Per exits |
| Loading | Upload/processing in flight | Client-side downscale; determinate progress on the card; cancellable | "Preparing your document…" | Card lands, or Error |
| Empty | Wallet empty | Instructional empty state: reuse SVG with all nodes hollow + "Add one document here and it works for every step that needs it." + the Add actions | As stated | First add → Default |
| Error | Upload failure (E-14); camera permission denied (E-15); storage quota (E-17); real-ID in a label field (E-16) | E-14: card shows failed chip + "Try again"; partial data discarded. E-15: inline note + Gallery and Sample remain offered. E-17: explain + offer removal list; never fail silently. E-16: field-level rejection at entry, never sanitise-after-accept (P6) | Per D5 | Retry / alternate path |
| Disabled | Confirm-removal modal open, or upload in flight for that card | Underlying card controls inert; Cancel always available | None | Modal resolves |

**Interactive elements.** "Add" / "Use sample document": sample loads a watermarked synthetic ("SAMPLE — NOT A REAL DOCUMENT"), the recommended demo path; first tap wins. Card tap: preview + "used by" detail. **Remove** (destructive): confirm modal — "Remove {document}? Steps that need it will show as waiting again." [Remove / Keep] — recomputes readiness; **never reverts completion** (P2-8): any completed task that consumed it shows the informational note "Completed earlier — removing the document doesn't undo this."

**Validation.** Optional per-document label field: free text, max 60 chars; E-16 guard on input (Aadhaar/PAN/16-digit patterns rejected at field level with explanation). File adds: images only, downscaled client-side; oversize pre-downscale → downscale silently, no user error.

**Back navigation.** Back → originating screen (S6 or S5); N2 — no in-progress add is lost by Back (upload continues, card lands on return).

**Edge cases.** Deep link with journey context → renders Default if the wallet holds ≥ 1 document, Empty otherwise; without context → S1 with destination preserved (N5), consumed immediately after journey restore/creation; if the restored journey needs no documents view target, standard wallet renders (wallet is journey-independent storage). Nothing ever leaves the device; no OCR of real identity documents (hard constraint, P3).

---

## S8 — Guided Mock Submission

**Purpose.** One full application end to end; the user experiences "done." T1 is the shipped instance (schema: Appendix A).

**Entry conditions.** (a) S6 CTA rule 2. (b) Resume of a saved draft from S6 (`In progress` chip path). Precondition: required documents in wallet (D6).

**Exit conditions.** Submit → S9 with unlock animation. Abandon → draft saved → S6. Cancel (N4) → confirm with "Keep my draft" default; discard → S6, chip cleared. Back → previous form step, data retained; from step 1 → S6, draft saved.

**Layout & component inventory**

| Component | Spec |
|---|---|
| Mock banner | Persistent, top, unmissable: "Practice mode — nothing is submitted to any government system." |
| Step indicator | "Step {s} of 4" |
| Form fields | One or two per view; every field: plain-language label, one-line "why we ask this", voice input, wallet pre-fill where mapped (Appendix A) |
| Pre-fill indicators | From wallet: "filled from your documents"; from Socratic answers: "filled from your answers" — both editable, edits win |
| Review step | Step 4: full summary, every field editable in place |
| Primary CTA | "Submit (practice)" (step 4 only); per-step CTA "Next" |
| Result screen | Mock ack number `PRACTICE-AS-{6 digits}` (prefix visually distinct, unmistakably not a real reference), expected timeline, "what happens next in the real world," what to keep, and the auto-add confirmation: "A practice Death Certificate has been added to your documents" + "View in wallet" (P1-3) |

**Core states**

| State | Trigger | Behaviour | Copy | Exit |
|---|---|---|---|---|
| Default | Step rendered | Fields per Appendix A | Per schema | Next/Submit |
| Loading | Pre-fill computation on step entry | Field skeletons ≤ 500 ms; if mapping unresolved by then, fields render empty and pre-fill is skipped for that step (editable regardless); no error | None | Default |
| Empty | Not applicable as a screen state — required-field emptiness is Validation; a step always has its schema fields | — | — | — |
| Error (Validation) | Inline, on blur, per Appendix A rules; phrased as guidance, never blame | On Submit with invalid fields: focus the first offending field; error summary at top for screen-reader users (D6) | Per-field copy, Appendix A; date guidance uses `{date_format}` token, e.g. "Dates are written like {date_example}." | Field corrected |
| Disabled | Submitting | Determinate progress; non-cancellable window < 3 s; **Submit disabled on first tap; exactly one ack number per draft (idempotent on draft ID); repeat taps no-ops** (P2-7) | "Submitting your practice form…" | Result screen |

**Additional states.** *Session timeout:* draft preserved, resumable, never discarded (P4). *Offline at submit (P2-6, behavior change logged in D1):* submission completes **locally** — nothing is transmitted in the prototype, so connectivity is irrelevant; result screen renders normally with the offline chip visible; no queue, no "reconcile" language anywhere.

**Interactive elements.** Next: enabled always; blur-validates current fields, blocks advance while a required field on this step is invalid (inline errors shown). Submit: precondition = all steps valid; single-fire per above. Cancel (the only screen with Cancel, N4): confirm sheet "Stop this practice form?" [Keep my draft (default) / Discard the draft]. Discard is destructive → clears draft, clears `In progress` chip. Voice input per field: dictates into the focused field; same validation applies on blur.

**Validation.** Per field, Appendix A. Global guard: no field accepts a real Aadhaar, PAN, account number, OTP or card number — format-matched input blocked at entry with E-16 explanation (P6). Autosave per step (P4); `In progress` chip set on first autosave (P2-3).

**Back navigation.** Back → previous step, data retained; step 1 → S6 with draft saved. Each step is a history entry (N3).

**Edge cases.** Draft resume lands on the furthest incomplete step with all data restored. Wallet document removed while a draft exists → pre-filled values persist in the draft (they are draft data once written); no retroactive clearing.

---

## S9 — Progress / Resume Dashboard

**Purpose.** Return days later and know immediately where things stand and what's next. Proves durability.

**Entry conditions.** (a) S8 submit (unlock animation plays here). (b) SH1 success. (c) S1 Continue. (d) Device-2 restore via SH1 (Q-B). Precondition: none — the no-journey case is a state below.

**Exit conditions.** "Next: {task}" card → S6. Completed task → S6 read-only. "Full journey view" → S5. "Change my answers" → S4. No-journey state → S1. Share/print → OS share sheet. Back → S5 (journey exists) / S1 (none).

**Layout & component inventory**

| Component | Spec |
|---|---|
| Progress ring | "{done} of {n} done" |
| "Next" card | Single, prominent, mirrors S5 `Do now` treatment |
| Completed list | Task, date, mock reference number |
| Waiting list | **Scoped to simulated government processing only** (P2-6): tasks submitted (practice) whose real-world counterpart would be pending, with expected dates and the mock label |
| Recompute diff banner | Same component and rules as S5 (P1-4) |
| Sync status line | "Saved to this device · Backed up as {number}" or un-synced variant with "Save this list" → SH1 |
| Device note (device-2 only) | On every doc-gated task: "Documents stay on the device they were added to. Add them here to continue." (P1-7) |
| "Change my answers" | → S4 |
| Share/print | Plain checklist |

**Core states**

| State | Trigger | Behaviour | Copy | Exit |
|---|---|---|---|---|
| Default | Journey exists locally | Full layout; entry (a) plays the unlock transition before settling | As inventory | Per exits |
| Loading | Device-2 restore fetch (entry d) | Skeleton ring + list while journey + answers download (wallet never syncs — P3) | "Getting your saved progress…" | Default, or Error |
| Empty | No journey on device and none restored | Route to S1 (per original spec) after a one-line interstitial: "Nothing saved yet — let's start." | As stated | S1 |
| Error | Restore fails (E-20); background sync fails (E-19) | E-20: card "We couldn't fetch your saved progress" + Try again + "Start fresh instead" → S1. E-19: non-blocking note; local state authoritative; retry silently on next mutation | Per D5 | Retry / S1 / dismiss |
| Disabled | Offline (O-01) | Local state fully served; sync line shows "Will back up when you're online"; share/print and navigation unaffected | O-01 | Connectivity returns |

**Interactive elements.** All navigation: first tap wins. "Change my answers": edits route through S4; recompute treatment per P1-4 on return. No destructive actions on this screen.

**Validation.** No inputs (SH1 owns the stub fields).

**Back navigation.** Back → S5; no journey → S1. Never journey-reset (N1).

**Edge cases.** Long absence → non-blocking note: "Some steps were updated since you last checked" when any `last_verified` changed. Multiple journeys → switcher placeholder (out of build scope; must not break layout: renders as a single-item selector). Device-2 with local wallet empty: journey, answers, completion restore; doc-gated tasks carry the device note; completed tasks stay completed (completion syncs with the journey; P2-8 logic unaffected).

---

## S10 — Offline Path & Human Help

**Purpose.** Serve the user whose next step cannot happen online, and the user the system failed to understand.

**Entry conditions.** (a) S3e "Talk to a person". (b) S6 "Where to go" (CTA rule 4) or "I need help with this". (c) Q2 "My state isn't here" sheet → "Where to get help" (renders national-helpline content — the one context with no state scope). (d) S5/S9 contextual help affordances.

**Exit conditions.** Back → originating screen (S3e, S5, S6 or S9). Print/share → OS share sheet. Tap-to-call → dialer.

**Layout & component inventory.** Nearest relevant office: name, address, map link, hours, documents to carry (static, seeded, provenance-stamped — no live lookup; every number and address shows source + verification date). Printable one-page checklist in the user's language. Official helpline numbers, tap-to-call. Legal-aid routing (district legal services authority) framed as the correct destination for rights questions. Boundary statement: "We explain the process. We don't give legal advice." (C5). Entry (c) variant: national helplines + CRS national guidance, header "General help — your state's details aren't covered yet."

**Core states (closes P2-11)**

| State | Trigger | Behaviour | Copy | Exit |
|---|---|---|---|---|
| Default | Entry | Full layout, contextual to originating task where known | As inventory | Per exits |
| Loading | None — all content is bundled static | — | — | — |
| Empty | Cannot occur for seeded states; entry (c) renders the national variant, never a blank | — | — | — |
| Error | Share sheet unavailable (E-22) | Fall back to a print-view page (browser print dialog) | E-22 | Print view |
| Disabled | Offline (O-01): map link disabled with note, full address still shown. Non-telephony device: number rendered as copyable text with "Copy" affordance instead of tap-to-call | O-01 / "Copy number" | Connectivity / n.a. |

**Interactive elements.** Tap-to-call, map link, print/share, legal-aid link: first tap wins; none destructive. **Validation.** No inputs. **Back.** → originating screen. **Edge cases.** Print checklist is the highest-value artefact for a low-literacy office visit: generated in the selected language, includes documents-to-carry for the originating task when entered from S6.

---

## S11 — What's Real and What's Mocked

**Purpose.** Realises C7: one honest, named list of every mocked dependency. Entry: global footer link on every screen. Exit: Back → originating screen.

**Layout.** Title "What's real and what's mocked here". Two-column list (label + status chip `Real` / `Practice only` / `Sample data`):

| Item | Status | Note |
|---|---|---|
| Understanding your words (intent engine) | Real | A live model interprets what you say |
| Voice-to-text | Real | Runs while you speak |
| Government submissions | Practice only | Nothing is ever sent to any government system |
| Acknowledgement numbers | Practice only | `PRACTICE-` numbers are not real references |
| Login code (OTP) | Practice only | Always 0000; no SMS is sent |
| Your documents | Sample data / your device only | Never uploaded anywhere |
| Office addresses & helplines | Real, static | Source and verification date shown on each |
| Fees & timelines | Real, static | From official sources, dated |
| Payments | Not handled | Fees are paid on official sites only |

Footer restates C1 disclosure. **States.** Static: Default only; Loading/Empty/Error cannot occur (bundled content); Disabled during navigation transition. **Interactive elements.** Back only. **Validation.** None. **Back.** → originating screen (footer link never resets state, N2).

---

## Appendix A — T1 Form Schema (Guided Mock Submission, models Assam; basis: CRS death-report form)

Wallet source documents (sample set): `DOC-MED` Medical Cause of Death Certificate (sample), `DOC-ID-D` Deceased's ID proof (sample), `DOC-ID-I` Your ID proof (sample), `DOC-ADDR` Address proof (sample). All samples watermarked; sample ID numbers use the format `SAMPLE-XXXX`, which deliberately fails every real-ID pattern.

**Step 1 — About the person who passed away**

| Field | Why we ask | Type | Validation (fires on blur) | Pre-fill |
|---|---|---|---|---|
| Their full name | "The certificate must match their records exactly." | Text | Required; 2–100 chars | `DOC-ID-D` |
| Sex | "Registration records ask for this." | Radio: Male / Female / Other | Required | `DOC-MED` |
| Age when they passed away | "Used to check the medical record matches." | Number | Required; 0–120 | `DOC-MED` |
| Their ID number (optional) | "Optional here. The real office may ask for ID." | Text | Optional; max 20; E-16 guard — real Aadhaar/PAN formats blocked at entry | `DOC-ID-D` (sample number) |

**Step 2 — About the death**

| Field | Why we ask | Type | Validation | Pre-fill |
|---|---|---|---|---|
| Date of death | "Sets which office and deadline apply." | Date picker | Required; not in the future; ≤ 1 year past (guidance if older: "Older than a year needs a magistrate order — ask at the office.") | `DOC-MED` |
| Where did it happen | "Decides who reports it." | Radio: Hospital / At home / Somewhere else | Required | `DOC-MED` |
| Name of the hospital or place | "Goes on the record." | Text | Required if not "At home"; 2–100 chars | `DOC-MED` (hospital case) |
| District & registration office | "Each district has its own registrar." | Select (seeded Assam district list) | Required | Journey state (Q2) narrows list; no default selection |

**Step 3 — About you**

| Field | Why we ask | Type | Validation | Pre-fill |
|---|---|---|---|---|
| Your full name | "You are the person reporting." | Text | Required; 2–100 chars | `DOC-ID-I` |
| Your relationship to them | "Decides what proof you'll need later." | Select: Spouse / Son / Daughter / Parent / Other | Required | Socratic Q5 — "filled from your answers" |
| Your address | "The certificate is delivered here." | Multiline | Required; 10–200 chars | `DOC-ADDR` |
| Your phone number (optional) | "The office may call about the certificate." | Numeric | Optional; exactly 10 digits if present | SH1 save key if one exists — editable |

**Step 4 — Review & submit.** All fields grouped by step, editable in place; "Submit (practice)"; behaviour per S8 spec (single-fire, result screen, `PRACTICE-AS-` ack, auto-add of the watermarked practice Death Certificate to the wallet).

An engineer can build all four steps for T1 from this appendix without consulting any external source (P0-3 done-when satisfied).
