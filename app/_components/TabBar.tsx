"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ComponentType } from "react";
import { Home, LifeBuoy, ListTodo, Mic } from "lucide-react";
import { DEFAULT_LOCALE, findLocale, t } from "@/app/_lib/i18n";
import { withLocale } from "@/app/_lib/nav";
import { readJourney } from "@/app/_lib/storage/local";
import styles from "./TabBar.module.css";

function TabBarInner() {
  const pathname = usePathname();
  const params = useSearchParams();
  const locale = findLocale(params.get("locale") ?? undefined) ?? DEFAULT_LOCALE;
  const [journeyHref, setJourneyHref] = useState("/saved");

  useEffect(() => {
    setJourneyHref(readJourney() ? "/journey" : "/saved");
  }, [pathname]);

  if (pathname.startsWith("/onboard")) return null;

  const speakActive = pathname.startsWith("/capture");
  const journeyActive =
    pathname.startsWith("/journey") ||
    pathname.startsWith("/saved") ||
    pathname.startsWith("/task") ||
    pathname.startsWith("/confirm") ||
    pathname.startsWith("/clarify") ||
    pathname.startsWith("/practice");
  const helpActive = pathname.startsWith("/help") || pathname.startsWith("/whats-real");
  const homeActive = pathname === "/";

  const tabs: { href: string; label: string; active: boolean; Icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }> }[] = [
    { href: "/", label: t(locale, "chrome.tab.home"), active: homeActive, Icon: Home },
    { href: "/capture", label: t(locale, "chrome.tab.speak"), active: speakActive, Icon: Mic },
    { href: journeyHref, label: t(locale, "chrome.tab.journey"), active: journeyActive, Icon: ListTodo },
    { href: "/help", label: t(locale, "chrome.tab.help"), active: helpActive, Icon: LifeBuoy },
  ];

  return (
    <nav className={styles.bar} aria-label={t(locale, "chrome.tab.home")}>
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={withLocale(tab.href, locale.code)}
          className={tab.active ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          aria-current={tab.active ? "page" : undefined}
        >
          <tab.Icon size={20} aria-hidden />
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function TabBar() {
  return (
    <Suspense fallback={null}>
      <TabBarInner />
    </Suspense>
  );
}
