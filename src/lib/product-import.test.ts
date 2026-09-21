import { describe, expect, it } from 'vitest';
import { normalizeImportJSON, validateImportRows } from './product-import';

const mapping = { name: 'name', manufacturer: 'manufacturer', category: 'category', gtin: 'gtin', netWeight: 'netWeight', materials: 'materials' };
const product = { name: 'Bottle', manufacturer: 'Example', category: 'Home', gtin: '00123456789012' };
describe('product import validation', () => {
  it('preserves leading zeros and nested material data from JSON', () => {
    const materials = [{ name: 'Glass', percentage: 100, recyclable: true }];
    const rows = normalizeImportJSON([{ ...product, materials }, { ...product, description: 'Sparse column' }]);
    expect(rows[0].gtin).toBe(product.gtin);
    expect(JSON.parse(rows[0].materials)).toEqual(materials);
    expect(rows[1].description).toBe('Sparse column');
    expect(validateImportRows([rows[0]], mapping, new Set())[0].status).toBe('valid');
  });
  it('rejects existing and within-file duplicate GTINs', () => {
    expect(validateImportRows([product], mapping, new Set([product.gtin]))[0].status).toBe('error');
    expect(validateImportRows([product, product], mapping, new Set()).map(row => row.status)).toEqual(['valid', 'error']);
  });
  it.each(['NaN', 'Infinity', '-1', '0', 'abc'])('blocks invalid weight %s', netWeight => {
    expect(validateImportRows([{ ...product, netWeight }], mapping, new Set())[0].status).toBe('error');
  });
  it.each(['null', '{}', '[{}]', '[{"name":"Glass","percentage":101,"recyclable":true}]', 'broken'])('blocks malformed materials %s', materials => {
    expect(validateImportRows([{ ...product, materials }], mapping, new Set())[0].status).toBe('error');
  });
  it.each([null, [], [null], ['text']])('rejects invalid JSON row containers', value => {
    expect(() => normalizeImportJSON(value)).toThrow();
  });
  it('does not treat missing optional GTINs as duplicates', () => {
    expect(validateImportRows([{ ...product, gtin: '' }, { ...product, gtin: '' }], mapping, new Set()).every(row => row.status === 'valid')).toBe(true);
  });
});
