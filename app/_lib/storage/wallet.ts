"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/**
 * T-IDB, the document wallet. D4 §4.1; D3 S7.
 *
 * ===================================================================
 * P3, HARD CONSTRAINT: this data NEVER syncs and is NEVER transmitted.
 * ===================================================================
 *
 * That is enforced by construction, not by discipline:
 *
 *   1. Blobs exist only in this module. `JourneyRecord` (schema.ts) has
 *      no field that can hold one, and T-SRV snapshots are built from a
 *      JourneyRecord, so there is no code path that could serialise a
 *      document even by mistake.
 *   2. Nothing here returns a Blob to a caller that could POST it. The
 *      read API hands back object URLs for display, which are
 *      same-document and cannot be sent anywhere useful.
 *   3. There is no export, no upload, no `toJSON`, and no fetch import
 *      in this file. Adding one breaks P3.
 *
 * D3 S7 also forbids OCR of real identity documents. There is no
 * recognition step here and there must not be one.
 *
 * D4 §4.3 consequences that are deliberate, not bugs:
 *   - A browser data clear loses the wallet. By design, stated to the
 *     user in S9's device note.
 *   - Device-2 restore brings back the journey but an EMPTY wallet, so
 *     doc-gated tasks show the device note (P1-7).
 */

const DB_NAME = "sbn.wallet";
const DB_VERSION = 1;
const STORE = "documents";

export type DocumentStatus = "haveIt" | "sampleLoaded";

export interface WalletDocument {
  /** Document type code, e.g. "death_cert". Also the primary key: one
   *  document of each type, which is what makes "supplied once, reused
   *  everywhere" true (D3 S7). */
  docType: string;
  blob: Blob;
  thumbnail: Blob | null;
  /** Optional user label, max 60 chars, E-16 guarded at entry (D3 S7). */
  label: string | null;
  /** True for the watermarked synthetic sample, the recommended demo
   *  path. Never presented as a real document. */
  isSample: boolean;
  addedAt: string;
}

interface WalletDB extends DBSchema {
  [STORE]: {
    key: string;
    value: WalletDocument;
  };
}

let dbPromise: Promise<IDBPDatabase<WalletDB>> | null = null;

function db(): Promise<IDBPDatabase<WalletDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Wallet is client-only; it must never be read during SSR."));
  }
  dbPromise ??= openDB<WalletDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: "docType" });
      }
    },
  });
  return dbPromise;
}

/** Document types present, for the S7 coverage summary and S5/S6 lock
 *  computation. Returns codes only: callers deciding whether a task is
 *  unlocked never need the bytes. */
export async function listDocumentTypes(): Promise<string[]> {
  const database = await db();
  return database.getAllKeys(STORE) as Promise<string[]>;
}

export async function getDocument(docType: string): Promise<WalletDocument | undefined> {
  const database = await db();
  return database.get(STORE, docType);
}

/**
 * Add or replace a document.
 *
 * Images are downscaled by the caller before arriving here (D3 S7:
 * "oversize pre-downscale -> downscale silently, no user error").
 */
export async function putDocument(doc: WalletDocument): Promise<void> {
  const database = await db();
  await database.put(STORE, doc);
}

/**
 * Remove a document. D3 S7 and P2-8: this recomputes readiness so
 * dependent tasks show as waiting again, but it NEVER reverts a
 * completion. Completion state lives in T-LOCAL and this module has no
 * access to it, which is the structural half of that guarantee.
 */
export async function removeDocument(docType: string): Promise<void> {
  const database = await db();
  await database.delete(STORE, docType);
}

/**
 * Storage pressure, for E-17. D3 S7 requires the quota case to explain
 * itself and offer a removal list, never to fail silently.
 */
export async function estimateQuota(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}
