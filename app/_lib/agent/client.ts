"use client";

import { mutate, readState } from "../storage/local";
import type { TaskState } from "../storage/schema";

export interface AgentTaskDraft {
  title: string;
  detail: string;
  url?: string;
}

function isDeathCertificate(title: string): boolean {
  return /death\s*cert|मृत्यु\s*प्रमाण/i.test(title);
}

function toTasks(drafts: AgentTaskDraft[]): TaskState[] {
  const unique: AgentTaskDraft[] = [];
  const seen = new Set<string>();
  for (const draft of drafts) {
    const key = (draft.url || draft.title).trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(draft);
  }
  let usedT1 = false;
  return unique.slice(0, 6).map((draft, index) => {
    const death = !usedT1 && isDeathCertificate(draft.title);
    if (death) usedT1 = true;
    const detail = draft.detail
      .replace(draft.url ?? "", " ")
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return {
      code: death ? "T1" : `A${index + 1}`,
      title: draft.title,
      detail: detail && detail.toLowerCase() !== draft.title.toLowerCase() ? detail : draft.title,
      url: draft.url,
      status: "doNow",
      ackNumber: null,
      lockReason: null,
      archived: false,
    };
  });
}

/** Write agent-built steps onto the journey. Replaces prior agent tasks. */
export function persistAgentJourney(input: {
  userText: string;
  inputMode: "voice" | "text";
  summary: string;
  citations: { title: string; url?: string }[];
  tasks: AgentTaskDraft[];
}): void {
  mutate((draft) => {
    draft.source = "agent";
    draft.inputMode = input.inputMode;
    draft.state = readState();
    draft.transcript = [draft.transcript, input.userText].filter(Boolean).join("\n");
    draft.agentSummary = input.summary;
    draft.agentCitations = input.citations;
    draft.answers = [];
    draft.tasks = toTasks(input.tasks);
  });
}

/** Store a live-model reading on the journey. Failures are silent. */
export async function interpretAndStore(transcript: string, locale: string): Promise<void> {
  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: transcript, locale, state: readState() }),
      signal: AbortSignal.timeout(28_000),
    });
    if (!response.ok) return;
    const data = (await response.json()) as {
      summary?: string;
      citations?: { title: string; url?: string }[];
    };
    mutate((draft) => {
      draft.agentSummary = data.summary;
      draft.agentCitations = data.citations;
    });
  } catch {
    // Older Socratic path still runs if a caller uses this.
  }
}
