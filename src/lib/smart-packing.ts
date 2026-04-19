/**
 * Smart Packing — Carrier & Package Rule Engine
 *
 * Encodes packaging rules from the Kurier_Verpackungsregeln_Europa_v2.xlsx:
 *   - 23 carriers with multiple services each
 *   - Per-carrier girth formulas (L+2B+2H, longest+2(B+H), sum-of-3, etc.)
 *   - Minimum label dimensions, maximum weight/length, oversize (Sperrgut)
 *   - Volumetric weight divisors
 *   - Forbidden / restricted contents per carrier
 *   - EU PPWR 2026/2028 compliance timeline
 *   - Country zones, VAT, Drittland detection, customs forms (CN22/CN23/EUR.1)
 *   - Price matrices (2/5/10/20/30 kg across ~60 routes)
 *   - Transit times, surcharges, Incoterm recommendations
 *
 * Pure functions — no API calls, no React imports.
 */

import {
  COUNTRY_ZONES,
  ROUTE_PRICES,
  SURCHARGES,
  TRANSIT_TIMES_FROM_DE,
  INCOTERMS,
  type CountryZone,
  type SurchargeRule,
  type Incoterm,
  type CarrierPriceKey,
} from './smart-packing-data';

export { COUNTRY_ZONES, SURCHARGES, INCOTERMS };
export type { CountryZone, SurchargeRule, Incoterm };

// ─── Types ──────────────────────────────────────────────────────

export type GirthKind =
  | 'none' // carrier ignores girth (DHL Paket DE up to 120, Hermes, Swiss Post, etc.)
  | 'l_plus_2b_2h' // Länge + 2×Breite + 2×Höhe (DHL/DPD/UPS/Evri/Colissimo)
  | 'l_plus_2_bh' // Länge + 2×(Breite + Höhe) (FedEx)
  | 'longest_plus_2bh' // Längste + 2×(Breite + Höhe) (GLS)
  | 'sum_3' // L + B + H (Poste Italiane, Correos, PostNL Small)
  | 'perimeter_only' // 2×(B + H) (DPD Small)
  | 'l_plus_girth'; // L + Umfang (Österr. Post, PostNord)

export type ContentCategory =
  | 'cash'
  | 'jewelry'
  | 'weapons'
  | 'drugs'
  | 'alcohol'
  | 'lithium_battery'
  | 'live_animal'
  | 'perishable'
  | 'fragrance'
  | 'tobacco'
  | 'magnets'
  | 'fragile'
  | 'dry_ice'
  | 'artwork_high_value';

export type ContentPolicy =
  | 'forbidden'
  | 'permit_required'
  | 'b2b_only'
  | 'value_insurance_only'
  | 'surface_only' // no air transport
  | 'express_only'
  | 'special_handling'
  | 'allowed';

export interface CarrierService {
  id: string;
  carrier: string;
  service: string;
  region: string;
  maxWeightKg: number;
  minDim?: { l: number; w: number; h: number };
  maxDim?: { l: number; w: number; h: number };
  maxLengthCm?: number;
  girth?: { kind: GirthKind; maxCm: number };
  volumetricDivisor?: number; // cm³ per kg — null/undefined → not applied
  oversizeThresholdKg?: number;
  oversizeSurcharge?: string;
  priceFromEur?: number;
  contentPolicy?: Partial<Record<ContentCategory, ContentPolicy>>;
  notes?: string;
}

export interface PackageInput {
  /** Outer carton dimensions in cm. */
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  /** Gross weight in kg (contents + packaging). */
  weightKg: number;
  /** Shipping destination ISO-2 country code, e.g. 'DE', 'FR'. */
  destinationCountry?: string;
  /** Content category flags triggered by the order contents. */
  contents?: ContentCategory[];
}

export type ViolationLevel = 'hard_fail' | 'warning' | 'info';

export interface CarrierViolation {
  level: ViolationLevel;
  code: string;
  message: string;
}

export interface CarrierMatch {
  service: CarrierService;
  /** If any hard_fail present, the carrier CANNOT ship this package. */
  status: 'ok' | 'warning' | 'blocked';
  violations: CarrierViolation[];
  /** Girth value computed for display, or null if carrier has no girth rule. */
  girthCm: number | null;
  /** Volumetric weight in kg, or null if carrier doesn't apply. */
  volumetricWeightKg: number | null;
  /** Max(actual, volumetric) — what the carrier will actually bill. */
  chargeableWeightKg: number;
}

// ─── Girth formulas ────────────────────────────────────────────

export function computeGirth(
  kind: GirthKind,
  l: number,
  w: number,
  h: number,
): number | null {
  // Sort descending: longest first
  const sorted = [l, w, h].sort((a, b) => b - a);
  const [longest, mid, shortest] = sorted;
  switch (kind) {
    case 'none':
      return null;
    case 'l_plus_2b_2h':
      return longest + 2 * mid + 2 * shortest;
    case 'l_plus_2_bh':
      return longest + 2 * (mid + shortest);
    case 'longest_plus_2bh':
      return longest + 2 * (mid + shortest); // same math, semantically different
    case 'sum_3':
      return l + w + h;
    case 'perimeter_only':
      return 2 * mid + 2 * shortest;
    case 'l_plus_girth':
      return longest + 2 * mid + 2 * shortest;
  }
}

// ─── EU PPWR Deadlines ─────────────────────────────────────────

export interface PpwrDeadline {
  date: string;
  description: string;
}

export const PPWR_DEADLINES: PpwrDeadline[] = [
  { date: '2026-08-12', description: 'PPWR in force; E-commerce packages max 50% void fill; conformity declaration mandatory.' },
  { date: '2028-08-12', description: 'Harmonised recycling label with material & sorting info mandatory on all packaging.' },
  { date: '2029-01-01', description: 'Deposit scheme for PET bottles & aluminum cans (90% collection target).' },
  { date: '2030-01-01', description: 'Minimum recycled content in plastic packaging; single-use plastics ban.' },
];

export function upcomingPpwrDeadlines(now: Date = new Date()): PpwrDeadline[] {
  return PPWR_DEADLINES.filter((d) => new Date(d.date).getTime() >= now.getTime());
}

// ─── Carrier Service Catalog ────────────────────────────────────

export const CARRIER_SERVICES: CarrierService[] = [
  // ── DHL Germany ────────────────────────────────────────────
  {
    id: 'dhl_warenpost_xs',
    carrier: 'DHL',
    service: 'Warenpost XS',
    region: 'DE',
    maxWeightKg: 0.5,
    minDim: { l: 14, w: 9, h: 0.1 },
    maxDim: { l: 35, w: 25, h: 1 },
    priceFromEur: 2.1,
  },
  {
    id: 'dhl_paeckchen_s',
    carrier: 'DHL',
    service: 'Päckchen S',
    region: 'DE',
    maxWeightKg: 2,
    minDim: { l: 15, w: 11, h: 1 },
    maxDim: { l: 35, w: 25, h: 10 },
    priceFromEur: 3.99,
  },
  {
    id: 'dhl_paeckchen_m',
    carrier: 'DHL',
    service: 'Päckchen M',
    region: 'DE',
    maxWeightKg: 2,
    minDim: { l: 15, w: 11, h: 1 },
    maxDim: { l: 60, w: 30, h: 15 },
    priceFromEur: 4.99,
  },
  {
    id: 'dhl_paket_2kg',
    carrier: 'DHL',
    service: 'Paket 2 kg',
    region: 'DE',
    maxWeightKg: 2,
    minDim: { l: 15, w: 11, h: 1 },
    maxDim: { l: 60, w: 30, h: 15 },
    priceFromEur: 5.49,
  },
  {
    id: 'dhl_paket_5kg',
    carrier: 'DHL',
    service: 'Paket 5 kg',
    region: 'DE',
    maxWeightKg: 5,
    minDim: { l: 15, w: 11, h: 1 },
    maxDim: { l: 120, w: 60, h: 60 },
    priceFromEur: 6.99,
  },
  {
    id: 'dhl_paket_10kg',
    carrier: 'DHL',
    service: 'Paket 10 kg',
    region: 'DE',
    maxWeightKg: 10,
    minDim: { l: 15, w: 11, h: 1 },
    maxDim: { l: 120, w: 60, h: 60 },
    priceFromEur: 10.49,
  },
  {
    id: 'dhl_paket_315kg',
    carrier: 'DHL',
    service: 'Paket 31,5 kg',
    region: 'DE',
    maxWeightKg: 31.5,
    minDim: { l: 15, w: 11, h: 1 },
    maxDim: { l: 120, w: 60, h: 60 },
    oversizeThresholdKg: 31.5,
    oversizeSurcharge: '+26 € Sperrgut bei >120×60×60 cm oder nicht quaderförmig',
    priceFromEur: 19.99,
    contentPolicy: {
      cash: 'forbidden',
      weapons: 'forbidden',
      drugs: 'forbidden',
      live_animal: 'forbidden',
      lithium_battery: 'special_handling',
      alcohol: 'b2b_only',
    },
  },
  {
    id: 'dhl_express',
    carrier: 'DHL Express',
    service: 'Weltweit',
    region: 'Worldwide',
    maxWeightKg: 70,
    maxDim: { l: 120, w: 80, h: 80 },
    volumetricDivisor: 5000,
    contentPolicy: { cash: 'forbidden', weapons: 'forbidden', drugs: 'forbidden', live_animal: 'forbidden' },
  },
  // ── Hermes / Evri ──────────────────────────────────────────
  {
    id: 'hermes_xs',
    carrier: 'Hermes',
    service: 'XS (bis L+B+H 37,5 cm)',
    region: 'DE',
    maxWeightKg: 25,
    maxDim: { l: 30, w: 15, h: 15 },
  },
  {
    id: 'hermes_s',
    carrier: 'Hermes',
    service: 'S (bis L+B+H 50 cm)',
    region: 'DE',
    maxWeightKg: 25,
    maxDim: { l: 50, w: 25, h: 25 },
  },
  {
    id: 'hermes_m',
    carrier: 'Hermes',
    service: 'M (bis L+B+H 75 cm)',
    region: 'DE',
    maxWeightKg: 25,
    maxDim: { l: 75, w: 35, h: 35 },
  },
  {
    id: 'hermes_l',
    carrier: 'Hermes',
    service: 'L (bis 120 cm)',
    region: 'DE',
    maxWeightKg: 25,
    maxDim: { l: 120, w: 60, h: 60 },
    maxLengthCm: 120,
  },
  {
    id: 'hermes_xl',
    carrier: 'Hermes',
    service: 'XL (Langpaket)',
    region: 'DE',
    maxWeightKg: 25,
    maxDim: { l: 175, w: 50, h: 50 },
    maxLengthCm: 175,
    girth: { kind: 'l_plus_2b_2h', maxCm: 310 },
  },
  {
    id: 'evri_uk',
    carrier: 'Evri',
    service: 'UK Standard',
    region: 'UK',
    maxWeightKg: 15,
    maxLengthCm: 120,
    girth: { kind: 'l_plus_2b_2h', maxCm: 245 },
  },
  // ── DPD ────────────────────────────────────────────────────
  {
    id: 'dpd_parcelletter',
    carrier: 'DPD',
    service: 'Parcelletter',
    region: 'EU',
    maxWeightKg: 1,
    maxDim: { l: 36, w: 26, h: 3 },
  },
  {
    id: 'dpd_small',
    carrier: 'DPD',
    service: 'Small',
    region: 'EU',
    maxWeightKg: 3,
    maxLengthCm: 50,
    girth: { kind: 'perimeter_only', maxCm: 111 },
  },
  {
    id: 'dpd_classic',
    carrier: 'DPD',
    service: 'Classic',
    region: 'EU',
    maxWeightKg: 31.5,
    maxLengthCm: 175,
    girth: { kind: 'l_plus_2b_2h', maxCm: 300 },
    volumetricDivisor: 6000,
    contentPolicy: { cash: 'forbidden', weapons: 'forbidden', alcohol: 'b2b_only' },
  },
  {
    id: 'dpd_lockers',
    carrier: 'DPD',
    service: 'Lockers',
    region: 'EU',
    maxWeightKg: 20,
    maxLengthCm: 72,
    girth: { kind: 'l_plus_2b_2h', maxCm: 278 },
  },
  // ── GLS ────────────────────────────────────────────────────
  {
    id: 'gls_business_eu',
    carrier: 'GLS',
    service: 'Business Parcel EU',
    region: 'EU',
    maxWeightKg: 31.5,
    maxDim: { l: 200, w: 80, h: 60 },
    maxLengthCm: 200,
    girth: { kind: 'longest_plus_2bh', maxCm: 300 },
    volumetricDivisor: 5000,
  },
  {
    id: 'gls_international',
    carrier: 'GLS',
    service: 'International',
    region: 'Worldwide',
    maxWeightKg: 40,
    maxDim: { l: 120, w: 80, h: 80 },
    girth: { kind: 'longest_plus_2bh', maxCm: 300 },
    volumetricDivisor: 5000,
  },
  {
    id: 'gls_parcel_shop',
    carrier: 'GLS',
    service: 'Parcel Shop',
    region: 'EU',
    maxWeightKg: 20,
    maxDim: { l: 200, w: 80, h: 60 },
    maxLengthCm: 200,
    girth: { kind: 'longest_plus_2bh', maxCm: 300 },
  },
  // ── UPS ─────────────────────────────────────────────────────
  {
    id: 'ups_standard',
    carrier: 'UPS',
    service: 'Standard',
    region: 'EU/Worldwide',
    maxWeightKg: 70,
    maxLengthCm: 274,
    girth: { kind: 'l_plus_2b_2h', maxCm: 400 },
    volumetricDivisor: 5000,
    notes: 'Heavy-Package-Label Pflicht ab 25 kg (EU).',
  },
  {
    id: 'ups_next_day',
    carrier: 'UPS',
    service: 'Next Day',
    region: 'EU',
    maxWeightKg: 30,
    maxLengthCm: 150,
    girth: { kind: 'l_plus_2b_2h', maxCm: 330 },
    volumetricDivisor: 5000,
  },
  // ── FedEx / TNT ─────────────────────────────────────────────
  {
    id: 'fedex_economy',
    carrier: 'FedEx',
    service: 'Regional Economy EU',
    region: 'EU',
    maxWeightKg: 68,
    maxLengthCm: 274,
    girth: { kind: 'l_plus_2_bh', maxCm: 330 },
    volumetricDivisor: 5000,
  },
  {
    id: 'fedex_intl_priority',
    carrier: 'FedEx',
    service: 'International Priority',
    region: 'Worldwide',
    maxWeightKg: 68,
    maxLengthCm: 274,
    girth: { kind: 'l_plus_2_bh', maxCm: 330 },
    volumetricDivisor: 5000,
  },
  {
    id: 'tnt_economy',
    carrier: 'TNT (FedEx)',
    service: 'Economy Express',
    region: 'EU',
    maxWeightKg: 70,
    maxDim: { l: 240, w: 120, h: 150 },
    maxLengthCm: 240,
    girth: { kind: 'l_plus_2_bh', maxCm: 330 },
    volumetricDivisor: 5000,
  },
  // ── National posts ─────────────────────────────────────────
  {
    id: 'royalmail_small',
    carrier: 'Royal Mail',
    service: 'Small Parcel',
    region: 'UK',
    maxWeightKg: 2,
    maxDim: { l: 45, w: 35, h: 16 },
  },
  {
    id: 'royalmail_medium',
    carrier: 'Royal Mail',
    service: 'Medium Parcel',
    region: 'UK',
    maxWeightKg: 20,
    maxDim: { l: 61, w: 46, h: 46 },
  },
  {
    id: 'postnl_small',
    carrier: 'PostNL',
    service: 'Small',
    region: 'NL',
    maxWeightKg: 23,
    girth: { kind: 'sum_3', maxCm: 90 },
  },
  {
    id: 'postnl_large',
    carrier: 'PostNL',
    service: 'Large',
    region: 'NL',
    maxWeightKg: 30,
    maxDim: { l: 175, w: 78, h: 58 },
    volumetricDivisor: 5000,
  },
  {
    id: 'colissimo',
    carrier: 'Colissimo',
    service: 'France',
    region: 'FR',
    maxWeightKg: 30,
    maxLengthCm: 100,
    girth: { kind: 'l_plus_2b_2h', maxCm: 200 },
  },
  {
    id: 'chronopost',
    carrier: 'Chronopost',
    service: 'Express FR',
    region: 'FR',
    maxWeightKg: 30,
    maxDim: { l: 150, w: 60, h: 50 },
    girth: { kind: 'l_plus_2b_2h', maxCm: 300 },
  },
  {
    id: 'swiss_post',
    carrier: 'Swiss Post',
    service: 'PostPac',
    region: 'CH',
    maxWeightKg: 30,
    maxDim: { l: 100, w: 60, h: 60 },
  },
  {
    id: 'ostr_post',
    carrier: 'Österr. Post',
    service: 'Standard',
    region: 'AT',
    maxWeightKg: 31.5,
    maxDim: { l: 100, w: 60, h: 60 },
    girth: { kind: 'l_plus_girth', maxCm: 360 },
  },
  {
    id: 'poste_italiane',
    carrier: 'Poste Italiane',
    service: 'Standard',
    region: 'IT',
    maxWeightKg: 30,
    maxLengthCm: 150,
    girth: { kind: 'sum_3', maxCm: 225 },
    minDim: { l: 20, w: 11, h: 0 },
  },
  {
    id: 'bpost',
    carrier: 'Bpost',
    service: 'Pakje',
    region: 'BE',
    maxWeightKg: 30,
    maxDim: { l: 150, w: 60, h: 60 },
  },
  {
    id: 'correos',
    carrier: 'Correos',
    service: 'Paq Standard',
    region: 'ES',
    maxWeightKg: 30,
    maxLengthCm: 150,
    girth: { kind: 'sum_3', maxCm: 210 },
  },
  {
    id: 'ctt_portugal',
    carrier: 'CTT Portugal',
    service: 'Standard',
    region: 'PT',
    maxWeightKg: 30,
    maxDim: { l: 150, w: 60, h: 60 },
  },
  {
    id: 'postnord',
    carrier: 'PostNord',
    service: 'Standard',
    region: 'SE/DK/NO/FI',
    maxWeightKg: 35,
    maxDim: { l: 150, w: 60, h: 60 },
    girth: { kind: 'l_plus_girth', maxCm: 300 },
  },
  {
    id: 'inpost_locker',
    carrier: 'InPost',
    service: 'Locker (Size C)',
    region: 'PL/EU',
    maxWeightKg: 25,
    maxDim: { l: 64, w: 38, h: 41 },
    maxLengthCm: 80,
  },
];

// ─── Carrier region filtering ──────────────────────────────────

/** Rough mapping of ISO-2 country code → which carrier regions serve it. */
const COUNTRY_TO_REGIONS: Record<string, string[]> = {
  DE: ['DE', 'EU', 'EU/Worldwide', 'Worldwide'],
  AT: ['AT', 'EU', 'EU/Worldwide', 'Worldwide'],
  CH: ['CH', 'EU', 'EU/Worldwide', 'Worldwide'],
  FR: ['FR', 'EU', 'EU/Worldwide', 'Worldwide'],
  NL: ['NL', 'EU', 'EU/Worldwide', 'Worldwide'],
  BE: ['BE', 'EU', 'EU/Worldwide', 'Worldwide'],
  IT: ['IT', 'EU', 'EU/Worldwide', 'Worldwide'],
  ES: ['ES', 'EU', 'EU/Worldwide', 'Worldwide'],
  PT: ['PT', 'EU', 'EU/Worldwide', 'Worldwide'],
  GB: ['UK', 'EU/Worldwide', 'Worldwide'],
  SE: ['SE/DK/NO/FI', 'EU', 'Worldwide'],
  DK: ['SE/DK/NO/FI', 'EU', 'Worldwide'],
  NO: ['SE/DK/NO/FI', 'Worldwide'],
  FI: ['SE/DK/NO/FI', 'EU', 'Worldwide'],
  PL: ['PL/EU', 'EU', 'Worldwide'],
};

function serviceCoversCountry(service: CarrierService, country?: string): boolean {
  if (!country) return true;
  const upper = country.toUpperCase();
  const regions = COUNTRY_TO_REGIONS[upper] ?? ['EU', 'EU/Worldwide', 'Worldwide'];
  return regions.includes(service.region);
}

// ─── Core matcher ──────────────────────────────────────────────

export function matchCarrierServices(pkg: PackageInput): CarrierMatch[] {
  const { lengthCm, widthCm, heightCm, weightKg, destinationCountry, contents = [] } = pkg;
  const sortedDims = [lengthCm, widthCm, heightCm].sort((a, b) => b - a);
  const [longest, mid, shortest] = sortedDims;

  const matches: CarrierMatch[] = [];

  for (const service of CARRIER_SERVICES) {
    if (!serviceCoversCountry(service, destinationCountry)) continue;

    const violations: CarrierViolation[] = [];

    // Weight
    if (weightKg > service.maxWeightKg) {
      violations.push({
        level: 'hard_fail',
        code: 'weight_exceeded',
        message: `Gewicht ${weightKg.toFixed(1)} kg > max ${service.maxWeightKg} kg`,
      });
    } else if (weightKg > service.maxWeightKg * 0.9) {
      violations.push({
        level: 'warning',
        code: 'weight_near_limit',
        message: `Gewicht ${weightKg.toFixed(1)} kg nahe am Maximum (${service.maxWeightKg} kg)`,
      });
    }

    // Max length (single longest side)
    const effectiveMaxLength = service.maxLengthCm ?? service.maxDim?.l;
    if (effectiveMaxLength != null && longest > effectiveMaxLength) {
      violations.push({
        level: 'hard_fail',
        code: 'length_exceeded',
        message: `Längste Seite ${longest} cm > max ${effectiveMaxLength} cm`,
      });
    }

    // Per-axis limits (when maxDim specifies all three)
    if (service.maxDim) {
      // Compare sorted package dims to sorted service maxes for a fair "any orientation" fit.
      const maxSorted = [service.maxDim.l, service.maxDim.w, service.maxDim.h].sort((a, b) => b - a);
      const [maxL, maxW, maxH] = maxSorted;
      if (longest > maxL) {
        // already handled by length check
      } else if (mid > maxW) {
        violations.push({
          level: 'hard_fail',
          code: 'width_exceeded',
          message: `Mittlere Seite ${mid} cm > max ${maxW} cm`,
        });
      } else if (shortest > maxH) {
        violations.push({
          level: 'hard_fail',
          code: 'height_exceeded',
          message: `Kürzeste Seite ${shortest} cm > max ${maxH} cm`,
        });
      }
    }

    // Minimum dims (label placement)
    if (service.minDim) {
      if (longest < service.minDim.l || mid < service.minDim.w || shortest < service.minDim.h) {
        violations.push({
          level: 'warning',
          code: 'min_dim_label',
          message: `Paket kleiner als Mindestmaß (${service.minDim.l}×${service.minDim.w}×${service.minDim.h} cm) — Label passt evtl. nicht`,
        });
      }
    }

    // Girth
    let girth: number | null = null;
    if (service.girth) {
      girth = computeGirth(service.girth.kind, lengthCm, widthCm, heightCm);
      if (girth != null && girth > service.girth.maxCm) {
        violations.push({
          level: 'hard_fail',
          code: 'girth_exceeded',
          message: `Gurtmaß ${girth} cm > max ${service.girth.maxCm} cm`,
        });
      }
    }

    // Volumetric weight (only info, not a block — carriers bill the higher value)
    let volumetricWeight: number | null = null;
    if (service.volumetricDivisor) {
      volumetricWeight = (lengthCm * widthCm * heightCm) / service.volumetricDivisor;
      if (volumetricWeight > weightKg * 1.2 && volumetricWeight > 2) {
        violations.push({
          level: 'info',
          code: 'volumetric_higher',
          message: `Volumengewicht ${volumetricWeight.toFixed(1)} kg > tatsächlich ${weightKg.toFixed(1)} kg — Kurier berechnet das höhere`,
        });
      }
    }
    const chargeableWeightKg = Math.max(weightKg, volumetricWeight ?? 0);

    // Oversize (Sperrgut) — DHL specific
    if (service.oversizeThresholdKg != null) {
      const dhlOversize =
        longest > 120 || mid > 60 || shortest > 60 || weightKg > service.oversizeThresholdKg;
      if (dhlOversize && service.oversizeSurcharge) {
        violations.push({
          level: 'warning',
          code: 'oversize',
          message: `Sperrgut-Kriterien erfüllt. ${service.oversizeSurcharge}`,
        });
      }
    }

    // Content policy checks
    if (contents.length > 0 && service.contentPolicy) {
      for (const cat of contents) {
        const policy = service.contentPolicy[cat];
        if (policy === 'forbidden') {
          violations.push({
            level: 'hard_fail',
            code: `content_forbidden_${cat}`,
            message: `Inhalt "${cat}" ist bei ${service.carrier} verboten.`,
          });
        } else if (policy === 'permit_required') {
          violations.push({
            level: 'warning',
            code: `content_permit_${cat}`,
            message: `Inhalt "${cat}" benötigt eine Genehmigung.`,
          });
        } else if (policy === 'b2b_only') {
          violations.push({
            level: 'warning',
            code: `content_b2b_${cat}`,
            message: `Inhalt "${cat}" nur B2B mit Lizenz versendbar.`,
          });
        } else if (policy === 'value_insurance_only') {
          violations.push({
            level: 'warning',
            code: `content_value_${cat}`,
            message: `Inhalt "${cat}" nur als Wertpaket mit Zusatzversicherung.`,
          });
        } else if (policy === 'special_handling') {
          violations.push({
            level: 'warning',
            code: `content_special_${cat}`,
            message: `Inhalt "${cat}" erfordert Sondervorschriften (ADR, Gefahrgut).`,
          });
        } else if (policy === 'surface_only') {
          violations.push({
            level: 'warning',
            code: `content_surface_${cat}`,
            message: `Inhalt "${cat}" nur per Landweg (kein Luftversand).`,
          });
        } else if (policy === 'express_only') {
          violations.push({
            level: 'warning',
            code: `content_express_${cat}`,
            message: `Inhalt "${cat}" nur Express + gekühlt.`,
          });
        }
      }
    }

    // Weight label (10 kg gelb / 20 kg rot / 25 kg heavy)
    if (weightKg >= 20) {
      violations.push({
        level: 'info',
        code: 'red_weight_label',
        message: 'Rotes Schwergut-Etikett ab 20 kg Pflicht in DE.',
      });
    } else if (weightKg >= 10) {
      violations.push({
        level: 'info',
        code: 'yellow_weight_label',
        message: 'Gelbes Gewichtsetikett ab 10 kg empfohlen.',
      });
    }
    if (weightKg >= 25 && service.carrier === 'UPS') {
      violations.push({
        level: 'warning',
        code: 'ups_heavy',
        message: 'UPS Heavy-Parcel-Label ab 25 kg Pflicht (EU).',
      });
    }

    // Overall status
    const hasHardFail = violations.some((v) => v.level === 'hard_fail');
    const hasWarning = violations.some((v) => v.level === 'warning');
    const status: CarrierMatch['status'] = hasHardFail ? 'blocked' : hasWarning ? 'warning' : 'ok';

    matches.push({
      service,
      status,
      violations,
      girthCm: girth,
      volumetricWeightKg: volumetricWeight,
      chargeableWeightKg,
    });
  }

  // Rank: ok first, then warning, then blocked. Within same status: cheapest/smallest service first.
  const statusRank = { ok: 0, warning: 1, blocked: 2 };
  matches.sort((a, b) => {
    const s = statusRank[a.status] - statusRank[b.status];
    if (s !== 0) return s;
    // Prefer cheaper price, then lower max weight (more fitted service)
    const priceA = a.service.priceFromEur ?? 999;
    const priceB = b.service.priceFromEur ?? 999;
    if (priceA !== priceB) return priceA - priceB;
    return a.service.maxWeightKg - b.service.maxWeightKg;
  });

  return matches;
}

// ─── Carton recommendation ─────────────────────────────────────

export interface CartonSize {
  id: string;
  label: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  maxLoadKg: number;
}

/** Standardized shipping carton catalog — common EU e-commerce sizes. */
export const STANDARD_CARTONS: CartonSize[] = [
  { id: 'xs', label: 'XS 20×15×10', lengthCm: 20, widthCm: 15, heightCm: 10, maxLoadKg: 2 },
  { id: 's', label: 'S 30×20×15', lengthCm: 30, widthCm: 20, heightCm: 15, maxLoadKg: 5 },
  { id: 'm', label: 'M 40×30×20', lengthCm: 40, widthCm: 30, heightCm: 20, maxLoadKg: 10 },
  { id: 'm_tall', label: 'M-hoch 40×30×30', lengthCm: 40, widthCm: 30, heightCm: 30, maxLoadKg: 10 },
  { id: 'l', label: 'L 50×40×30', lengthCm: 50, widthCm: 40, heightCm: 30, maxLoadKg: 15 },
  { id: 'euro', label: 'Euro 60×40×30', lengthCm: 60, widthCm: 40, heightCm: 30, maxLoadKg: 20 },
  { id: 'euro_l', label: 'Euro-L 60×40×40', lengthCm: 60, widthCm: 40, heightCm: 40, maxLoadKg: 25 },
  { id: 'xl', label: 'XL 80×60×40', lengthCm: 80, widthCm: 60, heightCm: 40, maxLoadKg: 30 },
  { id: 'xxl', label: 'XXL 120×60×60', lengthCm: 120, widthCm: 60, heightCm: 60, maxLoadKg: 31.5 },
];

/**
 * Recommend the smallest carton that fits ALL items plus a safety margin
 * and is still within the given weight limit.
 *
 * Input: items — each with dims in cm and weight in kg. Items are stacked in
 * the carton by simple bounding-box approximation (sum of volumes + 10%
 * void-fill, height = max item height).
 */
export interface ContentItem {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  quantity?: number;
}

export interface CartonRecommendation {
  carton: CartonSize;
  fits: boolean;
  fillPct: number;
  grossWeightKg: number; // contents + 0.4 kg packaging tare
  overloadedBy: number | null;
  reason?: string;
}

const CARTON_TARE_KG = 0.4;

export function recommendCarton(items: ContentItem[]): CartonRecommendation[] {
  const totalVolumeCm3 = items.reduce((sum, it) => {
    const q = it.quantity ?? 1;
    return sum + it.lengthCm * it.widthCm * it.heightCm * q;
  }, 0);
  const contentsWeight = items.reduce((sum, it) => sum + it.weightKg * (it.quantity ?? 1), 0);
  const grossWeightKg = contentsWeight + CARTON_TARE_KG;

  const longestItem = items.reduce((max, it) => Math.max(max, it.lengthCm), 0);

  const recs: CartonRecommendation[] = STANDARD_CARTONS.map((carton) => {
    const cartonVolume = carton.lengthCm * carton.widthCm * carton.heightCm;
    // Effective usable volume assumes 15% padding.
    const usableVolume = cartonVolume * 0.85;
    const fitsVolume = totalVolumeCm3 <= usableVolume;
    const fitsLongest = longestItem <= carton.lengthCm;
    const fitsWeight = grossWeightKg <= carton.maxLoadKg;
    const fits = fitsVolume && fitsLongest && fitsWeight;
    const fillPct = Math.min(100, (totalVolumeCm3 / cartonVolume) * 100);

    let reason: string | undefined;
    if (!fitsLongest) reason = `Längstes Produkt ${longestItem} cm > Karton ${carton.lengthCm} cm`;
    else if (!fitsVolume) reason = `Inhalt ${(totalVolumeCm3 / 1000).toFixed(1)} L > Karton nutzbar ${(usableVolume / 1000).toFixed(1)} L`;
    else if (!fitsWeight) reason = `Gewicht ${grossWeightKg.toFixed(1)} kg > Karton-Limit ${carton.maxLoadKg} kg`;

    return {
      carton,
      fits,
      fillPct,
      grossWeightKg,
      overloadedBy: fitsWeight ? null : +(grossWeightKg - carton.maxLoadKg).toFixed(1),
      reason,
    };
  });

  // Sort so best match is first: fits && highest fill pct (= smallest fitting carton).
  recs.sort((a, b) => {
    if (a.fits && !b.fits) return -1;
    if (!a.fits && b.fits) return 1;
    // Both fit or both don't → prefer higher fill pct within the fits group, lower for non-fits.
    if (a.fits && b.fits) return b.fillPct - a.fillPct;
    return a.fillPct - b.fillPct;
  });

  return recs;
}

// ─── Country Zone Lookup ───────────────────────────────────────

export function getCountryZone(iso2?: string | null): CountryZone | null {
  if (!iso2) return null;
  return COUNTRY_ZONES[iso2.toUpperCase()] ?? null;
}

// ─── Price Estimation ──────────────────────────────────────────

export interface PriceEstimate {
  carrier: string;
  currency: 'EUR' | 'CHF' | 'GBP';
  priceFrom: number;
  priceTo?: number;
  weightTierUsed: string;
  note?: string;
}

/** Linearly interpolate between the 2/5/10/20/30 kg price tiers. */
function interpolateTier(
  tiers: { '2'?: number; '5'?: number; '10'?: number; '20'?: number; '30'?: number },
  weightKg: number,
): { value: number; tierLabel: string } | null {
  const points: Array<{ w: number; p: number }> = [];
  for (const k of ['2', '5', '10', '20', '30'] as const) {
    const v = tiers[k];
    if (v != null) points.push({ w: Number(k), p: v });
  }
  if (points.length === 0) return null;
  if (weightKg <= points[0].w) return { value: points[0].p, tierLabel: `bis ${points[0].w} kg` };
  if (weightKg >= points[points.length - 1].w) {
    return { value: points[points.length - 1].p, tierLabel: `${points[points.length - 1].w} kg+` };
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (weightKg >= a.w && weightKg <= b.w) {
      const ratio = (weightKg - a.w) / (b.w - a.w);
      return { value: a.p + ratio * (b.p - a.p), tierLabel: `~${weightKg.toFixed(1)} kg` };
    }
  }
  return { value: points[points.length - 1].p, tierLabel: `${points[points.length - 1].w} kg` };
}

export function estimatePrices(
  originIso2: string | null | undefined,
  destIso2: string | null | undefined,
  weightKg: number,
): PriceEstimate[] {
  if (!originIso2 || !destIso2 || weightKg <= 0) return [];
  const key = `${originIso2.toUpperCase()}-${destIso2.toUpperCase()}`;
  const route = ROUTE_PRICES[key];
  if (!route) return [];

  const results: PriceEstimate[] = [];
  for (const [carrier, tiers] of Object.entries(route.prices)) {
    if (!tiers) continue;
    const est = interpolateTier(tiers, weightKg);
    if (!est) continue;
    results.push({
      carrier: carrier as CarrierPriceKey,
      currency: route.currency,
      priceFrom: Math.round(est.value * 100) / 100,
      weightTierUsed: est.tierLabel,
      note: route.note,
    });
  }
  return results.sort((a, b) => a.priceFrom - b.priceFrom);
}

// ─── Customs Form Recommendation ───────────────────────────────

export type CustomsForm = 'CN22' | 'CN23' | 'EUR.1' | 'Commercial Invoice' | 'Proforma Invoice';

export interface CustomsRequirement {
  needed: boolean;
  forms: CustomsForm[];
  reason: string;
  hints: string[];
}

export function requiredCustomsForms(
  originIso2: string | null | undefined,
  destIso2: string | null | undefined,
  valueEur: number,
  weightKg: number,
  isCommercial: boolean = true,
): CustomsRequirement {
  const origin = getCountryZone(originIso2);
  const dest = getCountryZone(destIso2);

  // If destination is inside EU and origin is inside EU → no customs forms needed
  if (origin?.zone === 'eu' && dest?.zone === 'eu') {
    return {
      needed: false,
      forms: [],
      reason: 'Intra-EU: freier Warenverkehr, keine Zollformulare.',
      hints: [
        'Bei B2C > 10.000 € EU-Fernverkauf: OSS-Registrierung (One Stop Shop).',
        'Bei B2B: USt-IdNr. des Empfängers prüfen → Reverse Charge, keine MwSt. berechnen.',
      ],
    };
  }

  // Third-country destination → forms required
  if (dest?.zone === 'third_country' || dest?.zone === 'special_zone') {
    const forms: CustomsForm[] = [];
    if (weightKg <= 2 && valueEur < 368) {
      forms.push('CN22');
    } else {
      forms.push('CN23');
    }
    forms.push(isCommercial ? 'Commercial Invoice' : 'Proforma Invoice');

    // EU → CH or EU → UK with EU origin: EUR.1 / origin declaration for preferential tariff
    const eurPreferential = ['CH', 'LI', 'GB', 'NO'];
    if (origin?.zone === 'eu' && eurPreferential.includes(dest.iso2)) {
      if (valueEur > 10300) {
        forms.push('EUR.1');
      }
    }

    const hints = [
      `Empfänger-Land ${dest.nameDe} ist Drittland — volle Zollabwicklung nötig.`,
      dest.iso2 === 'CH' && valueEur < 62
        ? 'Warenwert < CHF 62 → ggf. MwSt.-frei (Kleinsendung).'
        : '',
      dest.iso2 === 'GB' && valueEur < 135
        ? 'Warenwert < £135 → Verkäufer führt UK-VAT an HMRC ab.'
        : '',
      dest.iso2 === 'NO' && valueEur < 30
        ? 'Warenwert < NOK 350 → vereinfachter Versand ohne VOEC.'
        : '',
      valueEur > 10300
        ? 'Über €10.300: Offizielle EUR.1 Warenverkehrsbescheinigung statt Ursprungserklärung.'
        : '',
      'Drittland: Versender braucht EORI-Nummer.',
    ].filter(Boolean);

    return {
      needed: true,
      forms,
      reason: `Versand ${origin?.iso2 ?? '?'} → ${dest.iso2}: ${dest.nameDe} ist Drittland.`,
      hints,
    };
  }

  return {
    needed: false,
    forms: [],
    reason: 'Zielland unbekannt oder Sonderfall — manuell prüfen.',
    hints: [],
  };
}

// ─── Incoterm Recommendation ───────────────────────────────────

export function recommendedIncoterms(
  destIso2: string | null | undefined,
  customerType: 'b2c' | 'b2b',
  valueEur: number,
): Incoterm[] {
  const dest = getCountryZone(destIso2);
  const tags: Array<'b2c' | 'b2b' | 'third_country' | 'high_value'> = [customerType];
  if (dest?.zone === 'third_country') tags.push('third_country');
  if (valueEur > 1000) tags.push('high_value');

  return INCOTERMS.filter((inc) => inc.recommended?.some((t) => tags.includes(t))).slice(0, 3);
}

// ─── Transit Time Lookup ───────────────────────────────────────

export interface TransitEstimate {
  carrier: string;
  days: string;
  note: string;
}

export function transitTimeEstimate(
  originIso2: string | null | undefined,
  destIso2: string | null | undefined,
): TransitEstimate[] {
  if ((originIso2 ?? 'DE').toUpperCase() !== 'DE') return []; // only DE origin data
  if (!destIso2) return [];
  const row = TRANSIT_TIMES_FROM_DE.find((r) => r.destIso2 === destIso2.toUpperCase());
  if (!row) return [];
  return [
    { carrier: 'DHL Paket', days: row.dhlDays, note: row.note },
    { carrier: 'DPD', days: row.dpdDays, note: row.note },
    { carrier: 'GLS', days: row.glsDays, note: row.note },
    { carrier: 'UPS Standard', days: row.upsDays, note: row.note },
  ];
}

// ─── Surcharge Calculator ──────────────────────────────────────

export interface SurchargeTrigger {
  oversize: boolean;
  heavyOver25kg: boolean;
  thirdCountry: boolean;
  peakSeason: boolean;
  islandPostcode: boolean;
  ageCheck: boolean;
  saturdayDelivery: boolean;
  codRequested: boolean;
}

export interface TriggeredSurcharge {
  rule: SurchargeRule;
  applies: boolean;
}

export function applicableSurcharges(triggers: Partial<SurchargeTrigger>): TriggeredSurcharge[] {
  const results: TriggeredSurcharge[] = [];
  for (const rule of SURCHARGES) {
    let applies = false;
    switch (rule.condition) {
      case 'dims_exceed_standard':
        applies = triggers.oversize === true;
        break;
      case 'weight_over_25':
        applies = triggers.heavyOver25kg === true;
        break;
      case 'third_country':
        applies = triggers.thirdCountry === true;
        break;
      case 'nov_to_jan':
        applies = triggers.peakSeason === true;
        break;
      case 'island_postcode':
        applies = triggers.islandPostcode === true;
        break;
      case 'always_percent':
        applies = true; // fuel always applies
        break;
      default:
        // Optional services — only show if explicitly requested
        if (rule.id === 'age_check') applies = triggers.ageCheck === true;
        else if (rule.id === 'saturday') applies = triggers.saturdayDelivery === true;
        else if (rule.id === 'cod') applies = triggers.codRequested === true;
        break;
    }
    if (applies) results.push({ rule, applies });
  }
  return results;
}

// ─── Country Hints ─────────────────────────────────────────────

export function countryHints(destIso2?: string | null): string[] {
  const zone = getCountryZone(destIso2);
  return zone?.hints ?? [];
}

