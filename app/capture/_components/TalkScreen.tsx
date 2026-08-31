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
import { isMuted } from "@/app/_lib/voice/mute";
import { withLocale } from "@/app/_lib/nav";
import { toVoiceLocale } from "@/app/_lib/sarvamLang";
import { speak, spokenReply, stopSpeaking } from "@/app/_lib/speak";
import { persistAgentJourney } from "@/app/_lib/agent/client";
import type { AgentDebugTrace } from "@/app/_lib/agent/trace";
import { pickRecorderMime, transcribeAudio } from "@/app/_lib/speech/pendingStream";
import { readState } from "@/app/_lib/storage/local";
import { AgentDebug, type DebugTurn } from "./AgentDebug";
import { ExampleChips, type ExampleChipsStrings } from "./ExampleChips";
import styles from "./TalkScreen.module.css";

const MAX_RECORD_MS = 25_000;
const THINK_MS = 2_200;
/** Distance from the document bottom inside which new turns auto-scroll. */
const NEAR_BOTTOM_PX = 300;

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
  jumpLatest: string;
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

interface TalkTurn {
  role: "user" | "assistant";
  text: string;
  followUp?: string | null;
  citations?: { title: string; url?: string }[];
  hasTasks?: boolean;
}

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
 * S2 voice stage (and S2b typed-first variant). Voice-first: the whole
 * exchange renders as a chat transcript - the user's words as right-
 * aligned bubbles, replies as left-aligned ones - and the hero
 * (headline, helper, ExampleChips) only exists before the first turn.
 * The VoiceRail replaces the composer as the persistent mic affordance;
 * a jump pill appears when the reader scrolls away from the newest
 * turn, and new turns auto-scroll only while they are already near the
 * bottom.
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
  const [turns, setTurns] = useState<TalkTurn[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTasks, setHasTasks] = useState(false);
  const [sttFails, setSttFails] = useState(0);
  const [thinkIndex, setThinkIndex] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(typedFirst);
  const [debugTurns, setDebugTurns] = useState<DebugTurn[]>([]);
  const [nearBottom, setNearBottom] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const meterTeardownRef = useRef<(() => void) | null>(null);
  const speechRef = useRef<SpeechCapture | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playSeqRef = useRef(0);
  const startedRef = useRef(false);
  const listenStartedRef = useRef(false);
  const nearBottomRef = useRef(true);
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

  useEffect(() => {
    // Passive listener; state moves only when the near-bottom boolean
    // flips, never per event.
    const onScroll = () => {
      const doc = document.documentElement;
      const near = window.innerHeight + window.scrollY >= doc.scrollHeight - NEAR_BOTTOM_PX;
      if (near !== nearBottomRef.current) {
        nearBottomRef.current = near;
        setNearBottom(near);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Follow new turns only while the reader is already near the
    // bottom, and with default (instant) behavior - never smooth.
    if (!nearBottom || turns.length === 0) return;
    window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [turns, working, nearBottom]);

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
    // Typed sends own their rail state: without this the phase stays
    // "idle", the rail keeps rendering the mic branch, and the rotating
    // thinkingDetail prop is never shown (only finishRecording used to
    // set it, on the voice path).
    setVoicePhase("thinking");
    stopSpeaking();

    // The server keeps only the last 8 history entries (route.ts,
    // run.ts), so send at most that many and the server slice becomes
    // an identity: the first turn rides along for narrative grounding,
    // the other 7 are the most recent.
    const capped = turns.length <= 7 ? turns : [turns[0], ...turns.slice(-7)];
    const history = capped.map((turn) => ({
      role: turn.role,
      content: (turn.text + (turn.followUp ? `\n${turn.followUp}` : "")).slice(0, 800),
    }));
    const priorCitations =
      [...capped].reverse().find((turn) => turn.role === "assistant" && turn.citations?.length)
        ?.citations ?? [];
    const nextTurns: TalkTurn[] = [...turns, { role: "user", text: message }];
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
      const spoken = spokenReply(reply, followUp);
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
      // One announcement channel. Muted: announce() here (speak() will
      // no-op anyway). Unmuted: playReply announces only when speak()
      // really fails. There is no !online branch - offline, speak()
      // falls through to the browser synthesis fallback, and announcing
      // there would double-deliver the reply.
      if (isMuted()) announce(spoken);
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
      await playReply(spoken);
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
      // A mute flipped mid-playback resolves true, so neither channel
      // delivers the tail - accepted; the toggle click is the user's
      // own signal that speech stopped.
      const ok = await speak(text, toVoiceLocale(localeCode));
      if (!ok) announce(text);
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
  // Any turn flips the view, not just an assistant one: the hero must
  // clear the instant the user sends, while the reply is still in
  // flight. setWorking and setTurns batch into one render, so
  // turns.length already covers the pending state.
  const inConversation = turns.length > 0;

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
        <ul className={styles.transcript}>
          {turns.map((turn, index) =>
            turn.role === "user" ? (
              <li key={index} className={styles.turnUser}>
                <p className={styles.turnText}>{turn.text}</p>
              </li>
            ) : (
              <li key={index} className={styles.turnAssistant}>
                <p className={styles.turnText}>{turn.text}</p>
                {turn.followUp ? (
                  <p className={styles.turnFollowUp}>
                    {strings.followUp} {turn.followUp}
                  </p>
                ) : null}
                {turn.citations?.length ? (
                  <details className={styles.sources}>
                    <summary className={styles.sourcesTitle}>
                      {strings.sources} ({turn.citations.length})
                    </summary>
                    <ol className={styles.sourcesList}>
                      {turn.citations.map((cite, citeIndex) => (
                        <li key={`${cite.title}-${citeIndex}`} className={styles.sourcesItem}>
                          {cite.url ? (
                            <a href={cite.url} target="_blank" rel="noopener">
                              {cite.title}
                            </a>
                          ) : (
                            <span>{cite.title}</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </details>
                ) : null}
              </li>
            ),
          )}
        </ul>
      )}

      <div className={styles.dock}>
        {error ? <InlineNote tone="error">{error}</InlineNote> : null}
        {hasTasks || lastAssistant?.hasTasks ? (
          <Link href={withLocale("/journey", localeCode)} className={`${styles.seeSteps} pressable`}>
            {strings.seeSteps}
          </Link>
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

      {inConversation && !nearBottom ? (
        <button
          type="button"
          className={styles.jumpPill}
          onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight })}
        >
          {strings.jumpLatest}
        </button>
      ) : null}

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

      {debug ? <AgentDebug turns={debugTurns} /> : null}
    </div>
  );
}
