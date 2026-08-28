import type { LocaleDefinition } from "@/app/_lib/i18n";
import { t } from "@/app/_lib/i18n";
import styles from "./StatusChip.module.css";

/**
 * Task status, per D10 10.4 and A6.
 *
 * A6 requires colour PLUS text PLUS shape. The measured relative
 * luminances of the five status colours cluster between 0.041 and 0.096,
 * so with colour removed they are not separable at all: the text and the
 * icon silhouette are doing the work. Every variant therefore ships an
 * icon with a distinct outline, and the two uncertain states are dashed.
 *
 * There is deliberately no `colour only` variant and no way to render this
 * without its label.
 */

export type TaskStatus =
  | { kind: "doNow" }
  | { kind: "locked"; document: string }
  | { kind: "inProgress" }
  | { kind: "done" }
  | { kind: "mayNotApply" }
  | { kind: "archived" };

interface Props {
  status: TaskStatus;
  locale: LocaleDefinition;
  /** Set when the chip sits on a --sunken surface, e.g. S5's collapsed
   *  "No longer needed" section. Prevents the BUG-006 tint collision. */
  onSunken?: boolean;
}

const ICONS: Record<TaskStatus["kind"], React.ReactNode> = {
  doNow: (
    <path
      d="M2 8h9M8 4l4 4-4 4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  locked: (
    <>
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  inProgress: (
    <>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 2a6 6 0 010 12z" fill="currentColor" />
    </>
  ),
  done: (
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
  mayNotApply: (
    <>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M6.4 6.2a1.7 1.7 0 013.2.8c0 1.1-1.6 1.3-1.6 2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.6" r=".8" fill="currentColor" />
    </>
  ),
  archived: (
    <>
      <rect x="2.5" y="5.5" width="11" height="8" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 3.5h12M6.5 8.5h3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
};

export function StatusChip({ status, locale, onSunken = false }: Props) {
  const className = [styles.chip, styles[status.kind], onSunken ? styles.onSunken : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={className}>
      <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
        {ICONS[status.kind]}
      </svg>
      <span>{renderLabel(status, locale)}</span>
    </span>
  );
}

function renderLabel(status: TaskStatus, locale: LocaleDefinition) {
  switch (status.kind) {
    case "locked":
      // Two spans: the status word is protected from wrapping and
      // truncation, the document name wraps freely. This split is the
      // BUG-002 resolution and must not be collapsed into one string.
      return (
        <>
          <span className={styles.word}>{t(locale, "status.locked")}</span>{" "}
          <span className={styles.detail}>
            {t(locale, "status.lockedNeeds", { document: status.document })}
          </span>
        </>
      );
    case "doNow":
      return <span className={styles.word}>{t(locale, "status.doNow")}</span>;
    case "inProgress":
      return <span className={styles.word}>{t(locale, "status.inProgress")}</span>;
    case "done":
      return <span className={styles.word}>{t(locale, "status.done")}</span>;
    case "mayNotApply":
      return <span className={styles.word}>{t(locale, "status.mayNotApply")}</span>;
    case "archived":
      return <span className={styles.word}>{t(locale, "status.noLongerNeeded")}</span>;
  }
}
