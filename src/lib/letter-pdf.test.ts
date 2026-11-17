import { describe, expect, it } from 'vitest';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  ADDRESS_WINDOW_MM,
  computeStampPlacement,
  findContentBounds,
  mergeStampIntoDocument,
  pixelBoundsToRegion,
} from './letter-pdf';

const PT_PER_MM = 72 / 25.4;

function whiteImage(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4).fill(255);
}

function paint(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const i = (y * width + x) * 4;
  data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
}

async function stampPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  page.drawRectangle({ x: 50, y: 700, width: 200, height: 90, color: rgb(0, 0, 0) });
  return await doc.save();
}

describe('findContentBounds', () => {
  it('returns null for a blank page', () => {
    expect(findContentBounds(whiteImage(10, 10), 10, 10)).toBeNull();
  });

  it('finds the box around all ink', () => {
    const data = whiteImage(20, 10);
    paint(data, 20, 3, 2);
    paint(data, 20, 15, 7);
    expect(findContentBounds(data, 20, 10)).toEqual({ minX: 3, minY: 2, maxX: 15, maxY: 7 });
  });
});

describe('pixelBoundsToRegion', () => {
  it('flips the y axis and converts pixels to points', () => {
    const region = pixelBoundsToRegion({ minX: 100, minY: 200, maxX: 299, maxY: 399 }, 2, 600, 800, 0);
    expect(region).toEqual({ left: 50, right: 150, top: 700, bottom: 600 });
  });

  it('clamps the padding to the page', () => {
    const region = pixelBoundsToRegion({ minX: 0, minY: 0, maxX: 1199, maxY: 1599 }, 2, 600, 800, 5);
    expect(region).toEqual({ left: 0, right: 600, top: 800, bottom: 0 });
  });
});

describe('computeStampPlacement', () => {
  it('keeps a small stamp at original size inside the window', () => {
    const p = computeStampPlacement(150, 80, 841.89);
    expect(p.scale).toBe(1);
    expect(p.x).toBeCloseTo(22 * PT_PER_MM);
    // Top edge sits 47 mm below the top of the page.
    expect(841.89 - (p.y + p.height)).toBeCloseTo(47 * PT_PER_MM);
  });

  it('shrinks an oversized stamp to fit the window', () => {
    const p = computeStampPlacement(600, 200, 841.89);
    expect(p.scale).toBeLessThan(1);
    expect(p.width).toBeLessThanOrEqual((ADDRESS_WINDOW_MM.width - 4) * PT_PER_MM + 0.001);
    expect(p.height).toBeLessThanOrEqual((ADDRESS_WINDOW_MM.height - 4) * PT_PER_MM + 0.001);
  });
});

describe('mergeStampIntoDocument', () => {
  const stampRegion = { left: 48, bottom: 698, right: 252, top: 792 };

  it('overlays page 1 without adding pages in window mode', async () => {
    const invoice = await PDFDocument.create();
    invoice.addPage([595.28, 841.89]);
    invoice.addPage([595.28, 841.89]);
    const merged = await mergeStampIntoDocument({
      stampPdf: await stampPdf(), stampRegion, documentPdf: await invoice.save(), placement: 'window',
    });
    expect((await PDFDocument.load(merged)).getPageCount()).toBe(2);
  });

  it('prepends an address sheet in cover mode', async () => {
    const invoice = await PDFDocument.create();
    invoice.addPage([595.28, 841.89]);
    const merged = await mergeStampIntoDocument({
      stampPdf: await stampPdf(), stampRegion, documentPdf: await invoice.save(), placement: 'cover',
    });
    expect((await PDFDocument.load(merged)).getPageCount()).toBe(2);
  });

  it('creates a single address sheet when there is no document', async () => {
    const merged = await mergeStampIntoDocument({ stampPdf: await stampPdf(), stampRegion, placement: 'window' });
    expect((await PDFDocument.load(merged)).getPageCount()).toBe(1);
  });
});
