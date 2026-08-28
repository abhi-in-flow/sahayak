"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import styles from "./OfflineChip.module.css";

/**
 * O-01. D5: "You're offline. Reading works; practice submission and voice
 * need a connection." Auto-clears on reconnect.
 *
 * Connectivity is an external store, so it is read with
 * useSyncExternalStore rather than mirrored into state from an effect.
 * That also gives a correct server snapshot: the server always reports
 * online, so the chip never appears in the SSR output and cannot cause a
 * hydration mismatch.
 *
 * Takes the two strings it needs rather than a LocaleDefinition. Props of
 * a Client Component are serialised into the RSC payload, so accepting the
 * whole locale object would inline the entire string table into the HTML of
 * every page. S1 budgets 1.5s to tappable on 3G (D3 S1 Loading); the string
 * table grows with every screen, and that cost is paid on first paint.
 *
 * navigator.onLine only proves the absence of a network interface, not
 * reachability. It is still the right signal for O-01: D3 uses it to
 * disable the mic and the practice-submission entry points, a false
 * negative there is harmless, and polling to confirm would cost battery
 * on the low-end devices this product targets.
 */

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const getSnapshot = () => navigator.onLine;
const getServerSnapshot = () => true;

interface Props {
  /** D5 O-01. */
  offlineMessage: string;
  /** D6 §6.2 reconnect announcement. */
  reconnectedMessage: string;
}

export function OfflineChip({ offlineMessage, reconnectedMessage }: Props) {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const previous = useRef<boolean | null>(null);

  // D6 §6.2: both transitions are announced politely, with focus unmoved.
  // The announcement is pushed into the global live region rather than
  // rendered here, so the chip appearing never moves or steals focus.
  useEffect(() => {
    const wasOnline = previous.current;
    previous.current = online;

    // Skip the first render: an initial offline state is a condition the
    // user is already in, not a transition they need told about.
    if (wasOnline === null || wasOnline === online) return;

    const region = document.getElementById("announce-polite");
    if (region) {
      region.textContent = online ? reconnectedMessage : offlineMessage;
    }
  }, [online, offlineMessage, reconnectedMessage]);

  if (online) return null;

  return (
    <div className={styles.chip}>
      <svg
        className={styles.icon}
        viewBox="0 0 16 16"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M2 2l12 12" strokeLinecap="round" />
        <path d="M4.2 9.4a4 4 0 015.3-1.2M6.6 6.2A6.2 6.2 0 0113 8" strokeLinecap="round" />
        <circle cx="8" cy="12.2" r=".9" fill="currentColor" stroke="none" />
      </svg>
      <span>{offlineMessage}</span>
    </div>
  );
}
