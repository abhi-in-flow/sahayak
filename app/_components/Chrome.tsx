import Link from "next/link";
import type { LocaleDefinition } from "@/app/_lib/i18n";
import { t } from "@/app/_lib/i18n";
import styles from "./Chrome.module.css";

/**
 * C1. Persistent, top of every screen, non-dismissible, role="note",
 * and in the tab order once at the top (D6 6.1).
 *
 * There is no `dismissible` prop and there must never be one. If this
 * component gains a way to be hidden, C1 is broken.
 */
export function DisclosureBanner({ locale }: { locale: LocaleDefinition }) {
  return (
    <div className={styles.disclosure} role="note" tabIndex={0}>
      {t(locale, "chrome.disclosure")}
    </div>
  );
}

/**
 * The global footer link to S11, reachable from every screen and last in
 * the tab order (D6 6.1). Following it never resets state (N2).
 */
export function GlobalFooter({ locale }: { locale: LocaleDefinition }) {
  return (
    <footer className={styles.footer}>
      <Link href="/whats-real" className={styles.footerLink}>
        {t(locale, "chrome.whatsReal")}
      </Link>
    </footer>
  );
}

export function SkipLink({ locale }: { locale: LocaleDefinition }) {
  return (
    <a href="#main" className={styles.skip}>
      {t(locale, "chrome.skipToContent")}
    </a>
  );
}
