"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CircleCheckBig,
  Cog,
  Ellipsis,
  FileQuestion,
  History,
  Keyboard,
  Mic,
  MoveRight,
  ServerCrash,
} from "lucide-react";
import { announce } from "@/app/_lib/announce";
import { BrandMark } from "./BrandMark";
import { IconDisc } from "./IconDisc";
import styles from "./FirstRunCarousel.module.css";

/**
 * Once-only first-run explainer: three user-paced slides. The parent gate
 * mounts this instead of the page, so it is a plain full-viewport overlay
 * (the BrandSplash plane), not a dialog — no scrim, no focus trap, no role.
 *
 * Props-only: the caller owns persistence. Every exit routes through one
 * guarded finish(), so the history sentinel and a button tap can never
 * double-fire onDone.
 *
 * Motion (D10 10.7): the slide body swaps with M-2's 200ms directional
 * cross-fade, transform/opacity only — the diagrams themselves are static
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
  n1Label: string; // friction node: forms confusing
  n2Label: string; // friction node: portals crash
  n3Label: string; // friction node: queues reset
  scene2Title: string;
  scene2Body: string;
  scene2In: string; // pipeline input stage
  scene2Mid: string; // pipeline process stage
  scene2Out: string; // pipeline output stage
  scene3Title: string;
  step1Title: string;
  step1Body: string;
  step2Title: string;
  step2Body: string;
  step3Title: string;
  step3Body: string;
}

const TOTAL_SLIDES = 3;

/* Module-scoped, per-tab memory in OnboardFlow's lastEnteredStep idiom:
   the first render in a tab is a page load, not a slide change, so it
   must neither steal focus nor announce. */
let lastEnteredSlide: number | null = null;

/* ---- diagrams ---------------------------------------------------------- */
/* Slides 1–2 render inside the aria-hidden panel at the call site: token
   fills, borders and lucide glyphs, static (DP-5). The short node labels
   inside them are sighted-only decoration — the slide's title and body
   carry the same meaning for everyone else. Slide 3 has no panel: its
   stepper is real content (live text under the slide heading), so only
   its discs, number chips and rail are decorative. */

/* Slide 1: three literal system-failure nodes — confusing forms, a
   crashed portal, a queue snapped back — joined by friction dashes, with
   the one teal line of order emerging underneath toward slide 2. No user
   figure: the problem is the system, not the person. */
function SceneStalls({ labels }: { labels: [string, string, string] }) {
  return (
    <div className={styles.sceneOne}>
      <div className={styles.frictionRow}>
        <div className={styles.frictionNode}>
          <IconDisc icon={FileQuestion} tone="err" size={48} />
          <span className={styles.frictionLabel}>{labels[0]}</span>
        </div>
        <span className={styles.frictionDash} />
        <div className={styles.frictionNode}>
          <IconDisc icon={ServerCrash} tone="err" size={48} />
          <span className={styles.frictionLabel}>{labels[1]}</span>
        </div>
        <span className={styles.frictionDash} />
        <div className={styles.frictionNode}>
          <IconDisc icon={History} tone="err" size={48} />
          <span className={styles.frictionLabel}>{labels[2]}</span>
        </div>
      </div>
      <div className={styles.orderRail}>
        <span className={styles.orderLine} />
        <MoveRight size={20} strokeWidth={2} />
      </div>
    </div>
  );
}

/* Slide 2: the input-process-output pipeline. Either channel (voice bars
   + mic, or typed text) enters the left node; the Sahayak mark glows in
   the middle; structured, checked tickets exit right — say it, we
   organise it. */
function ScenePipeline({ labels }: { labels: [string, string, string] }) {
  return (
    <div className={styles.sceneTwo}>
      <div className={styles.ipoNode}>
        <div className={styles.inputBubble}>
          <span className={styles.bubbleVoice}>
            <span className={styles.waveBar} style={{ height: 10 }} />
            <span className={styles.waveBar} style={{ height: 20 }} />
            <span className={styles.waveBar} style={{ height: 14 }} />
            <span className={styles.waveBar} style={{ height: 22 }} />
            <span className={styles.waveBar} style={{ height: 12 }} />
            <span className={styles.micBadge}>
              <Mic size={12} strokeWidth={2.5} />
            </span>
          </span>
          <span className={styles.bubbleDivide} />
          <span className={styles.bubbleType}>
            <Keyboard size={14} strokeWidth={2} />
            <Ellipsis size={16} strokeWidth={2.5} />
          </span>
        </div>
        <span className={styles.nodeLabel}>{labels[0]}</span>
      </div>
      <span className={styles.ipoArrow}>
        <ArrowRight size={20} strokeWidth={2} />
      </span>
      <div className={styles.ipoNode}>
        <span className={styles.processNode}>
          <BrandMark variant="icon" decorative size={56} />
        </span>
        <span className={styles.nodeLabel}>{labels[1]}</span>
      </div>
      <span className={styles.ipoArrow}>
        <ArrowRight size={20} strokeWidth={2} />
      </span>
      <div className={styles.ipoNode}>
        <div className={styles.ticketStack}>
          <div className={styles.ticket}>
            <span className={styles.ticketLine} />
            <span className={styles.ticketLineShort} />
            <span className={styles.ticketCheck}>
              <CircleCheckBig size={12} strokeWidth={2.5} />
            </span>
          </div>
          <div className={styles.ticket}>
            <span className={styles.ticketLine} />
            <span className={styles.ticketLineShort} />
            <span className={styles.ticketCheck}>
              <CircleCheckBig size={12} strokeWidth={2.5} />
            </span>
          </div>
        </div>
        <span className={styles.nodeLabel}>{labels[2]}</span>
      </div>
    </div>
  );
}

/* Slide 3: the plan as a real numbered stepper. The ol supplies the
   numbering for assistive tech, so the visible chips are aria-hidden
   duplication; titles and descriptions are the live content. */
function StepList({ strings }: { strings: FirstRunCarouselStrings }) {
  const steps = [
    { icon: ArrowRight, title: strings.step1Title, body: strings.step1Body },
    { icon: Cog, title: strings.step2Title, body: strings.step2Body },
    { icon: CircleCheckBig, title: strings.step3Title, body: strings.step3Body },
  ];
  return (
    <ol className={styles.steps}>
      {steps.map((step, i) => (
        <li key={step.title} className={styles.step}>
          <span className={styles.stepDisc}>
            <IconDisc
              icon={step.icon}
              tone={i === steps.length - 1 ? "done" : "accent"}
            />
            <span className={styles.stepNum} aria-hidden="true">
              {i + 1}
            </span>
          </span>
          <span className={styles.stepText}>
            <span className={styles.stepTitle}>{step.title}</span>
            <span className={styles.stepBody}>{step.body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

type Slide = {
  title: string;
  body?: string;
  scene?: ReactNode;
  steps?: ReactNode;
};

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

  const slides: Slide[] = [
    {
      title: strings.scene1Title,
      body: strings.scene1Body,
      scene: <SceneStalls labels={[strings.n1Label, strings.n2Label, strings.n3Label]} />,
    },
    {
      title: strings.scene2Title,
      body: strings.scene2Body,
      scene: <ScenePipeline labels={[strings.scene2In, strings.scene2Mid, strings.scene2Out]} />,
    },
    {
      title: strings.scene3Title,
      steps: <StepList strings={strings} />,
    },
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
            slide its causality (your tap, your way). Slides 1–2 lead with
            the aria-hidden diagram; the heading remains the first thing
            assistive tech reads, and slide 3's stepper is live text right
            after it. */}
        <div
          key={index}
          className={`${styles.slide} ${direction === "fwd" ? styles.slideIn : styles.slideBack}`}
        >
          {slide.scene != null && (
            <div className={styles.scenePanel} aria-hidden="true">
              {slide.scene}
            </div>
          )}
          <h1 ref={headingRef} tabIndex={-1} className={styles.headline}>
            {slide.title}
          </h1>
          {slide.body != null && <p className={styles.body}>{slide.body}</p>}
          {slide.steps}
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
