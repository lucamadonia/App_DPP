/**
 * Serial letters: split one PDF that contains many letters (e.g. a stack of
 * invoices) into individual letters by reading the recipient from the address
 * window of every page. Consecutive pages with the same recipient form one
 * letter.
 */
import type { LetterRecipient } from '@/types/dhl';

const PT_PER_MM = 72 / 25.4;
/** Slightly larger than the DIN 5008 address field, to tolerate layout drift. */
const ADDRESS_ZONE_MM = { left: 15, right: 110, top: 40, bottom: 95 };

const COUNTRY_CODES: Record<string, string> = {
  deutschland: 'DE', germany: 'DE', österreich: 'AT', oesterreich: 'AT', austria: 'AT',
  schweiz: 'CH', switzerland: 'CH', frankreich: 'FR', france: 'FR', niederlande: 'NL',
  netherlands: 'NL', belgien: 'BE', belgium: 'BE', italien: 'IT', italy: 'IT',
  luxemburg: 'LU', luxembourg: 'LU', spanien: 'ES', spain: 'ES', polen: 'PL', poland: 'PL',
  dänemark: 'DK', denmark: 'DK',
};

export interface DetectedLetter {
  /** 1-based page numbers in the source PDF. */
  pages: number[];
  /** Null when no usable address was found on the first page. */
  recipient: LetterRecipient | null;
  /** Raw address lines, shown so the user can spot a misread. */
  addressLines: string[];
}

/**
 * Turns the text lines of an address field into a recipient. Expects, top to
 * bottom: optional sender line, name, optional extra lines, street,
 * "postal code city", optional country.
 */
export function parseAddressLines(lines: string[]): LetterRecipient | null {
  const clean = lines.map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const postalIndex = clean.findIndex((line) => /^\d{4,5}\s+\S/.test(line));
  if (postalIndex < 2) return null;

  // A sender line ("Company · Street, 12345 City") sits above the recipient.
  let start = 0;
  for (let i = 0; i < postalIndex; i++) {
    if (/[·•|]/.test(clean[i]) || /,\s*\d{4,5}\s/.test(clean[i])) start = i + 1;
  }
  const body = clean.slice(start, postalIndex);
  if (body.length < 2) return null;

  const [, postalCode, city] = clean[postalIndex].match(/^(\d{4,5})\s+(.+)$/) || [];
  const countryLine = clean[postalIndex + 1]?.toLocaleLowerCase('de-DE') || '';
  const country = countryLine ? COUNTRY_CODES[countryLine] : 'DE';
  if (!postalCode || !city || !country) return null;

  // The first line with a house number is the street; lines after it (floor,
  // flat) and lines between name and street become the additional line.
  const streetOffset = body.slice(1).findIndex((line) => /\d/.test(line));
  const streetIndex = streetOffset < 0 ? body.length - 1 : streetOffset + 1;
  const extras = [...body.slice(1, streetIndex), ...body.slice(streetIndex + 1)];
  return {
    name: body[0],
    additionalName: extras.join(', '),
    street: body[streetIndex],
    postalCode,
    city,
    country,
  };
}

/** Groups consecutive pages that carry the same address into letters. */
export function groupLetters(pageAddressLines: string[][]): DetectedLetter[] {
  const letters: DetectedLetter[] = [];
  let previousKey = '';
  pageAddressLines.forEach((lines, index) => {
    const key = lines.join('|').toLocaleLowerCase('de-DE');
    const current = letters[letters.length - 1];
    // A page without an address continues the letter before it.
    if (current && (key === previousKey || lines.length === 0)) {
      current.pages.push(index + 1);
      return;
    }
    letters.push({ pages: [index + 1], recipient: parseAddressLines(lines), addressLines: lines });
    previousKey = key;
  });
  return letters;
}

/** Reads the address-window text lines of every page of a PDF. */
export async function readAddressLines(pdfBytes: Uint8Array): Promise<string[][]> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjs.getDocument({ data: pdfBytes.slice() }).promise;

  const result: string[][] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const pageHeight = page.getViewport({ scale: 1 }).height;
    const parts: TextPart[] = [];
    for (const item of (await page.getTextContent()).items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const x = item.transform[4] / PT_PER_MM;
      const y = (pageHeight - item.transform[5]) / PT_PER_MM;
      if (x < ADDRESS_ZONE_MM.left || x > ADDRESS_ZONE_MM.right) continue;
      if (y < ADDRESS_ZONE_MM.top || y > ADDRESS_ZONE_MM.bottom) continue;
      parts.push({ x, y, text: item.str.trim() });
    }
    result.push(joinTextRows(parts));
  }
  return result;
}

export interface TextPart { x: number; y: number; text: string }

/** Joins text fragments into lines, top to bottom; y in mm from the page top. */
export function joinTextRows(parts: TextPart[], rowToleranceMm = 1.5): string[] {
  const rows: TextPart[][] = [];
  for (const part of [...parts].sort((a, b) => a.y - b.y)) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(part.y - row[0].y) < rowToleranceMm) row.push(part);
    else rows.push([part]);
  }
  return rows.map((row) => row.sort((a, b) => a.x - b.x).map((part) => part.text).join(' '));
}

export async function detectLetters(pdfBytes: Uint8Array): Promise<DetectedLetter[]> {
  return groupLetters(await readAddressLines(pdfBytes));
}
