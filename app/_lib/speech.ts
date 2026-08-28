"use client";

/**
 * Thin wrapper over the Web Speech API's recognition half, used by S2
 * (problem capture) and S3 (voice answers). The wrapper exists so the
 * screens never touch the vendor-prefixed global directly and so the
 * failure reasons arrive already mapped onto the D5 error taxonomy:
 *
 *   denied       -> E-05 (permission denied) / E-06 (revoked mid-session)
 *   empty        -> E-02 (nothing captured)
 *   failed       -> E-04 (transcription failure)
 *   interrupted  -> E-07 (capture interrupted)
 *   unavailable  -> the API is not present (route to S2b via the E-04 path)
 */

export type CaptureError =
  | "denied"
  | "empty"
  | "failed"
  | "interrupted"
  | "unavailable";

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => RecognitionLike;

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, RecognitionCtor | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechHandlers {
  /** Interim hypotheses while speaking; render in the user's script. */
  onPartial: (text: string) => void;
  /** Final text for the review step. */
  onFinal: (text: string) => void;
  onError: (error: CaptureError) => void;
  /** Recognition pipe closed for any reason. */
  onEnd: () => void;
}

export class SpeechCapture {
  private recognition: RecognitionLike | null = null;
  private finalReceived = false;

  static isSupported(): boolean {
    return ctor() !== null;
  }

  start(lang: string, handlers: SpeechHandlers): void {
    const Recognition = ctor();
    if (!Recognition) {
      handlers.onError("unavailable");
      return;
    }
    this.stop();
    this.finalReceived = false;

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: unknown) => {
      const e = event as {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      };
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          this.finalReceived = true;
          handlers.onFinal(text.trim());
        } else {
          interim += text;
        }
      }
      if (interim) handlers.onPartial(interim.trim());
    };

    recognition.onerror = (event) => {
      const raw = event.error ?? "";
      const mapped: CaptureError =
        raw === "not-allowed" || raw === "service-not-allowed"
          ? "denied"
          : raw === "no-speech"
            ? "empty"
            : raw === "aborted"
              ? "interrupted"
              : "failed";
      handlers.onError(mapped);
    };

    recognition.onend = () => handlers.onEnd();

    this.recognition = recognition;
    try {
      recognition.start();
    } catch {
      handlers.onError("failed");
    }
  }

  /** Graceful stop: lets the engine flush a final result. */
  stop(): void {
    this.recognition?.stop();
    this.recognition = null;
  }

  /** Hard stop: discards the pipe (used when leaving the screen). */
  abort(): void {
    this.recognition?.abort();
    this.recognition = null;
  }

  /** Whether a final transcript arrived before the pipe closed. */
  get hasFinal(): boolean {
    return this.finalReceived;
  }
}
