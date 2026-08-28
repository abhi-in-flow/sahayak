/**
 * SH1 string namespace. OWNERSHIP: the save-and-resume bottom sheet.
 * Key prefix "sh1.".
 *
 * D5 owns E-10/E-11/E-19 copy verbatim; D3 owns the honesty line, both
 * field helpers and the resend toast verbatim, including their dash
 * characters (the separator review is BUG-004, owned by the copy owner).
 * Strings authored here carry zero em/en dashes (D11 §1).
 */

export interface SH1Strings {
  "sh1.title": string;
  /** D3 SH1, verbatim; persistent on both steps. */
  "sh1.honesty": string;

  /* ---- step 1: phone ------------------------------------------------- */
  "sh1.phone.label": string;
  /** D3 SH1 helper, verbatim including its dash. */
  "sh1.phone.helper": string;
  "sh1.phone.cta": string;
  /** E-10 (empty or not 10 digits), D5 verbatim. */
  "sh1.error.E10": string;

  /* ---- step 2: OTP --------------------------------------------------- */
  "sh1.otp.label": string;
  /** D3 SH1 helper, verbatim including its dash. */
  "sh1.otp.helper": string;
  "sh1.otp.cta": string;
  /** D3 SH1 verbatim. */
  "sh1.otp.resend": string;
  /** D3 SH1 resend toast text, verbatim (rendered as an InlineNote). */
  "sh1.otp.resendNote": string;
  /** E-11, D5 verbatim. */
  "sh1.error.E11": string;

  /* ---- save ---------------------------------------------------------- */
  /** D3 SH1 Loading copy, verbatim. */
  "sh1.saving": string;
  /** E-19 local-fallback card, D5 verbatim. */
  "sh1.error.E19": string;
  "sh1.fallback.retry": string;
  "sh1.close": string;
  /** Live-region announcement on save success (D6 §6.2). */
  "sh1.announce.saved": string;
}

export const enSH1: SH1Strings = {
  "sh1.title": "Save your progress",
  "sh1.honesty": "This is a practice login. No SMS is sent.",

  "sh1.phone.label": "Your number",
  "sh1.phone.helper":
    "Choose any 10-digit number you'll remember — it's only used as a save key.",
  "sh1.phone.cta": "Continue",
  "sh1.error.E10": "Enter any 10-digit number you'll remember.",

  "sh1.otp.label": "Practice code",
  "sh1.otp.helper": "Enter 0000 — this is a practice code.",
  "sh1.otp.cta": "Save",
  "sh1.otp.resend": "Send the code again",
  "sh1.otp.resendNote": "Practice code: 0000",
  "sh1.error.E11": "The practice code is 0000.",

  "sh1.saving": "Saving…",
  "sh1.error.E19": "Saved on this device. We'll back it up when we can.",
  "sh1.fallback.retry": "Try again",
  "sh1.close": "Close",
  "sh1.announce.saved": "Your progress is saved.",
};

// Placeholder pending professional translation. Complete, not correct.
// See BUG-008. Must satisfy SH1Strings exactly (compile-enforced).
export const hiSH1: SH1Strings = {
  "sh1.title": "अपनी प्रगति सेव करें",
  "sh1.honesty": "यह एक अभ्यास लॉगिन है। कोई एसएमएस नहीं भेजा जाता।",

  "sh1.phone.label": "आपका नंबर",
  "sh1.phone.helper":
    "कोई भी 10 अंकों का नंबर चुनें जिसे आप याद रखें — इसका इस्तेमाल सिर्फ़ सेव कुंजी के रूप में होता है।",
  "sh1.phone.cta": "आगे बढ़ें",
  "sh1.error.E10": "कोई भी 10 अंकों का नंबर डालें जिसे आप याद रखें।",

  "sh1.otp.label": "अभ्यास कोड",
  "sh1.otp.helper": "0000 डालें — यह अभ्यास का कोड है।",
  "sh1.otp.cta": "सेव करें",
  "sh1.otp.resend": "कोड फिर से भेजें",
  "sh1.otp.resendNote": "अभ्यास कोड: 0000",
  "sh1.error.E11": "अभ्यास कोड 0000 है।",

  "sh1.saving": "सेव हो रहा है…",
  "sh1.error.E19": "इस डिवाइस पर सेव हो गया। जब हो सकेगा हम इसका बैकअप ले लेंगे।",
  "sh1.fallback.retry": "फिर कोशिश करें",
  "sh1.close": "बंद करें",
  "sh1.announce.saved": "आपकी प्रगति सेव हो गई है।",
};
