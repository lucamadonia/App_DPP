import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, Truck, Search, Package, FileText, CheckCircle2,
  Rocket, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { getShipments, getShipmentStatusCounts } from '@/services/supabase/wh-shipments';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { SHIPMENT_STATUS_COLORS, PRIORITY_COLORS } from '@/lib/warehouse-constants';
import type { WhShipment, ShipmentStatus, ShipmentPriority } from '@/types/warehouse';
import { CARRIER_OPTIONS } from '@/types/warehouse';

/* -------------------------------------------------------------------------- */
/*  KPI Card                                                                   */
/* -------------------------------------------------------------------------- */

function KPICard({ label, value, icon: Icon, color, bgColor, loading }: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  loading: boolean;
}) {
  const animated = useAnimatedNumber(loading ? 0 : value);
  return (
    <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2.5 ${bgColor}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="h-7 w-12 mb-1" />
            ) : (
              <p className="text-2xl font-bold tabular-nums leading-none">{animated}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sortable Column Header                                                     */
/* -------------------------------------------------------------------------- */

function SortableHeader({ label, sortKey, currentSort, currentDir, onSort, className }: {
  label: string;
  sortKey: string;
  currentSort: string;
  currentDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  className?: string;
}) {
  const isActive = currentSort === sortKey;
  return (
    <TableHead className={className}>
      <button
        className="flex items-center gap-1 hover:text-foreground transition-colors -ml-1 px-1"
        onClick={() => onSort(sortKey)}
      >
        {label}
        {isActive ? (
          currentDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

/* -------------------------------------------------------------------------- */
/*  STATUS TABS                                                                */
/* -------------------------------------------------------------------------- */

const STATUS_TAB_ORDER: (ShipmentStatus | 'all')[] = [
  'all', 'draft', 'picking', 'packed', 'label_created', 'shipped', 'in_transit', 'delivered', 'cancelled',
];

/* -------------------------------------------------------------------------- */
/*  Page Component                                                             */
/* -------------------------------------------------------------------------- */

export function ShipmentListPage() {
  const { t } = useTranslation('warehouse');

  // Data
  const [shipments, setShipments] = useState<WhShipment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [countsLoading, setCountsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ShipmentStatus | 'all'>('all');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeTab, carrierFilter, priorityFilter, dateFrom, dateTo, pageSize]);

  // Load status counts
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCountsLoading(true);
      const counts = await getShipmentStatusCounts();
      if (!cancelled) {
        setStatusCounts(counts);
        setCountsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load shipments
  const loadShipments = useCallback(async () => {
    setLoading(true);
    const statusFilter = activeTab === 'all' ? undefined : [activeTab];
    const priorityArr = priorityFilter !== 'all' ? [priorityFilter as ShipmentPriority] : undefined;

    const result = await getShipments({
      status: statusFilter,
      priority: priorityArr,
      carrier: carrierFilter !== 'all' ? carrierFilter : undefined,
      search: debouncedSearch || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize,
      sortBy,
      sortDir,
    });
    setShipments(result.data);
    setTotalCount(result.total);
    setLoading(false);
  }, [activeTab, carrierFilter, priorityFilter, debouncedSearch, dateFrom, dateTo, page, pageSize, sortBy, sortDir]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  // Sorting toggle
  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // KPI derived values
  const kpiTotal = statusCounts.all || 0;
  const kpiDraft = statusCounts.draft || 0;
  const kpiInProgress = (statusCounts.picking || 0) + (statusCounts.packed || 0) + (statusCounts.label_created || 0);
  const kpiDelivered = statusCounts.delivered || 0;

  // Today shipped count — use dedicated field from stats if available, fallback to shipped count
  const [shippedToday, setShippedToday] = useState(0);
  useEffect(() => {
    import('@/services/supabase/wh-shipments').then(({ getShipmentStats }) =>
      getShipmentStats().then(s => setShippedToday(s.shippedToday || 0))
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-2.5">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t('Shipments')}
            </h1>
          </div>
        </div>
        <Button asChild>
          <Link to="/warehouse/shipments/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('Create Shipment')}
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label={t('Total Shipments')} value={kpiTotal} icon={Package} color="text-blue-600" bgColor="bg-blue-100 dark:bg-blue-900/30" loading={countsLoading} />
        <KPICard label={t('Drafts')} value={kpiDraft} icon={FileText} color="text-gray-600" bgColor="bg-gray-100 dark:bg-gray-800" loading={countsLoading} />
        <KPICard label={t('In Progress')} value={kpiInProgress} icon={ArrowUpDown} color="text-yellow-600" bgColor="bg-yellow-100 dark:bg-yellow-900/30" loading={countsLoading} />
        <KPICard label={t('delivered')} value={kpiDelivered} icon={CheckCircle2} color="text-green-600" bgColor="bg-green-100 dark:bg-green-900/30" loading={countsLoading} />
        <KPICard label={t('Shipped Today')} value={shippedToday} icon={Rocket} color="text-purple-600" bgColor="bg-purple-100 dark:bg-purple-900/30" loading={countsLoading} />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mb-1">
        {STATUS_TAB_ORDER.map((status) => {
          const count = statusCounts[status] || 0;
          const isActive = activeTab === status;
          return (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              {status === 'all' ? t('All') : t(status)}
              <span className={`inline-flex items-center justify-center rounded-full px-1.5 min-w-[1.25rem] h-5 text-xs font-semibold ${
                isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-muted-foreground'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('Search...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={carrierFilter} onValueChange={setCarrierFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t('Carrier')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All')} {t('Carrier')}</SelectItem>
            {CARRIER_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t('Priority')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All')} {t('Priority')}</SelectItem>
            <SelectItem value="low">{t('low')}</SelectItem>
            <SelectItem value="normal">{t('normal')}</SelectItem>
            <SelectItem value="high">{t('high')}</SelectItem>
            <SelectItem value="urgent">{t('urgent')}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full sm:w-40"
          placeholder={t('Date from')}
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full sm:w-40"
          placeholder={t('Date to')}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader label={t('Shipment Number')} sortKey="shipmentNumber" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label={t('Status')} sortKey="status" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label={t('Recipient')} sortKey="recipientName" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <TableHead className="hidden md:table-cell">{t('Carrier')}</TableHead>
                  <SortableHeader label={t('Priority')} sortKey="priority" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
                  <TableHead className="text-right">{t('Items')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('Tracking Number')}</TableHead>
                  <SortableHeader label={t('Created', { ns: 'common' })} sortKey="createdAt" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j} className={j === 4 ? 'hidden sm:table-cell' : j === 3 ? 'hidden md:table-cell' : j === 6 ? 'hidden lg:table-cell' : ''}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : shipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-3 py-8">
                        <div className="rounded-full bg-muted p-4">
                          <Truck className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{t('No shipments yet')}</p>
                          <p className="text-sm text-muted-foreground mt-1">{t('Create your first shipment to get started')}</p>
                        </div>
                        <Button asChild size="sm" className="mt-2">
                          <Link to="/warehouse/shipments/new">
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Create Shipment')}
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  shipments.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <Link to={`/warehouse/shipments/${s.id}`} className="font-medium text-primary hover:underline">
                          {s.shipmentNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={SHIPMENT_STATUS_COLORS[s.status]}>{t(s.status)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{s.recipientName}</div>
                        {s.recipientCompany && <div className="text-xs text-muted-foreground">{s.recipientCompany}</div>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{s.carrier || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className={PRIORITY_COLORS[s.priority] || ''}>{t(s.priority)}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{s.totalItems}</TableCell>
                      <TableCell className="hidden lg:table-cell font-mono text-xs">{s.trackingNumber || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {t('Page')} {page} {t('of')} {totalPages} ({totalCount} {t('Total Shipments')})
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 {t('per page')}</SelectItem>
                <SelectItem value="50">50 {t('per page')}</SelectItem>
                <SelectItem value="100">100 {t('per page')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
