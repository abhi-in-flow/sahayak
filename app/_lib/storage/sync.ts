"use client";

import type { JourneyRecord } from "./schema";

/**
 * T-SRV. D4 §4.1, §4.5; D3 SH1 and S9.
 *
 * "Snapshot of `sbn.journey.v1` MINUS wallet references' blobs."
 *
 * Note what this module does NOT import: ./wallet. That omission is the
 * enforcement of P3, not an oversight. `toServerSnapshot` accepts a
 * JourneyRecord, which has no field capable of holding a document, so
 * there is no way to serialise wallet contents from here even by
 * accident. Do not import the wallet into this file.
 *
 * Writes are fire-and-forget with silent retry on the next mutation.
 * E-19 surfaces only as a note on S9's sync line; it never blocks, and
 * local state stays authoritative throughout (D4 §4.1).
 */

export interface ServerSnapshot {
  saveKeyHash: string;
  record: JourneyRecord;
  updatedAt: string;
}

export type SyncState =
  | { status: "unsynced" }
  | { status: "syncing" }
  | { status: "synced"; at: string }
  /** E-19. Non-blocking by contract: local state is authoritative. */
  | { status: "failed"; at: string };

/**
 * Salted hash of the save key. D7 §7.1: no event and no payload ever
 * carries the save key itself, only `save_key_hash`. The salt is a build
 * constant, not a secret, and this is not a security boundary; it exists
 * so that a leaked telemetry stream cannot be joined back to the number a
 * user chose.
 */
export async function hashSaveKey(saveKey: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${saveKey}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Build the payload. Blobs are structurally absent; see the note above. */
export function toServerSnapshot(
  record: JourneyRecord,
  saveKeyHash: string,
): ServerSnapshot {
  return {
    saveKeyHash,
    record,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Push a snapshot. Never throws: a sync failure is E-19, which is a note
 * on a line in S9 and nothing more. Callers must not await this in a way
 * that gates navigation.
 */
export async function pushSnapshot(snapshot: ServerSnapshot): Promise<SyncState> {
  try {
    const response = await fetch("/api/journey", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(snapshot),
      keepalive: true,
    });
    if (!response.ok) {
      return { status: "failed", at: new Date().toISOString() };
    }
    return { status: "synced", at: new Date().toISOString() };
  } catch {
    return { status: "failed", at: new Date().toISOString() };
  }
}

/**
 * Device-2 restore (D3 S9 entry d). D4 §4.5: "device-2 restore always
 * fetches before first write."
 *
 * Returns null on E-20 so S9 can offer "Try again" and "Start fresh
 * instead" rather than rendering an empty dashboard as if it were real.
 *
 * The restored journey arrives with completion and ack numbers intact and
 * an EMPTY wallet. That is correct and expected (P1-7): doc-gated tasks
 * must show S9's device note rather than appear broken.
 */
export async function restoreSnapshot(saveKeyHash: string): Promise<JourneyRecord | null> {
  try {
    const response = await fetch(`/api/journey?key=${encodeURIComponent(saveKeyHash)}`);
    if (!response.ok) return null;
    const body = (await response.json()) as ServerSnapshot;
    return body.record ?? null;
  } catch {
    return null;
  }
}
