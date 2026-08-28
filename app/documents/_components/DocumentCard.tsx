"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";
import type { LocaleDefinition } from "@/app/_lib/i18n";
import { t } from "@/app/_lib/i18n";
import { Field, errorId, helperId } from "@/app/_components/Field";
import { InlineNote } from "@/app/_components/InlineNote";
import { announce } from "@/app/_lib/announce";
import { matchesRealId } from "@/app/_lib/realId";
import { getDocument, putDocument, type WalletDocument } from "@/app/_lib/storage/wallet";
import { canvasToJpeg, generateSampleDocument, processImage } from "./image";
import { useObjectUrl } from "./objectUrl";
import {
  beginUpload,
  cancelUpload,
  getUploadState,
  subscribeUploads,
  UploadAborted,
  type AddMethod,
  type UploadController,
} from "./uploads";
import styles from "./DocumentCard.module.css";

const LABEL_MAX = 60;
const LABEL_COUNTER_AT = 45;

/* ------------------------------------------------------------------ */
/* local status chip (D12 §4 S7: not StatusChip, different semantics)  */
/* ------------------------------------------------------------------ */

export type ChipKind = "have" | "need" | "sample" | "failed";

export function chipKindFor(record: WalletDocument | null, failed: boolean): ChipKind {
  if (failed) return "failed";
  if (!record) return "need";
  return record.isSample ? "sample" : "have";
}

/** A6 channels: text + distinct icon silhouette + tint, never colour alone. */
export function DocumentChip({
  kind,
  locale,
}: {
  kind: ChipKind;
  locale: LocaleDefinition;
}) {
  const label =
    kind === "have"
      ? t(locale, "s7.chipHave")
      : kind === "sample"
        ? t(locale, "s7.chipSample")
        : kind === "failed"
          ? t(locale, "s7.failedChip")
          : t(locale, "s7.chipNeed");
  const variant =
    kind === "have"
      ? styles.chipHave
      : kind === "sample"
        ? styles.chipSample
        : kind === "failed"
          ? styles.chipFailed
          : styles.chipNeed;
  return (
    <span className={`${styles.chip} ${variant}`}>
      <svg viewBox="0 0 16 16" className={styles.chipIcon} aria-hidden="true" focusable="false">
        {kind === "have" ? (
          <path
            d="M3.5 8.5l3 3 6-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {kind === "need" ? (
          <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2.5" />
        ) : null}
        {kind === "sample" ? (
          <path
            d="M8 2.8L14 13H2Z M8 7v3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {kind === "failed" ? (
          <path
            d="M4.5 4.5l7 7M11.5 4.5l-7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        ) : null}
      </svg>
      <span>{label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* the card                                                            */
/* ------------------------------------------------------------------ */

export interface DocumentCardProps {
  locale: LocaleDefinition;
  docType: string;
  /** Localized document name. */
  name: string;
  /** Localized names of the non-archived tasks consuming this document. */
  consumers: string[];
  /** The stored record, or null while the document is only required. */
  record: WalletDocument | null;
  /** This card's remove-confirm sheet is open: controls go inert. */
  removePending: boolean;
  /** `focus` deep link (entry e): open the add area and focus its control. */
  openAddOnMount: boolean;
  onAddSuccess: (docType: string) => void;
  onQuotaExceeded: () => void;
  onAskRemove: (docType: string) => void;
  onOpenPreview: (docType: string) => void;
}

export function DocumentCard({
  locale,
  docType,
  name,
  consumers,
  record,
  removePending,
  openAddOnMount,
  onAddSuccess,
  onQuotaExceeded,
  onAskRemove,
  onOpenPreview,
}: DocumentCardProps) {
  const upload = useSyncExternalStore(
    subscribeUploads,
    () => getUploadState(docType),
    () => undefined,
  );
  const running = upload?.status === "running";
  const failed = upload?.status === "failed";
  const chip = chipKindFor(record, failed);

  const [addOpen, setAddOpen] = useState(openAddOnMount);
  const [cameraOn, setCameraOn] = useState(false);
  const [showE15, setShowE15] = useState(false);
  const [labelDraft, setLabelDraft] = useState(record?.label ?? "");
  const [labelInvalid, setLabelInvalid] = useState(false);

  const mounted = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const addToggleRef = useRef<HTMLButtonElement | null>(null);
  const lastMethod = useRef<AddMethod>("sample");
  const announcedE16 = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Entry (e) per D6 §6.1: the target document's Add control receives
  // focus (which scrolls it into view) on mount.
  useEffect(() => {
    if (openAddOnMount) addToggleRef.current?.focus();
  }, [openAddOnMount]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  // The preview stream is never part of the N2 registry: navigating away
  // stops the camera; only the processing upload survives.
  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (cameraOn && video && stream) {
      video.srcObject = stream;
      void video.play().catch(() => {});
    }
  }, [cameraOn]);

  /* ---- the pipeline, always through the N2 registry ---------------- */

  const runAdd = useCallback(
    (method: AddMethod, produce: (controller: UploadController) => Promise<{ blob: Blob; thumbnail: Blob }>) => {
      lastMethod.current = method;
      beginUpload(
        docType,
        method,
        async (controller) => {
          const processed = await produce(controller);
          controller.report(0.9);
          controller.checkpoint();
          try {
            const existing = await getDocument(docType);
            await putDocument({
              docType,
              blob: processed.blob,
              thumbnail: processed.thumbnail,
              // A replace keeps the user's label; a first add starts clean.
              label: existing?.label ?? null,
              // Only the generated watermarked canvas is a sample; any
              // user-supplied image replaces it as a real document.
              isSample: method === "sample",
              addedAt: new Date().toISOString(),
            });
          } catch {
            // A rejected write is storage pressure (E-17): the page
            // explains and offers the removal list, never silent. No
            // failed chip: the data never half-landed.
            if (mounted.current) onQuotaExceeded();
            throw new UploadAborted();
          }
        },
        (outcome) => {
          if (!mounted.current) return;
          if (outcome === "added") {
            // D6 §6.2: focus lands on the new card after the add. The
            // card container (not a transient control) so the focus
            // survives the wallet reload that swaps the card's body.
            cardRef.current?.focus();
            onAddSuccess(docType);
          } else if (outcome === "quota") {
            onQuotaExceeded();
          } else if (outcome === "failed") {
            // E-14 inline note (polite; the failed chip + Try again
            // carry the state visually).
            announce(t(locale, "s7.errorE14"));
          }
        },
      );
    },
    [docType, locale, onAddSuccess, onQuotaExceeded],
  );

  /* ---- add paths ---------------------------------------------------- */

  const startCamera = useCallback(async () => {
    setShowE15(false);
    try {
      // Environment camera: photographing a paper document.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      // E-15. Permission denial and no-camera land on the same honest
      // copy; gallery and sample stay offered either way (D5).
      setShowE15(true);
    }
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    stopCamera();
    runAdd("camera", (controller) => canvasToJpeg(canvas).then((blob) => processImage(blob, controller)));
  }, [runAdd, stopCamera]);

  const onGalleryFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset so picking the same file again re-fires change.
      event.target.value = "";
      if (!file) return;
      runAdd("gallery", (controller) => processImage(file, controller));
    },
    [runAdd],
  );

  const addSample = useCallback(() => {
    runAdd("sample", (controller) =>
      generateSampleDocument(name, t(locale, "s7.watermark"), controller),
    );
  }, [locale, name, runAdd]);

  const retry = useCallback(() => {
    const method = upload?.status === "failed" ? upload.method : lastMethod.current;
    if (method === "gallery") fileRef.current?.click();
    else if (method === "camera") void startCamera();
    else addSample();
  }, [addSample, startCamera, upload]);

  /* ---- optional label (E-16 hard block at entry) --------------------- */

  const onLabelChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value.slice(0, LABEL_MAX);
    const invalid = matchesRealId(next);
    if (invalid && !announcedE16.current) {
      // E-16 is a blocking error: assertive, once per entry into the
      // invalid state (D6 §6.2); never blocks typing, never stored.
      announcedE16.current = true;
      announce(t(locale, "s7.errorE16"), true);
    }
    if (!invalid) announcedE16.current = false;
    setLabelInvalid(invalid);
    setLabelDraft(next);
  };

  const saveLabel = useCallback(async () => {
    if (labelInvalid || !record) return;
    const trimmed = labelDraft.trim();
    if (trimmed === (record.label ?? "")) return;
    // Read the existing record, replace the label only (D12 §4 S7).
    const existing = await getDocument(docType);
    if (!existing) return;
    await putDocument({ ...existing, label: trimmed === "" ? null : trimmed });
  }, [docType, labelDraft, labelInvalid, record]);

  /* ---- render --------------------------------------------------------- */

  const thumbUrl = useObjectUrl(record?.thumbnail ?? record?.blob ?? null);
  const inert = running || removePending;
  const progress = upload?.status === "running" ? Math.round(upload.progress * 100) : 0;
  const usedBy = consumers.length > 0 ? t(locale, "s7.usedBy", { tasks: consumers.join(", ") }) : null;
  const labelFieldId = `s7-label-${docType}`;
  const preparingId = `s7-preparing-${docType}`;
  const addAreaId = `s7-add-area-${docType}`;

  return (
    <article ref={cardRef} className={styles.card} tabIndex={-1} aria-busy={running || undefined}>
      {/* Card tap: preview + used-by detail (D3 S7). Only a stored
          document has something to preview; a needed one is static. */}
      {record ? (
        <button
          type="button"
          className={`${styles.head} pressable`}
          onClick={() => onOpenPreview(docType)}
          disabled={inert}
        >
          {thumbUrl ? (
            /* Blob object URL from T-IDB: plain img, not next/image. */
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.thumb} src={thumbUrl} alt="" />
          ) : (
            <span className={styles.thumb} aria-hidden="true" />
          )}
          <span className={styles.headText}>
            <span className={styles.name}>{name}</span>
            <DocumentChip kind={chip} locale={locale} />
          </span>
        </button>
      ) : (
        <div className={styles.head}>
          <span className={styles.thumb} aria-hidden="true" />
          <span className={styles.headText}>
            <span className={styles.name}>{name}</span>
            <DocumentChip kind={chip} locale={locale} />
          </span>
        </div>
      )}

      {usedBy ? <p className={styles.usedBy}>{usedBy}</p> : null}

      {!record ? (
        <button
          type="button"
          ref={addToggleRef}
          className={`${styles.addToggle} pressable`}
          onClick={() => setAddOpen((open) => !open)}
          aria-expanded={addOpen}
          aria-controls={addAreaId}
          disabled={inert}
        >
          {t(locale, "s7.add")}
        </button>
      ) : null}

      {running ? (
        <div className={styles.progressRow}>
          <span id={preparingId} className={styles.progressLabel}>
            {t(locale, "s7.preparing")}
          </span>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-labelledby={preparingId}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          {/* Cancel is always available while an upload is in flight. */}
          <button type="button" className={styles.cancel} onClick={() => cancelUpload(docType)}>
            {t(locale, "s7.cancelUpload")}
          </button>
        </div>
      ) : null}

      {failed ? (
        <div className={styles.failedRow}>
          <InlineNote tone="error">{t(locale, "s7.errorE14")}</InlineNote>
          <button type="button" className={`${styles.actionButton} pressable`} onClick={retry}>
            {t(locale, "s7.retry")}
          </button>
        </div>
      ) : null}

      {addOpen && !record ? (
        <div id={addAreaId} className={styles.addArea}>
          {cameraOn ? (
            <>
              {/* Muted, playsInline, no audio track: a viewfinder, not media. */}
              <video className={styles.video} ref={videoRef} muted playsInline autoPlay />
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={`${styles.capture} pressable`}
                  onClick={capture}
                  disabled={inert}
                >
                  {t(locale, "s7.capture")}
                </button>
                <button type="button" className={styles.cancel} onClick={stopCamera}>
                  {t(locale, "s7.cancelUpload")}
                </button>
              </div>
            </>
          ) : (
            <div className={styles.actionRow}>
              <button
                type="button"
                className={`${styles.actionButton} pressable`}
                onClick={() => void startCamera()}
                disabled={inert}
              >
                {t(locale, "s7.addCamera")}
              </button>
              <button
                type="button"
                className={`${styles.actionButton} pressable`}
                onClick={() => fileRef.current?.click()}
                disabled={inert}
              >
                {t(locale, "s7.addGallery")}
              </button>
              <button
                type="button"
                className={`${styles.actionButton} pressable`}
                onClick={addSample}
                disabled={inert}
              >
                {t(locale, "s7.useSample")}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {showE15 ? (
        <InlineNote tone="warn">{t(locale, "s7.errorE15")}</InlineNote>
      ) : null}

      {record ? (
        <>
          <div className={styles.labelArea}>
            <Field
              id={labelFieldId}
              label={t(locale, "s7.labelLabel")}
              helper={t(locale, "s7.labelHelper")}
              error={labelInvalid ? t(locale, "s7.errorE16") : undefined}
              counter={{ value: labelDraft.length, max: LABEL_MAX, showAt: LABEL_COUNTER_AT }}
            >
              <input
                type="text"
                id={labelFieldId}
                className={styles.input}
                value={labelDraft}
                onChange={onLabelChange}
                onBlur={() => void saveLabel()}
                maxLength={LABEL_MAX}
                disabled={inert}
                aria-describedby={labelInvalid ? errorId(labelFieldId) : helperId(labelFieldId)}
              />
            </Field>
          </div>
          <button
            type="button"
            className={`${styles.remove} pressable`}
            onClick={() => onAskRemove(docType)}
            disabled={inert}
          >
            {t(locale, "s7.remove")}
          </button>
        </>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={onGalleryFile}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* C3/P3 mock-data notice, per card, persistent, never dismissible. */}
      <p className={styles.mockSmall}>{t(locale, "s7.mockNotice")}</p>
    </article>
  );
}
