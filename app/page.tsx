import { headers } from "next/headers";
import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import { S1Entry } from "@/app/_components/S1Entry";
import { ENABLED_LOCALES, preferredLocale, t } from "@/app/_lib/i18n";
import { TASKS, EXPECTED_TASK_COUNT, ROSTER_IS_COMPLETE } from "@/app/_lib/tasks";
import styles from "./page.module.css";

/**
 * S1 — Entry & Language Selection. D3 S1.
 *
 * A Server Component, which is what makes the no-JS fallback below real
 * rather than aspirational: the task list is in the delivered HTML. The
 * interactive layer (Continue card, audio previews, CTAs) lives in
 * S1Entry, a client island that takes plain strings only.
 *
 * Deliberately out of scope here: recorded audio assets for the 2 s
 * greeting (A5). The preview uses client speech synthesis and degrades
 * to E-01 when it cannot play.
 */

export default async function S1Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const headerList = await headers();
  const params = await searchParams;

  // Pre-highlight only. D3 S1: "Unsupported device locale -> English tile
  // pre-highlighted, never auto-advance." Nothing here navigates.
  const preferred = preferredLocale(headerList.get("accept-language") ?? undefined);

  // The chrome renders in the pre-highlighted language until a tile is
  // tapped; the chosen locale then rides the URL and T-LOCAL.
  const locale = preferred;
  const fromS2 = params.from === "s2";

  return (
    <>
      <SkipLink locale={locale} />
      <DisclosureBanner locale={locale} />

      <div className="shell">
        <main id="main" className={styles.main}>
          <p className={styles.wordmark}>{t(locale, "s1.wordmark")}</p>

          {/* h1 is first in the page but is not focused programmatically:
              D6 6.1 requires no focus steal on load. */}
          <h1 className={styles.headline}>{t(locale, "s1.headline")}</h1>

          <S1Entry
            localeCode={locale.code}
            preferredCode={preferred.code}
            fromS2={fromS2}
            tiles={ENABLED_LOCALES.map((candidate) => ({
              code: candidate.code,
              endonym: candidate.endonym,
              greeting: t(candidate, "s1.audioGreeting"),
            }))}
            strings={{
              continueTitle: t(locale, "s1.continueTitle"),
              continueDescriptor: t(locale, "s1.continueDescriptor"),
              backToQuestion: t(locale, "s1.backToQuestion"),
              micCta: t(locale, "s1.micCta"),
              typeInstead: t(locale, "s1.typeInstead"),
              audioPreviewLabel: t(locale, "s1.audioPreviewLabel"),
              audioError: t(locale, "error.E01"),
            }}
          />

          <p className={styles.trustStrip}>{t(locale, "s1.trustStrip")}</p>

          {/* D3 S1 edge case: "JS unavailable/failed -> server-rendered
              static fallback: the 9 tasks in order with official links."
              Rendered inside <noscript> so it is delivered in the HTML and
              costs nothing when scripting works. */}
          <noscript>
            <section className={styles.noJs} aria-labelledby="nojs-heading">
              <h2 id="nojs-heading">{t(locale, "s1.noJsHeading")}</h2>
              <p>{t(locale, "s1.noJsIntro")}</p>
              <ol className={styles.noJsList}>
                {TASKS.map((task) => (
                  <li key={task.code}>
                    <a href={task.sourceUrl} rel="noopener noreferrer">
                      {task.name}
                    </a>
                    {/* C4: provenance on every seeded item. Discrete lines
                        rather than a dot-separated run (BUG-004 rationale). */}
                    <span className={styles.noJsMeta}>{task.department}</span>
                    <span className={styles.noJsMeta}>{task.state}</span>
                    <span className={styles.noJsMeta}>Last verified {task.lastVerified}</span>
                  </li>
                ))}
              </ol>
              {!ROSTER_IS_COMPLETE && (
                <p className={styles.gap}>
                  {TASKS.length} of {EXPECTED_TASK_COUNT} steps are listed here. The remaining steps
                  are not yet published. For help with anything not listed, contact your district
                  legal services authority.
                </p>
              )}
            </section>
          </noscript>
        </main>

        <GlobalFooter locale={locale} />
      </div>
    </>
  );
}
