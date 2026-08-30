"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { InlineNote } from "@/app/_components/InlineNote";
import { RetryCard } from "@/app/_components/RetryCard";
import { VoiceRail, type VoiceRailStrings } from "@/app/_components/VoiceRail";
import { announce } from "@/app/_lib/announce";
import {
  decideExit,
  questionById,
  recordedValue,
  type ExitDecision,
  type QuestionId,
} from "@/app/_lib/journey/compute";
import { withLocale } from "@/app/_lib/nav";
import { SpeechCapture } from "@/app/_lib/speech";
import { speak, stopSpeaking } from "@/app/_lib/speak";
import { isMuted, setMuted } from "@/app/_lib/voice/mute";
import { matchUtterance } from "@/app/_lib/socratic/voiceMatch";
import {
  getJourneyServerSnapshot,
  getJourneySnapshot,
  subscribeJourney,
  updateJourney,
} from "@/app/_lib/journey/store";
import {
  getVoiceSnapshot,
  setVoiceInterim,
  setVoicePhase,
  setVoiceStep,
} from "@/app/_lib/voice/store";
import styles from "./ClarifyLoop.module.css";

/**
 * S3, the Socratic clarification loop (D3 S3), one question per route so
 * every question is its own history entry (P2-2: browser back = in-app
 * back exactly).
 *
 * The engine is local and synchronous (journey/compute.ts), so the
 * Thinking state is one paint during the route transition - no fake
 * delays - and the E-03 failure path cannot occur naturally. It is
 * wired anyway: the transition is wrapped and a failure renders the
 * retry card with D5's E-03 copy, gaining the tertiary S3e escape after
 * two visible retries (D5 5.1 retry policy).
 *
 * All props are plain strings; the server page maps option ids to
 * labels through the "s3." namespace (never serialise a LocaleDefinition).
 */

export interface ClarifyLoopProps {
  localeCode: string;
  /** Question order on this route, 1..5. */
  step: number;
  questionId: QuestionId;
  questionText: string;
  /** aria-label for the read-aloud control (A5). */
  speakerLabel: string;
  /** ids and labels for THIS question; voiceLabels carries both shipped
   *  locales' labels so the matcher is locale-agnostic. */
  options: { id: string; label: string; voiceLabels: string[] }[];
  /** Q2 only: "My state isn't here", which opens the coverage sheet. */
  absentOption: { id: string; label: string } | null;
  /** False on Q2 by spec: a journey cannot be state-scoped blindly. */
  showNotSure: boolean;
  notSureLabel: string;
  /** Both shipped locales' renderings of "I'm not sure", for the matcher. */
  notSureVoiceLabels: string[];
  multiSelect: boolean;
  nextLabel: string;
  nextHint: string;
  progressText: string;
  backLabel: string;
  /** D5 O-01 verbatim; the mic's disabled reason, never a silent grey. */
  micOfflineReason: string;
  /** D5 E-01 verbatim, for a failed read-aloud attempt. */
  audioError: string;
  /** Resolved rail chrome (voiceRailStrings on the server page, with this
   *  screen's "Answer with your voice" as the idle label). */
  railStrings: VoiceRailStrings;
  /** Corridor segment detail beside "Clarify", e.g. "3 of 5". */
  corridorDetail: string;
  /** Heard echo chip templates: {text} utterance, {answer} matched label. */
  echoHeard: string;
  echoAnswer: string;
  didYouMean: string;
  e09Message: string;
  e03Message: string;
  e03RetryLabel: string;
  e03BrowseLabel: string;
  /** Coverage sheet copy (canonical D3 S3 edge case). */
  sheetBody: string;
  sheetHelpLabel: string;
  sheetGoBackLabel: string;
  sheetCloseLabel: string;
  stateCaption: string;
  /** sr-only text for the thinking dots. */
  thinkingLabel: string;
  /** ?return=s4: machine bypassed, answer then straight back to S4. */
  returnToS4: boolean;
}

/* O-01 connectivity, read the OfflineChip way: an external store with a
   server snapshot, so SSR never renders a stale offline state. */
function subscribeOnline(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
const getOnline = () => navigator.onLine;
const getOnlineServer = () => true;

/* Web Speech API presence. Server snapshot optimistic: the mic renders
   on first paint and disappears only on browsers without the API, where
   tap answers carry the question alone. */
const subscribeNever = () => () => {};
const getSpeechSupported = () => SpeechCapture.isSupported();
const getSpeechSupportedServer = () => true;

/* Q4: "None" is exclusive per D3 S3 Validation. "unknown" joins it:
   "I'm not sure" plus a definite selection is contradictory data, and
   the schema records unsure as a single first-class value. */
const EXCLUSIVE_VALUES = new Set(["none", "unknown"]);

/* N2: a multi-select draft survives Back in T-MEM (sessionStorage),
   keyed per question so it never leaks across questions. */
function draftKey(questionId: QuestionId): string {
  return `sbn.clarify.draft.${questionId}`;
}

/** Recorded selections plus the T-MEM stash, whichever is newer. */
function readDraft(questionId: QuestionId, recordAnswers: RecordedAnswerLike[]): string[] {
  try {
    const raw = sessionStorage.getItem(draftKey(questionId));
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === "string");
      }
    }
  } catch {
    // Corrupt or missing stash falls through to the recorded answers.
  }
  return recordAnswers
    .filter((a) => a.questionId === questionId && !a.archived)
    .map((a) => a.value);
}

interface RecordedAnswerLike {
  questionId: string;
  value: string;
  archived: boolean;
}

export function ClarifyLoop(props: ClarifyLoopProps) {
  const router = useRouter();
  const {
    localeCode,
    step,
    questionId,
    questionText,
    speakerLabel,
    options,
    absentOption,
    showNotSure,
    notSureLabel,
    notSureVoiceLabels,
    multiSelect,
    nextLabel,
    nextHint,
    progressText,
    backLabel,
    micOfflineReason,
    audioError,
    railStrings,
    corridorDetail,
    echoHeard,
    echoAnswer,
    didYouMean,
    e09Message,
    e03Message,
    e03RetryLabel,
    e03BrowseLabel,
    sheetBody,
    sheetHelpLabel,
    sheetGoBackLabel,
    sheetCloseLabel,
    stateCaption,
    thinkingLabel,
    returnToS4,
  } = props;

  /* T-LOCAL through the store: skeleton on the server and hydration
     paint, the real question state immediately after. */
  const record = useSyncExternalStore(
    subscribeJourney,
    getJourneySnapshot,
    getJourneyServerSnapshot,
  );
  const online = useSyncExternalStore(subscribeOnline, getOnline, getOnlineServer);
  const speechSupported = useSyncExternalStore(
    subscribeNever,
    getSpeechSupported,
    getSpeechSupportedServer,
  );

  const ready = record !== null && record.transcript.trim() !== "";
  const inputMode = record?.inputMode ?? "voice";

  /* null = the user has not touched the draft; fall back to the stash /
     recorded answers, whichever is newer. */
  const [draftEdit, setDraftEdit] = useState<string[] | null>(null);
  const [pending, setPending] = useState(false);
  const [failures, setFailures] = useState(0);
  const [promptVisible, setPromptVisible] = useState(false);
  const [micLocked, setMicLocked] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [audioErrorCount, setAudioErrorCount] = useState(0);
  /** M-2 heard echo: the matched utterance shown ~600 ms before the
     loop advances. Null hides the chip. */
  const [echo, setEcho] = useState<{ utterance: string; answer: string } | null>(null);

  const captureRef = useRef<SpeechCapture | null>(null);
  /* Recognition callbacks are registered once per capture session and
     keep their first closure, so mutable per-session values live in
     refs: state would read stale (always 0 / always false) on the
     second utterance. */
  const ambiguitiesRef = useRef(0);
  /** Whether the recognition pipe is live, readable from the callbacks'
     first closures (state would always read false there). */
  const listeningRef = useRef(false);
  /** Mirrors `pending` for the deferred echo advance (a tap answer or a
     Back press during the 600 ms window must not double-record). */
  const pendingRef = useRef(false);
  const echoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Guard: this route without a captured problem goes back to /capture.
     Read the authoritative snapshot, not the hydration-time value. */
  useEffect(() => {
    const current = getJourneySnapshot();
    if (current === null || current.transcript.trim() === "") {
      router.replace(withLocale("/capture", localeCode));
    }
  }, [localeCode, router]);

  /* Leaving the question (route change or unmount) never leaks a live
     recognition pipe, a speaking voice, or a pending echo advance, and
     it resets the corridor furniture this screen wrote. */
  useEffect(
    () => () => {
      captureRef.current?.abort();
      stopSpeaking();
      if (echoTimerRef.current !== null) clearTimeout(echoTimerRef.current);
      setVoiceInterim("");
      setVoicePhase("idle");
      setVoiceStep(null);
    },
    [],
  );

  /* Corridor position: "Clarify · {n} of 5" for as long as this question
     is on screen (the prototype's frame 4). */
  useEffect(() => {
    setVoiceStep({ id: "clarify", detail: corridorDetail });
  }, [corridorDetail]);

  /* The question is spoken once it can render (A5 read-aloud, primary
     channel on the voice corridor; the speaker button replays it). The
     promise settles only after playback, and the unmount effect has
     already stopped the voice, so nothing else is needed on the way out. */
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void speak(questionText, localeCode).then((ok) => {
      if (!cancelled && !ok) setAudioErrorCount((count) => count + 1); // E-01 path
    });
    return () => {
      cancelled = true;
    };
  }, [ready, questionText, localeCode]);

  const recorded = ready ? recordedValue(record!.answers, questionId) : undefined;

  function resolvedDraft(): string[] {
    if (draftEdit !== null) return draftEdit;
    return ready ? readDraft(questionId, record!.answers) : [];
  }

  /* ---- the exit machine (D3 S3, authoritative and total) ------------- */

  function resolveTarget(decision: ExitDecision): string {
    // Return-to-S4 mode bypasses the machine entirely and deterministically.
    if (returnToS4) return withLocale("/confirm", localeCode);
    if (decision.to === "s4") return withLocale("/confirm", localeCode);
    if (decision.to === "s3e") return withLocale("/clarify/unresolved", localeCode);
    const order = questionById(decision.question).order;
    return withLocale(`/clarify/${order}`, localeCode);
  }

  /** Persist the answer(s) and follow the machine. Values are option
   *  ids, or the literal "unknown"; multi-select pushes one answer per
   *  selected value (D3 S3 / D4 schema). */
  function recordAnswer(values: string[], spokenLabel: string) {
    if (pendingRef.current || !ready) return;
    pendingRef.current = true;
    setPending(true);
    announce(spokenLabel);
    if (multiSelect) {
      setDraftEdit(null);
      try {
        sessionStorage.removeItem(draftKey(questionId));
      } catch {
        // Nothing to clean up.
      }
    }
    try {
      const updated = updateJourney((draft) => {
        // Replace, never duplicate: the previous live answer(s) for this
        // question are archived, the new ones recorded with this n.
        for (const a of draft.answers) {
          if (a.questionId === questionId) a.archived = true;
        }
        for (const value of values) {
          draft.answers.push({ questionId, value, n: step, archived: false });
        }
        if (questionId === "state" && values[0]) {
          // schema.ts: "Seeded state the journey is scoped to (Q2)".
          draft.state = values[0];
        }
      });
      const decision = decideExit(updated?.answers ?? []);
      router.push(resolveTarget(decision));
    } catch {
      // E-03. Unreachable with the local synchronous engine, but the
      // contract is: retry card, and the S3e tertiary from the second
      // visible failure (D5 5.1). Back stays available above the card.
      setPending(false);
      setFailures((f) => f + 1);
    }
  }

  /** E-03 "Try again": the answer is already persisted; recompute the
   *  transition from the record. Never records twice. */
  function retryTransition() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      const current = getJourneySnapshot();
      const decision = decideExit(current?.answers ?? []);
      router.push(resolveTarget(decision));
    } catch {
      setPending(false);
      setFailures((f) => f + 1);
    }
  }

  /* ---- answers -------------------------------------------------------- */

  function toggleOption(id: string) {
    const base = resolvedDraft();
    const next = (() => {
      if (EXCLUSIVE_VALUES.has(id)) {
        return base.includes(id) ? base.filter((v) => v !== id) : [id];
      }
      const definite = base.filter((v) => !EXCLUSIVE_VALUES.has(v));
      return definite.includes(id)
        ? definite.filter((v) => v !== id)
        : [...definite, id];
    })();
    setDraftEdit(next);
    try {
      sessionStorage.setItem(draftKey(questionId), JSON.stringify(next));
    } catch {
      // T-MEM unavailable: the draft just stops surviving Back.
    }
  }

  function labelOf(id: string): string {
    return options.find((o) => o.id === id)?.label ?? id;
  }

  function submitMulti() {
    const current = resolvedDraft();
    if (current.length === 0) return;
    const labels = current.map((v) => (v === "unknown" ? notSureLabel : labelOf(v)));
    recordAnswer(current, labels.join(", "));
  }

  /* ---- voice answer (D3 S3: present on every question) ----------------
     The rail below IS the mic affordance (one per screen); capture stays
     the local SpeechCapture flow with its E-09 ambiguity lock. Phases:
     start -> "listening", stop press -> "transcribing" while the engine
     flushes its final, match resolved -> "idle" (the match is local and
     instant, so no "thinking" phase is faked here). */

  /** Close the pipe and land the rail back on idle, clearing the ghost
     caption. Used by the error/end paths where no final text arrives. */
  function settleIdle() {
    listeningRef.current = false;
    setVoiceInterim("");
    const phase = getVoiceSnapshot().phase;
    if (phase === "listening" || phase === "transcribing") setVoicePhase("idle");
  }

  function startVoice() {
    stopSpeaking();
    setVoiceInterim("");
    const capture = new SpeechCapture();
    captureRef.current = capture;
    capture.start(localeCode, {
      onPartial: (text) => {
        // Ghost caption on the rail: the live words, verbatim (V-3).
        setVoiceInterim(text);
      },
      onFinal: handleUtterance,
      onError: () => {
        // D5 has no S3 voice-capture code (E-02/E-04/E-05 belong to S2).
        // A failed attempt just ends listening; tap answers remain.
        settleIdle();
      },
      onEnd: () => settleIdle(),
    });
    listeningRef.current = true;
    setVoicePhase("listening");
  }

  function stopVoice() {
    captureRef.current?.stop();
    listeningRef.current = false;
    // The interim stays visible through "writing it down" so the user
    // can verify what will be matched (store.ts flow).
    setVoicePhase("transcribing");
  }

  function cancelVoice() {
    captureRef.current?.abort();
    listeningRef.current = false;
    setVoiceInterim("");
    setVoicePhase("idle");
  }

  function handleUtterance(text: string) {
    if (!text) return;
    const matchOptions = options.map((o) => ({ id: o.id, labels: o.voiceLabels }));
    if (showNotSure) {
      matchOptions.push({ id: "unknown", labels: notSureVoiceLabels });
    }
    const result = matchUtterance(text, matchOptions);
    if (result.kind === "match") {
      captureRef.current?.stop();
      listeningRef.current = false;
      setVoiceInterim("");
      setVoicePhase("idle");
      // The proof step (M-2 territory): show what was heard and the
      // answer it resolved to for a beat, then follow the machine.
      const label = result.id === "unknown" ? notSureLabel : labelOf(result.id);
      if (echoTimerRef.current !== null) clearTimeout(echoTimerRef.current);
      setEcho({ utterance: text, answer: label });
      echoTimerRef.current = setTimeout(() => {
        echoTimerRef.current = null;
        setEcho(null);
        recordAnswer([result.id], label);
      }, 600);
      return;
    }
    // Ambiguous or unmatched. First time: the one "Did you mean..."
    // re-render, mic still open so a clearer restatement can record.
    // Second time: E-09, tap-only for THIS question (D5 5.1); the rail
    // returns on the next question because this island remounts.
    ambiguitiesRef.current += 1;
    if (ambiguitiesRef.current >= 2) {
      captureRef.current?.abort();
      listeningRef.current = false;
      setVoiceInterim("");
      setVoicePhase("idle");
      setMicLocked(true);
    } else {
      if (!listeningRef.current) {
        // Pipe already closed (stop pressed): land on idle, nothing to hear.
        setVoicePhase("idle");
      }
      setVoiceInterim("");
      setPromptVisible(true);
    }
  }

  async function replayQuestion() {
    // An explicit "hear this" tap flips the durable preference: speak()
    // stays the only mute enforcement point (no force param). Unmuting
    // alone would not re-speak - the auto-speak effect keys on question
    // identity, not mute state.
    if (isMuted()) setMuted(false);
    const ok = await speak(questionText, localeCode);
    if (!ok) setAudioErrorCount((c) => c + 1); // E-01 path: note, control stays.
  }

  /* ---- back (D3 S3: previous question; past Q1 per input mode) -------- */

  function goBack() {
    stopSpeaking();
    captureRef.current?.abort();
    const href =
      step === 1
        ? withLocale(inputMode === "text" ? "/capture/text" : "/capture", localeCode)
        : withLocale(`/clarify/${step - 1}`, localeCode);
    router.push(href);
  }

  /* ---- render ---------------------------------------------------------- */

  if (!ready) {
    return (
      <div className={styles.screen} aria-busy="true">
        <Skeleton />
      </div>
    );
  }

  const inputsDisabled = pending;
  const micDisabled = !online || micLocked || pending;
  const draft = multiSelect ? resolvedDraft() : [];
  const multiBusy = multiSelect && draft.length === 0;

  return (
    <div className={styles.screen}>
      <div className={styles.topRow}>
        <button type="button" className={`${styles.back} pressable`} onClick={goBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M14 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {backLabel}
        </button>
      </div>

      <section className={styles.card} aria-busy={pending || undefined}>
        <p className={styles.progress}>{progressText}</p>

        {pending && (
          <div className={styles.thinking}>
            {/* D11 4: three static dots at 40% opacity. No loop; the
                instant question swap carries the feedback. */}
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className="sr-only">{thinkingLabel}</span>
          </div>
        )}

        <header className={styles.qhead}>
          <h1 className={styles.question}>{questionText}</h1>
          <button
            type="button"
            className={styles.speaker}
            onClick={replayQuestion}
            aria-label={speakerLabel}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </header>

        {failures > 0 ? (
          /* E-03 retry card replaces the answer area; Back is retained. */
          <RetryCard
            message={e03Message}
            retryLabel={e03RetryLabel}
            onRetry={retryTransition}
            tertiaryLabel={failures >= 2 ? e03BrowseLabel : undefined}
            onTertiary={
              failures >= 2
                ? () => router.push(withLocale("/clarify/unresolved", localeCode))
                : undefined
            }
          />
        ) : (
          <>
            {promptVisible && !micLocked && (
              <InlineNote tone="warn">{didYouMean}</InlineNote>
            )}
            {micLocked && (
              /* role="status" on the note is the announcement channel
                 (D6 6.2); no second live region is needed. */
              <InlineNote tone="error">{e09Message}</InlineNote>
            )}
            {audioErrorCount > 0 && (
              <InlineNote key={audioErrorCount} tone="info" autoClearMs={4000}>
                {audioError}
              </InlineNote>
            )}

            <div className={styles.options} role="group" aria-label={questionText}>
              {options.map((option) => {
                const selected = multiSelect
                  ? draft.includes(option.id)
                  : recorded === option.id;
                return (
                  <button
                    type="button"
                    key={option.id}
                    className={`${styles.option} ${selected ? styles.optionSelected : ""} pressable`}
                    disabled={inputsDisabled}
                    aria-pressed={selected}
                    onClick={() => {
                      if (multiSelect) toggleOption(option.id);
                      else recordAnswer([option.id], option.label);
                    }}
                  >
                    <span className={styles.optionIcon}>
                      <OptionIcon optionId={option.id} />
                    </span>
                    <span className={styles.optionLabel}>{option.label}</span>
                  </button>
                );
              })}

              {showNotSure && (
                <button
                  type="button"
                  className={`${styles.option} ${styles.optionUnsure} ${
                    multiSelect && draft.includes("unknown") ? styles.optionSelected : ""
                  } pressable`}
                  disabled={inputsDisabled}
                  aria-pressed={
                    multiSelect ? draft.includes("unknown") : recorded === "unknown"
                  }
                  onClick={() => {
                    if (multiSelect) toggleOption("unknown");
                    else recordAnswer(["unknown"], notSureLabel);
                  }}
                >
                  <span className={styles.optionIcon}>
                    <OptionIcon optionId="unsure" />
                  </span>
                  <span className={styles.optionLabel}>{notSureLabel}</span>
                </button>
              )}

              {multiSelect && (
                <>
                  <button
                    type="button"
                    className={`${styles.primary} pressable`}
                    disabled={multiBusy || pending}
                    onClick={submitMulti}
                  >
                    {nextLabel}
                  </button>
                  {multiBusy && <p className={styles.nextHint}>{nextHint}</p>}
                </>
              )}
            </div>

            {absentOption && (
              <>
                <button
                  type="button"
                  className={`${styles.option} pressable`}
                  disabled={inputsDisabled}
                  onClick={() => setSheetOpen(true)}
                >
                  <span className={styles.optionIcon}>
                    <OptionIcon optionId="absent" />
                  </span>
                  <span className={styles.optionLabel}>{absentOption.label}</span>
                </button>
                <p className={styles.caption}>{stateCaption}</p>
              </>
            )}
          </>
        )}

      </section>

      {/* Heard echo (M-2 territory): fixed above the rail, ~600 ms, then
          the loop advances. role="status" announces it; the global live
          regions stay reserved for the record confirmation. */}
      {echo && (
        <div className={styles.echoChip} role="status">
          <span className={styles.echoHeard}>{echoHeard.replace("{text}", echo.utterance)}</span>
          <span className={styles.echoAnswer}>{echoAnswer.replace("{answer}", echo.answer)}</span>
        </div>
      )}

      {/* The corridor rail: this screen's one mic affordance (the old
          per-question MicButton row is gone). Fixed above the TabBar by
          its own styles; the scroll content reserves ~200px for it. */}
      {speechSupported && (
        <VoiceRail
          strings={railStrings}
          onStart={startVoice}
          onStop={stopVoice}
          onCancel={cancelVoice}
          disabled={micDisabled}
          disabledReason={!online ? micOfflineReason : micLocked ? e09Message : undefined}
        />
      )}

      {absentOption && (
        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={absentOption.label}
          closeLabel={sheetCloseLabel}
        >
          <p className={styles.sheetBody}>{sheetBody}</p>
          <div className={styles.sheetActions}>
            <button
              type="button"
              className={`${styles.primary} pressable`}
              onClick={() => {
                setSheetOpen(false);
                // Entry (c): the state-isn't-here sheet has no state
                // scope, so S10 renders its national variant (D3 S10).
                router.push(withLocale("/help?national=1", localeCode));
              }}
            >
              {sheetHelpLabel}
            </button>
            <button
              type="button"
              className={styles.tertiary}
              onClick={() => setSheetOpen(false)}
            >
              {sheetGoBackLabel}
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* pieces                                                               */
/* -------------------------------------------------------------------- */

function Skeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={`${styles.skeletonRow} skeleton`} style={{ width: "40%" }} />
      <div className={`${styles.skeletonRow} skeleton`} style={{ width: "85%" }} />
      <div className={`${styles.skeletonRow} skeleton`} style={{ width: "70%" }} />
      <div className={`${styles.skeletonRow} skeleton`} style={{ width: "100%" }} />
      <div className={`${styles.skeletonRow} skeleton`} style={{ width: "100%" }} />
    </div>
  );
}

function single(path: string): ReactNode {
  return (
    <path
      d={path}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/* One silhouette per option family (D10 10.10 idiom: 24px, 1.5 stroke).
   aria-hidden: the label beside it carries the meaning. */
function OptionIcon({ optionId }: { optionId: string }) {
  const inner: ReactNode = (() => {
    switch (optionId) {
      case "yes":
        return single("M5 13l4 4L19 7");
      case "no":
        return single("M6 6l12 12M18 6L6 18");
      case "assam":
      case "maharashtra":
      case "karnataka":
        return (
          <>
            {single("M12 21s-6-5.1-6-10a6 6 0 1112 0c0 4.9-6 10-6 10z")}
            <circle cx="12" cy="11" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </>
        );
      case "absent":
        return (
          <>
            {single("M12 21s-6-5.1-6-10a6 6 0 1112 0c0 4.9-6 10-6 10z")}
            {single("M5 4l14 16")}
          </>
        );
      case "company":
        return (
          <>
            {single("M5 20V5a1 1 0 011-1h8a1 1 0 011 1v15")}
            {single("M15 9h3a1 1 0 011 1v10")}
            {single("M3 20h18M9 8h2M9 12h2M9 16h2")}
          </>
        );
      case "retired":
        return (
          <>
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
            {single("M12 7v5l3 2")}
          </>
        );
      case "self":
        return (
          <>
            <rect x="4" y="8" width="16" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            {single("M9 8V6a2 2 0 012-2h2a2 2 0 012 2v2M4 13h16")}
          </>
        );
      case "bank":
        return single("M4 20h16M5 20v-8M9.5 20v-8M14.5 20v-8M19 20v-8M4 9l8-5 8 5H4z");
      case "house":
        return single("M4 11l8-7 8 7M6 10v10h12V10M10 20v-5h4v5");
      case "land":
        return single("M3 18l6-9 4 6 3-4 5 7H3z");
      case "none":
        return (
          <>
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
            {single("M9 12h6")}
          </>
        );
      case "son":
      case "daughter":
        return (
          <>
            <circle cx="12" cy="7.5" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
            {single("M6 20a6 6 0 0112 0")}
          </>
        );
      case "spouse":
        return (
          <>
            <circle cx="9" cy="8" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="16" cy="9.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            {single("M4 19a5 5 0 0110 0M14.5 19a4 4 0 017 2.6")}
          </>
        );
      case "other":
        return (
          <>
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
            {single("M12 4v4M12 16v4M4 12h4M16 12h4")}
          </>
        );
      case "unsure":
        return (
          <>
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
            {single("M9.8 9.8a2.2 2.2 0 113.7 1.6c-.9.8-1.5 1.2-1.5 2.3")}
            <circle cx="12" cy="16.4" r="0.9" fill="currentColor" />
          </>
        );
      default:
        return single("M12 5v14M5 12h14");
    }
  })();
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      {inner}
    </svg>
  );
}
