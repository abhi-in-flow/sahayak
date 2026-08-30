"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BrandMark } from "@/app/_components/BrandMark";
import { InlineNote } from "@/app/_components/InlineNote";
import { MicButton } from "@/app/_components/MicButton";
import { Info, Send, Volume2 } from "lucide-react";
import { announce } from "@/app/_lib/announce";
import { withLocale } from "@/app/_lib/nav";
import { toVoiceLocale } from "@/app/_lib/sarvamLang";
import { speak, spokenReply, stopSpeaking } from "@/app/_lib/speak";
import { persistAgentJourney } from "@/app/_lib/agent/client";
import { pickRecorderMime, transcribeAudio } from "@/app/_lib/speech/pendingStream";
import { readState } from "@/app/_lib/storage/local";
import { ExampleChips, type ExampleChipsStrings } from "./ExampleChips";
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
  working: string;
  workingSearch: string;
  workingMatch: string;
  workingWrite: string;
  listenAgain: string;
  seeSteps: string;
  followUp: string;
  sources: string;
  micIdle: string;
  micTapStop: string;
  micHoldStop: string;
  errorE02: string;
  errorE04: string;
  errorE06: string;
  errorAsk: string;
  errorInsecure: string;
  confirmEmptyReason: string;
  offlineReason: string;
  a11yStarted: string;
  a11yStopped: string;
  transcribing: string;
}

type Turn = {
  role: "user" | "assistant";
  text: string;
  followUp?: string | null;
  citations?: { title: string; url?: string }[];
  hasTasks?: boolean;
};

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

export function TalkScreen({
  localeCode,
  endonym,
  strings,
  initialQuestion = "",
  autoListen = false,
}: {
  localeCode: string;
  endonym: string;
  strings: TalkStrings;
  initialQuestion?: string;
  autoListen?: boolean;
}) {
  const [draft, setDraft] = useState(initialQuestion);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [working, setWorking] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTasks, setHasTasks] = useState(false);
  const [sttFails, setSttFails] = useState(0);
  const [thinkIndex, setThinkIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const listenStartedRef = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  const thinkStages = [strings.workingSearch, strings.workingMatch, strings.workingWrite];

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: "end" });
  }, [turns, working, transcribing, listening]);

  useEffect(() => {
    if (!working) {
      setThinkIndex(0);
      return;
    }
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

  useEffect(() => () => stopCapture(), []);

  function stopCapture() {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setListening(false);
  }

  async function send(text: string, mode: "voice" | "text") {
    const message = text.trim();
    if (!message || working) return;
    setDraft("");
    setError(null);
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
      };
      const reply = data.reply?.trim() || strings.errorAsk;
      const tasks = data.tasks ?? [];
      const followUp = data.followUp ?? null;
      const intentClear = tasks.length > 0 && !followUp;
      setTurns([
        ...nextTurns,
        {
          role: "assistant",
          text: reply,
          followUp,
          citations: data.citations,
          hasTasks: intentClear,
        },
      ]);
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
    }
  }

  async function playReply(text: string) {
    setSpeaking(true);
    try {
      await speak(text, toVoiceLocale(localeCode));
    } finally {
      setSpeaking(false);
    }
  }

  async function startListening() {
    if (!online || working || listening) return;
    setError(null);
    stopSpeaking();
    setSpeaking(false);
    if (isInsecureContext()) {
      setError(strings.errorInsecure);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(isInsecureContext() ? strings.errorInsecure : strings.errorE06);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
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
      setListening(true);
      announce(strings.a11yStarted);
      stopTimerRef.current = setTimeout(() => stopCapture(), MAX_RECORD_MS);
    } catch {
      setError(isInsecureContext() ? strings.errorInsecure : strings.errorE06);
    }
  }

  async function finishRecording() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setListening(false);
    announce(strings.a11yStopped);
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    chunksRef.current = [];
    setTranscribing(true);
    const transcript = await transcribeAudio(blob, toVoiceLocale(localeCode));
    setTranscribing(false);
    if (transcript === "") {
      setError(strings.errorE02);
      return;
    }
    if (transcript === null) {
      const next = sttFails + 1;
      setSttFails(next);
      setError(strings.errorE04);
      return;
    }
    setSttFails(0);
    await send(transcript, "voice");
  }

  const lastAssistant = [...turns].reverse().find((turn) => turn.role === "assistant");
  const inConversation = turns.length > 0 || working || listening || transcribing;

  return (
    <div
      className={`${styles.wrap} ${inConversation ? styles.wrapTalking : ""} ${speaking ? styles.wrapSpeaking : ""}`}
    >
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
            onPick={(example) => {
              void send(example, "text");
            }}
            strings={strings.chipAsk}
          />
        </>
      ) : (
        <p className={styles.liveTitle}>{strings.headline}</p>
      )}

      <div className={styles.thread} ref={listRef} aria-live="polite">
        {turns.map((turn, index) => (
          <article
            key={`${turn.role}-${index}`}
            className={turn.role === "user" ? styles.user : styles.assistant}
          >
            <p className={styles.bubbleText}>{turn.text}</p>
            {turn.followUp ? (
              <p className={styles.followUp}>
                {strings.followUp} {turn.followUp}
              </p>
            ) : null}
            {turn.citations && turn.citations.length > 0 ? (
              <details className={styles.results}>
                <summary className={styles.resultsTitle}>
                  {strings.sources} ({turn.citations.length})
                </summary>
                <ol className={styles.resultsList}>
                  {turn.citations.map((cite, citeIndex) => (
                    <li key={`${cite.title}-${citeIndex}`} className={styles.resultItem}>
                      {cite.url ? (
                        <a href={cite.url} rel="noopener noreferrer">
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
          </article>
        ))}
        {listening ? (
          <p className={styles.listeningNote} aria-live="polite">
            {strings.a11yStarted}
          </p>
        ) : null}
        {working || transcribing ? (
          <div className={styles.thinking} aria-busy="true" aria-live="polite">
            <div className={styles.thinkMeta}>
              <span className={styles.thinkDots} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <p className={styles.thinkLabel}>
                {transcribing ? strings.transcribing : thinkStages[thinkIndex]}
              </p>
            </div>
            <div className={styles.thinkLines} aria-hidden="true">
              <span className={styles.thinkLine} />
              <span className={`${styles.thinkLine} ${styles.thinkLineMid}`} />
              <span className={`${styles.thinkLine} ${styles.thinkLineShort}`} />
            </div>
          </div>
        ) : null}
        {hasTasks || lastAssistant?.hasTasks ? (
          <Link href={withLocale("/journey", localeCode)} className={`${styles.seeSteps} pressable`}>
            {strings.seeSteps}
          </Link>
        ) : null}
      </div>

      {error ? <InlineNote tone="error">{error}</InlineNote> : null}

      <div className={`${styles.composer} ${speaking ? styles.composerSpeaking : ""}`}>
        <div className={styles.composerField}>
          <MicButton
            compact
            listening={listening}
            disabled={!online || working || transcribing}
            disabledReason={!online ? strings.offlineReason : undefined}
            labels={{
              idle: strings.micIdle,
              tapStop: strings.micTapStop,
              holdStop: strings.micHoldStop,
            }}
            onGestureMode={() => {}}
            onStart={() => void startListening()}
            onStop={() => stopCapture()}
          />
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
            disabled={working || listening}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (draft.trim()) void send(draft, "text");
              }
            }}
          />
          <button
            type="button"
            className={`${styles.send} pressable`}
            disabled={working || listening || !draft.trim()}
            title={!draft.trim() ? strings.confirmEmptyReason : strings.send}
            onClick={() => void send(draft, "text")}
          >
            <Send size={18} aria-hidden="true" />
            <span className={styles.sendLabel}>{strings.send}</span>
          </button>
        </div>
        {lastAssistant ? (
          <button
            type="button"
            className={styles.listen}
            onClick={() =>
              void playReply(spokenReply(lastAssistant.text, lastAssistant.followUp))
            }
          >
            <Volume2 size={18} aria-hidden="true" />
            {strings.listenAgain}
          </button>
        ) : null}
      </div>
    </div>
  );
}
