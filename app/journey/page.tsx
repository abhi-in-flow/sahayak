"use client";

import { Suspense, useEffect, useRef, useState, type MouseEvent, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { LocaleDefinition, Strings } from "@/app/_lib/i18n";
import { DEFAULT_LOCALE, findLocale, t } from "@/app/_lib/i18n";
import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import { InlineNote } from "@/app/_components/InlineNote";
import { StatusChip, type TaskStatus } from "@/app/_components/StatusChip";
import { ProgressRing } from "@/app/_components/ProgressRing";
import { SaveSheet } from "@/app/_components/SaveSheet/SaveSheet";
import { announce } from "@/app/_lib/announce";
import { withLocale } from "@/app/_lib/nav";
import { computeGraph, mergeGraphs } from "@/app/_lib/journey/compute";
import type { TaskState } from "@/app/_lib/storage/schema";
import { mutate, readJourney, readLocale } from "@/app/_lib/storage/local";
import { TASKS, type TaskDefinition } from "@/app/_lib/tasks";
import styles from "./page.module.css";

/**
 * S5 — Journey Map. D3 S5; D4 §4.4; D11 §3 (banner family).
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

function taskName(code: string): string {
  return TASKS.find((def) => def.code === code)?.name ?? code;
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

interface JourneyView {
  tasks: TaskState[];
  unknownDerived: ReadonlySet<string>;
  diff: { added: TaskState[]; removed: string[] } | null;
  /** Dismissal key in T-LOCAL, keyed by the merge's timestamp. */
  diffKey: string;
  manual: boolean;
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
  const online = useSyncExternalStore(subscribeOnline, getOnline, getOnlineServer);
  const announcedDiff = useRef(false);

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
        lines.push(`${index + 1}. ${taskName(task.code)}${done}`);
      });
    return lines.join("\n");
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
  const backHref = view?.manual ? unresolvedHref : confirmHref;

  const renderTaskCard = (task: TaskState, isDoFirst: boolean) => {
    const def: TaskDefinition | undefined = TASKS.find(
      (candidate) => candidate.code === task.code,
    );
    return (
      <li key={task.code}>
        <article className={`${styles.card} pressable ${isDoFirst ? styles.cardFirst : ""}`}>
          {isDoFirst ? (
            <span className={styles.firstBand}>{t(locale, "s5.doFirst")}</span>
          ) : null}
          <div className={styles.cardBody}>
            <StatusChip status={chipFor(task, view?.unknownDerived ?? new Set())} locale={locale} />
            {/* Stretched link: the whole card routes to S6, while the
                provenance link below stays independently tappable. */}
            <Link
              href={withLocale(`/task/${task.code}`, locale.code)}
              className={styles.cardLink}
              onClick={guardClick}
            >
              <span className={styles.taskName}>{def ? def.name : task.code}</span>
            </Link>
            {def ? <span className={styles.department}>{def.department}</span> : null}
            {task.preCompleted ? (
              <span className={styles.preNote}>{t(locale, "s5.preCompletedNote")}</span>
            ) : null}
            {!online && task.status !== "done" ? (
              <span className={styles.offlineChip}>{t(locale, "s5.offlineSubmit")}</span>
            ) : null}
            {task.status === "locked" && task.lockReason ? (
              /* A lock without its stated reason on the face is a defect
                 (D3 S5). Unreachable with the T1-only roster. */
              <span className={styles.lockNote}>{task.lockReason}</span>
            ) : null}
            {def ? (
              // Estimated days and fee are omitted: the roster cannot
              // supply them (BUG-009), and a guess is banned (C4).
              <span className={styles.provenance}>
                <span className={styles.metaLine}>
                  {t(locale, "meta.source")}{" "}
                  <a
                    className={styles.metaLink}
                    href={def.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {hostOf(def.sourceUrl)}
                  </a>
                </span>
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
                    task: taskName(task.code),
                    reason: t(locale, reasonFor(task.code)),
                  })}
                </span>
              ))}
              {view.diff.removed.map((code) => (
                <span key={`removed-${code}`} className={styles.diffLine}>
                  {t(locale, "s5.diff.removed", { task: taskName(code) })}
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
                </div>
                {/* DP-4: the ring is decorative; the literal count above
                    always accompanies it. */}
                <ProgressRing done={doneCount} total={activeTasks.length} />
              </div>

              <span className={styles.honesty}>{t(locale, "s5.honestyChip")}</span>

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
                  {activeTasks.map((task, index) => renderTaskCard(task, index === firstUndoneIndex))}
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
                            {def ? def.name : task.code}
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
                  {t(locale, "s5.changeAnswers")}
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
