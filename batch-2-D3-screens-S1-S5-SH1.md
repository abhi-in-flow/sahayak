# Batch 2

# D3 — Screen Specifications (Part 1: S1–S5 + SH1)

**Conventions for all of D3.** Copy strings are given as canonical English; per the S1 language rule, every string ships in every enabled language before that language's tile is enabled, and every question, instruction and error is available as audio (A5). Error copy is referenced by `E-nn` / `O-01` code; exact strings live in D5, the single source of truth. All screens carry: the persistent disclosure banner ("Independent project. Not a government website."), the global honesty chip where stated, and the global footer link "What's real and what's mocked" → S11. All layouts: 360 px baseline, A1–A8 apply. Browser/hardware back mirrors in-app back everywhere (N3); the Back targets in each section below are authoritative and match D2 §2.4.

---

## S1 — Entry & Language Selection

**Purpose.** User picks a language and understands within 5 seconds that they can speak their problem. System establishes locale.

**Entry conditions.** (a) Cold start, no stored locale. (b) Cold start, stored locale **and** active journey → renders with Continue option (Q-C). (c) Re-entry from S2 language pill (transcript preserved in session). (d) Deep link with no journey context (destination preserved; N5). Stored locale with **no** journey does not render S1 — routes to S2.

**Exit conditions.** Language tile → S2. "Type instead" → S2b. "Continue where you left off" → S9. "Back to your question" (re-entry case only) → S2.

**Layout & component inventory**

| Component | Spec |
|---|---|
| Disclosure banner | Persistent, top, non-dismissible |
| Wordmark | Text only; no emblem, tricolour, Ashoka motif, or `.gov.in` visual language |
| Continue card (conditional) | Above the fold, above tiles, only when an active journey exists: "Continue where you left off" + one-line journey descriptor "{n} of {m} steps done" |
| Language tiles | 2 tiles (English, हिन्दी), each self-labelled in its own script, min 96 × 96 px, 16 px gap. Partially translated language = hidden tile, never fallback-to-English |
| Audio preview | Speaker icon per tile; tap plays a 2 s native-language greeting |
| Primary CTA | Mic button ≥ 88 px diameter + text label "Speak your problem"; never icon-only |
| Secondary CTA | Text link "Type instead", lower visual weight |
| Trust strip | Bottom: "We never ask for Aadhaar, PAN, OTP or payment." |
| Re-entry affordance (conditional) | "Back to your question" button, top, only on entry (c); explicit N1 exemption |
| Global footer | "What's real and what's mocked" → S11 |

**Core states**

| State | Trigger | Behaviour | Copy | Exit |
|---|---|---|---|---|
| Default | Any entry condition | Full layout; Continue card / re-entry affordance per entry condition | As inventory | Per exit conditions |
| Loading | First load on slow connection | Tiles render from inlined critical CSS before fonts/media; tappable ≤ 1.5 s on 3G; audio assets lazy-load after interactive | None visible | Becomes Default |
| Empty | Cannot occur — tiles and strings are bundled in the initial payload. Defensive: a language missing any string is a hidden tile (never an empty or broken one) | — | — | — |
| Error | Audio preview fails to play (E-01) | Tile stays fully functional; small inline note beneath the tapped tile, auto-clears in 4 s | E-01 | User taps tile normally |
| Disabled | Any navigation tap registered | All controls disabled for the transition window to prevent double-navigation | None | Navigation completes |

**Interactive elements**

| Priority | Element | Enabled precondition | Repeat-tap behaviour | Destructive? |
|---|---|---|---|---|
| Primary | Language tile | Always | First tap wins; subsequent taps ignored (Disabled state) | No |
| Primary (cond.) | Continue card | Active journey exists | First tap wins | No |
| Secondary | Speaker icon | Audio asset loaded | Restarts the sample | No |
| Tertiary | "Type instead" | Always | First tap wins | No |
| Tertiary (cond.) | "Back to your question" | Entry (c) only | First tap wins | No |

**Validation.** No inputs on this screen.

**Back navigation.** None (N1); hardware/browser back exits the app on entries (a), (b), (d). On entry (c), the "Back to your question" affordance is the sanctioned return path and hardware back mirrors it → S2.

**Edge cases.** Unsupported device locale → English tile pre-highlighted, never auto-advance. JS unavailable/failed → server-rendered static fallback: the 9 tasks in order with official links. Tapping a tile on entry (c) re-renders in the new language and returns to S2 with the captured text intact (locale switch never discards the transcript).

---

## S2 — Problem Capture (Voice)

**Purpose.** Capture the situation in the user's own words as the intent seed.

**Entry conditions.** (a) S1 language tile. (b) S2b "Speak instead" (text pre-filled into transcript field). (c) S3 Back past Q1 with `input_mode = voice` (transcript intact). Precondition: locale set.

**Exit conditions.** Confirm transcript → S3 (Q1). Mic permission denied (E-05), transcription failure ×2 consecutive (E-04), offline (O-01), or "Type instead" → S2b. Language pill → S1 entry (c).

**Layout & component inventory**

| Component | Spec |
|---|---|
| Header | Disclosure banner; language pill (current language name, tappable) |
| Prompt headline | "Tell us what happened." One sentence; plain register |
| Example chips | 3 tappable: "My father passed away last month" / "I need to claim my husband's pension" / "We need the death certificate" |
| Mic button | Supports press-and-hold and tap-to-toggle (gesture rule below); recording treatment while Listening; "Stop" control visible while Listening |
| Live waveform | Simple amplitude bar during capture |
| Live transcript | Streams below mic while speaking, in the user's script |
| Editable transcript field | Post-capture; multiline; the only payload sent onward. Never send unreviewed transcript |
| Confirm CTA | "Yes, that's right" |
| Re-record CTA | "Say it again" |
| "Type instead" | Persistent tertiary link |

**Gesture rule (P2-4).** On first mic press: release < 300 ms ⇒ tap-to-toggle mode; hold ≥ 300 ms ⇒ hold-to-talk mode. The first detected gesture sets the mode for the session; the mic button's helper label updates to match ("Tap to stop" / "Release to stop").

**Core states**

| State | Trigger | Behaviour | Copy | Exit |
|---|---|---|---|---|
| Default | Entry; or capture complete | Pre-capture: chips + idle mic. Post-capture: editable transcript + Confirm/Re-record | As inventory | Confirm → S3 |
| Loading | (i) Listening: capture active. (ii) Transcribing: record-then-transcribe fallback in use | (i) Waveform live, Stop visible. (ii) Skeleton text lines, determinate progress, Cancel visible | (ii) "Turning your words into text…" | (i) Stop/silence → (ii) or Default. (ii) Complete → Default; Cancel → pre-capture Default |
| Empty | (i) Audio empty or < 1 s (E-02). (ii) Transcript field empty | (i) Do not advance; inline hint under mic. (ii) Confirm disabled with visible reason under the CTA — never silently greyed | (i) E-02. (ii) "Say or type something first" | User records, taps a chip, or types |
| Error | E-04 transcription failure; E-05 permission denied; E-06 permission revoked mid-session; E-07 interruption (call/app-switch) | E-04: inline error + "Try again"; on 2nd consecutive failure auto-route S2b with note. E-05: route S2b with note. E-06: stop capture, preserve partial transcript, show re-enable instructions inline. E-07: auto-stop, preserve partial transcript, show resume note | Per D5 codes | E-04×2, E-05 → S2b; E-06/E-07 → Default with partial transcript |
| Disabled | Offline (O-01) | Mic disabled; auto-switch to S2b with offline chip visible (F4). Confirm disabled while transcript empty (see Empty ii) | O-01 | Connectivity returns → mic re-enables on next visit |

**Interactive elements**

| Priority | Element | Enabled precondition | Repeat behaviour | Destructive? |
|---|---|---|---|---|
| Primary | Mic (capture) | Permission granted or promptable; online | Per gesture mode; taps during Transcribing ignored | No |
| Secondary | Example chip | Always | Replaces transcript field content; 2nd tap of same chip is a no-op | Overwrites typed text → chip tap while field non-empty asks inline: "Replace what you wrote?" [Replace / Keep] |
| Secondary | Edit transcript | Capture complete or chip tapped | Free edit | No |
| Secondary | "Say it again" | Transcript exists | Restarts capture; prior transcript retained until new capture completes | No (prior text recoverable until overwrite completes) |
| Primary | Confirm | Transcript non-empty ∧ no E-16 block | Disabled on first tap (single navigation) | No |
| Tertiary | "Type instead" | Always | First tap wins | No |
| Tertiary | Language pill | Always | First tap wins → S1(c) | No |

**Validation (transcript field).** Type: free text, any script; code-mixed (Hinglish) preserved as spoken, never force-normalised. Min: 1 non-whitespace character (gates Confirm). Max: 500 characters, soft counter appears at 400. Real-ID guard (P6/E-16): if content matches Aadhaar (12 contiguous digits), PAN (`AAAAA9999A`), or 16-digit card pattern, Confirm disables and E-16 shows inline; fires on input, cleared when pattern removed. Validation fires on change (Confirm gating) — never blocks typing.

**Back navigation.** Back → S1. Captured text is retained in session (N2) and restored if the user returns.

**Edge cases.** Silence > 3 s after speech began → auto-stop. Low-confidence transcript → soft note above field: "Did we hear this right? You can fix it." (editing, not re-recording, is the recovery path). Permission primer on first mic tap: sheet "We use the mic only to hear your question. Nothing is recorded after." → browser prompt (this is decision D2, an in-screen branch). Entry (b): pre-filled text is treated as a completed capture (Default post-capture state).

---

## S2b — Problem Capture (Text Fallback)

**Purpose.** Full parity with S2 for users who cannot or will not use voice. Never second-class.

**Entry conditions.** (a) S1 "Type instead". (b) S2 fallback routes (E-04×2, E-05, O-01, "Type instead") — any captured text pre-fills the field. (c) S3 Back past Q1 with `input_mode = text`.

**Exit conditions.** Submit → S3 (Q1). "Speak instead" → S2, text preserved and pre-filled.

**Layout & component inventory.** Same headline and 3 example chips as S2. Multiline text field: min 3 visible rows, ≥ 18 px font. Soft guidance line under field: "A sentence or two is enough." Persistent "Speak instead" affordance (hidden while offline, replaced by O-01 chip). Submit CTA: "That's my situation". Arrival note (entry b only, one render): E-05 route → "Typing works just as well."; O-01 route → offline chip.

**Core states**

| State | Trigger | Behaviour | Copy | Exit |
|---|---|---|---|---|
| Default | Entry | Field focused on entry (a); cursor at text end on (b)/(c) | As inventory | Submit → S3 |
| Loading | None required — no async operation exists on this screen; autosave is silent | — | — | — |
| Empty | Field empty at submit | Inline error under field (E-08), focus retained, no modal. Submit stays enabled (error-on-submit pattern, per original) | E-08 | User types |
| Error | E-16 real-ID pattern | Submit disables; inline E-16 under field; clears when pattern removed | E-16 | Pattern removed |
| Disabled | Submit while E-16 active | Submit disabled with visible reason (the E-16 message is the reason) | E-16 | Pattern removed |

**Interactive elements.** Primary: Submit — enabled unless E-16; disabled on first tap (single navigation). Secondary: example chips — same replace-confirm rule as S2. Tertiary: "Speak instead" — first tap wins. No destructive actions.

**Validation.** Non-empty is the only submit gate (short input is handled by the Socratic loop, not a validator; no minimum length). Max 500 chars, counter at 400. Any script accepted, including scripts other than the selected locale — accept, do not warn. E-16 guard identical to S2, fires on input. Autosave to session on blur and every 5 s.

**Back navigation.** Back → originating screen (S1 or S2), draft retained.

**Edge cases.** Entry (c) restores the exact submitted text. Offline: fully functional (capture is local); the S3 submit will engage S3's E-03 path if the model is unreachable.

---

## S3 — Socratic Clarification Loop

**Purpose.** Raise intent confidence from free text to a state-scoped, precondition-aware journey in 3–5 plain questions. The differentiating screen.

**Entry conditions.** (a) S2/S2b submit → Q1. (b) S4 chip edit → the specific question, in **return-to-S4 mode**. (c) S4 "Something's wrong" → Q1, all answers retained and pre-selected.

**Exit conditions (the exit machine — authoritative, total).** Evaluated after every recorded answer, where `n` = questions asked:

| Condition | Destination |
|---|---|
| `conf ≥ 0.8` (any n) | S4 |
| `conf < 0.8 ∧ n < 5` | Next question (highest information gain from pool) |
| `n = 5 ∧ 0.5 ≤ conf < 0.8` | S4, widest-safe journey; `unknown`-derived tasks flagged "may not apply" |
| `n = 5 ∧ conf < 0.5` | S3e |

Additional exits: E-03 terminal option → S3e. Back past Q1 → S2/S2b per `input_mode`. **Return-to-S4 mode** bypasses the machine entirely: answer recorded → recompute → S4 (deterministic; confidence is not re-gated).

**Layout & component inventory**

| Component | Spec |
|---|---|
| Progress indicator | "Question {n} of {expected}", top of card; `expected` may shrink on early exit, never grows past 5 |
| Question text | ≤ 15 words, large, plain register; auto-read-aloud in voice mode |
| Speaker icon | Replays question audio (both modes) |
| Answer options | 2–4 full-width stacked buttons, min 56 px height, 12 px gap, icon + label |
| "I'm not sure" | Always last, visually distinct, never disabled-looking. **Exception: Q2 (state) omits it** — see edge cases |
| Back | Top-left; previous question, prior answer pre-selected |
| Voice answer mic | Present on every question; disabled offline (F4) |

**Question pool (representative; selection is dynamic):** Q1 "Has the death been registered yet?" (Yes / No / I'm not sure). Q2 "Which state did they live in?" — **two tiles: Assam, Maharashtra** (Q-A) + "My state isn't here"; caption beneath: "More states coming — for now we cover Assam and Maharashtra." Q3 work status (3 tiles + unsure). Q4 assets (multi-select + None + unsure). Q5 relationship (4 + unsure).

**Core states**

| State | Trigger | Behaviour | Copy | Exit |
|---|---|---|---|---|
| Default | Question rendered | Full card; answer taps animate to next view | Per pool | Exit machine |
| Loading | Computing next question ("Thinking") | Inline 3-dot indicator in card; ≤ 800 ms perceived; likely next question pre-fetched during answer animation; **all inputs disabled** | None | Question renders, or E-03 |
| Empty | Cannot occur — the pool guarantees a next question whenever the machine demands one; a model response with no question while `conf < 0.8 ∧ n < 5` is treated as E-03 | — | — | — |
| Error | Model call fails or exceeds 6 s (E-03) | Attempt 1 fails → silent retry (attempt 2, same 6 s timeout). Fails → retry card replaces the indicator: message + "Try again" + Back retained. After 2 failed visible retries, card adds "Browse common situations instead" → S3e | E-03 | Success → next question; tertiary → S3e |
| Disabled | Thinking, or answer animation in flight, or voice-cap reached | Answer buttons and mic non-interactive during Thinking/animation; mic disabled for the question after E-09 cap; offline → mic disabled, tap answers fully functional | O-01 chip when offline | State resolves |

**Interactive elements**

| Priority | Element | Precondition | Repeat behaviour | Destructive? |
|---|---|---|---|---|
| Primary | Answer button | Not Thinking | First tap records; further taps ignored during animation | No |
| Primary | Voice answer | Online ∧ under E-09 cap | Utterance maps to nearest option; ambiguous → one "Did you mean…" re-render (options re-shown with prompt); a second ambiguous result → E-09, tap-only for this question | No |
| Secondary | "I'm not sure" | Present (all except Q2) | Records `unknown`; widens journey; flagged tasks get "may not apply" | No |
| Tertiary | Back | n ≥ 1 | Previous question, answer pre-selected; from Q1 → S2/S2b | No |
| Tertiary | Speaker | Audio loaded | Restarts audio | No |

**Validation.** Tap answers need none. Multi-select (Q4): "None" is exclusive — selecting it clears others and vice versa; submit control "Next" enabled when ≥ 1 selection.

**Back navigation.** Each question is a distinct history entry (P2-2); browser back = in-app Back exactly. Back never discards the current question's draft selection (N2).

**Edge cases.** *Q2 exception:* "I'm not sure" is deliberately absent — a journey cannot be state-scoped without a state; the honesty exit is explicit instead: "My state isn't here" opens an inline sheet — "We only cover Assam and Maharashtra right now. We can still show you who to contact." Buttons: "Where to get help" → S10 · "Go back". *All answers unsure:* still produce a journey — widest safe superset, clearly labelled; never return nothing. *Session abandoned mid-loop:* resume at the exact question, prior answers intact (P2). *Return-to-S4 mode:* if the edited answer makes a previously recorded answer's question inapplicable, that answer is archived and omitted from the S4 summary (deterministic; no re-interrogation). *Chip-edit and "Something's wrong" entries* pre-select the recorded answer on every revisited question.

---

## S3e — Not Understood / Human Fallback

**Purpose.** Fail with dignity; leave the user better off than a blank search box.

**Entry conditions.** (a) Exit machine: `n = 5 ∧ conf < 0.5`. (b) E-03 terminal option.

**Exit conditions.** "Start over with different words" → S2/S2b per `input_mode` (field cleared, prior text recoverable via one "Restore what I said before" link, one render). "Browse common situations" → journey selected → S5 (manual-journey mode). "Talk to a person" → S10. Back → last S3 question.

**Layout & component inventory.** Headline: "We couldn't work out exactly what you need." Sub-line: "Here's what we heard:" + the user's transcript, displayed verbatim in a quiet card. No blame language anywhere; "invalid input" is banned. Three exits in fixed order: (1) "Start over with different words", (2) "Browse common situations", (3) "Talk to a person". Browse section (expanded inline on tap of exit 2): 6 journey cards.

**Browse list (the 6 pre-built journeys).** Card anatomy: situation title · "{n} steps · {m} departments" · CTA "See the steps".

| # | Situation title | Journey composition |
|---|---|---|
| B1 | "My husband or wife passed away — they worked at a company" | T1, T2, T4, T5, T7, T8, T9 |
| B2 | "My husband or wife passed away — they were retired" | T1, T2, T5, T7, T8, T9 |
| B3 | "My parent passed away — they owned land or a house" | T1, T2, T5, T6, T7, T8, T9 |
| B4 | "My parent passed away — they worked for themselves" | T1, T2, T5, T7, T8, T9 |
| B5 | "Someone in my family passed away — I just need the death certificate" | T1 |
| B6 | "I'm not sure — show me everything" | T1–T9 (widest-safe; conditional tasks flagged "may not apply") |

Manual-journey mode: S5 renders with a persistent banner replacing S4 confirmation — "Based on a common situation — check it fits you" + "Change" → S3e. In this mode, S5's "Change my answers" routes to S3e, not S4 (no confirmed answers exist).

**Core states**

| State | Trigger | Behaviour | Copy | Exit |
|---|---|---|---|---|
| Default | Entry | Headline, transcript, three exits; browse collapsed | As above | Per exits |
| Loading | None required — journeys B1–B6 are bundled static content | — | — | — |
| Empty | Cannot occur — transcript is guaranteed non-empty by S2/S2b submit gates; browse list is bundled | — | — | — |
| Error | None — no network dependency on this screen | — | — | — |
| Disabled | Navigation tap registered | All controls disabled during transition | None | Navigation completes |

**Interactive elements.** All three exits: first tap wins. Browse card tap → S5 immediately (no confirm step; the S5 banner is the check). No destructive actions.

**Validation.** No inputs.

**Back navigation.** Back → last S3 question, answers intact.

**Edge cases.** Reached via E-03 (model down): browse and S10 remain fully functional (static); "Start over" is available but will re-encounter E-03 if the model is still down — acceptable, the retry machine re-engages.

---

## S4 — Confirm Understanding

**Purpose.** One-glance verification of the system's understanding before effort is invested; converts opaque inference into a reviewable statement.

**Entry conditions.** (a) S3 exit machine → S4 (either S4 row). (b) Return from chip edit. (c) S5 "Change my answers". (d) S9 "Change my answers". Precondition: ≥ 1 recorded Socratic answer (manual journeys never reach S4).

**Exit conditions.** "Yes, show me what to do" → S5. Chip tap → S3 (that question, return-to-S4 mode) → S4. "Something's wrong" → S3 Q1, answers retained. Back → last answered S3 question.

**Layout & component inventory.** Summary statement: first person, plain, ≤ 40 words, generated **from recorded answers, not re-inferred from the transcript** (edits are deterministic). Example: "Your father passed away in Assam last month. He worked at a company. There is a bank account and a house in his name. You are his son." Read-aloud: auto-plays in voice mode; speaker icon in both modes. Editable chips: one per recorded fact; `unknown` answers render as lighter chips: "not sure — we've included this just in case." Consequence preview: "This means {n} things to do, across {m} offices." On entries (b)–(d) after a recompute that changed the count, an "Updated" pill and delta: "This now means 8 things to do (was 7)." Primary CTA "Yes, show me what to do"; secondary "Something's wrong".

**Core states**

| State | Trigger | Behaviour | Copy | Exit |
|---|---|---|---|---|
| Default | Summary rendered | Full layout | As inventory | Per exits |
| Loading | Summary generation in flight | Skeleton summary, max 2 s; chips and CTAs disabled | None | Renders, or falls to Error fallback |
| Empty | Cannot occur — entry precondition guarantees ≥ 1 answer; all-unsure yields a valid widest-safe summary ("You told us you're not sure about most of this, so we've included everything that might apply.") | — | — | — |
| Error | Generation fails or exceeds 2 s (E-12) | Silently render the rule-based summary: a deterministic template composed from recorded answers, one clause per fact. No user-facing error; E-12 is telemetry-only | None | Default |
| Disabled | Loading, or navigation tap registered | CTAs and chips non-interactive | None | State resolves |

**Interactive elements.** Primary CTA: enabled when summary rendered; disabled on first tap. Chips: enabled when rendered; tap → S3 return-to-S4 mode; not destructive (edits recompute, never discard — P5). "Something's wrong": not destructive (answers retained). Speaker: restarts audio.

**Validation.** No inputs.

**Back navigation.** Back → last answered S3 question, answer pre-selected (each S3 question is its own history entry, so back walks the questions).

**Edge cases.** Chip edit that archives a dependent answer (S3 rule) → the summary omits the archived fact and the consequence preview recomputes; the "Updated" delta line covers the change. Entry (c)/(d) with completed tasks: edits here trigger the recompute-diff treatment on return to S5/S9 (P1-4; specified in S5 and D4 §4.4).

---

## S5 — Journey Map

**Purpose.** The hero screen: whole path at once, order understood, exactly one next thing.

**Entry conditions.** (a) S4 confirm. (b) S3e browse selection (manual-journey mode). (c) S9 "Full journey view". (d) S6 Back or "I've already done this" (recomputed). (e) S7 return. (f) Deep-link fallback with E-21 notice.

**Exit conditions.** Unlocked task card → S6. Document-reuse banner → S7. "Change my answers" → S4 (or S3e in manual-journey mode). "Save this list" → SH1. Locked-card expander "Go to the task that unlocks this" → S6 (the unlocking task). Share/print → plain checklist via OS share sheet. Back → S4 (or S3e in manual-journey mode).

**Layout & component inventory**

| Component | Spec |
|---|---|
| Header | "{n} things to do" + progress ring "{done} of {n} done" |
| Manual-journey banner (mode b) | "Based on a common situation — check it fits you" + "Change" → S3e |
| Recompute diff banner (conditional) | After any answer-edit recompute that changed the graph: "{a} steps added, {r} removed · See what changed". Expander lists each change: "+ {task} (added because {answer})" / "– {task} (moved to 'No longer needed')". Dismissible; re-shown only on next change |
| "Do this first" card | Visually elevated, larger, top; **exactly one at any time** |
| Task cards | Vertical timeline on a connecting rail. Each: plain-language name, department, "why this first / why this is locked", estimated days, fee, status chip |
| Status chips | `Do now` / `Locked — needs {document}` / `In progress` / `Done` / `May not apply to you`. `In progress` ⇔ a saved S8 draft exists for the task (P2-3). Colour + text label + shape, never colour alone (A6) |
| Lock reasoning | Every locked card states its unlock condition on the card face — a lock without a stated reason is a defect |
| "No longer needed" section (conditional) | Collapsed section at list end holding archived completed tasks removed by a recompute; each card read-only with note "Completed earlier — no longer part of your journey" |
| Document reuse banner | Persistent: "One document unlocks 8 of these" → S7 |
| Provenance footer per card | "Source: {official link} · Last verified: {date} · State: {state}" (C4) |
| Honesty chip | "Prototype — mock data", persistent (C3) |
| Save affordance | "Save this list" → SH1 |
| Conditional-task expander | "May not apply" cards carry "Does this apply to me?" expander containing that task's one clarifying question; answering resolves the flag in place and recomputes |

**Core states**

| State | Trigger | Behaviour | Copy | Exit |
|---|---|---|---|---|
| Default | Journey computed and pack loaded | Full list; exactly one `Do now`; completion recompute promotes the next task with an explicit visible transition (unlock animation) so causality is seen | As inventory | Per exits |
| Loading | First render of journey pack | Skeleton cards, correct count if known; pack cached on first successful render (F3) | None | Default, or Error |
| Empty | Cannot occur — S3 never returns nothing (minimum journey is T1-only, e.g. browse B5); manual journeys are predefined | — | — | — |
| Error | Journey pack fetch fails and no cache exists (E-13) | Retry card in place of the list; if a cached pack exists, serve it with a stale note instead of the error | E-13 | Retry → Loading |
| Disabled | Offline (O-01) | Serve cached pack; submission entry points (unlocked cards whose next step is S8) show an explanatory chip "Practice submission needs a connection" and route to S6, which renders its Disabled (offline) state — never a silent failure; S6/S7 remain readable (F3) | O-01 | Connectivity returns |

**Interactive elements**

| Priority | Element | Precondition | Repeat behaviour | Destructive? |
|---|---|---|---|---|
| Primary | Unlocked task card | Task unlocked | First tap wins → S6 | No |
| Secondary | Locked task card | Always | Expands in place (explains dependency + "Go to the task that unlocks this"); second tap collapses | No |
| Secondary | Document banner | Always | First tap wins → S7 | No |
| Secondary | Conditional-task expander | "May not apply" chip present | Toggle | No |
| Tertiary | "Change my answers" | Always | First tap wins → S4 / S3e | No (edits recompute, never discard — P5) |
| Tertiary | Share / print | Always | Regenerates checklist | No |
| Tertiary | "Save this list" | Always | Opens SH1; re-tap while open is a no-op | No |

**Validation.** No direct inputs (the conditional-task clarifying question follows S3 answer-button rules).

**Back navigation.** Back → S4; in manual-journey mode → S3e. Never journey-reset (N1).

**Edge cases.** Long journey (> 8 tasks) → phase groups ("First", "After you have the certificate", "Later"), first phase expanded. All tasks complete → completion state: summary of what was accomplished + any remaining offline steps + share/print emphasised. Stale content (`last_verified` older than freshness threshold) → amber inline note on the card, card never hidden. Recompute where a completed task leaves the graph → archived to "No longer needed", never deleted (P5, P1-4). Q1 edited No→Yes → T1 renders pre-completed (`Done` chip, note "You told us this is already registered") + certificate add-prompt fires per P1-3 on first render. E-21 entry → notice banner "That step isn't part of your journey", auto-dismisses in 6 s.

---

## SH1 — Save & Resume Sheet (shared modal; hosts: S5, S9)

**Purpose.** Mock-identity capture for save/resume and cross-device restore (Q-B). Not a screen; a bottom sheet over its host. Declared in D1; not an S-numbered screen because it never owns navigation state.

**Entry conditions.** S5 "Save this list"; S9 sign-in affordance (device-2 restore).

**Exit conditions.** Success → S9 (from S5) or S9 refreshed (from S9). Dismiss/cancel → host screen, nothing lost.

**Layout & component inventory.** Title "Save your progress". Honesty line (persistent, step 1 and 2): "This is a practice login. No SMS is sent." Step 1: phone field + helper "Choose any 10-digit number you'll remember — it's only used as a save key." + CTA "Continue". Step 2: OTP field + helper "Enter 0000 — this is a practice code." + CTA "Save" + "Send the code again" link. Close affordance (X) + scrim tap both dismiss.

**Core states**

| State | Trigger | Behaviour | Copy | Exit |
|---|---|---|---|---|
| Default | Sheet opened | Step 1; field focused | As inventory | Continue → step 2 |
| Loading | "Save" tapped (journey + answers sync to backend; wallet never syncs — P3) | Determinate spinner on CTA; fields disabled | "Saving…" | Success → S9; failure → Error |
| Empty | CTA tapped with field empty | Inline error under field (E-10 empty variant), focus retained | E-10 | User types |
| Error | Invalid number (E-10); wrong code (E-11); sync failure (E-19) | E-10/E-11 inline under field, field retained. E-19: sheet shows local-fallback card — saved on device, server unreachable, "Try again" | Per D5 | Corrected input, or E-19 retry / dismiss (local save stands) |
| Disabled | Loading | All controls disabled — non-cancellable window < 3 s | None | Resolves |

**Interactive elements.** "Continue"/"Save": disabled on first tap (idempotent; exactly one save per confirmation). "Send the code again": re-displays helper as a toast — "Practice code: 0000" (nothing is actually sent; honesty preserved). Dismiss: not destructive — local journey state is already persisted (P2); dismissal only skips server sync.

**Validation.** Phone: exactly 10 digits, digits only, fires on Continue; E-10 otherwise. Real numbers are never verified or messaged; the value is a save key only (C6 defence: users are explicitly invited to invent one). OTP: exactly "0000", fires on Save; anything else → E-11. Both fields: numeric keypad input mode.

**Back navigation.** Hardware/browser back while sheet open = dismiss (sheet is not a history entry; the host screen is).

**Edge cases.** Same number saved twice from different devices → last-write-wins on the server, per D4 §4.3/§4.5; device-2 restore behaviour is specified in S9. Offline when sheet opened → step flow works; Save short-circuits to the E-19 local-fallback card without a network attempt.
