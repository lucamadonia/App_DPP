/**
 * Outstanding Goods Receipts
 *
 * One row per batch where the ordered quantity is greater than what
 * has been received so far. Sorted oldest-first so old supplier
 * issues bubble up. Direct "Einlagern"-action prefills the goods
 * receipt wizard with the batch.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import {
  PackageOpen,
  Boxes,
  Clock,
  CheckCircle2,
  Filter,
  Search,
  AlertTriangle,
  ArrowDownToLine,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { Progress } from '@/components/ui/progress';
import { getOutstandingBatches } from '@/services/supabase/batches';
import { formatDate } from '@/lib/format';
import type { OutstandingBatch } from '@/services/supabase/batches';

export function OutstandingReceiptsPage() {
  const { t } = useTranslation('warehouse');
  const locale = useLocale();
  const navigate = useNavigate();

  const [data, setData] = useState<OutstandingBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [includeAllStatuses, setIncludeAllStatuses] = useState(false);
  const [showZeroReceived, setShowZeroReceived] = useState(true);
  const [showPartial, setShowPartial] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await getOutstandingBatches({ includeAllStatuses });
      setData(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeAllStatuses]);

  // Filtered view
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter(row => {
      if (!showZeroReceived && row.received === 0) return false;
      if (!showPartial && row.received > 0) return false;
      if (!q) return true;
      return (
        row.productName.toLowerCase().includes(q) ||
        row.productGtin.toLowerCase().includes(q) ||
        row.batchSerial.toLowerCase().includes(q) ||
        (row.batchNumber?.toLowerCase().includes(q) ?? false) ||
        (row.supplierName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [data, search, showZeroReceived, showPartial]);

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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('Outstanding Goods Receipts')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('Batches with units that the supplier ordered but the warehouse has not yet received in full.')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('Reload')}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <PackageOpen className="h-3.5 w-3.5" />
              {t('Open batches')}
            </div>
            <div className="text-2xl font-bold">{loading ? <ShimmerSkeleton className="h-7 w-16" /> : kpis.openBatches}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Boxes className="h-3.5 w-3.5" />
              {t('Outstanding units')}
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {loading ? <ShimmerSkeleton className="h-7 w-16" /> : kpis.totalOutstanding.toLocaleString()}
            </div>
            {!loading && kpis.totalOrdered > 0 && (
              <div className="text-xs text-muted-foreground">
                {kpis.totalReceived.toLocaleString()} / {kpis.totalOrdered.toLocaleString()} {t('received')}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {t('Overall progress')}
            </div>
            <div className="text-2xl font-bold">{loading ? <ShimmerSkeleton className="h-7 w-16" /> : `${kpis.overallPercent}%`}</div>
            {!loading && (
              <Progress value={kpis.overallPercent} className="h-1.5 mt-2" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {t('Oldest open')}
            </div>
            <div className="text-2xl font-bold">
              {loading ? <ShimmerSkeleton className="h-7 w-16" /> : `${kpis.oldestDays} ${t('days')}`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4 px-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('Search by product, GTIN, batch, supplier…')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={showZeroReceived} onCheckedChange={setShowZeroReceived} id="zero" />
            <Label htmlFor="zero" className="cursor-pointer">{t('Not yet received')}</Label>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={showPartial} onCheckedChange={setShowPartial} id="partial" />
            <Label htmlFor="partial" className="cursor-pointer">{t('Partially received')}</Label>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={includeAllStatuses} onCheckedChange={setIncludeAllStatuses} id="status" />
            <Label htmlFor="status" className="cursor-pointer">{t('Include draft + archived')}</Label>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Product')}</TableHead>
                  <TableHead>{t('Batch')}</TableHead>
                  <TableHead>{t('Supplier')}</TableHead>
                  <TableHead className="text-right">{t('Ordered')}</TableHead>
                  <TableHead className="text-right">{t('Received')}</TableHead>
                  <TableHead className="text-right">{t('Outstanding')}</TableHead>
                  <TableHead>{t('Progress')}</TableHead>
                  <TableHead>{t('Last receipt')}</TableHead>
                  <TableHead className="text-right">{t('Action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={9}><ShimmerSkeleton className="h-6 w-full" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <div className="text-center py-10 text-muted-foreground">
                        {data.length === 0 ? (
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                            <p className="font-medium">{t('All batches are fully stocked')}</p>
                            <p className="text-xs">{t('No outstanding goods receipts.')}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Filter className="h-8 w-8" />
                            <p>{t('No matches with the current filter')}</p>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!loading && filtered.map(row => {
                  const danger = row.daysOutstanding > 30;
                  const warn = row.daysOutstanding > 14;
                  const dotClass = danger ? 'bg-red-500' : warn ? 'bg-amber-500' : 'bg-muted-foreground/40';
                  return (
                    <TableRow key={row.batchId}>
                      <TableCell>
                        <Link to={`/products/${row.productId}`} className="font-medium hover:underline">
                          {row.productName}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono">{row.productGtin}</div>
                      </TableCell>
                      <TableCell>
                        <Link to={`/products/${row.productId}/batches/${row.batchId}`} className="font-mono text-sm hover:underline">
                          {row.batchSerial}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(row.productionDate, locale)}
                          {row.status !== 'live' && (
                            <Badge variant="outline" className="ml-2 text-[10px]">{row.status}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.supplierName || '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.ordered}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.received}</TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-amber-600 dark:text-amber-400">
                        {row.outstanding}
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <Progress value={row.receivedPercent} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground w-10 text-right">{row.receivedPercent}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
                          {row.lastReceiptAt ? (
                            <span>{formatDate(row.lastReceiptAt, locale)}</span>
                          ) : (
                            <span className="italic">{t('Never')}</span>
                          )}
                          {danger && (
                            <Badge variant="destructive" className="text-[10px] ml-1">
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                              {row.daysOutstanding}d
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => navigate(`/warehouse/goods-receipt?productId=${row.productId}&batchId=${row.batchId}`)}
                        >
                          <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                          {t('Stock In')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
