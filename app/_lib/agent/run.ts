import { getSarvam } from "../sarvam";
import { defaultFollowUp, isStockFollowUp, languageName, localizeFollowUp, toVoiceLocale } from "../sarvamLang";
import { retrieveChunks, reuseSnapshotWithLog, type RetrievedChunk } from "../rag/retrieve";
import { planRetrieval } from "../rag/rewrite";
import type { OnboardState } from "../storage/schema";
import { field, makeStep, nowMs, type AgentDebugStep, type AgentDebugTrace } from "./trace";

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

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AgentResult {
  reply: string;
  summary: string;
  citations: AgentCitation[];
  followUp: string | null;
  tasks: AgentTaskDraft[];
  engine: "sarvam" | "fallback";
  debug?: AgentDebugTrace;
}

/** System + prior turns + latest user. Snapshot stays in system, not in one stuffed prompt. */
export function buildReplyMessages(input: {
  language: string;
  followUpExample: string;
  snapshot: string;
  history: AgentTurn[];
  question: string;
  firstTurn: boolean;
}): ChatMessage[] {
  const system = [
    "You are Sahayak, an independent civic guide for India. You are not a government website.",
    "Never submit forms, take payments, or ask for Aadhaar, PAN, OTP, or passwords.",
    "Use ONLY the snapshot. If a fact is missing, say you are not sure. Never invent an office, fee, URL, or service name.",
    `Speak ${input.language} only. Write 1 to 3 short spoken sentences first, then the two trailer lines.`,
    "Trailer format:",
    `FOLLOWUP: ${input.followUpExample}`,
    "TASKS: NONE",
    "or, only after district/city and already-applied are known from this chat:",
    "FOLLOWUP: NONE",
    "TASKS:",
    "- <copy a title from the snapshot> | <copy that row's url> | <one sentence from that row>",
    "FOLLOWUP may only ask district or city, which snapshot service, or whether they already applied.",
    input.firstTurn
      ? "This is the first user message: ask one FOLLOWUP and set TASKS: NONE."
      : "Do not repeat a question already answered in the messages below.",
    "Copy TASK titles and URLs only from the snapshot. If the snapshot is about a death certificate, do not mention any other certificate or clearance.",
    "",
    "Snapshot (static, not a live government system):",
    input.snapshot,
  ].join("\n");

  const messages: ChatMessage[] = [{ role: "system", content: system }];
  for (const turn of input.history.slice(-8)) {
    const content = turn.content.trim().slice(0, 800);
    if (!content) continue;
    messages.push({ role: turn.role, content });
  }
  messages.push({ role: "user", content: input.question.trim().slice(0, 800) });
  return messages;
}

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
  collectDebug = false,
): Promise<AgentResult> {
  const startedAt = new Date().toISOString();
  const t0 = nowMs();
  const steps: AgentDebugStep[] = [];

  const retrieveContext = history
    .slice(-8)
    .map((turn) => turn.content)
    .join(" ");
  const isFollowUp = history.length > 0;
  const voice = toVoiceLocale(locale);

  steps.push(
    makeStep("input", "1. Input", t0, {
      status: "ok",
      summary: isFollowUp ? "Follow-up turn" : "First turn",
      fields: [
        field("question", question),
        field("locale", voice),
        field("state", state ?? "none"),
        field("follow-up", isFollowUp),
        field("history turns", history.length),
        field("history text", retrieveContext || "(none)"),
        field("prior citations", priorCitations.map((cite) => cite.title)),
      ],
    }),
  );

  const writerStarted = nowMs();
  const { plan, log: writerLog } = await planRetrieval(question, retrieveContext, isFollowUp);
  steps.push(
    makeStep("query_writer", "2. Query writer", writerStarted, {
      status: writerLog.error ? "error" : plan.action === "skip" ? "skip" : "ok",
      summary:
        plan.action === "skip"
          ? `Skip search (${writerLog.source})`
          : `Search "${plan.english}" via ${writerLog.source}`,
      fields: [
        field("source", writerLog.source),
        field("action", writerLog.action),
        field("english query", writerLog.english || "(none)"),
        field("topic", writerLog.topic),
        field("writer input", writerLog.messages?.map((row) => `${row.role}: ${row.content}`).join("\n\n") ?? "(rules, no LLM)"),
        field("writer raw output", writerLog.raw ?? "(no LLM call)"),
        field("error", writerLog.error ?? ""),
      ],
    }),
  );

  const retrieveStarted = nowMs();
  const retrieved =
    plan.action === "search"
      ? await retrieveChunks(question, 5, state, retrieveContext, plan)
      : reuseSnapshotWithLog(chunksFromPrior(priorCitations), question, retrieveContext, plan, 5);
  const { chunks, log: retrieveLog } = retrieved;
  const citations: AgentCitation[] = chunks
    .filter((chunk) => chunk.score > 0 || chunks.every((c) => c.score === 0))
    .map((chunk) => ({ title: chunk.title, url: chunk.url || undefined }));

  steps.push(
    makeStep("retrieve", "3. Retrieve", retrieveStarted, {
      status: retrieveLog.error ? "error" : retrieveLog.action === "skip" ? "skip" : "ok",
      summary:
        retrieveLog.action === "skip"
          ? `No Weaviate call · ${retrieveLog.final.length} reused rows`
          : `${retrieveLog.source} · query "${retrieveLog.query}" · ${retrieveLog.final.length} kept`,
      fields: [
        field("Weaviate query", retrieveLog.query),
        field("source", retrieveLog.source),
        field("configured", retrieveLog.weaviateConfigured),
        field("alpha", retrieveLog.alpha ?? ""),
        field("limit", retrieveLog.limit ?? ""),
        field("filter", retrieveLog.filter),
        field("topic haystack", retrieveLog.topicHay),
        field("raw hits", retrieveLog.rawHits),
        field("dropped", retrieveLog.dropped),
        field("aliases", retrieveLog.aliases),
        field("final snapshot", retrieveLog.final),
        field("error", retrieveLog.error ?? ""),
      ],
    }),
  );

  const context =
    chunks
      .map((chunk) => `- ${chunk.title} (${chunk.fetchedAt}${chunk.url ? `; ${chunk.url}` : ""}): ${chunk.text}`)
      .join("\n") || "(none)";

  const messages = buildReplyMessages({
    language: languageName(voice),
    followUpExample: defaultFollowUp(voice),
    snapshot: context,
    history,
    question,
    firstTurn: !isFollowUp,
  });

  const finish = (partial: Omit<AgentResult, "debug">, extra?: AgentDebugStep): AgentResult => {
    if (extra) steps.push(extra);
    return {
      ...partial,
      debug: collectDebug
        ? { version: 1, startedAt, elapsedMs: nowMs() - t0, steps }
        : undefined,
    };
  };

  const replyStarted = nowMs();
  try {
    const response = await getSarvam().chat.completions({
      model: "sarvam-105b",
      temperature: 0.2,
      max_tokens: 2048,
      reasoning_effort: "low",
      messages,
    });
    const reason = response.choices[0]?.finish_reason;
    if (reason && reason !== "stop") {
      console.error("sarvam chat finish_reason", reason);
    }
    const text = response.choices[0]?.message?.content?.trim() ?? "";
    if (!text) throw new Error("empty");
    const parsedFollowUp = localizeFollowUp(parseFollowUp(text, history.length > 0), voice);
    const followUp =
      history.length === 0 ? parsedFollowUp ?? defaultFollowUp(voice) : parsedFollowUp;
    const parsed = snapshotTasks(parseTasks(text, citations), citations, followUp, history.length === 0);
    const tasks = parsed;
    const reply = spokenFromModel(text, tasks);
    steps.push(
      makeStep("reply", "4. Reply model", replyStarted, {
        status: "ok",
        summary: `sarvam-105b · finish ${reason ?? "stop"}`,
        fields: [
          field("messages", messages.map((row) => `${row.role}: ${row.content}`).join("\n---\n")),
          field("temperature", 0.2),
          field("reasoning_effort", "low"),
          field("raw model output", text),
          field("finish", reason ?? ""),
        ],
      }),
    );
    steps.push(
      makeStep("parse", "5. Parse", nowMs(), {
        status: "ok",
        summary: followUp ? `FOLLOWUP open · ${tasks.length} tasks` : `FOLLOWUP none · ${tasks.length} tasks`,
        fields: [
          field("spoken reply", reply),
          field("follow-up", followUp ?? "NONE"),
          field("tasks after intent gate", tasks),
          field("citations", citations),
        ],
      }),
    );
    return finish({
      reply,
      summary: extractTag(text, "SUMMARY") || firstSentence(reply),
      citations,
      followUp,
      tasks,
      engine: "sarvam",
    });
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
    return finish(
      {
        reply,
        summary: fallback?.title ?? "Guide unavailable",
        citations,
        followUp: null,
        tasks: [],
        engine: "fallback",
      },
      makeStep("reply", "4. Reply model", replyStarted, {
        status: "error",
        summary: `fallback · ${name} ${status}`.trim(),
        fields: [
          field("messages", messages.map((row) => `${row.role}: ${row.content}`).join("\n---\n")),
          field("error", [name, status].filter(Boolean).join(" ")),
        ],
      }),
    );
  }
}

/** Spoken line when the model emitted only FOLLOWUP/TASKS. */
export function spokenFromModel(text: string, tasks: AgentTaskDraft[] = []): string {
  const spoken = stripMeta(text);
  if (spoken) return spoken;
  const first = tasks[0];
  if (first) return `The official next step is ${first.title}.`;
  return "I have the official steps from our snapshot.";
}

/** Keep only snapshot URLs; if intent is clear and the model copied a wrong service, use citations. */
export function snapshotTasks(
  parsed: AgentTaskDraft[],
  citations: AgentCitation[],
  followUp: string | null,
  firstTurn: boolean,
): AgentTaskDraft[] {
  if (firstTurn) return [];
  const allowed = parsed.filter((task) => {
    if (!task.url) return citations.some((cite) => cite.title === task.title);
    return citations.some((cite) => cite.url === task.url);
  });
  const gated = tasksWhenIntentClear(followUp, allowed);
  if (followUp || gated.length > 0) return gated;
  return citations
    .filter((cite) => cite.url)
    .slice(0, 6)
    .map((cite) => ({ title: cite.title, detail: cite.title, url: cite.url }));
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
