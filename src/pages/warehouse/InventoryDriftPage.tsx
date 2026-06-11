import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Gift, Package, RefreshCw, Search,
  ShoppingBag, ExternalLink, Sparkles, FileWarning, ChevronDown, ChevronRight,
  Filter, Download,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import {
  getInventoryDrift,
  type InventoryDriftShipment, type InventoryDriftItem,
} from '@/services/supabase/shopify-integration';
import { buildCsv, downloadCsv, timestampedFilename, type CsvColumn } from '@/lib/csv-export';
import { toast } from 'sonner';

type RangeKey = '7' | '30' | '60' | '90' | '180' | '365';

/* -------------------------------------------------------------------------- */
/*  KPI card                                                                   */
/* -------------------------------------------------------------------------- */

function StatCard({ label, value, icon: Icon, color, bg, loading }: {
  label: string; value: number; icon: React.ElementType;
  color: string; bg: string; loading: boolean;
}) {
  const animated = useAnimatedNumber(loading ? 0 : value);
  return (
    <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <CardContent className="pt-4 sm:pt-5 pb-3 sm:pb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`rounded-lg p-2 sm:p-2.5 ${bg}`}>
            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
          </div>
          <div className="min-w-0">
            {loading
              ? <ShimmerSkeleton className="h-6 sm:h-7 w-12 mb-1" />
              : <p className="text-xl sm:text-2xl font-bold tabular-nums leading-none">{animated}</p>}
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export function InventoryDriftPage() {
  const { t } = useTranslation('warehouse');
  const [range, setRange] = useState<RangeKey>('60');
  const [onlyWithDrift, setOnlyWithDrift] = useState(true);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InventoryDriftShipment[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const res = await getInventoryDrift({ daysBack: parseInt(range, 10), onlyWithDrift });
      setData(res.shipments);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load();   }, [range, onlyWithDrift]);

  // Search filter (client-side, on the loaded set)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((s) =>
      s.shipmentNumber.toLowerCase().includes(q)
      || (s.recipientName || '').toLowerCase().includes(q)
      || (s.shopifyOrderName || '').toLowerCase().includes(q)
    );
  }, [data, search]);

  const stats = useMemo(() => ({
    total: data.length,
    major: data.filter((s) => s.severity === 'major').length,
    minor: data.filter((s) => s.severity === 'minor').length,
    clean: data.filter((s) => !s.hasDrift && s.severity === 'none').length,
  }), [data]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExport() {
    const rows: Array<{ s: InventoryDriftShipment; kind: string; item: InventoryDriftItem }> = [];
    for (const s of filtered) {
      for (const u of s.undershipped) rows.push({ s, kind: 'undershipped', item: u });
      for (const q of s.quantityMismatches) rows.push({ s, kind: 'quantity_mismatch', item: q });
      for (const e of s.extra) rows.push({ s, kind: e.reason === 'gift' ? 'gift' : 'extra', item: e });
      for (const u of s.shopifyUnmapped) rows.push({ s, kind: 'unmapped', item: u });
    }
    const cols: CsvColumn<typeof rows[number]>[] = [
      { header: t('Shipment Number'), value: (r) => r.s.shipmentNumber },
      { header: t('Recipient'), value: (r) => r.s.recipientName || '' },
      { header: t('Shopify order'), value: (r) => r.s.shopifyOrderName || '' },
      { header: t('Severity'), value: (r) => r.s.severity || '' },
      { header: t('Drift kind'), value: (r) => r.kind },
      { header: t('Product / item'), value: (r) => r.item.productName || r.item.title || '' },
      { header: t('Variant'), value: (r) => r.item.variantTitle || '' },
      { header: t('SKU'), value: (r) => r.item.sku || '' },
      { header: t('Expected qty'), value: (r) => r.item.expected ?? '' },
      { header: t('Shipped qty'), value: (r) => r.item.shipped ?? r.item.quantity ?? '' },
      { header: t('Created', { ns: 'common' }), value: (r) => new Date(r.s.createdAt).toLocaleString('de-DE') },
    ];
    const csv = buildCsv(rows, cols);
    downloadCsv(timestampedFilename('inventory-drift'), csv);
    toast.success(t('Exported {{n}} drift rows', { n: rows.length }));
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 p-2 sm:p-2.5">
            <FileWarning className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              {t('Inventory Drift')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {t('Compares what Trackbliss shipped vs what Shopify orders contained — catches gifts, manual adds, and undershipments.')}
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={load} disabled={loading} className="flex-1 sm:flex-none">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('Refresh')}
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={loading || filtered.length === 0} className="flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" />
            {t('Export CSV')}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard label={t('Analyzed')} value={stats.total} icon={Package}
          color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/30" loading={loading} />
        <StatCard label={t('Major drift')} value={stats.major} icon={AlertTriangle}
          color="text-rose-600" bg="bg-rose-100 dark:bg-rose-900/30" loading={loading} />
        <StatCard label={t('Gifts / extras')} value={stats.minor} icon={Gift}
          color="text-amber-600" bg="bg-amber-100 dark:bg-amber-900/30" loading={loading} />
        <StatCard label={t('Clean')} value={stats.clean} icon={CheckCircle2}
          color="text-emerald-600" bg="bg-emerald-100 dark:bg-emerald-900/30" loading={loading} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('Search shipment / order / recipient...')}
            value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9"
          />
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2 opacity-70" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t('Last 7 days')}</SelectItem>
            <SelectItem value="30">{t('Last 30 days')}</SelectItem>
            <SelectItem value="60">{t('Last 60 days')}</SelectItem>
            <SelectItem value="90">{t('Last 90 days')}</SelectItem>
            <SelectItem value="180">{t('Last 6 months')}</SelectItem>
            <SelectItem value="365">{t('Last year')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-md border bg-card">
          <Switch id="drift-only" checked={onlyWithDrift} onCheckedChange={setOnlyWithDrift} />
          <Label htmlFor="drift-only" className="text-sm cursor-pointer whitespace-nowrap">
            {t('Only with drift')}
          </Label>
        </div>
      </div>

      {/* Result list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <ShimmerSkeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-4">
              <Sparkles className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold">{onlyWithDrift ? t('No drift detected') : t('No shipments found')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {onlyWithDrift
                  ? t('Trackbliss and Shopify match for every shipment in this window.')
                  : t('Try a wider date range or change the filter.')}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <DriftCard
              key={s.shipmentId}
              shipment={s}
              expanded={expanded.has(s.shipmentId)}
              onToggle={() => toggleExpand(s.shipmentId)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Per-shipment drift card                                                    */
/* -------------------------------------------------------------------------- */

function DriftCard({ shipment, expanded, onToggle, t }: {
  shipment: InventoryDriftShipment;
  expanded: boolean;
  onToggle: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const sev = shipment.severity;
  const sevConfig = {
    major: { label: t('Major drift'), bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-l-rose-500', icon: AlertTriangle, iconColor: 'text-rose-600' },
    minor: { label: t('Gifts / extras'), bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-l-amber-500', icon: Gift, iconColor: 'text-amber-600' },
    none: { label: t('No drift'), bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-l-emerald-500', icon: CheckCircle2, iconColor: 'text-emerald-600' },
  }[sev || 'none'];
  const SevIcon = sevConfig.icon;
  const totalIssues = shipment.undershipped.length + shipment.quantityMismatches.length + shipment.extra.length + shipment.shopifyUnmapped.length;

  return (
    <Card className={`border-l-4 ${sevConfig.border} ${sevConfig.bg} transition-shadow hover:shadow-md`}>
      <CardContent className="p-3 sm:p-4">
        <button onClick={onToggle} className="w-full text-left">
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-1.5 sm:p-2 bg-background/60 ${sevConfig.iconColor} shrink-0`}>
              <SevIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      to={`/warehouse/shipments/${shipment.shipmentId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-primary hover:underline"
                    >
                      {shipment.shipmentNumber}
                    </Link>
                    {shipment.shopifyOrderName && (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-background/80 border font-mono">
                        <ShoppingBag className="h-3 w-3" />
                        {shipment.shopifyOrderName}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {shipment.recipientName}
                    {shipment.recipientCompany && ` · ${shipment.recipientCompany}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={`${sevConfig.iconColor} border-current`}>
                    {sevConfig.label}
                  </Badge>
                  {expanded ? <ChevronDown className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-50" />}
                </div>
              </div>

              {/* Compact summary chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {shipment.undershipped.length > 0 && (
                  <Chip color="rose" icon={AlertTriangle}>
                    {t('{{n}} undershipped', { n: shipment.undershipped.length })}
                  </Chip>
                )}
                {shipment.quantityMismatches.length > 0 && (
                  <Chip color="rose" icon={AlertTriangle}>
                    {t('{{n}} qty mismatch', { n: shipment.quantityMismatches.length })}
                  </Chip>
                )}
                {shipment.extra.filter((e) => e.reason === 'gift').length > 0 && (
                  <Chip color="amber" icon={Gift}>
                    {t('{{n}} gifts', { n: shipment.extra.filter((e) => e.reason === 'gift').length })}
                  </Chip>
                )}
                {shipment.extra.filter((e) => e.reason !== 'gift').length > 0 && (
                  <Chip color="amber" icon={Sparkles}>
                    {t('{{n}} extras', { n: shipment.extra.filter((e) => e.reason !== 'gift').length })}
                  </Chip>
                )}
                {shipment.shopifyUnmapped.length > 0 && (
                  <Chip color="slate" icon={Package}>
                    {t('{{n}} unmapped', { n: shipment.shopifyUnmapped.length })}
                  </Chip>
                )}
                {shipment.shopifyFinancialStatus && (
                  <Chip color={shipment.shopifyFinancialStatus === 'paid' ? 'emerald' : 'slate'}>
                    {shipment.shopifyFinancialStatus}
                  </Chip>
                )}
                {shipment.shopifyTotal && (
                  <Chip color="slate">
                    {shipment.shopifyCurrency || ''} {shipment.shopifyTotal}
                  </Chip>
                )}
                {shipment.error && (
                  <Chip color="rose" icon={AlertTriangle}>
                    {t('Error')}: {shipment.error}
                  </Chip>
                )}
              </div>
            </div>
          </div>
        </button>

        {expanded && totalIssues > 0 && (
          <div className="mt-4 pt-4 border-t border-foreground/10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {shipment.undershipped.length > 0 && (
              <DriftSection title={t('Undershipped — customer paid but did not receive')} icon={AlertTriangle} color="rose">
                {shipment.undershipped.map((u, i) => (
                  <LineRow key={i}
                    primary={u.productName || u.title || '?'}
                    secondary={[u.variantTitle, u.sku].filter(Boolean).join(' · ')}
                    expected={u.expected}
                    actual={u.shipped}
                  />
                ))}
              </DriftSection>
            )}
            {shipment.quantityMismatches.length > 0 && (
              <DriftSection title={t('Quantity mismatch')} icon={AlertTriangle} color="rose">
                {shipment.quantityMismatches.map((q, i) => (
                  <LineRow key={i}
                    primary={q.productName || q.title || '?'}
                    secondary={q.sku || ''}
                    expected={q.expected}
                    actual={q.shipped}
                  />
                ))}
              </DriftSection>
            )}
            {shipment.extra.length > 0 && (
              <DriftSection title={t('Shipped extras (gifts + manual adds)')} icon={Gift} color="amber">
                {shipment.extra.map((e, i) => (
                  <LineRow key={i}
                    primary={e.productName || e.title || '?'}
                    secondary={e.reason === 'gift' ? t('Gift / Beigabe') : t('Not on Shopify order')}
                    actual={e.quantity}
                  />
                ))}
              </DriftSection>
            )}
            {shipment.shopifyUnmapped.length > 0 && (
              <DriftSection title={t('Shopify lines with no Trackbliss mapping')} icon={Package} color="slate">
                {shipment.shopifyUnmapped.map((u, i) => (
                  <LineRow key={i}
                    primary={u.title || '?'}
                    secondary={[u.variantTitle, u.sku].filter(Boolean).join(' · ')}
                    actual={u.quantity}
                  />
                ))}
              </DriftSection>
            )}
            <div className="md:col-span-2 flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/warehouse/shipments/${shipment.shipmentId}`}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  {t('Open shipment')}
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small UI helpers                                                           */
/* -------------------------------------------------------------------------- */

function Chip({ children, color, icon: Icon }: {
  children: React.ReactNode;
  color: 'rose' | 'amber' | 'emerald' | 'slate';
  icon?: React.ElementType;
}) {
  const c = {
    rose: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  }[color];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${c}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

function DriftSection({ title, icon: Icon, color, children }: {
  title: string;
  icon: React.ElementType;
  color: 'rose' | 'amber' | 'slate';
  children: React.ReactNode;
}) {
  const c = { rose: 'text-rose-600', amber: 'text-amber-600', slate: 'text-slate-600' }[color];
  return (
    <div>
      <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${c} mb-2`}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function LineRow({ primary, secondary, expected, actual }: {
  primary: string;
  secondary?: string;
  expected?: number;
  actual?: number;
}) {
  return (
    <div className="flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-md bg-background/60 border text-sm">
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{primary}</div>
        {secondary && <div className="text-xs text-muted-foreground truncate">{secondary}</div>}
      </div>
      <div className="text-xs font-mono tabular-nums whitespace-nowrap">
        {expected !== undefined && actual !== undefined ? (
          <>
            <span className="text-muted-foreground">{expected}</span>
            <span className="mx-1 opacity-60">→</span>
            <span className={actual < expected ? 'text-rose-600 font-bold' : 'text-foreground'}>{actual}</span>
          </>
        ) : (
          <span className="text-foreground">×{actual ?? expected ?? '?'}</span>
        )}
      </div>
    </div>
  );
}
