import { NextResponse } from "next/server";
import { getSarvam, hasSarvamKey } from "@/app/_lib/sarvam";
import { isVoiceLocale, toVoiceLocale } from "@/app/_lib/sarvamLang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!hasSarvamKey()) {
    return NextResponse.json({ error: "stt unavailable" }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "missing audio" }, { status: 400 });
  }
  if (file.size > 8_000_000) {
    return NextResponse.json({ error: "audio too large" }, { status: 413 });
  }

  const raw = typeof form.get("language") === "string" ? String(form.get("language")) : "";
  const language_code = isVoiceLocale(raw) || ALIAS_OK.has(raw.toLowerCase()) ? toVoiceLocale(raw) : "unknown";

  const named =
    file.type.includes("wav") || file.name.toLowerCase().endsWith(".wav")
      ? new File([file], "speech.wav", { type: "audio/wav" })
      : file;

  try {
    const response = await getSarvam().speechToText.transcribe({
      file: named,
      model: "saaras:v3",
      mode: "transcribe",
      language_code,
    });
    const transcript = response.transcript?.trim() ?? "";
    if (!transcript) {
      return NextResponse.json({ error: "empty" }, { status: 422 });
    }
    return NextResponse.json({ transcript });
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? String((error as { statusCode?: unknown }).statusCode)
        : "";
    console.error("stt failed", name, status);
    return NextResponse.json({ error: "stt failed" }, { status: 502 });
  }
}

const ALIAS_OK = new Set(["en", "hi", "kn", "mr", "as"]);
