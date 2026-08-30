"use client";

import { Suspense, useEffect, useRef, useState, type MouseEvent, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Volume2 } from "lucide-react";
import type { LocaleDefinition, Strings } from "@/app/_lib/i18n";
import { DEFAULT_LOCALE, findLocale, t } from "@/app/_lib/i18n";
import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import { InlineNote } from "@/app/_components/InlineNote";
import { StatusChip, type TaskStatus } from "@/app/_components/StatusChip";
import { ProgressRing } from "@/app/_components/ProgressRing";
import { SaveSheet } from "@/app/_components/SaveSheet/SaveSheet";
import { VoiceRail } from "@/app/_components/VoiceRail";
import { announce } from "@/app/_lib/announce";
import { withLocale } from "@/app/_lib/nav";
import { speak, stopSpeaking } from "@/app/_lib/speak";
import { isMuted, setMuted } from "@/app/_lib/voice/mute";
import { computeGraph, mergeGraphs } from "@/app/_lib/journey/compute";
import type { TaskState } from "@/app/_lib/storage/schema";
import { clearJourney, mutate, readJourney, readLocale } from "@/app/_lib/storage/local";
import { setVoicePhase, setVoiceStep } from "@/app/_lib/voice/store";
import { voiceRailStrings } from "@/app/_lib/voice/strings";
import { TASKS, type TaskDefinition } from "@/app/_lib/tasks";
import styles from "./page.module.css";

/**
 * S5 — Journey Map. D3 S5; D4 §4.4; D11 §3 (banner family).
 *
 * The plan artifact is voiced with checklist vocabulary (the Cleo/CVS
 * pattern): done cards recede behind a filled check, the single
 * "Do first" card is elevated and numbered, upcoming cards are greyed
 * with their order number. StatusChip and the literal "n of n done"
 * count stay the accessible carriers (A6; DP-4). The VoiceRail mounts
 * as the corridor's plan step; its mic hands off to the capture agent
 * flow ("ask a follow-up") and the header control reads the plan aloud.
 *
 * The graph is recomputed fresh from the recorded answers and merged
 * into the stored one on every entry, so statuses, ack numbers and
 * archived tasks survive recomputes (P5, D4 §4.4). The recompute diff
 * banner is keyed by the merge's timestamp and dismissed into
 * dismissedBanners in T-LOCAL.
 *
 * Roster caveat (BUG-009): TASKS holds T1 only, so estimates and fees
 * are never rendered, the document-reuse banner is omitted entirely
 * (it cannot be computed honestly), and the locked-card expander and
 * the conditional-task expander have nothing to attach to.
 */

type StrKey = keyof Strings;

/** O-01 connectivity, read the OfflineChip way (no mirrored state). */
function subscribeOnline(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
const getOnline = () => navigator.onLine;
const getOnlineServer = () => true;

/**
 * Status chip per A6. The `locked` chip never occurs with the T1-only
 * roster (BUG-009: T1 is the first task of every journey and is always
 * unlocked); the mapping stays so the full roster slots in unchanged.
 */
function chipFor(task: TaskState, unknownDerived: ReadonlySet<string>): TaskStatus {
  if (unknownDerived.has(task.code)) return { kind: "mayNotApply" };
  switch (task.status) {
    case "locked":
      return { kind: "locked", document: task.lockReason ?? "" };
    case "inProgress":
      return { kind: "inProgress" };
    case "done":
      return { kind: "done" };
    case "mayNotApply":
      return { kind: "mayNotApply" };
    default:
      return { kind: "doNow" };
  }
}

function taskName(task: Pick<TaskState, "code" | "title">): string {
  if (task.title) return task.title;
  return TASKS.find((def) => def.code === task.code)?.name ?? task.code;
}

/** Cause of an "+ added" diff line. T1 exists because of Q1's answer. */
function reasonFor(code: string): StrKey {
  return code === "T1" ? "s5.reason.registered" : "s5.reason.generic";
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Drop raw URLs from card copy; the official button already carries the link. */
function cardDetail(detail: string, title: string, url?: string): string {
  let text = detail;
  if (url) text = text.split(url).join(" ");
  text = text.replace(/https?:\/\/\S+/gi, " ").replace(/\s+/g, " ").trim();
  if (!text || text.toLowerCase() === title.toLowerCase()) return "";
  return text;
}

interface JourneyView {
  tasks: TaskState[];
  unknownDerived: ReadonlySet<string>;
  diff: { added: TaskState[]; removed: string[] } | null;
  /** Dismissal key in T-LOCAL, keyed by the merge's timestamp. */
  diffKey: string;
  manual: boolean;
  agent: boolean;
}

function JourneyScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const [locale, setLocale] = useState<LocaleDefinition>(DEFAULT_LOCALE);
  const [phase, setPhase] = useState<"loading" | "redirect" | "ready">("loading");
  const [view, setView] = useState<JourneyView | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [showE21, setShowE21] = useState(params.get("notice") === "e21");
  const [audioNote, setAudioNote] = useState(false);
  const online = useSyncExternalStore(subscribeOnline, getOnline, getOnlineServer);
  const announcedDiff = useRef(false);
  /** True while this screen is mounted; guards the async speak() tail. */
  const alive = useRef(false);

  /* T-LOCAL exists only after mount, so the journey read, the P5 merge
     and their resulting state must live in an effect; each branch
     commits its state in one batch. The rule's render-time alternatives
     cannot read localStorage. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const effLocale =
      findLocale(params.get("locale") ?? readLocale() ?? undefined) ?? DEFAULT_LOCALE;
    setLocale(effLocale);

    const record = readJourney();
    // Entry precondition (D3 S5): a journey with a transcript or tasks.
    const hasTranscript = Boolean(record && record.transcript.trim().length > 0);
    const hasTasks = Boolean(record && record.tasks.length > 0);
    if (!record || (!hasTranscript && !hasTasks)) {
      setPhase("redirect");
      router.replace(withLocale("/", effLocale.code));
      return;
    }

    const paramSource = params.get("source");
    const manual = Boolean(
      paramSource?.startsWith("manual:") || record.source?.startsWith("manual:"),
    );
    const agent = record.source === "agent";

    // Agent journeys already have concrete steps from the snapshot.
    // Merging the T1 Socratic graph would wipe them.
    if (agent) {
      setView({
        tasks: record.tasks,
        unknownDerived: new Set(),
        diff: null,
        diffKey: "diff:agent",
        manual: false,
        agent: true,
      });
      setPhase("ready");
      return;
    }

    // P5 recompute: fresh graph from the answers, merged into the stored
    // tasks. Manual-mode note: BUG-009 means no bundled B-definitions
    // exist, so the answer engine's graph is the only computable source;
    // when they land, this merge should draw from those instead.
    const computed = computeGraph(record.answers);
    const mergeStamp = new Date().toISOString();
    const { tasks, diff } = mergeGraphs(record.tasks, computed.tasks);
    const diffKey = `diff:${mergeStamp}`;

    mutate((draft) => {
      draft.tasks = tasks;
      if (computed.seededState) draft.state = computed.seededState;
    });

    const changed = diff.added.length > 0 || diff.removed.length > 0;
    // The diff banner explains a change to a journey the user has already
    // seen, so the first computation (no previous graph) shows none.
    const showDiff =
      changed && record.tasks.length > 0 && !record.dismissedBanners.includes(diffKey);

    setView({
      tasks,
      unknownDerived: new Set(computed.unknownDerived),
      diff: showDiff ? diff : null,
      diffKey,
      manual,
      agent: false,
    });
    setPhase("ready");

    if (showDiff && !announcedDiff.current) {
      announcedDiff.current = true;
      announce(
        t(effLocale, "s5.diff.summary", { added: diff.added.length, removed: diff.removed.length }),
      );
    }
  }, [params, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* The rail's position on the corridor: this is the plan step. Tearing
     it down on unmount matters because the voice store outlives the
     screen, and a mid-read-aloud exit must leave neither a stale
     segment nor a phase stuck on "speaking" for the next screen. */
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      setVoiceStep(null);
      setVoicePhase("idle");
      stopSpeaking();
    };
  }, []);

  const dismissDiff = () => {
    if (!view) return;
    const key = view.diffKey;
    // Dismissal persists so the banner is not re-shown until the next
    // change (D3 S5; D4 §4.2 dismissedBanners).
    mutate((draft) => {
      if (!draft.dismissedBanners.includes(key)) draft.dismissedBanners.push(key);
    });
    setView({ ...view, diff: null });
  };

  // D3 Disabled state: the first navigation tap wins.
  const guardClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (locked) event.preventDefault();
    else setLocked(true);
  };

  const checklistText = (): string => {
    if (!view) return "";
    const lines = [t(locale, "s5.shareTitle")];
    view.tasks
      .filter((task) => !task.archived)
      .forEach((task, index) => {
        const done = task.status === "done" ? ` (${t(locale, "status.done")})` : "";
        lines.push(`${index + 1}. ${taskName(task)}${done}`);
      });
    return lines.join("\n");
  };

  const removeTask = (code: string) => {
    if (!view) return;
    if (!window.confirm(t(locale, "s5.removeConfirm"))) return;
    const remaining = view.tasks.filter((task) => task.code !== code);
    const stillActive = remaining.some((task) => !task.archived);
    if (!stillActive) {
      clearJourney();
      router.replace(withLocale("/", locale.code));
      return;
    }
    mutate((draft) => {
      draft.tasks = draft.tasks.filter((task) => task.code !== code);
    });
    setView({ ...view, tasks: remaining });
  };

  // Share of a plain-text checklist; window.print is the E-22 behaviour
  // substitution with no message (D5 §5.1).
  const shareOrPrint = async () => {
    const title = t(locale, "s5.shareTitle");
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: checklistText() });
        return;
      } catch (error) {
        // A user cancel is not a failure; anything else falls through.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    window.print();
  };

  const activeTasks = view ? view.tasks.filter((task) => !task.archived) : [];
  const doneCount = activeTasks.filter((task) => task.status === "done").length;
  const firstUndoneIndex = activeTasks.findIndex((task) => task.status !== "done");
  const complete = activeTasks.length > 0 && doneCount === activeTasks.length;
  const archivedTasks = view ? view.tasks.filter((task) => task.archived) : [];
  const confirmHref = withLocale("/confirm", locale.code);
  const unresolvedHref = withLocale("/clarify/unresolved", locale.code);
  const talkHref = withLocale("/capture", locale.code);
  const backHref = view?.agent ? talkHref : view?.manual ? unresolvedHref : confirmHref;

  // Checklist order numbers (the Cleo/CVS vocabulary): the Do-first card
  // is 1 and every further open task follows; done cards wear the check
  // instead. Visual only: the chips and the header count stay the
  // accessible carriers (DP-4; A6).
  const stepNumbers = new Map<string, number>();
  let nextStep = 0;
  for (const task of activeTasks) {
    if (task.status !== "done") stepNumbers.set(task.code, ++nextStep);
  }

  // The rail's "plan" segment shows the ring's own numbers, so segment
  // and header never disagree; it recomputes when a merge changes them
  // (setVoiceStep dedupes identical id+detail writes).
  const planDetail =
    view && activeTasks.length > 0
      ? t(locale, "s5.railDetail", { done: doneCount, n: activeTasks.length })
      : null;

  useEffect(() => {
    if (!planDetail) {
      setVoiceStep(null);
      return;
    }
    setVoiceStep({ id: "plan", detail: planDetail });
  }, [planDetail]);

  /* Read the checklist aloud; playback drives the rail's speaking state
     and "Listen again" on it re-triggers this. A false return is the
     E-01 path: inline note, control stays functional (D5 §5.1). */
  const listenToPlan = async () => {
    if (!view) return;
    // An explicit "read this" tap flips the durable preference: speak()
    // stays the only mute enforcement point (no force param).
    if (isMuted()) setMuted(false);
    setVoicePhase("speaking");
    const ok = await speak(checklistText(), locale.code);
    if (!alive.current) return;
    setVoicePhase("idle");
    if (!ok) setAudioNote(true);
  };

  /* On the plan the rail's mic means "ask a follow-up": the agent flow
     in /capture owns the conversation, so hand off with listen=1
     (auto-listen) rather than capturing here. */
  const askFollowUp = () => {
    // D3: the first navigation tap wins.
    if (locked) return;
    setLocked(true);
    router.push(withLocale("/capture?listen=1", locale.code));
  };
  // The screen never captures locally, so there is nothing to stop.
  const stopFollowUp = () => {};

  const railStrings = voiceRailStrings(locale);

  const renderTaskCard = (task: TaskState, isDoFirst: boolean, index: number) => {
    const def: TaskDefinition | undefined = TASKS.find(
      (candidate) => candidate.code === task.code,
    );
    const name = taskName(task);
    const sourceUrl = def?.sourceUrl ?? task.url;
    const practiceHref = def ? withLocale(`/task/${task.code}`, locale.code) : null;
    const status = chipFor(task, view?.unknownDerived ?? new Set());
    const showChip = !(isDoFirst && status.kind === "doNow");
    const detail = !def && task.detail ? cardDetail(task.detail, name, sourceUrl) : "";
    const isDone = task.status === "done";
    const stepNumber = stepNumbers.get(task.code);
    const stateClass = isDoFirst
      ? styles.cardFirst
      : isDone
        ? styles.cardDone
        : styles.cardUpcoming;
    const dotClass = isDoFirst
      ? styles.stepNow
      : isDone
        ? styles.stepDone
        : styles.stepTodo;
    // First-entry reveal only: stagger capped so the last card lands
    // within the 400ms M-1 budget no matter how long the list is.
    const revealDelay = `${Math.min(index * 80, 240)}ms`;
    return (
      <li key={task.code} className={styles.revealItem} style={{ animationDelay: revealDelay }}>
        <article className={`${styles.card} ${stateClass}`}>
          {/* Decorative checklist marker; chip + header count carry the
              state in words and shape (A6; DP-4). */}
          <span className={`${styles.stepDot} ${dotClass}`} aria-hidden="true">
            {isDone ? (
              <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M3.5 8.5l3 3 6-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              stepNumber
            )}
          </span>
          {isDoFirst ? (
            <div className={styles.firstBand}>
              <span>{t(locale, "s5.doFirst")}</span>
              <button
                type="button"
                className={styles.remove}
                onClick={() => removeTask(task.code)}
              >
                {t(locale, "s5.remove")}
              </button>
            </div>
          ) : null}
          <div className={styles.cardBody}>
            {!isDoFirst ? (
              <div className={styles.cardTop}>
                {showChip ? <StatusChip status={status} locale={locale} /> : null}
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => removeTask(task.code)}
                >
                  {t(locale, "s5.remove")}
                </button>
              </div>
            ) : null}
            {practiceHref ? (
              <Link href={practiceHref} className={styles.taskNameLink} onClick={guardClick}>
                <span className={styles.taskName}>{name}</span>
              </Link>
            ) : (
              <span className={styles.taskName}>{name}</span>
            )}
            {def ? <span className={styles.department}>{def.department}</span> : null}
            {detail ? <span className={styles.department}>{detail}</span> : null}
            {task.preCompleted ? (
              <span className={styles.preNote}>{t(locale, "s5.preCompletedNote")}</span>
            ) : null}
            {!online && task.status !== "done" ? (
              <span className={styles.offlineChip}>{t(locale, "s5.offlineSubmit")}</span>
            ) : null}
            {task.status === "locked" && task.lockReason ? (
              <span className={styles.lockNote}>{task.lockReason}</span>
            ) : null}
            {sourceUrl ? (
              <a
                className={styles.officialLink}
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles.officialLabel}>{t(locale, "s5.openOfficial")}</span>
                <span className={styles.officialHost}>{hostOf(sourceUrl)}</span>
              </a>
            ) : null}
            {def ? (
              <span className={styles.provenance}>
                <span className={styles.metaLine}>
                  {t(locale, "meta.verified")} {def.lastVerified}
                </span>
                <span className={styles.metaLine}>
                  {t(locale, "meta.state")} {def.state}
                </span>
              </span>
            ) : null}
          </div>
        </article>
      </li>
    );
  };

  return (
    <>
      <SkipLink locale={locale} />
      <DisclosureBanner locale={locale} />

      {/* Banner family, full-bleed under the disclosure banner (D11 §3). */}
      {view?.manual ? (
        <div className={styles.bannerManual} role="note">
          <span>{t(locale, "s5.manualBanner")}</span>
          <Link href={unresolvedHref} className={styles.bannerChange} onClick={guardClick}>
            {t(locale, "s5.manualChange")}
          </Link>
        </div>
      ) : null}

      {view?.diff ? (
        <div className={styles.bannerDiff}>
          <p className={styles.diffSummary}>
            {t(locale, "s5.diff.summary", {
              added: view.diff.added.length,
              removed: view.diff.removed.length,
            })}
          </p>
          <details>
            <summary className={styles.diffToggle}>{t(locale, "s5.diff.seeChanged")}</summary>
            <div className={styles.diffList}>
              {view.diff.added.map((task) => (
                <span key={`added-${task.code}`} className={styles.diffLine}>
                  {t(locale, "s5.diff.added", {
                    task: taskName(task),
                    reason: t(locale, reasonFor(task.code)),
                  })}
                </span>
              ))}
              {view.diff.removed.map((code) => (
                <span key={`removed-${code}`} className={styles.diffLine}>
                  {t(locale, "s5.diff.removed", { task: taskName({ code }) })}
                </span>
              ))}
            </div>
          </details>
          <button type="button" className={styles.diffDismiss} onClick={dismissDiff}>
            {t(locale, "s5.diff.dismiss")}
          </button>
        </div>
      ) : null}

      <div className="shell">
        <main id="main" className={styles.main} aria-busy={phase !== "ready"}>
          {phase !== "ready" || !view ? (
            /* Loading: skeleton cards in the shape of the real list. */
            <div className={styles.loading}>
              <div className={`skeleton ${styles.skHeader}`} />
              <div className={`skeleton ${styles.skCard}`} />
              <div className={`skeleton ${styles.skCard}`} />
              <div className={`skeleton ${styles.skCard}`} />
            </div>
          ) : (
            <>
              {showE21 ? (
                <InlineNote tone="warn" autoClearMs={6000} onCleared={() => setShowE21(false)}>
                  {t(locale, "s5.notice.e21")}
                </InlineNote>
              ) : null}

              {/* E-01 fallback for the read-aloud control (D5 §5.1). */}
              {audioNote ? (
                <InlineNote tone="warn" autoClearMs={4000} onCleared={() => setAudioNote(false)}>
                  {t(locale, "error.E01")}
                </InlineNote>
              ) : null}

              <div className={styles.header}>
                <div className={styles.headerText}>
                  <h1 className={styles.heading}>
                    {activeTasks.length === 1
                      ? t(locale, "s5.headingOne")
                      : t(locale, "s5.heading", { n: activeTasks.length })}
                  </h1>
                  <p className={styles.progressText}>
                    {t(locale, "s5.progress", { done: doneCount, n: activeTasks.length })}
                  </p>
                  <button type="button" className={styles.listenPlan} onClick={listenToPlan}>
                    <Volume2 size={20} aria-hidden="true" />
                    {t(locale, "s5.listenPlan")}
                  </button>
                </div>
                {/* DP-4: the ring is decorative; the literal count above
                    always accompanies it. */}
                <ProgressRing done={doneCount} total={activeTasks.length} />
              </div>

              <span className={styles.honesty}>
                {t(locale, view.agent ? "s5.honestySnapshot" : "s5.honestyChip")}
              </span>

              {complete ? (
                <section className={styles.complete}>
                  <h2 className={styles.completeTitle}>{t(locale, "s5.complete.title")}</h2>
                  <p className={styles.completeBody}>
                    {t(locale, "s5.complete.body", { n: activeTasks.length })}
                  </p>
                </section>
              ) : null}

              <div className={styles.timeline}>
                <span className={styles.rail} aria-hidden="true" />
                <ol className={styles.list}>
                  {activeTasks.map((task, index) =>
                    renderTaskCard(task, index === firstUndoneIndex, index),
                  )}
                </ol>
              </div>

              {archivedTasks.length > 0 ? (
                <details className={styles.archived}>
                  <summary className={styles.archivedSummary}>
                    {t(locale, "status.noLongerNeeded")} ({archivedTasks.length})
                  </summary>
                  <div className={styles.archivedList}>
                    {archivedTasks.map((task) => {
                      const def = TASKS.find((candidate) => candidate.code === task.code);
                      return (
                        <article key={task.code} className={styles.archivedCard}>
                          {/* Read-only, and onSunken for BUG-006. */}
                          <StatusChip status={{ kind: "archived" }} locale={locale} onSunken />
                          <span className={styles.archivedName}>
                            {taskName(task)}
                          </span>
                          <span className={styles.archivedNote}>
                            {t(locale, "s5.archivedNote")}
                          </span>
                        </article>
                      );
                    })}
                  </div>
                </details>
              ) : null}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={
                    complete
                      ? `${styles.secondary} pressable`
                      : `${styles.primary} pressable`
                  }
                  onClick={() => {
                    // Re-tap while the sheet is open is a no-op (D3 S5).
                    if (!sheetOpen) setSheetOpen(true);
                  }}
                >
                  {t(locale, "s5.saveList")}
                </button>
                {/* Share/print is emphasised in the completion state. */}
                <button
                  type="button"
                  className={
                    complete ? `${styles.primary} pressable` : `${styles.secondary} pressable`
                  }
                  onClick={shareOrPrint}
                >
                  {t(locale, "s5.share")}
                </button>
                <Link className={styles.changeAnswers} href={backHref} onClick={guardClick}>
                  {t(locale, view.agent ? "s5.askAgain" : "s5.changeAnswers")}
                </Link>
              </div>
            </>
          )}
        </main>

        <GlobalFooter locale={locale} />
      </div>

      {view ? (
        <SaveSheet open={sheetOpen} onClose={() => setSheetOpen(false)} locale={locale} />
      ) : null}

      {/* The corridor rail, fixed above the TabBar. Its mic hands off to
          the capture agent flow; onListenAgain replays the plan. */}
      {view ? (
        <VoiceRail
          strings={railStrings}
          onStart={askFollowUp}
          onStop={stopFollowUp}
          onListenAgain={listenToPlan}
        />
      ) : null}

      {/* Clearance so the footer never scrolls behind the fixed rail
          (the shell's own padding covers only the TabBar). */}
      <div className={styles.railClearance} aria-hidden="true" />
    </>
  );
}

export default function JourneyPage() {
  // useSearchParams requires a Suspense boundary during prerender.
  return (
    <Suspense fallback={null}>
      <JourneyScreen />
    </Suspense>
  );
}
