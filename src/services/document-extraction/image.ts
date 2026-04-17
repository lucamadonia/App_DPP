/**
 * Client-side image downscaling + base64 encoding for Vision AI.
 *
 * Claude Vision recommends <=1568px longest edge. We always re-encode to JPEG
 * at 85% quality (unless alpha is needed) — halves payload with no accuracy loss.
 */

export interface ImageExtractResult {
  /** data:image/jpeg;base64,... (or data:image/png;base64,... if PNG-with-alpha detected) */
  pageImage: string;
  width: number;
  height: number;
}

const MAX_DIMENSION = 1568;
const JPEG_QUALITY = 0.85;

export async function extractImage(file: File): Promise<ImageExtractResult> {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.drawImage(bitmap, 0, 0, width, height);

  // Re-encode as JPEG (smaller); fall back to PNG if transparent-PNG source
  const wantsPng = file.type === 'image/png';
  const dataUrl = wantsPng
    ? canvas.toDataURL('image/png')
    : canvas.toDataURL('image/jpeg', JPEG_QUALITY);

  return { pageImage: dataUrl, width, height };
}
