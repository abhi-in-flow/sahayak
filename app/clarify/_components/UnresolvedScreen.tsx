"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { answeredCount } from "@/app/_lib/journey/compute";
import { withLocale } from "@/app/_lib/nav";
import { TASKS } from "@/app/_lib/tasks";
import {
  getJourneyServerSnapshot,
  getJourneySnapshot,
  subscribeJourney,
  updateJourney,
} from "@/app/_lib/journey/store";
import { BROWSE_JOURNEYS, manualSource, manualTasks, type BrowseJourneyId } from "./journeys";
import styles from "./UnresolvedScreen.module.css";

/**
 * S3e - Not Understood / Human Fallback (D3 S3e). Fail with dignity:
 * the transcript verbatim in a quiet card, no blame language, three
 * exits in fixed order.
 *
 * All props are plain strings; the server page maps the B1-B6 titles
 * through the "s3." namespace. The transcript itself is T-LOCAL data,
 * read through the journey store (client-side; localStorage has no
 * server-side read).
 */

export interface UnresolvedScreenProps {
  localeCode: string;
  headline: string;
  heardLabel: string;
  startOverLabel: string;
  browseLabel: string;
  personLabel: string;
  seeStepsLabel: string;
  backLabel: string;
  /** B1-B6, spec order; meta is the interpolated "{n} steps" line. */
  cards: { id: string; title: string; meta: string }[];
}

export function UnresolvedScreen(props: UnresolvedScreenProps) {
  const router = useRouter();
  const {
    localeCode,
    headline,
    heardLabel,
    startOverLabel,
    browseLabel,
    personLabel,
    seeStepsLabel,
    backLabel,
    cards,
  } = props;

  const record = useSyncExternalStore(
    subscribeJourney,
    getJourneySnapshot,
    getJourneyServerSnapshot,
  );
  const [browseOpen, setBrowseOpen] = useState(false);

  /* D3 S3e Empty row: the transcript is guaranteed by the S2/S2b submit
     gates; a missing record is not this screen's to render. Authoritative
     snapshot read, not the hydration-time value. */
  useEffect(() => {
    if (getJourneySnapshot() === null) {
      router.replace(withLocale("/capture", localeCode));
    }
  }, [localeCode, router]);

  /** Exit 1 (D3 S3e): field cleared, prior text recoverable. The
   *  transcript is stashed in T-MEM BEFORE it is cleared from T-LOCAL;
   *  the capture screens consume "sbn.restore" via ?restore=1. */
  function startOver() {
    try {
      sessionStorage.setItem("sbn.restore", record?.transcript ?? "");
    } catch {
      // T-MEM unavailable: start-over still works, without the restore link.
    }
    updateJourney((draft) => {
      draft.transcript = "";
    });
    const base = record?.inputMode === "text" ? "/capture/text" : "/capture";
    router.push(withLocale(`${base}?restore=1`, localeCode));
  }

  /** Back -> last S3 question: the deepest answered step plus one, or
   *  Q1 with no answers; /clarify/5 once all five are answered. */
  function goBack() {
    const answered = record ? answeredCount(record.answers) : 0;
    const nextStep = answered === 0 ? 1 : Math.min(answered + 1, 5);
    router.push(withLocale(`/clarify/${nextStep}`, localeCode));
  }

  function openHelp() {
    router.push(withLocale("/help", localeCode));
  }

  /** Browse card (D3 S3e): manual-journey mode. Writes source and the
   *  graph (codes present in TASKS - today T1, BUG-009), then S5 renders
   *  with its "Based on a common situation" banner as the only check;
   *  there is no confirm step here. */
  function chooseJourney(id: string) {
    const journey = BROWSE_JOURNEYS.find((j) => j.id === id);
    if (!journey) return;
    updateJourney((draft) => {
      draft.source = manualSource(journey.id);
      draft.tasks = manualTasks(journey.codes, TASKS.map((task) => task.code));
    });
    router.push(
      withLocale(`/journey?source=${manualSource(journey.id)}`, localeCode),
    );
  }

  if (record === null) {
    return (
      <div className={styles.screen} aria-busy="true">
        <div className={styles.skeleton}>
          <div className={`${styles.skeletonRow} skeleton`} style={{ width: "80%" }} />
          <div className={`${styles.skeletonRow} skeleton`} style={{ width: "100%" }} />
          <div
            className={`${styles.skeletonRow} skeleton`}
            style={{ width: "100%", minHeight: "6em" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.topRow}>
        <button type="button" className={`${styles.back} pressable`} onClick={goBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M14 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {backLabel}
        </button>
      </div>

      <h1 className={styles.headline}>{headline}</h1>

      <section className={styles.heard}>
        <p className={styles.heardLabel}>{heardLabel}</p>
        {/* Verbatim, in a quiet --sunken card (D10 10.3: sunken is the
            quiet-card token; D3 S3e: no blame language anywhere). */}
        <p className={styles.transcript}>{record.transcript}</p>
      </section>

      <div className={styles.exits}>
        <button type="button" className={`${styles.primary} pressable`} onClick={startOver}>
          {startOverLabel}
        </button>
        <button
          type="button"
          className={`${styles.secondary} pressable`}
          aria-expanded={browseOpen}
          onClick={() => setBrowseOpen((open) => !open)}
        >
          {browseLabel}
        </button>
        <button type="button" className={`${styles.secondary} pressable`} onClick={openHelp}>
          {personLabel}
        </button>
      </div>

      {browseOpen && (
        <section className={styles.browse} aria-label={browseLabel}>
          {cards.map((card) => (
            <button
              type="button"
              key={card.id}
              className={`${styles.journeyCard} pressable`}
              onClick={() => chooseJourney(card.id as BrowseJourneyId)}
            >
              <span className={styles.journeyTitle}>{card.title}</span>
              {/* Facts only: the departments count stays out while the
                  roster cannot compute it (BUG-009, D11 4). */}
              <span className={styles.journeyMeta}>{card.meta}</span>
              <span className={styles.journeyCta}>
                {seeStepsLabel}
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M9 5l7 7-7 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
