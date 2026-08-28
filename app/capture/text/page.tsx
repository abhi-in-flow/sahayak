import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import { DEFAULT_LOCALE, findLocale, t } from "@/app/_lib/i18n";
import { CaptureText, type CaptureTextStrings } from "../_components/CaptureText";
import styles from "./page.module.css";

/**
 * S2b — Problem Capture (Text Fallback). D3 S2b. Full parity with S2,
 * never second-class.
 *
 * Route contract: `note=e04` (second consecutive E-04 transcription
 * failure) and `note=e05` (mic permission denied) both arrive from S2
 * with the same arrival note (D5 5.1). `mode=text` is the entry (a)
 * contract S1's "Type instead" link already ships; it turns on the
 * entry-(a) initial focus.
 */

export default async function S2bPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locale = findLocale(typeof params.locale === "string" ? params.locale : undefined) ?? DEFAULT_LOCALE;

  const note = params.note === "e04" || params.note === "e05" ? params.note : undefined;

  const strings: CaptureTextStrings = {
    headline: t(locale, "s2.headline"),
    chips: [t(locale, "s2.example1"), t(locale, "s2.example2"), t(locale, "s2.example3")],
    chipAsk: {
      ask: t(locale, "s2.replaceAsk"),
      yes: t(locale, "s2.replaceYes"),
      no: t(locale, "s2.replaceNo"),
    },
    fieldLabel: t(locale, "s2.fieldLabel"),
    guidance: t(locale, "s2.guidance"),
    submit: t(locale, "s2.submit"),
    speakInstead: t(locale, "s2.speakInstead"),
    errorE08: t(locale, "s2.errorE08"),
    errorE16: t(locale, "s2.errorE16"),
    arrivalNote: note ? t(locale, "s2.noteTyping") : null,
    // O-01 verbatim reuse: the chip text replacing "Speak instead" while
    // offline (D3 S2b inventory).
    offlineReason: t(locale, "error.O01"),
  };

  return (
    <>
      <SkipLink locale={locale} />
      <DisclosureBanner locale={locale} />
      <div className="shell">
        <main id="main" className={styles.main}>
          <CaptureText
            localeCode={locale.code}
            strings={strings}
            focusOnEntry={params.mode === "text"}
          />
        </main>
        <GlobalFooter locale={locale} />
      </div>
    </>
  );
}
