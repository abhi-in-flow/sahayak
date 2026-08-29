import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The T-LOCAL read layer's contract (BUG-012 regression).
 *
 * Every screen reads the journey through this store's cached snapshot,
 * including /clarify/1's entry guard. Any write to T-LOCAL — whether it
 * goes through updateJourney() or through the raw mutate() that the
 * capture screens use for autosave — must be visible to the next
 * getJourneySnapshot(). A stale cache is what bounced real users between
 * S2 and S3 forever: S1 primed the cache with null, the capture screens
 * wrote through mutate(), and the guard read the stale null.
 */

/** In-memory localStorage, installed as `window` for storage(). */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
  } as Storage;
}

/** Enough window for storage() and the cross-tab storage-event wiring. */
function fakeWindow() {
  const listeners = new Map<string, Set<() => void>>();
  return {
    localStorage: fakeStorage(),
    addEventListener: (type: string, cb: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(cb);
    },
    removeEventListener: (type: string, cb: () => void) => {
      listeners.get(type)?.delete(cb);
    },
  };
}

/** Fresh modules per test: the store's cache is module state. */
async function loadStore() {
  vi.resetModules();
  vi.stubGlobal("window", fakeWindow());
  const local = await import("../storage/local");
  const store = await import("./store");
  return { local, store };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("journey store (T-LOCAL read layer)", () => {
  it("a raw mutate() write is visible to the next snapshot read", async () => {
    const { local, store } = await loadStore();

    // S1 mounts with empty T-LOCAL: the cache is primed with null.
    expect(store.getJourneySnapshot()).toBeNull();

    // The capture screens save the transcript through the raw writer.
    const written = local.mutate((draft) => {
      draft.transcript = "My father passed away last month.";
      draft.inputMode = "text";
    });
    expect(written?.transcript).toBe("My father passed away last month.");

    // /clarify/1's guard reads the store: it must see the write, not
    // the primed null.
    expect(store.getJourneySnapshot()?.transcript).toBe(
      "My father passed away last month.",
    );
  });

  it("updateJourney() writes, invalidates and notifies", async () => {
    const { store } = await loadStore();
    expect(store.getJourneySnapshot()).toBeNull();

    const listener = vi.fn();
    const unsubscribe = store.subscribeJourney(listener);

    const next = store.updateJourney((draft) => {
      draft.transcript = "spoken problem";
      draft.inputMode = "voice";
    });

    expect(next?.transcript).toBe("spoken problem");
    expect(store.getJourneySnapshot()?.transcript).toBe("spoken problem");
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });

  it("a raw mutate() write notifies store subscribers, like the storage event does across tabs", async () => {
    const { local, store } = await loadStore();
    expect(store.getJourneySnapshot()).toBeNull(); // prime

    const listener = vi.fn();
    const unsubscribe = store.subscribeJourney(listener);

    local.mutate((draft) => {
      draft.transcript = "typed problem";
    });

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it("without localStorage the store stays null and mutate is a no-op", async () => {
    vi.resetModules();
    vi.stubGlobal("window", undefined);
    const local = await import("../storage/local");
    expect(local.readJourney()).toBeNull();
    expect(local.mutate(() => {})).toBeNull();
    const store = await import("./store");
    expect(store.getJourneySnapshot()).toBeNull();
  });
});
