"use client";

import styles from "../[code]/[step]/page.module.css";

/**
 * Per-field dictation control. The S2 gesture mic (tap/hold, 88px) does
 * not fit a compact field row, so S8 ships its own small labelled
 * button over the shared speech.ts wrapper (D12 §4: "the existing
 * MicButton pattern where a field accepts dictation" is read through
 * D3 S1's hard rule: never icon-only). Toggle semantics: tap to start,
 * tap to stop; the state change is a fill swap, not an animation
 * (D10 10.7).
 *
 * Disabled keeps its reason directly below (D10 10.9: never silently
 * greyed) — offline carries O-01, an unsupported browser carries its
 * own sentence.
 */

export interface VoiceMicProps {
  listening: boolean;
  disabled: boolean;
  /** Shown directly below while disabled; null renders nothing. */
  reason: string | null;
  idleLabel: string;
  stopLabel: string;
  onStart: () => void;
  onStop: () => void;
}

export function VoiceMic({
  listening,
  disabled,
  reason,
  idleLabel,
  stopLabel,
  onStart,
  onStop,
}: VoiceMicProps) {
  return (
    <div className={styles.micWrap}>
      <button
        type="button"
        className={`pressable ${styles.mic} ${listening ? styles.micListening : ""}`}
        disabled={disabled}
        aria-pressed={listening}
        onClick={() => (listening ? onStop() : onStart())}
      >
        {listening ? (
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" />
          </svg>
        )}
        <span>{listening ? stopLabel : idleLabel}</span>
      </button>
      {disabled && reason ? <p className={styles.micReason}>{reason}</p> : null}
    </div>
  );
}
