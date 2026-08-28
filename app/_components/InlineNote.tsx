"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./InlineNote.module.css";

/**
 * Small inline note: hints, soft warnings, auto-clearing notices.
 * The auto-clear variants in D3/D5 (E-01 clears in 4 s, E-21 in 6 s)
 * pass autoClearMs; the note removes itself and reports it so the
 * caller can clear its state.
 *
 * This is not a toast system. Notes render in the content flow, next
 * to the thing they describe, and never float above it.
 */

export interface InlineNoteProps {
  tone?: "info" | "warn" | "error";
  autoClearMs?: number;
  onCleared?: () => void;
  children: ReactNode;
}

export function InlineNote({ tone = "info", autoClearMs, onCleared, children }: InlineNoteProps) {
  const [visible, setVisible] = useState(true);
  const [prevChildren, setPrevChildren] = useState(children);

  // Re-showing for new content is state adjustment during render, the
  // pattern React sanctions over an effect that immediately sets state.
  if (children !== prevChildren) {
    setPrevChildren(children);
    setVisible(true);
  }

  useEffect(() => {
    if (!autoClearMs || !visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onCleared?.();
    }, autoClearMs);
    return () => clearTimeout(timer);
    // onCleared is intentionally excluded: a changing callback must not
    // restart the clear window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoClearMs, visible]);

  if (!visible) return null;

  return (
    <p role="status" className={`${styles.note} ${styles[tone]}`}>
      {children}
    </p>
  );
}
