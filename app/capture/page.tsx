import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import { DEFAULT_LOCALE, findLocale, t } from "@/app/_lib/i18n";
import { CaptureVoice, type CaptureVoiceStrings } from "./_components/CaptureVoice";
import styles from "./page.module.css";

/**
 * S2 — Problem Capture (Voice). D3 S2.
 *
 * A Server Component resolves the locale from the query parameter and
 * builds ONLY the strings the client island needs: props of a Client
 * Component are serialised into the RSC flight payload, so handing one
 * the whole LocaleDefinition would inline the entire string table into
 * this page's HTML (see the convention note in _lib/i18n/index.ts).
 *
 * The chrome (disclosure banner, skip link, global footer) is the shared
 * kit; the island owns everything inside main.
 */

export default async function S2Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locale = findLocale(typeof params.locale === "string" ? params.locale : undefined) ?? DEFAULT_LOCALE;

  const strings: CaptureVoiceStrings = {
    headline: t(locale, "s2.headline"),
    languageChange: t(locale, "s2.languageChange"),
    chips: [t(locale, "s2.example1"), t(locale, "s2.example2"), t(locale, "s2.example3")],
    chipAsk: {
      ask: t(locale, "s2.replaceAsk"),
      yes: t(locale, "s2.replaceYes"),
      no: t(locale, "s2.replaceNo"),
    },
    micIdle: t(locale, "s2.micIdle"),
    micTapStop: t(locale, "s2.micTapStop"),
    micHoldStop: t(locale, "s2.micHoldStop"),
    stop: t(locale, "s2.stop"),
    fieldLabel: t(locale, "s2.fieldLabel"),
    lowConfidence: t(locale, "s2.lowConfidence"),
    confirm: t(locale, "s2.confirm"),
    confirmEmptyReason: t(locale, "s2.confirmEmptyReason"),
    rerecord: t(locale, "s2.rerecord"),
    typeInstead: t(locale, "s2.typeInstead"),
    tryAgain: t(locale, "s2.tryAgain"),
    errorE02: t(locale, "s2.errorE02"),
    errorE04: t(locale, "s2.errorE04"),
    errorE06: t(locale, "s2.errorE06"),
    errorE07: t(locale, "s2.errorE07"),
    errorE16: t(locale, "s2.errorE16"),
    // O-01 verbatim reuse: the mic's offline reason is the global copy (D3 S2 Disabled).
    offlineReason: t(locale, "error.O01"),
    primerTitle: t(locale, "s2.primerTitle"),
    primerBody: t(locale, "s2.primerBody"),
    primerContinue: t(locale, "s2.primerContinue"),
    primerClose: t(locale, "s2.primerClose"),
    a11yStarted: t(locale, "s2.a11yStarted"),
    a11yStopped: t(locale, "s2.a11yStopped"),
  };

  return (
    <>
      <SkipLink locale={locale} />
      <DisclosureBanner locale={locale} />
      <div className="shell">
        <main id="main" className={styles.main}>
          <CaptureVoice localeCode={locale.code} endonym={locale.endonym} strings={strings} />
        </main>
        <GlobalFooter locale={locale} />
      </div>
    </>
  );
}
