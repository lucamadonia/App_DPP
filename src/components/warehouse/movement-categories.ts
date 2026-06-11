/**
 * Central movement-category model for the warehouse "Bewegungen" page.
 * Single source of truth for icons, colors, labels and in/out semantics —
 * used by the KPI strip, the category tiles, all breakdown tabs and the
 * CSV export so every surface renders categories identically.
 */
import {
  AlertOctagon, ArrowDownToLine, ArrowUpFromLine, Box, FlaskConical, Gift,
  HeartHandshake, Home, RotateCcw, Trash2, Truck,
} from 'lucide-react';
import type { WhStockTransaction } from '@/types/warehouse';

/* -------------------------------------------------------------------------- */
/*  Reason parsing (write-off categories from createStockAdjustment)           */
/* -------------------------------------------------------------------------- */

export type WriteOffCategory =
  | 'giveaway' | 'tester' | 'donation' | 'own_use'
  | 'damage' | 'expired' | 'other';

export interface ParsedReason {
  category: WriteOffCategory | null;
  label: string;
  recipient?: string;
}

/** Reason format from StockWriteOffDialog: "category:label[ — recipient]". */
export function parseReason(raw?: string | null): ParsedReason {
  if (!raw) return { category: null, label: '' };
  const colonIdx = raw.indexOf(':');
  if (colonIdx === -1) return { category: null, label: raw };
  const category = raw.slice(0, colonIdx) as WriteOffCategory;
  const rest = raw.slice(colonIdx + 1);
  const dashIdx = rest.indexOf(' — ');
  if (dashIdx === -1) return { category, label: rest };
  return { category, label: rest.slice(0, dashIdx), recipient: rest.slice(dashIdx + 3) };
}

/* -------------------------------------------------------------------------- */
/*  Movement category model — superset of write-off + system categories        */
/* -------------------------------------------------------------------------- */

export type MovementCategory =
  | 'shipment' | 'giveaway' | 'tester' | 'donation' | 'own_use'
  | 'damage' | 'expired' | 'other_outflow'
  | 'goods_receipt' | 'transfer' | 'reservation' | 'release' | 'adjustment';

export interface CategoryDef {
  key: MovementCategory;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  bg: string;
  labelKey: string;
  /** Whether this category counts as "stock leaving the warehouse" for KPI math. */
  isOutflow: boolean;
  /** Whether this category counts as "stock entering the warehouse" for KPI math. */
  isInflow: boolean;
  /** Categories where an increase is bad news (delta arrows render inverted). */
  invertDelta?: boolean;
}

export const CATEGORIES: CategoryDef[] = [
  { key: 'shipment',      icon: Truck,           color: '#7c3aed', bg: 'bg-violet-50',   labelKey: 'Versendet',           isOutflow: true,  isInflow: false },
  { key: 'giveaway',      icon: Gift,            color: '#db2777', bg: 'bg-pink-50',     labelKey: 'Werbegeschenk',       isOutflow: true,  isInflow: false },
  { key: 'tester',        icon: FlaskConical,    color: '#9333ea', bg: 'bg-fuchsia-50',  labelKey: 'Tester / Influencer', isOutflow: true,  isInflow: false },
  { key: 'donation',      icon: HeartHandshake,  color: '#059669', bg: 'bg-emerald-50',  labelKey: 'Spende',              isOutflow: true,  isInflow: false },
  { key: 'own_use',       icon: Home,            color: '#0284c7', bg: 'bg-sky-50',      labelKey: 'Eigenverbrauch',      isOutflow: true,  isInflow: false },
  { key: 'damage',        icon: AlertOctagon,    color: '#dc2626', bg: 'bg-red-50',      labelKey: 'Bruch / Verlust',     isOutflow: true,  isInflow: false, invertDelta: true },
  { key: 'expired',       icon: Trash2,          color: '#ea580c', bg: 'bg-orange-50',   labelKey: 'Ausschuss / Verfall', isOutflow: true,  isInflow: false, invertDelta: true },
  { key: 'other_outflow', icon: Box,             color: '#525252', bg: 'bg-neutral-50',  labelKey: 'Sonstige Abgänge',    isOutflow: true,  isInflow: false },
  { key: 'goods_receipt', icon: ArrowDownToLine, color: '#2563eb', bg: 'bg-blue-50',     labelKey: 'Wareneingang',        isOutflow: false, isInflow: true  },
  { key: 'transfer',      icon: RotateCcw,       color: '#0891b2', bg: 'bg-cyan-50',     labelKey: 'Umlagerung',          isOutflow: false, isInflow: false },
  { key: 'reservation',   icon: ArrowUpFromLine, color: '#6366f1', bg: 'bg-indigo-50',   labelKey: 'Reservierung',        isOutflow: false, isInflow: false },
  { key: 'release',       icon: ArrowDownToLine, color: '#737373', bg: 'bg-gray-50',     labelKey: 'Freigabe',            isOutflow: false, isInflow: false },
  { key: 'adjustment',    icon: RotateCcw,       color: '#a16207', bg: 'bg-amber-50',    labelKey: 'Bestandsanpassung',   isOutflow: false, isInflow: false },
];

export const CAT_BY_KEY = Object.fromEntries(
  CATEGORIES.map(c => [c.key, c]),
) as Record<MovementCategory, CategoryDef>;

/** Map a transaction (type + parsed reason) to a single MovementCategory. */
export function categorize(txn: WhStockTransaction): MovementCategory {
  const parsed = parseReason(txn.reason);
  if (txn.type === 'adjustment' && parsed.category) {
    // 'other' write-off bucket maps to the page-level 'other_outflow' key.
    return parsed.category === 'other' ? 'other_outflow' : (parsed.category as MovementCategory);
  }
  switch (txn.type) {
    case 'shipment': return 'shipment';
    case 'goods_receipt': return 'goods_receipt';
    case 'transfer_in':
    case 'transfer_out': return 'transfer';
    case 'reservation': return 'reservation';
    case 'release': return 'release';
    case 'damage': return 'damage';
    case 'write_off': return 'other_outflow';
    case 'return_receipt': return 'goods_receipt';
    case 'adjustment':
      // Bare adjustment without a structured "category:" prefix — internal
      // correction (split, migration, manual fix). NOT a real outflow.
      return 'adjustment';
    default:
      return 'other_outflow';
  }
}

/* -------------------------------------------------------------------------- */
/*  Date range helpers                                                          */
/* -------------------------------------------------------------------------- */

export type RangePreset = '7d' | '30d' | '90d' | '365d' | 'all';

export const RANGE_DAYS: Record<Exclude<RangePreset, 'all'>, number> = {
  '7d': 7, '30d': 30, '90d': 90, '365d': 365,
};

export function rangeToDates(preset: RangePreset): { from?: string; to?: string } {
  if (preset === 'all') return {};
  const from = new Date();
  from.setDate(from.getDate() - RANGE_DAYS[preset]);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString() };
}

/**
 * Previous period of equal length, directly preceding the selected range.
 * Returns null for 'all' (no meaningful comparison window).
 */
export function prevRangeToDates(preset: RangePreset): { from: string; to: string } | null {
  if (preset === 'all') return null;
  const days = RANGE_DAYS[preset];
  const currentFrom = new Date();
  currentFrom.setDate(currentFrom.getDate() - days);
  currentFrom.setHours(0, 0, 0, 0);
  const prevFrom = new Date(currentFrom);
  prevFrom.setDate(prevFrom.getDate() - days);
  // End 1ms before the current window starts so boundary rows aren't counted twice.
  return { from: prevFrom.toISOString(), to: new Date(currentFrom.getTime() - 1).toISOString() };
}

/* -------------------------------------------------------------------------- */
/*  Stats helpers                                                               */
/* -------------------------------------------------------------------------- */

export type CategoryStats = Record<MovementCategory, { count: number; qty: number }>;

export function computeCategoryStats(list: WhStockTransaction[]): CategoryStats {
  const stats = {} as CategoryStats;
  for (const c of CATEGORIES) stats[c.key] = { count: 0, qty: 0 };
  for (const t of list) {
    const cat = categorize(t);
    // Defensive: in case categorize() ever returns an unknown key, fall back
    // to 'other_outflow' which is always initialized.
    const bucket = stats[cat] || stats.other_outflow;
    bucket.count += 1;
    bucket.qty += Math.abs(t.quantity || 0);
  }
  return stats;
}

export interface FlowTotals {
  out: number;
  in: number;
  net: number;
}

/** Category-based in/out totals — consistent with the outflow KPI tiles. */
export function computeFlowTotals(stats: CategoryStats): FlowTotals {
  let out = 0;
  let inn = 0;
  for (const c of CATEGORIES) {
    if (c.isOutflow) out += stats[c.key].qty;
    if (c.isInflow) inn += stats[c.key].qty;
  }
  return { out, in: inn, net: inn - out };
}

/** Category with the highest moved quantity, or null when nothing moved. */
export function findTopCategory(stats: CategoryStats): CategoryDef | null {
  let best: CategoryDef | null = null;
  let bestQty = 0;
  for (const c of CATEGORIES) {
    if (stats[c.key].qty > bestQty) {
      bestQty = stats[c.key].qty;
      best = c;
    }
  }
  return best;
}
