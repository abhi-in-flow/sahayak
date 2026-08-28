"use client";

import styles from "./BackButton.module.css";

/**
 * S11's only interactive element. N2: Back uses history, so returning
 * never resets state. Takes the pre-interpolated s11.back string, never
 * the locale object (the Client Component serialisation rule).
 */
export function BackButton({ label }: { label: string }) {
  return (
    <button type="button" className={`${styles.back} pressable`} onClick={() => window.history.back()}>
      {label}
    </button>
  );
}
