/** Encode an AudioBuffer as a 16-bit mono WAV. Sarvam REST prefers WAV. */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const channel = buffer.numberOfChannels > 1 ? mixMono(buffer) : buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const samples = new Int16Array(channel.length);
  for (let i = 0; i < channel.length; i += 1) {
    const s = Math.max(-1, Math.min(1, channel[i]));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const bytes = samples.length * 2;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + bytes, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, bytes, true);

  return new Blob([header, samples], { type: "audio/wav" });
}

export async function blobToWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  try {
    const raw = await blob.arrayBuffer();
    const decoded = await ctx.decodeAudioData(raw.slice(0));
    return audioBufferToWav(decoded);
  } finally {
    await ctx.close();
  }
}

function mixMono(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const out = new Float32Array(length);
  const count = buffer.numberOfChannels;
  for (let c = 0; c < count; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i += 1) out[i] += data[i] / count;
  }
  return out;
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}
