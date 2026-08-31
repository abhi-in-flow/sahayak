"use client";

/**
 * Read-aloud. Prefers Sarvam TTS (/api/tts). Falls back to the browser
 * Speech Synthesis API when the route is missing, offline, or errors.
 * Callers treat a false return as the E-01 path.
 */

import { isMuted } from "./voice/mute";

let currentAudio: HTMLAudioElement | null = null;
// Bumped by every stopSpeaking(); speak() takes a ticket so a stale call
// stops at its next checkpoint instead of talking over a newer one.
let speakSeq = 0;

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
      utterance.onerror = (event) => {
        // A deliberate stopSpeaking() mid-speech cancels the utterance;
        // that is success, not the E-01 path.
        resolve(event.error === "canceled" || event.error === "interrupted");
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve(false);
    }
  });
}

export async function speak(text: string, lang: string): Promise<boolean> {
  stopSpeaking();
  // Above the mute check: on the server, isMuted() would hydrate the
  // mute store's cache from absent storage and pin it to false.
  if (typeof window === "undefined") return false;
  const seq = ++speakSeq;
  if (isMuted()) return true; // skips the /api/tts round-trip too
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
      // Mute can flip, or a newer speak() can take over, during the
      // fetch; stopSpeaking() cannot cancel an element that does not
      // exist yet. Above createObjectURL so a superseded reply leaks
      // no blob URL and skips the decode work.
      if (seq !== speakSeq || isMuted()) return true;
      if (data.audio) {
        const bytes = Uint8Array.from(atob(data.audio), (ch) => ch.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
        const audio = new Audio(url);
        currentAudio = audio;
        try {
          let started = false;
          await new Promise<void>((resolve, reject) => {
            // onplaying, not onplay: play fires the moment paused flips
            // false, before any audio - setting started there would let
            // an autoplay-blocked play() resolve as success.
            audio.onplaying = () => {
              started = true;
            };
            audio.onended = () => resolve();
            audio.onpause = () => {
              if (started) resolve(); // stopSpeaking() pauses mid-play; settle instead of hang
            };
            audio.onerror = () => reject(new Error("play"));
            void audio.play().catch(() => reject(new Error("play")));
          });
        } finally {
          URL.revokeObjectURL(url);
          if (currentAudio === audio) currentAudio = null;
        }
        return true;
      }
    }
  } catch {
    // Fall through to browser synthesis - unless superseded or stopped.
  }
  if (seq !== speakSeq || isMuted()) return true;
  return browserSpeak(spoken, lang);
}

export function stopSpeaking(): void {
  speakSeq += 1;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}
