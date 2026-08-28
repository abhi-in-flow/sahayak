"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { LocaleDefinition, Strings } from "@/app/_lib/i18n";
import { DEFAULT_LOCALE, findLocale, t } from "@/app/_lib/i18n";
import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { InlineNote } from "@/app/_components/InlineNote";
import { announce } from "@/app/_lib/announce";
import { withLocale } from "@/app/_lib/nav";
import { DOC_TYPES, docTypeName, requiredDocuments } from "@/app/_lib/documents";
import {
  getJourneyServerSnapshot,
  getJourneySnapshot,
  subscribeJourney,
} from "@/app/_lib/journey/store";
import { readLocale } from "@/app/_lib/storage/local";
import type { TaskState } from "@/app/_lib/storage/schema";
import {
  getDocument,
  listDocumentTypes,
  removeDocument,
  type WalletDocument,
} from "@/app/_lib/storage/wallet";
import { TASKS } from "@/app/_lib/tasks";
import { DocumentCard, DocumentChip } from "./_components/DocumentCard";
import { useObjectUrl } from "./_components/objectUrl";
import { ReuseGraph, type ReuseGraphLink } from "./_components/ReuseGraph";
import {
  getUploadServerVersion,
  getUploadVersion,
  subscribeUploads,
} from "./_components/uploads";
import styles from "./page.module.css";

/**
 * S7 — Document Wallet. D3 S7; D4 §4.2 (S7 reads the wallet, writes
 * document add/remove); D5 (E-14/E-15/E-16/E-17 verbatim); D6 §6.1/6.2;
 * D10 §10.8/§10.10; D12 §4 S7.
 *
 * The page copies the journey/page.tsx pattern: client component, mount
 * effect resolves the locale, wallet reads live in effects (T-IDB has no
 * server-side read). Readiness is derived per render from the journey
 * record plus the wallet index; completion is NEVER written here (P2-8:
 * S7 touches T-IDB only).
 */

/** Localized document name; codes outside the seeded set fall back to
 *  documents.ts (unreachable for the Appendix A set). */
const DOC_NAME_KEYS: Readonly<Record<string, keyof Strings | undefined>> = {
  "DOC-MED": "doc.DOC-MED",
  "DOC-ID-D": "doc.DOC-ID-D",
  "DOC-ID-I": "doc.DOC-ID-I",
  "DOC-ADDR": "doc.DOC-ADDR",
  "DOC-DEATH": "doc.DOC-DEATH",
};

function docName(locale: LocaleDefinition, code: string): string {
  const key = DOC_NAME_KEYS[code];
  return key ? t(locale, key) : docTypeName(code);
}

function taskDisplayName(code: string): string {
  return TASKS.find((def) => def.code === code)?.name ?? code;
}

/** Readiness: a task's requirements are all in the wallet (D3 S7). */
function taskSatisfied(task: TaskState, types: readonly string[]): boolean {
  return requiredDocuments(task.code).every((code) => types.includes(code));
}

function docTypeOrder(code: string): number {
  const index = DOC_TYPES.findIndex((def) => def.code === code);
  return index === -1 ? DOC_TYPES.length : index;
}

type SheetState = { kind: "remove" | "preview"; docType: string } | null;

function DocumentsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const [locale, setLocale] = useState<LocaleDefinition>(DEFAULT_LOCALE);
  const [phase, setPhase] = useState<"loading" | "redirect" | "ready">("loading");
  const [wallet, setWallet] = useState<WalletDocument[]>([]);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [quotaError, setQuotaError] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [removalNotes, setRemovalNotes] = useState<{ id: number; text: string }[]>([]);
  const [continueTask, setContinueTask] = useState<string | null>(() => params.get("continue"));

  const uploadVersion = useSyncExternalStore(
    subscribeUploads,
    getUploadVersion,
    getUploadServerVersion,
  );
  const journey = useSyncExternalStore(
    subscribeJourney,
    getJourneySnapshot,
    getJourneyServerSnapshot,
  );

  const noteId = useRef(0);

  const loadWallet = useCallback(async (): Promise<WalletDocument[]> => {
    const types = await listDocumentTypes();
    const records = await Promise.all(types.map((code) => getDocument(code)));
    const found = records
      .filter((record): record is WalletDocument => record !== undefined)
      .sort((a, b) => docTypeOrder(a.docType) - docTypeOrder(b.docType));
    setWallet(found);
    return found;
  }, []);

  /* T-LOCAL exists only after mount, so locale resolution and the entry
     precondition live in an effect (the journey/page.tsx pattern). */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const effLocale =
      findLocale(params.get("locale") ?? readLocale() ?? undefined) ?? DEFAULT_LOCALE;
    setLocale(effLocale);

    // D3 S7 edge case: a deep link without journey context routes to S1.
    // (The N5 "destination preserved after restore" mechanism has no S1
    // contract yet; see the S7 workstream report.)
    const record = getJourneySnapshot();
    const hasTranscript = Boolean(record && record.transcript.trim().length > 0);
    const hasTasks = Boolean(record && record.tasks.length > 0);
    if (!record || (!hasTranscript && !hasTasks)) {
      setPhase("redirect");
      router.replace(withLocale("/", effLocale.code));
      return;
    }

    setContinueTask((current) => current ?? params.get("continue"));
    setPhase("ready");
  }, [params, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* Wallet reads: once on entry, and after any upload settles anywhere
     (N2: the card may have landed while this page was unmounted). T-IDB
     is an external system; the read is async, so the mirror into state
     is necessarily effect-driven (the journey/page.tsx convention). */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (phase === "ready") void loadWallet();
  }, [phase, uploadVersion, loadWallet]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* ---- derived coverage (recomputed per render; D3 S7) -------------- */

  const activeTasks = useMemo(
    () => journey?.tasks.filter((task) => !task.archived) ?? [],
    [journey],
  );
  const walletTypes = useMemo(() => wallet.map((record) => record.docType), [wallet]);
  const walletByCode = useMemo(
    () => new Map(wallet.map((record) => [record.docType, record])),
    [wallet],
  );

  // t: unique required documents across the journey's non-archived tasks.
  const requiredOrdered = useMemo(() => {
    const seen: string[] = [];
    for (const task of activeTasks) {
      for (const code of requiredDocuments(task.code)) {
        if (!seen.includes(code)) seen.push(code);
      }
    }
    return seen;
  }, [activeTasks]);

  const h = requiredOrdered.filter((code) => walletTypes.includes(code)).length;
  const tCount = requiredOrdered.length;
  const n = activeTasks.length;
  const u = activeTasks.filter((task) => taskSatisfied(task, walletTypes)).length;

  // Cards: every doc type required by the journey OR present in the
  // wallet (so the practice output document gets a card once S8 adds it).
  const cardCodes = useMemo(() => {
    const codes = [...requiredOrdered];
    for (const def of DOC_TYPES) {
      if (walletTypes.includes(def.code) && !codes.includes(def.code)) codes.push(def.code);
    }
    return codes;
  }, [requiredOrdered, walletTypes]);

  const consumersOf = useCallback(
    (code: string): string[] =>
      activeTasks
        .filter((task) => requiredDocuments(task.code).includes(code))
        .map((task) => taskDisplayName(task.code)),
    [activeTasks],
  );

  const graph = useMemo(
    () => ({
      docs: requiredOrdered.map((code) => ({ satisfied: walletTypes.includes(code) })),
      tasks: activeTasks.map((task) => ({ satisfied: taskSatisfied(task, walletTypes) })),
      links: activeTasks.flatMap((task, taskIndex): ReuseGraphLink[] =>
        requiredDocuments(task.code)
          .map((code) => ({
            doc: requiredOrdered.indexOf(code),
            task: taskIndex,
            satisfied: walletTypes.includes(code),
          }))
          .filter((link) => link.doc >= 0),
      ),
    }),
    [activeTasks, requiredOrdered, walletTypes],
  );

  // The `continue` exit exists only while the named task is satisfied.
  const continueCode = useMemo(() => {
    if (continueTask && activeTasks.some((task) => task.code === continueTask)) {
      return taskSatisfied(
        activeTasks.find((task) => task.code === continueTask)!,
        walletTypes,
      )
        ? continueTask
        : null;
    }
    return null;
  }, [activeTasks, continueTask, walletTypes]);

  /* ---- add success: positive confirmation + readiness (D6 §6.2) ----- */

  const handleAddSuccess = useCallback(
    async () => {
      const fresh = await loadWallet();
      const freshTypes = fresh.map((record) => record.docType);
      const before = activeTasks.filter((task) => taskSatisfied(task, walletTypes)).length;
      const after = activeTasks.filter((task) => taskSatisfied(task, freshTypes)).length;
      const k = after - before;
      const message =
        k > 1
          ? t(locale, "s7.addedAlso", { k })
          : k === 1
            ? t(locale, "s7.addedAlsoOne")
            : t(locale, "s7.added");
      setConfirmation(message);
      announce(message);
      setQuotaError(false);
      if (k > 0) {
        const newly = activeTasks.find(
          (task) => taskSatisfied(task, freshTypes) && !taskSatisfied(task, walletTypes),
        );
        setContinueTask(newly?.code ?? null);
      }
    },
    [activeTasks, locale, loadWallet, walletTypes],
  );

  const handleQuotaExceeded = useCallback(() => setQuotaError(true), []);

  /* ---- removal (destructive; P2-8: never reverts completion) -------- */

  const confirmRemove = useCallback(async () => {
    if (sheet?.kind !== "remove") return;
    const target = sheet.docType;
    // Completed consumers are read BEFORE the removal so the note names
    // reality, and completion itself is never touched (P2-8).
    const completedConsumers = activeTasks.filter(
      (task) => task.status === "done" && requiredDocuments(task.code).includes(target),
    );
    await removeDocument(target);
    setSheet(null);
    setQuotaError(false);
    await loadWallet();
    if (completedConsumers.length > 0) {
      const text = t(locale, "s7.completedNote");
      setRemovalNotes((notes) => [
        ...notes,
        ...completedConsumers.map(() => ({ id: (noteId.current += 1), text })),
      ]);
    }
  }, [activeTasks, locale, loadWallet, sheet]);

  /* ---- render --------------------------------------------------------- */

  const focusDoc = params.get("focus");
  const sheetDocType = sheet?.docType ?? null;
  const sheetRecord = sheetDocType ? walletByCode.get(sheetDocType) ?? null : null;
  const previewUrl = useObjectUrl(
    sheet?.kind === "preview" ? sheetRecord?.blob ?? null : null,
  );
  const previewConsumers = sheet ? consumersOf(sheet.docType) : [];

  return (
    <>
      <SkipLink locale={locale} />
      <DisclosureBanner locale={locale} />

      <div className="shell">
        <main id="main" className={styles.main} aria-busy={phase !== "ready"}>
          <h1 className={styles.heading}>{t(locale, "s7.heading")}</h1>

          {phase !== "ready" ? (
            /* Loading: skeleton in the shape of the summary and cards. */
            <div className={styles.loading}>
              <div className={`skeleton ${styles.skLine}`} />
              <div className={`skeleton ${styles.skCard}`} />
              <div className={`skeleton ${styles.skCard}`} />
            </div>
          ) : (
            <>
              <p className={styles.coverage}>
                {t(locale, "s7.coverage", { h, t: tCount, u, n })}
              </p>

              {/* The reuse visualisation is aria-hidden behind the
                  sentence above (D10 §10.10, DP-4). */}
              <div className={styles.graph}>
                <ReuseGraph docs={graph.docs} tasks={graph.tasks} links={graph.links} />
              </div>

              {/* C3/P3 mock-data notice: global, persistent, never
                  dismissible. */}
              <p className={styles.mockNotice} role="note">
                {t(locale, "s7.mockNotice")}
              </p>

              {/* E-17: explain + removal list; never fail silently. */}
              {quotaError ? (
                <section className={styles.quota}>
                  <InlineNote tone="error">{t(locale, "s7.errorE17")}</InlineNote>
                  {wallet.length > 0 ? (
                    <ul className={styles.quotaList}>
                      {wallet.map((record) => (
                        <li key={record.docType} className={styles.quotaRow}>
                          <span className={styles.quotaName}>
                            {docName(locale, record.docType)}
                          </span>
                          <button
                            type="button"
                            className={`${styles.quotaRemove} pressable`}
                            aria-label={`${t(locale, "s7.remove")} ${docName(locale, record.docType)}`}
                            onClick={() => setSheet({ kind: "remove", docType: record.docType })}
                          >
                            {t(locale, "s7.remove")}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ) : null}

              {confirmation ? <InlineNote tone="info">{confirmation}</InlineNote> : null}

              {removalNotes.map((note) => (
                <InlineNote key={note.id} tone="info">
                  {note.text}
                </InlineNote>
              ))}

              {/* Empty wallet: instructional note with the hollow SVG
                  above; the Add actions are on the needed cards. */}
              {wallet.length === 0 ? (
                <p className={styles.empty}>{t(locale, "s7.empty")}</p>
              ) : null}

              <ul className={styles.cards}>
                {cardCodes.map((code) => (
                  <li key={code}>
                    <DocumentCard
                      locale={locale}
                      docType={code}
                      name={docName(locale, code)}
                      consumers={consumersOf(code)}
                      record={walletByCode.get(code) ?? null}
                      removePending={sheet?.kind === "remove" && sheet.docType === code}
                      openAddOnMount={focusDoc === code}
                      onAddSuccess={handleAddSuccess}
                      onQuotaExceeded={handleQuotaExceeded}
                      onAskRemove={(docType) => setSheet({ kind: "remove", docType })}
                      onOpenPreview={(docType) => setSheet({ kind: "preview", docType })}
                    />
                  </li>
                ))}
              </ul>

              {/* Exit shown when an add newly satisfied a task, or via
                  the `continue` deep link (D12 §2). */}
              {continueCode ? (
                <Link
                  className={`${styles.continue} pressable`}
                  href={withLocale(`/task/${continueCode}`, locale.code)}
                >
                  {t(locale, "s7.continueTo", { task: taskDisplayName(continueCode) })}
                </Link>
              ) : null}
            </>
          )}
        </main>

        <GlobalFooter locale={locale} />
      </div>

      {/* Removal confirm (destructive). */}
      {sheet?.kind === "remove" ? (
        <BottomSheet
          open
          onClose={() => setSheet(null)}
          title={t(locale, "s7.removeTitle", { document: docName(locale, sheet.docType) })}
          closeLabel={t(locale, "s7.previewClose")}
        >
          <p className={styles.sheetBody}>{t(locale, "s7.removeBody")}</p>
          <div className={styles.sheetActions}>
            <button type="button" className={`${styles.danger} pressable`} onClick={() => void confirmRemove()}>
              {t(locale, "s7.remove")}
            </button>
            <button
              type="button"
              className={`${styles.secondary} pressable`}
              onClick={() => setSheet(null)}
            >
              {t(locale, "s7.keep")}
            </button>
          </div>
        </BottomSheet>
      ) : null}

      {/* Preview sheet: image, status, used-by, remove (D3 S7). */}
      {sheet?.kind === "preview" ? (
        <BottomSheet
          open
          onClose={() => setSheet(null)}
          title={t(locale, "s7.previewTitle")}
          closeLabel={t(locale, "s7.previewClose")}
        >
          {previewUrl ? (
            /* Blob object URLs from T-IDB: plain img is the correct
               element; next/image cannot optimise a same-document blob. */
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.previewImage} src={previewUrl} alt="" />
          ) : (
            <div className={styles.previewImage} aria-hidden="true" />
          )}
          <DocumentChip
            kind={sheetRecord ? (sheetRecord.isSample ? "sample" : "have") : "need"}
            locale={locale}
          />
          {previewConsumers.length > 0 ? (
            <p className={styles.usedBy}>
              {t(locale, "s7.usedBy", { tasks: previewConsumers.join(", ") })}
            </p>
          ) : null}
          {sheetRecord ? (
            <button
              type="button"
              className={`${styles.danger} pressable`}
              onClick={() => setSheet({ kind: "remove", docType: sheet.docType })}
            >
              {t(locale, "s7.remove")}
            </button>
          ) : null}
        </BottomSheet>
      ) : null}
    </>
  );
}

export default function DocumentsPage() {
  // useSearchParams requires a Suspense boundary during prerender.
  return (
    <Suspense fallback={null}>
      <DocumentsScreen />
    </Suspense>
  );
}
