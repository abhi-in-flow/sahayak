/**
 * Utterance to option-id matcher for S3 voice answers (D3 S3).
 *
 * The engine (journey/compute.ts) is string-free; this module is its
 * string-side counterpart: it maps what the user SAID onto option IDS so
 * the screen never compares labels by hand. Matching runs against every
 * shipped locale's labels at once, so a Hindi answer on an English
 * screen still resolves (and vice versa).
 *
 * Deliberately deterministic and synchronous: D3's ambiguity contract
 * ("ambiguous -> one Did-you-mean re-render; a second ambiguous result
 * -> E-09, tap-only") needs a stable, explainable result, not a score
 * nobody can audit. No confidence number is invented here.
 */

export interface VoiceMatchOption {
  id: string;
  /** Every label the utterance may name: the current locale's label and
   *  the other shipped locale's, plus any synonym the caller wants. */
  labels: string[];
}

export type VoiceMatchResult =
  | { kind: "match"; id: string }
  | { kind: "ambiguous"; candidates: string[] }
  | { kind: "none" };

/**
 * Normalise for comparison: casefold, unify the Devanagari chandrabindu
 * with the anusvara (so हाँ and हां compare equal), strip punctuation and
 * symbols, collapse whitespace. Recognisers differ on all of these.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ँ/g, "ं")
    .replace(/[\p{P}\p{S}\p{Z}]+/gu, " ")
    .trim();
}

/** How strongly one label names the utterance. 0 to 4. */
function scoreLabel(label: string, utterance: string): number {
  const nLabel = normalize(label);
  const nUtt = normalize(utterance);
  if (!nLabel || !nUtt) return 0;
  if (nLabel === nUtt) return 4;
  if (nUtt.includes(nLabel)) return 3;
  const labelTokens = nLabel.split(" ");
  const uttTokens = new Set(nUtt.split(" "));
  let hits = 0;
  for (const token of labelTokens) {
    if (uttTokens.has(token)) hits += 1;
  }
  // Every word of the label spoken, or every word of the utterance
  // contained in the label ("not sure" inside "I'm not sure").
  if (hits === labelTokens.length) return 3;
  if (hits === uttTokens.size) return 3;
  return hits; // partial overlap: a candidate, never a confident match
}

/**
 * Match a final utterance against this question's options.
 *
 * Confident means: one option names the utterance wholely and uniquely
 * (score >= 3, strict lead). A tie at the top, or only partial overlap,
 * is "ambiguous"; nothing at all is "none". The screen treats ambiguous
 * and none identically: one re-render, then E-09 (D5 5.1).
 */
export function matchUtterance(
  utterance: string,
  options: readonly VoiceMatchOption[],
): VoiceMatchResult {
  const best = new Map<string, number>();
  for (const option of options) {
    let top = 0;
    for (const label of option.labels) {
      top = Math.max(top, scoreLabel(label, utterance));
    }
    best.set(option.id, top);
  }

  let max = 0;
  for (const value of best.values()) {
    if (value > max) max = value;
  }
  if (max < 2) return { kind: "none" };

  const winners: string[] = [];
  for (const [id, value] of best) {
    if (value === max) winners.push(id);
  }
  if (winners.length === 1 && max >= 3) return { kind: "match", id: winners[0]! };
  return { kind: "ambiguous", candidates: winners };
}
