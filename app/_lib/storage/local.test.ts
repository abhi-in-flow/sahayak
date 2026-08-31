import { afterEach, describe, expect, it, vi } from "vitest";

import { readIntroSeen, writeIntroSeen } from "./local";
import { STORAGE_KEYS } from "./schema";

/**
 * The helpers degrade silently when storage is missing, so they are
 * exercised against three shapes of "storage": plain node, where window
 * does not exist at all (same bare environment draft.test.ts relies on),
 * an in-memory stub, and a window whose localStorage access throws the
 * way Safari private mode does.
 */
function stubWorkingStorage(): Map<string, string> {
  const mem = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => mem.get(key) ?? null,
      setItem: (key: string, value: string) => void mem.set(key, value),
      removeItem: (key: string) => void mem.delete(key),
    },
  });
  return mem;
}

describe("readIntroSeen / writeIntroSeen", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads false when localStorage is unavailable (no window)", () => {
    // This test file runs in plain node: no window at all.
    expect(readIntroSeen()).toBe(false);
    expect(() => writeIntroSeen()).not.toThrow();
  });

  it("reads false when the key is absent", () => {
    stubWorkingStorage();
    expect(readIntroSeen()).toBe(false);
  });

  it("reads false for junk values, including \"0\"", () => {
    const mem = stubWorkingStorage();
    for (const junk of ["yes", "0", "true", ""]) {
      mem.set(STORAGE_KEYS.intro, junk);
      expect(readIntroSeen()).toBe(false);
    }
  });

  it("write then read is true, and writing twice is idempotent", () => {
    const mem = stubWorkingStorage();
    writeIntroSeen();
    writeIntroSeen();
    expect(readIntroSeen()).toBe(true);
    expect(mem.get(STORAGE_KEYS.intro)).toBe("1");
  });

  it("never throws when localStorage access throws (Safari private mode)", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("SecurityError: access denied");
      },
    });
    expect(readIntroSeen()).toBe(false);
    expect(() => writeIntroSeen()).not.toThrow();
    expect(readIntroSeen()).toBe(false);
  });
});
