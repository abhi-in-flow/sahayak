import type { RecordedAnswer, TaskState } from "../storage/schema";

/**
 * The Socratic engine's deterministic core. String-free by design:
 * questions and options are ids, and the UI maps ids to labels through
 * the i18n "s3." namespace. That keeps this module script-agnostic and
 * unit-testable.
 *
 * PROTOTYPE ENGINE. D3's exit machine is implemented faithfully; the
 * inputs to it (confidence) come from a transparent heuristic rather
 * than a model, so the whole flow is demoable and honest. Replacing
 * `confidence` with a model score is the intended upgrade path and
 * touches nothing else in this file.
 */

export type QuestionId =
  | "registered"
  | "state"
  | "work"
  | "assets"
  | "relationship";

export interface QuestionDef {
  id: QuestionId;
  /** Ask order. D3 S3 selects by "highest information gain from pool";
      the pool's spec listing is that ranking, held constant here.
      DEFAULT (assumed): a D9 row until a model scores gain. */
  order: 1 | 2 | 3 | 4 | 5;
  options: readonly string[];
  /** Q2 omits "I'm not sure": a journey cannot be state-scoped without
      a state, so the honesty exit is the explicit sheet instead (D3 S3
      edge case). */
  allowUnknown: boolean;
  multiSelect: boolean;
  /** Q4: "None" excludes every other selection and vice versa. */
  exclusive?: string;
}

export const QUESTIONS: readonly QuestionDef[] = [
  {
    id: "registered",
    order: 1,
    options: ["yes", "no"],
    allowUnknown: true,
    multiSelect: false,
  },
  {
    id: "state",
    order: 2,
    // Q-A: two seeded states. O-D2 confirms the second.
    options: ["assam", "maharashtra"],
    allowUnknown: false,
    multiSelect: false,
  },
  {
    id: "work",
    order: 3,
    // Derived from the browse compositions: B1 company, B2 retired,
    // B4 self-employed.
    options: ["company", "retired", "self"],
    allowUnknown: true,
    multiSelect: false,
  },
  {
    id: "assets",
    order: 4,
    // Derived from S4's example summary (bank account, house) and B3
    // (land). Confirm with the author alongside the T-roster.
    options: ["bank", "house", "land", "none"],
    allowUnknown: true,
    multiSelect: true,
    exclusive: "none",
  },
  {
    id: "relationship",
    order: 5,
    // S4's example ("You are his son") and B1/B3's spouse/parent cases.
    options: ["son", "daughter", "spouse", "other"],
    allowUnknown: true,
    multiSelect: false,
  },
];

export function questionById(id: QuestionId): QuestionDef {
  const found = QUESTIONS.find((q) => q.id === id);
  if (!found) throw new Error(`Unknown question ${id}`);
  return found;
}

/* ------------------------------------------------------------------ */
/* recorded-answer helpers                                             */
/* ------------------------------------------------------------------ */

/** The live (non-archived) value for a single-select question. */
export function recordedValue(
  answers: RecordedAnswer[],
  id: QuestionId,
): string | undefined {
  return answers.find((a) => a.questionId === id && !a.archived)?.value;
}

/** The live selections for a multi-select question. */
export function recordedValues(
  answers: RecordedAnswer[],
  id: QuestionId,
): string[] {
  return answers
    .filter((a) => a.questionId === id && !a.archived && a.value !== "unknown")
    .map((a) => a.value);
}

export function isUnsure(answers: RecordedAnswer[], id: QuestionId): boolean {
  return recordedValue(answers, id) === "unknown";
}

/* ------------------------------------------------------------------ */
/* confidence heuristic                                                */
/* ------------------------------------------------------------------ */

/**
 * DEFAULT (assumed) weights; a D9 row. Credit per question, over all
 * five, so an unasked question counts as not-yet-known rather than
 * absent. All-unknown floors at 0.52, which routes the "all answers
 * unsure" case into the machine's widest-safe row. That is deliberate:
 * D3's S3 edge case demands a journey for all-unsure, never nothing.
 * With these weights conf < 0.5 is unreachable through answers alone,
 * so S3e's machine entry is exercised today only via E-03; the row
 * stays for a model-backed score.
 */
const BASE_CONFIDENCE = 0.22;
const CREDIT: Record<QuestionId, { definite: number; unknown: number }> = {
  registered: { definite: 0.15, unknown: 0.06 },
  state: { definite: 0.3, unknown: 0 },
  work: { definite: 0.1, unknown: 0.06 },
  assets: { definite: 0.08, unknown: 0.06 },
  relationship: { definite: 0.16, unknown: 0.06 },
};

export function confidence(answers: RecordedAnswer[]): number {
  let score = BASE_CONFIDENCE;
  for (const q of QUESTIONS) {
    const value = recordedValue(answers, q.id);
    if (value === undefined) continue;
    score += value === "unknown" ? CREDIT[q.id].unknown : CREDIT[q.id].definite;
  }
  return Math.min(score, 0.95);
}

/* ------------------------------------------------------------------ */
/* the exit machine (D3 S3, authoritative and total)                   */
/* ------------------------------------------------------------------ */

export type ExitDecision =
  | { to: "s4"; mode: "confident" | "widest-safe" }
  | { to: "next"; question: QuestionId }
  | { to: "s3e" };

export function answeredCount(answers: RecordedAnswer[]): number {
  const seen = new Set(
    answers.filter((a) => !a.archived).map((a) => a.questionId),
  );
  return seen.size;
}

export function decideExit(answers: RecordedAnswer[]): ExitDecision {
  const conf = confidence(answers);
  const n = answeredCount(answers);
  if (conf >= 0.8) return { to: "s4", mode: "confident" };
  if (n < 5) {
    const next = QUESTIONS.find(
      (q) => recordedValue(answers, q.id) === undefined,
    );
    if (next) return { to: "next", question: next.id };
  }
  if (conf >= 0.5) return { to: "s4", mode: "widest-safe" };
  return { to: "s3e" };
}

/* ------------------------------------------------------------------ */
/* journey graph                                                       */
/* ------------------------------------------------------------------ */

/**
 * What the recorded answers make true. With the roster at T1 only
 * (BUG-009) the graph holds T1, which is always unlocked: it is the
 * first task of every browse journey and the minimum journey (B5).
 * `unknownDerived` lists codes that WOULD carry "may not apply" once
 * the full roster lands, so S4 can already flag the summary honestly.
 */
export interface JourneyGraph {
  tasks: TaskState[];
  unknownDerived: string[];
  seededState: string | null;
}

export function computeGraph(answers: RecordedAnswer[]): JourneyGraph {
  const registered = recordedValue(answers, "registered");
  const state = recordedValue(answers, "state");

  const unknownDerived: string[] = [];
  if (isUnsure(answers, "work")) unknownDerived.push("work-derived");
  if (isUnsure(answers, "assets")) unknownDerived.push("asset-derived");
  if (isUnsure(answers, "relationship")) unknownDerived.push("heir-derived");

  const preCompleted = registered === "yes";
  const t1: TaskState = {
    code: "T1",
    // D4 4.4: Q1 Yes renders T1 pre-completed; no ack number exists.
    status: preCompleted ? "done" : "doNow",
    ackNumber: null,
    lockReason: null,
    archived: false,
    preCompleted,
  };

  return {
    tasks: [t1],
    unknownDerived,
    seededState: state === "unknown" ? null : (state ?? null),
  };
}

/* ------------------------------------------------------------------ */
/* recompute diff (D4 4.4)                                             */
/* ------------------------------------------------------------------ */

export interface GraphDiff {
  added: TaskState[];
  removed: string[];
}

/**
 * Merge a recomputed graph into the stored one, preserving status, ack
 * number and pre-completed flag for tasks present in both (P5), and
 * archiving any completed task that left the graph (never delete).
 */
export function mergeGraphs(
  previous: TaskState[],
  next: TaskState[],
): { tasks: TaskState[]; diff: GraphDiff } {
  const prevByCode = new Map(previous.map((t) => [t.code, t]));
  const nextCodes = new Set(next.map((t) => t.code));

  const tasks: TaskState[] = [];
  const added: TaskState[] = [];
  const removed: string[] = [];

  for (const task of next) {
    const old = prevByCode.get(task.code);
    if (old) {
      // Preserve what the user earned; refresh the computed shape.
      // completedAt is earned at S6/S8 completion and must survive
      // recomputes exactly like the ack number (P5); preCompleted is
      // NOT preserved: it recomputes from the answers so a Q1 flip
      // clears it (D4 4.4).
      tasks.push({
        ...task,
        status: old.status,
        ackNumber: old.ackNumber,
        completedAt: old.completedAt,
      });
    } else {
      added.push(task);
      tasks.push(task);
    }
  }

  for (const task of previous) {
    if (nextCodes.has(task.code)) continue;
    if (task.status === "done" || task.status === "inProgress") {
      // P5 / P1-4: archived, never deleted.
      tasks.push({ ...task, archived: true, status: task.status });
    }
    removed.push(task.code);
  }

  return { tasks, diff: { added, removed } };
}
