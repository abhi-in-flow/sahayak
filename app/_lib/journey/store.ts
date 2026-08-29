import {
  mutate as persistMutate,
  onExternalChange,
  onMutate,
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

/* A raw mutate() write in THIS tab (the capture screens' autosave, the
   S5 recompute merge, the banner dismissal) must invalidate the snapshot
   just like another tab's write does: /clarify/1's guard reads this
   cache, and a stale null here is an infinite S2<->S3 bounce (BUG-012). */
onMutate(() => {
  cache = undefined;
  notify();
});

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

/** The screens' named write path. Invalidation and notify are no longer
 *  done here: every persistMutate write fires the onMutate wiring above,
 *  so a store write and a raw write behave identically (BUG-012). */
export function updateJourney(
  change: (draft: JourneyRecord) => void,
): JourneyRecord | null {
  return persistMutate(change);
}
