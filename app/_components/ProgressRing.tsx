import styles from "./ProgressRing.module.css";

/**
 * Progress ring, extracted from S5 for S9 (D12 §3). Decorative by
 * mandate (DP-4): the ring alone never carries the count, the literal
 * "{done} of {n} done" text beside it is the accessible carrier. Track
 * line-300 (decorative surface), fill accent-700.
 */

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ProgressRing({ done, total, size = 44 }: { done: number; total: number; size?: number }) {
  const fraction = total > 0 ? done / total : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
      <circle className={styles.track} cx="22" cy="22" r={RADIUS} strokeWidth="4" />
      <circle
        className={styles.fill}
        cx="22"
        cy="22"
        r={RADIUS}
        strokeWidth="4"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
        transform="rotate(-90 22 22)"
      />
    </svg>
  );
}
