import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  BarChart3, Download, Package, Truck, Clock, Globe, Euro, Weight,
  TrendingUp, MapPin, Users, ArrowUpDown,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { getShipments } from '@/services/supabase/wh-shipments';
import { buildCsv, downloadCsv, timestampedFilename, type CsvColumn } from '@/lib/csv-export';
import {
  isInternational, getShippingZone, countryFlagEmoji, normalizeCountryIso2,
} from '@/lib/shipping-rates';
import { SHIPMENT_STATUS_COLORS, PRIORITY_COLORS } from '@/lib/warehouse-constants';
import type { WhShipment, ShipmentStatus } from '@/types/warehouse';
import { toast } from 'sonner';

type RangeKey = '7' | '30' | '90' | '365' | 'all';

export function ShipmentReportsPage() {
  const { t } = useTranslation('warehouse');
  const [range, setRange] = useState<RangeKey>('30');
  const [homeCountry, setHomeCountry] = useState<string>('DE');
  const [shipments, setShipments] = useState<WhShipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const dateFrom =
        range === 'all' ? undefined : isoDaysAgo(parseInt(range, 10));
      try {
        const res = await getShipments({
          dateFrom,
          page: 1,
          pageSize: 5000,
          sortBy: 'createdAt',
          sortDir: 'desc',
        });
        if (cancelled) return;
        setShipments(res.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range]);

  // Pull tenant home country once (for international zone detection)
  useEffect(() => {
    import('@/services/supabase/dhl-carrier').then(({ getDHLSettings }) =>
      getDHLSettings().then(s => {
        if (s?.shipper?.country) setHomeCountry(s.shipper.country);
      }),
    );
  }, []);

  const analytics = useMemo(() => computeAnalytics(shipments, homeCountry), [shipments, homeCountry]);

  function handleExportCSV() {
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
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            <SelectTrigger className="flex-1 sm:w-44">
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
          <Button onClick={handleExportCSV} disabled={shipments.length === 0} className="shrink-0 gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            {t('Dashboard')}
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            {t('Detail table')}
          </TabsTrigger>
          <TabsTrigger value="adhoc" className="gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5" />
            {t('Ad-hoc')}
          </TabsTrigger>
        </TabsList>

        {/* ====================== DASHBOARD ====================== */}
        <TabsContent value="dashboard" className="mt-4 space-y-4">
          {/* KPI Cards */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
              {Array.from({ length: 6 }).map((_, i) => <ShimmerSkeleton key={i} className="h-20" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
              <Kpi icon={<Package className="h-4 w-4" />} label={t('Total Shipments')} value={analytics.total.toString()} />
              <Kpi icon={<Truck className="h-4 w-4" />} label={t('Shipped')} value={analytics.shippedCount.toString()} />
              <Kpi icon={<Clock className="h-4 w-4" />} label={t('Avg. lead time')} value={analytics.avgLeadDays != null ? `${analytics.avgLeadDays.toFixed(1)} ${t('days')}` : '—'} />
              <Kpi icon={<Globe className="h-4 w-4" />} label={t('International')} value={`${analytics.intlCount} (${pct(analytics.intlCount, analytics.total)}%)`} />
              <Kpi icon={<Euro className="h-4 w-4" />} label={t('Shipping cost')} value={fmtEuro(analytics.totalCost)} />
              <Kpi icon={<Weight className="h-4 w-4" />} label={t('Total weight')} value={fmtWeight(analytics.totalWeightGrams)} />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Volume over time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {t('Shipments over time')}
                </CardTitle>
                <CardDescription>{t('Created per day')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.timeline}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={false} name={t('Shipments')} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Status distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('Status distribution')}</CardTitle>
                <CardDescription>{t('Where shipments currently sit in the pipeline')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.statusBreakdown}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry: { status: string; count: number }) => `${t(entry.status)}: ${entry.count}`}
                        labelLine={false}
                      >
                        {analytics.statusBreakdown.map((s, i) => (
                          <Cell key={s.status} fill={STATUS_COLORS_HEX[i % STATUS_COLORS_HEX.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Carrier breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  {t('Carrier breakdown')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.carrierBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="carrier" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="domestic" stackId="a" fill="#10B981" name={t('Domestic')} />
                      <Bar dataKey="eu" stackId="a" fill="#F59E0B" name={t('EU')} />
                      <Bar dataKey="worldwide" stackId="a" fill="#EF4444" name={t('Worldwide')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top countries */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t('Top destinations')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.topCountries} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="country" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8B5CF6" name={t('Shipments')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top recipients + products */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('Top recipients')}
                </CardTitle>
                <CardDescription>{t('By number of shipments')}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Recipient')}</TableHead>
                      <TableHead className="text-right">{t('Shipments')}</TableHead>
                      <TableHead className="text-right">{t('Items')}</TableHead>
                      <TableHead className="text-right">{t('Cost')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.topRecipients.slice(0, 10).map(r => (
                      <TableRow key={r.email + r.name}>
                        <TableCell>
                          <div className="text-sm font-medium">{r.name}</div>
                          {r.email && <div className="text-xs text-muted-foreground">{r.email}</div>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.items}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtEuro(r.cost)}</TableCell>
                      </TableRow>
                    ))}
                    {analytics.topRecipients.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                          {t('No data in range')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Status throughput / Lieferzeit by stage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('Lead time by stage')}
                </CardTitle>
                <CardDescription>{t('Average days between status transitions')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.leadTimeByStage}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="days" fill="#06B6D4" name={t('days')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ====================== DETAIL TABLE ====================== */}
        <TabsContent value="table" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => <ShimmerSkeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : shipments.length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">
                    {t('No shipments in this range')}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('Shipment Number')}</TableHead>
                        <TableHead>{t('Status')}</TableHead>
                        <TableHead>{t('Priority')}</TableHead>
                        <TableHead>{t('Recipient')}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('Company')}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('Email')}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('City')}</TableHead>
                        <TableHead>{t('Country')}</TableHead>
                        <TableHead>{t('Carrier')}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('Tracking Number')}</TableHead>
                        <TableHead className="text-right">{t('Items')}</TableHead>
                        <TableHead className="text-right hidden md:table-cell">{t('Weight')}</TableHead>
                        <TableHead className="text-right">{t('Cost')}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('Order Reference')}</TableHead>
                        <TableHead>{t('Created', { ns: 'common' })}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('shipped')}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('delivered')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shipments.map(s => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <Link to={`/warehouse/shipments/${s.id}`} className="font-mono text-xs text-primary hover:underline">
                              {s.shipmentNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`${SHIPMENT_STATUS_COLORS[s.status]} text-[10px]`}>
                              {t(s.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`${PRIORITY_COLORS[s.priority] || ''} text-[10px]`}>
                              {t(s.priority)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{s.recipientName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{s.recipientCompany || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{s.recipientEmail || '—'}</TableCell>
                          <TableCell className="text-xs hidden lg:table-cell">{s.shippingCity}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            <span className="mr-1" aria-hidden>{countryFlagEmoji(s.shippingCountry)}</span>
                            {normalizeCountryIso2(s.shippingCountry) || s.shippingCountry}
                          </TableCell>
                          <TableCell className="text-xs">{s.carrier || '—'}</TableCell>
                          <TableCell className="font-mono text-xs hidden lg:table-cell">{s.trackingNumber || '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.totalItems}</TableCell>
                          <TableCell className="text-right tabular-nums hidden md:table-cell">{fmtWeight(s.totalWeightGrams ?? 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.shippingCost != null ? fmtEuro(s.shippingCost) : '—'}</TableCell>
                          <TableCell className="text-xs font-mono hidden lg:table-cell">{s.orderReference || '—'}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{fmtDate(s.createdAt)}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap hidden lg:table-cell">{s.shippedAt ? fmtDate(s.shippedAt) : '—'}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap hidden lg:table-cell">{s.deliveredAt ? fmtDate(s.deliveredAt) : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
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
// Sub-components
// ============================================

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-1 text-lg sm:text-xl font-bold tabular-nums break-all">{value}</div>
      </CardContent>
    </Card>
  );
}

function AdHocPivot({ shipments, homeCountry }: { shipments: WhShipment[]; homeCountry: string }) {
  const [rowDim, setRowDim] = useState<'status' | 'carrier' | 'country' | 'priority' | 'zone'>('status');
  const [colDim, setColDim] = useState<'month' | 'carrier' | 'zone' | 'priority'>('month');

  const matrix = useMemo(
    () => buildPivot(shipments, rowDim, colDim, homeCountry),
    [shipments, rowDim, colDim, homeCountry],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pivot — Sendungen nach zwei Dimensionen gruppieren</CardTitle>
        <CardDescription>Wähle Zeilen- und Spalten-Achse für Ad-hoc-Auswertung.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium">Zeilen:</span>
          <Select value={rowDim} onValueChange={v => setRowDim(v as typeof rowDim)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="carrier">Carrier</SelectItem>
              <SelectItem value="country">Land</SelectItem>
              <SelectItem value="priority">Priorität</SelectItem>
              <SelectItem value="zone">Versand-Zone</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm font-medium ml-2">Spalten:</span>
          <Select value={colDim} onValueChange={v => setColDim(v as typeof colDim)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Monat</SelectItem>
              <SelectItem value="carrier">Carrier</SelectItem>
              <SelectItem value="zone">Versand-Zone</SelectItem>
              <SelectItem value="priority">Priorität</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{rowDim}</TableHead>
                {matrix.cols.map(c => (
                  <TableHead key={c} className="text-right">{c}</TableHead>
                ))}
                <TableHead className="text-right font-bold">Σ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.rows.map(r => (
                <TableRow key={r}>
                  <TableCell className="font-medium">{r}</TableCell>
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
      </CardContent>
    </Card>
  );
}

// ============================================
// Helpers
// ============================================

const STATUS_COLORS_HEX = ['#94A3B8', '#FCD34D', '#60A5FA', '#A78BFA', '#34D399', '#10B981', '#F87171', '#6B7280'];

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function pct(part: number, total: number): string {
  if (total === 0) return '0';
  return ((part / total) * 100).toFixed(0);
}

function fmtEuro(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
}

function fmtWeight(g: number): string {
  if (g === 0) return '0 g';
  if (g < 1000) return `${g} g`;
  return `${(g / 1000).toFixed(1)} kg`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE');
}
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-DE');
}

interface Analytics {
  total: number;
  shippedCount: number;
  intlCount: number;
  totalCost: number;
  totalWeightGrams: number;
  avgLeadDays: number | null;
  timeline: { day: string; count: number }[];
  statusBreakdown: { status: ShipmentStatus; count: number }[];
  carrierBreakdown: { carrier: string; domestic: number; eu: number; worldwide: number }[];
  topCountries: { country: string; count: number }[];
  topRecipients: { name: string; email: string; count: number; items: number; cost: number }[];
  leadTimeByStage: { stage: string; days: number }[];
}

function computeAnalytics(shipments: WhShipment[], homeCountry: string): Analytics {
  const total = shipments.length;
  let shippedCount = 0;
  let intlCount = 0;
  let totalCost = 0;
  let totalWeightGrams = 0;
  let leadSum = 0;
  let leadN = 0;

  // Timeline buckets — last 30 days minimum
  const timelineMap = new Map<string, number>();
  const statusMap = new Map<ShipmentStatus, number>();
  const carrierZoneMap = new Map<string, { domestic: number; eu: number; worldwide: number }>();
  const countryMap = new Map<string, number>();
  const recipientMap = new Map<string, { name: string; email: string; count: number; items: number; cost: number }>();

  // For lead time by stage: created→shipped and shipped→delivered
  let createdToShippedSum = 0, createdToShippedN = 0;
  let shippedToDeliveredSum = 0, shippedToDeliveredN = 0;

  for (const s of shipments) {
    if (s.shippedAt) shippedCount++;
    if (isInternational(homeCountry, s.shippingCountry)) intlCount++;
    if (s.shippingCost) totalCost += Number(s.shippingCost);
    if (s.totalWeightGrams) totalWeightGrams += Number(s.totalWeightGrams);

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
    if (s.createdAt && s.deliveredAt) {
      const ms = new Date(s.deliveredAt).getTime() - new Date(s.createdAt).getTime();
      if (ms > 0) {
        leadSum += ms;
        leadN++;
      }
    }

    const day = new Date(s.createdAt).toISOString().slice(0, 10);
    timelineMap.set(day, (timelineMap.get(day) || 0) + 1);

    statusMap.set(s.status, (statusMap.get(s.status) || 0) + 1);

    const carrier = s.carrier || '—';
    const zone = getShippingZone(homeCountry, s.shippingCountry);
    const cz = carrierZoneMap.get(carrier) || { domestic: 0, eu: 0, worldwide: 0 };
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
    .sort((a, b) => b.domestic + b.eu + b.worldwide - (a.domestic + a.eu + a.worldwide));

  const topCountries = Array.from(countryMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topRecipients = Array.from(recipientMap.values()).sort((a, b) => b.count - a.count);

  const leadTimeByStage = [
    { stage: 'Entwurf → Versendet', days: createdToShippedN > 0 ? +(createdToShippedSum / createdToShippedN / 86400000).toFixed(1) : 0 },
    { stage: 'Versendet → Geliefert', days: shippedToDeliveredN > 0 ? +(shippedToDeliveredSum / shippedToDeliveredN / 86400000).toFixed(1) : 0 },
  ];

  return {
    total,
    shippedCount,
    intlCount,
    totalCost,
    totalWeightGrams,
    avgLeadDays: leadN > 0 ? leadSum / leadN / 86400000 : null,
    timeline,
    statusBreakdown,
    carrierBreakdown,
    topCountries,
    topRecipients,
    leadTimeByStage,
  };
}

interface PivotResult {
  rows: string[];
  cols: string[];
  cells: Record<string, number>;
  rowTotals: Record<string, number>;
  colTotals: Record<string, number>;
  grandTotal: number;
}

function buildPivot(
  shipments: WhShipment[],
  rowDim: 'status' | 'carrier' | 'country' | 'priority' | 'zone',
  colDim: 'month' | 'carrier' | 'zone' | 'priority',
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
