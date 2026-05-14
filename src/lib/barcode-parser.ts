/**
 * Barcode Parser
 * Parses GS1 Digital Link URLs, EAN-13, EAN-8, DPP URLs into structured data
 */

export type BarcodeType = 'gs1_digital_link' | 'gs1_ai' | 'dpp_url' | 'ean13' | 'gtin14' | 'ean8' | 'serial_lookup' | 'unknown';

export interface ParsedBarcode {
  type: BarcodeType;
  gtin: string;
  /**
   * All plausible normalizations of the scanned GTIN. Lookups should match
   * against any of these (products may be stored as EAN-13 or GTIN-14).
   */
  gtinCandidates: string[];
  serial?: string;
  rawValue: string;
}

// GS1 Digital Link: ...domain.../01/{gtin}/21/{serial}
const GS1_PATTERN = /\/01\/(\d{8,14})\/21\/([^\s/?#]+)/;

// DPP URL: ...domain.../p/{gtin}/{serial}
const DPP_PATTERN = /\/p\/(\d{8,14})\/([^\s/?#]+)/;

// Pure EAN-13 (13 digits)
const EAN13_PATTERN = /^\d{13}$/;

// Pure EAN-8 (8 digits)
const EAN8_PATTERN = /^\d{8}$/;

// Pure GTIN-14 / ITF-14 (14 digits)
const GTIN14_PATTERN = /^\d{14}$/;

// GS1-128 raw AI string: starts with "01" + 14-digit GTIN (16 digits total).
// Optional further AIs (10/17/21) are not yet decoded — we only need the GTIN.
const GS1_AI_GTIN_PATTERN = /^01(\d{14})/;

/**
 * Build all plausible lookup forms for a scanned GTIN.
 * Products in the DB may be stored as EAN-13 (most common) or GTIN-14.
 * For a GTIN-14 with leading 0, the EAN-13 is the trailing 13 digits.
 * For a GTIN-14 with indicator 1–9 (case/carton ITF-14), we still expose
 * the trailing 13 digits as a candidate — many tenants store the consumer
 * EAN-13 with the same body, so this lets the lookup recover.
 */
function buildGtinCandidates(gtin: string): string[] {
  const set = new Set<string>();
  if (!gtin) return [];
  set.add(gtin);
  if (gtin.length === 14) {
    // Standard: drop the indicator digit to recover the consumer EAN-13.
    set.add(gtin.slice(1));
    // Common manufacturer convention: GTIN-14 = EAN-13 + trailing pack digit.
    // Recover EAN-13 by taking the first 13 digits.
    set.add(gtin.slice(0, 13));
  }
  if (gtin.length === 13) {
    set.add('0' + gtin); // pad to GTIN-14 (standard)
    set.add(gtin + '0'); // GTIN-14 = EAN-13 + trailing digit (non-standard variant)
  }
  if (gtin.length === 8) {
    set.add(gtin.padStart(13, '0'));
    set.add(gtin.padStart(14, '0'));
  }
  return Array.from(set);
}

export function parseBarcode(raw: string): ParsedBarcode {
  const trimmed = raw.trim();

  // GS1 Digital Link
  const gs1Match = trimmed.match(GS1_PATTERN);
  if (gs1Match) {
    const gtin = gs1Match[1].padStart(13, '0');
    return {
      type: 'gs1_digital_link',
      gtin,
      gtinCandidates: buildGtinCandidates(gtin),
      serial: decodeURIComponent(gs1Match[2]),
      rawValue: trimmed,
    };
  }

  // DPP URL
  const dppMatch = trimmed.match(DPP_PATTERN);
  if (dppMatch) {
    const gtin = dppMatch[1].padStart(13, '0');
    return {
      type: 'dpp_url',
      gtin,
      gtinCandidates: buildGtinCandidates(gtin),
      serial: decodeURIComponent(dppMatch[2]),
      rawValue: trimmed,
    };
  }

  // GS1-128 raw with Application Identifier "01" + 14-digit GTIN.
  // Emitted by many hardware scanners reading ITF-14 / DataMatrix on cartons.
  const aiMatch = trimmed.match(GS1_AI_GTIN_PATTERN);
  if (aiMatch) {
    const gtin14 = aiMatch[1];
    return {
      type: 'gs1_ai',
      gtin: gtin14,
      gtinCandidates: buildGtinCandidates(gtin14),
      rawValue: trimmed,
    };
  }

  // EAN-13
  if (EAN13_PATTERN.test(trimmed)) {
    return {
      type: 'ean13',
      gtin: trimmed,
      gtinCandidates: buildGtinCandidates(trimmed),
      rawValue: trimmed,
    };
  }

  // GTIN-14 / ITF-14 (bare 14 digits, no AI prefix)
  if (GTIN14_PATTERN.test(trimmed)) {
    return {
      type: 'gtin14',
      gtin: trimmed,
      gtinCandidates: buildGtinCandidates(trimmed),
      rawValue: trimmed,
    };
  }

  // EAN-8 → pad to 13 digits
  if (EAN8_PATTERN.test(trimmed)) {
    return {
      type: 'ean8',
      gtin: trimmed.padStart(13, '0'),
      gtinCandidates: buildGtinCandidates(trimmed),
      rawValue: trimmed,
    };
  }

  // Fallback: treat as serial number for direct lookup
  if (trimmed.length >= 3) {
    return {
      type: 'serial_lookup',
      gtin: '',
      gtinCandidates: [],
      serial: trimmed,
      rawValue: trimmed,
    };
  }

  return {
    type: 'unknown',
    gtin: '',
    gtinCandidates: [],
    rawValue: trimmed,
  };
}
