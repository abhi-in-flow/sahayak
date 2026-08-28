import { StubScreen } from "@/app/_components/StubScreen";

/** S9 — saved journeys. Batch-3 screen; stub for S1's Continue and SH1's success exit. */
export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return <StubScreen localeCode={query.locale} backHref="/" />;
}
