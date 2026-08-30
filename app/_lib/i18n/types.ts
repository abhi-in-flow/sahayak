import type { S2Strings } from "./screens/s2";
import type { S3Strings } from "./screens/s3";
import type { S4Strings } from "./screens/s4";
import type { S5Strings } from "./screens/s5";
import type { S6Strings } from "./screens/s6";
import type { S7Strings } from "./screens/s7";
import type { S8Strings } from "./screens/s8";
import type { S9Strings } from "./screens/s9";
import type { S10Strings } from "./screens/s10";
import type { S11Strings } from "./screens/s11";
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
  "s1.micStarting": string;
  "s1.typeInstead": string;
  "s1.trustStrip": string;
  "s1.continueTitle": string;
  "s1.continueDescriptor": string;
  "s1.backToQuestion": string;
  "s1.audioPreviewLabel": string;
  "s1.audioGreeting": string;
  "s1.noJsHeading": string;
  "s1.noJsIntro": string;

  /* ---- S1 hub: first-run guide, action grid, ask box, session ------ */
  "s1.guide.title": string;
  "s1.guide.skip": string;
  "s1.guide.dismiss": string;
  "s1.guide.1.title": string;
  "s1.guide.1.body": string;
  "s1.guide.2.title": string;
  "s1.guide.2.body": string;
  "s1.guide.3.title": string;
  "s1.guide.3.body": string;
  "s1.action.speak": string;
  "s1.action.type": string;
  "s1.action.browse": string;
  "s1.action.resume": string;
  "s1.action.documents": string;
  "s1.action.help": string;
  "s1.action.whatsReal": string;
  "s1.action.login": string;
  "s1.session.in": string;
  "s1.session.out": string;
  "s1.ask.label": string;
  "s1.ask.helper": string;
  "s1.ask.submit": string;
  "s1.ask.working": string;
  "s1.ask.error": string;
  "s1.ask.sources": string;

  /* ---- practice login (/login); reuses SH1 phone/OTP copy ---------- */
  "login.title": string;
  "login.headline": string;
  "login.cta": string;
  "login.back": string;
  "login.guest": string;
  "login.done": string;
  "login.signOut": string;

  "chrome.tab.home": string;
  "chrome.tab.speak": string;
  "chrome.tab.journey": string;
  "chrome.tab.help": string;

  "onboard.title": string;
  "onboard.lang": string;
  "onboard.state": string;
  "onboard.state.helper": string;
  "onboard.state.assam": string;
  "onboard.state.maharashtra": string;
  "onboard.state.karnataka": string;
  "onboard.state.other": string;
  "onboard.continue": string;
  "s1.state.chip": string;

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

  /* ---- shared provenance labels (C4), used by S5/S6/S10/S11 --------- */
  "meta.source": string;
  "meta.verified": string;
  "meta.state": string;

  /* ---- shared document names (Appendix A set), used by S6/S7/S8/S10 -- */
  "doc.DOC-MED": string;
  "doc.DOC-ID-D": string;
  "doc.DOC-ID-I": string;
  "doc.DOC-ADDR": string;
  "doc.DOC-DEATH": string;
}

export type Strings = BaseStrings &
  S2Strings &
  S3Strings &
  S4Strings &
  S5Strings &
  S6Strings &
  S7Strings &
  S8Strings &
  S9Strings &
  S10Strings &
  S11Strings &
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
