import type { LocaleDefinition, Strings } from "@/app/_lib/i18n";
import { t } from "@/app/_lib/i18n";
import styles from "./FactChip.module.css";

/**
 * S11 fact-status chips. D3 S11; D12 4 S11.
 *
 * This is deliberately a LOCAL chip set and does NOT extend StatusChip's
 * TaskStatus union: fact status answers "is this dependency real", a
 * different axis from task progress, and D12 rules the two must not
 * share a type.
 *
 * Every variant follows the D10 10.4 chip anatomy: tint background +
 * dark text + 1px border in the dark tone + a leading icon with a
 * DISTINCT SILHOUETTE, minimal inline SVG at stroke 1.5-1.8 in the
 * StatusChip/Chrome idiom. The silhouette mapping (A6: colour plus text
 * plus shape, so greyscale and the printed checklist stay legible):
 *
 *   real     -> done-100 / done-700    + check in circle
 *   practice -> warn-100 / warn-800    + hatched square (two diagonal
 *                                 lines: the practice mark, tied to
 *                                 the D10 10.8 hatch pattern)
 *   sample   -> accent-100 / accent-800 + document glyph (rect + folded corner)
 *   static   -> accent-100 / accent-800 + shelf/lines glyph
 *   na       -> sunken / ink-500 + DASHED border + minus in circle
 *
 * Icons are aria-hidden; the text carries the meaning (DP-4). Like
 * StatusChip this is a wrapping block with a minimum height, never a
 * fixed-height pill, and never truncates (D6 6.3).
 */

export type FactStatus = "real" | "practice" | "sample" | "static" | "na";

const ICONS: Record<FactStatus, React.ReactNode> = {
  real: (
    <>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5.2 8.2l2 2 3.6-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  practice: (
    <>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 11l6-6M5 6.5L6.5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  sample: (
    <>
      <path
        d="M4 2.5h5.5L13 6v7.5H4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 2.5V6H13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </>
  ),
  static: (
    <path
      d="M3 4.5h10M3 8h10M3 11.5h6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  ),
  na: (
    <>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.2 8h5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
};

const LABEL_KEY: Record<FactStatus, keyof Strings> = {
  real: "s11.st.real",
  practice: "s11.st.practice",
  sample: "s11.st.sample",
  static: "s11.st.static",
  na: "s11.st.na",
};

export function FactChip({ status, locale }: { status: FactStatus; locale: LocaleDefinition }) {
  return (
    <span className={`${styles.chip} ${styles[status]}`}>
      <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
        {ICONS[status]}
      </svg>
      <span className={styles.word}>{t(locale, LABEL_KEY[status])}</span>
    </span>
  );
}
