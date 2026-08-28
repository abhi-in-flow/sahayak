"use client";

import styles from "./ChecklistActions.module.css";

/**
 * Print and Share for the S10 checklist.
 *
 * Print is the highest-value affordance on this screen (D3 S10: the
 * checklist is the artefact a low-literacy user carries into the
 * office), so it takes the primary treatment.
 *
 * Share builds the checklist as plain text and hands it to the OS share
 * sheet. E-22 (D5 5.1) is a SILENT behaviour substitution: when the
 * sheet is unavailable, or sharing fails for any reason other than the
 * user backing out, the browser print dialog opens with no message.
 * The user dismissing the share sheet (AbortError) is not a failure
 * and must not trigger the print fallback.
 */

interface Props {
  /** s10.printCta. */
  printLabel: string;
  /** s10.share. */
  shareLabel: string;
  /** The full checklist as plain text, assembled on the server in the
   *  selected language. */
  checklistText: string;
}

export function ChecklistActions({ printLabel, shareLabel, checklistText }: Props) {
  function print() {
    window.print();
  }

  async function share() {
    if (typeof navigator.share !== "function") {
      window.print();
      return;
    }
    try {
      await navigator.share({ text: checklistText });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      window.print();
    }
  }

  return (
    <div className={styles.actions}>
      <button type="button" className={`${styles.print} pressable`} onClick={print}>
        {printLabel}
      </button>
      <button type="button" className={`${styles.shareButton} pressable`} onClick={share}>
        {shareLabel}
      </button>
    </div>
  );
}
