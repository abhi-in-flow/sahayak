/**
 * Voice corridor store ("V-LOCAL"): the in-memory state the VoiceRail
 * renders, shared by every corridor screen (S2/S3/S4/S5).
 *
 * Same external-store shape as journey/store.ts minus persistence:
 * voice state belongs to the current screen session and is never
 * durable, so there is no localStorage, no cross-tab wiring and no
 * server snapshot distinction that matters (the initial state is a
 * valid server snapshot).
 *
 * Readers: VoiceRail only. Screens WRITE through the setters and never
 * mirror phase/level into their own state - the level updates ~10x/s
 * while listening, and only the rail should re-render at that rate.
 *
 * FROZEN CONTRACT for the voice-corridor work (waves 1-2). Screens may
 * call the setters and read the snapshot; changes to the shape or the
 * setters go through the orchestrator, not a screen agent.
 *
 * Data flow per utterance on a Sarvam-capture screen (/capture):
 *   mic press    -> setVoicePhase("listening") + attachLevelMeter(stream)
 *   Web Speech   -> setVoiceInterim(partial)        (ghost caption)
 *   stop press   -> setVoicePhase("transcribing")   (interim stays visible)
 *   final text   -> setVoiceInterim("") + setVoicePhase("thinking")
 *   reply renders-> setVoicePhase("speaking") -> "idle" after playback
 * Each screen also declares its corridor position on mount:
 *   setVoiceStep({ id: "clarify", detail: "3 of 5" })  /  setVoiceStep(null)
 */

export type VoicePhase = "idle" | "listening" | "transcribing" | "thinking" | "speaking";

export type CorridorStepId = "speak" | "clarify" | "confirm" | "plan";

export interface VoiceCorridorStep {
  id: CorridorStepId;
  /** Short live detail rendered beside the segments, e.g. "3 of 5". */
  detail?: string;
}

export interface VoiceState {
  phase: VoicePhase;
  /** Live mic amplitude 0..1 from the level meter; 0 unless listening. */
  level: number;
  /** In-flight Web Speech hypothesis (ghost caption). Cleared when the
   *  final transcript lands; held through "transcribing" so the user can
   *  verify what will be sent. */
  interim: string;
  /** This screen's corridor position; null hides the segment row. */
  step: VoiceCorridorStep | null;
}

const INITIAL: VoiceState = { phase: "idle", level: 0, interim: "", step: null };

let state: VoiceState = INITIAL;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function set(patch: Partial<VoiceState>): void {
  state = { ...state, ...patch };
  notify();
}

export function subscribeVoice(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getVoiceSnapshot(): VoiceState {
  return state;
}

export function getVoiceServerSnapshot(): VoiceState {
  return INITIAL;
}

/* ---- the screens' named write path --------------------------------- */

export function setVoicePhase(phase: VoicePhase): void {
  if (state.phase !== phase) set({ phase });
}

export function setVoiceLevel(level: number): void {
  set({ level });
}

export function setVoiceInterim(interim: string): void {
  set({ interim });
}

export function setVoiceStep(step: VoiceCorridorStep | null): void {
  const current = state.step;
  if (current?.id === step?.id && current?.detail === step?.detail) return;
  set({ step });
}
