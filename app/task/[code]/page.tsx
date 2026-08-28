"use client";

import {
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { LocaleDefinition, Strings } from "@/app/_lib/i18n";
import { DEFAULT_LOCALE, findLocale, t } from "@/app/_lib/i18n";
import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import { InlineNote } from "@/app/_components/InlineNote";
import { Interstitial } from "@/app/_components/Interstitial";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { StatusChip, type TaskStatus } from "@/app/_components/StatusChip";
import { announce } from "@/app/_lib/announce";
import { withLocale } from "@/app/_lib/nav";
import { docTypeName, requiredDocuments } from "@/app/_lib/documents";
import { SEED_OFFICE } from "@/app/_lib/offices";
import { listDocumentTypes } from "@/app/_lib/storage/wallet";
import { readJourney, readLocale } from "@/app/_lib/storage/local";
import { updateJourney } from "@/app/_lib/journey/store";
import type { TaskState } from "@/app/_lib/storage/schema";
import { TASKS, type TaskDefinition } from "@/app/_lib/tasks";
import styles from "./page.module.css";

/**
 * S6 — Task Detail. D3 S6; D12 §4 (craft contract).
 *
 * Everything about one task: what it is, which documents it needs against
 * the live wallet, where it happens (online AND in person, always both),
 * what it costs, why applications get rejected, and one primary CTA picked
 * by the D3 CTA rule evaluated in order on every render.
 *
 * State coverage (D3 S6 core states):
 *  - Default: full layout, CTA per the rule.
 *  - Loading: skeleton in the shape of the real layout, aria-busy, never
 *    a spinner. Trigger: first render before locale/T-LOCAL/wallet resolve
 *    (T-LOCAL and IndexedDB have no server-side read, so the first paint
 *    is the skeleton and the mount effect commits the real content).
 *  - Empty: unreachable by construction. A task screen exists only when
 *    TASKS holds the code, and every TASKS entry carries its full pack
 *    content (name, source, documents, fee) or the section is omitted
 *    rather than faked (C4). A pack fetch failure surfaces as S5 E-13
 *    before S6 is reachable. See the notFound card for the unknown-code
 *    deep link, which is the only honest neighbour of an Empty state.
 *  - Error: E-18, detected on tap (probe before interstitial); office
 *    path promoted; D5 copy verbatim in an InlineNote.
 *  - Disabled: O-01 offline. Rule-2 CTA replaced by the offline chip;
 *    rule-3 CTA disabled with the O-01 reason below (never silently
 *    grey); office path and checklist stay live.
 */

/* ------------------------------------------------------------------ */
/* O-01 connectivity, read the OfflineChip way, exactly like S5.       */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Task constants. Local because the roster (BUG-009) cannot carry     */
/* them yet; both maps are data, not T1 special cases.                 */
/* ------------------------------------------------------------------ */

/**
 * Tasks with an Appendix A practice schema, i.e. CTA rule 2 can fire.
 * T1 is the shipped instance ("models Assam; basis: CRS death-report
 * form"); the set grows with the roster instead of the CTA rule growing
 * an if-chain.
 */
const MOCK_FLOW_TASKS: ReadonlySet<string> = new Set(["T1"]);

/**
 * Output document per task (Appendix A / P1-3): T1's practice submission
 * produces the practice Death Certificate, which the completion flow
 * offers to add to the wallet. Tasks without an entry go straight back
 * to the journey.
 */
const OUTPUT_DOCS: Readonly<Record<string, string>> = { T1: "DOC-DEATH" };

/** Base-namespace keys for the closed Appendix A document set. */
const DOC_NAME_KEYS: Readonly<Record<string, keyof Strings>> = {
  "DOC-MED": "doc.DOC-MED",
  "DOC-ID-D": "doc.DOC-ID-D",
  "DOC-ID-I": "doc.DOC-ID-I",
  "DOC-ADDR": "doc.DOC-ADDR",
  "DOC-DEATH": "doc.DOC-DEATH",
};

function docName(locale: LocaleDefinition, code: string): string {
  const key = DOC_NAME_KEYS[code];
  // A code outside the base namespace renders the roster's own name,
  // never an invented translation (C4).
  return key ? t(locale, key) : docTypeName(code);
}

/** D6 6.4: dates render through the locale's dateFormat token. Both
 *  shipped locales use DD-MM-YYYY with Latin digits; Devanagari month
 *  names in prose are BUG-008's (copy owner) concern, not formatting's. */
function formatDate(iso: string, format: string): string {
  const [year = "", month = "", day = ""] = iso.slice(0, 10).split("-");
  return format.replace("YYYY", year).replace("MM", month).replace("DD", day);
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** The task that produces a given document (for the locked unlock path). */
function producerOf(docCode: string): TaskDefinition | undefined {
  const code = Object.keys(OUTPUT_DOCS).find((task) => OUTPUT_DOCS[task] === docCode);
  return code ? TASKS.find((def) => def.code === code) : undefined;
}

function chipFor(task: TaskState): TaskStatus {
  // The `locked` and `mayNotApply` chips never occur with the T1-only
  // roster (BUG-009: T1 is the first task of every journey and never
  // locked); the mapping stays so the full roster slots in unchanged.
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

/* ------------------------------------------------------------------ */
/* The CTA rule (D3 S6, authoritative). Evaluated in order, every      */
/* render, as a function over the task definition; never a T1 case.    */
/* ------------------------------------------------------------------ */

type CtaAction =
  | { kind: "docs"; href: string }
  | { kind: "practice"; href: string }
  | { kind: "official"; url: string; host: string }
  | { kind: "where"; href: string };

function resolveCta(
  def: TaskDefinition,
  missingDocs: readonly string[],
  locale: LocaleDefinition,
): CtaAction {
  // 1. Any required document missing: documents first.
  if (missingDocs.length > 0) {
    return {
      kind: "docs",
      href: withLocale(
        `/documents?focus=${missingDocs[0]}&return=task:${def.code}`,
        locale.code,
      ),
    };
  }
  // 2. Docs complete and a mock flow exists for this task.
  if (MOCK_FLOW_TASKS.has(def.code)) {
    return { kind: "practice", href: withLocale(`/practice/${def.code}/1`, locale.code) };
  }
  // 3. Docs complete, official path exists, no mock: interstitial CTA.
  //    Unreachable with the T1-only roster (T1 has a mock flow), but the
  //    evaluation order is real code, not a special case (D12 §4).
  if (def.sourceUrl) {
    return { kind: "official", url: def.sourceUrl, host: hostOf(def.sourceUrl) };
  }
  // 4. Nothing online: "Where to go". Unreachable today because C4 makes
  //    sourceUrl required on every TaskDefinition; kept so rule 4 exists.
  return { kind: "where", href: withLocale(`/help?task=${def.code}`, locale.code) };
}

/* ------------------------------------------------------------------ */

type Phase = "loading" | "ready" | "notFound";

function TaskScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const { code } = useParams<{ code: string }>();

  const [locale, setLocale] = useState<LocaleDefinition>(DEFAULT_LOCALE);
  const [phase, setPhase] = useState<Phase>("loading");
  const [task, setTask] = useState<TaskState | null>(null);
  /** Wallet doc-type codes; null until the IndexedDB read resolves. */
  const [walletTypes, setWalletTypes] = useState<string[] | null>(null);
  /** E-18: the portal probe failed; office block promoted, note shown. */
  const [e18, setE18] = useState(false);
  /** Open interstitial target (N6). Null = closed. */
  const [portal, setPortal] = useState<{ url: string; host: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [docPromptOpen, setDocPromptOpen] = useState(false);

  const online = useSyncExternalStore(subscribeOnline, getOnline, getOnlineServer);

  // First tap wins everywhere (D3 S6): one boolean guard, S5's `locked`
  // pattern. Claimed by every interaction and released when an async
  // action ends without navigation (probe failure, sheet dismissal).
  const [tapLocked, setTapLocked] = useState(false);
  const claimTap = (): boolean => {
    if (tapLocked) return false;
    setTapLocked(true);
    return true;
  };
  const releaseTap = (): void => {
    setTapLocked(false);
  };
  const guardNav = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!claimTap()) event.preventDefault();
  };

  /* T-LOCAL and the wallet exist only after mount, so the locale
     resolution, the journey read and their resulting state must live in
     an effect; each branch commits its state in one batch. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const effLocale =
      findLocale(params.get("locale") ?? readLocale() ?? undefined) ?? DEFAULT_LOCALE;
    setLocale(effLocale);

    // Unknown task code (e.g. /task/T2): an honest not-found card, never
    // fake content. Checked before the journey read so a bad deep link
    // shows its own error instead of being redirected away from it.
    const def = TASKS.find((candidate) => candidate.code === code);
    if (!def) {
      setPhase("notFound");
      return;
    }

    const record = readJourney();
    if (!record) {
      // N5: a deep link without journey context preserves the original
      // destination and routes to S1. NOTE: S1 consumption of "sbn.dest"
      // is a documented follow-up (N5: consumed immediately after journey
      // restore or creation); nothing reads the key yet.
      const query = params.toString();
      try {
        sessionStorage.setItem("sbn.dest", `/task/${code}${query ? `?${query}` : ""}`);
      } catch {
        // Storage disabled: the redirect still happens; only the
        // preserved destination is lost.
      }
      router.replace(withLocale("/", effLocale.code));
      return;
    }

    // Every computable journey contains T1 (compute.ts), so a TASKS code
    // missing from the record is unreachable today; the synthesised
    // default keeps such a crafted record functional instead of broken.
    // E-21 (deep-link task absent from journey) is S5's row, not S6's.
    // Archived tasks match too: P5 keeps their completion record intact
    // and read-only, exactly like any completed task.
    const stored =
      record.tasks.find((candidate) => candidate.code === code) ?? {
        code,
        status: "doNow" as const,
        ackNumber: null,
        lockReason: null,
        archived: false,
      };
    setTask(stored);
    setPhase("ready");

    // Live wallet index for the checklist (T-IDB, client-only).
    let cancelled = false;
    listDocumentTypes()
      .then((types) => {
        if (!cancelled) setWalletTypes(types);
      })
      .catch(() => {
        // A failed wallet read never claims a document is present: the
        // checklist degrades to "missing" with Add actions, and S7 owns
        // wallet errors (E-14/E-17) on its own ground.
        if (!cancelled) setWalletTypes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [params, router, code]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const def = TASKS.find((candidate) => candidate.code === code);

  // E-18 detection on tap (D12 §4): probe before the interstitial. A
  // no-cors fetch resolves when the host answers at all and rejects on
  // network failure; ~4 s matches the suite's short-timeout register.
  const probePortal = async (url: string): Promise<boolean> => {
    try {
      await fetch(url, { mode: "no-cors", signal: AbortSignal.timeout(4000) });
      return true;
    } catch {
      return false;
    }
  };

  const activatePortal = async (url: string) => {
    if (!claimTap()) return;
    const reachable = await probePortal(url);
    if (reachable) {
      setE18(false);
      setPortal({ url, host: hostOf(url) });
      // The tap stays claimed while the sheet is open; onClose releases.
    } else {
      releaseTap();
      setE18(true);
    }
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    releaseTap();
  };
  const closeDocPrompt = () => {
    setDocPromptOpen(false);
    releaseTap();
  };

  /**
   * Completion flow (P1-3): confirm sheet, write status/completedAt
   * through T-LOCAL, announce politely, then prompt for the task's
   * output document if one exists (local map citing Appendix A).
   */
  const completeTask = () => {
    if (!def) return;
    setConfirmOpen(false);
    const completedAt = new Date().toISOString();
    updateJourney((draft) => {
      const existing = draft.tasks.find((candidate) => candidate.code === code);
      if (existing) {
        existing.status = "done";
        existing.completedAt = completedAt;
        // ackNumber is preserved: marking done here never mints or
        // clears a practice reference (P5).
      } else {
        draft.tasks.push({
          code,
          status: "done",
          ackNumber: null,
          lockReason: null,
          archived: false,
          completedAt,
        });
      }
    });
    // Reflect the write locally so staying on S6 shows the record.
    setTask((prev) => (prev ? { ...prev, status: "done", completedAt } : prev));
    announce(t(locale, "s6.announceDone", { task: def.name }));

    const outputDoc = OUTPUT_DOCS[code];
    if (outputDoc) {
      setDocPromptOpen(true);
    } else {
      router.push(withLocale("/journey", locale.code));
    }
  };

  /* ---- derived render state ---------------------------------------- */

  const readOnlyDone = task?.status === "done";
  const readOnlyLocked = task?.status === "locked";
  const interactive = Boolean(task) && !readOnlyDone && !readOnlyLocked;

  const requiredDocs = def ? requiredDocuments(def.code) : [];
  const missingDocs =
    walletTypes === null ? [] : requiredDocs.filter((doc) => !walletTypes.includes(doc));

  const cta: CtaAction | null =
    def && interactive && walletTypes !== null
      ? resolveCta(def, missingDocs, locale)
      : null;

  const notFoundHref = withLocale("/journey", locale.code);
  const helpHref = def ? withLocale(`/help?task=${def.code}`, locale.code) : notFoundHref;
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    SEED_OFFICE.mapQuery,
  )}`;

  // Locked deep link: the unlock path targets the task that produces the
  // needed document when the roster knows one, else the wallet Add flow
  // for the document itself. Unreachable with the T1-only roster (T1 is
  // never locked); coded so the branch is real, not a stub.
  const lockDoc = task?.lockReason ?? "";
  const lockProducer = lockDoc ? producerOf(lockDoc) : undefined;
  const unlockHref = lockProducer
    ? withLocale(`/task/${lockProducer.code}`, locale.code)
    : withLocale(`/documents?focus=${lockDoc}`, locale.code);
  const unlockLabel = lockProducer
    ? t(locale, "s6.lockedGo", { task: lockProducer.name })
    : t(locale, "s6.docAdd");

  const renderPrimaryCta = () => {
    if (!def || !cta) return null;
    switch (cta.kind) {
      case "docs":
        return (
          <Link
            href={cta.href}
            className={`${styles.primary} pressable`}
            onClick={guardNav}
          >
            {t(locale, "s6.docsMissingCta")}
          </Link>
        );
      case "practice":
        // O-01: rule 2 is replaced by the offline chip, per D3. The chip
        // is not a disabled button: practice entry simply is not offered
        // without a connection, and the reason is the chip itself.
        return online ? (
          <Link
            href={cta.href}
            className={`${styles.primary} pressable`}
            onClick={guardNav}
          >
            {t(locale, "s6.practiceCta")}
          </Link>
        ) : (
          <span className={styles.offlineChip}>{t(locale, "s6.offlinePractice")}</span>
        );
      case "official":
        // O-01: disabled with the O-01 reason directly below, never
        // silently grey (D10 §10.9). Unreachable for T1 (rule 2 fired).
        return online ? (
          <button
            type="button"
            className={`${styles.primary} pressable`}
            onClick={() => activatePortal(cta.url)}
          >
            {t(locale, "s6.officialCta")}
          </button>
        ) : (
          <>
            <button type="button" className={styles.primary} disabled aria-disabled>
              {t(locale, "s6.officialCta")}
            </button>
            <p className={styles.disabledReason}>{t(locale, "error.O01")}</p>
          </>
        );
      case "where":
        return (
          <Link
            href={cta.href}
            className={`${styles.primary} pressable`}
            onClick={guardNav}
          >
            {t(locale, "s6.whereCta")}
          </Link>
        );
    }
  };

  const renderWhereBlock = (which: "online" | "office") => {
    if (!def) return null;
    if (which === "online") {
      return (
        <div key="online" className={styles.whereBlock}>
          <span className={styles.channel}>{t(locale, "s6.onlineLabel")}</span>
          <button
            type="button"
            className={styles.portalLink}
            onClick={() => activatePortal(def.sourceUrl)}
          >
            {t(locale, "s6.portalLink")}
          </button>
        </div>
      );
    }
    return (
      <div key="office" className={styles.whereBlock}>
        <span className={styles.channel}>{t(locale, "s6.officeLabel")}</span>
        <span className={styles.officeName}>{SEED_OFFICE.name}</span>
        {SEED_OFFICE.addressLines.map((line) => (
          <span key={line} className={styles.addressLine}>
            {line}
          </span>
        ))}
        {/* Map links do not pass the interstitial: the copy would be
            false (D12 §3). Opens Google Maps directly. */}
        <a
          className={styles.portalLink}
          href={mapHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={guardNav}
        >
          {t(locale, "s6.mapLink")}
        </a>
      </div>
    );
  };

  return (
    <>
      <SkipLink locale={locale} />
      <DisclosureBanner locale={locale} />

      <div className="shell">
        <main
          id="main"
          className={styles.main}
          aria-busy={phase === "loading" || (phase === "ready" && walletTypes === null)}
        >
          {phase === "loading" ? (
            /* Loading: skeleton in the shape of the real layout (title,
               status, checklist rows, CTA placeholder), never a spinner. */
            <div className={styles.loading}>
              <div className={`skeleton ${styles.skTitle}`} />
              <div className={`skeleton ${styles.skChip}`} />
              <div className={`skeleton ${styles.skBlock}`} />
              <div className={`skeleton ${styles.skRow}`} />
              <div className={`skeleton ${styles.skRow}`} />
              <div className={`skeleton ${styles.skRow}`} />
              <div className={`skeleton ${styles.skCta}`} />
            </div>
          ) : phase === "notFound" || !def ? (
            /* Unknown task code: small honest card, never fake content. */
            <section className={styles.notFound}>
              <h1 className={styles.heading}>{t(locale, "s6.notFoundTitle")}</h1>
              <p className={styles.notFoundBody}>{t(locale, "s6.notFoundBody")}</p>
              <Link
                href={notFoundHref}
                className={`${styles.primary} pressable`}
                onClick={guardNav}
              >
                {t(locale, "s6.notFoundBack")}
              </Link>
            </section>
          ) : task ? (
            <>
              {/* D6 §6.1 initial focus is the title; like S5's shipped
                  "Heading" row, no focus is stolen on load. */}
              <h1 className={styles.heading}>{def.name}</h1>
              <StatusChip status={chipFor(task)} locale={locale} />

              {readOnlyDone ? (
                /* Read-only completed (entry c): content and provenance
                    stay; the CTAs are replaced by the completion record. */
                <section className={styles.record}>
                  {task.completedAt ? (
                    <p className={styles.recordLine}>
                      {t(locale, "s6.doneRecord", {
                        date: formatDate(task.completedAt, locale.dateFormat),
                      })}
                    </p>
                  ) : (
                    /* Pre-completed tasks (Q1 Yes) carry no completedAt by
                       schema: the note replaces the date, never a
                       fabricated one. */
                    <p className={styles.recordLine}>
                      {t(locale, "s6.preCompletedNote")}
                    </p>
                  )}
                  {task.ackNumber ? (
                    <p className={`${styles.recordLine} ${styles.recordMono}`}>
                      {t(locale, "s6.doneRef", { ack: task.ackNumber })}
                    </p>
                  ) : (
                    <p className={styles.recordLine}>{t(locale, "s6.doneNoRef")}</p>
                  )}
                </section>
              ) : null}

              {readOnlyLocked ? (
                /* Locked deep link (entry e): read-only plus a prominent
                    unlock path. Unreachable with the T1-only roster. */
                <section className={styles.unlock}>
                  <p className={styles.unlockNote}>
                    {t(locale, "s6.lockedNote", {
                      document: docName(locale, lockDoc),
                    })}
                  </p>
                  <Link
                    href={unlockHref}
                    className={`${styles.primary} pressable`}
                    onClick={guardNav}
                  >
                    {unlockLabel}
                  </Link>
                </section>
              ) : null}

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t(locale, "s6.docsTitle")}</h2>
                {walletTypes === null ? (
                  <ul className={styles.docs}>
                    {requiredDocs.map((doc) => (
                      <li key={doc} className={styles.docRow}>
                        <div className={`skeleton ${styles.skRow}`} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className={styles.docs}>
                    {requiredDocs.map((doc) =>
                      walletTypes.includes(doc) ? (
                        <li key={doc} className={styles.docRow}>
                          <svg className={styles.docIcon} viewBox="0 0 16 16" aria-hidden="true">
                            <path
                              d="M3 8.5l3.2 3L13 5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span className={styles.docName}>{docName(locale, doc)}</span>
                          <span className={styles.docState}>{t(locale, "s6.docHave")}</span>
                        </li>
                      ) : (
                        <li key={doc} className={styles.docRow}>
                          <span className={styles.docName}>{docName(locale, doc)}</span>
                          <Link
                            className={`${styles.docAdd} pressable`}
                            href={withLocale(
                              `/documents?focus=${doc}&return=task:${def.code}`,
                              locale.code,
                            )}
                            onClick={guardNav}
                          >
                            {t(locale, "s6.docAdd")}
                          </Link>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t(locale, "s6.whereTitle")}</h2>
                {e18 ? (
                  /* E-18, D5 verbatim. Not auto-cleared: recovery is the
                     office path or a manual retry of the link. */
                  <InlineNote tone="error">{t(locale, "s6.errorE18")}</InlineNote>
                ) : null}
                <div className={styles.whereBlocks}>
                  {/* Both channels always render. After E-18 the office
                      block is promoted to first (primary) position. */}
                  {e18 ? renderWhereBlock("office") : null}
                  {renderWhereBlock("online")}
                  {e18 ? null : renderWhereBlock("office")}
                </div>
              </section>

              {def.fee ? (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>{t(locale, "s6.feeTitle")}</h2>
                  <p className={styles.feeText}>{def.fee.text}</p>
                  <p className={styles.feeNote}>{t(locale, "s6.feeNote")}</p>
                  {/* The fee carries its own sourced provenance
                      (tasks.ts/offices.ts), separate from the task's. */}
                  <span className={styles.metaLine}>
                    {t(locale, "meta.source")}{" "}
                    <a
                      className={styles.metaLink}
                      href={def.fee.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={guardNav}
                    >
                      {hostOf(def.fee.sourceUrl)}
                    </a>
                  </span>
                  <span className={styles.metaLine}>
                    {t(locale, "meta.verified")} {def.fee.lastVerified}
                  </span>
                </section>
              ) : null}

              {/* Timeline section: def.timelineDays does not exist in a
                  sourced form today, so it is omitted rather than guessed
                  (C4), exactly like S5's estimates under BUG-009. */}

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t(locale, "s6.rejectionTitle")}</h2>
                <ul className={styles.rejectList}>
                  <li>{t(locale, "s6.reject1")}</li>
                  <li>{t(locale, "s6.reject2")}</li>
                  <li>{t(locale, "s6.reject3")}</li>
                </ul>
              </section>

              {/* Provenance block (C4). Citation links are references,
                  not navigations: they open directly, no probe, no
                  interstitial (D12 §3). */}
              <section className={styles.provenance}>
                <span className={styles.metaLine}>
                  {t(locale, "meta.source")}{" "}
                  <a
                    className={styles.metaLink}
                    href={def.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={guardNav}
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
              </section>

              <section className={styles.actions}>
                {walletTypes === null ? (
                  /* D3 Loading: CTA placeholder while the wallet resolves. */
                  <div className={`skeleton ${styles.skCta}`} />
                ) : (
                  renderPrimaryCta()
                )}

                {interactive ? (
                  <button
                    type="button"
                    className={`${styles.secondary} pressable`}
                    onClick={() => {
                      if (claimTap()) setConfirmOpen(true);
                    }}
                  >
                    {t(locale, "s6.alreadyDone")}
                  </button>
                ) : null}

                {/* Tertiary help stays in read-only modes (D3: read-only
                    keeps content and help). No visible Back control:
                    hardware/browser back returns to S5 per history. */}
                <Link href={helpHref} className={styles.tertiary} onClick={guardNav}>
                  {t(locale, "s6.needHelp")}
                </Link>
              </section>
            </>
          ) : null}
        </main>

        <GlobalFooter locale={locale} />
      </div>

      {def ? (
        <>
          {/* Completion confirm (destructive-adjacent, so confirm is
              mandatory). BottomSheet provides trap + back dismissal. */}
          <BottomSheet
            open={confirmOpen}
            onClose={closeConfirm}
            title={t(locale, "s6.confirmTitle", { task: def.name })}
            closeLabel={t(locale, "s6.cancel")}
          >
            <div className={styles.sheetActions}>
              <button
                type="button"
                className={`${styles.primary} pressable`}
                onClick={completeTask}
              >
                {t(locale, "s6.confirmYes")}
              </button>
              <button
                type="button"
                className={`${styles.secondary} pressable`}
                onClick={closeConfirm}
              >
                {t(locale, "s6.cancel")}
              </button>
            </div>
          </BottomSheet>

          {OUTPUT_DOCS[code] ? (
            <BottomSheet
              open={docPromptOpen}
              onClose={closeDocPrompt}
              title={t(locale, "s6.docPrompt", {
                document: docName(locale, OUTPUT_DOCS[code]),
              })}
              closeLabel={t(locale, "s6.cancel")}
            >
              <div className={styles.sheetActions}>
                <Link
                  href={withLocale(
                    `/documents?focus=${OUTPUT_DOCS[code]}&continue=${code}`,
                    locale.code,
                  )}
                  className={`${styles.primary} pressable`}
                  onClick={guardNav}
                >
                  {t(locale, "s6.docPromptAdd")}
                </Link>
                <Link
                  href={withLocale("/journey", locale.code)}
                  className={`${styles.secondary} pressable`}
                  onClick={guardNav}
                >
                  {t(locale, "s6.docPromptLater")}
                </Link>
              </div>
            </BottomSheet>
          ) : null}

          <Interstitial
            open={portal !== null}
            url={portal?.url ?? def.sourceUrl}
            host={portal?.host ?? hostOf(def.sourceUrl)}
            labels={{
              title: t(locale, "s6.interTitle"),
              body: t(locale, "s6.interBody"),
              continue: t(locale, "s6.interContinue"),
              stay: t(locale, "s6.interStay"),
              close: t(locale, "s6.interClose"),
            }}
            onClose={() => {
              setPortal(null);
              releaseTap();
            }}
          />
        </>
      ) : null}
    </>
  );
}

export default function TaskPage() {
  // useSearchParams requires a Suspense boundary during prerender.
  return (
    <Suspense fallback={null}>
      <TaskScreen />
    </Suspense>
  );
}
