"use client";

import { useState } from "react";
import styles from "./Waveform.module.css";

/**
 * Live waveform for the VoiceRail (V-1, D10 10.7): a row of accent-700
 * bars driven by the real mic level from the voice store. The rail polls
 * the AnalyserNode at most every 100 ms; this component only maps the
 * one measurement onto `transform: scaleY`, the one allowed channel.
 *
 * The per-bar gains are STATIC shaping values applied to the one real
 * measurement, so the row reads as a waveform instead of a single
 * pulsing block. The level itself is never faked.
 *
 * Reduced motion: the row collapses to a static mid-level bar; the rail
 * label and the live regions carry the state in words.
 */

const GAINS = [
  0.45, 0.7, 0.95, 0.6, 0.85, 1, 0.5, 0.75, 0.9, 0.55, 0.8, 0.65, 0.95, 0.7, 0.5, 0.85, 0.6, 1,
  0.75, 0.5, 0.9, 0.65, 0.8, 0.55,
];

export function Waveform({ level }: { level: number }) {
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const base = reduced ? 0.5 : 0.08 + level * 0.92;

  return (
    <div className={styles.row} aria-hidden="true">
      {GAINS.map((gain, i) => (
        <span
          key={i}
          className={styles.bar}
          style={{ transform: `scaleY(${Math.min(1, base * gain)})` }}
        />
      ))}
    </div>
  );
}
