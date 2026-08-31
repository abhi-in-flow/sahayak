import { afterEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEYS } from "../storage/schema";
import type { ChatSession } from "./store";

/**
 * The chat read layer's contract. Mirrors ../journey/store.test.ts:
 * fresh modules per test (the store's cache is module state), an
 * in-memory Storage installed as `window`, and the same-tab notify
 * asserted directly because no storage event ever fires in the
 * writing tab (BUG-012's mechanism).
 */

/** Quota pressure, when a ceiling is given, is expressed as a
 *  session-count ceiling so the prune-and-retry path is exercised
 *  deterministically. */
function fakeStorage(maxSessions = Number.POSITIVE_INFINITY): {
  storage: Storage;
  map: Map<string, string>;
} {
  const map = new Map<string, string>();
  const chatSessions = () =>
    Array.from(map.keys()).filter((k) => k.startsWith(STORAGE_KEYS.chatPrefix)).length;
  const storage = {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => {
      if (
        k.startsWith(STORAGE_KEYS.chatPrefix) &&
        !map.has(k) &&
        chatSessions() >= maxSessions
      ) {
        throw new DOMException("quota exceeded", "QuotaExceededError");
      }
      map.set(k, String(v));
    },
  } as Storage;
  return { storage, map };
}

function makeWindow(storage: Storage) {
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  return {
    window: {
      localStorage: storage,
      addEventListener: (type: string, cb: (event: unknown) => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(cb);
      },
      removeEventListener: (type: string, cb: (event: unknown) => void) => {
        listeners.get(type)?.delete(cb);
      },
    },
    listeners,
  };
}

/** Fresh modules per test: the store's cache is module state. */
async function loadStore(storage: Storage = fakeStorage().storage) {
  vi.resetModules();
  const w = makeWindow(storage);
  vi.stubGlobal("window", w.window);
  const store = await import("./store");
  return { store, w };
}

function sessionKeys(map: Map<string, string>): string[] {
  return Array.from(map.keys()).filter((k) => k.startsWith(STORAGE_KEYS.chatPrefix));
}

/** Snapshot of everything currently in the stubbed window.localStorage. */
function storageMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i)!;
    map.set(k, window.localStorage.getItem(k)!);
  }
  return map;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("chat store (sbn.chat.* read layer)", () => {
  it("round-trips a session: create, append user + assistant, read back, with caps", async () => {
    const { store } = await loadStore();
    const id = store.ensureActiveChat();
    expect(id).not.toBeNull();

    store.appendTurn(id!, { role: "user", text: "I need the death certificate" });
    store.appendTurn(id!, {
      role: "assistant",
      text: "Here is the process.",
      followUp: "Which district?",
      citations: [{ title: "Source" }],
    });

    const snap = store.getChatSnapshot(id);
    expect(snap?.turns).toHaveLength(2);
    expect(snap?.turns[0]).toMatchObject({ role: "user", text: "I need the death certificate" });
    expect(snap?.turns[1]).toMatchObject({ role: "assistant", text: "Here is the process." });
    expect(store.getActiveId()).toBe(id);

    // Caps: text to 2000 chars, citations to the first 5.
    store.appendTurn(id!, {
      role: "user",
      text: "x".repeat(2500),
      citations: Array.from({ length: 8 }, (_, i) => ({ title: `c${i}` })),
    });
    const capped = store.getChatSnapshot(id)?.turns.at(-1);
    expect(capped?.text).toHaveLength(2000);
    expect(capped?.citations).toHaveLength(5);
  });

  it("a write to one session touches exactly one key (and not the pointer)", async () => {
    const { store } = await loadStore();
    const idA = store.openSeed("ask A")!;
    const idB = store.openSeed("ask B")!;
    const rawB = window.localStorage.getItem(STORAGE_KEYS.chatPrefix + idB);
    const pointer = window.localStorage.getItem(STORAGE_KEYS.chatActive);

    store.appendTurn(idA, { role: "assistant", text: "reply for A" });

    expect(window.localStorage.getItem(STORAGE_KEYS.chatPrefix + idB)).toBe(rawB);
    expect(window.localStorage.getItem(STORAGE_KEYS.chatActive)).toBe(pointer);
    expect(store.getChatSnapshot(idA)?.turns.at(-1)?.text).toBe("reply for A");
    // The active pointer stayed on B; A was written by id, not by pointer.
    expect(store.getActiveId()).toBe(idB);
  });

  it("on quota failure prunes the oldest sessions and retries once", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    // The stub admits 12 chat sessions; with 12 present the 13th write
    // busts quota, the prune back to 10 frees the two oldest, and the
    // retry fits.
    const { storage, map } = fakeStorage(12);
    const { store } = await loadStore(storage);
    let last: string | null = null;
    for (let i = 1; i <= 13; i += 1) {
      vi.setSystemTime(new Date(Date.now() + 1000));
      last = store.openSeed(`seed number ${i}`);
      if (i < 13) expect(last).not.toBeNull();
    }
    expect(last).not.toBeNull(); // the retry succeeded
    const seeds = sessionKeys(map).map(
      (k) => (JSON.parse(map.get(k)!) as ChatSession).seed,
    );
    expect(seeds).toHaveLength(11); // 10 kept + the new session
    expect(seeds).not.toContain("seed number 1");
    expect(seeds).not.toContain("seed number 2");
    expect(seeds).toContain("seed number 13");
    expect(store.getChatSnapshot(last)?.seed).toBe("seed number 13");
  });

  it("gives up silently when a prune cannot free enough quota", async () => {
    const { storage } = fakeStorage(0);
    const { store } = await loadStore(storage);
    expect(store.ensureActiveChat()).toBeNull();
    expect(store.openSeed("seed")).toBeNull();
    expect(store.getActiveId()).toBeNull();
  });

  it("reads corrupt JSON as absent", async () => {
    const { store } = await loadStore();
    const id = store.openSeed("seed")!;
    window.localStorage.setItem(STORAGE_KEYS.chatPrefix + id, "{not json");
    expect(store.getChatSnapshot(id)).toBeNull();
  });

  it("reads a version mismatch as absent", async () => {
    const { store } = await loadStore();
    const id = store.openSeed("seed")!;
    const wrong = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.chatPrefix + id)!);
    wrong.version = 2;
    window.localStorage.setItem(STORAGE_KEYS.chatPrefix + id, JSON.stringify(wrong));
    expect(store.getChatSnapshot(id)).toBeNull();
  });

  it("a dangling active pointer self-heals to no active", async () => {
    const { store } = await loadStore();
    window.localStorage.setItem(STORAGE_KEYS.chatActive, "ghost-session");
    expect(store.getActiveId()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.chatActive)).toBeNull();
  });

  it("the turn cap keeps the NEWEST 200 turns", async () => {
    const { store } = await loadStore();
    const id = store.ensureActiveChat()!;
    for (let i = 1; i <= 205; i += 1) {
      store.appendTurn(id, { role: "user", text: `turn-${i}` });
    }
    const turns = store.getChatSnapshot(id)?.turns ?? [];
    expect(turns).toHaveLength(200);
    expect(turns[0]?.text).toBe("turn-6");
    expect(turns.at(-1)?.text).toBe("turn-205");
  });

  it("session creation prunes to the newest 20 by updatedAt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { store } = await loadStore();
    let first: string | null = null;
    for (let i = 1; i <= 22; i += 1) {
      vi.setSystemTime(new Date(Date.now() + 1000));
      const id = store.openSeed(`aged seed ${i}`);
      if (i === 1) first = id;
    }
    const metas = store.getChatMetaSnapshot();
    expect(metas).toHaveLength(20);
    // Newest first, and the two oldest sessions are gone.
    expect(metas[0].updatedAt >= metas[1].updatedAt).toBe(true);
    expect(store.getChatSnapshot(first)).toBeNull();
    const blobs = Array.from(storageMap().entries())
      .filter(([k]) => k.startsWith(STORAGE_KEYS.chatPrefix))
      .map(([, v]) => (JSON.parse(v) as ChatSession).seed);
    expect(blobs).not.toContain("aged seed 1");
    expect(blobs).not.toContain("aged seed 2");
    expect(blobs).toContain("aged seed 22");
  });

  it("truncates the title at 60 chars, from seed and from the first user turn", async () => {
    const { store } = await loadStore();
    const seeded = store.openSeed("a".repeat(80))!;
    expect(store.getChatSnapshot(seeded)?.title).toHaveLength(60);

    // ensureActiveChat resumes the seeded session, so drop the pointer
    // first to exercise the create-an-empty-session path.
    store.setActiveChat(null);
    const created = store.ensureActiveChat()!;
    expect(created).not.toBe(seeded);
    expect(store.getChatSnapshot(created)?.title).toBe("");
    store.appendTurn(created, { role: "user", text: "b".repeat(80) });
    expect(store.getChatSnapshot(created)?.title).toHaveLength(60);
  });

  it("openSeed with the same seed twice resumes one session (no fork)", async () => {
    const { store } = await loadStore();
    const first = store.openSeed("the same ask")!;
    const again = store.openSeed("the same ask")!;
    expect(again).toBe(first);
    expect(store.getChatSnapshot(first)?.turns).toHaveLength(1);
  });

  it("openSeed with a different seed forks", async () => {
    const { store } = await loadStore();
    const first = store.openSeed("first ask")!;
    const second = store.openSeed("second ask")!;
    expect(second).not.toBe(first);
    expect(store.getActiveId()).toBe(second);
  });

  it("getChatSnapshot is referentially stable, including the null-id path", async () => {
    const { store } = await loadStore();
    expect(store.getChatSnapshot(null)).toBe(null);
    expect(store.getChatSnapshot(null)).toBe(store.getChatSnapshot(null));
    const id = store.openSeed("stable")!;
    const a = store.getChatSnapshot(id);
    const b = store.getChatSnapshot(id);
    expect(a).toBe(b);
    // A write invalidates; the next read is a new snapshot with the turn.
    store.appendTurn(id, { role: "assistant", text: "fresh" });
    const c = store.getChatSnapshot(id);
    expect(c).not.toBe(a);
    expect(c?.turns.at(-1)?.text).toBe("fresh");
  });

  it("the server snapshot is a frozen constant", async () => {
    const { store } = await loadStore();
    expect(store.getChatsServerSnapshot()).toBe(null);
    expect(store.getChatsServerSnapshot()).toBe(store.getChatsServerSnapshot());
  });

  it("notifies subscribers synchronously on a same-tab write", async () => {
    const { store } = await loadStore();
    const id = store.ensureActiveChat()!;
    const listener = vi.fn();
    const unsubscribe = store.subscribeChats(listener);

    store.appendTurn(id, { role: "user", text: "notified" });

    expect(listener).toHaveBeenCalled();
    expect(store.getChatSnapshot(id)?.turns.at(-1)?.text).toBe("notified");
    unsubscribe();
  });

  it("a fork plus sends leaves the archived session byte-identical", async () => {
    const { store } = await loadStore();
    const archivedId = store.openSeed("archived ask")!;
    const archived = window.localStorage.getItem(STORAGE_KEYS.chatPrefix + archivedId);

    // Fork from archive and hold a conversation in the new session.
    const forkId = store.openSeed("a brand new ask")!;
    store.appendTurn(forkId, { role: "assistant", text: "fork reply" });
    store.appendTurn(forkId, { role: "user", text: "more" });

    expect(window.localStorage.getItem(STORAGE_KEYS.chatPrefix + archivedId)).toBe(archived);
    const parsed: ChatSession | null = store.getChatSnapshot(archivedId);
    expect(parsed?.turns).toHaveLength(1);
  });

  it("clearChats removes only sbn.chat.* keys", async () => {
    const { store } = await loadStore();
    store.openSeed("one");
    store.openSeed("two");
    window.localStorage.setItem(STORAGE_KEYS.journey, "journey-record");
    window.localStorage.setItem(STORAGE_KEYS.locale, "en-IN");
    window.localStorage.setItem(STORAGE_KEYS.state, "assam");
    window.localStorage.setItem(STORAGE_KEYS.saveKey, "1234");

    store.clearChats();

    expect(sessionKeys(storageMap())).toHaveLength(0);
    expect(window.localStorage.getItem(STORAGE_KEYS.chatActive)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.journey)).toBe("journey-record");
    expect(window.localStorage.getItem(STORAGE_KEYS.locale)).toBe("en-IN");
    expect(window.localStorage.getItem(STORAGE_KEYS.state)).toBe("assam");
    expect(window.localStorage.getItem(STORAGE_KEYS.saveKey)).toBe("1234");
  });

  it("collect-then-delete completeness: a full clear removes every chat key", async () => {
    const { store } = await loadStore();
    for (let i = 1; i <= 8; i += 1) {
      store.openSeed(`clear me ${i}`);
    }
    expect(store.getChatMetaSnapshot().length).toBe(8);

    store.clearChats();

    expect(store.getChatMetaSnapshot()).toHaveLength(0);
    expect(store.getActiveId()).toBeNull();
  });

  it("deleteChat drops the session and clears a pointer aimed at it", async () => {
    const { store } = await loadStore();
    const id = store.openSeed("doomed")!;
    store.deleteChat(id);
    expect(store.getChatSnapshot(id)).toBeNull();
    expect(store.getActiveId()).toBeNull();
  });
});
