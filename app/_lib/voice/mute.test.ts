import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "../storage/schema";

/**
 * The mute store's contract: it backs both the rail's read-aloud toggle
 * and speak()'s enforcement, so persisted state must hydrate for either
 * reader and setMuted must be visible to subscribers immediately.
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

/** Fresh modules per test: the store's cache is module state. */
async function loadMute(storage = fakeStorage()) {
  vi.resetModules();
  vi.stubGlobal("window", { localStorage: storage });
  const local = await import("../storage/local");
  const mute = await import("./mute");
  return { storage, local, mute };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("mute store", () => {
  it("defaults to read-aloud on with no stored key", async () => {
    const { mute } = await loadMute();
    expect(mute.isMuted()).toBe(false);
    expect(mute.getMutedSnapshot()).toBe(false);
  });

  it("setMuted notifies subscribers and persists the inverted flag", async () => {
    const { local, mute, storage } = await loadMute();

    const listener = vi.fn();
    const unsubscribe = mute.subscribeMuted(listener);

    mute.setMuted(true);
    expect(mute.getMutedSnapshot()).toBe(true);
    expect(listener).toHaveBeenCalled();
    expect(local.readReadAloud()).toBe(false);
    expect(storage.getItem(STORAGE_KEYS.readAloud)).toBe("0");

    mute.setMuted(false);
    expect(mute.getMutedSnapshot()).toBe(false);
    expect(local.readReadAloud()).toBe(true);
    expect(storage.getItem(STORAGE_KEYS.readAloud)).toBeNull(); // removed: default state stays absent

    unsubscribe();
  });

  it("a fresh module hydrates the persisted mute from storage", async () => {
    const storage = fakeStorage();
    const first = await loadMute(storage);
    first.mute.setMuted(true);

    // A reload keeps localStorage but starts with fresh module state.
    const second = await loadMute(storage);
    expect(second.mute.isMuted()).toBe(true);
  });

  it("without localStorage the default holds and setMuted still works for the session", async () => {
    vi.resetModules();
    vi.stubGlobal("window", undefined);
    const mute = await import("./mute");
    expect(mute.isMuted()).toBe(false);
    expect(() => mute.setMuted(true)).not.toThrow();
    expect(mute.isMuted()).toBe(true); // session-only; persistence is skipped
  });
});
