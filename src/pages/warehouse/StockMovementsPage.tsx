import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowDownToLine, ArrowUpFromLine, Box, Calendar, Download, Filter,
  Gift, FlaskConical, HeartHandshake, Home, AlertOctagon, Trash2, Truck, RotateCcw,
  Search, TrendingDown, TrendingUp, Users, Package as PackageIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { getTransactionHistory } from '@/services/supabase/wh-stock';
import { getProducts, type ProductListItem } from '@/services/supabase/products';
import { supabase } from '@/lib/supabase';
import type { WhStockTransaction } from '@/types/warehouse';

/* -------------------------------------------------------------------------- */
/*  Reason parsing (write-off categories from createStockAdjustment)          */
/* -------------------------------------------------------------------------- */

type WriteOffCategory =
  | 'giveaway' | 'tester' | 'donation' | 'own_use'
  | 'damage' | 'expired' | 'other';

interface ParsedReason {
  category: WriteOffCategory | null;
  label: string;
  recipient?: string;
}

/** Reason format from StockWriteOffDialog: "category:label[ — recipient]". */
function parseReason(raw?: string | null): ParsedReason {
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

type MovementCategory =
  | 'shipment' | 'giveaway' | 'tester' | 'donation' | 'own_use'
  | 'damage' | 'expired' | 'other_outflow'
  | 'goods_receipt' | 'transfer' | 'reservation' | 'release' | 'adjustment';

interface CategoryDef {
  key: MovementCategory;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  bg: string;
  labelKey: string;
  /** Whether this category counts as "stock leaving the warehouse" for KPI math. */
  isOutflow: boolean;
}

const CATEGORIES: CategoryDef[] = [
  { key: 'shipment',      icon: Truck,          color: '#7c3aed', bg: 'bg-violet-50',   labelKey: 'Versendet',           isOutflow: true  },
  { key: 'giveaway',      icon: Gift,           color: '#db2777', bg: 'bg-pink-50',     labelKey: 'Werbegeschenk',       isOutflow: true  },
  { key: 'tester',        icon: FlaskConical,   color: '#9333ea', bg: 'bg-fuchsia-50',  labelKey: 'Tester / Influencer', isOutflow: true  },
  { key: 'donation',      icon: HeartHandshake, color: '#059669', bg: 'bg-emerald-50',  labelKey: 'Spende',              isOutflow: true  },
  { key: 'own_use',       icon: Home,           color: '#0284c7', bg: 'bg-sky-50',      labelKey: 'Eigenverbrauch',      isOutflow: true  },
  { key: 'damage',        icon: AlertOctagon,   color: '#dc2626', bg: 'bg-red-50',      labelKey: 'Bruch / Verlust',     isOutflow: true  },
  { key: 'expired',       icon: Trash2,         color: '#ea580c', bg: 'bg-orange-50',   labelKey: 'Ausschuss / Verfall', isOutflow: true  },
  { key: 'other_outflow', icon: Box,            color: '#525252', bg: 'bg-neutral-50',  labelKey: 'Sonstige Abgänge',    isOutflow: true  },
  { key: 'goods_receipt', icon: ArrowDownToLine, color: '#2563eb', bg: 'bg-blue-50',    labelKey: 'Wareneingang',        isOutflow: false },
  { key: 'transfer',      icon: RotateCcw,      color: '#0891b2', bg: 'bg-cyan-50',     labelKey: 'Umlagerung',          isOutflow: false },
  { key: 'reservation',   icon: ArrowUpFromLine, color: '#6366f1', bg: 'bg-indigo-50',  labelKey: 'Reservierung',        isOutflow: false },
  { key: 'release',       icon: ArrowDownToLine, color: '#737373', bg: 'bg-gray-50',    labelKey: 'Freigabe',            isOutflow: false },
  { key: 'adjustment',    icon: RotateCcw,      color: '#a16207', bg: 'bg-amber-50',    labelKey: 'Bestandsanpassung',   isOutflow: false },
];

const CAT_BY_KEY = Object.fromEntries(CATEGORIES.map(c => [c.key, c])) as Record<MovementCategory, CategoryDef>;

/** Map a transaction (type + parsed reason) to a single MovementCategory. */
function categorize(txn: WhStockTransaction): MovementCategory {
  const parsed = parseReason(txn.reason);
  if (txn.type === 'adjustment' && parsed.category) {
    return parsed.category as MovementCategory;
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
/*  Date range helpers                                                         */
/* -------------------------------------------------------------------------- */

type RangePreset = '7d' | '30d' | '90d' | '365d' | 'all';

function rangeToDates(preset: RangePreset): { from?: string; to?: string } {
  if (preset === 'all') return {};
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : preset === '90d' ? 90 : 365;
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString() };
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function StockMovementsPage() {
  const { t, i18n } = useTranslation('warehouse');

  const [range, setRange] = useState<RangePreset>('30d');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<MovementCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'category' | 'recipient' | 'product' | 'log'>('category');

  const [txns, setTxns] = useState<WhStockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  // Reset batch filter when product changes — old batchId would be from another product.
  useEffect(() => { setBatchFilter('all'); }, [productFilter]);
  // Map shipmentId → recipient label ("Sabrina P. · Shopify #1003"), so the
  // "Nach Empfänger" tab can group Shopify orders by customer too.
  const [shipmentRecipients, setShipmentRecipients] = useState<Record<string, string>>({});

  // Load transactions whenever date range changes — other filters are client-side.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { from, to } = rangeToDates(range);
      const data = await getTransactionHistory({ dateFrom: from, dateTo: to });
      if (cancelled) return;
      setTxns(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [range]);

  // Resolve shipment recipients for any transaction that has shipmentId set.
  // We batch the lookup so a 200-row activity stream still uses 1 query.
  useEffect(() => {
    const ids = Array.from(new Set(txns.map(t => t.shipmentId).filter(Boolean) as string[]));
    if (ids.length === 0) { setShipmentRecipients({}); return; }
    supabase
      .from('wh_shipments')
      .select('id, recipient_name, recipient_company, order_reference')
      .in('id', ids)
      .then((res: { data: Array<{ id: string; recipient_name?: string; recipient_company?: string; order_reference?: string }> | null }) => {
        const m: Record<string, string> = {};
        for (const s of res.data || []) {
          const name = s.recipient_company || s.recipient_name || 'Unbekannt';
          m[s.id] = s.order_reference ? `${name} · ${s.order_reference}` : name;
        }
        setShipmentRecipients(m);
      });
  }, [txns]);

  // Load product list once (for filter picker).
  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  // Resolve performed_by ids to user names (best-effort, non-blocking).
  useEffect(() => {
    const ids = Array.from(new Set(txns.map(t => t.performedBy).filter(Boolean) as string[]));
    if (!ids.length) return;
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ids)
      .then((res: { data: Array<{ id: string; full_name?: string; email?: string }> | null }) => {
        const m: Record<string, string> = {};
        for (const p of res.data || []) m[p.id] = p.full_name || p.email || p.id.slice(0, 8);
        setUserMap(m);
      });
  }, [txns]);

  // Available batches for the currently selected product (derived from data).
  const batchOptions = useMemo(() => {
    if (productFilter === 'all') return [];
    const seen = new Map<string, string>();
    for (const t of txns) {
      if (t.productId !== productFilter) continue;
      if (!t.batchId) continue;
      if (!seen.has(t.batchId)) {
        seen.set(t.batchId, t.batchSerialNumber || t.batchId.slice(0, 8));
      }
    }
    return Array.from(seen, ([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [txns, productFilter]);

  // Apply non-date filters client-side.
  const filtered = useMemo(() => {
    return txns.filter(t => {
      if (productFilter !== 'all' && t.productId !== productFilter) return false;
      if (batchFilter !== 'all' && t.batchId !== batchFilter) return false;
      const cat = categorize(t);
      if (categoryFilter !== 'all' && cat !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const parsed = parseReason(t.reason);
        const shipRecipient = t.shipmentId ? shipmentRecipients[t.shipmentId] : undefined;
        const haystack = [
          t.productName, t.batchSerialNumber, t.locationName,
          t.reason, t.notes, t.transactionNumber,
          parsed.recipient, shipRecipient,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [txns, productFilter, batchFilter, categoryFilter, search, shipmentRecipients]);

  // KPI: sum |quantity| per category, only outflows + the sign of qty matters.
  const categoryStats = useMemo(() => {
    const stats = {} as Record<MovementCategory, { count: number; qty: number }>;
    for (const c of CATEGORIES) stats[c.key] = { count: 0, qty: 0 };
    for (const t of filtered) {
      const cat = categorize(t);
      // Defensive: in case categorize() ever returns an unknown key, fall back
      // to 'other_outflow' which is always initialized.
      const bucket = stats[cat] || stats.other_outflow;
      bucket.count += 1;
      bucket.qty += Math.abs(t.quantity || 0);
    }
    return stats;
  }, [filtered]);

  // Recipient breakdown — covers both write-off recipients (parsed from
  // reason) AND shipment recipients (joined via shipmentRecipients map).
  const recipientBreakdown = useMemo(() => {
    const map = new Map<string, { recipient: string; category: MovementCategory; qty: number; count: number }>();
    for (const t of filtered) {
      const cat = categorize(t);
      if (!CAT_BY_KEY[cat]?.isOutflow) continue;
      const parsed = parseReason(t.reason);
      const recipient =
        parsed.recipient
        || (cat === 'shipment' && t.shipmentId ? shipmentRecipients[t.shipmentId] : null);
      if (!recipient) continue;
      const key = `${cat}::${recipient}`;
      const existing = map.get(key);
      if (existing) {
        existing.qty += Math.abs(t.quantity || 0);
        existing.count += 1;
      } else {
        map.set(key, { recipient, category: cat, qty: Math.abs(t.quantity || 0), count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [filtered, shipmentRecipients]);

  // Per-product breakdown — for each product, the outflow split by category.
  const productBreakdown = useMemo(() => {
    const byProduct = new Map<string, {
      productId: string;
      productName: string;
      total: number;
      categories: Record<MovementCategory, number>;
    }>();
    for (const t of filtered) {
      const cat = categorize(t);
      if (!CAT_BY_KEY[cat]?.isOutflow) continue;
      const qty = Math.abs(t.quantity || 0);
      const existing = byProduct.get(t.productId);
      if (existing) {
        existing.total += qty;
        existing.categories[cat] = (existing.categories[cat] || 0) + qty;
      } else {
        const cats = {} as Record<MovementCategory, number>;
        cats[cat] = qty;
        byProduct.set(t.productId, {
          productId: t.productId,
          productName: t.productName || t.productId.slice(0, 8),
          total: qty,
          categories: cats,
        });
      }
    }
    return Array.from(byProduct.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  function exportCSV() {
    const rows = [
      ['Date', 'Type', 'Category', 'Product', 'Batch', 'Location', 'Quantity', 'Reason', 'Recipient', 'Notes', 'Performed by'],
      ...filtered.map(t => {
        const parsed = parseReason(t.reason);
        const cat = categorize(t);
        return [
          new Date(t.createdAt).toISOString(),
          t.type,
          cat,
          t.productName || t.productId,
          t.batchSerialNumber || t.batchId || '',
          t.locationName || t.locationId || '',
          String(t.quantity),
          parsed.label || t.reason || '',
          parsed.recipient || '',
          t.notes || '',
          (t.performedBy && userMap[t.performedBy]) || t.performedBy || '',
        ];
      }),
    ];
    const csv = rows
      .map(r => r.map(c => `"${String(c).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bewegungen-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const locale = i18n.language === 'de' ? 'de-DE' : 'en-US';
  const totalOutflow = CATEGORIES.filter(c => c.isOutflow).reduce((s, c) => s + categoryStats[c.key].qty, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
            {t('Bewegungen & Auswertung')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('Wo ist mein Bestand hingegangen? Versand, Influencer, Spenden, Bruch — alles auf einen Blick.')}
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="mr-1 h-4 w-4" />
          {t('CSV exportieren')}
        </Button>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="min-w-0">
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0" /> {t('Zeitraum')}
              </Label>
              <Select value={range} onValueChange={v => setRange(v as RangePreset)}>
                <SelectTrigger className="mt-1 h-9 w-full max-w-full [&>span]:truncate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">{t('Letzte 7 Tage')}</SelectItem>
                  <SelectItem value="30d">{t('Letzte 30 Tage')}</SelectItem>
                  <SelectItem value="90d">{t('Letzte 90 Tage')}</SelectItem>
                  <SelectItem value="365d">{t('Letztes Jahr')}</SelectItem>
                  <SelectItem value="all">{t('Alle')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label className="text-xs flex items-center gap-1">
                <PackageIcon className="h-3 w-3 shrink-0" /> {t('Produkt')}
              </Label>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="mt-1 h-9 w-full max-w-full [&>span]:truncate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">{t('Alle Produkte')}</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label className="text-xs flex items-center gap-1">
                <Box className="h-3 w-3 shrink-0" /> {t('Charge')}
              </Label>
              <Select
                value={batchFilter}
                onValueChange={setBatchFilter}
                disabled={productFilter === 'all' || batchOptions.length === 0}
              >
                <SelectTrigger className="mt-1 h-9 w-full max-w-full [&>span]:truncate">
                  <SelectValue placeholder={productFilter === 'all' ? t('Erst Produkt wählen') : t('Alle Chargen')} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">{t('Alle Chargen')}</SelectItem>
                  {batchOptions.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label className="text-xs flex items-center gap-1">
                <Filter className="h-3 w-3 shrink-0" /> {t('Kategorie')}
              </Label>
              <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v as MovementCategory | 'all')}>
                <SelectTrigger className="mt-1 h-9 w-full max-w-full [&>span]:truncate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('Alle Kategorien')}</SelectItem>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.key} value={c.key}>{t(c.labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label className="text-xs flex items-center gap-1">
                <Search className="h-3 w-3 shrink-0" /> {t('Suche')}
              </Label>
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('Empfänger, Charge, Notiz...')}
                className="mt-1 h-9 w-full"
              />
            </div>
          </div>
          {/* Active batch hint */}
          {batchFilter !== 'all' && batchOptions.find(b => b.id === batchFilter) && (
            <div className="mt-3 rounded-lg border bg-cyan-50 dark:bg-cyan-900/20 px-3 py-2 text-sm flex items-center gap-2 min-w-0">
              <Box className="h-4 w-4 text-cyan-700 dark:text-cyan-300 shrink-0" />
              <span className="text-cyan-900 dark:text-cyan-100 break-words min-w-0 flex-1">
                {t('Filter aktiv: nur Charge')} <span className="font-mono font-semibold">{batchOptions.find(b => b.id === batchFilter)?.label}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => setBatchFilter('all')} className="h-7 px-2 text-xs shrink-0">
                {t('Zurücksetzen')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI tiles — outflow categories */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {CATEGORIES.filter(c => c.isOutflow).map(c => {
          const Icon = c.icon;
          const s = categoryStats[c.key];
          const pct = totalOutflow > 0 ? Math.round((s.qty / totalOutflow) * 100) : 0;
          const active = categoryFilter === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategoryFilter(active ? 'all' : c.key)}
              className={`text-left rounded-lg border p-3 transition-all hover:shadow-sm cursor-pointer ${
                active ? 'border-primary ring-1 ring-primary' : 'hover:border-foreground/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${c.bg}`} style={{ color: c.color }}>
                  <Icon className="h-4 w-4" />
                </div>
                {pct > 0 && (
                  <Badge variant="outline" className="text-[10px] tabular-nums">{pct}%</Badge>
                )}
              </div>
              <div className="mt-2 text-xs text-muted-foreground truncate">{t(c.labelKey)}</div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums">{s.qty}</span>
                <span className="text-xs text-muted-foreground">{t('Stück')}</span>
              </div>
              <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                {s.count} {t('Buchung(en)')}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-1 overflow-x-auto -mx-2 px-2">
            {([
              { k: 'category' as const,  label: t('Nach Kategorie'),  icon: Filter },
              { k: 'recipient' as const, label: t('Nach Empfänger'),  icon: Users },
              { k: 'product' as const,   label: t('Nach Produkt'),    icon: PackageIcon },
              { k: 'log' as const,       label: t('Audit Log'),       icon: Activity },
            ]).map(({ k, label, icon: Icon }) => {
              const active = tab === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-md transition-colors whitespace-nowrap ${
                    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <ShimmerSkeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Box className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t('Keine Bewegungen für diese Filter')}</p>
            </div>
          ) : tab === 'category' ? (
            <CategoryTab stats={categoryStats} totalOutflow={totalOutflow} t={t} />
          ) : tab === 'recipient' ? (
            <RecipientTab rows={recipientBreakdown} t={t} />
          ) : tab === 'product' ? (
            <ProductTab rows={productBreakdown} t={t} />
          ) : (
            <AuditLogTab rows={filtered} t={t} userMap={userMap} locale={locale} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tab components                                                             */
/* -------------------------------------------------------------------------- */

function CategoryTab({ stats, totalOutflow, t }: {
  stats: Record<MovementCategory, { count: number; qty: number }>;
  totalOutflow: number;
  t: (key: string) => string;
}) {
  const sorted = [...CATEGORIES].sort((a, b) => stats[b.key].qty - stats[a.key].qty);
  return (
    <div className="space-y-2">
      {sorted.map(c => {
        const s = stats[c.key];
        if (s.qty === 0) return null;
        const pct = totalOutflow > 0 && c.isOutflow ? Math.round((s.qty / totalOutflow) * 100) : 0;
        const Icon = c.icon;
        return (
          <div key={c.key} className="flex items-center gap-3 rounded-lg border p-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${c.bg}`} style={{ color: c.color }}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-sm">{t(c.labelKey)}</span>
                <span className="text-sm tabular-nums font-semibold">{s.qty} {t('Stück')}</span>
              </div>
              {c.isOutflow && (
                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: c.color }}
                  />
                </div>
              )}
              <div className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                {s.count} {t('Buchung(en)')}
                {c.isOutflow && pct > 0 && ` · ${pct}% ${t('aller Abgänge')}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecipientTab({ rows, t }: {
  rows: Array<{ recipient: string; category: MovementCategory; qty: number; count: number }>;
  t: (key: string) => string;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">{t('Noch keine Empfänger erfasst — gib bei Werbegeschenken/Tester/Spenden im Ausbuchen-Dialog einen Empfänger an.')}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((r, i) => {
        const c = CAT_BY_KEY[r.category] || CAT_BY_KEY.other_outflow;
        const Icon = c.icon;
        return (
          <div key={`${r.category}-${r.recipient}-${i}`} className="flex items-center gap-3 rounded-lg border p-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${c.bg}`} style={{ color: c.color }}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm break-words">{r.recipient}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {t(c.labelKey)} · {r.count} {t('Buchung(en)')}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-semibold tabular-nums">{r.qty}</div>
              <div className="text-[10px] text-muted-foreground">{t('Stück')}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProductTab({ rows, t }: {
  rows: Array<{ productId: string; productName: string; total: number; categories: Record<MovementCategory, number> }>;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-3">
      {rows.map(p => {
        const segments = CATEGORIES
          .filter(c => c.isOutflow && (p.categories[c.key] || 0) > 0)
          .map(c => ({ ...c, qty: p.categories[c.key] || 0 }));
        return (
          <div key={p.productId} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <Link to={`/products/${p.productId}`} className="font-medium text-sm hover:underline text-primary break-words">
                {p.productName}
              </Link>
              <span className="text-sm tabular-nums">
                <span className="font-semibold">{p.total}</span>{' '}
                <span className="text-muted-foreground text-xs">{t('Stück gesamt')}</span>
              </span>
            </div>
            {/* Stacked horizontal bar */}
            <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted">
              {segments.map(s => (
                <div
                  key={s.key}
                  className="h-full"
                  style={{ width: `${(s.qty / p.total) * 100}%`, backgroundColor: s.color }}
                  title={`${t(s.labelKey)}: ${s.qty}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {segments.map(s => {
                const Icon = s.icon;
                return (
                  <Badge
                    key={s.key}
                    variant="outline"
                    className="text-[10px] gap-1 font-normal"
                    style={{ borderColor: s.color, color: s.color }}
                  >
                    <Icon className="h-3 w-3" />
                    {t(s.labelKey)}: <span className="font-semibold tabular-nums">{s.qty}</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AuditLogTab({ rows, t, userMap, locale }: {
  rows: WhStockTransaction[];
  t: (key: string) => string;
  userMap: Record<string, string>;
  locale: string;
}) {
  return (
    <div className="overflow-x-auto -mx-3 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">{t('Datum')}</TableHead>
            <TableHead>{t('Kategorie')}</TableHead>
            <TableHead>{t('Produkt')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('Charge / Standort')}</TableHead>
            <TableHead className="text-right">{t('Menge')}</TableHead>
            <TableHead>{t('Grund / Empfänger')}</TableHead>
            <TableHead className="hidden lg:table-cell">{t('Durch')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(txn => {
            const cat = categorize(txn);
            const c = CAT_BY_KEY[cat] || CAT_BY_KEY.other_outflow;
            const Icon = c.icon;
            const parsed = parseReason(txn.reason);
            const qty = txn.quantity || 0;
            const isOut = qty < 0;
            return (
              <TableRow key={txn.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                  {new Date(txn.createdAt).toLocaleString(locale, {
                    year: '2-digit', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1 font-normal" style={{ borderColor: c.color, color: c.color }}>
                    <Icon className="h-3 w-3" /> {t(c.labelKey)}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {txn.productId ? (
                    <Link to={`/products/${txn.productId}`} className="hover:underline text-primary">
                      {txn.productName || txn.productId.slice(0, 8)}
                    </Link>
                  ) : '—'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {txn.batchSerialNumber && <div className="font-mono">{txn.batchSerialNumber}</div>}
                  {txn.locationName && <div>{txn.locationName}</div>}
                </TableCell>
                <TableCell className={`text-right tabular-nums font-semibold ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>
                  {isOut ? <TrendingDown className="inline h-3 w-3 mr-0.5" /> : <TrendingUp className="inline h-3 w-3 mr-0.5" />}
                  {qty > 0 ? '+' : ''}{qty}
                </TableCell>
                <TableCell className="text-xs">
                  {parsed.label && <div className="break-words">{parsed.label}</div>}
                  {parsed.recipient && <div className="text-muted-foreground italic break-words">{parsed.recipient}</div>}
                  {!parsed.label && txn.reason && <div className="break-words text-muted-foreground">{txn.reason}</div>}
                  {txn.notes && <div className="text-muted-foreground mt-0.5 break-words">{txn.notes}</div>}
                  {txn.shipmentId && (
                    <Link to={`/warehouse/shipments/${txn.shipmentId}`} className="text-primary hover:underline text-[11px]">
                      {t('Sendung')} →
                    </Link>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                  {txn.performedBy ? userMap[txn.performedBy] || txn.performedBy.slice(0, 8) : '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

