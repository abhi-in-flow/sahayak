"use client";

/**
 * Client-side speech synthesis for the A5 read-aloud requirement
 * (S1 audio preview, S3 question read-aloud, S4 summary read-aloud).
 *
 * The seeded audio assets do not exist yet; synthesis is the honest
 * prototype stand-in for a recorded greeting because it plays real
 * audio in the selected language. Callers treat a false return as the
 * E-01 path (inline note, control stays functional).
 *
 * Fails soft, never throws: audio is an enhancement layer over a fully
 * functional text UI on every screen that uses it.
 */
export function speak(text: string, lang: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.95;
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve(false);
    }
  });
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
