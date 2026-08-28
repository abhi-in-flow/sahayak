"use client";

import { useState, useSyncExternalStore } from "react";
import styles from "./PhoneAction.module.css";

/**
 * Tap-to-call with the non-telephony fallback (D3 S10 Disabled row,
 * D12 4 S10).
 *
 * On a telephony context this is a plain tel: link. On a non-telephony
 * context the number renders as text with a Copy affordance and a
 * "Copied" confirmation. The heuristic runs ONCE per page load (D12 4):
 * a coarse pointer or any touch points means a phone; a mouse-only
 * desktop does not dial.
 *
 * Detection is read with useSyncExternalStore (the OfflineChip
 * pattern): the server snapshot is always telephony, so the SSR output
 * is the tel: link and a desktop correction happens after hydration
 * with no mismatch and no setState-in-effect.
 *
 * Takes pre-interpolated plain strings, never the locale object (the
 * Client Component serialisation rule in app/_lib/i18n).
 */

let detected: boolean | null = null;

function computeTelephony(): boolean {
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const touch = (navigator.maxTouchPoints ?? 0) > 0;
  return coarse || touch;
}

/** A device does not become a phone mid-session: the subscribe side
 *  never fires, the cached snapshot is simply stable. */
const subscribe = () => () => {};

function getSnapshot(): boolean {
  if (detected === null) detected = computeTelephony();
  return detected;
}

const getServerSnapshot = () => true;

/** execCommand fallback for contexts where the async clipboard API is
 *  unavailable (older WebViews, insecure origins). */
function legacyCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

interface Props {
  /** Raw digits from offices.ts; also the clipboard payload. */
  number: string;
  /** s10.call with {number} already interpolated. */
  callLabel: string;
  /** s10.copy. */
  copyLabel: string;
  /** s10.copied. */
  copiedLabel: string;
}

export function PhoneAction({ number, callLabel, copyLabel, copiedLabel }: Props) {
  const telephony = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [copied, setCopied] = useState(false);

  if (telephony) {
    return (
      <a className={`${styles.call} pressable`} href={`tel:${number}`}>
        {callLabel}
      </a>
    );
  }

  async function copy() {
    // "Copied" is only claimed when a copy actually happened; on total
    // failure the number stays on screen as text, which is itself the
    // honest fallback.
    let ok = false;
    try {
      await navigator.clipboard.writeText(number);
      ok = true;
    } catch {
      ok = legacyCopy(number);
    }
    if (ok) setCopied(true);
  }

  return (
    <span className={styles.nonTelephony}>
      <span className={styles.number}>{number}</span>
      <button type="button" className={`${styles.copy} pressable`} onClick={copy}>
        {copyLabel}
      </button>
      {copied ? (
        <span className={styles.copied} role="status">
          {copiedLabel}
        </span>
      ) : null}
    </span>
  );
}
