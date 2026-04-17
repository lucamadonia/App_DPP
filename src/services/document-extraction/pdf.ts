/**
 * Client-side PDF extraction using pdfjs-dist.
 *
 * Extracts:
 *  - text from first N pages (default 5) capped at 15 000 chars
 *  - first page rendered as a PNG Base64 data URL (for Vision fallback)
 *
 * pdfjs is lazy-loaded to keep the main bundle small.
 */

export interface PdfExtractResult {
  text: string;
  pageImage: string; // data:image/png;base64,...
  pageCount: number;
  truncated: boolean;
}

const MAX_TEXT_CHARS = 15_000;
const MAX_PAGES_FOR_TEXT = 5;
const TARGET_IMAGE_WIDTH = 1024;

type TextItem = { str?: string };

export async function extractPdf(file: File): Promise<PdfExtractResult> {
  // Dynamic imports — keeps pdfjs out of the main bundle
  const pdfjs = await import('pdfjs-dist');

  // Vite-specific: load the worker as a URL asset
  // This avoids the "fake worker" fallback which is slow and prints warnings.
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;

  const pageCount = pdf.numPages;
  const pagesToExtract = Math.min(pageCount, MAX_PAGES_FOR_TEXT);

  // Extract text
  let text = '';
  for (let i = 1; i <= pagesToExtract; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ('str' in it ? (it as TextItem).str ?? '' : ''))
      .join(' ');
    text += pageText + '\n';
    if (text.length >= MAX_TEXT_CHARS) break;
  }

  const truncated = text.length >= MAX_TEXT_CHARS;
  if (truncated) {
    text = text.slice(0, MAX_TEXT_CHARS);
  }

  // Render page 1 as PNG
  let pageImage = '';
  try {
    const page1 = await pdf.getPage(1);
    const viewport = page1.getViewport({ scale: 1 });
    const scale = Math.min(TARGET_IMAGE_WIDTH / viewport.width, 1.5);
    const scaledVp = page1.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = scaledVp.width;
    canvas.height = scaledVp.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      await page1.render({ canvas, canvasContext: ctx, viewport: scaledVp }).promise;
      pageImage = canvas.toDataURL('image/png');
    }
  } catch (err) {
    console.warn('PDF first-page render failed, text-only fallback', err);
  }

  return { text: text.trim(), pageImage, pageCount, truncated };
}
