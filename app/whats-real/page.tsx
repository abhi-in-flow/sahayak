import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import type { LocaleDefinition, Strings } from "@/app/_lib/i18n";
import { DEFAULT_LOCALE, findLocale, t } from "@/app/_lib/i18n";
import { BackButton } from "./_components/BackButton";
import { FactChip, type FactStatus } from "./_components/FactChip";
import styles from "./page.module.css";

/**
 * S11 - "What's real and what's mocked here" (C7). D3 S11; D12 4.
 *
 * Static Server Component. Loading, Empty and Error CANNOT OCCUR: all
 * ten rows are bundled content compiled into this route. There is no
 * fetch, no cache dependency and no user input, so there is nothing to
 * load, nothing to be empty and nothing to fail. The state table's
 * other rows are unreachable for that reason.
 *
 * The nine rows ship the D3 S11 copy verbatim (dash characters already
 * rewritten per D11 1 in s11.ts). Focus order (D6 6.1 S11): the list,
 * readable top to bottom, then Back - the only interactive element.
 * Back uses history, never resetting state (N2).
 *
 * The chips are a LOCAL fact-status set (FactChip); they do not extend
 * StatusChip's TaskStatus union.
 */

interface Row {
  label: keyof Strings;
  note: keyof Strings;
  status: FactStatus;
}

const ROWS: readonly Row[] = [
  { label: "s11.row1.label", note: "s11.row1.note", status: "real" },
  { label: "s11.row2.label", note: "s11.row2.note", status: "real" },
  { label: "s11.row3.label", note: "s11.row3.note", status: "practice" },
  { label: "s11.row4.label", note: "s11.row4.note", status: "practice" },
  { label: "s11.row5.label", note: "s11.row5.note", status: "practice" },
  { label: "s11.row6.label", note: "s11.row6.note", status: "sample" },
  { label: "s11.row7.label", note: "s11.row7.note", status: "static" },
  { label: "s11.row8.label", note: "s11.row8.note", status: "static" },
  { label: "s11.row9.label", note: "s11.row9.note", status: "na" },
  { label: "s11.row10.label", note: "s11.row10.note", status: "static" },
];

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WhatsRealPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const locale: LocaleDefinition = findLocale(firstValue(query.locale)) ?? DEFAULT_LOCALE;

  return (
    <>
      <SkipLink locale={locale} />
      <DisclosureBanner locale={locale} />
      <div className="shell">
        <main id="main" className={styles.main}>
          <h1 className={styles.heading}>{t(locale, "s11.title")}</h1>

          <ul className={styles.rows}>
            {ROWS.map((row) => (
              <li key={row.label} className={styles.row}>
                <div className={styles.rowText}>
                  <span className={styles.rowLabel}>{t(locale, row.label)}</span>
                  <span className={styles.rowNote}>{t(locale, row.note)}</span>
                </div>
                <FactChip status={row.status} locale={locale} />
              </li>
            ))}
          </ul>

          {/* C1 restated as prose. */}
          <p className={styles.disclosure}>{t(locale, "chrome.disclosure")}</p>

          <BackButton label={t(locale, "s11.back")} />
        </main>
        <GlobalFooter locale={locale} />
      </div>
    </>
  );
}
