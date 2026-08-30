import { BrandMark } from "@/app/_components/BrandMark";
import { DisclosureBanner, SkipLink } from "@/app/_components/Chrome";
import { DEFAULT_LOCALE, ENABLED_LOCALES, findLocale, t } from "@/app/_lib/i18n";
import { OnboardFlow } from "./OnboardFlow";
import styles from "./page.module.css";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const locale = findLocale(firstValue(query.locale)) ?? DEFAULT_LOCALE;

  return (
    <>
      <SkipLink locale={locale} />
      <DisclosureBanner locale={locale} />
      <div className="shell">
        <main id="main" className={styles.main}>
          <div className={styles.brand}>
            <BrandMark variant="icon" decorative />
            <p className={styles.wordmark}>{t(locale, "s1.wordmark")}</p>
          </div>
          <h1 className={styles.headline}>{t(locale, "onboard.title")}</h1>
          <OnboardFlow
            localeCode={locale.code}
            tiles={ENABLED_LOCALES.map((candidate) => ({
              code: candidate.code,
              endonym: candidate.endonym,
            }))}
            strings={{
              lang: t(locale, "onboard.lang"),
              state: t(locale, "onboard.state"),
              helper: t(locale, "onboard.state.helper"),
              assam: t(locale, "onboard.state.assam"),
              maharashtra: t(locale, "onboard.state.maharashtra"),
              karnataka: t(locale, "onboard.state.karnataka"),
              other: t(locale, "onboard.state.other"),
              continue: t(locale, "onboard.continue"),
            }}
          />
        </main>
      </div>
    </>
  );
}
