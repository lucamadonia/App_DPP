/**
 * Franked letter composition.
 *
 * Deutsche Post INTERNETMARKE returns the stamp (address + franking) as a PDF
 * whose page layout depends on the configured page format. Instead of trusting
 * a layout table, we measure where the stamp actually sits on that page
 * (render → non-white bounding box) and copy exactly that region, as vectors,
 * into the address window of the document to post.
 *
 * pdf-lib and pdfjs are lazy-loaded to keep them out of the main bundle.
 */

const PT_PER_MM = 72 / 25.4;
const A4_PT: [number, number] = [595.28, 841.89];

/** DIN 5008 (Form B) address field, measured from the top-left page corner. */
export const ADDRESS_WINDOW_MM = { left: 20, top: 45, width: 85, height: 45 };
/** Keeps the stamp clear of the window edge when the sheet shifts in the envelope. */
const WINDOW_INSET_MM = 2;

/** `window` overlays page 1 of the document, `cover` prepends an address sheet. */
export type LetterPlacement = 'window' | 'cover';

export interface PixelBounds { minX: number; minY: number; maxX: number; maxY: number }
/** A region of a PDF page in points, PDF coordinates (origin bottom-left). */
export interface PdfRegion { left: number; bottom: number; right: number; top: number }

/** Bounding box of all non-white pixels in RGBA image data, or null if blank. */
export function findContentBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  whiteThreshold = 245,
): PixelBounds | null {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const isInk = data[i + 3] > 10
        && (data[i] < whiteThreshold || data[i + 1] < whiteThreshold || data[i + 2] < whiteThreshold);
      if (!isInk) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

/** Converts a pixel box (origin top-left) to a padded PDF region in points. */
export function pixelBoundsToRegion(
  bounds: PixelBounds,
  renderScale: number,
  pageWidthPt: number,
  pageHeightPt: number,
  paddingPt = 2,
): PdfRegion {
  return {
    left: Math.max(0, bounds.minX / renderScale - paddingPt),
    right: Math.min(pageWidthPt, (bounds.maxX + 1) / renderScale + paddingPt),
    top: Math.min(pageHeightPt, pageHeightPt - bounds.minY / renderScale + paddingPt),
    bottom: Math.max(0, pageHeightPt - (bounds.maxY + 1) / renderScale - paddingPt),
  };
}

/**
 * Where to draw a stamp of the given size so it sits top-left inside the
 * address window. Shrinks to fit, never enlarges (the franking code must not
 * be scaled up).
 */
export function computeStampPlacement(stampWidthPt: number, stampHeightPt: number, pageHeightPt: number) {
  const availableWidth = (ADDRESS_WINDOW_MM.width - 2 * WINDOW_INSET_MM) * PT_PER_MM;
  const availableHeight = (ADDRESS_WINDOW_MM.height - 2 * WINDOW_INSET_MM) * PT_PER_MM;
  const scale = Math.min(1, availableWidth / stampWidthPt, availableHeight / stampHeightPt);
  const width = stampWidthPt * scale;
  const height = stampHeightPt * scale;
  return {
    x: (ADDRESS_WINDOW_MM.left + WINDOW_INSET_MM) * PT_PER_MM,
    y: pageHeightPt - (ADDRESS_WINDOW_MM.top + WINDOW_INSET_MM) * PT_PER_MM - height,
    width,
    height,
    scale,
  };
}

/** Renders page 1 of the stamp PDF and measures where the stamp sits. */
export async function detectStampRegion(stampPdf: Uint8Array): Promise<PdfRegion> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  // pdfjs takes ownership of the buffer it is given, so hand it a copy.
  const pdf = await pdfjs.getDocument({ data: stampPdf.slice() }).promise;
  const page = await pdf.getPage(1);
  const renderScale = 2;
  const viewport = page.getViewport({ scale: renderScale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not read the stamp PDF');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;

  const bounds = findContentBounds(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
  if (!bounds) throw new Error('The stamp PDF is empty');
  return pixelBoundsToRegion(bounds, renderScale, viewport.width / renderScale, viewport.height / renderScale);
}

/**
 * Copies the stamp region into the address window. With a document and
 * `window` placement the window area on page 1 is blanked first (it normally
 * holds the printed recipient address, which the stamp replaces). Otherwise an
 * A4 address sheet is put in front.
 */
export async function mergeStampIntoDocument(input: {
  stampPdf: Uint8Array;
  stampRegion: PdfRegion;
  documentPdf?: Uint8Array;
  placement: LetterPlacement;
}): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import('pdf-lib');
  const stampDoc = await PDFDocument.load(input.stampPdf);
  const out = input.documentPdf ? await PDFDocument.load(input.documentPdf) : await PDFDocument.create();
  const stamp = await out.embedPage(stampDoc.getPage(0), input.stampRegion);

  const overlay = input.placement === 'window' && !!input.documentPdf;
  const page = overlay ? out.getPage(0) : out.insertPage(0, A4_PT);
  const pageHeight = page.getSize().height;

  if (overlay) {
    page.drawRectangle({
      x: ADDRESS_WINDOW_MM.left * PT_PER_MM,
      y: pageHeight - (ADDRESS_WINDOW_MM.top + ADDRESS_WINDOW_MM.height) * PT_PER_MM,
      width: ADDRESS_WINDOW_MM.width * PT_PER_MM,
      height: ADDRESS_WINDOW_MM.height * PT_PER_MM,
      color: rgb(1, 1, 1),
    });
  }

  const target = computeStampPlacement(
    input.stampRegion.right - input.stampRegion.left,
    input.stampRegion.top - input.stampRegion.bottom,
    pageHeight,
  );
  page.drawPage(stamp, { x: target.x, y: target.y, width: target.width, height: target.height });
  return await out.save();
}

/**
 * Serial letters: builds one print file from a PDF that holds many letters.
 * Each letter's pages are copied in order and its stamp replaces the address
 * window on its first page. Letters not listed are left out.
 */
export async function mergeLetterBatch(input: {
  documentPdf: Uint8Array;
  letters: { pages: number[]; stampPdf: Uint8Array; stampRegion: PdfRegion }[];
}): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import('pdf-lib');
  const source = await PDFDocument.load(input.documentPdf);
  const out = await PDFDocument.create();

  for (const letter of input.letters) {
    const copied = await out.copyPages(source, letter.pages.map((pageNumber) => pageNumber - 1));
    copied.forEach((page) => out.addPage(page));
    const first = copied[0];
    const pageHeight = first.getSize().height;
    const stampDoc = await PDFDocument.load(letter.stampPdf);
    const stamp = await out.embedPage(stampDoc.getPage(0), letter.stampRegion);
    first.drawRectangle({
      x: ADDRESS_WINDOW_MM.left * PT_PER_MM,
      y: pageHeight - (ADDRESS_WINDOW_MM.top + ADDRESS_WINDOW_MM.height) * PT_PER_MM,
      width: ADDRESS_WINDOW_MM.width * PT_PER_MM,
      height: ADDRESS_WINDOW_MM.height * PT_PER_MM,
      color: rgb(1, 1, 1),
    });
    const target = computeStampPlacement(
      letter.stampRegion.right - letter.stampRegion.left,
      letter.stampRegion.top - letter.stampRegion.bottom,
      pageHeight,
    );
    first.drawPage(stamp, { x: target.x, y: target.y, width: target.width, height: target.height });
  }
  return await out.save();
}

const SHEET_MARGIN_PT = 12 * PT_PER_MM;
const SHEET_GAP_PT = 8 * PT_PER_MM;

/** How many stamps of the given size fit on one sheet, with room to cut. */
export function computeSheetLayout(
  stampWidthPt: number,
  stampHeightPt: number,
  pageWidthPt = A4_PT[0],
  pageHeightPt = A4_PT[1],
) {
  const fit = (page: number, stamp: number) =>
    Math.max(1, Math.floor((page - 2 * SHEET_MARGIN_PT + SHEET_GAP_PT) / (stamp + SHEET_GAP_PT)));
  return { columns: fit(pageWidthPt, stampWidthPt), rows: fit(pageHeightPt, stampHeightPt) };
}

/**
 * Puts several stamps on A4 sheets, at original size, to cut out and stick on
 * envelopes. Each stamp must only be printed and used once.
 */
export async function mergeStampSheet(
  stamps: { stampPdf: Uint8Array; stampRegion: PdfRegion }[],
): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib');
  const out = await PDFDocument.create();
  const cellWidth = Math.max(...stamps.map(({ stampRegion }) => stampRegion.right - stampRegion.left));
  const cellHeight = Math.max(...stamps.map(({ stampRegion }) => stampRegion.top - stampRegion.bottom));
  const { columns, rows } = computeSheetLayout(cellWidth, cellHeight);
  const perPage = columns * rows;

  for (let index = 0; index < stamps.length; index++) {
    const { stampPdf, stampRegion } = stamps[index];
    const slot = index % perPage;
    const page = slot === 0 ? out.addPage(A4_PT) : out.getPage(out.getPageCount() - 1);
    const stampDoc = await PDFDocument.load(stampPdf);
    const stamp = await out.embedPage(stampDoc.getPage(0), stampRegion);
    const width = stampRegion.right - stampRegion.left;
    const height = stampRegion.top - stampRegion.bottom;
    const cellTop = A4_PT[1] - SHEET_MARGIN_PT - Math.floor(slot / columns) * (cellHeight + SHEET_GAP_PT);
    page.drawPage(stamp, {
      x: SHEET_MARGIN_PT + (slot % columns) * (cellWidth + SHEET_GAP_PT),
      y: cellTop - height,
      width,
      height,
    });
  }
  return await out.save();
}

/** Full pipeline: measure the stamp, then merge it into the document. */
export async function composeFrankedLetter(input: {
  stampPdf: Uint8Array;
  documentPdf?: Uint8Array;
  placement: LetterPlacement;
}): Promise<Uint8Array> {
  const stampRegion = await detectStampRegion(input.stampPdf);
  return await mergeStampIntoDocument({ ...input, stampRegion });
}

/** Offers a PDF to the user as a file download. */
export function downloadPdf(bytes: Uint8Array, filename: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
