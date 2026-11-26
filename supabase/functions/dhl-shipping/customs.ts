/**
 * Customs declaration (CN23) for DHL Parcel DE Shipping API v2.
 *
 * DHL rejects every order to a destination outside the EU customs territory
 * (CH, GB, NO, US, ...) unless it carries a `customs` block: export type,
 * postage charges and one line per item with description, quantity, value and
 * weight. This module is pure (no Deno / network) so it can be unit-tested.
 */

/** EU member states (ISO-3). Shipments between them need no customs data. */
const EU_ISO3 = new Set([
  'AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU',
  'GRC', 'HUN', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'POL', 'PRT',
  'ROU', 'SVK', 'SVN', 'ESP', 'SWE',
]);

export const DHL_EXPORT_TYPES = [
  'COMMERCIAL_GOODS', 'PRESENT', 'COMMERCIAL_SAMPLE', 'DOCUMENT', 'RETURN_OF_GOODS', 'OTHER',
] as const;
export type DhlExportType = typeof DHL_EXPORT_TYPES[number];

const DESCRIPTION_MAX = 256;

/** True when the route leaves the EU customs territory (e.g. DEU → CHE). */
export function requiresCustoms(shipperIso3: string, consigneeIso3: string): boolean {
  return EU_ISO3.has(shipperIso3) && !EU_ISO3.has(consigneeIso3);
}

export interface CustomsLineInput {
  name: string;
  quantity: number;
  /** Price charged to the recipient per unit (EUR). 0 / null for free items. */
  unitPriceEur?: number | null;
  /** Declared customs value per unit (EUR) from the product master data. */
  customsValueEur?: number | null;
  hsCode?: string | null;
  /** Country of origin, already resolved to ISO-3. Omitted when unknown. */
  originIso3?: string | null;
  /** Weight of one unit in grams. Missing weights get a share of the rest. */
  unitWeightGrams?: number | null;
}

export interface CustomsInput {
  lines: CustomsLineInput[];
  /** Gross weight of the whole parcel in grams (the label weight). */
  totalWeightGrams: number;
  postalChargesEur?: number | null;
  exportType?: string | null;
  exportDescription?: string | null;
}

export interface DhlCustomsItem {
  itemDescription: string;
  packagedQuantity: number;
  itemValue: { currency: 'EUR'; value: number };
  itemWeight: { uom: 'kg'; value: number };
  countryOfOrigin?: string;
  hsCode?: string;
}

export interface DhlCustoms {
  exportType: DhlExportType;
  exportDescription?: string;
  postalCharges: { currency: 'EUR'; value: number };
  items: DhlCustomsItem[];
}

export type CustomsResult = { customs: DhlCustoms } | { error: string };

function positive(n: unknown): number | null {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** Per-unit weights in grams. Units without a known weight share whatever the
 *  parcel weight leaves over; the result is scaled down if it would exceed the
 *  parcel weight, because DHL rejects item weights above the shipment weight. */
function resolveUnitWeights(lines: CustomsLineInput[], totalWeightGrams: number): number[] {
  const qty = lines.map(l => Math.max(1, Math.round(Number(l.quantity) || 1)));
  const known = lines.map(l => positive(l.unitWeightGrams));
  const knownTotal = known.reduce<number>((s, w, i) => s + (w ?? 0) * qty[i], 0);
  const unknownUnits = known.reduce<number>((s, w, i) => s + (w == null ? qty[i] : 0), 0);
  const allUnits = qty.reduce((s, q) => s + q, 0);

  const remaining = totalWeightGrams - knownTotal;
  const share = unknownUnits > 0
    ? (remaining > 0 ? remaining / unknownUnits : totalWeightGrams / allUnits)
    : 0;
  const weights = known.map(w => w ?? share);

  const sum = weights.reduce((s, w, i) => s + w * qty[i], 0);
  const factor = sum > totalWeightGrams && sum > 0 ? totalWeightGrams / sum : 1;
  return weights.map(w => w * factor);
}

export function buildCustoms(input: CustomsInput): CustomsResult {
  const lines = input.lines.filter(l => (Number(l.quantity) || 0) > 0);
  if (lines.length === 0) {
    return { error: 'Customs declaration needs at least one item, but this shipment has no items.' };
  }

  const exportType = (input.exportType || 'COMMERCIAL_GOODS') as DhlExportType;
  if (!DHL_EXPORT_TYPES.includes(exportType)) {
    return { error: `Invalid export type "${input.exportType}". Allowed: ${DHL_EXPORT_TYPES.join(', ')}.` };
  }
  const exportDescription = (input.exportDescription || '').trim();
  if (exportType === 'OTHER' && !exportDescription) {
    return { error: 'Export type OTHER requires a description of the shipment.' };
  }

  const missingValue = lines.filter(l => positive(l.unitPriceEur) == null && positive(l.customsValueEur) == null);
  if (missingValue.length > 0) {
    const names = missingValue.map(l => `"${l.name}"`).join(', ');
    return {
      error: `Customs declaration incomplete: no value of goods for ${names}. `
        + 'Open the product and fill in "Customs Value (EUR)" — customs needs a value above 0 even for free items.',
    };
  }

  const unitWeights = resolveUnitWeights(lines, input.totalWeightGrams);

  const items: DhlCustomsItem[] = lines.map((l, i) => {
    const hs = String(l.hsCode || '').replace(/\D/g, '');
    const item: DhlCustomsItem = {
      itemDescription: l.name.trim().slice(0, DESCRIPTION_MAX),
      packagedQuantity: Math.max(1, Math.round(Number(l.quantity) || 1)),
      itemValue: {
        currency: 'EUR',
        value: Math.round((positive(l.unitPriceEur) ?? positive(l.customsValueEur)!) * 100) / 100,
      },
      // DHL wants kg with 3 decimals and a value above 0. Round down so the
      // item weights never add up to more than the parcel weight.
      itemWeight: { uom: 'kg', value: Math.max(0.001, Math.floor(unitWeights[i]) / 1000) },
    };
    if (l.originIso3) item.countryOfOrigin = l.originIso3;
    if (hs.length >= 6 && hs.length <= 11) item.hsCode = hs;
    return item;
  });

  return {
    customs: {
      exportType,
      ...(exportDescription ? { exportDescription: exportDescription.slice(0, 80) } : {}),
      postalCharges: { currency: 'EUR', value: Math.round((positive(input.postalChargesEur) ?? 0) * 100) / 100 },
      items,
    },
  };
}
