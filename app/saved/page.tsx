"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { JourneyRecord, TaskState } from "@/app/_lib/storage/schema";
import type { LocaleDefinition, Strings } from "@/app/_lib/i18n";
import { DEFAULT_LOCALE, findLocale, t } from "@/app/_lib/i18n";
import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import { InlineNote } from "@/app/_components/InlineNote";
import { RetryCard } from "@/app/_components/RetryCard";
import { StatusChip, type TaskStatus } from "@/app/_components/StatusChip";
import { ProgressRing } from "@/app/_components/ProgressRing";
import { SaveSheet } from "@/app/_components/SaveSheet/SaveSheet";
import { announce } from "@/app/_lib/announce";
import { withLocale } from "@/app/_lib/nav";
import { computeGraph, mergeGraphs } from "@/app/_lib/journey/compute";
import { getJourneySnapshot, updateJourney } from "@/app/_lib/journey/store";
import { readLocale, readSaveKey } from "@/app/_lib/storage/local";
import {
  hashSaveKey,
  pushSnapshot,
  restoreSnapshot,
  toServerSnapshot,
} from "@/app/_lib/storage/sync";
import { listDocumentTypes } from "@/app/_lib/storage/wallet";
import { requiredDocuments } from "@/app/_lib/documents";
import { TASKS, type TaskDefinition } from "@/app/_lib/tasks";
import styles from "./page.module.css";

/**
 * S9 — Progress / Resume Dashboard. D3 S9; D12 §4; D4 §4.4 (P5 merge);
 * D11 §3 (banner family); D10 §10.7 (M-1 and its reduced-motion
 * fallback); D6 §6.1/§6.2 (focus order, announcements).
 *
 * Return days later and know immediately where things stand. The graph
 * is recomputed from the recorded answers and merged into the stored one
 * on every entry (the same P5 merge S5 runs), so statuses, ack numbers
 * and archived tasks survive. The recompute diff banner mirrors S5's
 * bannerDiff treatment and dismisses into dismissedBanners (P1-4).
 *
 * M-1 (the one motivated animation this screen is allowed) plays on
 * entry (a) ?unlock={code} when the named task is the promoted Do-now
 * card: a 400 ms transform/opacity entrance. Under
 * prefers-reduced-motion the transform animation is skipped and D10
 * §10.7's fallback carries the causality instead: the chip change, the
 * Do-now elevation, the polite announcement, and a 200 ms accent-100 to
 * surface colour hold done in JS (a hard class swap, not a transition,
 * so it survives the global reduced-motion CSS collapse).
 *
 * Roster caveats (BUG-009): with T1 only, the device-note branch and the
 * waiting list's expected-dates branch are unreachable; both are real
 * code so the full roster slots in unchanged.
 */

type StrKey = keyof Strings;

/**
 * Dev stub salt for the save-key hash, per D4/D7. Mirrors the constant
 * in app/_components/SaveSheet/SaveSheet.tsx ("sbn-dev-salt"); a build
 * constant, not a secret. That file is outside this workstream's
 * ownership, so the value is declared here rather than imported.
 */
const DEV_SALT = "sbn-dev-salt";

/** D3 S9 Empty: one line, then S1. */
const INTERSTITIAL_MS = 1200;

/** D10 §10.7: reduced-motion colour-hold duration for M-1. */
const UNLOCK_HOLD_MS = 200;

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
 * Status chip per A6, S5's mapping. The `locked` chip never occurs with
 * the T1-only roster (T1 is the first task of every journey and is
 * always unlocked); the mapping stays so the full roster slots in.
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

function taskDef(code: string): TaskDefinition | undefined {
  return TASKS.find((candidate) => candidate.code === code);
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

/**
 * ISO date to the locale's date pattern (D6 §6.4). Tokens only: no
 * hardcoded display format exists anywhere. Unparseable input renders
 * as-is rather than a fabricated date.
 */
function formatDate(iso: string, pattern: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  return pattern
    .replace("DD", day ?? "")
    .replace("MM", month ?? "")
    .replace("YYYY", year ?? "");
}

interface SavedView {
  tasks: TaskState[];
  unknownDerived: ReadonlySet<string>;
  diff: { added: TaskState[]; removed: string[] } | null;
  /** Dismissal key in T-LOCAL, keyed by the merge's timestamp. */
  diffKey: string;
}

interface SettleOptions {
  effLocale: LocaleDefinition;
  /** Entry (a) task code, when this settle is the unlock entry. */
  unlockParam: string | null;
  reduced: boolean;
}

type Phase = "loading" | "restoring" | "e20" | "interstitial" | "ready";

function SavedScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const [locale, setLocale] = useState<LocaleDefinition>(DEFAULT_LOCALE);
  const [phase, setPhase] = useState<Phase>("loading");
  const [view, setView] = useState<SavedView | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [saveKey, setSaveKey] = useState<string | null>(null);
  const [syncFailed, setSyncFailed] = useState(false);
  const [updatedNote, setUpdatedNote] = useState(false);
  /** Wallet doc types present on THIS device (null until read). */
  const [walletTypes, setWalletTypes] = useState<ReadonlySet<string> | null>(null);
  /** M-1: the animated card's code, and the reduced-motion colour hold. */
  const [unlockCode, setUnlockCode] = useState<string | null>(null);
  const [unlockHold, setUnlockHold] = useState(false);
  /** Entry guard: the mount recompute runs once per entry. */
  const started = useRef(false);
  /** Latest restore attempt wins; E-20 Try again bumps the counter. */
  const restoreRun = useRef(0);
  const online = useSyncExternalStore(subscribeOnline, getOnline, getOnlineServer);

  /**
   * The one recompute every entry settles through (S5's P5 merge), then
   * the entry-specific channels: unlock (M-1), diff announcement,
   * long-absence note, background sync push, wallet read.
   */
  const settle = useCallback((record: JourneyRecord, options: SettleOptions) => {
    const { effLocale, unlockParam, reduced } = options;
    const computed = computeGraph(record.answers);
    const mergeStamp = new Date().toISOString();
    const { tasks, diff } = mergeGraphs(record.tasks, computed.tasks);
    const diffKey = `diff:${mergeStamp}`;

    // Long absence (D3 S9 edge): the newest sourced lastVerified across
    // the journey's task definitions vs what this device last saw. The
    // note is non-blocking; the seen value persists either way so the
    // note only fires for changes after this visit.
    let newestVerified: string | null = null;
    for (const task of record.tasks) {
      const verified = taskDef(task.code)?.lastVerified;
      if (verified && (newestVerified === null || verified > newestVerified)) {
        newestVerified = verified;
      }
    }
    const seen = record.lastVerifiedSeen;
    const showUpdated = Boolean(seen && newestVerified && newestVerified > seen);

    updateJourney((draft) => {
      draft.tasks = tasks;
      if (computed.seededState) draft.state = computed.seededState;
      if (newestVerified) draft.lastVerifiedSeen = newestVerified;
    });

    const changed = diff.added.length > 0 || diff.removed.length > 0;
    // The banner explains a change to a journey the user has already
    // seen, so the first computation (no previous graph) shows none
    // (P1-4).
    const showDiff =
      changed && record.tasks.length > 0 && !record.dismissedBanners.includes(diffKey);

    setView({
      tasks,
      unknownDerived: new Set(computed.unknownDerived),
      diff: showDiff ? diff : null,
      diffKey,
    });
    setUpdatedNote(showUpdated);

    // Entry (a): the unlock announcement fires before settling
    // (D6 §6.1). The diff summary announces only when no unlock
    // precedes it; both share the one polite region.
    const promoted = tasks.find((task) => !task.archived && task.status !== "done");
    const unlockTask =
      unlockParam && promoted && promoted.code === unlockParam ? promoted : null;
    if (unlockTask) {
      announce(t(effLocale, "s9.unlock", { task: taskName(unlockTask.code) }));
    } else if (showDiff) {
      announce(
        t(effLocale, "s5.diff.summary", {
          added: diff.added.length,
          removed: diff.removed.length,
        }),
      );
    }

    if (unlockTask) {
      if (reduced) {
        // D10 §10.7 fallback: no transform. The card renders accent-100,
        // then a hard class swap returns it to surface after the 200 ms
        // hold; the chip change and the Do-now elevation carry the rest.
        setUnlockHold(true);
        window.setTimeout(() => setUnlockHold(false), UNLOCK_HOLD_MS);
      } else {
        setUnlockCode(unlockTask.code);
      }
    }

    setPhase("ready");

    // Background T-SRV push (D4 §4.1): fire-and-forget, never blocks.
    // E-19 swaps the sync line only; local state stays authoritative.
    const key = readSaveKey();
    setSaveKey(key);
    if (key && navigator.onLine) {
      void hashSaveKey(key, DEV_SALT)
        .then((hash) => pushSnapshot(toServerSnapshot(record, hash)))
        .then((result) => {
          if (result.status === "failed") setSyncFailed(true);
        });
    }

    // P1-7: the wallet never syncs, so a locked doc-gated task on this
    // device carries the device note. Unreachable with the T1-only
    // roster (T1 is never locked); the branch is real code.
    void listDocumentTypes()
      .then((types) => setWalletTypes(new Set(types)))
      .catch(() => setWalletTypes(new Set<string>()));
  }, []);

  /** Restore flow (entry d, ?via=restore, and E-20 Try again). Only the
   *  latest attempt may commit. Never throws. */
  const runRestore = useCallback(
    (attempt: number, effLocale: LocaleDefinition) => {
      const key = readSaveKey();
      if (!key) {
        // A restore entry with no save key is the no-journey case: honest
        // interstitial, then S1. Nothing is written.
        setPhase("interstitial");
        // Announced on the polite region (D6 §6.2); the visible line is
        // the same sentence, not a second live region.
        announce(t(effLocale, "s9.emptyInterstitial"));
        window.setTimeout(() => {
          router.replace(withLocale("/", effLocale.code));
        }, INTERSTITIAL_MS);
        return;
      }
      setSaveKey(key);
      setPhase("restoring");
      void (async () => {
        const hash = await hashSaveKey(key, DEV_SALT);
        const restored = await restoreSnapshot(hash);
        if (attempt !== restoreRun.current) return;
        if (!restored) {
          // E-20 (D5 verbatim). Nothing local was touched, so Start fresh
          // is a route to S1, not a deletion (N1).
          setPhase("e20");
          return;
        }
        // Completion and ack numbers restore with the journey; the wallet
        // stays empty by design (P1-7). Written through the store, then
        // settled through the same recompute as every other entry.
        updateJourney((draft) => {
          Object.assign(draft, restored);
        });
        const written = getJourneySnapshot();
        settle(written ?? restored, {
          effLocale,
          unlockParam: null,
          reduced: prefersReducedMotion(),
        });
      })();
    },
    [router, settle],
  );

  /* T-LOCAL exists only after mount, so the journey read and the entry
     dispatch live in an effect; each branch commits its state in one
     batch. The rule's render-time alternatives cannot read localStorage.
     settle and runRestore are stable useCallbacks, so this runs once per
     entry; the started ref makes that guarantee explicit. */
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const effLocale =
      findLocale(params.get("locale") ?? readLocale() ?? undefined) ?? DEFAULT_LOCALE;
    setLocale(effLocale);

    const unlockParam = params.get("unlock");
    const viaRestore = params.get("via") === "restore";

    if (viaRestore) {
      restoreRun.current += 1;
      runRestore(restoreRun.current, effLocale);
      return;
    }

    const record = getJourneySnapshot();
    // Entry precondition (D3 S9 Empty): a journey with a transcript or
    // tasks; anything else is the one-line interstitial, then S1 (never
    // a reset, N1).
    const hasTranscript = Boolean(record && record.transcript.trim().length > 0);
    const hasTasks = Boolean(record && record.tasks.length > 0);
    if (!record || (!hasTranscript && !hasTasks)) {
      setPhase("interstitial");
      announce(t(effLocale, "s9.emptyInterstitial"));
      const timer = window.setTimeout(() => {
        router.replace(withLocale("/", effLocale.code));
      }, INTERSTITIAL_MS);
      return () => clearTimeout(timer);
    }

    settle(record, {
      effLocale,
      unlockParam,
      reduced: prefersReducedMotion(),
    });
  }, [params, router, runRestore, settle]);

  const dismissDiff = () => {
    if (!view) return;
    const key = view.diffKey;
    // Dismissal persists so the banner is not re-shown until the next
    // change (S5's rule, same banner family; D4 §4.2 dismissedBanners).
    updateJourney((draft) => {
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
    const lines = [t(locale, "s9.shareTitle")];
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
    const title = t(locale, "s9.shareTitle");
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
  const doneTasks = activeTasks.filter((task) => task.status === "done");
  // Waiting is scoped to simulated government processing (P2-6): a task
  // submitted here (it carries a practice ack) whose real-world
  // counterpart would still be pending.
  const waitingTasks = doneTasks.filter((task) => task.ackNumber);
  const nextTask = activeTasks.find((task) => task.status !== "done") ?? null;
  const nextDef = nextTask ? taskDef(nextTask.code) : undefined;
  const nextIsDoNow = nextTask?.status === "doNow";

  // P1-7 device note: the next task is locked and at least one of its
  // required documents is missing from THIS device's wallet. Unreachable
  // with the T1-only roster (T1 is never locked); see BUG-009.
  const nextDeviceNote = Boolean(
    nextTask &&
      nextTask.status === "locked" &&
      walletTypes !== null &&
      requiredDocuments(nextTask.code).some((doc) => !walletTypes.has(doc)),
  );

  const unlockAnimating = Boolean(nextTask && unlockCode && unlockCode === nextTask.code);

  const renderProvenance = (def: TaskDefinition) => (
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
  );

  return (
    <>
      <SkipLink locale={locale} />
      <DisclosureBanner locale={locale} />

      {/* Recompute diff banner: S5's bannerDiff treatment re-voiced in
          this screen's css (same family, D11 §3): surface ground, 1px
          line-600 edges, expander content in sunken. */}
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
          {phase === "loading" || phase === "restoring" ? (
            /* Loading / restoring: skeleton ring + list in the shape of
               the real content (D10 §10.9), aria-busy on the region. */
            <div className={styles.loading}>
              {phase === "restoring" ? (
                <p className={styles.restoringLabel}>{t(locale, "s9.restoring")}</p>
              ) : null}
              <div className={styles.headerSk}>
                <div className={`skeleton ${styles.skLine}`} />
                <div className={`skeleton ${styles.skRing}`} />
              </div>
              <div className={`skeleton ${styles.skCard}`} />
              <div className={`skeleton ${styles.skCard}`} />
              <div className={`skeleton ${styles.skCard}`} />
            </div>
          ) : phase === "e20" ? (
            /* E-20, D5 verbatim. Start fresh routes to S1; it never
               deletes the local record (N1). */
            <RetryCard
              message={t(locale, "s9.errorE20")}
              retryLabel={t(locale, "s9.tryAgain")}
              onRetry={() => {
                restoreRun.current += 1;
                runRestore(restoreRun.current, locale);
              }}
              tertiaryLabel={t(locale, "s9.startFresh")}
              onTertiary={() => router.replace(withLocale("/", locale.code))}
            />
          ) : phase === "interstitial" ? (
            /* D3 S9 Empty: one honest line, then S1. The polite-region
               announcement already fired at dispatch. */
            <p className={styles.interstitial}>{t(locale, "s9.emptyInterstitial")}</p>
          ) : view ? (
            <>
              <div className={styles.header}>
                <div className={styles.headerText}>
                  <h1 className={styles.heading}>{t(locale, "s9.heading")}</h1>
                  <p className={styles.progressText}>
                    {t(locale, "s9.progress", { done: doneTasks.length, n: activeTasks.length })}
                  </p>
                </div>
                {/* DP-4: the ring is decorative; the literal count above
                    always accompanies it. */}
                <ProgressRing done={doneTasks.length} total={activeTasks.length} />
              </div>

              {updatedNote ? (
                <InlineNote tone="info">{t(locale, "s9.updatedNote")}</InlineNote>
              ) : null}

              {/* The single "Next" card, mirroring the S5 Do-now
                  treatment: 2px accent border + accent-100 band, exactly
                  one (D10 §10.9). Whole card links to S6. */}
              {nextTask ? (
                <article
                  className={[
                    styles.card,
                    "pressable",
                    nextIsDoNow ? styles.cardFirst : "",
                    unlockAnimating ? styles.unlockAnim : "",
                    unlockHold ? styles.unlockHold : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {nextIsDoNow ? (
                    <span className={styles.firstBand}>{t(locale, "s9.doFirst")}</span>
                  ) : null}
                  <div className={styles.cardBody}>
                    {nextIsDoNow ? null : (
                    <StatusChip
                      status={chipFor(nextTask, view.unknownDerived)}
                      locale={locale}
                    />
                    )}
                    {/* Stretched link: the whole card routes to S6,
                        while the provenance link stays tappable. */}
                    <Link
                      href={withLocale(`/task/${nextTask.code}`, locale.code)}
                      className={styles.cardLink}
                      onClick={guardClick}
                    >
                      <span className={styles.taskName}>
                        {nextDef ? nextDef.name : nextTask.code}
                      </span>
                    </Link>
                    {nextDef ? (
                      <span className={styles.department}>{nextDef.department}</span>
                    ) : null}
                    {nextDeviceNote ? (
                      /* P1-7: device-2 restored the journey; the wallet
                          did not travel with it. */
                      <span className={styles.deviceNote}>{t(locale, "s9.deviceNote")}</span>
                    ) : null}
                    {nextDef ? renderProvenance(nextDef) : null}
                  </div>
                </article>
              ) : null}

              {doneTasks.length > 0 ? (
                <section className={styles.section} aria-labelledby="s9-completed">
                  <h2 className={styles.sectionTitle} id="s9-completed">
                    {t(locale, "s9.completedTitle")}
                  </h2>
                  <ol className={styles.rowList}>
                    {doneTasks.map((task) => {
                      const def = taskDef(task.code);
                      return (
                        <li key={task.code}>
                          <Link
                            href={withLocale(`/task/${task.code}`, locale.code)}
                            className={`${styles.rowLink} pressable`}
                            onClick={guardClick}
                          >
                            <span className={styles.taskName}>
                              {def ? def.name : task.code}
                            </span>
                            <span className={styles.rowMeta}>
                              {task.preCompleted ? (
                                /* Pre-completed tasks have no completion
                                   date; the wording says why instead of
                                   a fabricated one. */
                                <span className={styles.metaLine}>
                                  {t(locale, "s6.preCompletedNote")}
                                </span>
                              ) : task.completedAt ? (
                                <span className={styles.metaLine}>
                                  {t(locale, "s6.doneRecord", {
                                    date: formatDate(task.completedAt, locale.dateFormat),
                                  })}
                                </span>
                              ) : null}
                              {task.ackNumber ? (
                                <span className={styles.monoRef}>
                                  {t(locale, "s6.doneRef", { ack: task.ackNumber })}
                                </span>
                              ) : task.preCompleted ? null : (
                                <span className={styles.metaLine}>
                                  {t(locale, "s6.doneNoRef")}
                                </span>
                              )}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ) : null}

              {waitingTasks.length > 0 ? (
                <section className={styles.section} aria-labelledby="s9-waiting">
                  <h2 className={styles.sectionTitle} id="s9-waiting">
                    {t(locale, "s9.waitingTitle")}
                  </h2>
                  <ol className={styles.rowList}>
                    {waitingTasks.map((task) => {
                      const def = taskDef(task.code);
                      return (
                        <li key={task.code}>
                          <Link
                            href={withLocale(`/task/${task.code}`, locale.code)}
                            className={`${styles.rowLink} pressable`}
                            onClick={guardClick}
                          >
                            <span className={styles.taskName}>
                              {def ? def.name : task.code}
                            </span>
                            <span className={styles.rowMeta}>
                              <span className={styles.mockChip}>
                                {t(locale, "s9.waitingMock")}
                              </span>
                              {task.ackNumber ? (
                                <span className={styles.monoRef}>{task.ackNumber}</span>
                              ) : null}
                              {def?.timelineDays ? (
                                /* Expected dates render only where sourced
                                   data exists; none does today (C4,
                                   BUG-009), so this branch is unreachable
                                   until the roster supplies timelines. */
                                <span className={styles.metaLine}>
                                  {t(locale, "s9.expected", {
                                    min: def.timelineDays.min,
                                    max: def.timelineDays.max,
                                  })}
                                </span>
                              ) : null}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ) : null}

              {/* Sync status line. The saved state is TWO spans, never a
                  dot join (D11 §1). Offline replaces the line; E-19
                  replaces it after a failed background push; neither
                  blocks, and local state stays authoritative. */}
              <div className={styles.syncLine}>
                {!online ? (
                  <span className={styles.syncSpan}>{t(locale, "s9.syncOffline")}</span>
                ) : syncFailed ? (
                  <span className={styles.syncSpan}>{t(locale, "s9.errorE19")}</span>
                ) : saveKey ? (
                  <>
                    <span className={styles.syncSpan}>{t(locale, "s9.syncSaved")}</span>
                    <span className={styles.syncSpan}>
                      {t(locale, "s9.syncBacked", { number: saveKey })}
                    </span>
                  </>
                ) : (
                  <>
                    <span className={styles.syncSpan}>{t(locale, "s9.syncUnsynced")}</span>
                    <button
                      type="button"
                      className={`${styles.syncButton} pressable`}
                      onClick={() => {
                        // Re-tap while the sheet is open is a no-op.
                        if (!sheetOpen) setSheetOpen(true);
                      }}
                    >
                      {t(locale, "s9.saveList")}
                    </button>
                  </>
                )}
              </div>

              {/* Focus order (D6 §6.1 S9): change answers, full journey,
                  share/print, after the sync line's control. */}
              <div className={styles.actions}>
                <Link
                  className={styles.changeAnswers}
                  href={withLocale("/confirm", locale.code)}
                  onClick={guardClick}
                >
                  {t(locale, "s9.changeAnswers")}
                </Link>
                <Link
                  className={`${styles.secondary} pressable`}
                  href={withLocale("/journey", locale.code)}
                  onClick={guardClick}
                >
                  {t(locale, "s9.fullJourney")}
                </Link>
                <button
                  type="button"
                  className={`${styles.primary} pressable`}
                  onClick={shareOrPrint}
                >
                  {t(locale, "s9.share")}
                </button>
              </div>

              {/* Multiple journeys are out of build scope (D3 S9 edge);
                  the selector renders with exactly one option so the
                  layout it will occupy already exists. Placed last so it
                  does not disturb the §6.1 anchor order. */}
              <label className={styles.switcher}>
                <span className={styles.switcherLabel}>{t(locale, "s9.journeyLabel")}</span>
                <select className={styles.switcherSelect} defaultValue="current">
                  <option value="current">{t(locale, "s9.journeyCurrent")}</option>
                </select>
              </label>
            </>
          ) : null}
        </main>

        <GlobalFooter locale={locale} />
      </div>

      {view ? (
        <SaveSheet open={sheetOpen} onClose={() => setSheetOpen(false)} locale={locale} />
      ) : null}
    </>
  );
}

/** Read once per settle/entry; the global reduce rule handles CSS. */
function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function SavedPage() {
  // useSearchParams requires a Suspense boundary during prerender.
  return (
    <Suspense fallback={null}>
      <SavedScreen />
    </Suspense>
  );
}
