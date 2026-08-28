"use client";

import { useSyncExternalStore } from "react";
import styles from "./MapLink.module.css";

/**
 * The S10 map link, with the O-01 Disabled row (D3 S10).
 *
 * Offline the link is disabled WITH its reason directly below ("never
 * silently greyed", D10 10.9); the full address stays visible in the
 * server-rendered section regardless, so the offline user keeps the one
 * thing that actually gets them to the office. Everything else on the
 * screen is unaffected.
 *
 * Connectivity is read with useSyncExternalStore (the OfflineChip
 * pattern): the server snapshot is always online, so the SSR output is
 * the live link and the chip cannot cause a hydration mismatch; the
 * online/offline events drive the swap afterwards.
 *
 * Map links never interstitial (D12 3): the copy would be false. The
 * link opens Google Maps in a new tab so the checklist and print
 * affordances stay at hand.
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
  /** Fully built maps URL, resolved on the server from offices.ts. */
  href: string;
  /** s10.mapLink. */
  label: string;
  /** s10.mapOffline, shown below the disabled link. */
  offlineReason: string;
}

export function MapLink({ href, label, offlineReason }: Props) {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (online) {
    return (
      <a className={`${styles.mapLink} pressable`} href={href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  }

  return (
    <div>
      <span className={styles.mapDisabled} aria-disabled="true">
        {label}
      </span>
      <p className={styles.offlineReason} role="status">
        {offlineReason}
      </p>
    </div>
  );
}
