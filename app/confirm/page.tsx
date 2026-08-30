"use client";

import { Suspense, useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { LocaleDefinition, Strings } from "@/app/_lib/i18n";
import { DEFAULT_LOCALE, findLocale, t } from "@/app/_lib/i18n";
import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import { InlineNote } from "@/app/_components/InlineNote";
import { VoiceRail } from "@/app/_components/VoiceRail";
import { announce } from "@/app/_lib/announce";
import { withLocale } from "@/app/_lib/nav";
import {
  answeredCount,
  computeGraph,
  questionById,
  recordedValue,
  recordedValues,
  type QuestionId,
} from "@/app/_lib/journey/compute";
import type { RecordedAnswer } from "@/app/_lib/storage/schema";
import { readJourney, readLocale } from "@/app/_lib/storage/local";
import { TASKS } from "@/app/_lib/tasks";
import { speak, stopSpeaking } from "@/app/_lib/speak";
import { isMuted, setMuted } from "@/app/_lib/voice/mute";
import { voiceRailStrings } from "@/app/_lib/voice/strings";
import { setVoiceInterim, setVoicePhase, setVoiceStep } from "@/app/_lib/voice/store";
import styles from "./page.module.css";

/**
 * S4 — Confirm Understanding. D3 S4.
 *
 * The summary is assembled FROM RECORDED ANSWERS via the deterministic
 * engine (compute.ts), never re-inferred from the transcript, so chip
 * edits recompute it exactly (P5). There is no model call anywhere on
 * this screen in this build: the rule-based summary IS the primary path,
 * which satisfies E-12's silent-fallback rule by construction (E-12 stays
 * telemetry-only, D5 §5.1) and makes the loading state a brief local
 * read rather than a network wait.
 */

/** Last consequence count shown on S4, for the "Updated" delta. */
const S4_COUNT_KEY = "sbn.s4count";

type StrKey = keyof Strings;

/** [summary clause, chip label] per engine option id. */
const REGISTERED: Record<string, [StrKey, StrKey]> = {
  yes: ["s4.fact.registered.yes", "s4.chip.registered.yes"],
  no: ["s4.fact.registered.no", "s4.chip.registered.no"],
};
const STATES: Record<string, [StrKey, StrKey]> = {
  assam: ["s4.fact.state.assam", "s4.chip.state.assam"],
  maharashtra: ["s4.fact.state.maharashtra", "s4.chip.state.maharashtra"],
  karnataka: ["s4.fact.state.karnataka", "s4.chip.state.karnataka"],
};
const WORK: Record<string, [StrKey, StrKey]> = {
  company: ["s4.fact.work.company", "s4.chip.work.company"],
  retired: ["s4.fact.work.retired", "s4.chip.work.retired"],
  self: ["s4.fact.work.self", "s4.chip.work.self"],
};
const RELATIONSHIP: Record<string, [StrKey, StrKey]> = {
  son: ["s4.fact.relationship.son", "s4.chip.relationship.son"],
  daughter: ["s4.fact.relationship.daughter", "s4.chip.relationship.daughter"],
  spouse: ["s4.fact.relationship.spouse", "s4.chip.relationship.spouse"],
  other: ["s4.fact.relationship.other", "s4.chip.relationship.other"],
};
const ASSET_CHIP: Record<string, StrKey> = {
  bank: "s4.chip.assets.bank",
  house: "s4.chip.assets.house",
  land: "s4.chip.assets.land",
  none: "s4.chip.assets.none",
};
const ASSET_PHRASE: Record<string, StrKey> = {
  bank: "s4.asset.bank",
  house: "s4.asset.house",
  land: "s4.asset.land",
};

/** The S3 question text per engine id: the definition-list term above
 *  each recorded answer (the engine is string-free; terms resolve here). */
const QUESTION_TERM_KEYS: Record<QuestionId, StrKey> = {
  registered: "s3.q.registered",
  state: "s3.q.state",
  work: "s3.q.work",
  assets: "s3.q.assets",
  relationship: "s3.q.relationship",
};

/**
 * `unknown` is a first-class answer (D3 S3), including on the
 * multi-select assets question, where it may not be the first recorded
 * entry — so the unsure check scans every entry, unlike recordedValue().
 */
function unsureOf(answers: RecordedAnswer[], id: QuestionId): boolean {
  return answers.some((a) => a.questionId === id && !a.archived && a.value === "unknown");
}

function joinAnd(items: string[], andWord: string): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${andWord} ${items[items.length - 1]}`;
}

interface SummaryChip {
  question: QuestionId;
  label: string;
  unsure: boolean;
}

interface Summary {
  chips: SummaryChip[];
  text: string;
}

/** One clause per recorded fact, in question order (D3 S4). */
function buildSummary(answers: RecordedAnswer[], locale: LocaleDefinition): Summary {
  const tr = (key: StrKey, vars?: Record<string, string | number>) => t(locale, key, vars);
  const chips: SummaryChip[] = [];
  const clauses: string[] = [];
  const unsureThings: string[] = [];

  const pushDefinite = (
    question: QuestionId,
    value: string,
    table: Record<string, [StrKey, StrKey]>,
  ) => {
    const entry = table[value];
    if (!entry) return;
    chips.push({ question, label: tr(entry[1]), unsure: false });
    clauses.push(tr(entry[0]));
  };
  const pushUnsure = (question: QuestionId, chipKey: StrKey, thingKey: StrKey) => {
    chips.push({ question, label: tr(chipKey), unsure: true });
    unsureThings.push(tr(thingKey));
  };

  const registered = recordedValue(answers, "registered");
  if (registered === "unknown") {
    pushUnsure("registered", "s4.chip.unsure.registered", "s4.thing.registered");
  } else if (registered !== undefined) {
    pushDefinite("registered", registered, REGISTERED);
  }

  // Q2 carries no unsure option (D3 S3 edge case); stay defensive anyway.
  const state = recordedValue(answers, "state");
  if (state !== undefined && state !== "unknown") {
    pushDefinite("state", state, STATES);
  }

  const work = recordedValue(answers, "work");
  if (work === "unknown") {
    pushUnsure("work", "s4.chip.unsure.work", "s4.thing.work");
  } else if (work !== undefined) {
    pushDefinite("work", work, WORK);
  }

  if (unsureOf(answers, "assets")) {
    pushUnsure("assets", "s4.chip.unsure.assets", "s4.thing.assets");
  } else {
    const assets = recordedValues(answers, "assets");
    for (const value of assets) {
      const chipKey = ASSET_CHIP[value];
      if (chipKey) chips.push({ question: "assets", label: tr(chipKey), unsure: false });
    }
    if (assets.includes("none")) {
      clauses.push(tr("s4.fact.assets.none"));
    } else if (assets.length > 0) {
      const list = joinAnd(
        assets.map((value) => (ASSET_PHRASE[value] ? tr(ASSET_PHRASE[value]) : "")).filter(Boolean),
        tr("s4.listAnd"),
      );
      clauses.push(tr("s4.fact.assets", { list }));
    }
  }

  const relationship = recordedValue(answers, "relationship");
  if (relationship === "unknown") {
    pushUnsure("relationship", "s4.chip.unsure.relationship", "s4.thing.relationship");
  } else if (relationship !== undefined) {
    pushDefinite("relationship", relationship, RELATIONSHIP);
  }

  // D3 S4 Empty row, verbatim: all answers unsure still yields a valid,
  // clearly-labelled widest-safe summary, never nothing.
  let text: string;
  if (chips.length > 0 && chips.every((chip) => chip.unsure)) {
    text = tr("s4.summary.allUnsure");
  } else {
    const parts = [...clauses];
    if (unsureThings.length > 0) {
      parts.push(tr("s4.fact.unsure", { thing: joinAnd(unsureThings, tr("s4.listAnd")) }));
    }
    text = parts.join(" ");
  }

  return { chips, text };
}

type Loaded =
  | { phase: "loading" }
  | { phase: "redirect" }
  | {
      phase: "ready";
      summary: Summary;
      taskCount: number;
      officeCount: number;
      updated: { was: number } | null;
      /** Where the rail's mic sends a spoken correction, resolved from
       *  the record's source mode (agent -> recapture, socratic -> Q1). */
      correctionHref: string;
    };

function ConfirmScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const [locale, setLocale] = useState<LocaleDefinition>(DEFAULT_LOCALE);
  const [agentSummary, setAgentSummary] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded>({ phase: "loading" });
  const [locked, setLocked] = useState(false);
  const [audioNote, setAudioNote] = useState(false);
  const summaryRef = useRef("");

  /* T-LOCAL and sessionStorage exist only after mount, so the journey
     read and its resulting state must live in an effect; every branch
     below commits its state in one batch. The rule's render-time
     alternatives cannot read localStorage. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const effLocale =
      findLocale(params.get("locale") ?? readLocale() ?? undefined) ?? DEFAULT_LOCALE;
    setLocale(effLocale);

    const journey = readJourney();
    setAgentSummary(journey?.agentSummary ?? null);
    const answers = journey?.answers ?? [];
    // Entry precondition (D3 S4): at least one recorded answer.
    if (answeredCount(answers) < 1) {
      setLoaded({ phase: "redirect" });
      router.replace(withLocale("/clarify/1", effLocale.code));
      return;
    }

    const summary = buildSummary(answers, effLocale);
    summaryRef.current = summary.text;

    // Consequence preview from the computed graph: n = non-archived
    // tasks, m = distinct departments of those tasks (from TASKS).
    const graph = computeGraph(answers);
    const activeTasks = graph.tasks.filter((task) => !task.archived);
    const taskCount = activeTasks.length;
    const officeCount = new Set(
      activeTasks
        .map((task) => TASKS.find((def) => def.code === task.code)?.department)
        .filter((department) => department !== undefined),
    ).size;

    // "Updated" pill compares against the count stored by the previous
    // S4 render; the current count is always stored (D3 S4).
    let updated: { was: number } | null = null;
    try {
      const previous = sessionStorage.getItem(S4_COUNT_KEY);
      if (previous !== null && Number(previous) !== taskCount) {
        updated = { was: Number(previous) };
      }
      sessionStorage.setItem(S4_COUNT_KEY, String(taskCount));
    } catch {
      // Session storage unavailable: only the delta pill is lost.
    }

    // The rail's mic here means "speak a correction", routed by the
    // record's source mode exactly like the manual correction paths:
    // an agent-built record goes back to recapture; a socratic one to Q1
    // in return-to-S4 mode.
    const correctionHref =
      journey?.source === "agent"
        ? withLocale("/capture?listen=1", effLocale.code)
        : withLocale("/clarify/1?return=s4", effLocale.code);

    setLoaded({ phase: "ready", summary, taskCount, officeCount, updated, correctionHref });
    if (updated) {
      announce(t(effLocale, "s4.updated.delta", { n: taskCount, p: updated.was }));
    }

    // Read-aloud itself is auto-spoken once "ready" (see the spoken-review
    // effect below); only its failure surfaces here as the E-01 note.
  }, [params, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* Corridor position for as long as this screen shows. */
  useEffect(() => {
    setVoiceStep({ id: "confirm" });
  }, []);

  // Read-aloud must not outlive the screen; neither may the rail state
  // this screen wrote.
  useEffect(
    () => () => {
      stopSpeaking();
      setVoiceInterim("");
      setVoicePhase("idle");
      setVoiceStep(null);
    },
    [],
  );

  /* Spoken review, once per arrival: the summary is read aloud while the
     rail carries the corridor's "Speaking" state, and nothing navigates
     by itself. The speaker button replays it. The effect fires when the
     ready state lands (locale settles in the same batch), so no extra
     once-guard is needed; cleanup only cancels the state write, never
     the unmount path's own stopSpeaking reset. */
  const localeCode = locale.code;
  useEffect(() => {
    if (loaded.phase !== "ready") return;
    setVoicePhase("speaking");
    let cancelled = false;
    void (async () => {
      const ok = await speak(summaryRef.current, localeCode);
      if (cancelled) return;
      setVoicePhase("idle");
      // E-01 path: inline note, auto-clears in 4s, control stays.
      if (!ok) setAudioNote(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded.phase, localeCode]);

  // D3 Disabled state: the first navigation tap wins; later taps (and
  // in-flight link activations) are ignored for the transition window.
  const guardClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (locked) event.preventDefault();
    else setLocked(true);
  };
  const go = (href: string) => {
    if (locked) return;
    setLocked(true);
    router.push(href);
  };

  // The rail's idle label names this screen's job: a spoken correction,
  // not a fresh capture. The chrome strings stay the shared rail ones.
  const railStrings = {
    ...voiceRailStrings(locale),
    micIdle: t(locale, "s4.correction.micIdle"),
  };

  // Rail mic = "speak a correction": route by the record's source mode
  // (resolved at load into correctionHref). No capture flow lives here.
  const startCorrection = () => {
    if (loaded.phase !== "ready") return;
    go(loaded.correctionHref);
  };

  const replay = async () => {
    if (loaded.phase !== "ready") return;
    // An explicit "hear this" tap flips the durable preference: speak()
    // stays the only mute enforcement point (no force param).
    if (isMuted()) setMuted(false);
    // The rail mirrors read-aloud as the corridor's speaking state.
    setVoicePhase("speaking");
    const ok = await speak(summaryRef.current, locale.code);
    setVoicePhase("idle");
    // E-01 path: inline note, auto-clears in 4s, control stays functional.
    if (!ok) setAudioNote(true);
  };

  // buildSummary pushes chips in question order, so grouping per question
  // keeps D3 S4's order; each group is one definition-list row.
  const reviewRows: { question: QuestionId; chips: SummaryChip[] }[] = [];
  if (loaded.phase === "ready") {
    for (const chip of loaded.summary.chips) {
      const last = reviewRows[reviewRows.length - 1];
      if (last && last.question === chip.question) last.chips.push(chip);
      else reviewRows.push({ question: chip.question, chips: [chip] });
    }
  }

  return (
    <>
      <SkipLink locale={locale} />
      <DisclosureBanner locale={locale} />

      <div className="shell">
        <main id="main" className={styles.main} aria-busy={loaded.phase !== "ready"}>
          {loaded.phase !== "ready" ? (
            /* Loading: skeleton in the shape of the real content, never a
               spinner (D10 10.9). Data is local, so this is brief. */
            <div className={styles.loading}>
              <div className={`skeleton ${styles.skTitle}`} />
              <div className={`skeleton ${styles.skSummary}`} />
              <div className={`skeleton ${styles.skSummaryShort}`} />
              <div className={styles.skChips}>
                <div className={`skeleton ${styles.skChip}`} />
                <div className={`skeleton ${styles.skChip}`} />
                <div className={`skeleton ${styles.skChip}`} />
              </div>
              <div className={`skeleton ${styles.skCta}`} />
              <div className={`skeleton ${styles.skCta}`} />
            </div>
          ) : (
            <>
              <Link
                href={withLocale("/clarify/1", locale.code)}
                className={styles.back}
                onClick={guardClick}
              >
                {t(locale, "s4.back")}
              </Link>

              <h1 className={styles.heading}>{t(locale, "s4.heading")}</h1>

              {agentSummary ? (
                <section className={styles.agentCard}>
                  <p className={styles.agentHeading}>{t(locale, "s4.agent.heading")}</p>
                  <p className={styles.summaryText}>{agentSummary}</p>
                </section>
              ) : null}

              {/* D11 §2: the S4 summary card is one of the two surfaces
                  where elevation is real and a shadow is allowed. Each
                  recorded question renders as a term (the question) and
                  its definition (the answer chips, which stay the
                  correction path). */}
              <section className={styles.summaryCard}>
                <div className={styles.summaryHead}>
                  <p className={styles.summaryIntro}>{t(locale, "s4.review.intro")}</p>
                  <button
                    type="button"
                    className={styles.speak}
                    onClick={replay}
                    aria-label={t(locale, "s4.speak")}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 5L6.5 9H3v6h3.5L11 19z" />
                      <path d="M15.5 8.5a5 5 0 010 7" />
                      <path d="M18.5 6a9 9 0 010 12" />
                    </svg>
                  </button>
                </div>

                <dl className={styles.reviewList}>
                  {reviewRows.map((row) => {
                    const order = questionById(row.question).order;
                    return (
                      <div key={row.question} className={styles.reviewRow}>
                        <dt className={styles.reviewTerm}>
                          {t(locale, QUESTION_TERM_KEYS[row.question])}
                        </dt>
                        <dd className={styles.reviewDef}>
                          {row.chips.map((chip, index) => {
                            return (
                              <Link
                                key={`${chip.question}-${index}`}
                                href={withLocale(`/clarify/${order}?return=s4`, locale.code)}
                                className={
                                  chip.unsure ? `${styles.chip} ${styles.chipUnsure}` : styles.chip
                                }
                                onClick={guardClick}
                              >
                                <span className={styles.chipLabel}>
                                  {chip.label}
                                  <svg className={styles.pencil} viewBox="0 0 16 16" aria-hidden="true">
                                    <path
                                      d="M11.1 2.6l2.3 2.3L5.2 13.1l-3.1.8.8-3.1z"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.5"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </span>
                                {chip.unsure ? (
                                  <span className={styles.chipCaption}>
                                    {t(locale, "s4.chip.unsure.caption")}
                                  </span>
                                ) : null}
                                <span className="sr-only">{t(locale, "s4.chip.change")}</span>
                              </Link>
                            );
                          })}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>

              {audioNote ? (
                <InlineNote tone="warn" autoClearMs={4000} onCleared={() => setAudioNote(false)}>
                  {t(locale, "error.E01")}
                </InlineNote>
              ) : null}

              <p className={styles.consequence}>
                {loaded.taskCount === 1
                  ? loaded.officeCount === 1
                    ? t(locale, "s4.consequence.oneOne")
                    : t(locale, "s4.consequenceOne", { m: loaded.officeCount })
                  : loaded.officeCount === 1
                    ? t(locale, "s4.consequence.m1", { n: loaded.taskCount })
                    : t(locale, "s4.consequence", { n: loaded.taskCount, m: loaded.officeCount })}
              </p>

              {loaded.updated ? (
                <div className={styles.updatedRow}>
                  <span className={styles.pill}>{t(locale, "s4.updated.pill")}</span>
                  <p className={styles.delta}>
                    {loaded.taskCount === 1
                      ? t(locale, "s4.updated.deltaOne", { p: loaded.updated.was })
                      : t(locale, "s4.updated.delta", {
                          n: loaded.taskCount,
                          p: loaded.updated.was,
                        })}
                  </p>
                </div>
              ) : null}

              <div className={styles.ctaRow}>
                <button
                  type="button"
                  className={`${styles.primary} pressable`}
                  disabled={locked}
                  onClick={() => go(withLocale("/journey", locale.code))}
                >
                  {t(locale, "s4.cta.confirm")}
                </button>
                <button
                  type="button"
                  className={`${styles.secondary} pressable`}
                  disabled={locked}
                  onClick={() => go(withLocale("/clarify/1", locale.code))}
                >
                  {t(locale, "s4.cta.wrong")}
                </button>
              </div>

              {/* The corridor rail. Its mic here means "speak a
                  correction", routed by the record's source mode; while
                  the summary is read the rail itself carries Speaking. */}
              <VoiceRail
                strings={railStrings}
                onStart={startCorrection}
                onStop={() => {}}
                onListenAgain={replay}
              />
            </>
          )}
        </main>

        <GlobalFooter locale={locale} />
      </div>
    </>
  );
}

export default function ConfirmPage() {
  // useSearchParams requires a Suspense boundary during prerender.
  return (
    <Suspense fallback={null}>
      <ConfirmScreen />
    </Suspense>
  );
}
