"use client";

import { useState } from "react";
import styles from "./Waveform.module.css";

/**
 * S2 live waveform (D11 4): a single 4px amplitude bar row, accent-700
 * bars on surface, driven by the live mic level. The parent polls the
 * AnalyserNode at most every 100 ms and passes the measured level down;
 * this component only maps it onto `transform: scaleY`, the one allowed
 * channel.
 *
 * The per-bar gains below are STATIC shaping values applied to the one
 * real measurement, so the row reads as a waveform instead of a single
 * pulsing block. The level itself is never faked.
 *
 * Reduced motion: the row collapses to a static mid-level bar while the
 * live transcript and the Stop control carry the "working" signal
 * (D11 4).
 */

const GAINS = [
  0.45, 0.7, 0.95, 0.6, 0.85, 1, 0.5, 0.75, 0.9, 0.55, 0.8, 0.65, 0.95, 0.7, 0.5, 0.85, 0.6, 1,
  0.75, 0.5, 0.9, 0.65, 0.8, 0.55,
];

export function Waveform({ level }: { level: number }) {
  // Reads only once, on first client render of a capture in progress;
  // the component never renders on the server (it exists only while
  // listening), so window is defined whenever this runs.
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
