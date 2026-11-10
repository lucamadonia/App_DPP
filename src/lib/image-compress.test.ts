import { describe, expect, it } from 'vitest';
import { compressImageFile, fitWithin } from './image-compress';

describe('fitWithin', () => {
  it('keeps images that already fit', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('scales landscape images by the longest side', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it('scales portrait images by the longest side', () => {
    expect(fitWithin(3000, 6000, 1600)).toEqual({ width: 800, height: 1600 });
  });

  it('handles zero sizes without dividing by zero', () => {
    expect(fitWithin(0, 0, 1600)).toEqual({ width: 0, height: 0 });
  });
});

describe('compressImageFile', () => {
  it('returns non-raster files unchanged', async () => {
    const svg = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' });
    await expect(compressImageFile(svg)).resolves.toBe(svg);
  });
});
