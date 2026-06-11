import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Box, Calendar,
  Download, Filter, FilterX, Package as PackageIcon, RefreshCcw, Search, Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { getTransactionHistory } from '@/services/supabase/wh-stock';
import { getProducts, type ProductListItem } from '@/services/supabase/products';
import { supabase } from '@/lib/supabase';
import { buildCsv, downloadCsv, timestampedFilename, type CsvColumn } from '@/lib/csv-export';
import { gridStagger, gridItem, tabContentVariants, useMotionVariants, useReducedMotion } from '@/lib/motion';
import type { WhStockTransaction } from '@/types/warehouse';
import {
  CATEGORIES, CAT_BY_KEY, categorize, parseReason,
  rangeToDates, prevRangeToDates, computeCategoryStats, computeFlowTotals, findTopCategory,
  type MovementCategory, type RangePreset,
} from '@/components/warehouse/movement-categories';
import { MovementKpiStrip, DeltaBadge } from '@/components/warehouse/movement-kpi-strip';
import { CategoryTab, RecipientTab, ProductTab, AuditLogTab } from '@/components/warehouse/movement-tabs';

type FlowFilter = 'all' | 'out' | 'in';
type TabKey = 'category' | 'recipient' | 'product' | 'log';

export function StockMovementsPage() {
  const { t, i18n } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();
  const tabVariants = useMotionVariants(tabContentVariants);
  const tileContainer = useMotionVariants(gridStagger);
  const tileItem = useMotionVariants(gridItem);

  const [range, setRange] = useState<RangePreset>('30d');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<MovementCategory | 'all'>('all');
  const [flowFilter, setFlowFilter] = useState<FlowFilter>('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabKey>('category');

  const [txns, setTxns] = useState<WhStockTransaction[]>([]);
  const [prevTxns, setPrevTxns] = useState<WhStockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  // Reset batch filter when product changes — old batchId would be from another product.
  useEffect(() => { setBatchFilter('all'); }, [productFilter]);
  // Map shipmentId → recipient label ("Sabrina P. · Shopify #1003"), so the
  // "Nach Empfänger" tab can group Shopify orders by customer too.
  const [shipmentRecipients, setShipmentRecipients] = useState<Record<string, string>>({});

  // Load transactions for the selected range AND the previous period of equal
  // length (for delta comparison) — other filters are client-side.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const { from } = rangeToDates(range);
        const prev = prevRangeToDates(range);
        const [current, previous] = await Promise.all([
          getTransactionHistory({ dateFrom: from }),
          prev
            ? getTransactionHistory({ dateFrom: prev.from, dateTo: prev.to })
            : Promise.resolve<WhStockTransaction[]>([]),
        ]);
        if (cancelled) return;
        setTxns(current);
        setPrevTxns(previous);
      } catch (err) {
        console.error('Failed to load stock movements:', err);
        if (!cancelled) {
          setTxns([]);
          setPrevTxns([]);
          setError(true);
        }
      } finally {
        // Always clear loading — even on error — so the skeleton never hangs.
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range, reloadKey]);

  // Resolve shipment recipients for any transaction that has shipmentId set.
  // We batch the lookup so a 200-row activity stream still uses 1 query.
  useEffect(() => {
    const ids = Array.from(new Set(txns.map(t => t.shipmentId).filter(Boolean) as string[]));
    if (ids.length === 0) { setShipmentRecipients({}); return; }
    supabase
      .from('wh_shipments')
      .select('id, recipient_name, recipient_company, order_reference')
      .in('id', ids)
      .then((res: { data: Array<{ id: string; recipient_name?: string; recipient_company?: string; order_reference?: string }> | null; error: unknown }) => {
        if (res.error) {
          console.error('Failed to resolve shipment recipients:', res.error);
          return;
        }
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
    getProducts()
      .then(setProducts)
      .catch(err => console.error('Failed to load products for filter:', err));
  }, []);

  // Resolve performed_by ids to user names (best-effort, non-blocking).
  useEffect(() => {
    const ids = Array.from(new Set(txns.map(t => t.performedBy).filter(Boolean) as string[]));
    if (!ids.length) return;
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ids)
      .then((res: { data: Array<{ id: string; full_name?: string; email?: string }> | null; error: unknown }) => {
        if (res.error) {
          console.error('Failed to resolve user names:', res.error);
          return;
        }
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

  // Shared non-date filter predicate — applied to BOTH periods so the
  // previous-period deltas compare like with like.
  const matchesFilters = useCallback((txn: WhStockTransaction): boolean => {
    if (productFilter !== 'all' && txn.productId !== productFilter) return false;
    if (batchFilter !== 'all' && txn.batchId !== batchFilter) return false;
    const cat = categorize(txn);
    const def = CAT_BY_KEY[cat] || CAT_BY_KEY.other_outflow;
    if (categoryFilter !== 'all' && cat !== categoryFilter) return false;
    if (flowFilter === 'out' && !def.isOutflow) return false;
    if (flowFilter === 'in' && !def.isInflow) return false;
    if (search) {
      const q = search.toLowerCase();
      const parsed = parseReason(txn.reason);
      const shipRecipient = txn.shipmentId ? shipmentRecipients[txn.shipmentId] : undefined;
      const haystack = [
        txn.productName, txn.batchSerialNumber, txn.locationName,
        txn.reason, txn.notes, txn.transactionNumber,
        parsed.recipient, shipRecipient,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }, [productFilter, batchFilter, categoryFilter, flowFilter, search, shipmentRecipients]);

  const filtered = useMemo(() => txns.filter(matchesFilters), [txns, matchesFilters]);
  const prevFiltered = useMemo(() => prevTxns.filter(matchesFilters), [prevTxns, matchesFilters]);

  const hasComparison = range !== 'all';
  const categoryStats = useMemo(() => computeCategoryStats(filtered), [filtered]);
  const prevCategoryStats = useMemo(
    () => (hasComparison ? computeCategoryStats(prevFiltered) : null),
    [prevFiltered, hasComparison],
  );
  const totals = useMemo(() => computeFlowTotals(categoryStats), [categoryStats]);
  const prevTotals = useMemo(
    () => (prevCategoryStats ? computeFlowTotals(prevCategoryStats) : null),
    [prevCategoryStats],
  );
  const topCategory = useMemo(() => {
    const def = findTopCategory(categoryStats);
    if (!def) return null;
    return {
      def,
      qty: categoryStats[def.key].qty,
      prevQty: prevCategoryStats ? prevCategoryStats[def.key].qty : 0,
    };
  }, [categoryStats, prevCategoryStats]);

  // Recipient breakdown — covers both write-off recipients (parsed from
  // reason) AND shipment recipients (joined via shipmentRecipients map).
  const recipientBreakdown = useMemo(() => {
    const map = new Map<string, { recipient: string; category: MovementCategory; qty: number; count: number }>();
    for (const txn of filtered) {
      const cat = categorize(txn);
      if (!CAT_BY_KEY[cat]?.isOutflow) continue;
      const parsed = parseReason(txn.reason);
      const recipient =
        parsed.recipient
        || (cat === 'shipment' && txn.shipmentId ? shipmentRecipients[txn.shipmentId] : null);
      if (!recipient) continue;
      const key = `${cat}::${recipient}`;
      const existing = map.get(key);
      if (existing) {
        existing.qty += Math.abs(txn.quantity || 0);
        existing.count += 1;
      } else {
        map.set(key, { recipient, category: cat, qty: Math.abs(txn.quantity || 0), count: 1 });
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
    for (const txn of filtered) {
      const cat = categorize(txn);
      if (!CAT_BY_KEY[cat]?.isOutflow) continue;
      const qty = Math.abs(txn.quantity || 0);
      const existing = byProduct.get(txn.productId);
      if (existing) {
        existing.total += qty;
        existing.categories[cat] = (existing.categories[cat] || 0) + qty;
      } else {
        const cats = {} as Record<MovementCategory, number>;
        cats[cat] = qty;
        byProduct.set(txn.productId, {
          productId: txn.productId,
          productName: txn.productName || txn.productId.slice(0, 8),
          total: qty,
          categories: cats,
        });
      }
    }
    return Array.from(byProduct.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  function exportCSV() {
    const cols: CsvColumn<WhStockTransaction>[] = [
      { header: t('Datum'), value: txn => new Date(txn.createdAt).toISOString() },
      { header: t('Typ'), value: txn => txn.type },
      { header: t('Kategorie'), value: txn => t((CAT_BY_KEY[categorize(txn)] || CAT_BY_KEY.other_outflow).labelKey) },
      { header: t('Produkt'), value: txn => txn.productName || txn.productId },
      { header: t('Charge'), value: txn => txn.batchSerialNumber || txn.batchId || '' },
      { header: t('Standort'), value: txn => txn.locationName || txn.locationId || '' },
      { header: t('Menge'), value: txn => txn.quantity },
      { header: t('Grund'), value: txn => parseReason(txn.reason).label || txn.reason || '' },
      { header: t('Empfänger'), value: txn => parseReason(txn.reason).recipient || (txn.shipmentId ? shipmentRecipients[txn.shipmentId] : '') || '' },
      { header: t('Notizen'), value: txn => txn.notes || '' },
      { header: t('Durch'), value: txn => (txn.performedBy && userMap[txn.performedBy]) || txn.performedBy || '' },
    ];
    downloadCsv(timestampedFilename('bewegungen'), buildCsv(filtered, cols));
  }

  const hasActiveFilters =
    productFilter !== 'all' || batchFilter !== 'all' || categoryFilter !== 'all'
    || flowFilter !== 'all' || search !== '';

  function resetFilters() {
    setProductFilter('all');
    setBatchFilter('all');
    setCategoryFilter('all');
    setFlowFilter('all');
    setSearch('');
  }

  /** Flow chips clear a conflicting category filter so users never strand themselves. */
  function handleFlowChip(next: FlowFilter) {
    setFlowFilter(next);
    if (next !== 'all' && categoryFilter !== 'all') {
      const def = CAT_BY_KEY[categoryFilter];
      if ((next === 'out' && !def.isOutflow) || (next === 'in' && !def.isInflow)) {
        setCategoryFilter('all');
      }
    }
  }

  const locale = i18n.language === 'de' ? 'de-DE' : 'en-US';
  const totalOutflow = totals.out;
  const whileTap = prefersReduced ? undefined : { scale: 0.97 };

  const flowChips: Array<{ k: FlowFilter; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = [
    { k: 'all', label: t('Alle Bewegungen'), icon: Activity },
    { k: 'out', label: t('Nur Abgänge'), icon: ArrowUpFromLine },
    { k: 'in', label: t('Nur Zugänge'), icon: ArrowDownToLine },
  ];

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
        <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0} className="min-h-[44px] sm:min-h-9">
          <Download className="mr-1 h-4 w-4" />
          {t('CSV exportieren')}
        </Button>
      </div>

      {/* KPI strip — Σ Abgänge / Σ Zugänge / Netto / aktivste Kategorie */}
      {!error && (
        <MovementKpiStrip
          loading={loading}
          hasComparison={hasComparison}
          totals={totals}
          prevTotals={prevTotals}
          topCategory={topCategory}
        />
      )}

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="min-w-0">
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0" /> {t('Zeitraum')}
              </Label>
              <Select value={range} onValueChange={v => setRange(v as RangePreset)}>
                <SelectTrigger className="mt-1 h-11 sm:h-9 w-full max-w-full [&>span]:truncate">
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
                <SelectTrigger className="mt-1 h-11 sm:h-9 w-full max-w-full [&>span]:truncate">
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
                <SelectTrigger className="mt-1 h-11 sm:h-9 w-full max-w-full [&>span]:truncate">
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
                <SelectTrigger className="mt-1 h-11 sm:h-9 w-full max-w-full [&>span]:truncate">
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
                className="mt-1 h-11 sm:h-9 w-full"
              />
            </div>
          </div>

          {/* Quick flow filter chips */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {flowChips.map(({ k, label, icon: Icon }) => {
              const active = flowFilter === k;
              return (
                <motion.button
                  key={k}
                  type="button"
                  whileTap={whileTap}
                  onClick={() => handleFlowChip(k)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 min-h-[44px] sm:min-h-8 sm:py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </motion.button>
              );
            })}
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

      {/* Error state — load failed, offer retry instead of hanging skeletons */}
      {error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-amber-500" />
            <p className="text-sm text-muted-foreground mb-4">{t('Bewegungen konnten nicht geladen werden.')}</p>
            <Button variant="outline" onClick={() => setReloadKey(k => k + 1)} className="min-h-[44px] sm:min-h-9">
              <RefreshCcw className="mr-1.5 h-4 w-4" />
              {t('Erneut versuchen')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI tiles — outflow categories (click to filter) */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <ShimmerSkeleton className="h-8 w-8 rounded-md" />
                  <ShimmerSkeleton className="h-3 w-2/3" />
                  <ShimmerSkeleton className="h-7 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              variants={tileContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
            >
              {CATEGORIES.filter(c => c.isOutflow).map(c => {
                const Icon = c.icon;
                const s = categoryStats[c.key];
                const pct = totalOutflow > 0 ? Math.round((s.qty / totalOutflow) * 100) : 0;
                const active = categoryFilter === c.key;
                return (
                  <motion.button
                    key={c.key}
                    type="button"
                    variants={tileItem}
                    whileTap={whileTap}
                    onClick={() => setCategoryFilter(active ? 'all' : c.key)}
                    className={`text-left rounded-lg border p-3 min-h-[44px] transition-all hover:shadow-sm cursor-pointer ${
                      active ? 'border-primary ring-1 ring-primary' : 'hover:border-foreground/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${c.bg}`} style={{ color: c.color }}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasComparison && prevCategoryStats && (
                          <DeltaBadge current={s.qty} previous={prevCategoryStats[c.key].qty} invert={c.invertDelta} />
                        )}
                        {pct > 0 && (
                          <Badge variant="outline" className="text-[10px] tabular-nums">{pct}%</Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground truncate">{t(c.labelKey)}</div>
                    <div className="mt-0.5 flex items-baseline gap-1">
                      <span className="text-2xl font-semibold tabular-nums">{s.qty}</span>
                      <span className="text-xs text-muted-foreground">{t('Stück')}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                      {s.count} {t('Buchung(en)')}
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          {/* Tabs */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-2 px-2">
                {([
                  { k: 'category' as const,  label: t('Nach Kategorie'),  icon: Filter },
                  { k: 'recipient' as const, label: t('Nach Empfänger'),  icon: Users },
                  { k: 'product' as const,   label: t('Nach Produkt'),    icon: PackageIcon },
                  { k: 'log' as const,       label: t('Audit Log'),       icon: Activity },
                ]).map(({ k, label, icon: Icon }) => {
                  const active = tab === k;
                  return (
                    <motion.button
                      key={k}
                      type="button"
                      whileTap={whileTap}
                      onClick={() => setTab(k)}
                      className={`flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-9 text-sm rounded-md transition-colors whitespace-nowrap ${
                        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </motion.button>
                  );
                })}
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                      <ShimmerSkeleton className="h-9 w-9 rounded-md shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <ShimmerSkeleton className="h-3.5 w-1/3" />
                        <ShimmerSkeleton className="h-1.5 w-full" />
                      </div>
                      <ShimmerSkeleton className="h-6 w-12 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Box className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm mb-4">{t('Keine Bewegungen für diese Filter')}</p>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={resetFilters} className="min-h-[44px] sm:min-h-9">
                      <FilterX className="mr-1.5 h-4 w-4" />
                      {t('Filter zurücksetzen')}
                    </Button>
                  )}
                </div>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={tab}
                    variants={tabVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    {tab === 'category' ? (
                      <CategoryTab
                        stats={categoryStats}
                        prevStats={prevCategoryStats}
                        totalOutflow={totalOutflow}
                        hasComparison={hasComparison}
                      />
                    ) : tab === 'recipient' ? (
                      <RecipientTab rows={recipientBreakdown} />
                    ) : tab === 'product' ? (
                      <ProductTab rows={productBreakdown} />
                    ) : (
                      <AuditLogTab rows={filtered} userMap={userMap} locale={locale} />
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
