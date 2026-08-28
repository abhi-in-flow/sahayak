/**
 * Client-side image pipeline for S7 adds (D3 S7 validation; D12 §4 S7).
 *
 * Everything happens on the device (P3): decode, downscale, encode,
 * store. Oversize images downscale silently, never a user error. The
 * main image caps at ~1600px and the card thumbnail at ~480px, both
 * JPEG ~0.85. No recognition, no OCR of identity documents (P3).
 *
 * Canvas colours are read from the design tokens at runtime; no raw hex
 * lives here (DECISION-007). The generated sample canvas replicates the
 * `.hatch` / `.hatchEdge` recipe from globals.css so the thumbnail, the
 * mock banner and the practice artefacts read as one system (D10 10.8).
 */

import type { UploadController } from "./uploads";

export interface ProcessedImage {
  blob: Blob;
  thumbnail: Blob;
}

const MAX_EDGE = 1600;
const THUMB_EDGE = 480;
const JPEG_QUALITY = 0.85;

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob produced no blob"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

/** Capture a live camera frame as a JPEG blob, the pipeline input. */
export function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return canvasToBlob(canvas);
}

async function decode(blob: Blob): Promise<ImageBitmap> {
  try {
    // Honour EXIF orientation; phone galleries need this.
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    return createImageBitmap(blob);
  }
}

function drawScaled(
  source: ImageBitmap | HTMLCanvasElement,
  maxEdge: number,
): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Downscale + thumbnail for a user-supplied image. Silent on oversize. */
export async function processImage(
  source: Blob,
  controller: UploadController,
): Promise<ProcessedImage> {
  controller.report(0.15);
  const bitmap = await decode(source);
  controller.checkpoint();
  const full = await canvasToBlob(drawScaled(bitmap, MAX_EDGE));
  controller.report(0.55);
  controller.checkpoint();
  const thumbnail = await canvasToBlob(drawScaled(bitmap, THUMB_EDGE));
  controller.report(0.7);
  controller.checkpoint();
  bitmap.close();
  return { blob: full, thumbnail };
}

/* ---- the watermarked synthetic sample (recommended demo path) ------- */

function token(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!value) throw new Error(`Missing design token ${name}; globals.css must load first`);
  return value;
}

/** "#0e1b1c" to "14, 27, 28", so the hatch stays token-derived. */
function hexChannels(hex: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Unexpected non-hex token value: ${hex}`);
  const int = parseInt(match[1], 16);
  return `${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let current = "";
    for (const word of paragraph.split(" ")) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}

/**
 * The sample document: ~640x900 canvas, warn-100 ground, the `.hatch`
 * diagonal stripes, the `.hatchEdge` top edge, and the localized
 * watermark wording large and legible around the document name (D10
 * 10.8: the honesty treatment must survive greyscale and printing).
 * No ID number is drawn: samples carry none, and the wallet never OCRs.
 */
export async function generateSampleDocument(
  docName: string,
  watermark: string,
  controller: UploadController,
): Promise<ProcessedImage> {
  controller.report(0.2);
  const width = 640;
  const height = 900;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const warn100 = token("--warn-100");
  const warn800 = token("--warn-800");
  const ink900 = token("--ink-900");
  const ink700 = token("--ink-700");
  const fontUi = token("--font-ui");

  ctx.fillStyle = warn100;
  ctx.fillRect(0, 0, width, height);

  // `.hatch`: 4px diagonal at 45deg, ink-900 at 8% (globals.css recipe).
  ctx.save();
  ctx.strokeStyle = `rgba(${hexChannels(ink900)}, 0.08)`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = -height; x < width + height; x += 8) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height, height);
  }
  ctx.stroke();
  ctx.restore();

  // `.hatchEdge`: 2px warn-800 top edge.
  ctx.fillStyle = warn800;
  ctx.fillRect(0, 0, width, 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `600 40px ${fontUi}`;
  ctx.fillStyle = ink900;
  const headLines = wrapText(ctx, watermark, width - 96);
  headLines.forEach((line, index) => {
    ctx.fillText(line, width / 2, 72 + index * 52);
  });

  controller.checkpoint();
  ctx.font = `600 34px ${fontUi}`;
  ctx.fillStyle = ink700;
  const nameLines = wrapText(ctx, docName, width - 128);
  let y = height / 2 - (nameLines.length * 46) / 2;
  for (const line of nameLines) {
    ctx.fillText(line, width / 2, y);
    y += 46;
  }

  ctx.font = `600 40px ${fontUi}`;
  ctx.fillStyle = ink900;
  const footLines = wrapText(ctx, watermark, width - 96);
  const footTop = height - 72 - (footLines.length - 1) * 52;
  footLines.forEach((line, index) => {
    ctx.fillText(line, width / 2, footTop + index * 52);
  });

  controller.report(0.6);
  controller.checkpoint();
  const blob = await canvasToBlob(canvas);
  controller.report(0.7);
  const thumbnail = await canvasToBlob(drawScaled(canvas, THUMB_EDGE));
  controller.report(0.75);
  return { blob, thumbnail };
}
