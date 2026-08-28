import { DisclosureBanner, GlobalFooter } from "@/app/_components/Chrome";
import { DEFAULT_LOCALE, t } from "@/app/_lib/i18n";

/**
 * The service worker's navigation fallback when a page is not cached and
 * the network is gone.
 *
 * This is NOT a D5 error state and carries no E-code. It is the last
 * resort behind F3: if the user reaches it, the shell cache missed. The
 * disclosure banner still renders, because C1 admits no exceptions.
 */
export default function OfflinePage() {
  const locale = DEFAULT_LOCALE;
  return (
    <>
      <DisclosureBanner locale={locale} />
      <div className="shell">
        <main id="main" style={{ padding: "var(--sp-6) 0", display: "grid", gap: "var(--sp-3)" }}>
          <h1>{t(locale, "error.O01")}</h1>
          <p style={{ color: "var(--ink-700)" }}>
            This page has not been opened on this device yet, so there is no saved copy to show.
            Steps you have already opened are still readable.
          </p>
        </main>
        <GlobalFooter locale={locale} />
      </div>
    </>
  );
}
