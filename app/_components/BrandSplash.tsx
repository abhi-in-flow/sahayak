"use client";

import { useEffect } from "react";
import { BrandMark } from "./BrandMark";
import styles from "./BrandSplash.module.css";

/** One visible brand beat on a fresh page load, even when hydration is instant. */
const SPLASH_MS = 700;

let paintedAt: number | null = null;

/**
 * Milliseconds left in this document's brand beat (0 once spent). The
 * beat is anchored to the splash's own mount, not navigation start: a
 * slow server response (dev compile, cold TTFB) must not spend the beat
 * on a splash the user has not seen yet.
 */
export function splashBeatRemaining(): number {
  if (paintedAt === null) return 0;
  return Math.max(0, SPLASH_MS - (performance.now() - paintedAt));
}

/**
 * Full-viewport branded loading state (D10 10.9): the lockup breathes on
 * --dur-breath while a gate resolves or a route streams. Never a spinner.
 */
export function BrandSplash() {
  useEffect(() => {
    if (paintedAt === null) paintedAt = performance.now();
  }, []);

  return (
    <div className={styles.splash} data-splash="" role="status" aria-busy="true">
      {/* The splash can never resolve without JS, so no-JS visitors must
          not get it: hide it and leave the server-rendered fallback
          content reachable (D3). */}
      <noscript>
        <style>{"[data-splash]{display:none}"}</style>
      </noscript>
      <div className={styles.mark}>
        <BrandMark variant="icon" size={72} decorative />
        <p className={styles.word}>Sahayak</p>
      </div>
    </div>
  );
}
