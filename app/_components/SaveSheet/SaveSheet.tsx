"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { LocaleDefinition } from "@/app/_lib/i18n";
import { t } from "@/app/_lib/i18n";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { Field, errorId, helperId } from "@/app/_components/Field";
import { InlineNote } from "@/app/_components/InlineNote";
import { announce } from "@/app/_lib/announce";
import { withLocale } from "@/app/_lib/nav";
import { readJourney, writeSaveKey } from "@/app/_lib/storage/local";
import { hashSaveKey, pushSnapshot, toServerSnapshot } from "@/app/_lib/storage/sync";
import styles from "./SaveSheet.module.css";

/**
 * SH1 — Save & Resume Sheet. D3 SH1; D4 §4.1/§4.5; D5 §5.1.
 *
 * A bottom sheet over its host (S5); it never owns navigation state.
 * The save key is an invented lookup key, never a verified phone number
 * (C6): validation is exactly-10-digits and nothing is ever messaged.
 *
 * Save sequence: local save first and unconditionally (the save key to
 * T-LOCAL), then one T-SRV push. The push is awaited only to learn its
 * outcome for the sheet's own success/fallback treatment; the local save
 * stands either way (E-19, D4 §4.1). Offline short-circuits straight to
 * the E-19 fallback card without a network attempt (D3 SH1 edge case).
 */

const PHONE_ID = "sh1-phone";
const OTP_ID = "sh1-otp";

/** D5 §5.3: max non-cancellable submit window on SH1. */
const NON_CANCELLABLE_MS = 3000;

/**
 * Dev stub salt for the save-key hash, per D4/D7. A build constant, not
 * a secret; T-SRV is a development stub (see app/api/journey/route.ts).
 */
const DEV_SALT = "sbn-dev-salt";

export interface SaveSheetProps {
  open: boolean;
  onClose: () => void;
  locale: LocaleDefinition;
}

type Stage = "form" | "saving" | "fallback";

export function SaveSheet({ open, onClose, locale }: SaveSheetProps) {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("form");
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendNote, setResendNote] = useState(false);

  const phoneRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  // D3 SH1 Default: "Step 1; field focused." Focus must land after the
  // dialog's showModal() (a focus attempt inside a closed <dialog> is a
  // no-op), hence the frame delay. Re-run on step change for step 2.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      (step === 1 ? phoneRef : otpRef).current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, step]);

  // Dismiss is never destructive: the journey is already in T-LOCAL (P2),
  // dismissal only skips the server sync. During the saving window the
  // sheet is non-cancellable (D3 SH1 Disabled) and the guard below turns
  // every dismissal route (X, scrim, back) into a no-op.
  const handleClose = () => {
    if (stage === "saving") return;
    onClose();
  };

  /** One push attempt against T-SRV. Never throws (D4 §4.1). */
  const attemptPush = async (): Promise<"synced" | "failed"> => {
    const record = readJourney();
    if (!record) return "failed";
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      // D3 SH1 edge case: offline short-circuits to E-19 without a
      // network attempt. Local save already stands.
      return "failed";
    }
    const saveKeyHash = await hashSaveKey(phone, DEV_SALT);
    const snapshot = toServerSnapshot(record, saveKeyHash);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), NON_CANCELLABLE_MS);
    });
    try {
      const result = await Promise.race([pushSnapshot(snapshot), timeout]);
      // A slow push past the non-cancellable window lands on the E-19
      // fallback card; the push itself keeps running fire-and-forget and
      // the server's last-write-wins tolerates the late arrival.
      if (result === "timeout") return "failed";
      return result.status === "synced" ? "synced" : "failed";
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const finish = (outcome: "synced" | "failed") => {
    if (outcome === "synced") {
      announce(t(locale, "sh1.announce.saved"));
      onClose();
      // D3 SH1: success -> S9.
      router.push(withLocale("/saved", locale.code));
      return;
    }
    setStage("fallback");
    announce(t(locale, "sh1.error.E19"));
  };

  const runSave = async () => {
    setStage("saving");
    const outcome = await attemptPush();
    finish(outcome);
  };

  const handleContinue = (event: FormEvent) => {
    event.preventDefault();
    // D3 SH1 validation fires on Continue, never blocks typing.
    if (!/^\d{10}$/.test(phone)) {
      setPhoneError(t(locale, "sh1.error.E10"));
      return;
    }
    setPhoneError(null);
    setResendNote(false);
    setStep(2);
  };

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    // Idempotent per confirmation; repeat taps no-op (D4 §4.5).
    if (stage === "saving") return;
    if (otp !== "0000") {
      setOtpError(t(locale, "sh1.error.E11"));
      return;
    }
    setOtpError(null);
    // The local save happens first and stands regardless of the push.
    writeSaveKey(phone);
    void runSave();
  };

  const handleRetry = () => {
    // E-19 recovery: retry the push only; the local save stands.
    if (stage === "saving") return;
    void runSave();
  };

  const saving = stage === "saving";

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title={t(locale, "sh1.title")}
      closeLabel={t(locale, "sh1.close")}
    >
      {/* Persistent on both steps (D3 SH1). */}
      <p className={styles.honesty}>{t(locale, "sh1.honesty")}</p>

      {stage === "fallback" ? (
        <div className={styles.fallback}>
          <p className={styles.fallbackText}>{t(locale, "sh1.error.E19")}</p>
          <button type="button" className={`${styles.secondary} pressable`} onClick={handleRetry}>
            {t(locale, "sh1.fallback.retry")}
          </button>
        </div>
      ) : (
        <form className={styles.step} onSubmit={step === 1 ? handleContinue : handleSave}>
          {step === 1 ? (
            <>
              <Field
                id={PHONE_ID}
                label={t(locale, "sh1.phone.label")}
                helper={t(locale, "sh1.phone.helper")}
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
                    // The error clears as soon as the user types (D5 E-10).
                    if (phoneError) setPhoneError(null);
                  }}
                  disabled={saving}
                  aria-describedby={phoneError ? errorId(PHONE_ID) : helperId(PHONE_ID)}
                />
              </Field>
              <button type="submit" className={`${styles.primary} pressable`} disabled={saving}>
                {t(locale, "sh1.phone.cta")}
              </button>
            </>
          ) : (
            <>
              <Field
                id={OTP_ID}
                label={t(locale, "sh1.otp.label")}
                helper={t(locale, "sh1.otp.helper")}
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
                  disabled={saving}
                  aria-describedby={otpError ? errorId(OTP_ID) : helperId(OTP_ID)}
                />
              </Field>

              {/* D11 §4: the resend "toast" is an InlineNote inside the
                  sheet; no floating toast layer exists in this product. */}
              {resendNote ? (
                <InlineNote tone="info">{t(locale, "sh1.otp.resendNote")}</InlineNote>
              ) : null}

              <button
                type="button"
                className={styles.resend}
                onClick={() => setResendNote(true)}
                disabled={saving}
              >
                {t(locale, "sh1.otp.resend")}
              </button>

              {/* Determinate feedback is the label swap itself; D11 §1
                  bans spinners, so D3's "determinate spinner on CTA"
                  renders as this text instead. */}
              <button type="submit" className={`${styles.primary} pressable`} disabled={saving}>
                {saving ? t(locale, "sh1.saving") : t(locale, "sh1.otp.cta")}
              </button>
            </>
          )}
        </form>
      )}
    </BottomSheet>
  );
}
