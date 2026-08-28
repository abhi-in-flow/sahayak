import { StubScreen } from "@/app/_components/StubScreen";

/** S7 — document wallet. Batch-3 screen; stub for S5's reuse-banner exit. */
export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return <StubScreen localeCode={query.locale} backHref="/journey" />;
}
