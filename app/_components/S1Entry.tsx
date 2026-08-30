"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mic } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { InlineNote } from "./InlineNote";
import { withLocale } from "../_lib/nav";
import {
  getJourneyServerSnapshot,
  getJourneySnapshot,
  subscribeJourney,
} from "../_lib/journey/store";
import { toVoiceLocale } from "../_lib/sarvamLang";
import { pickRecorderMime, transcribeAudio } from "../_lib/speech/pendingStream";
import { readSessionLast4, readState } from "../_lib/storage/local";
import styles from "../page.module.css";

function subscribeSessionDest(): () => void {
  return () => {};
}
function getSessionDest(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const dest = sessionStorage.getItem("sbn.dest");
  return dest && dest.startsWith("/") ? dest : null;
}

const STATE_LABEL: Record<string, string> = {
  assam: "Assam",
  maharashtra: "Maharashtra",
  karnataka: "Karnataka",
  other: "Another state",
};

const MAX_RECORD_MS = 25_000;

export interface S1EntryProps {
  localeCode: string;
  strings: {
    continueTitle: string;
    continueDescriptor: string;
    micCta: string;
    micTapStop: string;
    transcribing: string;
    typeInstead: string;
    actionBrowse: string;
    actionLogin: string;
    sessionIn: string;
    sessionOut: string;
    askLabel: string;
    askHelper: string;
    askSubmit: string;
    askWorking: string;
    askError: string;
    askSources: string;
    stateChip: string;
    errorE02: string;
    errorE04: string;
    errorE06: string;
    errorInsecure: string;
  };
}

export function S1Entry({ localeCode, strings }: S1EntryProps) {
  const journey = useSyncExternalStore(
    subscribeJourney,
    getJourneySnapshot,
    getJourneyServerSnapshot,
  );
  const destHref = useSyncExternalStore(subscribeSessionDest, getSessionDest, () => null);

  const [last4, setLast4] = useState<string | null>(null);
  const [stateName, setStateName] = useState<string>("");
  const [ask, setAsk] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (journey && destHref) sessionStorage.removeItem("sbn.dest");
  }, [journey, destHref]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- T-LOCAL is client-only
    setLast4(readSessionLast4());
    const chosen = readState();
    setStateName(chosen ? STATE_LABEL[chosen] ?? chosen : "");
  }, []);

  useEffect(() => () => stopTracks(), []);

  const activeTasks = journey?.tasks.filter((task) => !task.archived) ?? [];
  const hasActiveJourney =
    journey !== null &&
    (journey.transcript.trim().length > 0 || activeTasks.some((task) => task.status !== "done"));
  const doneCount = activeTasks.filter((task) => task.status === "done").length;

  function submitAsk(event: FormEvent) {
    event.preventDefault();
    const question = ask.trim();
    if (!question) return;
    router.push(
      withLocale(`/capture?mode=text&q=${encodeURIComponent(question)}`, localeCode),
    );
  }

  function stopTracks() {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }

  function stopHomeCapture() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else {
      stopTracks();
      setListening(false);
    }
  }

  async function startSpeak() {
    if (busy) return;
    if (listening) {
      stopHomeCapture();
      return;
    }
    setError(null);
    if (typeof window !== "undefined" && !window.isSecureContext) {
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
      const mime = pickRecorderMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        void finishHomeRecording();
      };
      recorder.start();
      setListening(true);
      stopTimerRef.current = setTimeout(() => stopHomeCapture(), MAX_RECORD_MS);
    } catch {
      setError(typeof window !== "undefined" && !window.isSecureContext ? strings.errorInsecure : strings.errorE06);
    }
  }

  async function finishHomeRecording() {
    stopTracks();
    setListening(false);
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    chunksRef.current = [];
    setBusy(true);
    const transcript = await transcribeAudio(blob, toVoiceLocale(localeCode));
    setBusy(false);
    if (transcript === "") {
      setError(strings.errorE02);
      return;
    }
    if (transcript === null) {
      setError(strings.errorE04);
      return;
    }
    router.push(withLocale(`/capture?q=${encodeURIComponent(transcript)}`, localeCode));
  }

  const ctaLabel = busy ? strings.transcribing : listening ? strings.micTapStop : strings.micCta;

  return (
    <div className={styles.entry}>
      <div className={styles.metaRow}>
        {stateName ? (
          <Link href={withLocale("/onboard", localeCode)} className={styles.stateChip}>
            {strings.stateChip.replace("{state}", stateName)}
          </Link>
        ) : null}
        {last4 ? (
          <p className={styles.sessionChip}>{strings.sessionIn.replace("{last4}", last4)}</p>
        ) : (
          <p className={styles.sessionHint}>{strings.sessionOut}</p>
        )}
      </div>

      {hasActiveJourney ? (
        <Link
          href={destHref ? withLocale(destHref, localeCode) : withLocale("/saved", localeCode)}
          className={`${styles.continueCard} pressable`}
        >
          <span className={styles.continueTitle}>{strings.continueTitle}</span>
          {activeTasks.length > 0 ? (
            <span className={styles.continueDescriptor}>
              {strings.continueDescriptor
                .replace("{done}", String(doneCount))
                .replace("{total}", String(activeTasks.length))}
            </span>
          ) : null}
        </Link>
      ) : null}

      <button
        type="button"
        className={`${styles.primaryCta} pressable ${listening ? styles.primaryCtaListening : ""}`}
        onClick={() => void startSpeak()}
        disabled={busy}
        aria-pressed={listening}
      >
        {listening ? (
          <span className={styles.ctaBars} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
        ) : (
          <Mic size={22} aria-hidden="true" />
        )}
        {ctaLabel}
      </button>
      {error ? <InlineNote tone="error">{error}</InlineNote> : null}

      <div className={styles.secondaryRow}>
        <Link href={withLocale("/capture/text", localeCode)} className={styles.typeInstead}>
          {strings.typeInstead}
        </Link>
        <Link href={withLocale("/clarify/unresolved", localeCode)} className={styles.typeInstead}>
          {strings.actionBrowse}
        </Link>
        <Link href={withLocale("/login", localeCode)} className={styles.typeInstead}>
          {last4 ? strings.sessionIn.replace("{last4}", last4) : strings.actionLogin}
        </Link>
      </div>

      <form className={styles.ask} onSubmit={submitAsk}>
        <label htmlFor="ask-sahayak" className={styles.askLabel}>
          {strings.askLabel}
        </label>
        <p id="ask-helper" className={styles.askHelper}>
          {strings.askHelper}
        </p>
        <textarea
          id="ask-sahayak"
          className={styles.askField}
          rows={3}
          value={ask}
          onChange={(event) => setAsk(event.target.value)}
          aria-describedby="ask-helper"
        />
        <button type="submit" className={`${styles.askSubmit} pressable`} disabled={!ask.trim()}>
          {strings.askSubmit}
        </button>
      </form>
    </div>
  );
}
