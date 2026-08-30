import { PromptTemplate } from "@langchain/core/prompts";
import { getSarvam } from "../sarvam";
import { defaultFollowUp, isStockFollowUp, languageName, localizeFollowUp, toVoiceLocale } from "../sarvamLang";
import { retrieveChunks, reuseSnapshot, type RetrievedChunk } from "../rag/retrieve";
import { planRetrieval } from "../rag/rewrite";
import type { OnboardState } from "../storage/schema";

export interface AgentCitation {
  title: string;
  url?: string;
}

export interface AgentTaskDraft {
  title: string;
  detail: string;
  url?: string;
}

export interface AgentTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AgentResult {
  reply: string;
  summary: string;
  citations: AgentCitation[];
  followUp: string | null;
  tasks: AgentTaskDraft[];
  engine: "sarvam" | "fallback";
}

const TEMPLATE = `You are Sahayak, an independent guide for Indian civic processes. You are not a government website. You never submit forms, take payments, or ask for Aadhaar, PAN, real OTP, or passwords.

Use ONLY the snapshot facts below. If a fact is missing, say you are not sure and point to an official URL from the snapshot. Never invent offices, fees, or URLs.

Snapshot (static, collected by the team, not a live government system):
{context}

Conversation so far:
{history}

Latest from the person:
{question}

Reply in plain sentences in {language} only. FOLLOWUP and spoken sentences must be {language}. TASK titles and URLs may stay as the official English names from the snapshot. Then add these lines exactly.

Allowed FOLLOWUP topics only: district or city, which listed service, or whether they already applied. Nothing else. Do not repeat a question already answered in the conversation. If Conversation so far is (none), you MUST ask one FOLLOWUP and emit TASKS: NONE.

While still unclear:
FOLLOWUP: {followUpExample}
TASKS: NONE

Once district/city and whether they applied are known:
FOLLOWUP: NONE
TASKS:
- Apply for Bakijai clearance | https://sewasetu.assam.gov.in/site/service-apply/issuance-of-bakijai-clearance-certificate | Use the official Sewa Setu Assam listing

The TASKS title must be the real step name, never the word Title. Every URL must come from the snapshot. While FOLLOWUP is not NONE, you MUST emit TASKS: NONE. If FOLLOWUP is NONE, you MUST emit at least one TASK (title | snapshot url | one-sentence detail). Never emit TASKS: NONE together with FOLLOWUP: NONE when the snapshot has a matching official URL. Death certificate in Assam may use the seeded registrar facts.`;

const prompt = PromptTemplate.fromTemplate(TEMPLATE);

function chunksFromPrior(citations: AgentCitation[]): RetrievedChunk[] {
  return citations
    .filter((cite) => cite.title.trim())
    .map((cite, index) => ({
      id: `prior-${index}`,
      title: cite.title,
      url: cite.url ?? "",
      fetchedAt: "",
      text: cite.url ? `Official listing: ${cite.url}` : cite.title,
      score: 1,
    }));
}

export async function runAgent(
  question: string,
  locale?: string,
  state?: OnboardState | null,
  history: AgentTurn[] = [],
  priorCitations: AgentCitation[] = [],
): Promise<AgentResult> {
  const retrieveContext = history
    .slice(-8)
    .map((turn) => turn.content)
    .join(" ");
  const isFollowUp = history.length > 0;
  const plan = await planRetrieval(question, retrieveContext, isFollowUp);
  const chunks =
    plan.action === "search"
      ? await retrieveChunks(question, 5, state, retrieveContext, plan)
      : reuseSnapshot(chunksFromPrior(priorCitations), question, retrieveContext, plan, 5);
  const citations: AgentCitation[] = chunks
    .filter((chunk) => chunk.score > 0 || chunks.every((c) => c.score === 0))
    .map((chunk) => ({ title: chunk.title, url: chunk.url || undefined }));

  const context =
    chunks
      .map((chunk) => `- ${chunk.title} (${chunk.fetchedAt}${chunk.url ? `; ${chunk.url}` : ""}): ${chunk.text}`)
      .join("\n") || "(none)";

  const historyText =
    history
      .slice(-8)
      .map((turn) => `${turn.role === "user" ? "Person" : "Sahayak"}: ${turn.content}`)
      .join("\n") || "(none)";

  const voice = toVoiceLocale(locale);
  const filled = await prompt.format({
    context,
    history: historyText,
    question: `[locale ${voice}] ${question}`,
    language: languageName(voice),
    followUpExample: defaultFollowUp(voice),
  });

  try {
    const response = await getSarvam().chat.completions({
      model: "sarvam-105b",
      temperature: 0.2,
      max_tokens: 2048,
      reasoning_effort: null as unknown as "low",
      messages: [
        {
          role: "system",
          content: `You are Sahayak. Guidance only. Never submit. Never invent offices or fees. Speak ${languageName(voice)} only.`,
        },
        { role: "user", content: filled },
      ],
    });
    const finish = response.choices[0]?.finish_reason;
    if (finish && finish !== "stop") {
      console.error("sarvam chat finish_reason", finish);
    }
    const text = response.choices[0]?.message?.content?.trim() ?? "";
    if (!text) throw new Error("empty");
    const parsedFollowUp = localizeFollowUp(parseFollowUp(text, history.length > 0), voice);
    const followUp =
      history.length === 0 ? parsedFollowUp ?? defaultFollowUp(voice) : parsedFollowUp;
    const parsed = parseTasks(text, citations);
    return {
      reply: stripMeta(text),
      summary: extractTag(text, "SUMMARY") || firstSentence(stripMeta(text)),
      citations,
      followUp,
      tasks: history.length === 0 ? [] : tasksWhenIntentClear(followUp, parsed),
      engine: "sarvam",
    };
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? String((error as { statusCode?: unknown }).statusCode)
        : error && typeof error === "object" && "status" in error
          ? String((error as { status?: unknown }).status)
          : "";
    console.error("sarvam chat failed", name, status);
    const fallback = chunks[0];
    const reply = fallback
      ? `From our snapshot: ${fallback.text}`
      : "I could not reach the live model. Say or type what you need and I will still use the saved directory.";
    return {
      reply,
      summary: fallback?.title ?? "Guide unavailable",
      citations,
      followUp: null,
      tasks: [],
      engine: "fallback",
    };
  }
}

/** Journey steps only after the model has no remaining question. */
export function tasksWhenIntentClear(
  followUp: string | null,
  parsed: AgentTaskDraft[],
): AgentTaskDraft[] {
  if (followUp) return [];
  return parsed;
}

function parseFollowUp(text: string, dropNonBlocking = false): string | null {
  const match = text.match(/FOLLOWUP:\s*(.+)/i);
  if (!match) return null;
  const value = match[1].trim();
  if (!value || /^none$/i.test(value)) return null;
  if (dropNonBlocking && !isBlockingFollowUp(value)) return null;
  return value;
}

/** Only district/city, which service, or already-applied may keep the journey closed. */
export function isBlockingFollowUp(value: string): boolean {
  if (isStockFollowUp(value)) return true;
  const hay = value.toLowerCase();
  if (/\b(district|city|town|taluka|tehsil|state|where)\b/.test(hay)) return true;
  if (/\bwhich\b/.test(hay) && /\b(service|certificate|notice|form)\b/.test(hay)) return true;
  if (/\bappl(y|ied|ication)\b/.test(hay)) return true;
  if (/ಜಿಲ್ಲೆ|ನಗರ|जिल्ह|शहर|ज़िल|জিলা|চহৰ/.test(value)) return true;
  return false;
}

function parseTasks(text: string, citations: AgentCitation[]): AgentTaskDraft[] {
  if (/TASKS:\s*NONE/i.test(text)) return [];
  const after = text.split(/TASKS:/i)[1];
  if (!after) return [];
  const block = after.split(/FOLLOWUP:/i)[0];
  const lines = block.split("\n");
  const tasks: AgentTaskDraft[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/^[-*]\s*/, "").trim();
    if (!cleaned) continue;
    const parts = cleaned.split("|").map((part) => part.trim());
    const title = parts[0];
    if (!title || /^title$/i.test(title)) continue;
    const maybeUrl = parts.find((part) => /^https?:\/\//i.test(part));
    const detail = parts.filter((part) => part !== title && part !== maybeUrl).join(" ") || title;
    const url = maybeUrl || citations.find((cite) => cite.title === title)?.url;
    tasks.push({ title, detail, url });
  }
  return tasks.slice(0, 6);
}

function extractTag(text: string, tag: string): string | null {
  const match = text.match(new RegExp(`${tag}:\\s*(.+)`, "i"));
  return match?.[1]?.trim() ?? null;
}

function stripMeta(text: string): string {
  return text.replace(/\n?(SUMMARY|SOURCES|FOLLOWUP|TASKS):[\s\S]*$/i, "").trim();
}

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]?/);
  return match?.[0]?.trim() ?? text.slice(0, 160);
}
