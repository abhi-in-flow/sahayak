"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { speak } from "../_lib/speak";
import { withLocale } from "../_lib/nav";
import {
  getJourneyServerSnapshot,
  getJourneySnapshot,
  subscribeJourney,
} from "../_lib/journey/store";
import { InlineNote } from "./InlineNote";
import styles from "../page.module.css";

/**
 * S1's interactive layer (D3 S1). The Server Component delivers the
 * static shell and the no-JS fallback; this island owns the parts that
 * need the client: the Continue card (entry b, T-LOCAL read), the
 * "Back to your question" affordance (entry c), the per-tile audio
 * preview (A5) and the mic/type CTAs.
 *
 * Takes plain strings, never a LocaleDefinition (see i18n/index.ts for
 * the payload convention).
 */

/** sbn.dest is a one-shot handoff, not a live store: it never changes
 *  within a mount, so the subscription is a no-op and the snapshot is a
 *  plain read. Only internal paths are honoured. */
function subscribeSessionDest(): () => void {
  return () => {};
}
function getSessionDest(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const dest = sessionStorage.getItem("sbn.dest");
  return dest && dest.startsWith("/") ? dest : null;
}

export interface S1EntryProps {
  localeCode: string;
  preferredCode: string;
  /** Entry (c): re-entry from S2's language pill. */
  fromS2: boolean;
  tiles: { code: string; endonym: string; greeting: string }[];
  strings: {
    continueTitle: string;
    continueDescriptor: string;
    backToQuestion: string;
    micCta: string;
    typeInstead: string;
    audioPreviewLabel: string;
    audioError: string;
  };
}

export function S1Entry({ localeCode, preferredCode, fromS2, tiles, strings }: S1EntryProps) {
  const journey = useSyncExternalStore(
    subscribeJourney,
    getJourneySnapshot,
    getJourneyServerSnapshot,
  );
  const [audioFailed, setAudioFailed] = useState(false);
  /** N5: a deep link that arrived with no journey preserved its
     destination under sbn.dest (S6/S8 write it). Read through
     useSyncExternalStore so the server snapshot is null and hydration
     never mismatches; the Continue card returns the user there once a
     journey exists, and the memory is cleared after it is used. */
  const destHref = useSyncExternalStore(
    subscribeSessionDest,
    getSessionDest,
    () => null,
  );

  useEffect(() => {
    if (journey && destHref) sessionStorage.removeItem("sbn.dest");
  }, [journey, destHref]);

  const activeTasks = journey?.tasks.filter((t) => !t.archived) ?? [];
  const hasActiveJourney =
    journey !== null &&
    (journey.transcript.trim().length > 0 || activeTasks.some((t) => t.status !== "done"));
  const doneCount = activeTasks.filter((t) => t.status === "done").length;

  function preview(code: string, greeting: string) {
    speak(greeting, code).then((ok) => {
      if (!ok) setAudioFailed(true);
    });
  }

  return (
    <div className={styles.entry}>
      {fromS2 ? (
        <Link href={withLocale("/capture", localeCode)} className={styles.backToQuestion}>
          {strings.backToQuestion}
        </Link>
      ) : null}

      {hasActiveJourney ? (
        <Link
          href={destHref ? withLocale(destHref, localeCode) : withLocale("/saved", localeCode)}
          className={`${styles.continueCard} pressable`}
        >
          <span className={styles.continueTitle}>{strings.continueTitle}</span>
          {activeTasks.length > 0 ? (
            <span className={styles.continueDescriptor}>
              {strings.continueDescriptor
                .replace("{done}", String(doneCount))
                .replace("{total}", String(activeTasks.length))}
            </span>
          ) : null}
        </Link>
      ) : null}

      <ul className={styles.tiles}>
        {tiles.map((tile) => (
          <li
            key={tile.code}
            className={[styles.tile, tile.code === preferredCode ? styles.tilePreferred : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <Link
              href={withLocale("/capture", tile.code)}
              hrefLang={tile.code}
              lang={tile.code}
              className={styles.tileMain}
            >
              {/* Self-labelled in its own script, never translated. */}
              <span className={styles.tileEndonym}>{tile.endonym}</span>
            </Link>
            <button
              type="button"
              className={styles.speaker}
              lang={tile.code}
              aria-label={strings.audioPreviewLabel}
              onClick={() => preview(tile.code, tile.greeting)}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M4 9v6h4l5 4V5L8 9H4z" strokeLinejoin="round" />
                <path d="M16.5 8.5a5 5 0 010 7" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {audioFailed ? (
        <InlineNote autoClearMs={4000} onCleared={() => setAudioFailed(false)}>
          {strings.audioError}
        </InlineNote>
      ) : null}

      <div className={styles.micRow}>
        <Link href={withLocale("/capture", localeCode)} className={`${styles.micButton} pressable`}>
          <span className={styles.micCircle} aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" />
            </svg>
          </span>
          {/* Never icon-only (D3 S1). */}
          <span className={styles.micLabel}>{strings.micCta}</span>
        </Link>

        <Link href={withLocale("/capture/text", localeCode)} className={styles.typeInstead}>
          {strings.typeInstead}
        </Link>
      </div>
    </div>
  );
}
