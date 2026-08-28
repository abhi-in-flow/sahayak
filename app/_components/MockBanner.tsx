import styles from "./MockBanner.module.css";

/**
 * The S8 mock banner, the loud end of the honesty-surface family
 * (D10 §10.8): hatched, 2px warn-800 top edge, literal words, minimum
 * 14px, full-bleed, radius 0. It renders directly under the disclosure
 * banner and must never be positioned so content can scroll over it.
 *
 * The hatch is the pattern, not the colour; the words carry the meaning
 * in every mode. role="note" per D6's S8 focus order, which names the
 * banner as the first anchor on the screen.
 */
export function MockBanner({ children }: { children: string }) {
  return (
    <div className={`hatch hatchEdge ${styles.banner}`} role="note">
      {children}
    </div>
  );
}
