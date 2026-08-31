"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, readSessionLast4, readState, writeLocale, writeOnboarded, writeState } from "@/app/_lib/storage/local";
import { clearChats } from "@/app/_lib/chat/store";
import { announce } from "@/app/_lib/announce";
import { withLocale } from "@/app/_lib/nav";
import { BrandSplash, splashBeatRemaining } from "@/app/_components/BrandSplash";
import {
  ONBOARD_STEPS,
  canContinue,
  clearDraft,
  emptyDraft,
  missingPrerequisite,
  readDraft,
  reduceOnboard,
  writeDraft,
  type OnboardStep,
} from "../_lib/draft";
import { ProgressStepper } from "./ProgressStepper";
import { StepLanguage } from "./steps/StepLanguage";
import { StepRegion } from "./steps/StepRegion";
import { StepAccount } from "./steps/StepAccount";
import styles from "../steps.module.css";

/**
 * The onboarding flow controller, one client instance per step (the
 * route param names the step; this Next version remounts the component
 * on a dynamic-param change, so cross-step memory lives in the
 * sessionStorage-backed draft, never in component state alone).
 *
 * Onboarding asks only what the product cannot function without:
 * language renders the interface, region scopes the services, and the
 * account step is an optional convenience. No intent or
 * personalisation questions live here.
 *
 * State model: a single OnboardDraft reducer (see ../_lib/draft) holds
 * language, region and auth mode; it is mirrored to sessionStorage on
 * every change so a refresh resumes at the furthest step with every
 * selection intact, and it is committed to T-LOCAL only at Finish, so
 * abandoning the flow never writes a half-configured product state.
 *
 * Motion: step swaps cross-fade with a directional translate (D10 10.7,
 * M-2's budget — transform/opacity only); the global reduced-motion
 * collapse in globals.css flattens it to the instant swap. The step
 * change is announced politely and the step heading receives focus
 * (D6 6.2), which is the non-motion channel that makes the transition
 * land without the animation.
 */

export const TOTAL_STEPS = ONBOARD_STEPS.length;

/* Module-scoped, per-tab flow memory. Remounts reset refs on every step
   entry; these two survive them (and reset on a full page load), which
   is exactly the split the guards need. Same idiom as
   practice/PracticeFlow's module-level visitedCodes. */
let resumeGuardRan = false;
let lastEnteredStep: number | null = null;

export interface OnboardFlowStrings {
  stepOf: string; // "Step {n} of {total}"
  back: string;
  skip: string;
  continueLabel: string;
  finish: string;
  saving: string;
  stateReason: string;
  langQuestion: string;
  langHelper: string;
  stateQuestion: string;
  stateHelper: string;
  stateAssam: string;
  stateMaharashtra: string;
  stateKarnataka: string;
  stateOther: string;
  accountQuestion: string;
  accountSignedIn: string;
  accountGuest: string;
  accountWithNumber: string;
  sh1Honesty: string;
  phoneLabel: string;
  phoneHelper: string;
  phoneCta: string;
  phoneError: string;
  otpLabel: string;
  otpHelper: string;
  otpError: string;
  sessionIn: string;
  signOut: string;
}

type Phase = "loading" | "ready";

export function OnboardFlow({
  step,
  urlLocale,
  tiles,
  strings,
}: {
  step: OnboardStep;
  urlLocale: string;
  tiles: { code: string; endonym: string }[];
  strings: OnboardFlowStrings;
}) {
  const router = useRouter();
  const [draft, dispatch] = useReducer(reduceOnboard, urlLocale, emptyDraft);
  const [phase, setPhase] = useState<Phase>("loading");
  const [direction, setDirection] = useState<"fwd" | "back">("fwd");
  const [saving, setSaving] = useState(false);
  const [last4, setLast4] = useState<string | null>(null);

  const savingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const locale = draft.locale ?? urlLocale;

  /* -------------------------------------------------------------- */
  /* hydration + entry guards                                        */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    // The brand splash holds its one beat on a page load before the
    // flow enters, so a direct load onto a step shows the logo, not a
    // skeleton flash. In-tab step changes find the beat already spent.
    const enter = () => {
      // Seed the draft: sessionStorage draft wins; an already-onboarded
      // user editing via the state chip keeps their stored region.
      const stored = readDraft();
      const seeded = stored ?? {
        ...emptyDraft(urlLocale),
        region: readState(),
      };
      if (seeded.locale === null) seeded.locale = urlLocale;
      dispatch({ type: "hydrate", draft: seeded });

      setLast4(readSessionLast4());

      // Resume and prerequisite guards run once per session, not once per
      // mount: every step change remounts this component, and a guard
      // that re-ran would bounce any backward navigation straight back
      // to the furthest step. On the very first entry (a page load) they
      // apply in full: a returning user lands on the furthest step they
      // reached, and the account step assumes a region.
      if (!resumeGuardRan) {
        resumeGuardRan = true;
        if (seeded.furthest > step) {
          router.replace(withLocale(`/onboard/${seeded.furthest}`, seeded.locale ?? urlLocale));
          return;
        }
        const prerequisite = missingPrerequisite(step, seeded);
        if (prerequisite !== null && prerequisite !== step) {
          router.replace(withLocale(`/onboard/${prerequisite}`, seeded.locale ?? urlLocale));
          return;
        }
      }

      // Direction of the step transition, derived from where the flow
      // last rendered in this tab before the remount.
      if (lastEnteredStep !== null && lastEnteredStep !== step) {
        setDirection(step < lastEnteredStep ? "back" : "fwd");
      }
      setPhase("ready");
    };

    const beat = splashBeatRemaining();
    if (beat === 0) {
      enter();
      return;
    }
    const timer = setTimeout(enter, beat);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- per-entry by design

  /* P2: the mirror is written on every mutation, never on an explicit
     save. The guard is phase (state), not a ref: this effect's first run
     closes over the pre-hydration draft, and a ref flips to true before
     that run executes, so a ref guard let the initial draft overwrite
     the stored one on every step remount (and StrictMode's second
     hydration pass then re-read the wiped draft). Phase only reaches
     "ready" from enter(), after hydrate has re-rendered, so every write
     here carries a hydrated draft. */
  useEffect(() => {
    if (phase !== "ready") return;
    writeDraft(draft);
  }, [draft, phase]);

  /* -------------------------------------------------------------- */
  /* step entry: focus the heading, announce the position (D6 6.2)   */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    if (phase !== "ready") return;
    if (lastEnteredStep === step) return;
    // The first entry in a tab is a page load, not a step change: focus
    // stays where the browser put it. Only the user's own navigation
    // moves focus and earns an announcement.
    const previous = lastEnteredStep;
    lastEnteredStep = step;
    if (previous === null) return;
    const frame = requestAnimationFrame(() => {
      headingRef.current?.focus();
    });
    announce(
      `${strings.stepOf.replace("{n}", String(step)).replace("{total}", String(TOTAL_STEPS))}. ${questionFor(step)}`,
    );
    return () => cancelAnimationFrame(frame);
  }, [phase, step]); // eslint-disable-line react-hooks/exhaustive-deps -- strings are stable per locale render

  function questionFor(step: OnboardStep): string {
    switch (step) {
      case 1:
        return strings.langQuestion;
      case 2:
        return strings.stateQuestion;
      case 3:
        return strings.accountQuestion;
    }
  }

  /* -------------------------------------------------------------- */
  /* navigation                                                      */
  /* -------------------------------------------------------------- */

  function goNext() {
    if (!canContinue(step, draft) || savingRef.current) return;
    if (step === 3) {
      finish();
      return;
    }
    dispatch({ type: "goto", step: (step + 1) as OnboardStep });
    router.push(withLocale(`/onboard/${step + 1}`, locale));
  }

  function goBack() {
    if (step === 1 || savingRef.current) return;
    router.push(withLocale(`/onboard/${step - 1}`, locale));
  }

  function skip() {
    if (savingRef.current) return;
    // Only rendered on the account step: skip is the guest path, made
    // explicit rather than a silent default.
    dispatch({ type: "setAuthMode", mode: "guest" });
    finish({ asGuest: true });
  }

  function finish(options?: { asGuest?: boolean }) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const finalLocale = draft.locale ?? urlLocale;
    const region = draft.region;
    if (!region) {
      // Unreachable through the UI (the guard routes around it); fall
      // back to step 2 rather than writing a product without a state.
      savingRef.current = false;
      setSaving(false);
      router.replace(withLocale("/onboard/2", finalLocale));
      return;
    }
    writeLocale(finalLocale);
    writeState(region);
    if (options?.asGuest || draft.authMode === "guest") clearSession();
    writeOnboarded();
    clearDraft();
    router.replace(withLocale("/", finalLocale));
  }

  /* -------------------------------------------------------------- */
  /* per-step handlers                                               */
  /* -------------------------------------------------------------- */

  function selectLanguage(code: string) {
    dispatch({ type: "setLocale", locale: code });
    // The locale rides the URL (repo convention): replacing keeps the
    // language choice out of history so Back never replays it.
    router.replace(withLocale(`/onboard/${step}`, code));
  }

  function handleSignIn(phone: string) {
    dispatch({ type: "signIn", phone });
    setLast4(phone.slice(-4));
  }

  function handleSignOut() {
    clearSession();
    // Sign-out wipes the on-device transcript too: chats are practice
    // data scoped to a session, never an account.
    clearChats();
    setLast4(null);
    dispatch({ type: "signOut" });
  }

  /* -------------------------------------------------------------- */
  /* render                                                          */
  /* -------------------------------------------------------------- */

  const enabled = canContinue(step, draft);
  const reason = step === 2 ? strings.stateReason : null;
  // Skip exists only where it differs from Continue: on the account
  // step while not signed in.
  const showSkip = step === 3 && draft.authMode !== "number" && last4 === null;
  const stepOfLabel = strings.stepOf
    .replace("{n}", String(step))
    .replace("{total}", String(TOTAL_STEPS));

  if (phase === "loading") {
    return <BrandSplash />;
  }

  return (
    <div className={styles.main} aria-busy={saving}>
      <ProgressStepper step={step} total={TOTAL_STEPS} label={stepOfLabel} />

      {/* key remounts the body per step so the M-2 cross-fade runs;
          direction gives the slide its causality (your tap, your way). */}
      <div
        key={step}
        className={`${styles.stepBody} ${direction === "fwd" ? styles.stepIn : styles.stepBack}`}
      >
        <h1 ref={headingRef} tabIndex={-1} className={styles.headline}>
          {questionFor(step)}
        </h1>

        {step === 1 ? (
          <StepLanguage
            tiles={tiles}
            value={locale}
            onSelect={selectLanguage}
            strings={{ helper: strings.langHelper }}
          />
        ) : null}
        {step === 2 ? (
          <StepRegion
            options={[
              { id: "assam" },
              { id: "maharashtra" },
              { id: "karnataka" },
              { id: "other" },
            ]}
            value={draft.region}
            onSelect={(region) => dispatch({ type: "setRegion", region })}
            strings={{
              question: strings.stateQuestion,
              helper: strings.stateHelper,
              assam: strings.stateAssam,
              maharashtra: strings.stateMaharashtra,
              karnataka: strings.stateKarnataka,
              other: strings.stateOther,
            }}
          />
        ) : null}
        {step === 3 ? (
          <StepAccount
            sessionLast4={draft.authMode === "number" && draft.phone ? draft.phone.slice(-4) : last4}
            onSignIn={handleSignIn}
            onGuest={() => dispatch({ type: "setAuthMode", mode: "guest" })}
            onSignOut={handleSignOut}
            strings={{
              question: strings.accountQuestion,
              signedIn: strings.accountSignedIn,
              guest: strings.accountGuest,
              withNumber: strings.accountWithNumber,
              honesty: strings.sh1Honesty,
              phoneLabel: strings.phoneLabel,
              phoneHelper: strings.phoneHelper,
              phoneCta: strings.phoneCta,
              phoneError: strings.phoneError,
              otpLabel: strings.otpLabel,
              otpHelper: strings.otpHelper,
              otpError: strings.otpError,
              sessionIn: strings.sessionIn,
              signOut: strings.signOut,
            }}
          />
        ) : null}

        <div className={styles.actions}>
          {step > 1 ? (
            <button type="button" className={`${styles.back} pressable`} onClick={goBack} disabled={saving}>
              {strings.back}
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.cta} pressable`}
            onClick={goNext}
            disabled={!enabled || saving}
          >
            {step === 3 ? strings.finish : strings.continueLabel}
          </button>
          {showSkip ? (
            <button type="button" className={styles.skip} onClick={skip} disabled={saving}>
              {strings.skip}
            </button>
          ) : null}
        </div>
        {!enabled && reason ? (
          <p className={styles.reason}>{reason}</p>
        ) : null}

        {saving ? (
          /* Disabled row: writes land before navigation, so the honest
             signal is the status text plus the frozen controls (D10
             10.9; never a spinner). */
          <div className={styles.saving} role="status">
            <p className={styles.savingLabel}>{strings.saving}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
