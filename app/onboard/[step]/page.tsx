import { notFound } from "next/navigation";
import { BrandMark } from "@/app/_components/BrandMark";
import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import { DEFAULT_LOCALE, ENABLED_LOCALES, findLocale, t } from "@/app/_lib/i18n";
import { ONBOARD_STEPS, type OnboardStep } from "../_lib/draft";
import { OnboardFlow } from "../_components/OnboardFlow";
import styles from "../steps.module.css";

/**
 * Onboarding, one step per route: 1 language, 2 region, 3 account
 * (optional). Each step is its own history entry so browser Back
 * mirrors the in-app Back button (same route contract as S3 and S8).
 *
 * Onboarding asks only what the product cannot function without:
 * language renders the interface, region scopes the services, and the
 * account step is an optional convenience.
 *
 * Server Component: resolves the locale from the query parameter
 * (`withLocale` convention) and passes PLAIN STRINGS into the client
 * island - never a LocaleDefinition, whose serialisation would inline
 * the whole string table into the flight payload (i18n/index.ts).
 *
 * The T-LOCAL/sessionStorage guards (resume, prerequisites) run in the
 * island after hydration: local storage has no server-side read.
 */

interface PageProps {
  params: Promise<{ step: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OnboardStepPage({ params, searchParams }: PageProps) {
  const { step } = await params;
  const search = await searchParams;

  const order = Number(step);
  if (!Number.isInteger(order) || !ONBOARD_STEPS.includes(order as OnboardStep)) notFound();

  const locale = findLocale(firstValue(search.locale)) ?? DEFAULT_LOCALE;

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

          <OnboardFlow
            step={order as OnboardStep}
            urlLocale={locale.code}
            tiles={ENABLED_LOCALES.map((candidate) => ({
              code: candidate.code,
              endonym: candidate.endonym,
            }))}
            strings={{
              stepOf: t(locale, "onboard.stepOf"),
              back: t(locale, "onboard.back"),
              skip: t(locale, "onboard.skip"),
              continueLabel: t(locale, "onboard.continue"),
              finish: t(locale, "onboard.finish"),
              saving: t(locale, "onboard.saving"),
              stateReason: t(locale, "onboard.state.reason"),
              langQuestion: t(locale, "onboard.lang.question"),
              langHelper: t(locale, "onboard.lang.helper"),
              stateQuestion: t(locale, "onboard.state"),
              stateHelper: t(locale, "onboard.state.helper"),
              stateAssam: t(locale, "onboard.state.assam"),
              stateMaharashtra: t(locale, "onboard.state.maharashtra"),
              stateKarnataka: t(locale, "onboard.state.karnataka"),
              stateOther: t(locale, "onboard.state.other"),
              accountQuestion: t(locale, "onboard.account.question"),
              accountSignedIn: t(locale, "onboard.account.signedIn"),
              accountGuest: t(locale, "onboard.account.guest"),
              accountWithNumber: t(locale, "onboard.account.withNumber"),
              sh1Honesty: t(locale, "sh1.honesty"),
              phoneLabel: t(locale, "sh1.phone.label"),
              phoneHelper: t(locale, "sh1.phone.helper"),
              phoneCta: t(locale, "sh1.phone.cta"),
              phoneError: t(locale, "sh1.error.E10"),
              otpLabel: t(locale, "sh1.otp.label"),
              otpHelper: t(locale, "sh1.otp.helper"),
              otpError: t(locale, "sh1.error.E11"),
              sessionIn: t(locale, "s1.session.in"),
              signOut: t(locale, "login.signOut"),
            }}
          />
        </main>

        <GlobalFooter locale={locale} />
      </div>
    </>
  );
}
