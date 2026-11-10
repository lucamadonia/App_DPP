/**
 * Client-side image downscaling before upload.
 *
 * Product photos often arrive as multi-megabyte PNG/JPEG originals; served
 * as-is they make lists and galleries slow on mobile. We re-encode to WebP,
 * capped at MAX_IMAGE_DIMENSION on the longest side.
 */

export const MAX_IMAGE_DIMENSION = 1600;
export const WEBP_QUALITY = 0.8;

/** Scale (width, height) to fit within `max` on the longest side; never upscales. */
export function fitWithin(width: number, height: number, max = MAX_IMAGE_DIMENSION): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max || longest === 0) return { width, height };
  const scale = max / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Returns a smaller WebP version of `file`, or the original file when it is
 * not a raster image, the browser cannot encode WebP, or the result would not
 * be smaller. Never throws — a failed compression just uploads the original.
 */
export async function compressImageFile(file: File, max = MAX_IMAGE_DIMENSION): Promise<File> {
  // SVG/GIF keep their format (vector / animation would be lost).
  if (!/^image\/(png|jpe?g|webp|heic|heif)$/i.test(file.type)) return file;
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const { width, height } = fitWithin(bitmap.width, bitmap.height, max);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY));
    // Safari without WebP encoding falls back to PNG — that is not a win.
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], name, { type: 'image/webp', lastModified: Date.now() });
  } catch {
    return file;
  }
}
