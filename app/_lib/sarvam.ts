import { SarvamAIClient } from "sarvamai";

let client: SarvamAIClient | null = null;

/** Bracket access so Next does not bake an empty key in at build time. */
function sarvamKey(): string | undefined {
  const value = process.env["SARVAM_API_KEY"];
  return value?.trim() || undefined;
}

export function getSarvam(): SarvamAIClient {
  const key = sarvamKey();
  if (!key) {
    throw new Error("SARVAM_API_KEY is not set");
  }
  if (!client) {
    client = new SarvamAIClient({ apiSubscriptionKey: key });
  }
  return client;
}

export function hasSarvamKey(): boolean {
  return Boolean(sarvamKey());
}
