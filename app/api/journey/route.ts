import { NextResponse } from "next/server";
import type { ServerSnapshot } from "@/app/_lib/storage/sync";

/**
 * T-SRV. D4 §4.1, §4.5; Q-B.
 *
 * ------------------------------------------------------------------
 * DEVELOPMENT STUB. In-memory, per-process, lost on restart, and not
 * shared between server instances. It exists so the SH1 save and the
 * device-2 restore paths can be exercised end to end; it is NOT the
 * backend. Choosing real persistence is an open decision.
 * ------------------------------------------------------------------
 *
 * Correct by contract even as a stub:
 *   - Keyed on the SALTED HASH of the save key, never the key itself
 *     (D7 §7.1, C6). The number a user invents never reaches storage.
 *   - Last-write-wins on `updated_at` (D4 §4.5). No merge is attempted.
 *   - Stores a JourneyRecord, which cannot carry a document blob (P3).
 */

const store = new Map<string, ServerSnapshot>();

export async function PUT(request: Request) {
  let snapshot: ServerSnapshot;
  try {
    snapshot = (await request.json()) as ServerSnapshot;
  } catch {
    return NextResponse.json({ error: "malformed" }, { status: 400 });
  }

  if (!snapshot?.saveKeyHash || !snapshot.record) {
    return NextResponse.json({ error: "malformed" }, { status: 400 });
  }

  const existing = store.get(snapshot.saveKeyHash);
  // Last-write-wins, but never move backwards: an out-of-order retry of an
  // older fire-and-forget write must not clobber newer state.
  if (existing && existing.updatedAt > snapshot.updatedAt) {
    return NextResponse.json({ ok: true, applied: false });
  }

  store.set(snapshot.saveKeyHash, snapshot);
  return NextResponse.json({ ok: true, applied: true });
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "missing key" }, { status: 400 });

  const snapshot = store.get(key);
  // 404 drives E-20 on S9, which offers "Try again" and "Start fresh
  // instead" rather than rendering an empty dashboard as if it were real.
  if (!snapshot) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(snapshot);
}
