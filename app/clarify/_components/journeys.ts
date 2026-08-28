import type { TaskState } from "@/app/_lib/storage/schema";

/**
 * The six pre-built browse journeys of S3e (D3 S3e table). Composition
 * is spec-given; the roster in _lib/tasks.ts holds T1 only (BUG-009),
 * so a card's step count comes from THIS table's length, never from the
 * roster, and tapping a card writes tasks only for codes that exist in
 * TASKS. When the full roster lands, nothing here changes.
 *
 * The departments count of the spec's card anatomy is deliberately
 * absent: the roster cannot compute it (BUG-009), and D11 4 forbids
 * rendering a guess.
 */

export type BrowseJourneyId = "B1" | "B2" | "B3" | "B4" | "B5" | "B6";

export interface BrowseJourney {
  id: BrowseJourneyId;
  /** T-codes from the D3 S3e table, in walk order. */
  codes: readonly string[];
}

export const BROWSE_JOURNEYS: readonly BrowseJourney[] = [
  { id: "B1", codes: ["T1", "T2", "T4", "T5", "T7", "T8", "T9"] },
  { id: "B2", codes: ["T1", "T2", "T5", "T7", "T8", "T9"] },
  { id: "B3", codes: ["T1", "T2", "T5", "T6", "T7", "T8", "T9"] },
  { id: "B4", codes: ["T1", "T2", "T5", "T7", "T8", "T9"] },
  { id: "B5", codes: ["T1"] },
  // Widest-safe superset: T1 to T9, conditional tasks flagged on S5.
  { id: "B6", codes: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9"] },
];

/** S5 manual-journey mode marker (D11 5 route contract). */
export function manualSource(id: BrowseJourneyId): string {
  return `manual:${id}`;
}

/**
 * The graph a browse selection writes: tasks for codes present in the
 * roster (today T1), all unlocked - a manual journey has no Socratic
 * answers, so nothing can be locked or pre-completed.
 */
export function manualTasks(codes: readonly string[], rosterCodes: readonly string[]): TaskState[] {
  const known = new Set(rosterCodes);
  return codes
    .filter((code) => known.has(code))
    .map((code) => ({
      code,
      status: "doNow" as const,
      ackNumber: null,
      lockReason: null,
      archived: false,
    }));
}
