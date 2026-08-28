import { sampleIdNumber } from "@/app/_lib/documents";

/**
 * The practice Death Certificate artefact (P1-3). S8 auto-adds it to the
 * wallet on submit; S7 owns its own sample generator and this file stays
 * local to app/practice (post-batch dedup is the orchestrator's, D12 §1).
 *
 * The watermark composes the D10 10.8 hatch: 4px 45deg diagonal, ink at
 * 8% over warn-100, warn-800 edge, plus the literal words in English
 * (allowed on the artefact). Tokens are read from the computed root at
 * runtime; the fallback literals mirror tokens.css exactly so the
 * artefact still generates if the read fails. No component styling uses
 * a raw hex anywhere.
 */

const WIDTH = 640;
const HEIGHT = 900;
const THUMB_WIDTH = 160;
const THUMB_HEIGHT = 225;

export interface PracticeCertificateArt {
  blob: Blob;
  thumbnail: Blob | null;
}

function token(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || null;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export async function generatePracticeCertificate(
  ack: string,
  docName: string,
): Promise<PracticeCertificateArt> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const ground = token("--warn-100") ?? "#faeeda";
  const ink = token("--ink-900") ?? "#0e1b1c";
  const edge = token("--warn-800") ?? "#7a4e06";

  // Hatch ground: 4px strokes on an 8px pitch at 45deg, ink at 8%.
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.08;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = -HEIGHT; x < WIDTH + HEIGHT; x += 8) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x + HEIGHT, HEIGHT);
  }
  ctx.stroke();
  ctx.restore();

  // The 2px warn-800 top edge, scaled up so it survives thumbnailing.
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, WIDTH, 12);

  // A clear panel so the heading block stays legible over the hatch.
  ctx.fillStyle = ground;
  ctx.fillRect(48, 96, WIDTH - 96, 260);

  ctx.textAlign = "center";
  ctx.fillStyle = ink;
  ctx.font = "600 34px 'Anek Latin', 'Anek Devanagari', 'Noto Sans', sans-serif";
  ctx.fillText(docName, WIDTH / 2, 170, WIDTH - 120);
  ctx.font = "400 20px 'Anek Latin', 'Anek Devanagari', 'Noto Sans', sans-serif";
  ctx.fillText("Practice copy. Issued by no one.", WIDTH / 2, 212, WIDTH - 120);
  ctx.font = "600 26px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText(ack, WIDTH / 2, 290, WIDTH - 120);
  ctx.font = "400 18px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText(sampleIdNumber("DOC-DEATH"), WIDTH / 2, 324, WIDTH - 120);

  // The literal watermark, diagonal, repeated, unmistakable.
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = ink;
  ctx.font = "700 40px 'Anek Latin', 'Noto Sans', sans-serif";
  ctx.fillText("SAMPLE - NOT A REAL DOCUMENT", 0, -40, WIDTH + 200);
  ctx.fillText("SAMPLE - NOT A REAL DOCUMENT", 0, 40, WIDTH + 200);
  ctx.fillText("SAMPLE - NOT A REAL DOCUMENT", 0, 120, WIDTH + 200);
  ctx.restore();

  ctx.fillStyle = ink;
  ctx.font = "600 22px 'Anek Latin', 'Noto Sans', sans-serif";
  ctx.fillText("SAMPLE - NOT A REAL DOCUMENT", WIDTH / 2, HEIGHT - 56, WIDTH - 80);

  const blob = await toBlob(canvas);
  if (!blob) throw new Error("Canvas export failed");

  // Thumbnail is best-effort; the wallet accepts a null thumbnail.
  let thumbnail: Blob | null = null;
  try {
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = THUMB_WIDTH;
    thumbCanvas.height = THUMB_HEIGHT;
    const thumbCtx = thumbCanvas.getContext("2d");
    if (thumbCtx) {
      thumbCtx.drawImage(canvas, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
      thumbnail = await toBlob(thumbCanvas);
    }
  } catch {
    thumbnail = null;
  }

  return { blob, thumbnail };
}
