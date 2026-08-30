/**
 * Onboarding draft state (client only).
 *
 * The multi-step flow keeps every selection in one reducer so a step
 * change never scatters truth across component useState hooks, and the
 * reducer is mirrored to sessionStorage on every mutation (P2 spirit:
 * there is no explicit save) so a refresh mid-flow restores the draft
 * instead of restarting the user at step 1 with amnesia.
 *
 * Onboarding asks only what the product cannot function without:
 * language renders the interface, region scopes the services, and the
 * optional account step is a convenience, never a gate. No intent or
 * personalisation questions live here.
 *
 * This module is pure so vitest can run it without a DOM; the React
 * wiring lives in OnboardFlow.
 */

import type { OnboardState } from "@/app/_lib/storage/schema";

export const ONBOARD_STEPS = [1, 2, 3] as const;
export type OnboardStep = (typeof ONBOARD_STEPS)[number];

/** How the account step resolved. "number" means signed in via practice OTP. */
export type OnboardAuthMode = "unset" | "guest" | "number";

export interface OnboardDraft {
  /** Chosen language code; null until the language tile is tapped. */
  locale: string | null;
  region: OnboardState | null;
  authMode: OnboardAuthMode;
  /** The invented 10-digit number, present once OTP verified. */
  phone: string | null;
  /**
   * Furthest step reached. The resume guard lands a returning user here
   * rather than making them walk the flow again.
   */
  furthest: OnboardStep;
}

export function emptyDraft(locale: string | null): OnboardDraft {
  return { locale, region: null, authMode: "unset", phone: null, furthest: 1 };
}

export type OnboardAction =
  | { type: "hydrate"; draft: OnboardDraft }
  | { type: "setLocale"; locale: string }
  | { type: "setRegion"; region: OnboardState }
  | { type: "setAuthMode"; mode: OnboardAuthMode }
  | { type: "signIn"; phone: string }
  | { type: "signOut" }
  | { type: "goto"; step: OnboardStep };

export function reduceOnboard(draft: OnboardDraft, action: OnboardAction): OnboardDraft {
  switch (action.type) {
    case "hydrate":
      return action.draft;
    case "setLocale":
      return { ...draft, locale: action.locale };
    case "setRegion":
      return { ...draft, region: action.region };
    case "setAuthMode":
      return { ...draft, authMode: action.mode };
    case "signIn":
      return { ...draft, authMode: "number", phone: action.phone };
    case "signOut":
      return { ...draft, authMode: "unset", phone: null };
    case "goto":
      return { ...draft, furthest: Math.max(draft.furthest, action.step) as OnboardStep };
  }
}

/* ------------------------------------------------------------------ */
/* per-step validation                                                 */
/* ------------------------------------------------------------------ */

/**
 * Step 1 always continues (the language tile pre-highlights a default).
 * Step 2 gates the whole product on a region (StateGate contract).
 * Step 3 always continues: guest is a first-class outcome.
 */
export function canContinue(step: OnboardStep, draft: OnboardDraft): boolean {
  switch (step) {
    case 1:
      return true;
    case 2:
      return draft.region !== null;
    case 3:
      return true;
  }
}

/** The account step's copy assumes a region was chosen. */
export function missingPrerequisite(step: OnboardStep, draft: OnboardDraft): OnboardStep | null {
  if (step >= 3 && draft.region === null) return 2;
  return null;
}

/* ------------------------------------------------------------------ */
/* sessionStorage mirror                                               */
/* ------------------------------------------------------------------ */

export const DRAFT_KEY = "sbn.onboard.draft.v1";

export function readDraft(): OnboardDraft | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return isOnboardDraft(JSON.parse(raw)) ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeDraft(draft: OnboardDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Privacy mode or quota: the in-memory draft still carries the flow.
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to recover; the draft was already in memory only.
  }
}

/** Distrust anything that does not match the shape; never merge partially. */
export function isOnboardDraft(value: unknown): value is OnboardDraft {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OnboardDraft>;
  return (
    (candidate.locale === null || typeof candidate.locale === "string") &&
    (candidate.region === null ||
      ["assam", "maharashtra", "karnataka", "other"].includes(candidate.region ?? "")) &&
    ["unset", "guest", "number"].includes(candidate.authMode ?? "") &&
    (candidate.phone === null || typeof candidate.phone === "string") &&
    typeof candidate.furthest === "number" &&
    ONBOARD_STEPS.includes(candidate.furthest as OnboardStep)
  );
}
