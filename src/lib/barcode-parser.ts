/**
 * Barcode Parser
 * Parses GS1 Digital Link URLs, EAN-13, EAN-8, DPP URLs into structured data
 */

export type BarcodeType = 'gs1_digital_link' | 'dpp_url' | 'ean13' | 'ean8' | 'serial_lookup' | 'unknown';

export interface ParsedBarcode {
  type: BarcodeType;
  gtin: string;
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

export function parseBarcode(raw: string): ParsedBarcode {
  const trimmed = raw.trim();

  // GS1 Digital Link
  const gs1Match = trimmed.match(GS1_PATTERN);
  if (gs1Match) {
    return {
      type: 'gs1_digital_link',
      gtin: gs1Match[1].padStart(13, '0'),
      serial: decodeURIComponent(gs1Match[2]),
      rawValue: trimmed,
    };
  }

  // DPP URL
  const dppMatch = trimmed.match(DPP_PATTERN);
  if (dppMatch) {
    return {
      type: 'dpp_url',
      gtin: dppMatch[1].padStart(13, '0'),
      serial: decodeURIComponent(dppMatch[2]),
      rawValue: trimmed,
    };
  }

  // EAN-13
  if (EAN13_PATTERN.test(trimmed)) {
    return {
      type: 'ean13',
      gtin: trimmed,
      rawValue: trimmed,
    };
  }

  // EAN-8 → pad to 13 digits
  if (EAN8_PATTERN.test(trimmed)) {
    return {
      type: 'ean8',
      gtin: trimmed.padStart(13, '0'),
      rawValue: trimmed,
    };
  }

  // Fallback: treat as serial number for direct lookup
  if (trimmed.length >= 3) {
    return {
      type: 'serial_lookup',
      gtin: '',
      serial: trimmed,
      rawValue: trimmed,
    };
  }

  return {
    type: 'unknown',
    gtin: '',
    rawValue: trimmed,
  };
}
