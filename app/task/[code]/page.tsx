import { StubScreen } from "@/app/_components/StubScreen";

/** S6 — task detail. Batch-3 screen; honest stub for S5's card exits. */
export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const query = await searchParams;
  return <StubScreen localeCode={query.locale} backHref="/journey" context={`Task ${code}`} />;
}
