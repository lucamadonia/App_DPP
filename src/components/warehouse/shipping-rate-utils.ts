/**
 * Shipping Rates — shared helpers for the carrier price comparison page.
 *
 * Pure mapping/derivation layer on top of the smart-packing rule engine
 * (src/lib/smart-packing.ts). No data is duplicated here — only joins
 * between CARRIER_SERVICES, ROUTE_PRICES, transit times and the
 * Integrations Hub connection state.
 */
import {
  matchCarrierServices,
  estimatePrices,
  transitTimeEstimate,
  type CarrierMatch,
  type ContentCategory,
  type ContentPolicy,
  type TransitEstimate,
} from '@/lib/smart-packing';

// ---------------------------------------------------------------------------
// Brand avatars (initials + brand colors, same visual language as the
// Integrations Hub) — keyed by CarrierService.carrier display name.
// ---------------------------------------------------------------------------
export interface CarrierBrand {
  bg: string;
  text: string;
  initials: string;
}

export const RATE_CARRIER_BRAND: Record<string, CarrierBrand> = {
  DHL: { bg: 'bg-yellow-400', text: 'text-red-600', initials: 'DHL' },
  'DHL Express': { bg: 'bg-yellow-400', text: 'text-red-600', initials: 'DX' },
  Hermes: { bg: 'bg-sky-600', text: 'text-white', initials: 'H' },
  Evri: { bg: 'bg-teal-600', text: 'text-white', initials: 'EV' },
  DPD: { bg: 'bg-red-600', text: 'text-white', initials: 'DPD' },
  GLS: { bg: 'bg-blue-700', text: 'text-white', initials: 'GLS' },
  UPS: { bg: 'bg-amber-900', text: 'text-yellow-400', initials: 'UPS' },
  FedEx: { bg: 'bg-purple-700', text: 'text-orange-300', initials: 'FX' },
  'TNT (FedEx)': { bg: 'bg-orange-500', text: 'text-white', initials: 'TNT' },
  'Royal Mail': { bg: 'bg-red-700', text: 'text-yellow-300', initials: 'RM' },
  PostNL: { bg: 'bg-orange-500', text: 'text-white', initials: 'NL' },
  Colissimo: { bg: 'bg-blue-600', text: 'text-yellow-200', initials: 'CO' },
  Chronopost: { bg: 'bg-blue-900', text: 'text-white', initials: 'CP' },
  'Swiss Post': { bg: 'bg-yellow-400', text: 'text-black', initials: 'CH' },
  'Österr. Post': { bg: 'bg-yellow-400', text: 'text-red-700', initials: 'AT' },
  'Poste Italiane': { bg: 'bg-blue-800', text: 'text-yellow-300', initials: 'PI' },
  Bpost: { bg: 'bg-red-600', text: 'text-white', initials: 'BP' },
  Correos: { bg: 'bg-yellow-400', text: 'text-blue-800', initials: 'ES' },
  'CTT Portugal': { bg: 'bg-red-600', text: 'text-white', initials: 'CTT' },
  PostNord: { bg: 'bg-sky-700', text: 'text-white', initials: 'PN' },
  InPost: { bg: 'bg-yellow-400', text: 'text-black', initials: 'IP' },
};

export function getRateBrand(carrier: string): CarrierBrand {
  return (
    RATE_CARRIER_BRAND[carrier] || {
      bg: 'bg-muted',
      text: 'text-foreground',
      initials: carrier.slice(0, 2).toUpperCase(),
    }
  );
}

// ---------------------------------------------------------------------------
// Joins: CarrierService.carrier → other data sources
// ---------------------------------------------------------------------------

/** CarrierService.carrier → ROUTE_PRICES carrier key */
const PRICE_KEY_BY_CARRIER: Record<string, string> = {
  DHL: 'DHL Paket',
  DPD: 'DPD',
  GLS: 'GLS',
  UPS: 'UPS Std.',
  FedEx: 'FedEx Eco.',
  Hermes: 'Hermes/Nat. Post',
};

/** CarrierService.carrier → TRANSIT_TIMES_FROM_DE carrier label */
const TRANSIT_KEY_BY_CARRIER: Record<string, string> = {
  DHL: 'DHL Paket',
  DPD: 'DPD',
  GLS: 'GLS',
  UPS: 'UPS Standard',
};

/** CarrierService.carrier → Integrations Hub carrierId (carrier-integrations.ts) */
const INTEGRATION_ID_BY_CARRIER: Record<string, string> = {
  DHL: 'dhl',
  'DHL Express': 'dhl_express',
  UPS: 'ups',
  GLS: 'gls',
  DPD: 'dpd',
  Hermes: 'hermes',
};

export const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: '€',
  CHF: 'CHF',
  GBP: '£',
};

// ---------------------------------------------------------------------------
// Rate rows
// ---------------------------------------------------------------------------

export type RateDisplayStatus = 'ok' | 'tight' | 'blocked';

/** Translatable reason codes derived from rule-engine hard fails */
export type BlockReason = 'too_heavy' | 'too_large' | 'girth_exceeded';

export interface RateRow {
  match: CarrierMatch;
  /** Interpolated route price (or list "from" price as fallback), null = unknown */
  price: number | null;
  currency: 'EUR' | 'CHF' | 'GBP';
  /** True when the price is the carrier's domestic list "from" price, not a route price */
  isListPrice: boolean;
  transit: TransitEstimate | null;
  /** Carrier is connected in the Integrations Hub */
  connected: boolean;
  status: RateDisplayStatus;
  blockReasons: BlockReason[];
  /** Highest limit utilization 0..n (weight / length / girth) */
  utilization: number;
  /** Content policies worth surfacing as info chips */
  policyChips: Array<{ category: ContentCategory; policy: ContentPolicy }>;
}

export interface RateInput {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  origin: string;
  destination: string;
}

const BLOCK_REASON_BY_CODE: Record<string, BlockReason> = {
  weight_exceeded: 'too_heavy',
  length_exceeded: 'too_large',
  width_exceeded: 'too_large',
  height_exceeded: 'too_large',
  girth_exceeded: 'girth_exceeded',
};

const SURFACED_POLICIES: ContentPolicy[] = ['forbidden', 'special_handling', 'b2b_only'];

export function buildRateRows(input: RateInput, connectedCarrierIds: Set<string>): RateRow[] {
  const { lengthCm, widthCm, heightCm, weightKg, origin, destination } = input;
  if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0 || weightKg <= 0 || !destination) {
    return [];
  }

  const matches = matchCarrierServices({
    lengthCm,
    widthCm,
    heightCm,
    weightKg,
    destinationCountry: destination,
  });

  const transits = transitTimeEstimate(origin, destination);
  // estimatePrices is cheap, but each service may bill a different chargeable
  // weight (volumetric) — memoize per rounded weight.
  const priceCache = new Map<number, ReturnType<typeof estimatePrices>>();
  const pricesFor = (kg: number) => {
    const key = Math.round(kg * 10) / 10;
    let cached = priceCache.get(key);
    if (!cached) {
      cached = estimatePrices(origin, destination, key);
      priceCache.set(key, cached);
    }
    return cached;
  };

  return matches.map((match) => {
    const { service } = match;

    // Price: route matrix first, list "from" price as fallback
    const priceKey = PRICE_KEY_BY_CARRIER[service.carrier];
    const routeEstimate = priceKey
      ? pricesFor(match.chargeableWeightKg).find((e) => e.carrier === priceKey)
      : undefined;
    let price: number | null = null;
    let currency: RateRow['currency'] = 'EUR';
    let isListPrice = false;
    if (routeEstimate) {
      price = routeEstimate.priceFrom;
      currency = routeEstimate.currency;
    } else if (service.priceFromEur != null) {
      price = service.priceFromEur;
      isListPrice = true;
    }

    // Transit time
    const transitKey = TRANSIT_KEY_BY_CARRIER[service.carrier];
    const transit = transitKey ? transits.find((tr) => tr.carrier === transitKey) ?? null : null;

    // Limit utilization (weight, longest side, girth)
    const sorted = [lengthCm, widthCm, heightCm].sort((a, b) => b - a);
    const ratios: number[] = [weightKg / service.maxWeightKg];
    const maxLength = service.maxLengthCm ?? service.maxDim?.l;
    if (maxLength) ratios.push(sorted[0] / maxLength);
    if (service.girth && match.girthCm != null) ratios.push(match.girthCm / service.girth.maxCm);
    const utilization = Math.max(...ratios);

    // Status + reasons
    const blockReasons = Array.from(
      new Set(
        match.violations
          .filter((v) => v.level === 'hard_fail')
          .map((v) => BLOCK_REASON_BY_CODE[v.code])
          .filter((r): r is BlockReason => !!r),
      ),
    );
    const status: RateDisplayStatus =
      match.status === 'blocked' ? 'blocked' : utilization > 0.85 ? 'tight' : 'ok';

    // Content policy info chips
    const policyChips = Object.entries(service.contentPolicy ?? {})
      .filter(([, policy]) => SURFACED_POLICIES.includes(policy as ContentPolicy))
      .slice(0, 3)
      .map(([category, policy]) => ({
        category: category as ContentCategory,
        policy: policy as ContentPolicy,
      }));

    return {
      match,
      price,
      currency,
      isListPrice,
      transit,
      connected: connectedCarrierIds.has(INTEGRATION_ID_BY_CARRIER[service.carrier] ?? ''),
      status,
      blockReasons,
      utilization,
      policyChips,
    };
  });
}

// ---------------------------------------------------------------------------
// Sorting + formatting
// ---------------------------------------------------------------------------

export type RateSortMode = 'price' | 'transit';

/** Parse the lower bound from a transit string like "2–3" → 2 */
export function minTransitDays(row: RateRow): number {
  const first = row.transit?.days.match(/\d+/);
  return first ? parseInt(first[0], 10) : 99;
}

export function sortRateRows(rows: RateRow[], mode: RateSortMode): RateRow[] {
  const sorted = [...rows];
  if (mode === 'transit') {
    sorted.sort((a, b) => {
      const d = minTransitDays(a) - minTransitDays(b);
      if (d !== 0) return d;
      return (a.price ?? Infinity) - (b.price ?? Infinity);
    });
  } else {
    sorted.sort((a, b) => {
      // Route prices before list-only "from" prices at the same value
      const pa = (a.price ?? Infinity) + (a.isListPrice ? 0.001 : 0);
      const pb = (b.price ?? Infinity) + (b.isListPrice ? 0.001 : 0);
      return pa - pb;
    });
  }
  return sorted;
}

export function formatRatePrice(price: number, currency: string, locale: string): string {
  const formatted = price.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = CURRENCY_SYMBOL[currency] ?? currency;
  return currency === 'EUR' || currency === 'GBP' ? `${formatted} ${symbol}` : `${symbol} ${formatted}`;
}

/** ISO-2 → flag emoji via regional indicator symbols */
export function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}
