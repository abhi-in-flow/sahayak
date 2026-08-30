"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Field, errorId, helperId } from "@/app/_components/Field";
import { writeSession } from "@/app/_lib/storage/local";
import styles from "../../steps.module.css";

/**
 * Step 4 — account, the practice sign-in (same invented number and
 * 0000 OTP as /login and SH1; nothing is sent anywhere). Guest is a
 * first-class outcome, never a dark pattern: it is a visible choice on
 * the step, and Skip in the flow header resolves to it.
 *
 * Form errors are inline below the field (D10 10.9) with the same
 * aria-describedby wiring as the login screen; the assertive live
 * region carries them to screen readers (D6 6.2).
 */

const PHONE_ID = "onboard-phone";
const OTP_ID = "onboard-otp";

type AuthView = "choice" | "phone" | "otp";

export interface StepAccountStrings {
  question: string;
  signedIn: string;
  guest: string;
  withNumber: string;
  honesty: string;
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

export function StepAccount({
  sessionLast4,
  onSignIn,
  onGuest,
  onSignOut,
  strings,
}: {
  sessionLast4: string | null;
  onSignIn: (phone: string) => void;
  onGuest: () => void;
  onSignOut: () => void;
  strings: StepAccountStrings;
}) {
  const [view, setView] = useState<AuthView>("choice");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  const phoneRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sessionLast4) return;
    const frame = requestAnimationFrame(() => {
      (view === "phone" ? phoneRef : view === "otp" ? otpRef : { current: null }).current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [view, sessionLast4]);

  const handlePhone = (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{10}$/.test(phone)) {
      setPhoneError(strings.phoneError);
      return;
    }
    setPhoneError(null);
    setView("otp");
  };

  const handleOtp = (event: FormEvent) => {
    event.preventDefault();
    if (otp !== "0000") {
      setOtpError(strings.otpError);
      return;
    }
    setOtpError(null);
    // Written the moment the OTP verifies: sign-in must survive a
    // refresh before Finish, exactly like /login (SH1).
    writeSession(phone);
    onSignIn(phone);
    setView("choice");
  };

  if (sessionLast4) {
    return (
      <div className={styles.authStack}>
        <p className={styles.honesty}>{strings.honesty}</p>
        <p className={styles.sessionChip}>{strings.sessionIn.replace("{last4}", sessionLast4)}</p>
        <p>{strings.signedIn}</p>
        <button type="button" className={styles.tertiary} onClick={onSignOut}>
          {strings.signOut}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.authStack}>
      <p className={styles.honesty}>{strings.honesty}</p>
      {view === "choice" ? (
        <>
          <button
            type="button"
            className={`${styles.card} pressable`}
            onClick={() => setView("phone")}
          >
            {strings.withNumber}
          </button>
          <button type="button" className={styles.tertiary} onClick={onGuest}>
            {strings.guest}
          </button>
        </>
      ) : view === "phone" ? (
        <form className={styles.authStack} onSubmit={handlePhone}>
          <Field
            id={PHONE_ID}
            label={strings.phoneLabel}
            helper={strings.phoneHelper}
            error={phoneError ?? undefined}
          >
            <input
              ref={phoneRef}
              id={PHONE_ID}
              name="phone"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className={styles.input}
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                if (phoneError) setPhoneError(null);
              }}
              aria-invalid={phoneError ? true : undefined}
              aria-describedby={phoneError ? errorId(PHONE_ID) : helperId(PHONE_ID)}
            />
          </Field>
          <button type="submit" className={`${styles.cta} pressable`}>
            {strings.phoneCta}
          </button>
          <button type="button" className={styles.tertiary} onClick={() => setView("choice")}>
            {strings.guest}
          </button>
        </form>
      ) : (
        <form className={styles.authStack} onSubmit={handleOtp}>
          <Field
            id={OTP_ID}
            label={strings.otpLabel}
            helper={strings.otpHelper}
            error={otpError ?? undefined}
          >
            <input
              ref={otpRef}
              id={OTP_ID}
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={styles.input}
              value={otp}
              onChange={(event) => {
                setOtp(event.target.value);
                if (otpError) setOtpError(null);
              }}
              aria-invalid={otpError ? true : undefined}
              aria-describedby={otpError ? errorId(OTP_ID) : helperId(OTP_ID)}
            />
          </Field>
          <button type="submit" className={`${styles.cta} pressable`}>
            {strings.phoneCta}
          </button>
        </form>
      )}
    </div>
  );
}
