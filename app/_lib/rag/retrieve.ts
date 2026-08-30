import { Filters } from "weaviate-client";
import type { OnboardState } from "../storage/schema";
import { CIVIC_COLLECTION, getWeaviate, hasWeaviate, type CivicProperties } from "../weaviate";
import corpus from "./corpus.json";
import type { RetrievalPlan } from "./rewrite";
import { topicPhrase } from "./rewrite";

export interface CorpusChunk {
  id: string;
  title: string;
  url: string;
  fetchedAt: string;
  text: string;
  region?: string;
}

export interface RetrievedChunk extends CorpusChunk {
  score: number;
}

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "for",
  "on",
  "is",
  "it",
  "this",
  "that",
  "with",
  "you",
  "your",
  "we",
  "our",
  "not",
]);

const STATE_NAME: Record<OnboardState, string> = {
  assam: "Assam",
  maharashtra: "Maharashtra",
  karnataka: "Karnataka",
  other: "",
};

/** Example-chip phrases. Always merge these seeds, even if the state filter dropped Assam. */
const EXAMPLE_ALIASES: { id: string; needles: string[] }[] = [
  {
    id: "bakijai-clearance",
    needles: ["bakijai", "बाकीजाई", "ಬಾಕಿಜಾಯಿ", "বাকিজাই"],
  },
  {
    id: "income-certificate-assam",
    needles: ["income certificate", "आय प्रमाणपत्र", "आय प्रमाण", "ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ", "उत्पन्न प्रमाणपत्र", "আয় প্ৰমাণপত্ৰ"],
  },
  {
    id: "t1-death-cert",
    needles: [
      "death certificate",
      "मृत्यु प्रमाणपत्र",
      "मृत्यु प्रमाण",
      "मृत्यू प्रमाणपत्र",
      "ಮರಣ ಪ್ರಮಾಣಪತ್ರ",
      "মৃত্যু প্ৰমাণপত্ৰ",
    ],
  },
];

/** If the query names a service family, a hit must belong to that family. */
const TOPIC_ANCHORS: { cue: string[]; must: string[] }[] = [
  {
    cue: ["death", "मृत्यु", "मृत्यू", "ಮರಣ", "মৃত্যু"],
    must: ["death", "मृत्यु", "मृत्यू", "ಮರಣ", "মৃত্যু"],
  },
  {
    cue: ["bakijai", "बाकीजाई", "ಬಾಕಿಜಾಯಿ", "বাকিজাই"],
    must: ["bakijai", "बाकीजाई"],
  },
  {
    cue: ["income certificate", "आय प्रमाण", "ಆದಾಯ", "उत्पन्न प्रमाण", "আয় প্ৰমাণ"],
    must: ["income", "आय", "ಆದಾಯ", "उत्पन्न", "আয়"],
  },
];

export function exampleAliasChunks(query: string): RetrievedChunk[] {
  const hay = query.toLowerCase();
  const pool = corpus as CorpusChunk[];
  const hits: RetrievedChunk[] = [];
  for (const alias of EXAMPLE_ALIASES) {
    if (!alias.needles.some((needle) => hay.includes(needle.toLowerCase()))) continue;
    const chunk = pool.find((row) => row.id === alias.id);
    if (chunk) hits.push({ ...chunk, score: 1 });
  }
  return hits;
}

export function topicRelevant(hit: Pick<CorpusChunk, "title" | "text">, query: string): boolean {
  const q = query.toLowerCase();
  const blob = `${hit.title} ${hit.text}`.toLowerCase();
  for (const topic of TOPIC_ANCHORS) {
    if (!topic.cue.some((cue) => q.includes(cue))) continue;
    return topic.must.some((must) => blob.includes(must));
  }
  return true;
}

export function mergeExampleAliases(hits: RetrievedChunk[], query: string, k: number): RetrievedChunk[] {
  const extras = exampleAliasChunks(query);
  const relevant = hits.filter((hit) => topicRelevant(hit, query));
  if (extras.length === 0) return relevant.slice(0, k);
  const seen = new Set(extras.map((row) => row.title));
  const rest = relevant.filter((row) => !seen.has(row.title) && !extras.some((extra) => extra.id === row.id));
  return [...extras, ...rest].slice(0, k);
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f\u0980-\u09ff\u0c80-\u0cff\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP.has(word));
}

function inScope(chunk: CorpusChunk, state?: OnboardState | null): boolean {
  if (!state || state === "other" || !chunk.region) return true;
  const wanted = STATE_NAME[state];
  return chunk.region === wanted || chunk.region === "Central";
}

/** Keyword overlap over the small seeded fact list. Used when Weaviate is down. */
function keywordFallback(query: string, k: number, state?: OnboardState | null): RetrievedChunk[] {
  const pool = (corpus as CorpusChunk[]).filter((chunk) => inScope(chunk, state));
  const q = tokens(query);
  if (q.length === 0) return pool.slice(0, k).map((chunk) => ({ ...chunk, score: 0 }));

  const scored = pool.map((chunk) => {
    const hay = tokens(`${chunk.title} ${chunk.text} ${chunk.region ?? ""}`);
    let hits = 0;
    for (const word of q) {
      if (hay.includes(word)) hits += 1;
    }
    return { ...chunk, score: hits / q.length };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, k);
}

async function retrieveFromWeaviate(
  query: string,
  k: number,
  state?: OnboardState | null,
): Promise<RetrievedChunk[]> {
  const client = await getWeaviate();
  const collection = client.collections.use(CIVIC_COLLECTION);
  const wanted = state && state !== "other" ? STATE_NAME[state] : "";
  const filters = wanted
    ? Filters.or(
        collection.filter.byProperty("region").equal(wanted),
        collection.filter.byProperty("region").equal("National"),
      )
    : undefined;

  const result = await collection.query.hybrid(query, {
    limit: k,
    alpha: 0.25,
    queryProperties: ["title", "text"],
    returnMetadata: ["score"],
    filters,
  });

  return result.objects.map((object, index) => {
    const props = object.properties as unknown as CivicProperties;
    return {
      id: object.uuid ?? `hit-${index}`,
      title: String(props.title ?? ""),
      url: String(props.url ?? ""),
      fetchedAt: String(props.fetchedAt ?? ""),
      text: String(props.text ?? ""),
      region: props.region ? String(props.region) : undefined,
      score: object.metadata?.score ?? 0,
    };
  });
}

function topicHay(query: string, context: string, plan: RetrievalPlan): string {
  return [query, context, plan.english, topicPhrase(plan.topic)].filter(Boolean).join(" ");
}

/** Local seeds plus earlier citations. No Weaviate. */
export function reuseSnapshot(
  prior: RetrievedChunk[],
  query: string,
  context: string,
  plan: RetrievalPlan,
  k = 5,
): RetrievedChunk[] {
  return mergeExampleAliases(prior, topicHay(query, context, plan), k);
}

/** Hybrid search over the Weaviate-indexed snapshot. Falls back to seeded keyword overlap. */
export async function retrieveChunks(
  query: string,
  k = 5,
  state?: OnboardState | null,
  context = "",
  plan?: RetrievalPlan,
): Promise<RetrievedChunk[]> {
  const decided: RetrievalPlan = plan ?? {
    action: "search",
    english: query,
    topic: "other",
  };
  const topic = topicHay(query, context, decided);
  if (decided.action === "skip" || !decided.english.trim()) {
    return reuseSnapshot([], query, context, decided, k);
  }
  let hits: RetrievedChunk[] = [];
  if (hasWeaviate()) {
    try {
      hits = await retrieveFromWeaviate(decided.english, Math.max(k * 3, 12), state);
    } catch (error) {
      const name = error instanceof Error ? error.name : "Error";
      console.error("weaviate retrieve failed", name);
    }
  }
  if (hits.length === 0) hits = keywordFallback(topic, k, state);
  return mergeExampleAliases(hits, topic, k);
}
