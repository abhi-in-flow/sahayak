import type { S2Strings } from "./screens/s2";
import type { S3Strings } from "./screens/s3";
import type { S4Strings } from "./screens/s4";
import type { S5Strings } from "./screens/s5";
import type { SH1Strings } from "./screens/sh1";

/**
 * String contract.
 *
 * D3 S1: "every string ships in every enabled language before that
 * language's tile is enabled" and "a language missing any string is a
 * hidden tile, never a fallback-to-English".
 *
 * That rule is enforced here by the type system rather than by review:
 * a Strings object is only assignable if every key is present, so a
 * locale cannot be registered as enabled while incomplete. There is
 * deliberately no Partial<Strings> and no fallback chain anywhere in
 * this module. A missing string must be a compile error, never an
 * English word appearing mid-sentence in a Hindi screen.
 *
 * Strings live in per-screen modules under ./screens/. Each screen owns
 * its namespace prefix ("s2.", "s3.", ...) which guarantees key
 * uniqueness across the intersection below.
 */

export interface BaseStrings {
  /* ---- global chrome, on every screen ------------------------------ */
  "chrome.disclosure": string;
  "chrome.whatsReal": string;
  "chrome.skipToContent": string;

  /* ---- S1 entry & language selection ------------------------------- */
  "s1.wordmark": string;
  "s1.headline": string;
  "s1.micCta": string;
  "s1.typeInstead": string;
  "s1.trustStrip": string;
  "s1.continueTitle": string;
  "s1.continueDescriptor": string;
  "s1.backToQuestion": string;
  "s1.audioPreviewLabel": string;
  "s1.audioGreeting": string;
  "s1.noJsHeading": string;
  "s1.noJsIntro": string;

  /* ---- batch-3 stub screens (honest placeholders) ------------------ */
  "stub.title": string;
  "stub.note": string;
  "stub.back": string;

  /* ---- status chips (D10 10.4) ------------------------------------- */
  "status.doNow": string;
  "status.locked": string;
  "status.lockedNeeds": string;
  "status.inProgress": string;
  "status.done": string;
  "status.mayNotApply": string;
  "status.noLongerNeeded": string;

  /* ---- errors, mirroring D5 codes ---------------------------------- */
  "error.E01": string;
  "error.O01": string;
  "offline.reconnected": string;
}

export type Strings = BaseStrings &
  S2Strings &
  S3Strings &
  S4Strings &
  S5Strings &
  SH1Strings;

/** Script class drives layout direction and the line-height token set. */
export type ScriptClass = "latin" | "devanagari" | "nastaliq";

export interface LocaleDefinition {
  /** BCP 47 tag. */
  code: string;
  /** The language's own name, in its own script. Never translated. */
  endonym: string;
  dir: "ltr" | "rtl";
  script: ScriptClass;
  /** D6 6.4: every date renders and validates through this token. */
  dateFormat: string;
  strings: Strings;
}
