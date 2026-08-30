export const VOICE_LOCALES = ["en-IN", "hi-IN", "kn-IN", "mr-IN", "as-IN"] as const;

export type VoiceLocale = (typeof VOICE_LOCALES)[number];

const ALIAS: Record<string, VoiceLocale> = {
  en: "en-IN",
  "en-in": "en-IN",
  hi: "hi-IN",
  "hi-in": "hi-IN",
  kn: "kn-IN",
  "kn-in": "kn-IN",
  mr: "mr-IN",
  "mr-in": "mr-IN",
  as: "as-IN",
  "as-in": "as-IN",
};

const NAMES: Record<VoiceLocale, string> = {
  "en-IN": "English",
  "hi-IN": "Hindi",
  "kn-IN": "Kannada",
  "mr-IN": "Marathi",
  "as-IN": "Assamese",
};

const FOLLOW_UP: Record<VoiceLocale, string> = {
  "en-IN": "Which district or city is this for?",
  "hi-IN": "यह किस ज़िले या शहर के लिए है?",
  "kn-IN": "ಇದು ಯಾವ ಜಿಲ್ಲೆ ಅಥವಾ ನಗರಕ್ಕೆ?",
  "mr-IN": "हे कोणत्या जिल्ह्यासाठी किंवा शहरासाठी आहे?",
  "as-IN": "এয়া কোনখন জিলা বা চহৰৰ বাবে?",
};

export function toVoiceLocale(code: string | undefined | null): VoiceLocale {
  if (!code) return "en-IN";
  const exact = VOICE_LOCALES.find((item) => item.toLowerCase() === code.toLowerCase());
  if (exact) return exact;
  return ALIAS[code.toLowerCase()] ?? "en-IN";
}

export function languageName(code: string | undefined | null): string {
  return NAMES[toVoiceLocale(code)];
}

/** Sarvam speaker per language. Assamese has no published voice; shubh is the try. */
export function ttsSpeaker(code: string | undefined | null): "ratan" | "shubh" | "rehan" {
  switch (toVoiceLocale(code)) {
    case "en-IN":
    case "mr-IN":
      return "ratan";
    default:
      return "shubh";
  }
}

export function defaultFollowUp(code: string | undefined | null): string {
  return FOLLOW_UP[toVoiceLocale(code)];
}

/** Latin-majority text is treated as English so we can replace a copied prompt example. */
export function looksEnglish(text: string): boolean {
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const letters = (text.match(/[A-Za-z\u0900-\u097F\u0C80-\u0CFF\u0980-\u09FF]/g) ?? []).length;
  if (letters === 0) return false;
  return latin / letters > 0.5;
}

/** Keep a model follow-up only if it is already in the selected language. */
export function localizeFollowUp(
  followUp: string | null | undefined,
  code: string | undefined | null,
): string | null {
  if (!followUp) return null;
  const voice = toVoiceLocale(code);
  if (voice === "en-IN") return followUp;
  if (looksEnglish(followUp)) return defaultFollowUp(voice);
  return followUp;
}

export function isStockFollowUp(value: string): boolean {
  const hay = value.replace(/\s+/g, " ").trim().toLowerCase();
  return Object.values(FOLLOW_UP).some((item) => item.toLowerCase() === hay);
}

export function isVoiceLocale(code: string | undefined | null): code is VoiceLocale {
  if (!code) return false;
  return VOICE_LOCALES.some((item) => item.toLowerCase() === code.toLowerCase());
}
