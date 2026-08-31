"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, errorId, helperId } from "@/app/_components/Field";
import { InlineNote } from "@/app/_components/InlineNote";
import { withLocale } from "@/app/_lib/nav";
import { clearChats } from "@/app/_lib/chat/store";
import {
  clearSession,
  readSessionLast4,
  writeSession,
} from "@/app/_lib/storage/local";
import styles from "./page.module.css";

export interface LoginFormStrings {
  honesty: string;
  phoneLabel: string;
  phoneHelper: string;
  phoneCta: string;
  phoneError: string;
  otpLabel: string;
  otpHelper: string;
  otpCta: string;
  otpError: string;
  resend: string;
  resendNote: string;
  done: string;
  signOut: string;
  guest: string;
  back: string;
  sessionIn: string;
}

const PHONE_ID = "login-phone";
const OTP_ID = "login-otp";

export function LoginForm({
  localeCode,
  strings,
}: {
  localeCode: string;
  strings: LoginFormStrings;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendNote, setResendNote] = useState(false);
  const [last4, setLast4] = useState<string | null>(null);

  const phoneRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // localStorage is client-only; seed after mount to avoid hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLast4(readSessionLast4());
  }, []);

  useEffect(() => {
    if (last4) return;
    const frame = requestAnimationFrame(() => {
      (step === 1 ? phoneRef : otpRef).current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [step, last4]);

  const handleContinue = (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{10}$/.test(phone)) {
      setPhoneError(strings.phoneError);
      return;
    }
    setPhoneError(null);
    setResendNote(false);
    setStep(2);
  };

  const handleSignIn = (event: FormEvent) => {
    event.preventDefault();
    if (otp !== "0000") {
      setOtpError(strings.otpError);
      return;
    }
    writeSession(phone);
    setLast4(phone.slice(-4));
    router.push(withLocale("/", localeCode));
  };

  const handleSignOut = () => {
    clearSession();
    // Sign-out wipes the on-device transcript too: chats are practice
    // data scoped to a session, never an account.
    clearChats();
    setLast4(null);
    setStep(1);
    setPhone("");
    setOtp("");
  };

  if (last4) {
    return (
      <div className={styles.stack}>
        <p className={styles.honesty}>{strings.honesty}</p>
        <p className={styles.session}>{strings.sessionIn.replace("{last4}", last4)}</p>
        <p>{strings.done}</p>
        <Link href={withLocale("/", localeCode)} className={`${styles.primary} pressable`}>
          {strings.back}
        </Link>
        <button type="button" className={styles.tertiary} onClick={handleSignOut}>
          {strings.signOut}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <p className={styles.honesty}>{strings.honesty}</p>
      <form className={styles.stack} onSubmit={step === 1 ? handleContinue : handleSignIn}>
        {step === 1 ? (
          <>
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
                aria-describedby={phoneError ? errorId(PHONE_ID) : helperId(PHONE_ID)}
              />
            </Field>
            <button type="submit" className={`${styles.primary} pressable`}>
              {strings.phoneCta}
            </button>
          </>
        ) : (
          <>
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
                aria-describedby={otpError ? errorId(OTP_ID) : helperId(OTP_ID)}
              />
            </Field>
            {resendNote ? <InlineNote tone="info">{strings.resendNote}</InlineNote> : null}
            <button type="button" className={styles.tertiary} onClick={() => setResendNote(true)}>
              {strings.resend}
            </button>
            <button type="submit" className={`${styles.primary} pressable`}>
              {strings.otpCta}
            </button>
          </>
        )}
      </form>
      <Link href={withLocale("/", localeCode)} className={styles.tertiary}>
        {strings.guest}
      </Link>
    </div>
  );
}
