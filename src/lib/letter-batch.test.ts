import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { groupLetters, joinTextRows, parseAddressLines } from './letter-batch';
import { mergeLetterBatch } from './letter-pdf';

const SENDER = 'Muster GmbH · Hauptstraße 1, 12345 Musterstadt';

describe('parseAddressLines', () => {
  it('reads a plain address and skips the sender line', () => {
    expect(parseAddressLines([SENDER, 'Erika Beispiel', 'Lindenweg 7', '54321 Beispielort', 'Deutschland'])).toEqual({
      name: 'Erika Beispiel', additionalName: '', street: 'Lindenweg 7', postalCode: '54321', city: 'Beispielort', country: 'DE',
    });
  });

  it('keeps a floor or flat line as additional line', () => {
    const recipient = parseAddressLines([SENDER, 'Erika Beispiel', 'Lindenweg 12/1', 'Wohnung 2', '54321 Beispielort']);
    expect(recipient?.street).toBe('Lindenweg 12/1');
    expect(recipient?.additionalName).toBe('Wohnung 2');
    expect(recipient?.country).toBe('DE');
  });

  it('keeps a contact line between name and street as additional line', () => {
    const recipient = parseAddressLines(['Beispiel AG', 'z. Hd. Erika Beispiel', 'Lindenweg 7', '54321 Beispielort']);
    expect(recipient).toMatchObject({ name: 'Beispiel AG', additionalName: 'z. Hd. Erika Beispiel', street: 'Lindenweg 7' });
  });

  it('maps a foreign country and rejects an unknown one', () => {
    expect(parseAddressLines(['Erika Beispiel', 'Ringstraße 3', '1010 Wien', 'Österreich'])?.country).toBe('AT');
    expect(parseAddressLines(['Erika Beispiel', 'Ringstraße 3', '1010 Wien', 'Atlantis'])).toBeNull();
  });

  it('returns null without a postal code line', () => {
    expect(parseAddressLines(['Erika Beispiel', 'Lindenweg 7'])).toBeNull();
    expect(parseAddressLines([])).toBeNull();
  });
});

describe('joinTextRows', () => {
  it('joins fragments of one line left to right and orders lines top to bottom', () => {
    expect(joinTextRows([
      { x: 60, y: 60.4, text: 'Beispiel' },
      { x: 25, y: 65, text: 'Lindenweg 7' },
      { x: 25, y: 60, text: 'Erika' },
    ])).toEqual(['Erika Beispiel', 'Lindenweg 7']);
  });
});

describe('groupLetters', () => {
  const a = [SENDER, 'Erika Beispiel', 'Lindenweg 7', '54321 Beispielort'];
  const b = [SENDER, 'Max Muster', 'Parkallee 9', '11111 Anderswo'];

  it('keeps consecutive pages with the same address together', () => {
    const letters = groupLetters([a, a, b, [], a]);
    expect(letters.map((letter) => letter.pages)).toEqual([[1, 2], [3, 4], [5]]);
    expect(letters[1].recipient?.name).toBe('Max Muster');
  });

  it('flags a first page without a readable address', () => {
    expect(groupLetters([['Nur Text']])[0].recipient).toBeNull();
  });
});

describe('mergeLetterBatch', () => {
  it('outputs only the pages of the chosen letters, in order', async () => {
    const source = await PDFDocument.create();
    for (let i = 0; i < 6; i++) source.addPage([595.28, 841.89]);
    const stamp = await PDFDocument.create();
    stamp.addPage([595.28, 841.89]).drawRectangle({ x: 50, y: 700, width: 200, height: 90 });
    const stampPdf = await stamp.save();
    const stampRegion = { left: 48, bottom: 698, right: 252, top: 792 };

    const merged = await mergeLetterBatch({
      documentPdf: await source.save(),
      letters: [{ pages: [1, 2], stampPdf, stampRegion }, { pages: [5, 6], stampPdf, stampRegion }],
    });
    expect((await PDFDocument.load(merged)).getPageCount()).toBe(4);
  });
});
