import type { ReactElement } from "react";
import styles from "./Field.module.css";

/**
 * Form field per D10 10.9: label ABOVE in the label weight, never
 * placeholder-as-label; helper text optional; error text BELOW in
 * --err-700. The caller wires aria-describedby from the exported id
 * helpers so screen readers announce helper and error with the field
 * (D6 6.2).
 */

export function helperId(id: string) {
  return `${id}-helper`;
}

export function errorId(id: string) {
  return `${id}-error`;
}

export interface FieldProps {
  id: string;
  label: string;
  helper?: string;
  error?: string;
  /** Soft character counter: renders once value >= showAt (D5 5.3: 400 of 500). */
  counter?: { value: number; max: number; showAt: number };
  children: ReactElement;
}

export function Field({ id, label, helper, error, counter, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children}
      {counter && counter.value >= counter.showAt ? (
        <p className={styles.counter} aria-live="polite">
          {counter.value}/{counter.max}
        </p>
      ) : null}
      {helper && !error ? (
        <p id={helperId(id)} className={styles.helper}>
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId(id)} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
