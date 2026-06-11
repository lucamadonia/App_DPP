/**
 * Pure analytics helpers for the shipment reports page.
 * No React — keeps ShipmentReportsPage lean and unit-testable.
 */
import {
  isInternational, getShippingZone, normalizeCountryIso2,
} from '@/lib/shipping-rates';
import type { WhShipment, ShipmentStatus } from '@/types/warehouse';

export type RangeKey = '7' | '30' | '90' | '365' | 'all';

export interface RangeBounds {
  /** Inclusive ISO start of current period (undefined for "all time"). */
  from?: string;
  /** Inclusive ISO end of current period (end of today). */
  to: string;
  /** Previous period of equal length (undefined for "all time"). */
  prevFrom?: string;
  prevTo?: string;
  hasComparison: boolean;
}

export function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Resolve a RangeKey into current + previous period ISO bounds. */
export function rangeBounds(range: RangeKey): RangeBounds {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const to = end.toISOString();
  if (range === 'all') {
    return { to, hasComparison: false };
  }
  const n = parseInt(range, 10);
  const from = isoDaysAgo(n);
  return { from, to, prevFrom: isoDaysAgo(2 * n), prevTo: from, hasComparison: true };
}

export function pct(part: number, total: number): string {
  if (total === 0) return '0';
  return ((part / total) * 100).toFixed(0);
}

export function fmtEuro(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
}

export function fmtWeight(g: number): string {
  if (g === 0) return '0 g';
  if (g < 1000) return `${g} g`;
  return `${(g / 1000).toFixed(1)} kg`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE');
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-DE');
}

/** Lightweight KPI totals — used for the previous-period comparison. */
export interface KpiTotals {
  total: number;
  shippedCount: number;
  intlCount: number;
  totalCost: number;
  totalWeightGrams: number;
  avgLeadDays: number | null;
}

export type LeadStageKey = 'createdToShipped' | 'shippedToDelivered';

export interface Analytics extends KpiTotals {
  timeline: { day: string; count: number }[];
  statusBreakdown: { status: ShipmentStatus; count: number }[];
  carrierBreakdown: { carrier: string; domestic: number; eu: number; world: number }[];
  topCountries: { country: string; count: number }[];
  topRecipients: { name: string; email: string; count: number; items: number; cost: number }[];
  leadTimeByStage: { stage: LeadStageKey; days: number }[];
}

export function computeKpiTotals(shipments: WhShipment[], homeCountry: string): KpiTotals {
  let shippedCount = 0;
  let intlCount = 0;
  let totalCost = 0;
  let totalWeightGrams = 0;
  let leadSum = 0;
  let leadN = 0;

  for (const s of shipments) {
    if (s.shippedAt) shippedCount++;
    if (isInternational(homeCountry, s.shippingCountry)) intlCount++;
    if (s.shippingCost) totalCost += Number(s.shippingCost);
    if (s.totalWeightGrams) totalWeightGrams += Number(s.totalWeightGrams);
    if (s.createdAt && s.deliveredAt) {
      const ms = new Date(s.deliveredAt).getTime() - new Date(s.createdAt).getTime();
      if (ms > 0) {
        leadSum += ms;
        leadN++;
      }
    }
  }

  return {
    total: shipments.length,
    shippedCount,
    intlCount,
    totalCost,
    totalWeightGrams,
    avgLeadDays: leadN > 0 ? leadSum / leadN / 86400000 : null,
  };
}

export function computeAnalytics(shipments: WhShipment[], homeCountry: string): Analytics {
  const totals = computeKpiTotals(shipments, homeCountry);

  const timelineMap = new Map<string, number>();
  const statusMap = new Map<ShipmentStatus, number>();
  const carrierZoneMap = new Map<string, { domestic: number; eu: number; world: number }>();
  const countryMap = new Map<string, number>();
  const recipientMap = new Map<string, { name: string; email: string; count: number; items: number; cost: number }>();

  let createdToShippedSum = 0, createdToShippedN = 0;
  let shippedToDeliveredSum = 0, shippedToDeliveredN = 0;

  for (const s of shipments) {
    if (s.shippedAt && s.deliveredAt) {
      const ms = new Date(s.deliveredAt).getTime() - new Date(s.shippedAt).getTime();
      if (ms > 0) {
        shippedToDeliveredSum += ms;
        shippedToDeliveredN++;
      }
    }
    if (s.createdAt && s.shippedAt) {
      const ms = new Date(s.shippedAt).getTime() - new Date(s.createdAt).getTime();
      if (ms > 0) {
        createdToShippedSum += ms;
        createdToShippedN++;
      }
    }

    const day = new Date(s.createdAt).toISOString().slice(0, 10);
    timelineMap.set(day, (timelineMap.get(day) || 0) + 1);

    statusMap.set(s.status, (statusMap.get(s.status) || 0) + 1);

    const carrier = s.carrier || '—';
    const zone = getShippingZone(homeCountry, s.shippingCountry);
    const cz = carrierZoneMap.get(carrier) || { domestic: 0, eu: 0, world: 0 };
    cz[zone] = (cz[zone] || 0) + 1;
    carrierZoneMap.set(carrier, cz);

    const country = (normalizeCountryIso2(s.shippingCountry) || s.shippingCountry || '—').toUpperCase();
    countryMap.set(country, (countryMap.get(country) || 0) + 1);

    const key = `${s.recipientName}|${s.recipientEmail || ''}`;
    const r = recipientMap.get(key) || {
      name: s.recipientName,
      email: s.recipientEmail || '',
      count: 0,
      items: 0,
      cost: 0,
    };
    r.count++;
    r.items += s.totalItems || 0;
    if (s.shippingCost) r.cost += Number(s.shippingCost);
    recipientMap.set(key, r);
  }

  const timeline = Array.from(timelineMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day: day.slice(5), count }));

  const statusBreakdown = Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const carrierBreakdown = Array.from(carrierZoneMap.entries())
    .map(([carrier, zones]) => ({ carrier, ...zones }))
    .sort((a, b) => b.domestic + b.eu + b.world - (a.domestic + a.eu + a.world));

  const topCountries = Array.from(countryMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topRecipients = Array.from(recipientMap.values()).sort((a, b) => b.count - a.count);

  const leadTimeByStage: Analytics['leadTimeByStage'] = [
    { stage: 'createdToShipped', days: createdToShippedN > 0 ? +(createdToShippedSum / createdToShippedN / 86400000).toFixed(1) : 0 },
    { stage: 'shippedToDelivered', days: shippedToDeliveredN > 0 ? +(shippedToDeliveredSum / shippedToDeliveredN / 86400000).toFixed(1) : 0 },
  ];

  return {
    ...totals,
    timeline,
    statusBreakdown,
    carrierBreakdown,
    topCountries,
    topRecipients,
    leadTimeByStage,
  };
}

// ============================================
// Ad-hoc pivot
// ============================================

export type PivotRowDim = 'status' | 'carrier' | 'country' | 'priority' | 'zone';
export type PivotColDim = 'month' | 'carrier' | 'zone' | 'priority';

export interface PivotResult {
  rows: string[];
  cols: string[];
  cells: Record<string, number>;
  rowTotals: Record<string, number>;
  colTotals: Record<string, number>;
  grandTotal: number;
}

export function buildPivot(
  shipments: WhShipment[],
  rowDim: PivotRowDim,
  colDim: PivotColDim,
  homeCountry: string,
): PivotResult {
  const cells: Record<string, number> = {};
  const rowSet = new Set<string>();
  const colSet = new Set<string>();

  for (const s of shipments) {
    const rowKey = getDim(s, rowDim, homeCountry);
    const colKey = getDim(s, colDim, homeCountry);
    rowSet.add(rowKey);
    colSet.add(colKey);
    const k = `${rowKey}|${colKey}`;
    cells[k] = (cells[k] || 0) + 1;
  }

  const rows = Array.from(rowSet).sort();
  const cols = Array.from(colSet).sort();
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};
  let grandTotal = 0;

  for (const r of rows) {
    rowTotals[r] = 0;
    for (const c of cols) {
      const v = cells[`${r}|${c}`] || 0;
      rowTotals[r] += v;
      colTotals[c] = (colTotals[c] || 0) + v;
      grandTotal += v;
    }
  }

  return { rows, cols, cells, rowTotals, colTotals, grandTotal };
}

function getDim(s: WhShipment, dim: string, homeCountry: string): string {
  switch (dim) {
    case 'status': return s.status;
    case 'carrier': return s.carrier || '—';
    case 'country': return normalizeCountryIso2(s.shippingCountry) || s.shippingCountry || '—';
    case 'priority': return s.priority;
    case 'zone': return getShippingZone(homeCountry, s.shippingCountry);
    case 'month': return s.createdAt.slice(0, 7);
    default: return '—';
  }
}
