/**
 * Outstanding Goods Receipts
 *
 * One row per batch where the ordered quantity is greater than what
 * has been received so far. Sorted oldest-first so old supplier
 * issues bubble up. Direct "Einlagern"-action prefills the goods
 * receipt wizard with the batch.
 *
 * Mobile (<md): card list with prominent Stock-In CTA.
 * Desktop (md+): sortable ResponsiveTable.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useLocale } from '@/hooks/use-locale';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  PackageOpen,
  Boxes,
  Clock,
  CheckCircle2,
  Filter,
  AlertTriangle,
  ArrowDownToLine,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { Progress } from '@/components/ui/progress';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { ListToolbar } from '@/components/ui/list-toolbar';
import {
  ResponsiveTable,
  type ResponsiveTableColumn,
  type SortState,
} from '@/components/ui/responsive-table';
import {
  OutstandingReceiptCard,
  AgePill,
  getAgeTier,
} from '@/components/warehouse/OutstandingReceiptCard';
import { gridStagger, gridItem, blurIn, useMotionVariants, useReducedMotion } from '@/lib/motion';
import { getOutstandingBatches } from '@/services/supabase/batches';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { OutstandingBatch } from '@/services/supabase/batches';

type ReceiptFilter = 'all' | 'zero' | 'partial';

const RECEIPT_FILTER_OPTIONS: Array<{ value: ReceiptFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'zero', label: 'Not yet received' },
  { value: 'partial', label: 'Partially received' },
];

export function OutstandingReceiptsPage() {
  const { t } = useTranslation('warehouse');
  const locale = useLocale();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const prefersReduced = useReducedMotion();

  const [data, setData] = useState<OutstandingBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [includeAllStatuses, setIncludeAllStatuses] = useState(false);
  const [receiptFilter, setReceiptFilter] = useState<ReceiptFilter>('all');
  const [sort, setSort] = useState<SortState>({ by: 'age', order: 'desc' });

  // Stale-response guard: only the latest request may update state.
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const rows = await getOutstandingBatches({ includeAllStatuses });
      if (requestId !== requestIdRef.current) return;
      setData(rows);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Failed to load outstanding receipts:', err);
      setError(err instanceof Error ? err.message : 'unknown');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [includeAllStatuses]);

  useEffect(() => {
    load();
  }, [load]);

  // Filtered view
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter(row => {
      if (receiptFilter === 'zero' && row.received !== 0) return false;
      if (receiptFilter === 'partial' && row.received === 0) return false;
      if (!q) return true;
      return (
        row.productName.toLowerCase().includes(q) ||
        row.productGtin.toLowerCase().includes(q) ||
        row.batchSerial.toLowerCase().includes(q) ||
        (row.batchNumber?.toLowerCase().includes(q) ?? false) ||
        (row.supplierName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [data, search, receiptFilter]);

  // Sorted view (desktop table sorting; service default = oldest first = age desc)
  const sorted = useMemo(() => {
    const dir = sort.order === 'asc' ? 1 : -1;
    const accessor = (row: OutstandingBatch): string | number => {
      switch (sort.by) {
        case 'product':
          return row.productName.toLowerCase();
        case 'outstanding':
          return row.outstanding;
        case 'age':
        default:
          return row.daysOutstanding;
      }
    };
    return [...filtered].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sort]);

  // Aggregate KPIs over the *unfiltered* dataset
  const kpis = useMemo(() => {
    const openBatches = data.length;
    const totalOutstanding = data.reduce((s, r) => s + r.outstanding, 0);
    const totalOrdered = data.reduce((s, r) => s + r.ordered, 0);
    const totalReceived = data.reduce((s, r) => s + r.received, 0);
    const overallPercent = totalOrdered > 0
      ? Math.round((totalReceived / totalOrdered) * 100)
      : 0;
    const oldestDays = data.reduce((max, r) => Math.max(max, r.daysOutstanding), 0);
    return { openBatches, totalOutstanding, totalOrdered, totalReceived, overallPercent, oldestDays };
  }, [data]);

  const oldestTier = getAgeTier(kpis.oldestDays);

  const activeFilterCount =
    (receiptFilter !== 'all' ? 1 : 0) + (includeAllStatuses ? 1 : 0);

  const resetFilters = () => {
    setSearch('');
    setReceiptFilter('all');
  };

  // Motion variants (no-op when prefers-reduced-motion)
  const containerVariants = useMotionVariants(gridStagger);
  const itemVariants = useMotionVariants(gridItem);
  const headerVariants = useMotionVariants(blurIn);

  // -------------------------------------------------------------------------
  // Toolbar filter content (inline on desktop, bottom drawer on mobile)
  // -------------------------------------------------------------------------
  const filtersNode = (
    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-3">
      <div className="space-y-1.5 md:space-y-0">
        <Label className="md:sr-only text-xs text-muted-foreground">{t('Receipt status')}</Label>
        <div
          role="group"
          aria-label={t('Receipt status')}
          className="flex w-full md:w-auto rounded-lg border bg-muted/40 p-1 gap-1"
        >
          {RECEIPT_FILTER_OPTIONS.map(opt => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setReceiptFilter(opt.value)}
              aria-pressed={receiptFilter === opt.value}
              className={cn(
                'flex-1 md:flex-none h-11 md:h-8 px-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                receiptFilter === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t(opt.label)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 min-h-11 md:min-h-0">
        <Switch
          id="include-all-statuses"
          checked={includeAllStatuses}
          onCheckedChange={setIncludeAllStatuses}
        />
        <Label htmlFor="include-all-statuses" className="cursor-pointer text-sm">
          {t('Include draft + archived')}
        </Label>
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // Empty states
  // -------------------------------------------------------------------------
  const emptyStateNode =
    data.length === 0 ? (
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <motion.div
          initial={prefersReduced ? false : { scale: 0.6, opacity: 0 }}
          animate={prefersReduced ? undefined : { scale: [0.6, 1.12, 1], opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        </motion.div>
        <p className="font-medium text-foreground">{t('All batches are fully stocked')}</p>
        <p className="text-xs">{t('No outstanding goods receipts.')}</p>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Filter className="h-8 w-8" />
        <p className="text-sm">{t('No matches with the current filter')}</p>
        <Button variant="outline" size="sm" className="h-11 md:h-9" onClick={resetFilters}>
          {t('Reset filters')}
        </Button>
      </div>
    );

  // -------------------------------------------------------------------------
  // Desktop table columns
  // -------------------------------------------------------------------------
  const columns = useMemo<ResponsiveTableColumn<OutstandingBatch>[]>(() => [
    {
      id: 'product',
      header: t('Product'),
      sortable: true,
      cell: row => (
        <div>
          <Link to={`/products/${row.productId}`} className="font-medium hover:underline">
            {row.productName}
          </Link>
          <div className="text-xs text-muted-foreground font-mono">{row.productGtin}</div>
        </div>
      ),
    },
    {
      id: 'batch',
      header: t('Batch'),
      cell: row => (
        <div>
          <Link
            to={`/products/${row.productId}/batches/${row.batchId}`}
            className="font-mono text-sm hover:underline"
          >
            {row.batchSerial}
          </Link>
          <div className="text-xs text-muted-foreground">
            {formatDate(row.productionDate, locale)}
            {row.status !== 'live' && (
              <Badge variant="outline" className="ml-2 text-[10px]">{row.status}</Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'supplier',
      header: t('Supplier'),
      hideBelow: 'lg',
      cell: row => (
        <span className="text-sm text-muted-foreground">{row.supplierName || '—'}</span>
      ),
    },
    {
      id: 'ordered',
      header: t('Ordered'),
      className: 'text-right',
      cell: row => <span className="tabular-nums">{row.ordered.toLocaleString()}</span>,
    },
    {
      id: 'received',
      header: t('Received'),
      className: 'text-right',
      cell: row => <span className="tabular-nums">{row.received.toLocaleString()}</span>,
    },
    {
      id: 'outstanding',
      header: t('Outstanding'),
      sortable: true,
      className: 'text-right',
      cell: row => (
        <span className="tabular-nums font-bold text-amber-600 dark:text-amber-400">
          {row.outstanding.toLocaleString()}
        </span>
      ),
    },
    {
      id: 'progress',
      header: t('Progress'),
      className: 'min-w-[160px]',
      cell: row => (
        <div className="flex items-center gap-2">
          <Progress value={row.receivedPercent} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
            {row.receivedPercent}%
          </span>
        </div>
      ),
    },
    {
      id: 'age',
      header: t('Age'),
      sortable: true,
      cell: row => (
        <div className="space-y-1">
          <AgePill days={row.daysOutstanding} />
          <div className="text-xs text-muted-foreground">
            {t('Last receipt')}:{' '}
            {row.lastReceiptAt ? (
              formatDate(row.lastReceiptAt, locale)
            ) : (
              <span className="italic">{t('Never')}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'action',
      header: <span className="sr-only">{t('Action')}</span>,
      className: 'text-right',
      cell: row => (
        <Button
          size="sm"
          onClick={() =>
            navigate(`/warehouse/goods-receipt?productId=${row.productId}&batchId=${row.batchId}`)
          }
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          {t('Stock In')}
        </Button>
      ),
    },
  ], [t, locale, navigate]);

  // -------------------------------------------------------------------------
  // KPI cards
  // -------------------------------------------------------------------------
  const kpiCardClass =
    'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md h-full';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div variants={headerVariants} initial="initial" animate="animate">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          {t('Outstanding Goods Receipts')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('Batches with units that the supplier ordered but the warehouse has not yet received in full.')}
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <motion.div variants={itemVariants}>
          <Card className={kpiCardClass}>
            <CardContent className="pt-4 pb-3 px-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <PackageOpen className="h-3.5 w-3.5" />
                {t('Open batches')}
              </div>
              <div className="text-2xl font-bold">
                {loading ? (
                  <ShimmerSkeleton className="h-7 w-16" />
                ) : (
                  <AnimatedCounter value={kpis.openBatches} />
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className={kpiCardClass}>
            <CardContent className="pt-4 pb-3 px-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Boxes className="h-3.5 w-3.5" />
                {t('Outstanding units')}
              </div>
              <div className="text-2xl font-bold">
                {loading ? (
                  <ShimmerSkeleton className="h-7 w-16" />
                ) : (
                  <AnimatedCounter value={kpis.totalOutstanding} />
                )}
              </div>
              {!loading && kpis.totalOrdered > 0 && (
                <div className="text-xs text-muted-foreground tabular-nums">
                  {kpis.totalReceived.toLocaleString()} / {kpis.totalOrdered.toLocaleString()}{' '}
                  {t('received')}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className={kpiCardClass}>
            <CardContent className="pt-4 pb-3 px-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {t('Overall progress')}
              </div>
              <div className="text-2xl font-bold">
                {loading ? (
                  <ShimmerSkeleton className="h-7 w-16" />
                ) : (
                  <AnimatedCounter value={kpis.overallPercent} suffix="%" />
                )}
              </div>
              {!loading && <Progress value={kpis.overallPercent} className="h-1.5 mt-2" />}
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className={kpiCardClass}>
            <CardContent className="pt-4 pb-3 px-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock
                  className={cn(
                    'h-3.5 w-3.5',
                    oldestTier === 'overdue' && 'text-red-500',
                    oldestTier === 'aging' && 'text-amber-500'
                  )}
                />
                {t('Oldest open')}
              </div>
              <div
                className={cn(
                  'text-2xl font-bold',
                  !loading && oldestTier === 'overdue' && 'text-red-600 dark:text-red-400',
                  !loading && oldestTier === 'aging' && 'text-amber-600 dark:text-amber-400'
                )}
              >
                {loading ? (
                  <ShimmerSkeleton className="h-7 w-16" />
                ) : (
                  <AnimatedCounter value={kpis.oldestDays} suffix={` ${t('days')}`} />
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Toolbar: search + filters + reload */}
      <ListToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: t('Search by product, GTIN, batch, supplier…'),
        }}
        filters={filtersNode}
        activeFilterCount={activeFilterCount}
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            <span className="hidden sm:inline">{t('Reload')}</span>
          </Button>
        }
      />

      {/* Error panel */}
      {error && !loading ? (
        <Card className="border-destructive/40">
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="font-medium">{t('Failed to load outstanding receipts')}</p>
            <Button variant="outline" size="sm" className="h-11 md:h-9" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              {t('Try again')}
            </Button>
          </CardContent>
        </Card>
      ) : isMobile ? (
        /* Mobile: card list */
        loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <ShimmerSkeleton className="h-4 w-36" />
                    <ShimmerSkeleton className="h-6 w-24 rounded-full" />
                  </div>
                  <ShimmerSkeleton className="h-3 w-28" />
                  <ShimmerSkeleton className="h-1.5 w-full" />
                  <ShimmerSkeleton className="h-3 w-40" />
                  <ShimmerSkeleton className="h-11 w-full rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-12 text-center">{emptyStateNode}</div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="space-y-3"
          >
            {sorted.map(row => (
              <motion.div key={row.batchId} variants={itemVariants}>
                <OutstandingReceiptCard row={row} locale={locale} />
              </motion.div>
            ))}
          </motion.div>
        )
      ) : (
        /* Desktop: sortable table */
        <ResponsiveTable
          data={sorted}
          columns={columns}
          rowKey={row => row.batchId}
          sort={sort}
          onSortChange={setSort}
          loading={loading}
          emptyState={emptyStateNode}
        />
      )}
    </div>
  );
}
