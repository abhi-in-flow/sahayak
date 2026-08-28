import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import { DEFAULT_LOCALE, findLocale, t } from "@/app/_lib/i18n";
import type { S3Strings } from "@/app/_lib/i18n/screens/s3";
import { UnresolvedScreen } from "../_components/UnresolvedScreen";
import { BROWSE_JOURNEYS } from "../_components/journeys";
import styles from "./page.module.css";

/**
 * S3e - Not Understood / Human Fallback (D3 S3e).
 *
 * Server Component: resolves the locale from the query parameter and
 * passes plain strings into the client island (never a LocaleDefinition;
 * see i18n/index.ts). Entry conditions: exit machine `n = 5 ∧ conf <
 * 0.5`, or E-03's terminal option. The transcript itself lives in
 * T-LOCAL and is read client-side in the island.
 *
 * Browse cards: B1-B6 titles from the "s3." namespace; the "{n} steps"
 * count comes from the spec's T-code compositions (journeys.ts), never
 * from the roster, which cannot compute the departments count
 * (BUG-009).
 */

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const B_TITLE_KEYS: Record<string, keyof S3Strings> = {
  B1: "s3.unresolved.b1",
  B2: "s3.unresolved.b2",
  B3: "s3.unresolved.b3",
  B4: "s3.unresolved.b4",
  B5: "s3.unresolved.b5",
  B6: "s3.unresolved.b6",
};

function param(
  search: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = search[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function UnresolvedPage({ searchParams }: PageProps) {
  const search = await searchParams;
  const locale = findLocale(param(search, "locale")) ?? DEFAULT_LOCALE;

  const cards = BROWSE_JOURNEYS.map((journey) => ({
    id: journey.id,
    title: t(locale, B_TITLE_KEYS[journey.id]!),
    meta: t(locale, "s3.unresolved.steps", { n: journey.codes.length }),
  }));

  return (
    <>
      <SkipLink locale={locale} />
      <DisclosureBanner locale={locale} />

      <div className="shell">
        <main id="main" className={styles.main}>
          <UnresolvedScreen
            localeCode={locale.code}
            headline={t(locale, "s3.unresolved.headline")}
            heardLabel={t(locale, "s3.unresolved.heard")}
            startOverLabel={t(locale, "s3.unresolved.startOver")}
            browseLabel={t(locale, "s3.unresolved.browse")}
            personLabel={t(locale, "s3.unresolved.person")}
            seeStepsLabel={t(locale, "s3.unresolved.seeSteps")}
            backLabel={t(locale, "s3.back")}
            cards={cards}
          />
        </main>

        <GlobalFooter locale={locale} />
      </div>
    </>
  );
}
