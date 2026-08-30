import { BrandMark } from "@/app/_components/BrandMark";
import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import { DEFAULT_LOCALE, findLocale, t } from "@/app/_lib/i18n";
import { LoginForm } from "./LoginForm";
import styles from "./page.module.css";

/**
 * Practice login. Same invented 10-digit number and OTP 0000 as SH1.
 * Not a gate: the guest link returns to S1. Nothing is messaged.
 */

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
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
          <BrandMark variant="full" decorative wordmark={t(locale, "s1.wordmark")} />
          <h1 className={styles.headline}>{t(locale, "login.title")}</h1>
          <p className={styles.lede}>{t(locale, "login.headline")}</p>
          <LoginForm
            localeCode={locale.code}
            strings={{
              honesty: t(locale, "sh1.honesty"),
              phoneLabel: t(locale, "sh1.phone.label"),
              phoneHelper: t(locale, "sh1.phone.helper"),
              phoneCta: t(locale, "sh1.phone.cta"),
              phoneError: t(locale, "sh1.error.E10"),
              otpLabel: t(locale, "sh1.otp.label"),
              otpHelper: t(locale, "sh1.otp.helper"),
              otpCta: t(locale, "login.cta"),
              otpError: t(locale, "sh1.error.E11"),
              resend: t(locale, "sh1.otp.resend"),
              resendNote: t(locale, "sh1.otp.resendNote"),
              done: t(locale, "login.done"),
              signOut: t(locale, "login.signOut"),
              guest: t(locale, "login.guest"),
              back: t(locale, "login.back"),
              sessionIn: t(locale, "s1.session.in"),
            }}
          />
        </main>
        <GlobalFooter locale={locale} />
      </div>
    </>
  );
}
