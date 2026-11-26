import { describe, expect, it } from 'vitest';
import { buildCustoms, requiresCustoms } from '../../supabase/functions/dhl-shipping/customs';

describe('requiresCustoms', () => {
  it('is required for non-EU destinations only', () => {
    expect(requiresCustoms('DEU', 'CHE')).toBe(true);
    expect(requiresCustoms('DEU', 'GBR')).toBe(true);
    expect(requiresCustoms('DEU', 'AUT')).toBe(false);
    expect(requiresCustoms('DEU', 'DEU')).toBe(false);
  });
});

describe('buildCustoms', () => {
  const clock = { name: 'Magnetic Clock', quantity: 1, customsValueEur: 39.9, originIso3: 'CHN', unitWeightGrams: 500 };
  const cards = { name: 'Karten-Set', quantity: 1, unitPriceEur: 0, customsValueEur: 12, hsCode: '4901.99.00', originIso3: 'CHN' };

  it('builds a complete block and defaults to commercial goods', () => {
    const result = buildCustoms({ lines: [clock, cards], totalWeightGrams: 1460, postalChargesEur: 9.5 });
    if ('error' in result) throw new Error(result.error);
    expect(result.customs.exportType).toBe('COMMERCIAL_GOODS');
    expect(result.customs.postalCharges).toEqual({ currency: 'EUR', value: 9.5 });
    expect(result.customs.items).toEqual([
      { itemDescription: 'Magnetic Clock', packagedQuantity: 1, itemValue: { currency: 'EUR', value: 39.9 }, itemWeight: { uom: 'kg', value: 0.5 }, countryOfOrigin: 'CHN' },
      // free item falls back to the customs value; missing weight gets the rest
      { itemDescription: 'Karten-Set', packagedQuantity: 1, itemValue: { currency: 'EUR', value: 12 }, itemWeight: { uom: 'kg', value: 0.96 }, countryOfOrigin: 'CHN', hsCode: '49019900' },
    ]);
  });

  it('sends 0.00 postage when no shipping cost is known', () => {
    const result = buildCustoms({ lines: [clock], totalWeightGrams: 600 });
    if ('error' in result) throw new Error(result.error);
    expect(result.customs.postalCharges.value).toBe(0);
  });

  it('never declares more item weight than the parcel weighs', () => {
    const result = buildCustoms({
      lines: [{ ...clock, quantity: 3, unitWeightGrams: 500 }, { ...cards, quantity: 2 }],
      totalWeightGrams: 1000,
    });
    if ('error' in result) throw new Error(result.error);
    const total = result.customs.items.reduce((s, i) => s + i.itemWeight.value * i.packagedQuantity, 0);
    expect(total).toBeLessThanOrEqual(1.0);
    expect(result.customs.items.every(i => i.itemWeight.value > 0)).toBe(true);
  });

  it('names the products that have no value of goods', () => {
    const result = buildCustoms({
      lines: [{ name: 'Magnetic Clock', quantity: 1 }, cards],
      totalWeightGrams: 1460,
    });
    expect('error' in result && result.error).toContain('"Magnetic Clock"');
    expect('error' in result && result.error).not.toContain('Karten-Set');
  });

  it('rejects unknown export types and OTHER without description', () => {
    expect('error' in buildCustoms({ lines: [clock], totalWeightGrams: 600, exportType: 'GIFT' })).toBe(true);
    expect('error' in buildCustoms({ lines: [clock], totalWeightGrams: 600, exportType: 'OTHER' })).toBe(true);
    expect('customs' in buildCustoms({ lines: [clock], totalWeightGrams: 600, exportType: 'PRESENT' })).toBe(true);
  });

  it('drops HS codes that are not 6-11 digits', () => {
    const result = buildCustoms({ lines: [{ ...clock, hsCode: '91' }], totalWeightGrams: 600 });
    if ('error' in result) throw new Error(result.error);
    expect(result.customs.items[0].hsCode).toBeUndefined();
  });
});
