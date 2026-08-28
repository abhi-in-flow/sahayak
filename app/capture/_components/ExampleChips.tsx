"use client";

import { useState } from "react";
import styles from "./ExampleChips.module.css";

/**
 * The 3 example chips shared by S2 and S2b (D3 S2/S2b inventory; D11 4:
 * surface ground, 1px line-600, radius 8, full 48px target, quote text
 * in ink-700).
 *
 * Overwrite rule (D3 S2 interactive elements): a chip tap while the field
 * is non-empty asks inline "Replace what you wrote?" [Replace / Keep],
 * and the ask REPLACES the chip row rather than opening a modal (D11 4).
 * The same-chip no-op is the caller's job: it owns the field value.
 */

export interface ExampleChipsStrings {
  ask: string;
  yes: string;
  no: string;
}

interface ExampleChipsProps {
  chips: [string, string, string];
  /** True when the transcript field already holds content. */
  hasContent: boolean;
  /** Called once a tap is sanctioned: field empty, or Replace confirmed. */
  onPick: (text: string) => void;
  strings: ExampleChipsStrings;
}

export function ExampleChips({ chips, hasContent, onPick, strings }: ExampleChipsProps) {
  const [pending, setPending] = useState<string | null>(null);

  function tap(value: string) {
    if (!hasContent) {
      onPick(value);
      return;
    }
    setPending(value);
  }

  if (pending) {
    return (
      <div role="status" className={styles.ask}>
        <p className={styles.askText}>{strings.ask}</p>
        <div className={styles.askActions}>
          <button
            type="button"
            className={`pressable ${styles.askButton}`}
            onClick={() => {
              onPick(pending);
              setPending(null);
            }}
          >
            {strings.yes}
          </button>
          <button
            type="button"
            className={`pressable ${styles.askKeep}`}
            onClick={() => setPending(null)}
          >
            {strings.no}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.row}>
      {chips.map((value) => (
        <button
          key={value}
          type="button"
          className={`pressable ${styles.chip}`}
          onClick={() => tap(value)}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
