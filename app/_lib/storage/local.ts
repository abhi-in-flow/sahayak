"use client";

import {
  STORAGE_KEYS,
  emptyJourney,
  migrate,
  type JourneyRecord,
} from "./schema";

/**
 * T-LOCAL. D4 §4.1, §4.2, §4.5.
 *
 * "Writes to T-LOCAL happen on every mutation (P2); no explicit save
 * exists anywhere." This module therefore exports `mutate`, not `save`:
 * reading, changing and persisting are one operation that callers cannot
 * take apart and forget to finish.
 *
 * Every function is SSR-safe. localStorage does not exist during the
 * server render, and a throw there would take down a Server Component
 * tree, so absence returns a null/no-op rather than raising.
 */

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Safari private mode and some embedded webviews throw on access
    // rather than on write. A user with storage disabled still gets a
    // working session; it just does not survive a refresh.
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* locale (P1)                                                         */
/* ------------------------------------------------------------------ */

export function readLocale(): string | null {
  return storage()?.getItem(STORAGE_KEYS.locale) ?? null;
}

export function writeLocale(code: string): void {
  storage()?.setItem(STORAGE_KEYS.locale, code);
}

/* ------------------------------------------------------------------ */
/* save key (SH1)                                                      */
/* ------------------------------------------------------------------ */

/**
 * The SH1 save key. D3 SH1 and C6: users are explicitly invited to invent
 * a number, it is never verified and nothing is ever sent to it. It is a
 * lookup key, not an identity, and it must never be treated as a phone
 * number anywhere in the product.
 */
export function readSaveKey(): string | null {
  return storage()?.getItem(STORAGE_KEYS.saveKey) ?? null;
}

export function writeSaveKey(key: string): void {
  storage()?.setItem(STORAGE_KEYS.saveKey, key);
}

/* ------------------------------------------------------------------ */
/* journey record                                                      */
/* ------------------------------------------------------------------ */

export function readJourney(): JourneyRecord | null {
  const raw = storage()?.getItem(STORAGE_KEYS.journey);
  if (!raw) return null;
  try {
    return migrate(JSON.parse(raw));
  } catch {
    // Corrupt record. Returning null routes the user to S1 with an
    // honest fresh start, which is far better than rendering a
    // half-parsed journey as though it were real.
    return null;
  }
}

/**
 * Apply a change and persist it in one step.
 *
 * Returns the written record, or null if storage is unavailable. Creates
 * the journey if none exists, because D3 has no screen that mutates a
 * journey which does not yet exist.
 */
export function mutate(
  change: (draft: JourneyRecord) => void,
  journeyId?: string,
): JourneyRecord | null {
  const store = storage();
  if (!store) return null;

  const current = readJourney() ?? emptyJourney(journeyId ?? crypto.randomUUID());
  // Structured clone keeps the caller from mutating a stale object it
  // captured earlier and silently writing over a newer tab's changes.
  const next: JourneyRecord = structuredClone(current);
  change(next);
  next.updatedAt = new Date().toISOString();

  try {
    store.setItem(STORAGE_KEYS.journey, JSON.stringify(next));
  } catch {
    // Quota exceeded. The wallet is the only large consumer and it lives
    // in IndexedDB, so this is unexpected; surfacing E-17's removal path
    // is the wallet's job, not this module's.
    return null;
  }
  return next;
}

export function clearJourney(): void {
  storage()?.removeItem(STORAGE_KEYS.journey);
}

/* ------------------------------------------------------------------ */
/* multi-tab (D4 §4.5, P2-12)                                          */
/* ------------------------------------------------------------------ */

/**
 * "Last-write-wins on T-LOCAL; `storage` event in the stale tab shows
 * banner 'This page was updated in another tab - Refresh'; no merge is
 * attempted."
 *
 * No merge is attempted here either. The callback is a notification that
 * this tab is stale, nothing more. Resist adding reconciliation: D4 chose
 * last-write-wins deliberately, and a partial merge would produce a
 * journey the user never confirmed.
 */
export function onExternalChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: StorageEvent) => {
    if (event.key === STORAGE_KEYS.journey) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
