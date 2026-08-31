"use client";

import { BottomSheet } from "@/app/_components/BottomSheet";
import styles from "./RecapSheet.module.css";

/**
 * Read-only recap of the talk loop's turn history (S2 voice stage).
 * The stage shows only the latest assistant reply; every earlier turn
 * demotes into this BottomSheet so nothing is lost, just quieter.
 *
 * Reuses the shared BottomSheet primitive (D10 10.9): scrim, focus trap,
 * hardware-back dismissal. Content mirrors the old thread's turn markup
 * (user bubble, assistant text, citations <details>) minus the per-turn
 * speak affordance, which lives on the rail's "Listen again".
 */

export interface RecapTurn {
  role: "user" | "assistant";
  text: string;
  followUp?: string | null;
  citations?: { title: string; url?: string }[];
}

export interface RecapSheetStrings {
  /** Sheet heading, e.g. "So far". */
  title: string;
  /** Accessible label for the sheet's X control. */
  close: string;
  /** Lead-in for an assistant follow-up question. */
  followUp: string;
  /** Citations summary label. */
  sources: string;
}

export function RecapSheet({
  open,
  onClose,
  turns,
  strings,
}: {
  open: boolean;
  onClose: () => void;
  turns: RecapTurn[];
  strings: RecapSheetStrings;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={strings.title} closeLabel={strings.close}>
      <div className={styles.list}>
        {turns.map((turn, index) => (
          <article
            key={`${turn.role}-${index}`}
            className={turn.role === "user" ? styles.user : styles.assistant}
          >
            <p className={styles.text}>{turn.text}</p>
            {turn.followUp ? (
              <p className={styles.followUp}>
                {strings.followUp} {turn.followUp}
              </p>
            ) : null}
            {turn.citations && turn.citations.length > 0 ? (
              <details className={styles.results}>
                <summary className={styles.resultsTitle}>
                  {strings.sources} ({turn.citations.length})
                </summary>
                <ol className={styles.resultsList}>
                  {turn.citations.map((cite, citeIndex) => (
                    <li key={`${cite.title}-${citeIndex}`} className={styles.resultItem}>
                      {cite.url ? (
                        <a href={cite.url} rel="noopener noreferrer">
                          {cite.title}
                        </a>
                      ) : (
                        <span>{cite.title}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
          </article>
        ))}
      </div>
    </BottomSheet>
  );
}
