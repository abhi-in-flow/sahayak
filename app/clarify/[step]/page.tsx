import { notFound } from "next/navigation";
import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import { DEFAULT_LOCALE, ENABLED_LOCALES, findLocale, t } from "@/app/_lib/i18n";
import type { S3Strings } from "@/app/_lib/i18n/screens/s3";
import { QUESTIONS, type QuestionId } from "@/app/_lib/journey/compute";
import { voiceRailStrings } from "@/app/_lib/voice/strings";
import { ClarifyLoop } from "../_components/ClarifyLoop";
import styles from "./page.module.css";

/**
 * S3 - Socratic Clarification Loop, one question per route (D3 S3).
 * `step` is the question order, 1..5; each question is its own history
 * entry so browser back mirrors in-app Back exactly (P2-2).
 *
 * Server Component: resolves the locale from the query parameter
 * (`withLocale` convention, D11 5) and passes PLAIN STRINGS into the
 * client island - never a LocaleDefinition, whose serialisation would
 * inline the whole string table into the flight payload (i18n/index.ts).
 *
 * `?return=s4` marks return-to-S4 mode (chip edit): the exit machine is
 * bypassed - answer recorded, recompute, straight back to /confirm.
 *
 * The T-LOCAL guard (no transcript -> /capture) runs in the island:
 * localStorage has no server-side read.
 */

interface PageProps {
  params: Promise<{ step: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Question text key per pool id (compute.ts QUESTIONS). */
const QUESTION_KEYS: Record<QuestionId, keyof S3Strings> = {
  registered: "s3.q.registered",
  state: "s3.q.state",
  work: "s3.q.work",
  assets: "s3.q.assets",
  relationship: "s3.q.relationship",
};

/** Option label key per pool id and option id; ids must match compute.ts. */
const OPTION_KEYS: Record<QuestionId, Record<string, keyof S3Strings>> = {
  registered: {
    yes: "s3.opt.registered.yes",
    no: "s3.opt.registered.no",
  },
  state: {
    assam: "s3.opt.state.assam",
    maharashtra: "s3.opt.state.maharashtra",
    karnataka: "s3.opt.state.karnataka",
  },
  work: {
    company: "s3.opt.work.company",
    retired: "s3.opt.work.retired",
    self: "s3.opt.work.self",
  },
  assets: {
    bank: "s3.opt.assets.bank",
    house: "s3.opt.assets.house",
    land: "s3.opt.assets.land",
    none: "s3.opt.assets.none",
  },
  relationship: {
    son: "s3.opt.relationship.son",
    daughter: "s3.opt.relationship.daughter",
    spouse: "s3.opt.relationship.spouse",
    other: "s3.opt.relationship.other",
  },
};

function param(
  search: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = search[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function S3QuestionPage({ params, searchParams }: PageProps) {
  const { step } = await params;
  const search = await searchParams;

  const order = Number(step);
  if (!Number.isInteger(order) || order < 1 || order > QUESTIONS.length) notFound();

  const locale = findLocale(param(search, "locale")) ?? DEFAULT_LOCALE;
  const question = QUESTIONS.find((q) => q.order === order);
  if (!question) notFound();

  // The matcher runs against both shipped locales' labels (D3 S3 voice
  // answer), so an answer in the other language still resolves.
  const other = ENABLED_LOCALES.find((l) => l.code !== locale.code) ?? locale;
  const both = (key: keyof S3Strings): string[] => [t(locale, key), t(other, key)];

  const options = question.options.map((id) => ({
    id,
    label: t(locale, OPTION_KEYS[question.id][id]!),
    voiceLabels: both(OPTION_KEYS[question.id][id]!),
  }));

  const returnToS4 = param(search, "return") === "s4";

  return (
    <>
      <SkipLink locale={locale} />
      <DisclosureBanner locale={locale} />

      <div className="shell">
        <main id="main" className={styles.main}>
          <ClarifyLoop
            key={question.id}
            localeCode={locale.code}
            step={order}
            questionId={question.id}
            questionText={t(locale, QUESTION_KEYS[question.id])}
            speakerLabel={t(locale, "s3.speaker")}
            options={options}
            absentOption={
              question.id === "state"
                ? { id: "absent", label: t(locale, "s3.opt.state.absent") }
                : null
            }
            showNotSure={question.allowUnknown}
            notSureLabel={t(locale, "s3.notSure")}
            notSureVoiceLabels={both("s3.notSure")}
            multiSelect={question.multiSelect}
            nextLabel={t(locale, "s3.next")}
            nextHint={t(locale, "s3.nextHint")}
            progressText={t(locale, "s3.progress", { n: order, total: QUESTIONS.length })}
            backLabel={t(locale, "s3.back")}
            micOfflineReason={t(locale, "error.O01")}
            audioError={t(locale, "error.E01")}
            railStrings={{
              // The rail's idle label names this screen's job: an answer,
              // not a fresh capture. Chrome strings stay the shared ones.
              ...voiceRailStrings(locale),
              micIdle: t(locale, "s3.micIdle"),
            }}
            corridorDetail={t(locale, "s3.corridorDetail", { n: order, total: QUESTIONS.length })}
            echoHeard={t(locale, "s3.echo.heard")}
            echoAnswer={t(locale, "s3.echo.answer")}
            didYouMean={t(locale, "s3.didYouMean")}
            e09Message={t(locale, "s3.e09")}
            e03Message={t(locale, "s3.e03.message")}
            e03RetryLabel={t(locale, "s3.e03.retry")}
            e03BrowseLabel={t(locale, "s3.e03.browse")}
            sheetBody={t(locale, "s3.sheet.body")}
            sheetHelpLabel={t(locale, "s3.sheet.help")}
            sheetGoBackLabel={t(locale, "s3.sheet.goBack")}
            sheetCloseLabel={t(locale, "s3.sheet.close")}
            stateCaption={t(locale, "s3.state.caption")}
            thinkingLabel={t(locale, "s3.thinking")}
            returnToS4={returnToS4}
          />
        </main>

        <GlobalFooter locale={locale} />
      </div>
    </>
  );
}
