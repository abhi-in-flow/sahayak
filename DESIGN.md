# D10 — Design Direction (Visual & Interaction Language)

**Status.** Draft for review. **Date.** 2026-08-28.

**Numbering note.** D8 (assistive-tech audit method) and D9 (assumptions register) are referenced by the delivered documents but absent from this repository (BUG-001). This document takes **D10** rather than D8 so those two slots stay reserved for their known owners.

**Authority note.** D3 is authoritative on layout, states, copy and navigation. D5 is authoritative on every error string. D6 is authoritative on focus, announcement and locale behaviour. **This document is subordinate to all three.** It supplies only what they leave open: the visual and interaction language that renders them. Where this document appears to contradict D3/D5/D6, D3/D5/D6 win and the contradiction is a defect in this document.

**On em-dashes.** Section headings here use the long-dash separator to match the house style of D1 through D7. Product copy specified by this document uses none: Devanagari and the other Indic scripts on the expansion path do not carry the em-dash as a separator convention, and the character is a known reading obstacle for the low-literacy audience this product serves. See §10.4 and BUG-004.

---

## 10.0 Why this document exists

Sahayak's specification set fixes almost everything about behaviour and almost nothing about appearance. That gap is not a licence for taste. Every visual decision below is derived from a constraint already written down somewhere in D3 to D7, and each one names its source. Where no constraint exists, the decision is marked `OPEN` and routed to D9.

Three properties of this product make it unlike a normal design brief and drive everything that follows:

1. **It must not be mistaken for a government service.** S1 bans the emblem, the tricolour, the Ashoka motif and `.gov.in` visual language outright. The disclosure banner is non-dismissible on every screen (C1). This is the single hardest constraint and it removes most of the palette an Indian civic product would reach for by default.
2. **It must be honest about being a prototype** at the exact moments a user could mistake it for real: the mock submission, the practice acknowledgement number, the practice OTP, the on-device wallet (C3, C6, C7).
3. **Its users are under stress, often low-literacy, often on low-end Android over 3G, in a language that is not English.** Bereavement is the seeded scenario. Nothing here may be clever at the cost of being legible.

---

## 10.1 Principles

| # | Principle | Derived from | What it forbids |
|---|---|---|---|
| DP-1 | **Legibility outranks identity.** When a brand choice and a reading outcome conflict, reading wins without discussion. | A2, A4, D6 §6.3 | Tight leading, low-contrast "elegant" greys, decorative type in UI roles |
| DP-2 | **Never resemble the state.** The product is visually distinct from Indian government digital services at a glance, before any text is read. | S1 wordmark rule, C1 | Saffron/white/green as a scheme, government navy, emblems, seals, badge shapes |
| DP-3 | **Honesty is a visual system, not a disclaimer.** Mocked surfaces are marked by a treatment that survives greyscale, printing and colour-blindness. | C3, C6, C7, S8, S11 | Colour-only "practice" marking, small-print disclaimers, dismissible honesty chips |
| DP-4 | **State is never carried by colour.** Every status is legible with colour removed entirely. | A6 | Colour-coded dots, red/green pairs, hue-only chips |
| DP-5 | **Motion explains causality or it does not ship.** The only motion that earns its place shows the user that their action caused a consequence. | S5 unlock transition, D6 §6.2 | Decorative parallax, entrance animation, infinite loops, scroll hijack |
| DP-6 | **The layout is already specified.** 360 px baseline, vertical rail, stacked full-width answers, one or two fields per view. | D3 throughout | Redesigning D3's structure under cover of "design direction" |

**On the taste dials.** Read descriptively, this product sits at `DESIGN_VARIANCE 3 / MOTION_INTENSITY 2 / VISUAL_DENSITY 5`. Those numbers *describe what D3 already fixed*; they are not an authority layered on top of D3. They are recorded only so a future contributor does not "improve" the asymmetry or motion budget by reflex.

---

## 10.2 Anti-requirements

Two failure modes are worse than an ugly screen. Both are checked at review.

**A. Reads as government.** Banned outright: the Ashoka Lion Capital or any national emblem; the tricolour as a colour scheme; saffron (`#FF9933` and neighbours) as a primary, accent or CTA colour; government navy (`#003366` and neighbours) as a primary; seal, medallion, scroll or certificate-border motifs; `Sarkar` / `Government of` / `Ministry of` typographic framing.

> **Collision to resolve.** The global agent instruction set mandates an amber brand primary (`--amber-500`, `#FF8C01`). That value sits inside the saffron band this document bans under DP-2. DECISION-002 already ruled those instructions belong to a different codebase; DECISION-005 records the specific conflict so it cannot be reintroduced by an agent following the global file literally.

**B. Reads as an AI-generated template.** Banned: purple/violet gradient accents; glassmorphism; three equal feature cards; hero mesh gradients; decorative status dots; section-number eyebrows; fake-precise metrics; placeholder-as-label; generic stock avatars; `Acme`-class invented names in any seeded content. Seeded office names, helpline numbers and addresses are real, sourced and date-stamped per C4, or they are absent.

---

## 10.3 Colour

One accent. Cool neutrals with a slight green cast so the accent sits in the same family. Every ratio below is computed, not estimated; the method is in §10.13.

### Tokens

| Token | Hex | Role |
|---|---|---|
| `--page` | `#F2F6F5` | Screen ground |
| `--surface` | `#FFFFFF` | Cards, sheets, fields |
| `--sunken` | `#E6EDEC` | Quiet cards: S3e transcript, read-only, archived |
| `--ink-900` | `#0E1B1C` | Primary text, focus ring |
| `--ink-700` | `#39504F` | Secondary text, body |
| `--ink-500` | `#4F6564` | Helper text, provenance line, captions |
| `--line-600` | `#6F8382` | **Component** boundaries: field borders, button outlines, chip borders |
| `--line-300` | `#D3DEDD` | **Decorative** rules only: the S5 timeline rail, list separators |
| `--accent-800` | `#06403F` | Accent text on tint, chip borders |
| `--accent-700` | `#0A5654` | Primary CTA fill, `Do now`, active states |
| `--accent-100` | `#DDECEA` | Accent tint backgrounds |
| `--done-700` | `#1D6234` | `Done` |
| `--done-100` | `#DFEEE2` | `Done` tint |
| `--warn-800` | `#7A4E06` | Stale-provenance note (S5), non-blocking warnings |
| `--warn-100` | `#FAEEDA` | Warning tint |
| `--err-700` | `#9E2222` | Blocking errors: E-16, E-10, E-11 |
| `--err-100` | `#F9E3E1` | Error tint |

**Why deep teal.** It is the nearest thing to a civic-serious accent that is unmistakably neither tricolour nor government navy (DP-2), holds white text above 8:1 at `--accent-700`, and stays distinguishable from both the success green and the warning amber once desaturated.

**Why the warning amber is dark and browned.** `--warn-800` is the stale-`last_verified` note S5 requires. It had to read as a warning semantic without entering the saffron band DP-2 bans. Darkening and desaturating achieves both; a bright amber would not.

### Computed ratios

| Pair | Ratio | Floor | Result |
|---|---|---|---|
| `--ink-900` on `--page` | 16.17 | 4.5 | AAA |
| `--ink-900` on `--surface` | 17.61 | 4.5 | AAA |
| `--ink-700` on `--page` | 7.92 | 4.5 | AAA |
| `--ink-700` on `--surface` | 8.63 | 4.5 | AAA |
| `--ink-500` on `--page` | 5.71 | 4.5 | AA |
| `--ink-500` on `--surface` | 6.22 | 4.5 | AA |
| `--ink-500` on `--sunken` | 5.24 | 4.5 | AA |
| white on `--accent-700` | 8.50 | 4.5 | AAA |
| white on `--accent-800` | 11.58 | 4.5 | AAA |
| white on `--done-700` | 7.37 | 4.5 | AAA |
| white on `--warn-800` | 7.19 | 4.5 | AAA |
| white on `--err-700` | 7.76 | 4.5 | AAA |
| `--accent-800` on `--accent-100` | 9.52 | 4.5 | AAA |
| `--done-700` on `--done-100` | 6.13 | 4.5 | AA |
| `--warn-800` on `--warn-100` | 6.27 | 4.5 | AA |
| `--err-700` on `--err-100` | 6.32 | 4.5 | AA |
| `--ink-700` on `--sunken` | 7.27 | 4.5 | AAA |
| `--line-600` vs `--surface` | 4.00 | 3.0 | Pass |
| `--line-600` vs `--page` | 3.68 | 3.0 | Pass |
| `--line-600` vs `--sunken` | 3.37 | 3.0 | Pass |

`--line-300` is **decorative only** and exempt from the 3:1 non-text floor because it never delineates an interactive component. Using it on a field border, button or chip is a defect. This is the distinction A4 does not itself draw, and the most likely place for an implementer to introduce an accessibility regression.

### Focus ring

`--ink-900`, 3 px, with a **2 px `--surface` offset gap**. The ring alone fails 3:1 against every dark fill in the palette (`--accent-700` 2.07, `--done-700` 2.39, `--warn-800` 2.45, `--err-700` 2.27). The offset gap is what does the separating work there, and it clears comfortably in every case (7.19 to 11.58). The gap is therefore **not optional styling**; removing it breaks A8 on exactly the controls that matter most, the primary CTAs.

---

## 10.4 Status system (A6)

A6 requires colour plus text plus shape. §10.13 shows why: the relative luminances of the five status colours cluster between 0.041 and 0.096, so **once colour is removed they are not separable at all**. The text and the shape carry the meaning; the colour is a convenience for users who can use it.

Every status chip is: **tint background + dark text + 1 px border in the dark tone + a leading icon with a distinct silhouette.**

| Status | Tint | Text & border | Icon silhouette | Border |
|---|---|---|---|---|
| `Do now` | `--accent-100` | `--accent-800` | Filled arrow, right | Solid |
| `Locked - needs {document}` | `--sunken` | `--ink-700` | Padlock, closed | Solid |
| `In progress` | `--surface` | `--ink-700` | Half-filled circle | Solid |
| `Done` | `--done-100` | `--done-700` | Check in circle | Solid |
| `May not apply to you` | `--surface` | `--ink-500` | Question in circle | **Dashed** |
| Archived (`No longer needed`) | `--sunken` | `--ink-500` | Archive box | Dashed, 60% opacity |

The dashed border on the two uncertain states is deliberate and is the shape channel A6 demands: uncertainty stays legible with the screen in greyscale and on the printed S10 checklist.

**Tint-on-ground collision.** Two chips in the table above use `--sunken` as their tint, and S5's collapsed "No longer needed" section is itself a `--sunken` surface. A chip whose tint equals its container ground is invisible except for its border, which reduces a three-channel signal to one. **Rule: a chip rendered on a `--sunken` container swaps its tint to `--surface` and keeps its text colour, border and icon unchanged.** This affects the `Locked` and archived chips only, and only inside the archived section. Logged as BUG-006.

### Chips are not fixed-height pills

Measured against the 360 px baseline with D6 §6.3's +40% expansion allowance:

| Chip | English @14 px | Hindi, +40% | Fits 274 px? |
|---|---|---|---|
| `Do now` | ~44 px | ~65 px | Yes |
| `In progress` | ~80 px | ~122 px | Yes |
| `Done` | ~29 px | ~40 px | Yes |
| `May not apply to you` | ~146 px | ~227 px | Yes |
| `Locked - needs Death Certificate` | ~234 px | **~356 px** | **No** |
| `Locked - needs Legal Heir Certificate` | ~270 px | **~413 px** | **No** |

Budget: 360 px viewport, less 16 px screen gutters, less 16 px card padding, less 10 px chip padding and 1 px border, each side = **274 px** for glyphs. Estimates assume 0.52 em average advance for Latin and 0.58 em for Devanagari; they are estimates and must be re-measured against the shipped face, but the conclusion holds with a wide margin. At 200% zoom (A2) every chip except `Done` wraps.

**Therefore:**

- Status chips are **wrapping blocks with a minimum height, never fixed-height pills.**
- The status word (`Locked`) and the interpolated `{document}` are separate spans. The status word never wraps and never truncates, per D6 §6.3. The document name wraps to a second and third line.
- The icon is top-aligned to the first line, not vertically centred to the block.
- No `text-overflow: ellipsis` anywhere in the chip. Ever.

---

## 10.5 Typography

### Families

| Role | Family | Fallback stack |
|---|---|---|
| UI, all Indic scripts + Latin | **Anek** (Anek Latin, Anek Devanagari) | `"Anek Latin", "Anek Devanagari", "Noto Sans", "Noto Sans Devanagari", system-ui, sans-serif` |
| Urdu / Nastaliq (future RTL) | **Noto Nastaliq Urdu** | `"Noto Nastaliq Urdu", "Noto Naskh Arabic", serif` |
| Numerals in mock references, fees, dates | Anek, tabular figures | as UI stack |

**Why Anek.** It is a single variable superfamily designed simultaneously across **nine Indian scripts plus Latin** (Bangla, Devanagari, Gujarati, Gurmukhi, Kannada, Latin, Malayalam, Odia, Tamil, Telugu) by Ek Type, with weight and width axes. That coverage is exactly Sahayak's expansion path: adding Tamil or Bangla becomes a content and translation task, not a type redesign. A superfamily also means the two shipped languages share vertical metrics, so the S1 language tiles and every bilingual surface align without per-locale overrides. Variable-font delivery matters on the 3G / low-end-Android target (S1 Loading: tiles tappable within 1.5 s).

No serif anywhere. Nothing in this brief is editorial, and Devanagari has no equivalent serif convention to pair with, so a Latin serif would break script harmony for no gain.

### Nastaliq is a separate metric system, not a style toggle

D6 §6.4 names Urdu as the RTL test case, so this must be settled before it is needed. Nastaliq is written on a steep descending baseline; its glyphs need roughly **150% of the vertical space** of a Naskh or Latin face, and Noto Nastaliq Urdu specifically has documented open issues about excessive default line height and glyph collision at tight leading.

**Rule.** Line height is a per-script token, never a global constant:

| Script class | Body line height | Heading line height |
|---|---|---|
| Latin, Devanagari (and other Anek scripts) | 1.55 | 1.30 |
| Nastaliq | **2.20** | **1.90** |

Any component with a fixed height, a `line-clamp`, or a vertically centred single line must be re-verified when an RTL locale is enabled. "We will use the same scale" is not an acceptable answer for Nastaliq.

### Scale

Minimum body 16 px and minimum primary action 18 px are floors set by D6 §6.3, not defaults.

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `display` | 28 / 1.30 | 600 | S1 headline, S3e headline |
| `question` | 24 / 1.35 | 600 | S3 question text (max 15 words, per D3) |
| `title` | 20 / 1.40 | 600 | Screen headings, S6 task title |
| `body-lg` | 18 / 1.55 | 400 | S2b field text, primary CTA labels |
| `body` | 16 / 1.55 | 400 | Default body. Floor. |
| `label` | 16 / 1.40 | 500 | Field labels. Never smaller than body. |
| `meta` | 14 / 1.50 | 400 | Provenance footer, chip text, helper text |

`meta` at 14 px is the smallest type in the product and is confined to `--ink-500` on light grounds (5.24 to 6.22, all AA). Nothing renders below 14 px, including the disclosure banner.

### Expansion and scaling

All of the following are consequences of A2 and D6 §6.3 and are non-negotiable at review:

- No fixed heights on any element containing text.
- No `text-overflow: ellipsis` on any status word, task name, or answer option.
- Answer buttons (min 56 px) grow vertically; they never shrink type to fit.
- Chips wrap to two lines before any other strategy is considered (§10.4).
- Layouts are verified at 360 px and again at 200% zoom, in both shipped languages, before a language tile is enabled.

---

## 10.6 Space and targets

4 px base unit. At the 360 px baseline: 16 px screen gutters, 16 px card padding, 12 px between stacked answer options (per D3), 24 px between sections.

| Element | Minimum | Source |
|---|---|---|
| Any touch target | 48 x 48 px | A3 |
| Primary CTA | 56 px height | A3 |
| S3 answer option | 56 px height, 12 px gap | D3 S3 |
| S1 language tile | 96 x 96 px, 16 px gap | D3 S1 |
| S2 mic button | 88 px diameter, always text-labelled | D3 S2 |
| Spacing between adjacent targets | 8 px | Prevents mis-taps at 48 px |

Corner radius, one scale, applied everywhere: **8 px** for fields, chips, buttons and small controls; **12 px** for cards and sheets; **0** for full-bleed banners so they read as system furniture rather than content. Nothing is pill-shaped, because §10.4 established that chips must wrap and a wrapping pill looks broken.

---

## 10.7 Motion

The budget is deliberately near-zero (DP-5). Four animations exist in the entire product. Each is listed with the causal question it answers, and each has a named non-motion equivalent, because at this budget every animation is an exception and an exception needs its fallback specified.

| # | Animation | Question it answers | Duration | Reduced-motion equivalent |
|---|---|---|---|---|
| M-1 | **Task unlock** (S5, S9 entry a) | "Why did that just change?" | 400 ms | See below |
| M-2 | S3 answer to next question | "Did my tap register?" | 200 ms cross-fade | Instant swap |
| M-3 | Skeleton shimmer | "Is it working or stuck?" | 1200 ms loop | Static skeleton, `aria-busy` unchanged |
| M-4 | SH1 sheet enter / exit | "Where did this come from, where did it go?" | 250 ms | Instant, focus trap unchanged |

Everything else is a state change with no transition. No parallax, no scroll-triggered reveals, no entrance animation, no hover physics, no marquees, no infinite loops other than M-3.

### M-1 is spec-mandated, so its fallback is specified

S5's Default state requires that completion "promotes the next task with an explicit visible transition (unlock animation) so causality is seen". Under `prefers-reduced-motion: reduce` the animation must not simply be deleted, because that would remove a behaviour D3 requires. The causality is instead carried by three non-motion channels that already exist in the specs and fire regardless of motion preference:

1. The status chip changes from `Locked - needs {document}` to `Do now`, with its icon and border changing per §10.4.
2. The promoted card moves into the elevated "Do this first" treatment, of which there is exactly one at any time (D3 S5).
3. The polite live-region string D6 §6.2 already mandates: `"{task} is now unlocked."`

Under reduced motion, add a **200 ms non-motion highlight hold** on the promoted card (a background tint from `--accent-100` back to `--surface`: a colour transition, not a transform) so a sighted user who has disabled motion still gets a temporal cue. Colour transitions are not motion under WCAG 2.3.3 and are safe for vestibular triggers.

All four animations use `transform` and `opacity` only. No animation of `top`, `left`, `width` or `height`.

---

## 10.8 Honesty surfaces

This is the part of the design system that is load-bearing for the product's ethics, and the part most likely to be quietly weakened later. There are four honesty surfaces at three distinct visual weights.

| Surface | Where | Weight | Treatment |
|---|---|---|---|
| Disclosure banner (C1) | Top of **every** screen, `role="note"`, non-dismissible | Persistent, quiet | Full-bleed `--sunken`, `--ink-700` at 14 px, 1 px `--line-600` bottom edge, radius 0 |
| Honesty chip "Prototype - mock data" (C3) | S5, persistent | Persistent, quiet | Standard chip, `--sunken` / `--ink-700` |
| Mock banner (S8) | Top of the mock submission flow | **Loud, unmissable** | Hatched treatment, below |
| Practice artefacts | `PRACTICE-AS-{6}` ack, `0000` OTP, sample documents | **Loud, unmissable** | Hatched treatment + monospace ack |

### The hatch, and why it is a pattern rather than a colour

Practice surfaces are marked with a **4 px diagonal hatch at 45 degrees, `--ink-900` at 8% opacity over `--warn-100`**, plus a 2 px solid `--warn-800` top edge, plus the literal words.

A pattern rather than a colour, for four reasons that all apply to this product specifically:

1. **It survives printing.** S10's printable checklist is called out in the specs as "the highest-value artefact for a low-literacy office visit". A colour-only practice marker vanishes on a monochrome printer at exactly the moment a user carries the page into a government office. That is the worst possible failure of C3.
2. **It survives greyscale and colour-blindness** without needing a second channel (DP-4).
3. **It cannot be mistaken for a status.** No other surface in the product is hatched, so the hatch means one thing only.
4. **It does not spend the accent.** The palette has one accent, and the practice marker must not compete with `Do now`.

The sample-document watermark ("SAMPLE - NOT A REAL DOCUMENT") uses the same hatch behind the same wording, so the wallet thumbnail and the mock banner read as one system.

**Rules.** No honesty surface is ever dismissible, collapsible, animated, or rendered below 14 px. No honesty surface is ever placed below the fold on the screen it governs. The mock banner is never `position: sticky` in a way that lets content scroll over it.

---

## 10.9 Component vocabulary

The recurring components across S1 to S11, with their token bindings. Each is specified to the point where two implementers would build the same thing, and no further.

| Component | Screens | Binding |
|---|---|---|
| Disclosure banner | All | §10.8 |
| Global footer link (to S11) | All | `--ink-500`, `meta`, last in tab order (D6 §6.1) |
| Primary CTA | Most | `--accent-700` fill, white label, `body-lg`, 56 px min, radius 8, focus ring per §10.3. Disabled on first tap everywhere (D3) |
| Secondary CTA | Most | `--surface` fill, `--accent-800` label, 1 px `--line-600` |
| Tertiary link | Most | `--accent-800`, underlined. The underline is not optional: it is the non-colour channel (DP-4) |
| Disabled control with a reason | S2, S2b, S8 | Never silently greyed. Reason text sits directly below in `--ink-700` (D3 S2 Empty ii) |
| Status chip | S5, S6, S7, S9 | §10.4 |
| Task card | S5, S9 | `--surface`, radius 12, 1 px `--line-600`, 16 px padding. Provenance footer in `meta` / `--ink-500` |
| "Do this first" card | S5, S9 | Task card plus 2 px `--accent-700` border and `--accent-100` header band. Exactly one exists (D3) |
| Timeline rail | S5 | 2 px `--line-300`, decorative only, `aria-hidden` |
| Locked card expander | S5 | Lock reason always on the card face. A lock without a stated reason is a defect (D3) |
| Answer option | S3 | Full-width, 56 px min, 12 px gap, `--surface`, 1 px `--line-600`, icon + label. Selected: 2 px `--accent-700` + `--accent-100` |
| "I'm not sure" | S3 | Visually distinct, **never disabled-looking**: same 56 px, `--surface`, dashed 1 px `--line-600`. Absent on Q2 by spec |
| Editable chip | S4 | `--accent-100` / `--accent-800`, pencil icon. `unknown` answers: dashed border, `--ink-500` |
| Field | S2b, S7, S8, SH1 | Label **above** in `label` weight, never placeholder-as-label. 1 px `--line-600`, focus per §10.3. Error text below in `--err-700`, bound by `aria-describedby` (D6 §6.2) |
| Error summary | S8 | Top of step, `--err-100` / `--err-700`, `role="alert"`, field names as in-page links (D6 §6.2) |
| Bottom sheet | SH1, confirms | `--surface`, radius 12 top corners, scrim `--ink-900` at 55%, focus trapped (D6 §6.1) |
| Progress ring | S5, S9 | `--accent-700` on `--line-300`. Always accompanied by the literal "{done} of {n} done"; the ring alone is decorative (DP-4) |
| Skeleton | S2, S4, S5, S6, S7, S8, S9 | `--sunken` blocks in the shape of the real content, `aria-busy="true"` (D6 §6.2). Never a spinner |
| Offline chip (O-01) | Global | `--warn-100` / `--warn-800`, cloud-off icon |
| Interstitial (N6) | S6 | Full sheet before every external navigation |

---

## 10.10 Iconography

**Phosphor Icons**, regular weight, 1.5 px stroke, 24 px default and 20 px inside chips. One family, no mixing, no hand-drawn SVG paths.

Icons are always accompanied by text in every control. The mic is explicitly never icon-only (D3 S1). Icons are `aria-hidden` when the adjacent text already carries the label, which is the normal case.

The only hand-authored vector in the product is S7's reuse visualisation, which D3 already specifies as a static SVG with no graph library. It uses `--accent-700` for satisfied links and `--line-600` for hollow ones, and it is `aria-hidden` behind the coverage summary text that states the same fact in words.

---

## 10.11 Theme

**One light theme. Dark mode is deferred, not refused.** See DECISION-007 for the reasoning and the cost.

Tokens are named semantically (`--page`, `--surface`, `--ink-900`) rather than by value (`--teal-700`, `--grey-100`) precisely so that adding a dark theme later is a token swap plus a verification pass, not a rework. An implementer who writes a raw hex value into a component instead of a token forfeits that property, which is the main reason the rule exists.

---

## 10.12 Open items for D9

These are design questions this document cannot settle alone. Each is a candidate row in the assumptions register once D9 exists.

| # | Question | Current assumption |
|---|---|---|
| O-D1 | Is Anek acceptable to the client, and is self-hosting agreed given the 3G / low-end-Android target? | Anek, self-hosted, variable, subset per locale |
| O-D2 | Does the second seeded state stay Maharashtra? Affects nothing visual, but Q2's two-tile layout assumes exactly two | Two tiles, per BUG-001 caveat |
| O-D3 | Is dark mode in scope for v1? | No (DECISION-007) |
| O-D4 | Does the client have an existing wordmark, or is one to be authored? S1 requires text-only, no emblem | Text-only wordmark in Anek, weight 600 |
| O-D5 | Confirm the hatch treatment prints legibly on the low-end printers likely used for the S10 checklist | Assumed yes, untested |

---

## 10.13 Verification method

Nothing in §10.3 or §10.4 is asserted from judgement.

- **Contrast** uses the WCAG 2.1 relative-luminance formula (sRGB, linearised, `0.2126R + 0.7152G + 0.0722B`), ratio `(L_lighter + 0.05) / (L_darker + 0.05)`. Floors: 4.5:1 text, 3:1 non-text component boundaries, per A4. Every pair in §10.3 was computed, including the failures that drove the token values: an earlier `--ink-500` failed on `--sunken` at 4.19, and an earlier `--line-600` failed the 3:1 boundary floor on `--sunken` at 2.83. Both were darkened until they passed.
- **Greyscale separability** compares relative luminance across the five status colours. Measured spread: `--accent-800` 0.041, `--ink-700` 0.072, `--err-700` 0.085, `--done-700` 0.092, `--warn-800` 0.096. They cluster tightly, which is the quantitative reason A6's text-and-shape requirement is load-bearing rather than belt-and-braces.
- **Chip expansion** estimates from the 360 px budget in §10.4 with stated per-script advance-width assumptions. These are estimates and are flagged as such; they must be re-measured against the shipped Anek subset. The margin of failure on the `Locked` chip is large enough that the conclusion does not depend on the estimate's precision.

**Not verified here, and owed to D8:** contrast under actual device colour profiles; the assistive-technology pass on the chip wrapping behaviour; and whether the M-1 reduced-motion fallback reads as causal to real users. D8 is the correct home for all three.

---

## Sources

- Anek script coverage and design intent: [Ek Type, Anek family](https://ektype.in/anek-family.html) · [EkType/Anek on GitHub](https://github.com/EkType/Anek) · [Google Design, "Design for Many"](https://design.google/library/anek-multiscript)
- Noto Nastaliq Urdu vertical metrics: [Noto Nastaliq Urdu on Google Fonts](https://fonts.google.com/noto/specimen/Noto+Nastaliq+Urdu) · [notofonts/noto-fonts issue 198](https://github.com/notofonts/noto-fonts/issues/198) · [google/fonts issue 7810](https://github.com/google/fonts/issues/7810)
