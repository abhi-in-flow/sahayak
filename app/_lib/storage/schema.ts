/**
 * T-LOCAL record shape. D4 §4.1 and §4.2.
 *
 * One versioned record under `sbn.journey.v1`, plus two standalone keys.
 * Writes happen on every mutation (P2); there is no explicit save anywhere
 * in the product and this module exports no `save()` for that reason.
 *
 * P3, hard constraint: document blobs live in T-IDB and NEVER appear here.
 * That is what makes `toServerSnapshot` in ./sync.ts safe by construction:
 * it takes a JourneyRecord, and a JourneyRecord has nowhere to put a blob.
 * Do not add one.
 */

export const STORAGE_KEYS = {
  journey: "sbn.journey.v1",
  locale: "sbn.locale",
  saveKey: "sbn.savekey",
} as const;

export const SCHEMA_VERSION = 1;

export type InputMode = "voice" | "text";

/** D3 S5. Colour is never the carrier; see StatusChip and A6. */
export type TaskStatusKind = "doNow" | "locked" | "inProgress" | "done" | "mayNotApply";

/**
 * A recorded Socratic answer. `unknown` is a first-class value, not a
 * missing one: D3 S3 widens the journey on `unknown` and flags the derived
 * tasks "may not apply". Never collapse it to null.
 */
export interface RecordedAnswer {
  questionId: string;
  /** Enumerated option code, or the literal "unknown". */
  value: string;
  /** Order asked, 1-based. */
  n: number;
  /**
   * D3 S3: when an edit makes a previously recorded answer's question
   * inapplicable, that answer is archived rather than discarded, and is
   * restored pre-selected if a later edit makes it applicable again.
   */
  archived: boolean;
}

export interface TaskState {
  code: string;
  status: TaskStatusKind;
  /** Set once, at S8 submit. Idempotent per draft (D4 §4.5, P2-7). */
  ackNumber: string | null;
  /** D3 S5: the unlock condition, stated on the card face. A locked task
   *  without a reason is a defect, so this is required when locked. */
  lockReason: string | null;
  /** True when the task left the graph but must not be deleted (P5). */
  archived: boolean;
  /** D4 §4.4: set when Q1 flips No->Yes and T1 renders pre-completed. */
  preCompleted?: boolean;
  /**
   * ISO date the task was completed here (S6 "already done" or S8
   * submit). S9's completed list renders it; pre-completed tasks have
   * none and say so instead of a fabricated date.
   */
  completedAt?: string;
}

/** S8 draft, keyed by task code. Never discarded on timeout (P4). */
export interface FormDraft {
  taskCode: string;
  /** Furthest incomplete step; resume lands here (D3 S8). */
  step: number;
  values: Record<string, string>;
  updatedAt: string;
}

export interface JourneyRecord {
  version: typeof SCHEMA_VERSION;
  journeyId: string;
  /** Free text as captured. Sent onward only after user review (D3 S2). */
  transcript: string;
  inputMode: InputMode;
  answers: RecordedAnswer[];
  tasks: TaskState[];
  /** Keyed by task code, mirroring D4's `draft.{taskCode}`. */
  drafts: Record<string, FormDraft>;
  /** D3 S3e manual-journey mode: "manual:B3", or null for Socratic. */
  source: string | null;
  /** Seeded state the journey is scoped to (Q2). */
  state: string | null;
  /** Dismissed diff/notice banners, so they are not re-shown (D4 §4.2). */
  dismissedBanners: string[];
  /**
   * Newest task `last_verified` date the user has been shown, so S9 can
   * raise "steps were updated since you last checked" only when it is
   * true. Optional: records from before batch 3 simply have not seen one.
   */
  lastVerifiedSeen?: string;
  updatedAt: string;
}

export function emptyJourney(journeyId: string): JourneyRecord {
  return {
    version: SCHEMA_VERSION,
    journeyId,
    transcript: "",
    inputMode: "voice",
    answers: [],
    tasks: [],
    drafts: {},
    source: null,
    state: null,
    dismissedBanners: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Migration hook. D4 gives the record a version in its very key name, so a
 * future shape change is expected rather than exceptional. Returning null
 * means "unreadable": callers must treat that as no journey, never as an
 * empty one, so a user is routed to S1 rather than shown a blank S5.
 */
export function migrate(raw: unknown): JourneyRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<JourneyRecord>;
  if (candidate.version !== SCHEMA_VERSION) return null;
  if (typeof candidate.journeyId !== "string") return null;
  if (!Array.isArray(candidate.answers) || !Array.isArray(candidate.tasks)) return null;
  return candidate as JourneyRecord;
}
