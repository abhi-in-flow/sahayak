import Link from "next/link";
import { DisclosureBanner, GlobalFooter, SkipLink } from "./Chrome";
import { DEFAULT_LOCALE, findLocale, t } from "../_lib/i18n";
import { withLocale } from "../_lib/nav";
import styles from "./StubScreen.module.css";

/**
 * Honest placeholder for the batch-3 screens (S6, S7, S9, S10, S11).
 * Batch-2 exit conditions point at these routes; an honest "not built
 * yet" screen beats a 404 or, worse, a fake screen. Content is the
 * base "stub." namespace; nothing here pretends to be specified UI.
 */
export function StubScreen({
  localeCode,
  backHref = "/",
  context,
}: {
  localeCode?: string | string[];
  backHref?: string;
  context?: string;
}) {
  const locale = findLocale(typeof localeCode === "string" ? localeCode : undefined) ?? DEFAULT_LOCALE;

  return (
    <>
      <SkipLink locale={locale} />
      <DisclosureBanner locale={locale} />
      <div className="shell">
        <main id="main" className={styles.main}>
          <section className={styles.card}>
            <h1 className={styles.title}>{t(locale, "stub.title")}</h1>
            {context ? <p className={styles.context}>{context}</p> : null}
            <p className={styles.note}>{t(locale, "stub.note")}</p>
            <Link href={withLocale(backHref, locale.code)} className={`${styles.back} pressable`}>
              {t(locale, "stub.back")}
            </Link>
          </section>
        </main>
        <GlobalFooter locale={locale} />
      </div>
    </>
  );
}
