"use client";

import { useRef, useState } from "react";
import styles from "./MicButton.module.css";

/**
 * The mic control. D3 S2 gesture rule (P2-4): the first press decides the
 * session mode. Release < 300 ms means tap-to-toggle; holding 300 ms or
 * more means hold-to-talk. The helper label follows the resolved mode
 * ("Tap to stop" / "Release to stop").
 *
 * Never icon-only (D3 S1): the text label is part of the control. The
 * recording treatment is a state change (fill + icon swap), not an
 * animation: the motion budget (D10 10.7) has no pulse in it.
 */

const GESTURE_MS = 300; // D5 5.3

export interface MicButtonProps {
  listening: boolean;
  disabled?: boolean;
  /** Shown directly below when disabled: a reason, never a silent grey (D3 S2). */
  disabledReason?: string;
  labels: { idle: string; tapStop: string; holdStop: string };
  /** Fires once, on the first gesture, with the resolved session mode. */
  onGestureMode: (mode: "tap" | "hold") => void;
  onStart: () => void;
  onStop: () => void;
}

export function MicButton({
  listening,
  disabled = false,
  disabledReason,
  labels,
  onGestureMode,
  onStart,
  onStop,
}: MicButtonProps) {
  const [mode, setMode] = useState<"tap" | "hold" | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdEngaged = useRef(false);

  function clearTimer() {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  function pointerDown() {
    if (disabled || listening) return;
    holdEngaged.current = false;
    holdTimer.current = setTimeout(() => {
      holdEngaged.current = true;
      setMode("hold");
      onGestureMode("hold");
      onStart();
    }, GESTURE_MS);
  }

  function pointerUp() {
    clearTimer();
    if (disabled) return;
    if (listening) {
      if (mode === "tap") onStop();
      return;
    }
    if (holdEngaged.current) {
      // Hold-to-talk release stops the capture.
      onStop();
      return;
    }
    // Released before the threshold: tap-to-toggle.
    setMode("tap");
    onGestureMode("tap");
    onStart();
  }

  function keyed() {
    // Keyboard activation is a toggle; the gesture rule is pointer-only.
    if (disabled) return;
    if (listening) onStop();
    else {
      if (mode === null) {
        setMode("tap");
        onGestureMode("tap");
      }
      onStart();
    }
  }

  const helper = listening
    ? mode === "hold"
      ? labels.holdStop
      : labels.tapStop
    : labels.idle;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={`${styles.button} ${listening ? styles.listening : ""}`}
        disabled={disabled}
        aria-pressed={listening}
        onPointerDown={pointerDown}
        onPointerUp={pointerUp}
        onPointerLeave={() => {
          if (holdEngaged.current && listening) {
            holdEngaged.current = false;
            onStop();
          } else {
            clearTimer();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            keyed();
          }
        }}
      >
        <span className={styles.circle} aria-hidden="true">
          {listening ? (
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
            </svg>
          ) : (
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" />
            </svg>
          )}
        </span>
        <span className={styles.label}>{listening ? labels.tapStop : labels.idle}</span>
      </button>
      <p className={styles.helper} aria-live="polite">
        {helper}
      </p>
      {disabled && disabledReason ? (
        <p className={styles.reason}>{disabledReason}</p>
      ) : null}
    </div>
  );
}
