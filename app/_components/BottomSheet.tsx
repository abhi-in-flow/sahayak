"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./BottomSheet.module.css";

/**
 * Bottom sheet. D10 10.9: surface, 12px top radius, scrim, focus trapped.
 * Built on the native <dialog> element, which provides the focus trap and
 * the Escape handling.
 *
 * Hardware/browser back while the sheet is open dismisses the sheet; the
 * host screen is the history entry (D3 SH1 back navigation). A sentinel
 * history state is pushed on open so the back gesture lands here instead
 * of leaving the host screen.
 *
 * M-4 (D10 10.7): a single 250 ms enter transition, transform/opacity
 * only, collapsed to instant by the global reduced-motion rule.
 */

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Localized accessible name for the X control. */
  closeLabel: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, closeLabel, children }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;

    dialog.showModal();
    let dismissedByBack = false;

    const onPop = () => {
      dismissedByBack = true;
      onClose();
    };
    const onCancel = (e: Event) => {
      // Route Escape through React state so the cleanup below runs and
      // consumes the sentinel history entry.
      e.preventDefault();
      onClose();
    };
    const onClick = (e: MouseEvent) => {
      // Clicks on the backdrop land on the dialog element itself.
      if (e.target === dialog) onClose();
    };

    history.pushState({ sbnSheet: true }, "");
    window.addEventListener("popstate", onPop);
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("popstate", onPop);
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("click", onClick);
      if (!dismissedByBack && history.state?.sbnSheet) history.back();
      if (dialog.open) dialog.close();
    };
    // onClose is stable enough for every current caller; if it ever is
    // not, keep it out of this effect's re-run path deliberately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <dialog ref={ref} className={styles.sheet} aria-labelledby="sheet-title">
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 id="sheet-title" className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} aria-label={closeLabel} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
