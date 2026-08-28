import { StubScreen } from "@/app/_components/StubScreen";

/** S11 — "What's real and what's mocked". Batch-3 screen; the global footer target. */
export default async function WhatsRealPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return <StubScreen localeCode={query.locale} backHref="/" />;
}
