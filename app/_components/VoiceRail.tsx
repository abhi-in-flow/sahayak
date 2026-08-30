"use client";

import { useSyncExternalStore } from "react";
import { Keyboard, Volume2, VolumeX, X } from "lucide-react";
import { MicButton } from "./MicButton";
import { Waveform } from "./Waveform";
import { stopSpeaking } from "../_lib/speak";
import {
  getMutedServerSnapshot,
  getMutedSnapshot,
  setMuted,
  subscribeMuted,
} from "../_lib/voice/mute";
import {
  getVoiceServerSnapshot,
  getVoiceSnapshot,
  subscribeVoice,
  type CorridorStepId,
  type VoicePhase,
} from "../_lib/voice/store";
import styles from "./VoiceRail.module.css";

/**
 * The voice corridor's persistent bottom bar (DESIGN.md D10, voice
 * tier). One rail serves S2-S5: it renders the voice pipeline state
 * (listening -> writing it down -> thinking -> speaking) and the
 * corridor step segments, and it is the primary mic affordance on every
 * corridor screen.
 *
 * Presentational only: phase/level/interim/step come from the voice
 * store, which the owning screen writes (see store.ts for the flow).
 * Capture itself stays with the screen - the engines differ per screen
 * (Sarvam batch on S2, Web Speech finals on S3) while the voice UI does
 * not, which is why the UI is shared and the capture is not.
 *
 * The one exception to presentational: the read-aloud toggle. Mute is
 * a durable preference (voice/mute.ts), not screen state, so the rail
 * owns it and silences playback directly.
 *
 * Reused primitives: MicButton (gesture rule) and Waveform (V-1).
 * Motion: V-1 waveform, V-2 breath on live states, V-3 caption fade;
 * each collapses under prefers-reduced-motion.
 */

export interface VoiceRailStrings {
  micIdle: string;
  micTapStop: string;
  micHoldStop: string;
  cancel: string;
  listening: string;
  transcribing: string;
  thinking: string;
  speaking: string;
  listenAgain: string;
  typeToggle: string;
  readAloud: string;
  steps: { speak: string; clarify: string; confirm: string; plan: string };
}

export interface VoiceRailProps {
  strings: VoiceRailStrings;
  /** Mic gesture (hold-to-talk engage / tap toggle start). */
  onStart: () => void;
  /** Stop the capture; the screen decides what the final text does. */
  onStop: () => void;
  /** Discard the in-flight recording (listening only). */
  onCancel?: () => void;
  /** Replay the last spoken reply (speaking only). */
  onListenAgain?: () => void;
  /** Typed-fallback toggle; rendered only when provided (S2 idle). */
  onKeyboard?: () => void;
  keyboardActive?: boolean;
  /** Rotating stage label while thinking, e.g. "Searching the directory…". */
  thinkingDetail?: string;
  disabled?: boolean;
  /** Shown under the pill when disabled: a reason, never a silent grey. */
  disabledReason?: string;
}

const STEP_IDS: CorridorStepId[] = ["speak", "clarify", "confirm", "plan"];

export function VoiceRail({
  strings,
  onStart,
  onStop,
  onCancel,
  onListenAgain,
  onKeyboard,
  keyboardActive = false,
  thinkingDetail,
  disabled = false,
  disabledReason,
}: VoiceRailProps) {
  const { phase, level, interim, step } = useSyncExternalStore(
    subscribeVoice,
    getVoiceSnapshot,
    getVoiceServerSnapshot,
  );
  const muted = useSyncExternalStore(
    subscribeMuted,
    getMutedSnapshot,
    getMutedServerSnapshot,
  );

  const listening = phase === "listening";
  const live = listening || phase === "speaking";

  return (
    <div className={styles.wrap}>
      {interim ? (
        <p className={styles.caption} aria-live="polite">
          {interim}
        </p>
      ) : null}

      <div className={`${styles.pill} ${live ? styles.pillLive : ""}`}>
        {phase === "transcribing" || phase === "thinking" ? (
          <div className={styles.stateRow} role="status">
            <span className={styles.breath} aria-hidden="true" />
            <span className={styles.stateLabel}>
              {phase === "transcribing" ? strings.transcribing : strings.thinking}
            </span>
            {phase === "thinking" && thinkingDetail ? (
              <span className={styles.stateDetail}>{thinkingDetail}</span>
            ) : null}
          </div>
        ) : phase === "speaking" ? (
          <div className={styles.stateRow} role="status">
            <span className={styles.speakBars} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className={styles.stateLabel}>{strings.speaking}</span>
            {onListenAgain ? (
              <button type="button" className={styles.listenAgain} onClick={onListenAgain}>
                <Volume2 size={18} aria-hidden="true" />
                {strings.listenAgain}
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <MicButton
              compact
              listening={listening}
              disabled={disabled}
              labels={{
                idle: strings.micIdle,
                tapStop: strings.micTapStop,
                holdStop: strings.micHoldStop,
              }}
              onGestureMode={() => {}}
              onStart={onStart}
              onStop={onStop}
            />
            {listening ? (
              <>
                <div className={styles.wave}>
                  <Waveform level={level} />
                </div>
                <span className={styles.liveLabel}>{strings.listening}</span>
                {onCancel ? (
                  <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label={strings.cancel}
                    onClick={onCancel}
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <span className={styles.idleLabel}>{strings.micIdle}</span>
                {onKeyboard ? (
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${keyboardActive ? styles.iconBtnActive : ""}`}
                    aria-label={strings.typeToggle}
                    aria-pressed={keyboardActive}
                    onClick={onKeyboard}
                  >
                    <Keyboard size={20} aria-hidden="true" />
                  </button>
                ) : null}
              </>
            )}
          </>
        )}
        {/* Hoisted outside the phase ternary so it is one DOM node in
            every state - a branch-local button would unmount under a
            tabbed-to user when the phase flips. */}
        <button
          type="button"
          className={`${styles.iconBtn} ${muted ? styles.iconBtnActive : ""}`}
          aria-label={strings.readAloud}
          aria-pressed={!muted}
          onClick={() => {
            const next = !muted;
            setMuted(next);
            if (next) stopSpeaking();
          }}
        >
          {muted ? (
            <VolumeX size={20} aria-hidden="true" />
          ) : (
            <Volume2 size={20} aria-hidden="true" />
          )}
        </button>
      </div>

      {disabled && disabledReason ? <p className={styles.reason}>{disabledReason}</p> : null}

      {step ? (
        <div className={styles.steps} aria-hidden="true">
          {STEP_IDS.map((id) => {
            const state =
              id === step.id ? "now" : STEP_IDS.indexOf(id) < STEP_IDS.indexOf(step.id) ? "done" : "todo";
            return (
              <span key={id} className={`${styles.segment} ${styles[state]}`}>
                <span className={styles.dot} />
                {strings.steps[id]}
                {state === "now" && step.detail ? (
                  <span className={styles.segmentDetail}>{step.detail}</span>
                ) : null}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export type { VoicePhase };
