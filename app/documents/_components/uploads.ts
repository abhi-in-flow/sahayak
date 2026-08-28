/**
 * Module-scope registry of in-flight wallet uploads. N2 (D3 S7): an
 * upload must survive Back/navigation and land its card on return.
 *
 * The registry deliberately lives OUTSIDE React: a route change unmounts
 * the screen but this module (and the pipeline it references) keeps
 * running, `putDocument` completes, and a remounting card re-attaches to
 * the entry through `useSyncExternalStore(subscribeUploads, ...)` and
 * sees either the landed document (page reloads the wallet on the
 * version bump) or a failed chip with Try again.
 *
 * One entry per docType, because the wallet stores one document of each
 * type: a second add for the same type while one is in flight is a
 * no-op ("first tap wins", D3).
 *
 * Progress notifications (report) do not bump the version, so the page
 * does not re-read the wallet on every progress tick; structural changes
 * (begin/settle/cancel/fail) do.
 */

export type AddMethod = "camera" | "gallery" | "sample";

export type UploadState =
  | { status: "running"; progress: number }
  | { status: "failed"; method: AddMethod };

export type UploadOutcome = "added" | "cancelled" | "failed" | "quota";

/** Thrown by UploadController.checkpoint() after cancelUpload(). */
export class UploadCancelled extends Error {
  constructor() {
    super("Upload cancelled");
    this.name = "UploadCancelled";
  }
}

/**
 * Thrown by the runner when the page has taken over the failure
 * (E-17 quota: note + removal list at page level), so the entry clears
 * silently instead of raising a failed chip.
 */
export class UploadAborted extends Error {
  constructor() {
    super("Upload aborted");
    this.name = "UploadAborted";
  }
}

export interface UploadController {
  /** Determinate progress, 0 to 1 (D6 6.2: exposed as aria-valuenow). */
  report(progress: number): void;
  /** Cancellation checkpoint between pipeline stages. */
  checkpoint(): void;
}

interface Entry {
  state: UploadState;
  cancelled: boolean;
  onDone: ((outcome: UploadOutcome) => void) | null;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
let version = 0;

function notify(): void {
  for (const listener of listeners) listener();
}

/** Structural change: the page re-reads the wallet after this. */
function bump(): void {
  version += 1;
  notify();
}

export function subscribeUploads(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snapshot for the page: bumps only on structural changes. */
export function getUploadVersion(): number {
  return version;
}

export function getUploadServerVersion(): number {
  return 0;
}

/** Snapshot for a card: stable identity between changes. */
export function getUploadState(docType: string): UploadState | undefined {
  return entries.get(docType)?.state;
}

export function beginUpload(
  docType: string,
  method: AddMethod,
  run: (controller: UploadController) => Promise<void>,
  onDone: (outcome: UploadOutcome) => void,
): void {
  const existing = entries.get(docType);
  // First tap wins; a FAILED entry may be overwritten by the retry.
  if (existing && existing.state.status === "running") return;

  const entry: Entry = {
    state: { status: "running", progress: 0 },
    cancelled: false,
    onDone,
  };
  entries.set(docType, entry);
  bump();

  void run({
    report(progress) {
      if (entry.cancelled) return;
      entry.state = { status: "running", progress: Math.min(1, Math.max(0, progress)) };
      notify();
    },
    checkpoint() {
      if (entry.cancelled) throw new UploadCancelled();
    },
  }).then(
    () => {
      settle(docType, entry, "added");
    },
    (error: unknown) => {
      if (error instanceof UploadCancelled) {
        settle(docType, entry, "cancelled");
        return;
      }
      if (error instanceof UploadAborted) {
        settle(docType, entry, "quota");
        return;
      }
      // E-14: keep the entry so a remounting card shows the failed chip
      // plus Try again (partial data is discarded by the runner).
      const done = entry.onDone;
      entry.onDone = null;
      entry.state = { status: "failed", method };
      bump();
      done?.("failed");
    },
  );
}

function settle(docType: string, entry: Entry, outcome: UploadOutcome): void {
  // Identity check: a retry may already have installed a newer entry.
  if (entries.get(docType) === entry) entries.delete(docType);
  const done = entry.onDone;
  entry.onDone = null;
  bump();
  done?.(outcome);
}

export function cancelUpload(docType: string): void {
  const entry = entries.get(docType);
  if (!entry || entry.state.status !== "running") return;
  entry.cancelled = true;
  const done = entry.onDone;
  entry.onDone = null;
  entries.delete(docType);
  bump();
  done?.("cancelled");
}
