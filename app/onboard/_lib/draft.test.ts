import { describe, expect, it } from "vitest";

import {
  canContinue,
  emptyDraft,
  isOnboardDraft,
  missingPrerequisite,
  readDraft,
  reduceOnboard,
} from "./draft";

describe("reduceOnboard", () => {
  it("furthest only moves forward", () => {
    let draft = emptyDraft(null);
    draft = reduceOnboard(draft, { type: "goto", step: 3 });
    draft = reduceOnboard(draft, { type: "goto", step: 2 });
    expect(draft.furthest).toBe(3);
  });

  it("signOut clears the phone with the mode", () => {
    let draft = emptyDraft(null);
    draft = reduceOnboard(draft, { type: "signIn", phone: "9000000000" });
    expect(draft.authMode).toBe("number");
    draft = reduceOnboard(draft, { type: "signOut" });
    expect(draft).toMatchObject({ authMode: "unset", phone: null });
  });
});

describe("canContinue", () => {
  it("gates step 2 on a region; steps 1 and 3 always continue", () => {
    const draft = emptyDraft("en-IN");
    expect(canContinue(1, draft)).toBe(true);
    expect(canContinue(2, draft)).toBe(false);
    expect(canContinue(2, { ...draft, region: "assam" })).toBe(true);
    expect(canContinue(3, draft)).toBe(true);
  });
});

describe("missingPrerequisite", () => {
  it("demands a region before the account step", () => {
    const draft = emptyDraft(null);
    expect(missingPrerequisite(1, draft)).toBeNull();
    expect(missingPrerequisite(2, draft)).toBeNull();
    expect(missingPrerequisite(3, draft)).toBe(2);
    expect(missingPrerequisite(3, { ...draft, region: "assam" })).toBeNull();
  });
});

describe("readDraft / isOnboardDraft", () => {
  it("returns null when sessionStorage is unavailable", () => {
    // This test file runs in plain node: no window at all.
    expect(readDraft()).toBeNull();
  });

  it("rejects shapes that do not match the draft", () => {
    expect(isOnboardDraft(null)).toBe(false);
    expect(isOnboardDraft({ region: "atlantis" })).toBe(false);
    expect(
      isOnboardDraft({
        locale: "en-IN",
        region: "assam",
        authMode: "guest",
        phone: null,
        furthest: 9,
      }),
    ).toBe(false);
    expect(
      isOnboardDraft({
        locale: "en-IN",
        region: "assam",
        authMode: "guest",
        phone: null,
        furthest: 2,
      }),
    ).toBe(true);
  });
});
