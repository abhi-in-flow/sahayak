"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { withLocale } from "@/app/_lib/nav";
import { readIntroSeen, readState, writeIntroSeen } from "@/app/_lib/storage/local";
import { BrandSplash, splashBeatRemaining } from "./BrandSplash";
import { FirstRunCarousel, type FirstRunCarouselStrings } from "./FirstRunCarousel";

/** First-run: language + state must be chosen before Home or Speak; the
 *  one-time intro explainer then plays between the state check and content. */
export function StateGate({
  localeCode,
  guideStrings,
  children,
}: {
  localeCode: string;
  guideStrings: FirstRunCarouselStrings;
  children: ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [intro, setIntro] = useState(false);

  useEffect(() => {
    // Hold the brand beat on a fresh page load; in-tab navigation mounts
    // find the beat spent and resolve immediately (load moment, not a
    // navigation moment).
    const timer = setTimeout(() => {
      if (!readState()) {
        router.replace(withLocale("/onboard", localeCode));
        return;
      }
      if (!readIntroSeen()) setIntro(true);
      setReady(true);
    }, splashBeatRemaining());
    return () => clearTimeout(timer);
  }, [localeCode, router]);

  function handleIntroDone() {
    writeIntroSeen();
    setIntro(false);
  }

  if (!ready) return <BrandSplash />;
  if (intro) return <FirstRunCarousel strings={guideStrings} onDone={handleIntroDone} />;
  return <>{children}</>;
}
