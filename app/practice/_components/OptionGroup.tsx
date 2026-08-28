"use client";

import { errorId, helperId } from "@/app/_components/Field";
import styles from "../[code]/[step]/page.module.css";

/**
 * Compact radio group for the Appendix A radio fields (sex, where it
 * happened). The S3 option idiom (D10 10.9, D11 §4) scaled down: full
 * 48px targets, selected = 2px accent border + accent-100 ground.
 *
 * Native inputs carry the semantics; they are visually hidden and the
 * label box is the target, so keyboard arrow navigation and
 * screen-reader radiogroup behaviour all come free.
 */

export interface OptionItem {
  value: string;
  label: string;
}

export interface OptionGroupProps {
  /** Base id: inputs are f-{id}-{value}; describedby ids derive from it. */
  id: string;
  legend: string;
  options: readonly OptionItem[];
  value: string;
  error?: string;
  helper?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function OptionGroup({
  id,
  legend,
  options,
  value,
  error,
  helper,
  disabled = false,
  onChange,
  onBlur,
}: OptionGroupProps) {
  const describedBy = error ? errorId(id) : helper ? helperId(id) : undefined;
  return (
    <fieldset className={styles.options}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.optionList}>
        {options.map((option) => {
          const inputId = `f-${id}-${option.value}`;
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className={`${styles.option} ${selected ? styles.optionSelected : ""}`}
            >
              <input
                type="radio"
                name={`f-${id}`}
                id={inputId}
                value={option.value}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                onBlur={onBlur}
                aria-describedby={describedBy}
                className="sr-only"
              />
              <span className={styles.optionText}>{option.label}</span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={errorId(id)} className={styles.errorText}>
          {error}
        </p>
      ) : helper ? (
        <p id={helperId(id)} className={styles.helperText}>
          {helper}
        </p>
      ) : null}
    </fieldset>
  );
}
