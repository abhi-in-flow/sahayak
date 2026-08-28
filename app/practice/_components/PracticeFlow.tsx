"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { LocaleDefinition } from "@/app/_lib/i18n";
import { DEFAULT_LOCALE, findLocale, t } from "@/app/_lib/i18n";
import { DisclosureBanner, GlobalFooter, SkipLink } from "@/app/_components/Chrome";
import { MockBanner } from "@/app/_components/MockBanner";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { Field, errorId, helperId } from "@/app/_components/Field";
import { InlineNote } from "@/app/_components/InlineNote";
import { announce } from "@/app/_lib/announce";
import { withLocale } from "@/app/_lib/nav";
import {
  DOC_SAMPLE_PREFILL,
  docTypeName,
  requiredDocuments,
} from "@/app/_lib/documents";
import { districtsForState } from "@/app/_lib/offices";
import { recordedValue } from "@/app/_lib/journey/compute";
import { getJourneySnapshot, subscribeJourney, updateJourney } from "@/app/_lib/journey/store";
import { readLocale } from "@/app/_lib/storage/local";
import { getDocument, listDocumentTypes, putDocument } from "@/app/_lib/storage/wallet";
import { matchesRealId } from "@/app/_lib/realId";
import { SpeechCapture, type CaptureError } from "@/app/_lib/speech";
import {
  ALL_FIELDS,
  FIELD_DEFS,
  MOCK_FLOW_CODES,
  PLACE_OPTIONS,
  RELATIONSHIP_OPTIONS,
  REVIEW_GROUPS,
  SEX_OPTIONS,
  SOURCE_DOC,
  STEP_COUNT,
  STEP_FIELDS,
  dateExampleFromFormat,
  focusTargetId,
  isDateOld,
  isFormStep,
  makeAckNumber,
  mapAnswerValue,
  stepTitleKey,
  validateField,
  type ErrKey,
  type FieldId,
} from "./schema";
import { OptionGroup, type OptionItem } from "./OptionGroup";
import { VoiceMic } from "./VoiceMic";
import { DoneResult } from "./DoneResult";
import { generatePracticeCertificate } from "./certificateArt";
import styles from "../[code]/[step]/page.module.css";

/**
 * S8, the guided MOCK submission (T1, Appendix A). D3 S8; D12 §4.
 *
 * Nothing here ever reaches a government system. The submit writes a
 * practice ack into T-LOCAL, adds the watermarked practice Death
 * Certificate to the local wallet, and shows it as "done": the user
 * must experience completion, honestly marked at every turn.
 *
 * Route contract (D12 §2): /practice/[code]/[step], step 1..4 | done,
 * each step a real history entry (N3). The client component persists
 * across steps, so the whole flow's values live in this component's
 * state; T-LOCAL autosave (on blur, on Next, on unmount) is what makes
 * browser Back, refresh and session timeouts all retain the draft (P4).
 *
 * State rows (D3 S8):
 *   Default    the step's schema fields, pre-filled where mapped.
 *   Loading    pre-fill computation on step entry, capped at 500 ms
 *              (D5 5.3); unresolved maps are skipped silently.
 *   Empty      not applicable as a screen state: a step always has its
 *              schema fields, and required-field emptiness is the
 *              Validation row (reason named per the batch convention).
 *   Error      inline on blur; on Next/Submit the error summary renders
 *              at the top (role="alert") and focus lands on the first
 *              offending field (D6 6.2). E-16 hard-blocks at entry.
 *   Disabled   the submitting window: determinate progress, no cancel,
 *              under 3 s; repeat taps no-op (single fire, P2-7). Field
 *              dictation disables offline with the O-01 reason.
 */

const PREFILL_BUDGET_MS = 500; // D5 5.3
const NON_CANCELLABLE_WINDOW_MS = 2400; // stays under the 3 s ceiling (D5 5.3)

/** Session memory for the resume redirect and edit tracking (T-MEM). */
const visitedCodes = new Set<string>();
const editedFields = new Map<string, Set<FieldId>>();

/** O-01 connectivity, the OfflineChip pattern (external store). */
function subscribeOnline(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
const getOnlineSnapshot = () => navigator.onLine;
const getOnlineServerSnapshot = () => true;

type Phase = "loading" | "redirect" | "ready";

export function PracticeFlow() {
  const params = useParams<{ code: string; step: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const code = params.code ?? "";
  const stepKey = params.step ?? "";
  const isDoneRoute = stepKey === "done";
  const stepNum = isFormStep(stepKey) ? Number(stepKey) : 0;

  const journey = useSyncExternalStore(
    subscribeJourney,
    getJourneySnapshot,
    () => null, // server snapshot: T-LOCAL has no server-side read
  );
  const online = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);

  const [locale, setLocale] = useState<LocaleDefinition>(DEFAULT_LOCALE);
  const [phase, setPhase] = useState<Phase>("loading");
  const [values, setValues] = useState<Record<string, string>>({});
  const valuesRef = useRef<Record<string, string>>({});
  const [errors, setErrors] = useState<Partial<Record<FieldId, ErrKey>>>({});
  const errorsRef = useRef<Partial<Record<FieldId, ErrKey>>>({});
  const [summary, setSummary] = useState<readonly FieldId[] | null>(null);
  const [prefill, setPrefill] = useState<Partial<Record<FieldId, "wallet" | "answers">>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  /* Speech support is a browser fact with no server truth; the lazy
     initialiser keeps the hydration output identical (both server and
     client render the loading skeleton, so it never reaches the DOM). */
  const [speechSupported] = useState(() => SpeechCapture.isSupported());
  const [listeningField, setListeningField] = useState<FieldId | null>(null);
  const [voiceNote, setVoiceNote] = useState<{ field: FieldId; text: string } | null>(null);

  const furthestRef = useRef(1);
  const submittingRef = useRef(false);
  const flowEndedRef = useRef(false);
  const captureRef = useRef<SpeechCapture | null>(null);
  const dictationRef = useRef<{ field: FieldId; base: string } | null>(null);

  /* ---------------------------------------------------------------- */
  /* draft persistence (P4)                                            */
  /* ---------------------------------------------------------------- */

  const writeValues = useCallback((next: Record<string, string>) => {
    valuesRef.current = next;
    setValues(next);
  }, []);

  const setFieldError = useCallback((id: FieldId, key: ErrKey | null) => {
    const next = { ...errorsRef.current };
    if (key) next[id] = key;
    else delete next[id];
    errorsRef.current = next;
    setErrors(next);
  }, []);

  const markEdited = useCallback(
    (id: FieldId) => {
      let set = editedFields.get(code);
      if (!set) {
        set = new Set<FieldId>();
        editedFields.set(code, set);
      }
      set.add(id);
    },
    [code],
  );

  const isEdited = useCallback(
    (id: FieldId) => editedFields.get(code)?.has(id) ?? false,
    [code],
  );

  /** One autosave: draft values + furthest step, and the P2-3 flip. */
  const saveNow = useCallback(() => {
    if (flowEndedRef.current || submittingRef.current) return;
    updateJourney((draft) => {
      draft.drafts[code] = {
        taskCode: code,
        step: furthestRef.current,
        values: { ...valuesRef.current },
        updatedAt: new Date().toISOString(),
      };
      const task = draft.tasks.find((candidate) => candidate.code === code);
      // The FIRST autosave flips the S5 chip to In progress (P2-3).
      if (task && task.status === "doNow") task.status = "inProgress";
    });
  }, [code]);

  /* ---------------------------------------------------------------- */
  /* entry guards, draft restore, pre-fill (mount only)                */
  /* ---------------------------------------------------------------- */

  /* The guards read T-LOCAL and the wallet, neither of which exists on
     the server, and navigate imperatively; re-running them on every step
     change would replay the resume redirect mid-flow, so this effect is
     deliberately mount-only. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const effLocale = findLocale(search.get("locale") ?? readLocale() ?? undefined) ?? DEFAULT_LOCALE;
    setLocale(effLocale);

    // Guard: unknown code or no mock flow for it (T1 ships today).
    if (!MOCK_FLOW_CODES.has(code)) {
      setPhase("redirect");
      router.replace(withLocale(`/task/${code}`, effLocale.code));
      return;
    }

    // Guard: no journey. Destination survives the round trip (N5).
    const record = getJourneySnapshot();
    if (!record) {
      try {
        sessionStorage.setItem("sbn.dest", window.location.pathname + window.location.search);
      } catch {
        // Destination memory is best-effort; the redirect stands.
      }
      setPhase("redirect");
      router.replace(withLocale("/", effLocale.code));
      return;
    }

    if (isDoneRoute) return; // DoneResult guards its own reachability.

    const task = record.tasks.find((candidate) => candidate.code === code);

    // P2-7 replay: a completed task with an ack returns the stored ack.
    if (task?.status === "done") {
      setPhase("redirect");
      router.replace(
        withLocale(task.ackNumber ? `/practice/${code}/done` : `/task/${code}`, effLocale.code),
      );
      return;
    }

    // Guard: malformed step param resolves to the draft's step or step 1.
    const draft = record.drafts[code];
    if (!isFormStep(stepKey)) {
      setPhase("redirect");
      router.replace(withLocale(`/practice/${code}/${draft?.step ?? 1}`, effLocale.code));
      return;
    }

    // Draft restore. Draft values are user data once written; they are
    // restored wholesale and win over any pre-fill below (D3 S8).
    if (draft) {
      furthestRef.current = Math.max(draft.step || 1, stepNum);
      writeValues({ ...draft.values });
    } else {
      furthestRef.current = stepNum;
    }

    // Draft resume (first visit this session): land on the furthest
    // incomplete step. In-flow step changes must not re-redirect (N3).
    if (!visitedCodes.has(code)) {
      visitedCodes.add(code);
      if (draft && draft.step > stepNum) {
        setPhase("redirect");
        router.replace(withLocale(`/practice/${code}/${draft.step}`, effLocale.code));
        return;
      }
    }

    // Wallet precondition + pre-fill resolution inside the 500 ms budget.
    let finished = false;
    const resolve = (async () => {
      const walletTypes = new Set(await listDocumentTypes());
      const missing = requiredDocuments(code).filter((doc) => !walletTypes.has(doc));
      if (missing.length > 0) {
        // S6 shows the docs-first CTA (D3 S6 CTA rule 1).
        return { block: true as const };
      }

      const filled: Record<string, string> = {};
      const sources: Partial<Record<FieldId, "wallet" | "answers">> = {};
      const base = valuesRef.current;
      for (const [field, docCode] of Object.entries(SOURCE_DOC) as [FieldId, string][]) {
        if ((base[field] ?? "").trim() !== "") continue;
        // Pre-fill ONLY from sample documents: a user-supplied image is
        // never read, no OCR, ever (P3, hard constraint).
        const doc = walletTypes.has(docCode) ? await getDocument(docCode) : undefined;
        if (!doc?.isSample) continue;
        const sample = DOC_SAMPLE_PREFILL[docCode]?.[field];
        if (typeof sample === "string" && sample.trim() !== "") {
          filled[field] = sample;
          sources[field] = "wallet";
        }
      }
      if ((base.relationship ?? "").trim() === "") {
        const recorded = recordedValue(record.answers, "relationship");
        const mapped = recorded ? mapAnswerValue(recorded) : null;
        if (mapped) {
          filled.relationship = mapped;
          sources.relationship = "answers";
        }
      }
      return { block: false as const, filled, sources };
    })();

    const budget = new Promise<"timeout">((resolveTimeout) => {
      setTimeout(() => resolveTimeout("timeout"), PREFILL_BUDGET_MS);
    });

    Promise.race([resolve, budget]).then((result) => {
      if (finished) return;
      finished = true;
      if (result === "timeout") {
        // Unresolved in time: fields render empty, no error (D3 S8
        // Loading). A late resolve below is ignored.
        setPhase("ready");
        return;
      }
      if (result.block) {
        setPhase("redirect");
        router.replace(withLocale(`/task/${code}`, effLocale.code));
        return;
      }
      // Merge only into still-empty fields so late resolution can never
      // clobber typing that happened inside the budget window.
      if (Object.keys(result.filled).length > 0) {
        const merged = { ...valuesRef.current };
        const applied: Partial<Record<FieldId, "wallet" | "answers">> = {};
        for (const field of Object.keys(result.filled)) {
          if ((merged[field] ?? "").trim() === "") {
            merged[field] = result.filled[field];
            applied[field as FieldId] = result.sources[field as FieldId];
          }
        }
        writeValues(merged);
        setPrefill(applied);
      }
      setPhase("ready");
    });

    return () => {
      finished = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  /* ---------------------------------------------------------------- */
  /* per-step entry: focus the first field, announce the step (D6 6.2) */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (phase !== "ready" || isDoneRoute || !isFormStep(stepKey)) return;
    // A task that completed elsewhere (or a post-submit Back) must
    // never re-enter the form: replay returns the stored ack (P2-7).
    const record = getJourneySnapshot();
    const task = record?.tasks.find((candidate) => candidate.code === code);
    if (task?.status === "done") {
      router.replace(
        withLocale(task.ackNumber ? `/practice/${code}/done` : `/task/${code}`, locale.code),
      );
      return;
    }
    // Initial focus is the step's first field, by its stable id (D6 6.1).
    const firstField = stepNum === STEP_COUNT ? REVIEW_GROUPS[0].fields[0] : STEP_FIELDS[stepNum - 1][0];
    const frame = requestAnimationFrame(() => {
      document.getElementById(focusTargetId(firstField))?.focus();
    });
    announce(
      `${t(locale, "s8.stepOf", { s: Number(stepKey) })}. ${t(locale, stepTitleKey(Number(stepKey)))}`,
    );
    return () => cancelAnimationFrame(frame);
  }, [phase, stepKey, stepNum, isDoneRoute, code, locale, router]);

  /* ---------------------------------------------------------------- */
  /* unmount: last keystrokes are autosaved, the mic pipe is closed    */
  /* ---------------------------------------------------------------- */

  useEffect(
    () => () => {
      captureRef.current?.abort();
      captureRef.current = null;
      // After submit or discard the draft is intentionally gone; the
      // unmount save must not resurrect it (P2-7: one ack per draft).
      if (!flowEndedRef.current && !submittingRef.current) saveNow();
    },
    [saveNow],
  );

  /* ---------------------------------------------------------------- */
  /* submitting window: determinate progress, non-cancellable          */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!submitting) return;
    const tick = setInterval(() => {
      setProgress((current) => (current >= 100 ? 100 : Math.min(current + 4, 90)));
    }, NON_CANCELLABLE_WINDOW_MS / 24);
    return () => clearInterval(tick);
  }, [submitting]);

  /* E-16 is a blocking error: announced assertively, on transition
     only, exactly like the capture screens (D6 6.2). */
  const e16Active = matchesRealId(values.theirId ?? "");
  useEffect(() => {
    if (e16Active) announce(t(locale, "s8.errorE16"), true);
  }, [e16Active, locale]);

  /* ---------------------------------------------------------------- */
  /* field change / blur                                               */
  /* ---------------------------------------------------------------- */

  const syncE16 = useCallback(
    (value: string) => {
      if (matchesRealId(value.trim())) {
        setFieldError("theirId", "s8.errorE16");
      } else if (errorsRef.current.theirId === "s8.errorE16") {
        // Cleared when the pattern is removed; never sanitise (P6).
        setFieldError("theirId", null);
      }
    },
    [setFieldError],
  );

  /** A shown error clears the moment the field's value becomes valid. */
  const clearErrorIfValid = useCallback(
    (id: FieldId, value: string, next: Record<string, string>) => {
      if (id === "theirId") return; // E-16 clears only via syncE16 (P6)
      if (errorsRef.current[id] && !validateField(id, value, next)) {
        setFieldError(id, null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setFieldError is a stable zero-dep callback
    [],
  );

  const changeFieldValue = useCallback(
    (id: FieldId, value: string) => {
      const next = { ...valuesRef.current, [id]: value };
      writeValues(next);
      markEdited(id);
      if (id === "theirId") {
        syncE16(value);
        return;
      }
      clearErrorIfValid(id, value, next);
    },
    [clearErrorIfValid, markEdited, syncE16, writeValues],
  );

  const blurFieldValue = useCallback(
    (id: FieldId) => {
      const key = validateField(id, valuesRef.current[id] ?? "", valuesRef.current);
      setFieldError(id, key);
      saveNow(); // autosave on every blur (P4)
    },
    [saveNow, setFieldError],
  );

  /* ---------------------------------------------------------------- */
  /* per-field dictation over the shared speech wrapper                */
  /* ---------------------------------------------------------------- */

  const stopDictation = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;
    dictationRef.current = null;
    setListeningField(null);
  }, []);

  const joinDictated = (base: string, text: string) => (base ? `${base} ${text}` : text);

  const voiceErrorText = useCallback(
    (error: CaptureError): string | null => {
      switch (error) {
        case "denied":
          return t(locale, "s8.voiceDenied"); // E-05 mapping
        case "empty":
          return t(locale, "s8.voiceEmpty"); // E-02
        case "failed":
        case "unavailable":
          return t(locale, "s8.voiceFailed"); // E-04
        case "interrupted":
          return null; // E-07: the partial is kept, silence is honest
      }
    },
    [locale],
  );

  const startDictation = useCallback(
    (id: FieldId) => {
      if (dictationRef.current) stopDictation();
      setVoiceNote(null);
      const capture = new SpeechCapture();
      captureRef.current = capture;
      dictationRef.current = { field: id, base: (valuesRef.current[id] ?? "").trim() };
      setListeningField(id);
      capture.start(locale.code, {
        onPartial: (text) => {
          const active = dictationRef.current;
          if (!active) return;
          writeValues({ ...valuesRef.current, [active.field]: joinDictated(active.base, text) });
        },
        onFinal: (text) => {
          const active = dictationRef.current;
          if (!active || text === "") return;
          active.base = joinDictated(active.base, text);
          const next = { ...valuesRef.current, [active.field]: active.base };
          writeValues(next);
          markEdited(active.field);
          if (active.field === "theirId") syncE16(active.base);
          else clearErrorIfValid(active.field, active.base, next);
        },
        onError: (error) => {
          const note = voiceErrorText(error);
          if (note) setVoiceNote({ field: id, text: note });
        },
        onEnd: () => {
          captureRef.current = null;
          dictationRef.current = null;
          setListeningField(null);
        },
      });
    },
    [clearErrorIfValid, locale.code, markEdited, stopDictation, syncE16, voiceErrorText, writeValues],
  );

  /* ---------------------------------------------------------------- */
  /* navigation: Next, Back, Submit, Cancel                            */
  /* ---------------------------------------------------------------- */

  const micDisabled = submitting || !online || !speechSupported;
  const micReason = !online
    ? t(locale, "error.O01")
    : !speechSupported
      ? t(locale, "s8.voiceUnavailable")
      : null;

  const failStep = (invalid: readonly { id: FieldId; key: ErrKey }[]) => {
    const nextErrors: Partial<Record<FieldId, ErrKey>> = {};
    for (const item of invalid) nextErrors[item.id] = item.key;
    errorsRef.current = nextErrors;
    setErrors(nextErrors);
    setSummary(invalid.map((item) => item.id));
    // D6 6.2: the summary announces through its role="alert" render;
    // focus then lands on the first offending field.
    const first = invalid[0].id;
    requestAnimationFrame(() => {
      document.getElementById(focusTargetId(first))?.focus();
    });
  };

  const collectInvalid = (fields: readonly FieldId[]) => {
    const invalid: { id: FieldId; key: ErrKey }[] = [];
    for (const id of fields) {
      const key = validateField(id, valuesRef.current[id] ?? "", valuesRef.current);
      if (key) invalid.push({ id, key });
    }
    return invalid;
  };

  const onNext = () => {
    if (submitting || !isFormStep(stepKey)) return;
    stopDictation();
    const fields = STEP_FIELDS[stepNum - 1];
    const invalid = collectInvalid(fields);
    if (invalid.length > 0) {
      failStep(invalid);
      return;
    }
    errorsRef.current = {};
    setErrors({});
    setSummary(null);
    furthestRef.current = stepNum + 1;
    saveNow(); // autosave on Next (P4); the draft step follows the user
    router.push(withLocale(`/practice/${code}/${stepNum + 1}`, locale.code));
  };

  const onBack = () => {
    if (submitting || !isFormStep(stepKey)) return;
    stopDictation();
    if (stepNum === 1) {
      // From step 1, Back is S6, with the draft saved (D3 S8).
      saveNow();
      router.push(withLocale(`/task/${code}`, locale.code));
      return;
    }
    router.push(withLocale(`/practice/${code}/${stepNum - 1}`, locale.code));
  };

  const onSubmit = async () => {
    if (submittingRef.current || !isFormStep(stepKey)) return;
    stopDictation();
    const invalid = collectInvalid(ALL_FIELDS); // submit precondition: every step valid
    if (invalid.length > 0) {
      failStep(invalid);
      return;
    }
    errorsRef.current = {};
    setErrors({});
    setSummary(null);
    saveNow();
    submittingRef.current = true; // single fire: repeat taps no-op (P2-7)
    setSubmitting(true);
    setProgress(4);

    try {
      const record = getJourneySnapshot();
      const task = record?.tasks.find((candidate) => candidate.code === code);
      // Exactly one ack per draft: reuse, never regenerate (P2-7).
      const ack = task?.ackNumber ?? makeAckNumber();
      const art = await generatePracticeCertificate(ack, docTypeName("DOC-DEATH"));
      await putDocument({
        docType: "DOC-DEATH",
        blob: art.blob,
        thumbnail: art.thumbnail,
        isSample: true,
        label: null,
        addedAt: new Date().toISOString(),
      });
      updateJourney((draft) => {
        // Upsert: a task absent from the record (a hand-crafted T-LOCAL)
        // is created done rather than silently skipping the completion
        // the user just earned.
        const target = draft.tasks.find((candidate) => candidate.code === code);
        if (target) {
          target.status = "done";
          target.ackNumber = ack;
          target.completedAt = new Date().toISOString();
        } else {
          draft.tasks.push({
            code,
            status: "done",
            ackNumber: ack,
            lockReason: null,
            archived: false,
            completedAt: new Date().toISOString(),
          });
        }
        delete draft.drafts[code];
      });
      flowEndedRef.current = true; // the unmount save must not resurrect the draft
      editedFields.delete(code); // a fresh run starts with clean badges
      setSubmitting(false); // the done route takes over; stop the ticker
      setProgress(100);
      router.replace(withLocale(`/practice/${code}/done`, locale.code));
    } catch {
      // Local writes failing (canvas or wallet quota) release the window
      // honestly; the draft stands and nothing was sent anywhere.
      submittingRef.current = false;
      setSubmitting(false);
      setProgress(0);
      setVoiceNote({ field: "yourPhone", text: t(locale, "s8.storageError") });
    }
  };

  const onDiscard = () => {
    flowEndedRef.current = true;
    editedFields.delete(code);
    setSheetOpen(false);
    updateJourney((draft) => {
      delete draft.drafts[code];
      const task = draft.tasks.find((candidate) => candidate.code === code);
      if (task && task.status === "inProgress") task.status = "doNow"; // chip cleared
    });
    router.push(withLocale(`/task/${code}`, locale.code));
  };

  /* ---------------------------------------------------------------- */
  /* render                                                            */
  /* ---------------------------------------------------------------- */

  const helperFor = (id: FieldId): string =>
    id === "dateOfDeath"
      ? t(locale, "s8.v.dateExample", { example: dateExampleFromFormat(locale.dateFormat) })
      : t(locale, FIELD_DEFS[id].whyKey);

  const errorTextFor = (id: FieldId): string | undefined => {
    const key = errors[id];
    return key ? t(locale, key) : undefined;
  };

  const describedByFor = (id: FieldId): string | undefined => {
    const fieldId = `f-${id}`;
    if (errors[id]) return errorId(fieldId);
    return helperId(fieldId);
  };

  const prefillBadge = (id: FieldId) => {
    const source = prefill[id];
    if (!source || isEdited(id)) return null; // edits win, badges never return
    return (
      <span className={styles.prefill}>
        {t(locale, source === "wallet" ? "s8.prefillWallet" : "s8.prefillAnswers")}
      </span>
    );
  };

  const renderTextualField = (id: FieldId) => {
    const def = FIELD_DEFS[id];
    const fieldId = `f-${id}`;
    const error = errorTextFor(id);
    const counter = def.counter
      ? { value: (values[id] ?? "").length, max: def.counter.max, showAt: def.counter.showAt }
      : undefined;
    return (
      <div className={styles.fieldBlock}>
        <Field id={fieldId} label={t(locale, def.labelKey)} helper={helperFor(id)} error={error} counter={counter}>
          {def.kind === "multiline" ? (
            <textarea
              id={fieldId}
              className={`${styles.control} ${styles.textarea}`}
              value={values[id] ?? ""}
              onChange={(event) => changeFieldValue(id, event.target.value)}
              onBlur={() => blurFieldValue(id)}
              disabled={submitting}
              rows={3}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={describedByFor(id)}
            />
          ) : (
            <input
              id={fieldId}
              type={def.kind === "tel" ? "tel" : def.kind === "number" ? "number" : def.kind === "date" ? "date" : "text"}
              inputMode={def.kind === "number" || def.kind === "tel" ? "numeric" : undefined}
              className={styles.control}
              value={values[id] ?? ""}
              onChange={(event) => changeFieldValue(id, event.target.value)}
              onBlur={() => blurFieldValue(id)}
              disabled={submitting}
              min={def.kind === "number" ? 0 : undefined}
              max={def.kind === "number" ? 120 : undefined}
              step={def.kind === "number" ? 1 : undefined}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={describedByFor(id)}
            />
          )}
        </Field>
        {id === "dateOfDeath" && isDateOld(values[id] ?? "") ? (
          /* Non-blocking guidance: older than a year does not stop the
             step, it explains the real-world route (Appendix A). */
          <p className={styles.guidance}>{t(locale, "s8.v.dateOld")}</p>
        ) : null}
        {prefillBadge(id)}
        {def.dictatable ? (
          <>
            <VoiceMic
              listening={listeningField === id}
              disabled={micDisabled}
              reason={micReason}
              idleLabel={t(locale, "s8.voiceLabel")}
              stopLabel={t(locale, "s8.voiceStop")}
              onStart={() => startDictation(id)}
              onStop={stopDictation}
            />
            {voiceNote?.field === id ? <InlineNote tone="warn">{voiceNote.text}</InlineNote> : null}
          </>
        ) : null}
      </div>
    );
  };

  const optionsFor = (id: "sex" | "placeKind", defs: typeof SEX_OPTIONS | typeof PLACE_OPTIONS): OptionItem[] =>
    defs.map((option) => ({ value: option.value, label: t(locale, option.labelKey) }));

  const renderRadioField = (id: "sex" | "placeKind", defs: typeof SEX_OPTIONS | typeof PLACE_OPTIONS) => {
    const error = errorTextFor(id);
    return (
      <OptionGroup
        id={id}
        legend={t(locale, FIELD_DEFS[id].labelKey)}
        helper={helperFor(id)}
        error={error}
        options={optionsFor(id, defs)}
        value={values[id] ?? ""}
        disabled={submitting}
        onChange={(value) => {
          changeFieldValue(id, value);
          // A selection is also a blur of the group for validation.
          const key = validateField(id, value, { ...valuesRef.current, [id]: value });
          setFieldError(id, key);
        }}
        onBlur={() => blurFieldValue(id)}
      />
    );
  };

  const renderSelectField = (
    id: "district" | "relationship",
    options: readonly OptionItem[],
    placeholderKey: "s8.districtPlaceholder" | "s8.relationshipPlaceholder",
  ) => {
    const fieldId = `f-${id}`;
    const error = errorTextFor(id);
    const saved = values[id] ?? "";
    const list =
      id === "district" && saved.trim() !== "" && !options.some((option) => option.value === saved)
        ? [{ value: saved, label: saved }, ...options]
        : options;
    return (
      <div className={styles.fieldBlock}>
        <Field id={fieldId} label={t(locale, FIELD_DEFS[id].labelKey)} helper={helperFor(id)} error={error}>
          {/* No default selection: the placeholder option is the initial
              state and cannot be re-chosen once a district is picked. */}
          <select
            id={fieldId}
            className={styles.control}
            value={saved}
            onChange={(event) => {
              changeFieldValue(id, event.target.value);
              const key = validateField(id, event.target.value, {
                ...valuesRef.current,
                [id]: event.target.value,
              });
              setFieldError(id, key);
            }}
            onBlur={() => blurFieldValue(id)}
            disabled={submitting}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedByFor(id)}
          >
            <option value="" disabled>
              {t(locale, placeholderKey)}
            </option>
            {list.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        {prefillBadge(id)}
      </div>
    );
  };

  const renderField = (id: FieldId) => {
    switch (id) {
      case "sex":
        return renderRadioField("sex", SEX_OPTIONS);
      case "placeKind":
        return renderRadioField("placeKind", PLACE_OPTIONS);
      case "district":
        return renderSelectField(
          "district",
          districtsForState(journey?.state ?? null).map((name) => ({ value: name, label: name })),
          "s8.districtPlaceholder",
        );
      case "relationship":
        return renderSelectField(
          "relationship",
          RELATIONSHIP_OPTIONS.map((option) => ({
            value: option.value,
            label: t(locale, option.labelKey),
          })),
          "s8.relationshipPlaceholder",
        );
      default:
        return renderTextualField(id);
    }
  };

  const summaryCount = summary?.length ?? 0;

  const renderStepBody = () => {
    if (!isFormStep(stepKey)) return null;
    if (stepNum === STEP_COUNT) {
      // Review: every field grouped by its step heading, rendered in
      // place with the same editable controls (Appendix A step 4).
      return REVIEW_GROUPS.map((group) => (
        <section key={group.step} className={styles.reviewGroup}>
          <h2 className={styles.groupTitle}>{t(locale, stepTitleKey(group.step))}</h2>
          {group.fields.map((id) => renderField(id))}
        </section>
      ));
    }
    return STEP_FIELDS[stepNum - 1].map((id) => renderField(id));
  };

  if (isDoneRoute) {
    return <DoneResult code={code} />;
  }

  return (
    <>
      <SkipLink locale={locale} />
      <DisclosureBanner locale={locale} />
      {/* The loud honesty surface, full-bleed under the disclosure
          banner; nothing scrolls over it (D10 10.8, D12 §4). */}
      <MockBanner>{t(locale, "s8.mockBanner")}</MockBanner>

      <div className="shell">
        <main id="main" className={styles.main} aria-busy={phase !== "ready"}>
          {phase !== "ready" ? (
            /* Loading: skeleton fields in the shape of the step. */
            <div className={styles.loading}>
              <div className={`skeleton ${styles.skLine}`} />
              <div className={`skeleton ${styles.skField}`} />
              <div className={`skeleton ${styles.skField}`} />
              <div className={`skeleton ${styles.skField}`} />
            </div>
          ) : (
            <>
              <p className={styles.stepOf}>{t(locale, "s8.stepOf", { s: stepNum })}</p>
              <h1 className={styles.heading}>{t(locale, stepTitleKey(stepNum))}</h1>

              {summary && summaryCount > 0 ? (
                <section className={styles.summary} role="alert">
                  <h2 className={styles.summaryHeading}>
                    {summaryCount === 1
                      ? t(locale, "s8.errorSummaryOne")
                      : t(locale, "s8.errorSummary", { count: summaryCount })}
                  </h2>
                  <ul className={styles.summaryList}>
                    {summary.map((id) => (
                      <li key={id}>
                        <a
                          href={`#${focusTargetId(id)}`}
                          className={styles.summaryLink}
                          onClick={(event) => {
                            event.preventDefault();
                            document.getElementById(focusTargetId(id))?.focus();
                          }}
                        >
                          {t(locale, FIELD_DEFS[id].labelKey)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <div className={styles.form}>{renderStepBody()}</div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={`pressable ${styles.secondary}`}
                  onClick={onBack}
                  disabled={submitting}
                >
                  {t(locale, "s8.back")}
                </button>
                {stepNum < STEP_COUNT ? (
                  <button
                    type="button"
                    className={`pressable ${styles.primary}`}
                    onClick={onNext}
                    disabled={submitting}
                  >
                    {t(locale, "s8.next")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`pressable ${styles.primary}`}
                    onClick={() => void onSubmit()}
                    disabled={submitting}
                  >
                    {t(locale, "s8.submit")}
                  </button>
                )}
                {/* N4: Cancel lives only on this screen. */}
                <button
                  type="button"
                  className={styles.tertiary}
                  onClick={() => setSheetOpen(true)}
                  disabled={submitting}
                >
                  {t(locale, "s8.cancel")}
                </button>
              </div>

              {submitting ? (
                /* Disabled row: determinate, non-cancellable, < 3 s. */
                <div className={styles.progressWrap} role="status">
                  <p className={styles.progressLabel}>{t(locale, "s8.submitting")}</p>
                  <div
                    className={styles.progressTrack}
                    role="progressbar"
                    aria-label={t(locale, "s8.submitting")}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : null}
            </>
          )}
        </main>

        <GlobalFooter locale={locale} />
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t(locale, "s8.cancelTitle")}
        closeLabel={t(locale, "s8.cancel")}
      >
        <div className={styles.sheetActions}>
          <button
            type="button"
            className={`pressable ${styles.primary}`}
            onClick={() => setSheetOpen(false)}
          >
            {t(locale, "s8.cancelKeep")}
          </button>
          <button type="button" className={`pressable ${styles.secondary}`} onClick={onDiscard}>
            {t(locale, "s8.cancelDiscard")}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
