"use client";

import styles from "./RetryCard.module.css";

/**
 * In-place retry card for recoverable failures (E-03 on S3, E-13 on S5).
 * Message first, one retry action, and an optional tertiary escape
 * route (D3 S3: "Browse common situations instead" after the second
 * visible failure).
 */

export interface RetryCardProps {
  message: string;
  retryLabel: string;
  onRetry: () => void;
  tertiaryLabel?: string;
  onTertiary?: () => void;
}

export function RetryCard({
  message,
  retryLabel,
  onRetry,
  tertiaryLabel,
  onTertiary,
}: RetryCardProps) {
  return (
    <section className={styles.card} role="alert">
      <p className={styles.message}>{message}</p>
      <button type="button" className={styles.retry} onClick={onRetry}>
        {retryLabel}
      </button>
      {tertiaryLabel && onTertiary ? (
        <button type="button" className={styles.tertiary} onClick={onTertiary}>
          {tertiaryLabel}
        </button>
      ) : null}
    </section>
  );
}
