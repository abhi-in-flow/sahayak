import type { VoiceLocale } from "../sarvamLang";
import { blobToWav } from "../wav";

const MIN_BLOB_BYTES = 2_000;

export function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/mpeg",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

/** Empty string = silence. null = STT failed. */
export async function transcribeAudio(blob: Blob, language: VoiceLocale): Promise<string | null> {
  let wav: Blob;
  try {
    wav = await blobToWav(blob);
  } catch {
    return null;
  }
  if (wav.size < MIN_BLOB_BYTES) return "";
  const form = new FormData();
  form.append("file", new File([wav], "speech.wav", { type: "audio/wav" }));
  form.append("language", language);
  const response = await fetch("/api/stt", { method: "POST", body: form });
  if (!response.ok) return null;
  const data = (await response.json()) as { transcript?: string };
  return data.transcript?.trim() || "";
}
