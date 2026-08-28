"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { Field, errorId } from "@/app/_components/Field";
import { InlineNote } from "@/app/_components/InlineNote";
import { MicButton } from "@/app/_components/MicButton";
import { announce } from "@/app/_lib/announce";
import { withLocale } from "@/app/_lib/nav";
import { matchesRealId } from "@/app/_lib/realId";
import { SpeechCapture, type CaptureError } from "@/app/_lib/speech";
import { mutate, readJourney } from "@/app/_lib/storage/local";
import { ExampleChips, type ExampleChipsStrings } from "./ExampleChips";
import { Waveform } from "./Waveform";
import styles from "./CaptureVoice.module.css";

/**
 * S2 client island. D3 S2.
 *
 * State coverage (D3 S2 core states):
 *   Default      pre-capture (chips + idle mic) and post-capture
 *                (editable transcript + Say it again + Confirm).
 *   Loading      Listening: live waveform + Stop control. The
 *                "Transcribing" fallback (Loading ii) has no counterpart
 *                with live SpeechRecognition: finals stream in while the
 *                user speaks, so there is no record-then-transcribe step
 *                to wait on. That state is skipped rather than faked.
 *   Empty        audio empty or under 1s: E-02 inline under the mic, no
 *                advance. Transcript field empty: Confirm disabled with
 *                the reason directly below, never silently greyed.
 *   Error        E-04 inline + Try again (second consecutive failure
 *                auto-routes to S2b), E-06/E-07 preserve the partial and
 *                explain inline, E-05 routes to S2b with its note.
 *   Disabled     offline: mic disabled with the O-01 reason passed in
 *                from the server page; typing and Confirm keep working.
 *
 * Focus order (D6 6.1): language pill, chips, mic, Stop (Listening
 * only), transcript field, "Say it again", Confirm, "Type instead".
 */

const MAX_CHARS = 500; // D5 5.3
const COUNTER_AT = 400; // D5 5.3
const SILENCE_MS = 3000; // D5 5.3: silence after speech began -> auto-stop
const LEVEL_MS = 100; // D11 4: waveform updates at most every 100 ms

/**
 * Standalone T-LOCAL key for the permission primer (D3 S2 edge case,
 * decision D2). NOTE for the orchestrator: D4 4.2 lists two standalone
 * keys beside the journey record; this adds a third. Flagged in the
 * capture workstream summary rather than resolved silently.
 */
const PRIMER_KEY = "sbn.micPrimer";

/* Connectivity reads mirror the OfflineChip pattern: an external store so
   the server snapshot is always "online" and the chip can never cause a
   hydration mismatch. The kit hook is not exported, so the 6-line store
   is repeated here rather than editing shared files. */
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

export interface CaptureVoiceStrings {
  headline: string;
  languageChange: string;
  chips: [string, string, string];
  chipAsk: ExampleChipsStrings;
  micIdle: string;
  micTapStop: string;
  micHoldStop: string;
  stop: string;
  fieldLabel: string;
  lowConfidence: string;
  confirm: string;
  confirmEmptyReason: string;
  rerecord: string;
  typeInstead: string;
  tryAgain: string;
  errorE02: string;
  errorE04: string;
  errorE06: string;
  errorE07: string;
  errorE16: string;
  /** Global O-01 copy, passed in from the server page (D3 S2 Disabled). */
  offlineReason: string;
  primerTitle: string;
  primerBody: string;
  primerContinue: string;
  primerClose: string;
  a11yStarted: string;
  a11yStopped: string;
}

interface CaptureVoiceProps {
  /** BCP 47 tag, fed to SpeechRecognition and the link builders. */
  localeCode: string;
  /** The language's own name for the header pill (never translated). */
  endonym: string;
  strings: CaptureVoiceStrings;
}

type VoiceError = {
  code: "E02" | "E04" | "E06" | "E07";
  message: string;
};

function joinLive(a: string, b: string): string {
  return [a, b].filter(Boolean).join(" ");
}

export function CaptureVoice({ localeCode, endonym, strings }: CaptureVoiceProps) {
  const router = useRouter();
  const online = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);

  const [phase, setPhase] = useState<"idle" | "listening" | "done">("idle");
  const [live, setLive] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<VoiceError | null>(null);
  const [lowConfidence, setLowConfidence] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [level, setLevel] = useState(0);
  const [primerOpen, setPrimerOpen] = useState(false);

  /* ---- refs: the SpeechCapture callbacks must always read current values */
  const captureRef = useRef<SpeechCapture | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalsRef = useRef("");
  const interimRef = useRef("");
  const textRef = useRef("");
  const errorRef = useRef<CaptureError | null>(null);
  const failedRef = useRef(0); // consecutive E-04 failures (D3 S2: auto-route on the 2nd)
  const priorTextRef = useRef(false); // field held text when this capture began
  const listeningRef = useRef(false);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const focusFieldRef = useRef(false);

  const hasText = text.trim().length > 0;
  const e16Active = matchesRealId(text);

  /* Entries (b) and (c) (D3 S2): text from S2b "Speak instead" (?prefill=1)
     and returns from S3 or the language pill restore from T-LOCAL
     automatically (N2). No route parameter is needed: a non-empty stored
     transcript IS a completed capture and renders the post-capture state.
     Runs after hydration: localStorage has no server-side read, so this
     state can only be entered post-mount. */
  useEffect(() => {
    const saved = readJourney()?.transcript ?? "";
    if (saved) {
      textRef.current = saved;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration-time restore; the server render cannot read T-LOCAL
      setText(saved);
      setPhase("done");
    }
  }, []);

  /* D6 6.1: after capture completes, the transcript field takes focus. */
  useEffect(() => {
    if (phase === "done" && focusFieldRef.current) {
      focusFieldRef.current = false;
      fieldRef.current?.focus();
    }
  }, [phase]);

  /* D6 6.2: E-16 is a blocking error, announced assertively, on
     transition only. Editing is never blocked (D3 S2 validation). */
  useEffect(() => {
    if (e16Active) announce(strings.errorE16, true);
  }, [e16Active, strings]);

  function persist(value: string) {
    // P2: writes happen on every mutation; capture completion and each
    // edit both land here with the voice input mode (D3 S2).
    mutate((draft) => {
      draft.transcript = value;
      draft.inputMode = "voice";
    });
  }

  /* ---- capture lifecycle ------------------------------------------------ */

  function armSilence() {
    // D5 5.3: arms once speech began, resets on every result.
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(() => {
      captureRef.current?.stop(); // graceful stop; finalize runs from onEnd
    }, SILENCE_MS);
  }

  function clearSilence() {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  }

  function startLevel() {
    // D11 4: the waveform is driven by a real mic stream opened alongside
    // recognition, sampled through an AnalyserNode at most every 100 ms.
    // Failure here only costs the waveform: permission itself is owned by
    // the recognition pipe, which reports E-05/E-06 through handleError.
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (!listeningRef.current) {
          // The user already stopped before the prompt resolved.
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        streamRef.current = stream;
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        const buffer = new Uint8Array(analyser.fftSize);
        levelTimer.current = setInterval(() => {
          analyser.getByteTimeDomainData(buffer);
          let peak = 0;
          for (let i = 0; i < buffer.length; i += 1) {
            const deviation = Math.abs(buffer[i] - 128);
            if (deviation > peak) peak = deviation;
          }
          setLevel(Math.min(1, peak / 96));
        }, LEVEL_MS);
      })
      .catch(() => {
        // No stream: capture proceeds; the waveform simply stays away.
      });
  }

  function stopLevel() {
    // Tear down on stop, on error and on unmount (D11 4).
    if (levelTimer.current) {
      clearInterval(levelTimer.current);
      levelTimer.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setLevel(0);
  }

  function handlePartial(partial: string) {
    interimRef.current = partial;
    setLive(joinLive(finalsRef.current, partial));
    armSilence();
  }

  function handleFinal(final: string) {
    if (final) {
      finalsRef.current = joinLive(finalsRef.current, final);
      interimRef.current = "";
    }
    setLive(finalsRef.current);
    armSilence();
  }

  function finalize() {
    stopLevel();
    listeningRef.current = false;
    captureRef.current = null;
    const captured = joinLive(finalsRef.current, interimRef.current).trim();
    if (!captured) {
      // E-02: audio empty or under 1s. Do not advance (D3 S2 Empty i);
      // a prior transcript stays exactly where it was.
      setError({ code: "E02", message: strings.errorE02 });
      announce(strings.errorE02);
      setPhase(priorTextRef.current ? "done" : "idle");
      return;
    }
    setText(captured);
    textRef.current = captured;
    persist(captured);
    /* Low-confidence note (D3 S2 edge cases). SpeechCapture does not
       surface the engine's confidence values, so every completed voice
       capture gets the review note; editing is the recovery either way. */
    setLowConfidence(true);
    setError(null);
    focusFieldRef.current = true;
    setPhase("done");
    announce(strings.a11yStopped);
  }

  function handleEnd() {
    // onend fires after stop(), after abort() and after every onerror.
    // Error paths resolve the UI themselves; everything else finalizes.
    if (errorRef.current) return;
    finalize();
  }

  function handleError(code: CaptureError) {
    errorRef.current = code;
    clearSilence();
    stopLevel();
    listeningRef.current = false;
    const partial = joinLive(finalsRef.current, interimRef.current).trim();

    if (code === "empty") {
      // E-02 (mapped from no-speech by the wrapper).
      setError({ code: "E02", message: strings.errorE02 });
      announce(strings.errorE02);
      setPhase(priorTextRef.current ? "done" : "idle");
      return;
    }

    if (code === "failed" || code === "unavailable") {
      // E-04; the wrapper maps a missing SpeechRecognition API onto the
      // same path, so an unsupported browser routes to S2b as well.
      failedRef.current += 1;
      if (failedRef.current >= 2) {
        if (partial) persist(partial);
        router.push(withLocale("/capture/text?note=e04", localeCode));
        return;
      }
      setError({ code: "E04", message: strings.errorE04 });
      announce(strings.errorE04);
      setPhase(priorTextRef.current ? "done" : "idle");
      return;
    }

    if (code === "denied") {
      if (partial) {
        // E-06: permission revoked mid-session (speech had begun). Stop,
        // preserve the partial, show the re-enable instructions inline.
        setText(partial);
        textRef.current = partial;
        persist(partial);
        setError({ code: "E06", message: strings.errorE06 });
        announce(strings.errorE06);
        focusFieldRef.current = true;
        setPhase("done");
      } else {
        // E-05: denied with nothing captured; route with the note (D5).
        router.push(withLocale("/capture/text?note=e05", localeCode));
      }
      return;
    }

    // E-07: interrupted (call, app switch). Auto-stop, preserve the
    // partial, show the resume note (D3 S2 Error).
    if (partial) {
      setText(partial);
      textRef.current = partial;
      persist(partial);
      focusFieldRef.current = true;
    }
    setError({ code: "E07", message: strings.errorE07 });
    announce(strings.errorE07);
    setPhase(partial || priorTextRef.current ? "done" : "idle");
  }

  function startCapture() {
    setError(null);
    errorRef.current = null;
    finalsRef.current = "";
    interimRef.current = "";
    setLive("");
    setLevel(0);
    // "Say it again": the prior transcript is retained until the new
    // capture completes (D3 S2 interactive elements).
    priorTextRef.current = textRef.current.trim().length > 0;
    listeningRef.current = true;
    setPhase("listening");
    announce(strings.a11yStarted);

    const capture = new SpeechCapture();
    captureRef.current = capture;
    capture.start(localeCode, {
      onPartial: handlePartial,
      onFinal: handleFinal,
      onError: handleError,
      onEnd: handleEnd,
    });
    startLevel();
  }

  function stopCapture() {
    clearSilence();
    captureRef.current?.stop(); // graceful: lets the engine flush a final result
  }

  useEffect(() => {
    // Leaving the screen hard-stops everything (D11 4 teardown).
    return () => {
      captureRef.current?.abort();
      stopLevel();
      clearSilence();
    };
  }, []);

  /* ---- permission primer (D3 S2 edge cases, decision D2) ---------------- */

  function primerSeen(): boolean {
    try {
      return window.localStorage.getItem(PRIMER_KEY) === "1";
    } catch {
      return false;
    }
  }

  function markPrimerSeen() {
    try {
      window.localStorage.setItem(PRIMER_KEY, "1");
    } catch {
      // Storage disabled: the primer simply shows again next visit.
    }
  }

  function onMicStart() {
    if (primerSeen()) {
      startCapture();
      return;
    }
    // The primer sheet fronts the very first mic press; the browser
    // prompt follows only once it is acknowledged.
    setPrimerOpen(true);
  }

  function primerContinue() {
    markPrimerSeen();
    setPrimerOpen(false);
    startCapture();
  }

  /* ---- field and actions ------------------------------------------------- */

  function applyChip(value: string) {
    if (textRef.current.trim() === value.trim()) return; // 2nd tap of the same chip: no-op (D3 S2)
    setText(value);
    textRef.current = value;
    persist(value);
    setLowConfidence(false); // chip copy is exact; no transcription uncertainty
    setError(null);
    focusFieldRef.current = true;
    setPhase("done");
  }

  function onEdit(event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    setText(value);
    textRef.current = value;
    persist(value); // every edit persists (P2)
    if (lowConfidence) setLowConfidence(false); // editing is the recovery path (D3 S2)
  }

  function onConfirm() {
    if (!hasText || e16Active || submitting) return;
    setSubmitting(true); // single navigation (D3 S2)
    router.push(withLocale("/clarify/1", localeCode));
  }

  /* Inline error slot, rendered in whichever phase the failure landed in.
     E-04 carries its "Try again" action (D3 S2 Error); E-06/E-07 resolve
     through the preserved transcript and need no extra control. */
  const errorBlock =
    error === null ? null : (
      <div className={styles.errorBlock}>
        <InlineNote tone={error.code === "E06" || error.code === "E07" ? "info" : "error"}>
          {error.message}
        </InlineNote>
        {error.code === "E04" ? (
          <button
            type="button"
            className={`pressable ${styles.secondary}`}
            onClick={startCapture}
          >
            {strings.tryAgain}
          </button>
        ) : null}
      </div>
    );

  return (
    <>
      {/* D6 6.1: the language pill is first in the tab order. The pill is
          rendered as a radius-8 control: D10 10.6 bans pill shapes. */}
      <header className={styles.topRow}>
        <Link
          href={withLocale("/?from=s2", localeCode)}
          className={`pressable ${styles.langPill}`}
          aria-label={strings.languageChange}
        >
          {endonym}
        </Link>
      </header>

      <h1 className={styles.headline}>{strings.headline}</h1>

      {/* Chips rest while capturing: a tap mid-capture would compete with
          the recognition pipe for the transcript. */}
      {phase !== "listening" ? (
        <ExampleChips
          chips={strings.chips}
          hasContent={hasText}
          onPick={applyChip}
          strings={strings.chipAsk}
        />
      ) : null}

      {phase === "done" ? (
        <section className={styles.review}>
          {errorBlock}
          {lowConfidence && !error ? (
            <InlineNote tone="info">{strings.lowConfidence}</InlineNote>
          ) : null}
          <Field
            id="transcript"
            label={strings.fieldLabel}
            error={e16Active ? strings.errorE16 : undefined}
            counter={{ value: text.length, max: MAX_CHARS, showAt: COUNTER_AT }}
          >
            <textarea
              ref={fieldRef}
              id="transcript"
              className={styles.textarea}
              value={text}
              onChange={onEdit}
              maxLength={MAX_CHARS}
              rows={3}
              aria-invalid={e16Active || undefined}
              aria-describedby={e16Active ? errorId("transcript") : undefined}
            />
          </Field>
          <div className={styles.actions}>
            <button
              type="button"
              className={`pressable ${styles.secondary}`}
              onClick={startCapture}
            >
              {strings.rerecord}
            </button>
            <div className={styles.confirmWrap}>
              <button
                type="button"
                className={`pressable ${styles.primary}`}
                disabled={!hasText || e16Active || submitting}
                onClick={onConfirm}
              >
                {strings.confirm}
              </button>
              {/* Empty (ii): the reason sits directly below the disabled
                  CTA, never a silent grey (D3 S2, D10 10.9). The E-16
                  reason is the message under the field, above. */}
              {!hasText ? <p className={styles.reason}>{strings.confirmEmptyReason}</p> : null}
            </div>
          </div>
        </section>
      ) : (
        <section className={styles.captureArea}>
          <MicButton
            listening={phase === "listening"}
            disabled={!online}
            disabledReason={online ? undefined : strings.offlineReason}
            labels={{
              idle: strings.micIdle,
              tapStop: strings.micTapStop,
              holdStop: strings.micHoldStop,
            }}
            // The resolved session mode drives MicButton's own helper
            // label; the island has no further use for it.
            onGestureMode={() => {}}
            onStart={onMicStart}
            onStop={stopCapture}
          />
          {phase === "listening" ? (
            <>
              <Waveform level={level} />
              {/* D3 S2 layout: a separate Stop control is visible while
                  Listening (also D6 6.1 tab order, mic then Stop). */}
              <button
                type="button"
                className={`pressable ${styles.secondary}`}
                onClick={stopCapture}
              >
                {strings.stop}
              </button>
            </>
          ) : null}
          {/* Interim hypotheses are visual feedback only: streaming them
              into a live region would fire on every engine update. The
              completion path announces itself and focuses the field,
              where the full transcript is read (D6 6.2). */}
          {phase === "listening" ? (
            <p className={styles.live} aria-hidden="true">
              {live}
            </p>
          ) : null}
          {errorBlock}
        </section>
      )}

      <Link href={withLocale("/capture/text", localeCode)} className={`pressable ${styles.tertiary}`}>
        {strings.typeInstead}
      </Link>

      <BottomSheet
        open={primerOpen}
        onClose={() => setPrimerOpen(false)}
        title={strings.primerTitle}
        closeLabel={strings.primerClose}
      >
        <div className={styles.primer}>
          <p className={styles.primerBody}>{strings.primerBody}</p>
          <button
            type="button"
            className={`pressable ${styles.primary}`}
            onClick={primerContinue}
          >
            {strings.primerContinue}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
