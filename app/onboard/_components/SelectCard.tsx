"use client";

import type { ReactNode } from "react";
import { SelectedCheck } from "./ProgressStepper";
import styles from "../steps.module.css";

/**
 * Single-select card list for the language and region steps. The S3
 * answer-option idiom (D10 10.9) scaled to onboarding: full-width 56px
 * targets in a 2-column grid, selected = 2px accent border + accent-100
 * ground + a check mark as the shape channel.
 *
 * Native radio inputs carry the semantics and are visually hidden, so
 * arrow-key navigation and screen-reader radiogroup behaviour come free
 * (same pattern as practice/_components/OptionGroup).
 */

export interface SelectCardItem {
  value: string;
  label: string;
  /** Rendered inside the card after the label (an endonym, a hint). */
  trailing?: ReactNode;
}

export interface SelectCardGroupProps {
  name: string;
  items: readonly SelectCardItem[];
  value: string | null;
  onChange: (value: string) => void;
  /** Labels are authored in the selected language (A7); set per item. */
  lang?: (item: SelectCardItem) => string | undefined;
}

export function SelectCardGroup({ name, items, value, onChange, lang }: SelectCardGroupProps) {
  return (
    <ul className={styles.cardGrid} role="radiogroup">
      {items.map((item) => {
        const selected = value === item.value;
        return (
          <li key={item.value}>
            <label
              className={`${styles.card} ${selected ? styles.cardSelected : ""} pressable`}
            >
              <input
                type="radio"
                name={name}
                value={item.value}
                checked={selected}
                onChange={() => onChange(item.value)}
                className="sr-only"
                lang={lang?.(item)}
              />
              <span>{item.label}</span>
              {item.trailing}
              {selected ? <SelectedCheck /> : null}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
