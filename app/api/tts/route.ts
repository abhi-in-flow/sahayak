import { NextResponse } from "next/server";
import { getSarvam, hasSarvamKey } from "@/app/_lib/sarvam";
import { toVoiceLocale, ttsSpeaker } from "@/app/_lib/sarvamLang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!hasSarvamKey()) {
    return NextResponse.json({ error: "tts unavailable" }, { status: 503 });
  }

  let body: { text?: string; language?: string };
  try {
    body = (await request.json()) as { text?: string; language?: string };
  } catch {
    return NextResponse.json({ error: "malformed" }, { status: 400 });
  }

  const text = body.text?.trim() ?? "";
  if (!text) return NextResponse.json({ error: "missing text" }, { status: 400 });

  const voice = toVoiceLocale(body.language);

  try {
    const audio = await convertSpeech(text.slice(0, 2400), voice);
    if (!audio) return NextResponse.json({ error: "empty audio" }, { status: 502 });
    return NextResponse.json({ audio });
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? String((error as { statusCode?: unknown }).statusCode)
        : "";
    console.error("tts failed", name, status);
    return NextResponse.json({ error: "tts failed" }, { status: 502 });
  }
}

async function convertSpeech(text: string, language: ReturnType<typeof toVoiceLocale>): Promise<string> {
  const tryConvert = async (language_code: string, speaker: string) => {
    const response = await getSarvam().textToSpeech.convert({
      text,
      language_code: language_code as "hi-IN" | "en-IN",
      model: "bulbul:v3",
      speaker: speaker as "shubh",
      pace: 0.9,
    });
    return response.audios?.join("") ?? "";
  };

  try {
    return await tryConvert(language, ttsSpeaker(language));
  } catch (error) {
    if (language === "as-IN") {
      console.error("tts as-IN rejected, retrying bn-IN");
      return tryConvert("bn-IN", "rehan");
    }
    throw error;
  }
}
