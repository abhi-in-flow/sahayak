"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CircleAlert, Clock, Keyboard, Lock, Mic } from "lucide-react";
import { announce } from "@/app/_lib/announce";
import { BrandMark } from "./BrandMark";
import styles from "./FirstRunCarousel.module.css";

/**
 * Once-only first-run explainer: three user-paced scenes. The parent gate
 * mounts this instead of the page, so it is a plain full-viewport overlay
 * (the BrandSplash plane), not a dialog — no scrim, no focus trap, no role.
 *
 * Props-only: the caller owns persistence. Every exit routes through one
 * guarded finish(), so the history sentinel and a button tap can never
 * double-fire onDone.
 *
 * Motion (D10 10.7): the slide body swaps with M-2's 200ms directional
 * cross-fade, transform/opacity only — the scenes themselves are static
 * (DP-5) — and the global reduced-motion collapse flattens the swap. The
 * non-motion channels carry the transition instead: the new heading
 * receives focus and the position is announced politely (D6 6.2).
 */

export interface FirstRunCarouselStrings {
  skipLabel: string; // "Skip for now"
  nextLabel: string; // "Continue"
  backLabel: string; // "Back"
  dismissLabel: string; // "Got it"
  slideOf: string; // "Step {n} of {total}"
  scene1Title: string;
  scene1Body: string;
  scene2Title: string;
  scene2Body: string;
  scene3Title: string;
  scene3Body: string;
}

const TOTAL_SLIDES = 3;

/* Module-scoped, per-tab memory in OnboardFlow's lastEnteredStep idiom:
   the first render in a tab is a page load, not a slide change, so it
   must neither steal focus nor announce. */
let lastEnteredSlide: number | null = null;

/* ---- scenes ------------------------------------------------------------ */
/* Pictorial composites only (aria-hidden at the call site): the title
   and body under the panel carry all the meaning, so the art stays
   language-agnostic. Token fills, borders and lucide glyphs; nothing
   inside a scene moves. */

/* Scene 1: the character queued before a leaning stack of forms, the
   front one flagged with an error badge. */
function SceneBottleneck() {
  return (
    <div className={styles.sceneOne}>
      <div className={styles.queue}>
        <span className={styles.queueDot} />
        <span className={styles.queueDot} />
      </div>
      <div className={styles.figure}>
        <span className={styles.head} />
        <span className={styles.torso} />
      </div>
      <div className={styles.stack}>
        <div className={`${styles.formCard} ${styles.formCardBack}`}>
          <span className={styles.fieldLine} />
          <span className={styles.fieldLineShort} />
        </div>
        <div className={`${styles.formCard} ${styles.formCardFront}`}>
          <span className={styles.formError}>
            <CircleAlert size={14} strokeWidth={2.5} />
          </span>
          <span className={styles.fieldLine} />
          <span className={styles.fieldLineShort} />
        </div>
      </div>
    </div>
  );
}

/* Scene 2: voice out (static waveform bars), a reply back, and mic and
   keyboard side by side — the two-way, either-channel input. */
function SceneConversation() {
  return (
    <div className={styles.sceneTwo}>
      <div className={styles.talkRow}>
        <div className={styles.figure}>
          <span className={styles.head} />
          <span className={styles.torso} />
        </div>
        <div className={styles.bubble}>
          <span className={styles.waveBar} style={{ height: 12 }} />
          <span className={styles.waveBar} style={{ height: 24 }} />
          <span className={styles.waveBar} style={{ height: 32 }} />
          <span className={styles.waveBar} style={{ height: 18 }} />
          <span className={styles.waveBar} style={{ height: 26 }} />
        </div>
      </div>
      <div className={`${styles.bubble} ${styles.bubbleReply}`}>
        <span className={styles.replyLine} />
        <span className={styles.replyLineShort} />
      </div>
      <div className={styles.modeRow}>
        <span className={styles.micDisc}>
          <Mic size={24} strokeWidth={2} />
        </span>
        <span className={styles.typePill}>
          <Keyboard size={18} strokeWidth={2} />
        </span>
      </div>
    </div>
  );
}

/* Scene 3: a short exchange resolving into a plan card (now, locked,
   done rows) over a two-chip pipeline. */
function ScenePlan() {
  return (
    <div className={styles.sceneThree}>
      <div className={styles.chatPair}>
        <span className={styles.chatUser} />
        <span className={styles.chatApp} />
      </div>
      <div className={styles.taskCard}>
        <span className={`${styles.taskRow} ${styles.taskNow}`}>
          <ArrowRight size={18} strokeWidth={2} />
        </span>
        <span className={`${styles.taskRow} ${styles.taskLocked}`}>
          <Lock size={18} strokeWidth={2} />
        </span>
        <span className={`${styles.taskRow} ${styles.taskDone}`}>
          <Check size={18} strokeWidth={2.5} />
        </span>
      </div>
      <div className={styles.pipeline}>
        <span className={`${styles.pipeChip} ${styles.pipeNow}`}>
          <Clock size={16} strokeWidth={2} />
        </span>
        <span className={styles.pipeArrow}>
          <ArrowRight size={16} strokeWidth={2} />
        </span>
        <span className={`${styles.pipeChip} ${styles.pipeDone}`}>
          <Check size={16} strokeWidth={2.5} />
        </span>
      </div>
    </div>
  );
}

export function FirstRunCarousel({
  strings,
  onDone,
}: {
  strings: FirstRunCarouselStrings;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"fwd" | "back">("fwd");
  const doneRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const slides = [
    { title: strings.scene1Title, body: strings.scene1Body, art: <SceneBottleneck /> },
    { title: strings.scene2Title, body: strings.scene2Body, art: <SceneConversation /> },
    { title: strings.scene3Title, body: strings.scene3Body, art: <ScenePlan /> },
  ];
  const slide = slides[index];

  const slideOfLabel = strings.slideOf
    .replace("{n}", String(index + 1))
    .replace("{total}", String(TOTAL_SLIDES));

  /* Dismissal is idempotent: popstate and the buttons land here, and the
     parent unmounts this overlay on the first call. */
  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }

  /* History sentinel (BottomSheet's idiom): one entry is pushed on mount
     so the hardware/browser back gesture dismisses the carousel instead
     of leaving the page beneath it. Buttons consume the entry via
     back(), so the popstate handler is the single close path. Cleanup
     never touches history: a StrictMode remount's pending back() would
     otherwise pop the fresh sentinel and its popstate would dismiss the
     carousel before the first slide rendered. */
  useEffect(() => {
    lastEnteredSlide = null;
    if (history.state?.sbnFirstRun !== true) history.pushState({ sbnFirstRun: true }, "");
    const onPop = () => finish();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only sentinel; finish is guarded by doneRef
  }, []);

  /* Button exits (Skip, final CTA). The back() is what consumes the
     sentinel; the popstate it fires lands in finish(), so every exit —
     gesture and button alike — closes through exactly one path. */
  function dismiss() {
    if (doneRef.current) return;
    if (history.state?.sbnFirstRun === true) {
      history.back();
      return;
    }
    finish();
  }

  /* Focus and announcement ride user navigation only (D6 6.2): the first
     entry in a tab is a page load, so focus stays where the browser put
     it (OnboardFlow's lastEnteredStep idiom). */
  useEffect(() => {
    if (lastEnteredSlide === index) return;
    const previous = lastEnteredSlide;
    lastEnteredSlide = index;
    if (previous === null) return;
    const frame = requestAnimationFrame(() => {
      headingRef.current?.focus();
    });
    announce(`${slideOfLabel}. ${slide.title}`);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- strings are stable per locale render
  }, [index]);

  function goNext() {
    if (index === TOTAL_SLIDES - 1) {
      dismiss();
      return;
    }
    setDirection("fwd");
    setIndex(index + 1);
  }

  function goBack() {
    if (index === 0) return;
    setDirection("back");
    setIndex(index - 1);
  }

  const isLast = index === TOTAL_SLIDES - 1;

  return (
    <div className={styles.overlay}>
      <div className={styles.frame}>
        <div className={styles.topRow}>
          <BrandMark variant="icon" decorative size={40} />
          <button type="button" className={styles.skip} onClick={dismiss}>
            {strings.skipLabel}
          </button>
        </div>

        {/* Keyed by slide so the M-2 cross-fade runs; direction gives the
            slide its causality (your tap, your way). */}
        <div
          key={index}
          className={`${styles.slide} ${direction === "fwd" ? styles.slideIn : styles.slideBack}`}
        >
          <div className={styles.scenePanel} aria-hidden="true">
            {slide.art}
          </div>
          <h1 ref={headingRef} tabIndex={-1} className={styles.headline}>
            {slide.title}
          </h1>
          <p className={styles.body}>{slide.body}</p>
        </div>

        <div className={styles.progress}>
          <p className={styles.progressLabel}>{slideOfLabel}</p>
          {/* Segments are decorative (DP-4): the label above carries the
              state in words. ProgressStepper's pattern, not its import. */}
          <div className={styles.track} aria-hidden="true">
            {Array.from({ length: TOTAL_SLIDES }, (_, i) => {
              const position = i + 1;
              const scale = position <= index + 1 ? 1 : 0;
              return (
                <span key={position} className={styles.segment}>
                  <span className={styles.segmentFill} style={{ transform: `scaleX(${scale})` }} />
                </span>
              );
            })}
          </div>
        </div>

        <div className={styles.actions}>
          {index > 0 ? (
            <button type="button" className={`${styles.back} pressable`} onClick={goBack}>
              {strings.backLabel}
            </button>
          ) : null}
          <button type="button" className={`${styles.cta} pressable`} onClick={goNext}>
            {isLast ? strings.dismissLabel : strings.nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
