"use client";

import { readReadAloud, writeReadAloud } from "../storage/local";

/**
 * Read-aloud mute preference for spoken replies.
 *
 * Deliberately a separate store from ./store.ts: voice state "belongs
 * to the current screen session and is never durable" (store.ts), while
 * mute is a durable user preference, so it persists to T-LOCAL under
 * `sbn.readaloud`. No cross-tab wiring - `sbn.locale`/`sbn.state` do
 * not sync either.
 *
 * `ensure()` backs both readers so the lazy hydration from storage does
 * not depend on which one runs first.
 */

let muted: boolean | undefined; // undefined = not yet read from storage
const listeners = new Set<() => void>();

function ensure(): boolean {
  if (muted === undefined) muted = !readReadAloud();
  return muted;
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeMuted(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMutedSnapshot(): boolean {
  return ensure();
}

/**
 * False during SSR and the hydration render, so a muted user sees one
 * frame of the unmuted icon before the store flips - the same deliberate
 * flash as the OfflineChip, not a hydration bug.
 */
export function getMutedServerSnapshot(): boolean {
  return false;
}

export function setMuted(next: boolean): void {
  if (ensure() === next) return;
  muted = next;
  writeReadAloud(!next);
  notify();
}

/** Plain read for non-React callers (speak.ts). */
export function isMuted(): boolean {
  return ensure();
}
