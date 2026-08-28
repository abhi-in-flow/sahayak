"use client";

import { BottomSheet } from "./BottomSheet";
import styles from "./Interstitial.module.css";

/**
 * The N6 interstitial: a full sheet before every external government
 * navigation from S6. BottomSheet provides the focus trap, the back
 * dismissal and the M-4 250ms enter.
 *
 * "Continue" opens the official site in a new tab (noopener); the
 * prototype stays intact. "Stay" closes. Map links and tel: links do
 * not pass through here: the copy would be false (D12 §3).
 */

export interface InterstitialProps {
  open: boolean;
  url: string;
  host: string;
  labels: {
    title: string;
    body: string;
    continue: string;
    stay: string;
    close: string;
  };
  onClose: () => void;
}

export function Interstitial({ open, url, host, labels, onClose }: InterstitialProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={labels.title} closeLabel={labels.close}>
      <div className={styles.body}>
        <p className={styles.text}>{labels.body}</p>
        <p className={styles.host}>{host}</p>
        <div className={styles.actions}>
          <a
            className={`${styles.continue} pressable`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
          >
            {labels.continue}
          </a>
          <button type="button" className={`${styles.stay} pressable`} onClick={onClose}>
            {labels.stay}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
