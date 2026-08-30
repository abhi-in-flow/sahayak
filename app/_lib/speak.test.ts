import { beforeEach, describe, expect, it, vi } from "vitest";
import { spokenReply } from "./speak";

describe("spokenReply", () => {
  it("does not say the follow-up twice when the reply already asked it", () => {
    const reply = "A bakijai notice is a recovery case. Which district is the notice from?";
    const followUp = "Which district is the notice from?";
    expect(spokenReply(reply, followUp)).toBe(reply);
  });

  it("appends the follow-up only when the reply did not ask it", () => {
    expect(spokenReply("Here is the official listing.", "Which city is this for?")).toBe(
      "Here is the official listing. Which city is this for?",
    );
  });

  it("does not speak a second question when the wording differs", () => {
    const reply = "A bakijai notice is a recovery case. Which district is the notice from?";
    expect(spokenReply(reply, "Which district or city is this for?")).toBe(reply);
  });
});

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

/** Fresh modules per test: the mute store's cache is module state. */
async function loadSpeak() {
  vi.resetModules();
  vi.stubGlobal("window", { localStorage: fakeStorage() });
  const local = await import("./storage/local");
  const speakModule = await import("./speak");
  return { local, speakModule };
}

describe("speak() under the read-aloud preference", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("a muted speak resolves true without calling /api/tts", async () => {
    const { local, speakModule } = await loadSpeak();
    local.writeReadAloud(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // True, not false: false is the E-01 audio-failure path.
    await expect(speakModule.speak("Namaskar", "en-IN")).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("an absent key means read-aloud on: the TTS call happens", async () => {
    const { speakModule } = await loadSpeak();
    const fetchMock = vi.fn(async () => ({ ok: false }));
    vi.stubGlobal("fetch", fetchMock);

    // Non-ok falls through to browserSpeak; the fake window has no
    // speechSynthesis, so the call ends false - what is under test is
    // that the network round-trip happened at all.
    await expect(speakModule.speak("Namaskar", "en-IN")).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
