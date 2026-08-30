import { Check } from "lucide-react";
import styles from "../steps.module.css";

/**
 * Progress indicator for the onboarding flow. DP-4: the segments are
 * decorative (aria-hidden, decorative line token only); the visible
 * "Step {n} of {total}" label and the step-change live announcement
 * carry the state in words. Fill animates via transform so the global
 * reduced-motion collapse flattens it cleanly.
 */
export function ProgressStepper({
  step,
  total,
  label,
}: {
  step: number;
  total: number;
  label: string;
}) {
  return (
    <div className={styles.stepper}>
      <p className={styles.stepperLabel}>{label}</p>
      <div className={styles.track} aria-hidden="true">
        {Array.from({ length: total }, (_, index) => {
          const position = index + 1;
          // Done = full, current = half, upcoming = empty. The half-fill
          // gives motion a from-state without animating width.
          const scale = position < step ? 1 : position === step ? 0.5 : 0;
          return (
            <span key={position} className={styles.segment}>
              <span className={styles.segmentFill} style={{ transform: `scaleX(${scale})` }} />
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Selection mark rendered inside a selected card. Shape channel for
 *  DP-4: the radio input announces state, this is for sighted users. */
export function SelectedCheck() {
  return (
    <span className={styles.check} aria-hidden="true">
      <Check size={20} strokeWidth={2.5} />
    </span>
  );
}
