import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, Box, Download, Package, ArrowUpDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { ScrollableTabs } from '@/components/ui/scrollable-tabs';
import { EmptyState, ErrorState } from '@/components/ui/state-feedback';
import { ResponsiveTable, type ResponsiveTableColumn, type SortState } from '@/components/ui/responsive-table';
import { PackagingUsageTab } from '@/components/warehouse/PackagingUsageTab';
import { ReportKpiStrip } from '@/components/warehouse/report-kpi-strip';
import { ReportCharts, RevealSection } from '@/components/warehouse/report-charts';
import {
  computeAnalytics, computeKpiTotals, buildPivot, rangeBounds,
  fmtDate, fmtDateTime, fmtEuro, fmtWeight,
  type KpiTotals, type PivotColDim, type PivotRowDim, type RangeKey,
} from '@/components/warehouse/report-analytics';
import { getShipments, getItemsForShipments } from '@/services/supabase/wh-shipments';
import { buildCsv, downloadCsv, timestampedFilename, type CsvColumn } from '@/lib/csv-export';
import { countryFlagEmoji, normalizeCountryIso2 } from '@/lib/shipping-rates';
import { SHIPMENT_STATUS_COLORS, PRIORITY_COLORS } from '@/lib/warehouse-constants';
import { blurIn, useMotionVariants } from '@/lib/motion';
import type { WhShipment, WhShipmentItem } from '@/types/warehouse';
import { toast } from 'sonner';

/** Fallback range start for "all time" (packaging tab needs a concrete bound). */
const ALL_TIME_FROM = '2020-01-01T00:00:00.000Z';

export function ShipmentReportsPage() {
  const { t } = useTranslation('warehouse');
  const headerVariants = useMotionVariants(blurIn);
  const [range, setRange] = useState<RangeKey>('30');
  const [homeCountry, setHomeCountry] = useState<string>('DE');
  const [shipments, setShipments] = useState<WhShipment[]>([]);
  const [prevShipments, setPrevShipments] = useState<WhShipment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [exporting, setExporting] = useState(false);

  const bounds = useMemo(() => rangeBounds(range), [range]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const base = { page: 1, pageSize: 5000, sortBy: 'createdAt' as const, sortDir: 'desc' as const };
        const [current, previous] = await Promise.all([
          getShipments({ ...base, dateFrom: bounds.from, dateTo: bounds.to }),
          bounds.hasComparison
            ? getShipments({ ...base, dateFrom: bounds.prevFrom, dateTo: bounds.prevTo })
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setShipments(current.data);
        setPrevShipments(previous?.data ?? null);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load shipment reports', err);
        setLoadError(true);
        setShipments([]);
        setPrevShipments(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bounds, reloadKey]);

  // Pull tenant home country once (for international zone detection)
  useEffect(() => {
    import('@/services/supabase/dhl-carrier')
      .then(({ getDHLSettings }) => getDHLSettings())
      .then(s => {
        if (s?.shipper?.country) setHomeCountry(s.shipper.country);
      })
      .catch(() => { /* optional setting — keep DE default */ });
  }, []);

  const analytics = useMemo(() => computeAnalytics(shipments, homeCountry), [shipments, homeCountry]);
  const prevTotals = useMemo<KpiTotals | null>(
    () => (prevShipments ? computeKpiTotals(prevShipments, homeCountry) : null),
    [prevShipments, homeCountry],
  );

  async function handleExportCSV(mode: 'summary' | 'detail' = 'summary') {
    setExporting(true);
    try {
      const itemsMap = await getItemsForShipments(shipments.map(s => s.id));

      if (mode === 'detail') {
        type DetailRow = { shipment: WhShipment; item: WhShipmentItem | null };
        const rows: DetailRow[] = [];
        for (const s of shipments) {
          const items = itemsMap.get(s.id) || [];
          if (items.length === 0) {
            rows.push({ shipment: s, item: null });
          } else {
            for (const it of items) rows.push({ shipment: s, item: it });
          }
        }
        const detailCols: CsvColumn<DetailRow>[] = [
          { header: t('Shipment Number'), value: r => r.shipment.shipmentNumber },
          { header: t('Status'), value: r => t(r.shipment.status) },
          { header: t('Recipient'), value: r => r.shipment.recipientName },
          { header: t('Country'), value: r => r.shipment.shippingCountry },
          { header: t('Carrier'), value: r => r.shipment.carrier || '' },
          { header: t('Order Reference'), value: r => r.shipment.orderReference || '' },
          { header: t('Product'), value: r => r.item?.productName || '' },
          { header: t('Variant'), value: r => r.item?.variantTitle || '' },
          { header: t('Batch / Serial'), value: r => r.item?.batchSerialNumber || '' },
          { header: t('Quantity'), value: r => r.item?.quantity ?? '' },
          { header: t('Gift'), value: r => (r.item?.isGift ? 'yes' : '') },
          { header: t('Unit price'), value: r => r.item?.unitPrice ?? '' },
          { header: t('Location'), value: r => r.item?.locationName || '' },
          { header: t('Created', { ns: 'common' }), value: r => fmtDateTime(r.shipment.createdAt) },
          { header: t('shipped'), value: r => (r.shipment.shippedAt ? fmtDateTime(r.shipment.shippedAt) : '') },
        ];
        const csv = buildCsv(rows, detailCols);
        downloadCsv(timestampedFilename('shipments-detail'), csv);
        toast.success(t('Exported {{n}} item rows', { n: rows.length }));
        return;
      }

      const cols: CsvColumn<WhShipment>[] = [
        { header: t('Shipment Number'), value: r => r.shipmentNumber },
        { header: t('Status'), value: r => t(r.status) },
        { header: t('Priority'), value: r => t(r.priority) },
        { header: t('Recipient'), value: r => r.recipientName },
        { header: t('Company'), value: r => r.recipientCompany || '' },
        { header: t('Email'), value: r => r.recipientEmail || '' },
        { header: t('Phone'), value: r => r.recipientPhone || '' },
        { header: t('Street'), value: r => r.shippingStreet },
        { header: t('Postal Code'), value: r => r.shippingPostalCode },
        { header: t('City'), value: r => r.shippingCity },
        { header: t('Country'), value: r => r.shippingCountry },
        { header: t('Carrier'), value: r => r.carrier || '' },
        { header: t('Tracking Number'), value: r => r.trackingNumber || '' },
        { header: t('Items'), value: r => r.totalItems },
        {
          header: t('Products'),
          value: r => {
            const items = itemsMap.get(r.id) || [];
            return items
              .map(it => {
                const name = it.productName || '';
                const variant = it.variantTitle ? ` ${it.variantTitle}` : '';
                return `${name}${variant} ×${it.quantity}${it.isGift ? ' [Beigabe]' : ''}`.trim();
              })
              .join(' | ');
          },
        },
        { header: t('Weight') + ' (g)', value: r => r.totalWeightGrams ?? '' },
        { header: t('Shipping Cost'), value: r => r.shippingCost ?? '' },
        { header: t('Order Reference'), value: r => r.orderReference || '' },
        { header: t('Created', { ns: 'common' }), value: r => fmtDateTime(r.createdAt) },
        { header: t('shipped'), value: r => (r.shippedAt ? fmtDateTime(r.shippedAt) : '') },
        { header: t('delivered'), value: r => (r.deliveredAt ? fmtDateTime(r.deliveredAt) : '') },
      ];
      const csv = buildCsv(shipments, cols);
      downloadCsv(timestampedFilename('shipments-report'), csv);
      toast.success(t('Exported {{n}} shipments', { n: shipments.length }));
    } catch (err) {
      console.error('CSV export failed', err);
      toast.error(t('Export failed'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div
        variants={headerVariants}
        initial="initial"
        animate="animate"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 p-2 sm:p-2.5">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {t('Reports & Analytics')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('Comprehensive shipment analytics with charts, top lists and full-detail export.')}
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={range} onValueChange={v => setRange(v as RangeKey)}>
            <SelectTrigger className="flex-1 sm:w-44 h-11 sm:h-9 motion-safe:active:scale-[0.97] motion-safe:transition-transform">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t('Last 7 days')}</SelectItem>
              <SelectItem value="30">{t('Last 30 days')}</SelectItem>
              <SelectItem value="90">{t('Last 90 days')}</SelectItem>
              <SelectItem value="365">{t('Last 12 months')}</SelectItem>
              <SelectItem value="all">{t('All time')}</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={shipments.length === 0 || exporting}
                className="shrink-0 gap-2 h-11 sm:h-9 motion-safe:active:scale-[0.97] motion-safe:transition-transform"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{exporting ? t('Exporting…') : 'CSV'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem disabled={exporting} onClick={() => handleExportCSV('summary')} className="min-h-11 sm:min-h-9">
                <Download className="mr-2 h-4 w-4" />
                {t('Export CSV (summary)')}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={exporting} onClick={() => handleExportCSV('detail')} className="min-h-11 sm:min-h-9">
                <Download className="mr-2 h-4 w-4" />
                {t('Export CSV (one row per item)')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      <Tabs defaultValue="dashboard">
        <ScrollableTabs>
          <TabsList className="w-max">
            <TabsTrigger value="dashboard" className="gap-1.5 motion-safe:active:scale-[0.97] motion-safe:transition-transform">
              <BarChart3 className="h-3.5 w-3.5" />
              {t('Dashboard')}
            </TabsTrigger>
            <TabsTrigger value="packaging" className="gap-1.5 motion-safe:active:scale-[0.97] motion-safe:transition-transform">
              <Box className="h-3.5 w-3.5" />
              {t('Packaging')}
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-1.5 motion-safe:active:scale-[0.97] motion-safe:transition-transform">
              <Package className="h-3.5 w-3.5" />
              {t('Detail table')}
            </TabsTrigger>
            <TabsTrigger value="adhoc" className="gap-1.5 motion-safe:active:scale-[0.97] motion-safe:transition-transform">
              <ArrowUpDown className="h-3.5 w-3.5" />
              {t('Ad-hoc')}
            </TabsTrigger>
          </TabsList>
        </ScrollableTabs>

        {/* ====================== DASHBOARD ====================== */}
        <TabsContent value="dashboard" className="mt-4 space-y-4">
          {loadError ? (
            <ErrorState
              title={t('Failed to load shipments')}
              onRetry={() => setReloadKey(k => k + 1)}
            />
          ) : (
            <>
              <ReportKpiStrip
                loading={loading}
                hasComparison={bounds.hasComparison}
                totals={analytics}
                prev={prevTotals}
              />
              {loading ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ShimmerSkeleton key={i} className="h-56 sm:h-64 rounded-xl" />
                  ))}
                </div>
              ) : analytics.total === 0 ? (
                <EmptyState
                  icon={Package}
                  title={t('No shipments in this range')}
                  description={t('Try a wider date range or create new shipments.')}
                />
              ) : (
                <ReportCharts analytics={analytics} />
              )}
            </>
          )}
        </TabsContent>

        {/* ====================== PACKAGING ====================== */}
        <TabsContent value="packaging" className="mt-4">
          <PackagingUsageTab from={bounds.from ?? ALL_TIME_FROM} to={bounds.to} />
        </TabsContent>

        {/* ====================== DETAIL TABLE ====================== */}
        <TabsContent value="table" className="mt-4">
          {loadError ? (
            <ErrorState
              title={t('Failed to load shipments')}
              onRetry={() => setReloadKey(k => k + 1)}
            />
          ) : (
            <ShipmentDetailTable shipments={shipments} loading={loading} />
          )}
        </TabsContent>

        {/* ====================== AD-HOC PIVOT ====================== */}
        <TabsContent value="adhoc" className="mt-4 space-y-4">
          <AdHocPivot shipments={shipments} homeCountry={homeCountry} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// Detail table (responsive: table on md+, cards below)
// ============================================

function ShipmentDetailTable({ shipments, loading }: { shipments: WhShipment[]; loading: boolean }) {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();
  const [sort, setSort] = useState<SortState>({ by: 'created', order: 'desc' });

  const columns = useMemo<ResponsiveTableColumn<WhShipment>[]>(() => [
    {
      id: 'number',
      header: t('Shipment Number'),
      cell: s => <span className="font-mono text-xs text-primary">{s.shipmentNumber}</span>,
      mobilePriority: 'title',
      sortable: true,
      sortAccessor: s => s.shipmentNumber,
    },
    {
      id: 'status',
      header: t('Status'),
      cell: s => (
        <Badge variant="secondary" className={`${SHIPMENT_STATUS_COLORS[s.status]} text-[10px]`}>
          {t(s.status)}
        </Badge>
      ),
      mobilePriority: 'badge',
    },
    {
      id: 'priority',
      header: t('Priority'),
      cell: s => (
        <Badge variant="secondary" className={`${PRIORITY_COLORS[s.priority] || ''} text-[10px]`}>
          {t(s.priority)}
        </Badge>
      ),
    },
    {
      id: 'recipient',
      header: t('Recipient'),
      cell: s => <span className="text-sm whitespace-nowrap">{s.recipientName}</span>,
      mobilePriority: 'subtitle',
      sortable: true,
      sortAccessor: s => s.recipientName,
    },
    {
      id: 'company',
      header: t('Company'),
      cell: s => <span className="text-xs text-muted-foreground">{s.recipientCompany || '—'}</span>,
      hideBelow: 'md',
    },
    {
      id: 'email',
      header: t('Email'),
      cell: s => <span className="text-xs text-muted-foreground">{s.recipientEmail || '—'}</span>,
      hideBelow: 'md',
    },
    {
      id: 'city',
      header: t('City'),
      cell: s => <span className="text-xs">{s.shippingCity}</span>,
      hideBelow: 'lg',
    },
    {
      id: 'country',
      header: t('Country'),
      cell: s => (
        <span className="text-xs whitespace-nowrap">
          <span className="mr-1" aria-hidden>{countryFlagEmoji(s.shippingCountry)}</span>
          {normalizeCountryIso2(s.shippingCountry) || s.shippingCountry}
        </span>
      ),
      mobilePriority: 'meta',
      mobileLabel: t('Country'),
    },
    {
      id: 'carrier',
      header: t('Carrier'),
      cell: s => <span className="text-xs">{s.carrier || '—'}</span>,
      mobilePriority: 'meta',
      mobileLabel: t('Carrier'),
    },
    {
      id: 'tracking',
      header: t('Tracking Number'),
      cell: s => <span className="font-mono text-xs">{s.trackingNumber || '—'}</span>,
      hideBelow: 'lg',
    },
    {
      id: 'items',
      header: t('Items'),
      cell: s => <span className="tabular-nums">{s.totalItems}</span>,
      className: 'text-right',
      mobilePriority: 'meta',
      mobileLabel: t('Items'),
      sortable: true,
      sortAccessor: s => s.totalItems,
    },
    {
      id: 'weight',
      header: t('Weight'),
      cell: s => <span className="tabular-nums">{fmtWeight(s.totalWeightGrams ?? 0)}</span>,
      className: 'text-right',
      hideBelow: 'md',
      sortable: true,
      sortAccessor: s => s.totalWeightGrams ?? 0,
    },
    {
      id: 'cost',
      header: t('Cost'),
      cell: s => <span className="tabular-nums">{s.shippingCost != null ? fmtEuro(s.shippingCost) : '—'}</span>,
      className: 'text-right',
      mobilePriority: 'meta',
      mobileLabel: t('Cost'),
      sortable: true,
      sortAccessor: s => s.shippingCost ?? 0,
    },
    {
      id: 'orderRef',
      header: t('Order Reference'),
      cell: s => <span className="text-xs font-mono">{s.orderReference || '—'}</span>,
      hideBelow: 'xl',
    },
    {
      id: 'created',
      header: t('Created', { ns: 'common' }),
      cell: s => <span className="text-xs whitespace-nowrap tabular-nums">{fmtDate(s.createdAt)}</span>,
      mobilePriority: 'meta',
      mobileLabel: t('Created', { ns: 'common' }),
      sortable: true,
      sortAccessor: s => s.createdAt,
    },
    {
      id: 'shipped',
      header: t('shipped'),
      cell: s => <span className="text-xs whitespace-nowrap tabular-nums">{s.shippedAt ? fmtDate(s.shippedAt) : '—'}</span>,
      hideBelow: 'lg',
    },
    {
      id: 'delivered',
      header: t('delivered'),
      cell: s => <span className="text-xs whitespace-nowrap tabular-nums">{s.deliveredAt ? fmtDate(s.deliveredAt) : '—'}</span>,
      hideBelow: 'lg',
    },
  ], [t]);

  const sorted = useMemo(() => {
    const col = columns.find(c => c.id === sort.by);
    if (!col?.sortAccessor) return shipments;
    const acc = col.sortAccessor;
    const dir = sort.order === 'asc' ? 1 : -1;
    return [...shipments].sort((a, b) => {
      const va = acc(a);
      const vb = acc(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [shipments, sort, columns]);

  return (
    <RevealSection>
      <ResponsiveTable
        data={sorted}
        columns={columns}
        rowKey={s => s.id}
        onRowClick={s => navigate(`/warehouse/shipments/${s.id}`)}
        rowHref={s => `/warehouse/shipments/${s.id}`}
        sort={sort}
        onSortChange={setSort}
        loading={loading}
        loadingRows={8}
        emptyState={
          <EmptyState
            icon={Package}
            title={t('No shipments in this range')}
            description={t('Try a wider date range or create new shipments.')}
          />
        }
      />
    </RevealSection>
  );
}

// ============================================
// Ad-hoc pivot
// ============================================

function AdHocPivot({ shipments, homeCountry }: { shipments: WhShipment[]; homeCountry: string }) {
  const { t } = useTranslation('warehouse');
  const [rowDim, setRowDim] = useState<PivotRowDim>('status');
  const [colDim, setColDim] = useState<PivotColDim>('month');

  const matrix = useMemo(
    () => buildPivot(shipments, rowDim, colDim, homeCountry),
    [shipments, rowDim, colDim, homeCountry],
  );

  const dimLabel = (dim: string): string => {
    switch (dim) {
      case 'status': return t('Status');
      case 'carrier': return t('Carrier');
      case 'country': return t('Country');
      case 'priority': return t('Priority');
      case 'zone': return t('Shipping zone');
      case 'month': return t('Month');
      default: return dim;
    }
  };

  // Translate row labels for enum-like dimensions (status/priority keys exist in i18n)
  const rowLabel = (r: string) => (rowDim === 'status' || rowDim === 'priority' ? t(r) : r);

  return (
    <RevealSection>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Pivot — group shipments by two dimensions')}</CardTitle>
          <CardDescription>{t('Choose row and column axis for ad-hoc analysis.')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium w-16 sm:w-auto shrink-0">{t('Rows')}:</span>
              <Select value={rowDim} onValueChange={v => setRowDim(v as PivotRowDim)}>
                <SelectTrigger className="flex-1 sm:w-40 h-11 sm:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">{t('Status')}</SelectItem>
                  <SelectItem value="carrier">{t('Carrier')}</SelectItem>
                  <SelectItem value="country">{t('Country')}</SelectItem>
                  <SelectItem value="priority">{t('Priority')}</SelectItem>
                  <SelectItem value="zone">{t('Shipping zone')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 sm:ml-2">
              <span className="text-sm font-medium w-16 sm:w-auto shrink-0">{t('Columns')}:</span>
              <Select value={colDim} onValueChange={v => setColDim(v as PivotColDim)}>
                <SelectTrigger className="flex-1 sm:w-40 h-11 sm:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">{t('Month')}</SelectItem>
                  <SelectItem value="carrier">{t('Carrier')}</SelectItem>
                  <SelectItem value="zone">{t('Shipping zone')}</SelectItem>
                  <SelectItem value="priority">{t('Priority')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {matrix.rows.length === 0 ? (
            <EmptyState
              icon={ArrowUpDown}
              title={t('No data in range')}
              description={t('Try a wider date range or create new shipments.')}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dimLabel(rowDim)}</TableHead>
                    {matrix.cols.map(c => (
                      <TableHead key={c} className="text-right">{c}</TableHead>
                    ))}
                    <TableHead className="text-right font-bold">Σ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrix.rows.map(r => (
                    <TableRow key={r}>
                      <TableCell className="font-medium">{rowLabel(r)}</TableCell>
                      {matrix.cols.map(c => (
                        <TableCell key={c} className="text-right tabular-nums">
                          {matrix.cells[`${r}|${c}`] || 0}
                        </TableCell>
                      ))}
                      <TableCell className="text-right tabular-nums font-bold">{matrix.rowTotals[r]}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Σ</TableCell>
                    {matrix.cols.map(c => (
                      <TableCell key={c} className="text-right tabular-nums">{matrix.colTotals[c]}</TableCell>
                    ))}
                    <TableCell className="text-right tabular-nums">{matrix.grandTotal}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </RevealSection>
  );
}
