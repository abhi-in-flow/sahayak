"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Field, errorId } from "@/app/_components/Field";
import { InlineNote } from "@/app/_components/InlineNote";
import { announce } from "@/app/_lib/announce";
import { withLocale } from "@/app/_lib/nav";
import { matchesRealId } from "@/app/_lib/realId";
import { mutate, readJourney } from "@/app/_lib/storage/local";
import { ExampleChips, type ExampleChipsStrings } from "./ExampleChips";
import styles from "./CaptureText.module.css";

/**
 * S2b client island. D3 S2b: full parity with S2, never second-class.
 *
 * State coverage (D3 S2b core states):
 *   Default    field focused on entry (a), cursor at text end on (b)/(c).
 *   Loading    none required per spec: no async operation exists on this
 *              screen; autosave is silent. No skeleton is rendered.
 *   Empty      E-08 inline under the field on an empty submit,
 *              error-on-submit: focus retained, no modal, Submit stays
 *              enabled until the user types.
 *   Error      E-16 disables Submit with the D5 message as the visible
 *              reason under the field; clears when the pattern is
 *              removed. Typing is never blocked.
 *   Disabled   offline changes nothing here except hiding "Speak
 *              instead", replaced by the O-01 text (D3 S2b inventory);
 *              capture is fully functional offline.
 *
 * Focus order (D6 6.1): chips, text field, Submit, "Speak instead".
 */

const MAX_CHARS = 500; // D5 5.3
const COUNTER_AT = 400; // D5 5.3
const AUTOSAVE_MS = 5000; // D5 5.3: autosave tick, plus on blur

/* Connectivity reads mirror the OfflineChip pattern (external store, the
   server snapshot is always online, so nothing here can hydration-mismatch).
   The kit hook is not exported, so the small store is repeated rather than
   editing shared files. */
function subscribeOnline(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
const getOnlineSnapshot = () => navigator.onLine;
const getOnlineServerSnapshot = () => true;

export interface CaptureTextStrings {
  headline: string;
  chips: [string, string, string];
  chipAsk: ExampleChipsStrings;
  fieldLabel: string;
  /** "A sentence or two is enough." (D3 S2b inventory). */
  guidance: string;
  submit: string;
  speakInstead: string;
  errorE08: string;
  errorE16: string;
  /** Arrival note for the e04/e05 routes (D5 5.1), null when absent. */
  arrivalNote: string | null;
  /** Global O-01 copy, passed in from the server page. */
  offlineReason: string;
}

interface CaptureTextProps {
  /** BCP 47 tag for the link builders. */
  localeCode: string;
  strings: CaptureTextStrings;
  /** Entry (a): S1 "Type instead" focuses the field on arrival (D3 S2b). */
  focusOnEntry: boolean;
}

export function CaptureText({ localeCode, strings, focusOnEntry }: CaptureTextProps) {
  const router = useRouter();
  const online = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);

  const [text, setText] = useState("");
  const [submittedEmpty, setSubmittedEmpty] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const textRef = useRef("");
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  const hasText = text.trim().length > 0;
  const e16Active = matchesRealId(text);

  function save() {
    // P2: autosave is a mutation like any other; the text mode tells S3's
    // Back which capture screen to return to (D3 S2b entry c).
    mutate((draft) => {
      draft.transcript = textRef.current;
      draft.inputMode = "text";
    });
  }

  /* Entries (b) and (c) (D3 S2b): any text captured on S2 pre-fills the
     field, and a return from S3 restores the exact submitted text (N2).
     The cursor waits at the text end, not the start. Runs after
     hydration: localStorage has no server-side read, so this state can
     only be entered post-mount. */
  useEffect(() => {
    const saved = readJourney()?.transcript ?? "";
    if (saved) {
      textRef.current = saved;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration-time restore; the server render cannot read T-LOCAL
      setText(saved);
      // Caret to the end once the restored value is committed (D6 6.1,
      // entries b/c). The length guard skips the frame if the user has
      // already begun typing.
      requestAnimationFrame(() => {
        const el = fieldRef.current;
        if (el && el.value.length === saved.length) {
          el.setSelectionRange(saved.length, saved.length);
        }
      });
    }
    if (focusOnEntry) {
      // Entry (a) initial focus is the S2b spec (D3 S2b Default; D6 6.1).
      // It is a user-intent entry, so it overrides the general
      // no-focus-steal-on-load rule.
      fieldRef.current?.focus();
    }
  }, [focusOnEntry]);

  /* Autosave on blur and every 5s (D5 5.3). The interval callback reads
     the ref, so the ticker never needs rearming. */
  useEffect(() => {
    const ticker = setInterval(save, AUTOSAVE_MS);
    return () => {
      clearInterval(ticker);
      save(); // never lose the last keystrokes to an unmount (N2)
    };
  }, []);

  /* D6 6.2: E-16 is a blocking error, announced assertively, on
     transition only. */
  useEffect(() => {
    if (e16Active) announce(strings.errorE16, true);
  }, [e16Active, strings]);

  function onEdit(event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    setText(value);
    textRef.current = value;
    // Typing clears the empty-submit error: "Exit: user types" (D3 S2b).
  }

  function applyChip(value: string) {
    if (textRef.current.trim() === value.trim()) return; // 2nd tap of the same chip: no-op (D3 S2)
    setText(value);
    textRef.current = value;
    save();
    setSubmittedEmpty(false);
  }

  function onSubmit() {
    if (e16Active || navigating) return;
    if (!hasText) {
      // Error-on-submit (D3 S2b Empty): inline under the field, focus
      // retained, no modal, Submit itself stays enabled.
      setSubmittedEmpty(true);
      announce(strings.errorE08);
      fieldRef.current?.focus();
      return;
    }
    save();
    setNavigating(true); // disabled on first tap (D3 S2b)
    router.push(withLocale("/clarify/1", localeCode));
  }

  const showError = e16Active
    ? strings.errorE16
    : submittedEmpty && !hasText
      ? strings.errorE08
      : undefined;

  return (
    <>
      <h1 className={styles.headline}>{strings.headline}</h1>

      {strings.arrivalNote ? (
        /* Arrival note, entry (b) only, one render: e04 and e05 routes
           carry the same sentence (D5 5.1). */
        <InlineNote tone="info">{strings.arrivalNote}</InlineNote>
      ) : null}

      <ExampleChips
        chips={strings.chips}
        hasContent={hasText}
        onPick={applyChip}
        strings={strings.chipAsk}
      />

      <Field
        id="situation"
        label={strings.fieldLabel}
        helper={strings.guidance}
        error={showError}
        counter={{ value: text.length, max: MAX_CHARS, showAt: COUNTER_AT }}
      >
        <textarea
          ref={fieldRef}
          id="situation"
          className={styles.textarea}
          value={text}
          onChange={onEdit}
          onBlur={save}
          maxLength={MAX_CHARS}
          rows={3}
          aria-invalid={Boolean(showError) || undefined}
          aria-describedby={showError ? errorId("situation") : undefined}
        />
      </Field>

      {/* Primary CTA binding (D10 10.9). Disabled only by E-16 (the
          message under the field is the visible reason) or the single
          navigation window, never by an empty field. */}
      <button
        type="button"
        className={`pressable ${styles.primary}`}
        disabled={e16Active || navigating}
        onClick={onSubmit}
      >
        {strings.submit}
      </button>

      {online ? (
        <Link
          href={withLocale("/capture?prefill=1", localeCode)}
          className={`pressable ${styles.tertiary}`}
          onClick={save}
        >
          {strings.speakInstead}
        </Link>
      ) : (
        /* Offline: capture is fully functional, so only the voice route
           closes. The O-01 text takes its place (D3 S2b inventory); the
           layout's global chip also carries it, so this is text in the
           content flow, not a second chip. */
        <InlineNote tone="warn">{strings.offlineReason}</InlineNote>
      )}
    </>
  );
}
