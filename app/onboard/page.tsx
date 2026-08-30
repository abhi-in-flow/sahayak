import { redirect } from "next/navigation";
import { findLocale } from "@/app/_lib/i18n";
import { withLocale } from "@/app/_lib/nav";

/**
 * `/onboard` is the stable address other screens link to (StateGate,
 * the S1 state chip). The flow itself lives at `/onboard/[step]` so
 * every step is a real history entry; this route forwards to step 1
 * and is never rendered.
 */
export default async function OnboardEntryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const value = search.locale;
  const localeCode = Array.isArray(value) ? value[0] : value;
  const locale = findLocale(localeCode);
  redirect(withLocale("/onboard/1", locale?.code));
}
