import { setVoiceLevel } from "./store";

/**
 * Mic level meter for the VoiceRail waveform (V-1, D10 10.7).
 *
 * Attaches an AnalyserNode to an EXISTING MediaStream - the same stream
 * MediaRecorder records from, so a capture costs one getUserMedia with
 * two consumers. (The retired CaptureVoice opened a parallel stream
 * because its recognition pipe hid the stream; the corridor screens own
 * their stream refs, so the meter attaches to those.)
 *
 * Polls at most every LEVEL_MS and writes the peak deviation into the
 * voice store. Failure costs only the waveform: capture proceeds and
 * the rail falls back to its static V-1 equivalent.
 */

const LEVEL_MS = 100;

export function attachLevelMeter(stream: MediaStream): () => void {
  let ctx: AudioContext | null = null;
  let timer: number | null = null;
  try {
    ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buffer = new Uint8Array(analyser.fftSize);
    timer = window.setInterval(() => {
      analyser.getByteTimeDomainData(buffer);
      let peak = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        const deviation = Math.abs(buffer[i] - 128);
        if (deviation > peak) peak = deviation;
      }
      setVoiceLevel(Math.min(1, peak / 96));
    }, LEVEL_MS);
  } catch {
    // No AudioContext: the waveform simply stays at rest.
  }
  return () => {
    if (timer !== null) window.clearInterval(timer);
    void ctx?.close().catch(() => {});
    setVoiceLevel(0);
  };
}
