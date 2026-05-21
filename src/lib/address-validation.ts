/**
 * Address Validation — Tier 1 (client-side, free).
 *
 * Pure functions:
 *   validateAddress(addr)     → list of errors/warnings
 *   normalizeAddress(addr)    → trimmed/uppercased postal code, ISO-2 country
 *   formatPostalCode(...)     → country-aware reformatting (e.g. NL "1234AB" → "1234 AB")
 *
 * No external deps. Covers ~80% of typos:
 *   - empty/missing fields
 *   - postal code that doesn't match country format
 *   - unknown ISO country code
 */

export type AddressErrorCode =
  | 'required'
  | 'invalid_postal_code'
  | 'unknown_country'
  | 'too_short';

export interface AddressInput {
  street?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface AddressError {
  field: 'street' | 'city' | 'postalCode' | 'country';
  code: AddressErrorCode;
  /** Translation key (matches public/locales/<lang>/warehouse.json). */
  i18nKey: string;
  /** Substitutions for interpolation (e.g. { country: 'DE', example: '12345' }). */
  i18nParams?: Record<string, string>;
}

export interface AddressValidationResult {
  valid: boolean;
  errors: AddressError[];
  warnings: AddressError[];
  /** Trimmed and (where applicable) reformatted. Empty string for missing fields. */
  normalized: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

/**
 * Postal-code patterns keyed by ISO-2 country code.
 * Patterns are intentionally simple — they catch the common shape, not every
 * historical exception. Source: Universal Postal Union references.
 */
const POSTAL_PATTERNS: Record<string, { pattern: RegExp; example: string }> = {
  DE: { pattern: /^\d{5}$/, example: '12345' },
  AT: { pattern: /^\d{4}$/, example: '1010' },
  CH: { pattern: /^\d{4}$/, example: '8000' },
  LI: { pattern: /^\d{4}$/, example: '9490' },
  NL: { pattern: /^\d{4} ?[A-Z]{2}$/i, example: '1234 AB' },
  BE: { pattern: /^\d{4}$/, example: '1000' },
  LU: { pattern: /^\d{4}$/, example: '1234' },
  FR: { pattern: /^\d{5}$/, example: '75001' },
  IT: { pattern: /^\d{5}$/, example: '00100' },
  ES: { pattern: /^\d{5}$/, example: '28001' },
  PT: { pattern: /^\d{4}-\d{3}$/, example: '1000-001' },
  DK: { pattern: /^\d{4}$/, example: '1050' },
  SE: { pattern: /^\d{3} ?\d{2}$/, example: '111 22' },
  NO: { pattern: /^\d{4}$/, example: '0010' },
  FI: { pattern: /^\d{5}$/, example: '00100' },
  IS: { pattern: /^\d{3}$/, example: '101' },
  PL: { pattern: /^\d{2}-\d{3}$/, example: '00-001' },
  CZ: { pattern: /^\d{3} ?\d{2}$/, example: '110 00' },
  SK: { pattern: /^\d{3} ?\d{2}$/, example: '811 01' },
  HU: { pattern: /^\d{4}$/, example: '1011' },
  RO: { pattern: /^\d{6}$/, example: '010101' },
  BG: { pattern: /^\d{4}$/, example: '1000' },
  GR: { pattern: /^\d{3} ?\d{2}$/, example: '104 31' },
  HR: { pattern: /^\d{5}$/, example: '10000' },
  SI: { pattern: /^\d{4}$/, example: '1000' },
  EE: { pattern: /^\d{5}$/, example: '10111' },
  LV: { pattern: /^LV-?\d{4}$/i, example: 'LV-1050' },
  LT: { pattern: /^(LT-?)?\d{5}$/i, example: 'LT-01100' },
  IE: { pattern: /^[A-Z]\d{2} ?[A-Z\d]{4}$/i, example: 'D02 XY45' },
  GB: { pattern: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, example: 'SW1A 1AA' },
  US: { pattern: /^\d{5}(-\d{4})?$/, example: '10001' },
  CA: { pattern: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i, example: 'K1A 0B1' },
  AU: { pattern: /^\d{4}$/, example: '2000' },
  NZ: { pattern: /^\d{4}$/, example: '6011' },
  JP: { pattern: /^\d{3}-?\d{4}$/, example: '100-0001' },
  CN: { pattern: /^\d{6}$/, example: '100000' },
  IN: { pattern: /^\d{6}$/, example: '110001' },
  BR: { pattern: /^\d{5}-?\d{3}$/, example: '01310-100' },
  MX: { pattern: /^\d{5}$/, example: '01000' },
  TR: { pattern: /^\d{5}$/, example: '06450' },
  RU: { pattern: /^\d{6}$/, example: '101000' },
  UA: { pattern: /^\d{5}$/, example: '01001' },
  ZA: { pattern: /^\d{4}$/, example: '8001' },
  AE: { pattern: /^.*$/, example: '' }, // UAE has no postal code
};

/** Country aliases we silently rewrite to ISO-2. */
const COUNTRY_ALIASES: Record<string, string> = {
  // German names
  DEUTSCHLAND: 'DE',
  DEUTSCHL: 'DE',
  GERMANY: 'DE',
  ÖSTERREICH: 'AT',
  OESTERREICH: 'AT',
  AUSTRIA: 'AT',
  SCHWEIZ: 'CH',
  SUISSE: 'CH',
  SVIZZERA: 'CH',
  SWITZERLAND: 'CH',
  NIEDERLANDE: 'NL',
  NETHERLANDS: 'NL',
  HOLLAND: 'NL',
  BELGIEN: 'BE',
  BELGIUM: 'BE',
  FRANKREICH: 'FR',
  FRANCE: 'FR',
  ITALIEN: 'IT',
  ITALY: 'IT',
  SPANIEN: 'ES',
  SPAIN: 'ES',
  PORTUGAL: 'PT',
  POLEN: 'PL',
  POLAND: 'PL',
  GROSSBRITANNIEN: 'GB',
  'GROßBRITANNIEN': 'GB',
  UK: 'GB',
  'UNITED KINGDOM': 'GB',
  ENGLAND: 'GB',
  USA: 'US',
  'UNITED STATES': 'US',
  AMERICA: 'US',
  KANADA: 'CA',
  CANADA: 'CA',
  JAPAN: 'JP',
  CHINA: 'CN',
  INDIEN: 'IN',
  INDIA: 'IN',
};

/** Normalizes a country string to ISO-2 uppercase, or returns null if unknown. */
export function normalizeCountry(input?: string | null): string | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;
  if (s.length === 2 && /^[A-Z]{2}$/i.test(s)) return s.toUpperCase();
  const upper = s.toUpperCase();
  return COUNTRY_ALIASES[upper] || (POSTAL_PATTERNS[upper] ? upper : null);
}

/** Cleans up a postal code (trim, collapse whitespace, uppercase letters). */
export function normalizePostalCode(input?: string | null, country?: string | null): string {
  if (!input) return '';
  let s = input.trim().toUpperCase().replace(/\s+/g, ' ');
  // Country-specific reformatting: NL "1234AB" → "1234 AB", CA "K1A0B1" → "K1A 0B1"
  const iso = normalizeCountry(country || '');
  if (iso === 'NL' && /^\d{4}[A-Z]{2}$/.test(s)) s = `${s.slice(0, 4)} ${s.slice(4)}`;
  if (iso === 'CA' && /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(s)) s = `${s.slice(0, 3)} ${s.slice(3)}`;
  if (iso === 'GB' && /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(s)) {
    const inwardStart = s.length - 3;
    s = `${s.slice(0, inwardStart)} ${s.slice(inwardStart)}`;
  }
  return s;
}

/** Light cleanup for street + city: trim, collapse internal whitespace. */
function tidy(input?: string | null): string {
  if (!input) return '';
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Format-level validation. Returns errors (must-fix) and warnings (suspicious
 * but allowed). The caller decides whether to block submission on warnings.
 */
export function validateAddress(addr: AddressInput): AddressValidationResult {
  const errors: AddressError[] = [];
  const warnings: AddressError[] = [];

  const street = tidy(addr.street);
  const city = tidy(addr.city);
  const country = normalizeCountry(addr.country) || (addr.country ? addr.country.toUpperCase() : '');
  const postalCode = normalizePostalCode(addr.postalCode, country);

  // Required fields
  if (!street) errors.push({ field: 'street', code: 'required', i18nKey: 'Street is required' });
  if (!city) errors.push({ field: 'city', code: 'required', i18nKey: 'City is required' });
  if (!postalCode) errors.push({ field: 'postalCode', code: 'required', i18nKey: 'Postal code is required' });
  if (!country) errors.push({ field: 'country', code: 'required', i18nKey: 'Country is required' });

  // Length sanity
  if (street && street.length < 3) warnings.push({ field: 'street', code: 'too_short', i18nKey: 'Street looks too short' });
  if (city && city.length < 2) warnings.push({ field: 'city', code: 'too_short', i18nKey: 'City looks too short' });

  // Country recognition
  if (country && !POSTAL_PATTERNS[country] && country.length === 2) {
    warnings.push({
      field: 'country',
      code: 'unknown_country',
      i18nKey: 'Unknown country code',
      i18nParams: { country },
    });
  } else if (country && country.length !== 2) {
    errors.push({
      field: 'country',
      code: 'unknown_country',
      i18nKey: 'Country must be a 2-letter ISO code',
      i18nParams: { country },
    });
  }

  // Postal-code format (only if both country and postalCode are present)
  if (postalCode && country && POSTAL_PATTERNS[country]) {
    const { pattern, example } = POSTAL_PATTERNS[country];
    if (!pattern.test(postalCode)) {
      errors.push({
        field: 'postalCode',
        code: 'invalid_postal_code',
        i18nKey: 'Invalid postal code for {{country}} (e.g. {{example}})',
        i18nParams: { country, example },
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalized: { street, city, postalCode, country },
  };
}

/** Convenience: true iff validateAddress returns no errors. Warnings allowed. */
export function isAddressValid(addr: AddressInput): boolean {
  return validateAddress(addr).valid;
}
