"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { LocaleDefinition } from "@/app/_lib/i18n";
import { DEFAULT_LOCALE, findLocale, t } from "@/app/_lib/i18n";
import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import { announce } from "@/app/_lib/announce";
import { withLocale } from "@/app/_lib/nav";
import { getJourneySnapshot } from "@/app/_lib/journey/store";
import { readLocale } from "@/app/_lib/storage/local";
import styles from "../[code]/[step]/page.module.css";

/**
 * The S8 result screen (`/practice/{code}/done`). D3 S8 result; D6 6.2.
 *
 * It renders exactly one practice artefact: the ack in --font-mono on a
 * loud .hatch band, what-next and what-to-keep, the auto-add
 * confirmation with the wallet link (focus=DOC-DEATH, return=task:code
 * per D12 §2), and the way back to the task. The step screens carry the
 * MockBanner; here the hatched ack band is the honesty surface, so the
 * two hatch treatments never stack.
 *
 * Guards: no ack for this task (direct deep link, or submit never ran)
 * routes to /task/{code}; no journey preserves the destination in
 * sessionStorage "sbn.dest" and routes to S1 (N5), the same contract as
 * the step screens.
 */

export function DoneResult({ code }: { code: string }) {
  const search = useSearchParams();
  const router = useRouter();
  const [locale, setLocale] = useState<LocaleDefinition | null>(null);
  const [ack, setAck] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  /* Locale, guard and focus resolve after mount: T-LOCAL and the store
     have no server-side read. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const effLocale = findLocale(search.get("locale") ?? readLocale() ?? undefined) ?? DEFAULT_LOCALE;
    setLocale(effLocale);

    const record = getJourneySnapshot();
    if (!record) {
      try {
        sessionStorage.setItem("sbn.dest", window.location.pathname + window.location.search);
      } catch {
        // Destination memory is best-effort; the redirect stands.
      }
      router.replace(withLocale("/", effLocale.code));
      return;
    }
    const taskAck = record.tasks.find((task) => task.code === code)?.ackNumber ?? null;
    if (!taskAck) {
      // No ack: the result screen is unreachable; S6 renders its own
      // honest state instead (D3 S6 read-only modes).
      router.replace(withLocale(`/task/${code}`, effLocale.code));
      return;
    }
    setAck(taskAck);
    // D6 6.2 S8 result: focus the result heading; the polite region
    // carries the same fact for non-visual users.
    requestAnimationFrame(() => headingRef.current?.focus());
    announce(t(effLocale, "s8.announceDone", { ack: taskAck }));
  }, [code, router, search]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!locale || !ack) {
    /* Loading: skeleton in the shape of the result (never a spinner). */
    return (
      <div className="shell">
        <main id="main" className={styles.main} aria-busy="true">
          <div className={styles.loading}>
            <div className={`skeleton ${styles.skLine}`} />
            <div className={`skeleton ${styles.skAck}`} />
            <div className={`skeleton ${styles.skLine}`} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <SkipLink locale={locale} />
      <DisclosureBanner locale={locale} />
      <div className="shell">
        <main id="main" className={styles.main}>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className={styles.doneHeading}
          >
            {t(locale, "s8.doneHeading")}
          </h1>

          {/* The practice artefact: loud hatch + monospace ack (D10 10.8). */}
          <div className={`hatch hatchEdge ${styles.ackBand}`}>
            <span className={styles.ackLabel}>{t(locale, "s8.ackLabel")}</span>
            <span className={styles.ackNumber}>{ack}</span>
            <span className={styles.ackNote}>{t(locale, "s8.ackNote")}</span>
          </div>

          <section className={styles.doneSection}>
            <h2 className={styles.doneSectionTitle}>{t(locale, "s8.resultNextTitle")}</h2>
            <p className={styles.doneBody}>{t(locale, "s8.resultNextBody")}</p>
          </section>

          <section className={styles.doneSection}>
            <h2 className={styles.doneSectionTitle}>{t(locale, "s8.resultKeepTitle")}</h2>
            <p className={styles.doneBody}>{t(locale, "s8.resultKeepBody")}</p>
          </section>

          {/* P1-3 auto-add confirmation, rendered inline (no toast layer). */}
          <div className={styles.added}>
            <p className={styles.addedText}>{t(locale, "s8.autoAdd")}</p>
            <Link
              href={withLocale(`/documents?focus=DOC-DEATH&return=task:${code}`, locale.code)}
              className={`pressable ${styles.secondary}`}
            >
              {t(locale, "s8.viewWallet")}
            </Link>
          </div>

          <Link href={withLocale(`/task/${code}`, locale.code)} className={styles.tertiary}>
            {t(locale, "s8.backToTask")}
          </Link>
        </main>
        <GlobalFooter locale={locale} />
      </div>
    </>
  );
}

