import { StubScreen } from "@/app/_components/StubScreen";

/** S10 — talk to a person. Batch-3 screen; stub for S3e's and Q2's exit. */
export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return <StubScreen localeCode={query.locale} backHref="/" />;
}
