import {
  mutate as persistMutate,
  onExternalChange,
  readJourney,
} from "../storage/local";
import type { JourneyRecord } from "../storage/schema";

/**
 * T-LOCAL as an external store, shared by every screen that reads the
 * journey record client-side.
 *
 * T-LOCAL is an external system (D4 4.1): it exists outside React and
 * changes under the app's feet (multi-tab last-write-wins, D4 4.5).
 * Reading it in a mount effect and mirroring it into state triggers
 * cascading renders and re-reads on every mount; subscribing through
 * useSyncExternalStore gives one cached snapshot, a live update path on
 * another tab's write, and a safe server snapshot (localStorage has no
 * server-side read, so the islands render their skeleton on the server
 * and resolve right after hydration - the OfflineChip pattern).
 */

let cache: JourneyRecord | null | undefined;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeJourney(listener: () => void): () => void {
  listeners.add(listener);
  // D4 4.5: another tab's write invalidates this tab's snapshot.
  const off = onExternalChange(() => {
    cache = undefined;
    listener();
  });
  return () => {
    listeners.delete(listener);
    off();
  };
}

/** Cached snapshot: getSnapshot must be referentially stable, so the
 *  parsed record is held until the next invalidation. */
export function getJourneySnapshot(): JourneyRecord | null {
  if (cache === undefined) cache = readJourney();
  return cache;
}

export function getJourneyServerSnapshot(): null {
  return null;
}

/** mutate() through the store: one write, one invalidation, one notify. */
export function updateJourney(
  change: (draft: JourneyRecord) => void,
): JourneyRecord | null {
  const next = persistMutate(change);
  cache = undefined;
  notify();
  return next;
}
