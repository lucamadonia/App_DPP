/**
 * Approximate DHL parcel rates and home-country helpers.
 *
 * Used purely as a UI hint so the user can spot international shipments at
 * a glance and ballpark the postage cost. These are PUBLIC LIST PRICES —
 * real billing depends on the tenant's DHL contract and may be lower.
 */

const EU_ISO2 = new Set([
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR',
  'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO',
  'SE', 'SI', 'SK',
]);

const ISO3_TO_ISO2: Record<string, string> = {
  DEU: 'DE', AUT: 'AT', CHE: 'CH', FRA: 'FR', ITA: 'IT', ESP: 'ES',
  NLD: 'NL', BEL: 'BE', POL: 'PL', CZE: 'CZ', GBR: 'GB', USA: 'US',
  SWE: 'SE', DNK: 'DK', NOR: 'NO', FIN: 'FI', PRT: 'PT', IRL: 'IE',
  LUX: 'LU', HUN: 'HU', ROU: 'RO', BGR: 'BG', HRV: 'HR', SVK: 'SK',
  SVN: 'SI', LTU: 'LT', LVA: 'LV', EST: 'EE', GRC: 'GR', MLT: 'MT',
  CYP: 'CY', LIE: 'LI', ISL: 'IS', CAN: 'CA', AUS: 'AU', NZL: 'NZ',
  JPN: 'JP',
};

const NAME_TO_ISO2: Record<string, string> = {
  DEUTSCHLAND: 'DE', GERMANY: 'DE',
  'ÖSTERREICH': 'AT', OESTERREICH: 'AT', AUSTRIA: 'AT',
  SCHWEIZ: 'CH', SWITZERLAND: 'CH',
  FRANKREICH: 'FR', FRANCE: 'FR',
  ITALIEN: 'IT', ITALY: 'IT',
  SPANIEN: 'ES', SPAIN: 'ES',
  NIEDERLANDE: 'NL', NETHERLANDS: 'NL',
  BELGIEN: 'BE', BELGIUM: 'BE',
  POLEN: 'PL', POLAND: 'PL',
};

/** Normalize any country string ("DE", "DEU", "Deutschland", "Germany") to ISO-2. */
export function normalizeCountryIso2(input?: string | null): string {
  if (!input) return '';
  const trimmed = input.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(trimmed)) return trimmed;
  if (ISO3_TO_ISO2[trimmed]) return ISO3_TO_ISO2[trimmed];
  if (NAME_TO_ISO2[trimmed]) return NAME_TO_ISO2[trimmed];
  return trimmed.slice(0, 2);
}

export function isEUCountry(iso2: string): boolean {
  return EU_ISO2.has(iso2.toUpperCase());
}

/** True if the destination is outside the home country. */
export function isInternational(homeCountry: string, destCountry: string): boolean {
  const a = normalizeCountryIso2(homeCountry);
  const b = normalizeCountryIso2(destCountry);
  return Boolean(a && b && a !== b);
}

/** Three-zone classification for rate lookup. */
export type ShippingZone = 'domestic' | 'eu' | 'world';

export function getShippingZone(homeCountry: string, destCountry: string): ShippingZone {
  const home = normalizeCountryIso2(homeCountry);
  const dest = normalizeCountryIso2(destCountry);
  if (!dest) return 'domestic';
  if (home === dest) return 'domestic';
  if (isEUCountry(dest)) return 'eu';
  return 'world';
}

/**
 * DHL list prices (EUR, gross). Approximate — real prices depend on the
 * tenant's DHL business contract. Always render with a "ca." prefix.
 */
interface RateTier { maxKg: number; price: number }

const DHL_DOMESTIC_DE: RateTier[] = [
  { maxKg: 2, price: 6.99 },
  { maxKg: 5, price: 9.49 },
  { maxKg: 10, price: 14.99 },
  { maxKg: 31.5, price: 21.99 },
];

const DHL_EU: RateTier[] = [
  { maxKg: 2, price: 17.99 },
  { maxKg: 5, price: 24.99 },
  { maxKg: 10, price: 30.99 },
  { maxKg: 20, price: 43.99 },
  { maxKg: 31.5, price: 56.99 },
];

const DHL_WORLD: RateTier[] = [
  { maxKg: 2, price: 28.99 },
  { maxKg: 5, price: 47.99 },
  { maxKg: 10, price: 65.99 },
  { maxKg: 20, price: 110.99 },
  { maxKg: 31.5, price: 159.99 },
];

export interface ShippingRateEstimate {
  zone: ShippingZone;
  product: 'V01PAK' | 'V53WPAK';
  priceEur: number;
  weightKg: number;
  tierMaxKg: number;
}

/**
 * Ballpark the postage. Returns null if weight is missing or out of range
 * (so callers can fall back to "—" gracefully).
 */
export function estimateShippingPrice(
  homeCountry: string,
  destCountry: string,
  weightGrams?: number | null,
): ShippingRateEstimate | null {
  if (!weightGrams || weightGrams <= 0) return null;
  const weightKg = weightGrams / 1000;
  const zone = getShippingZone(homeCountry, destCountry);
  const table = zone === 'domestic' ? DHL_DOMESTIC_DE : zone === 'eu' ? DHL_EU : DHL_WORLD;
  const tier = table.find((t) => weightKg <= t.maxKg);
  if (!tier) return null;
  return {
    zone,
    product: zone === 'domestic' ? 'V01PAK' : 'V53WPAK',
    priceEur: tier.price,
    weightKg,
    tierMaxKg: tier.maxKg,
  };
}

export function formatPriceEur(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}

/** Convert an ISO-2 country code to its regional indicator emoji flag. */
export function countryFlagEmoji(iso2: string): string {
  const code = normalizeCountryIso2(iso2);
  if (code.length !== 2) return '';
  const A = 0x1f1e6;
  return String.fromCodePoint(A + code.charCodeAt(0) - 65, A + code.charCodeAt(1) - 65);
}
