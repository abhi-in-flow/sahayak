"use client";

/**
 * Read-aloud. Prefers Sarvam TTS (/api/tts). Falls back to the browser
 * Speech Synthesis API when the route is missing, offline, or errors.
 * Callers treat a false return as the E-01 path.
 */

let currentAudio: HTMLAudioElement | null = null;

/** Speak the reply once. Never add a second question if the prose already asked one. */
export function spokenReply(reply: string, followUp: string | null | undefined): string {
  const base = reply.replace(/\s+/g, " ").trim();
  if (/[?？]/.test(base)) return base;
  const question = followUp?.replace(/\s+/g, " ").trim();
  if (!question) return base;
  const hay = base.toLowerCase();
  const needle = question.toLowerCase().replace(/[?!.？]+$/g, "");
  if (needle && hay.includes(needle)) return base;
  return `${base} ${question}`;
}

/** Drop URLs and collapse space so TTS does not spell out links. */
export function stripForSpeech(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\bwww\.\S+/gi, " ")
    .replace(/\b[a-z0-9-]+(?:\.[a-z]{2,})+(?:\/\S*)?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function browserSpeak(text: string, lang: string): Promise<boolean> {
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

export async function speak(text: string, lang: string): Promise<boolean> {
  stopSpeaking();
  if (typeof window === "undefined") return false;
  const spoken = stripForSpeech(text).slice(0, 2400);
  if (!spoken) return false;

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: spoken, language: lang }),
    });
    if (response.ok) {
      const data = (await response.json()) as { audio?: string };
      if (data.audio) {
        const bytes = Uint8Array.from(atob(data.audio), (ch) => ch.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
        const audio = new Audio(url);
        currentAudio = audio;
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("play"));
          void audio.play();
        });
        URL.revokeObjectURL(url);
        currentAudio = null;
        return true;
      }
    }
  } catch {
    // Fall through to browser synthesis.
  }

  return browserSpeak(spoken, lang);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}
