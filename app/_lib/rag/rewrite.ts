import { getSarvam, hasSarvamKey } from "../sarvam";

export type SearchTopic = "death" | "bakijai" | "income" | "other";

export type RetrievalPlan =
  | { action: "search"; english: string; topic: SearchTopic }
  | { action: "skip"; english: ""; topic: SearchTopic };

export interface QueryWriterLog {
  source: "rules" | "llm" | "fallback";
  isFollowUp: boolean;
  latest: string;
  context: string;
  action: "search" | "skip";
  english: string;
  topic: SearchTopic;
  messages?: { role: string; content: string }[];
  raw?: string;
  error?: string;
}

const RULES: { topic: SearchTopic; english: string; cues: string[] }[] = [
  {
    topic: "death",
    english: "death certificate",
    cues: ["death", "मृत्यु", "मृत्यू", "ಮರಣ", "মৃত্যু"],
  },
  {
    topic: "bakijai",
    english: "bakijai clearance",
    cues: ["bakijai", "बाकीजाई", "ಬಾಕಿಜಾಯಿ", "বাকিজাই"],
  },
  {
    topic: "income",
    english: "income certificate",
    cues: ["income certificate", "आय प्रमाण", "ಆದಾಯ", "उत्पन्न प्रमाण", "আয় প্ৰমাণ"],
  },
];

export function topicFromText(text: string): SearchTopic | null {
  const hay = text.toLowerCase();
  for (const rule of RULES) {
    if (rule.cues.some((cue) => hay.includes(cue))) return rule.topic;
  }
  return null;
}

export function topicPhrase(topic: SearchTopic): string {
  if (topic === "other") return "";
  return RULES.find((rule) => rule.topic === topic)?.english ?? "";
}

/**
 * Decide whether to hit the English directory.
 * Follow-ups skip unless this message names a service.
 * Returns null when a first-turn rewrite still needs the model.
 */
export function planRetrievalSync(latest: string, context = "", isFollowUp = false): RetrievalPlan | null {
  const latestTopic = topicFromText(latest);
  const contextTopic = topicFromText(context);

  if (isFollowUp) {
    if (latestTopic) {
      return { action: "search", english: topicPhrase(latestTopic), topic: latestTopic };
    }
    return { action: "skip", english: "", topic: contextTopic ?? "other" };
  }

  if (latestTopic) {
    return { action: "search", english: topicPhrase(latestTopic), topic: latestTopic };
  }
  return null;
}

function parsePlan(text: string, fallback: string): RetrievalPlan {
  if (/SEARCH:\s*(NONE|NO|SKIP)/i.test(text)) {
    return { action: "skip", english: "", topic: "other" };
  }
  const queryMatch = text.match(/QUERY:\s*(.+)/i);
  const topicMatch = text.match(/TOPIC:\s*(death|bakijai|income|other)/i);
  const english = queryMatch?.[1]?.trim().replace(/^["']|["']$/g, "") || fallback;
  const topic = (topicMatch?.[1]?.toLowerCase() as SearchTopic | undefined) ?? "other";
  if (!english) return { action: "skip", english: "", topic };
  return { action: "search", english: english.slice(0, 160), topic };
}

function writerLog(
  source: QueryWriterLog["source"],
  latest: string,
  context: string,
  isFollowUp: boolean,
  plan: RetrievalPlan,
  extra: Partial<QueryWriterLog> = {},
): QueryWriterLog {
  return {
    source,
    isFollowUp,
    latest,
    context,
    action: plan.action,
    english: plan.english,
    topic: plan.topic,
    ...extra,
  };
}

/** Query-writer node: search, skip, or rewrite into English. */
export async function planRetrieval(
  latest: string,
  context = "",
  isFollowUp = false,
): Promise<{ plan: RetrievalPlan; log: QueryWriterLog }> {
  const ruled = planRetrievalSync(latest, context, isFollowUp);
  if (ruled) return { plan: ruled, log: writerLog("rules", latest, context, isFollowUp, ruled) };

  const trimmed = latest.trim();
  if (!trimmed || !hasSarvamKey()) {
    const plan: RetrievalPlan = trimmed
      ? { action: "search", english: trimmed, topic: "other" }
      : { action: "skip", english: "", topic: "other" };
    return { plan, log: writerLog("fallback", latest, context, isFollowUp, plan) };
  }

  const messages = [
    {
      role: "system",
      content:
        "You write searches for an English government-service directory. If the person named a civic service, output:\nQUERY: death certificate\nTOPIC: death\nTOPIC must be death, bakijai, income, or other. QUERY is 2 to 6 English words.\nIf they only greeted, answered a follow-up (district, city, already applied), or did not name a service, output:\nSEARCH: NONE\nNo extra text.",
    },
    {
      role: "user",
      content: context.trim()
        ? `Earlier: ${context.slice(0, 400)}\nLatest: ${trimmed}`
        : trimmed,
    },
  ];

  try {
    const response = await getSarvam().chat.completions({
      model: "sarvam-105b",
      temperature: 0,
      max_tokens: 80,
      reasoning_effort: null as unknown as "low",
      messages,
    });
    const text = response.choices[0]?.message?.content?.trim() ?? "";
    const plan = text ? parsePlan(text, trimmed) : ({ action: "search", english: trimmed, topic: "other" } as RetrievalPlan);
    return {
      plan,
      log: writerLog("llm", latest, context, isFollowUp, plan, { messages, raw: text }),
    };
  } catch (error) {
    const plan: RetrievalPlan = { action: "search", english: trimmed, topic: "other" };
    return {
      plan,
      log: writerLog("fallback", latest, context, isFollowUp, plan, {
        messages,
        error: error instanceof Error ? error.message : "query writer failed",
      }),
    };
  }
}
