"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { withLocale } from "@/app/_lib/nav";
import { readState } from "@/app/_lib/storage/local";

/** First-run: language + state must be chosen before Home or Speak. */
export function StateGate({
  localeCode,
  children,
}: {
  localeCode: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!readState()) {
      router.replace(withLocale("/onboard", localeCode));
      return;
    }
    setReady(true);
  }, [localeCode, router]);

  if (!ready) return null;
  return <>{children}</>;
}
