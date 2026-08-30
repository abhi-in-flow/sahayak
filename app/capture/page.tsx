import { DisclosureBanner, SkipLink } from "@/app/_components/Chrome";
import { StateGate } from "@/app/_components/StateGate";
import { DEFAULT_LOCALE, findLocale, t } from "@/app/_lib/i18n";
import { TalkScreen, type TalkStrings } from "./_components/TalkScreen";
import styles from "./page.module.css";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function S2Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locale = findLocale(firstValue(params.locale)) ?? DEFAULT_LOCALE;
  const initialQuestion = firstValue(params.q)?.slice(0, 800) ?? "";
  const autoListen = firstValue(params.listen) === "1";
  const debug = firstValue(params.debug) === "1";

  const strings: TalkStrings = {
    headline: t(locale, "s2.headline"),
    helper: t(locale, "s2.talk.helper"),
    honesty: t(locale, "s2.talk.honesty"),
    whatsReal: t(locale, "chrome.whatsReal"),
    chips: [t(locale, "s2.example1"), t(locale, "s2.example2"), t(locale, "s2.example3")],
    chipAsk: {
      ask: t(locale, "s2.replaceAsk"),
      yes: t(locale, "s2.replaceYes"),
      no: t(locale, "s2.replaceNo"),
    },
    languageChange: t(locale, "s2.languageChange"),
    fieldLabel: t(locale, "s2.fieldLabel"),
    typeHint: t(locale, "s2.talk.typeHint"),
    send: t(locale, "s2.talk.send"),
    working: t(locale, "s2.talk.working"),
    workingSearch: t(locale, "s2.talk.workingSearch"),
    workingMatch: t(locale, "s2.talk.workingMatch"),
    workingWrite: t(locale, "s2.talk.workingWrite"),
    listenAgain: t(locale, "s2.talk.listenAgain"),
    seeSteps: t(locale, "s2.talk.seeSteps"),
    followUp: t(locale, "s2.talk.followUp"),
    sources: t(locale, "s2.talk.sources"),
    micIdle: t(locale, "s2.micIdle"),
    micTapStop: t(locale, "s2.micTapStop"),
    micHoldStop: t(locale, "s2.micHoldStop"),
    errorE02: t(locale, "s2.errorE02"),
    errorE04: t(locale, "s2.errorE04"),
    errorE06: t(locale, "s2.errorE06"),
    errorAsk: t(locale, "s1.ask.error"),
    errorInsecure: t(locale, "s2.errorInsecure"),
    confirmEmptyReason: t(locale, "s2.confirmEmptyReason"),
    offlineReason: t(locale, "error.O01"),
    a11yStarted: t(locale, "s2.a11yStarted"),
    a11yStopped: t(locale, "s2.a11yStopped"),
    transcribing: t(locale, "s2.transcribing"),
  };

  return (
    <>
      <SkipLink locale={locale} />
      <DisclosureBanner locale={locale} />
      <div className="shell">
        <main id="main" className={styles.main}>
          <StateGate localeCode={locale.code}>
            <TalkScreen
              localeCode={locale.code}
              endonym={locale.endonym}
              strings={strings}
              initialQuestion={initialQuestion}
              autoListen={autoListen}
              debug={debug}
            />
          </StateGate>
        </main>
      </div>
    </>
  );
}
