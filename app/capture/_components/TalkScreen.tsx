"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BrandMark } from "@/app/_components/BrandMark";
import { InlineNote } from "@/app/_components/InlineNote";
import { Info, Send } from "lucide-react";
import { VoiceRail, type VoiceRailStrings } from "@/app/_components/VoiceRail";
import {
  getVoiceSnapshot,
  setVoiceInterim,
  setVoicePhase,
  setVoiceStep,
} from "@/app/_lib/voice/store";
import { attachLevelMeter } from "@/app/_lib/voice/levelMeter";
import { SpeechCapture } from "@/app/_lib/speech";
import { announce } from "@/app/_lib/announce";
import { withLocale } from "@/app/_lib/nav";
import { toVoiceLocale } from "@/app/_lib/sarvamLang";
import { speak, spokenReply, stopSpeaking } from "@/app/_lib/speak";
import { persistAgentJourney } from "@/app/_lib/agent/client";
import type { AgentDebugTrace } from "@/app/_lib/agent/trace";
import { pickRecorderMime, transcribeAudio } from "@/app/_lib/speech/pendingStream";
import { readState } from "@/app/_lib/storage/local";
import { AgentDebug, type DebugTurn } from "./AgentDebug";
import { ExampleChips, type ExampleChipsStrings } from "./ExampleChips";
import { RecapSheet, type RecapTurn } from "./RecapSheet";
import styles from "./TalkScreen.module.css";

const MAX_RECORD_MS = 25_000;
const THINK_MS = 2_200;

export interface TalkStrings {
  headline: string;
  helper: string;
  honesty: string;
  whatsReal: string;
  chips: [string, string, string];
  chipAsk: ExampleChipsStrings;
  languageChange: string;
  fieldLabel: string;
  typeHint: string;
  send: string;
  workingSearch: string;
  workingMatch: string;
  workingWrite: string;
  seeSteps: string;
  followUp: string;
  sources: string;
  recap: string;
  recapTitle: string;
  recapClose: string;
  errorE02: string;
  errorE04: string;
  errorE06: string;
  errorAsk: string;
  errorInsecure: string;
  confirmEmptyReason: string;
  offlineReason: string;
  a11yStarted: string;
  a11yStopped: string;
  voiceRail: VoiceRailStrings;
}

type Turn = RecapTurn & { hasTasks?: boolean };

function subscribeOnline(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function isInsecureContext(): boolean {
  return typeof window !== "undefined" && !window.isSecureContext;
}

/**
 * S2 voice stage (and S2b typed-first variant). Voice-first: the latest
 * assistant reply is the stage's primary element; the full turn history
 * demotes into the RecapSheet; the VoiceRail replaces the composer as
 * the persistent mic affordance.
 *
 * Voice pipeline (voice-corridor contract, store.ts): mic press ->
 * setVoicePhase("listening") + attachLevelMeter(stream); Web Speech
 * partials -> setVoiceInterim (ghost caption, display-only); stop ->
 * "transcribing" (interim held); Sarvam transcript -> interim cleared +
 * "thinking"; reply renders -> "speaking" -> "idle" after playback.
 * Phase/level live only in the store - the rail is their sole reader -
 * so this component reads getVoiceSnapshot() synchronously for guards
 * and never mirrors phase into React state.
 */
export function TalkScreen({
  localeCode,
  endonym,
  strings,
  initialQuestion = "",
  autoListen = false,
  debug = false,
  typedFirst = false,
}: {
  localeCode: string;
  endonym: string;
  strings: TalkStrings;
  initialQuestion?: string;
  autoListen?: boolean;
  debug?: boolean;
  /** S2b: the typed field is persistent and the rail has no keyboard toggle. */
  typedFirst?: boolean;
}) {
  const [draft, setDraft] = useState(initialQuestion);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTasks, setHasTasks] = useState(false);
  const [sttFails, setSttFails] = useState(0);
  const [thinkIndex, setThinkIndex] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(typedFirst);
  const [recapOpen, setRecapOpen] = useState(false);
  const [debugTurns, setDebugTurns] = useState<DebugTurn[]>([]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const meterTeardownRef = useRef<(() => void) | null>(null);
  const speechRef = useRef<SpeechCapture | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playSeqRef = useRef(0);
  const startedRef = useRef(false);
  const listenStartedRef = useRef(false);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  const thinkStages = [strings.workingSearch, strings.workingMatch, strings.workingWrite];

  useEffect(() => {
    setVoiceStep({ id: "speak" });
    return () => {
      cancelCapture();
      setVoiceStep(null);
    };
  }, []);

  useEffect(() => {
    if (!working) return;
    const id = window.setInterval(() => {
      setThinkIndex((index) => (index + 1) % thinkStages.length);
    }, THINK_MS);
    return () => window.clearInterval(id);
  }, [working, thinkStages.length]);

  useEffect(() => {
    if (startedRef.current) return;
    const seed = initialQuestion.trim();
    if (!seed) return;
    startedRef.current = true;
    void send(seed, "text");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once
  }, [initialQuestion]);

  useEffect(() => {
    if (!autoListen || listenStartedRef.current) return;
    listenStartedRef.current = true;
    void startListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listen once
  }, [autoListen]);

  /** Rail cancel / unmount / mode switch: release everything WITHOUT
   *  transcribing. Touches only refs and the voice store, so it is safe
   *  to call from the unmount cleanup. */
  function cancelCapture() {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onstop = null; // discard: this path never transcribes
      recorder.stop();
    }
    recorderRef.current = null;
    chunksRef.current = [];
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    meterTeardownRef.current?.();
    meterTeardownRef.current = null;
    speechRef.current?.abort();
    speechRef.current = null;
    setVoiceInterim("");
    setVoicePhase("idle");
  }

  /** Rail stop (tap/hold release and the 25s cap): stop the recorder and
   *  transcribe. The interim caption stays visible until the final
   *  transcript lands, per the corridor contract. */
  function stopCapture() {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      setVoicePhase("transcribing");
      recorder.stop(); // onstop -> finishRecording
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    meterTeardownRef.current?.();
    meterTeardownRef.current = null;
    speechRef.current?.stop();
    speechRef.current = null;
  }

  async function finishRecording() {
    announce(strings.a11yStopped);
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    chunksRef.current = [];
    const transcript = await transcribeAudio(blob, toVoiceLocale(localeCode));
    setVoiceInterim("");
    if (transcript === "") {
      setVoicePhase("idle");
      setError(strings.errorE02);
      return;
    }
    if (transcript === null) {
      const next = sttFails + 1;
      setSttFails(next);
      setVoicePhase("idle");
      setError(strings.errorE04);
      return;
    }
    setSttFails(0);
    setVoicePhase("thinking");
    await send(transcript, "voice");
  }

  async function startListening() {
    if (!online || working || getVoiceSnapshot().phase === "listening") return;
    setError(null);
    stopSpeaking();
    if (isInsecureContext()) {
      setError(strings.errorInsecure);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(strings.errorE06);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      meterTeardownRef.current = attachLevelMeter(stream);
      setVoicePhase("listening");
      // Web Speech runs alongside the recorder to feed the rail's ghost
      // caption only. Its finals are display-only and never sent: the
      // Sarvam transcription of the recorded blob stays the source of
      // truth. If the API is missing or errors, capture proceeds and
      // the caption simply never fills.
      const speech = new SpeechCapture();
      speechRef.current = speech;
      speech.start(toVoiceLocale(localeCode), {
        onPartial: (text) => setVoiceInterim(text),
        onFinal: () => {},
        onError: () => {},
        onEnd: () => {},
      });
      const mime = pickRecorderMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        void finishRecording();
      };
      recorder.start();
      announce(strings.a11yStarted);
      stopTimerRef.current = setTimeout(() => stopCapture(), MAX_RECORD_MS);
    } catch {
      cancelCapture();
      setError(isInsecureContext() ? strings.errorInsecure : strings.errorE06);
    }
  }

  async function send(text: string, mode: "voice" | "text") {
    const message = text.trim();
    if (!message || working) return;
    setDraft("");
    setError(null);
    setThinkIndex(0);
    setWorking(true);
    stopSpeaking();

    const history = turns.map((turn) => ({
      role: turn.role,
      content: turn.followUp ? `${turn.text}\n${turn.followUp}` : turn.text,
    }));
    const priorCitations = [...turns]
      .reverse()
      .find((turn) => turn.role === "assistant" && turn.citations?.length)?.citations ?? [];
    const nextTurns: Turn[] = [...turns, { role: "user", text: message }];
    setTurns(nextTurns);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          locale: localeCode,
          state: readState(),
          history,
          citations: priorCitations,
          debug,
        }),
        signal: AbortSignal.timeout(28_000),
      });
      if (!response.ok) throw new Error("agent");
      const data = (await response.json()) as {
        reply?: string;
        followUp?: string | null;
        citations?: { title: string; url?: string }[];
        tasks?: { title: string; detail: string; url?: string }[];
        summary?: string;
        debug?: AgentDebugTrace;
      };
      const reply = data.reply?.trim() || "";
      if (!reply && !data.followUp && !(data.tasks && data.tasks.length)) {
        throw new Error("empty reply");
      }
      const tasks = data.tasks ?? [];
      const followUp = data.followUp ?? null;
      const intentClear = tasks.length > 0 && !followUp;
      setTurns([
        ...nextTurns,
        {
          role: "assistant",
          text: reply || strings.seeSteps,
          followUp,
          citations: data.citations,
          hasTasks: intentClear,
        },
      ]);
      if (debug && data.debug) {
        setDebugTurns((prev) => [...prev, { question: message, trace: data.debug as AgentDebugTrace }]);
      }
      if (intentClear) {
        persistAgentJourney({
          userText: message,
          inputMode: mode,
          summary: data.summary ?? reply,
          citations: data.citations ?? [],
          tasks,
        });
        setHasTasks(true);
      }
      setWorking(false);
      await playReply(spokenReply(reply, followUp));
    } catch {
      setError(strings.errorAsk);
      setTurns(nextTurns);
      setWorking(false);
      setVoicePhase("idle");
    }
  }

  /** Play a reply aloud and carry the rail through speaking -> idle.
   *  The sequence guard keeps a stale playback end from pulling the rail
   *  out of "speaking" while a replay is still running. */
  async function playReply(text: string) {
    const seq = ++playSeqRef.current;
    setVoicePhase("speaking");
    try {
      await speak(text, toVoiceLocale(localeCode));
    } finally {
      if (seq === playSeqRef.current) setVoicePhase("idle");
    }
  }

  /** Typed or example entry. A live capture yields to the keyboard path;
   *  while transcription is in flight the tap is dropped (momentary). */
  function sendTextNow(text: string) {
    const phase = getVoiceSnapshot().phase;
    if (phase === "transcribing") return;
    if (phase === "listening") cancelCapture();
    void send(text, "text");
  }

  function toggleKeyboard() {
    if (getVoiceSnapshot().phase === "listening") cancelCapture();
    setKeyboardOpen((open) => !open);
  }

  const lastAssistant = [...turns].reverse().find((turn) => turn.role === "assistant");
  const inConversation = Boolean(lastAssistant);

  return (
    <div className={`${styles.wrap} ${inConversation ? styles.wrapTalking : ""}`}>
      <div className={styles.topRow}>
        <BrandMark variant="icon" decorative />
        <div className={styles.topActions}>
          <Link
            href={withLocale("/whats-real", localeCode)}
            className={styles.infoButton}
            aria-label={strings.whatsReal}
            title={strings.whatsReal}
          >
            <Info size={20} aria-hidden="true" />
          </Link>
          <Link href={withLocale("/onboard", localeCode)} className={styles.langPill}>
            {endonym}
            <span className={styles.sr}>{strings.languageChange}</span>
          </Link>
        </div>
      </div>

      {!inConversation ? (
        <>
          <h1 className={styles.headline}>{strings.headline}</h1>
          <p className={styles.helper}>{strings.helper}</p>
          <p className={styles.honesty}>{strings.honesty}</p>
          <ExampleChips
            chips={strings.chips}
            hasContent={false}
            onPick={(example) => sendTextNow(example)}
            strings={strings.chipAsk}
          />
        </>
      ) : (
        <div className={styles.stage} aria-live="polite">
          {lastAssistant ? (
            <>
              <p className={styles.question}>{lastAssistant.text}</p>
              {lastAssistant.followUp ? (
                <p className={styles.stageFollowUp}>
                  {strings.followUp} {lastAssistant.followUp}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      )}

      <div className={styles.dock}>
        {error ? <InlineNote tone="error">{error}</InlineNote> : null}
        {hasTasks || lastAssistant?.hasTasks ? (
          <Link href={withLocale("/journey", localeCode)} className={`${styles.seeSteps} pressable`}>
            {strings.seeSteps}
          </Link>
        ) : null}
        {turns.length > 0 ? (
          <button type="button" className={styles.recapBtn} onClick={() => setRecapOpen(true)}>
            {strings.recap}
          </button>
        ) : null}
        {keyboardOpen ? (
          <div className={styles.typeRow}>
            <label htmlFor="talk-draft" className={styles.sr}>
              {strings.fieldLabel}
            </label>
            <textarea
              id="talk-draft"
              className={styles.field}
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={strings.typeHint}
              disabled={working}
              onFocus={() => {
                if (getVoiceSnapshot().phase === "listening") cancelCapture();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendTextNow(draft);
                }
              }}
            />
            <button
              type="button"
              className={`${styles.send} pressable`}
              disabled={working || !draft.trim()}
              title={!draft.trim() ? strings.confirmEmptyReason : strings.send}
              onClick={() => sendTextNow(draft)}
            >
              <Send size={18} aria-hidden="true" />
              <span className={styles.sr}>{strings.send}</span>
            </button>
          </div>
        ) : null}
      </div>

      <VoiceRail
        strings={strings.voiceRail}
        onStart={() => void startListening()}
        onStop={() => stopCapture()}
        onCancel={() => cancelCapture()}
        onListenAgain={
          lastAssistant
            ? () => void playReply(spokenReply(lastAssistant.text, lastAssistant.followUp))
            : undefined
        }
        onKeyboard={typedFirst ? undefined : () => toggleKeyboard()}
        keyboardActive={keyboardOpen}
        thinkingDetail={working ? thinkStages[thinkIndex] : undefined}
        disabled={!online || working}
        disabledReason={!online ? strings.offlineReason : undefined}
      />

      <RecapSheet
        open={recapOpen}
        onClose={() => setRecapOpen(false)}
        turns={turns}
        strings={{
          title: strings.recapTitle,
          close: strings.recapClose,
          followUp: strings.followUp,
          sources: strings.sources,
        }}
      />

      {debug ? <AgentDebug turns={debugTurns} /> : null}
    </div>
  );
}
