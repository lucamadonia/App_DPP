import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  AlertTriangle,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  MoreHorizontal,
  ArrowRightLeft,
  Eye,
  Clipboard,
  X,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getStockLevelsPaginated, createStockAdjustment, createStockTransfer } from '@/services/supabase/wh-stock';
import { getActiveLocations } from '@/services/supabase/wh-locations';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import type { WhStockLevel, WhLocation, WarehouseZone } from '@/types/warehouse';

type SortKey = 'productName' | 'batchSerialNumber' | 'locationName' | 'binLocation' | 'quantityAvailable' | 'quantityReserved' | 'reorderPoint';
type SortDir = 'asc' | 'desc';
type GroupBy = 'none' | 'location' | 'product';

/* ─── KPI Card ─── */
function KPICard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  loading,
}: {
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
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2.5 ${bgColor}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="h-7 w-16 mb-1" />
            ) : (
              <p className="text-2xl font-bold tabular-nums leading-none">
                {animated.toLocaleString()}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Skeleton Rows ─── */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-2 w-20 rounded-full" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
          <TableCell><Skeleton className="h-6 w-6 rounded" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function InventoryListPage() {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Data
  const [stock, setStock] = useState<WhStockLevel[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [locations, setLocations] = useState<WhLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('lowStock') === 'true');

  // Grouping & sorting
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [sortKey, setSortKey] = useState<SortKey>('productName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Adjustment dialog
  const [adjustTarget, setAdjustTarget] = useState<WhStockLevel | null>(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSaving, setAdjustSaving] = useState(false);

  // Transfer dialog
  const [transferTarget, setTransferTarget] = useState<WhStockLevel | null>(null);
  const [transferDest, setTransferDest] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferSaving, setTransferSaving] = useState(false);

  // Context menu (right-click)
  const [ctxMenu, setCtxMenu] = useState<{ row: WhStockLevel; x: number; y: number } | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  // Collapsible groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Staggered animations for KPI cards
  const kpiVisible = useStaggeredList(4, { interval: 80, initialDelay: 100 });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Zones derived from selected location
  const availableZones = useMemo<WarehouseZone[]>(() => {
    if (locationFilter === 'all') return [];
    const loc = locations.find(l => l.id === locationFilter);
    return loc?.zones ?? [];
  }, [locationFilter, locations]);

  // Reset zone filter when location changes
  useEffect(() => { setZoneFilter('all'); }, [locationFilter]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [debouncedSearch, locationFilter, zoneFilter, lowStockOnly, pageSize]);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [result, locs] = await Promise.all([
        getStockLevelsPaginated({
          locationId: locationFilter !== 'all' ? locationFilter : undefined,
          zone: zoneFilter !== 'all' ? zoneFilter : undefined,
          lowStockOnly,
          search: debouncedSearch || undefined,
          page,
          pageSize,
        }),
        getActiveLocations(),
      ]);
      setStock(result.data);
      setTotalCount(result.total);
      setLocations(locs);
    } finally {
      setLoading(false);
    }
  }, [locationFilter, zoneFilter, lowStockOnly, debouncedSearch, page, pageSize]);

  useEffect(() => { loadData(); }, [loadData]);

  // Close context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = () => setCtxMenu(null);
    window.addEventListener('click', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [ctxMenu]);

  // Sorting
  const sortedStock = useMemo(() => {
    const sorted = [...stock];
    sorted.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      switch (sortKey) {
        case 'productName': aVal = a.productName ?? ''; bVal = b.productName ?? ''; break;
        case 'batchSerialNumber': aVal = a.batchSerialNumber ?? ''; bVal = b.batchSerialNumber ?? ''; break;
        case 'locationName': aVal = a.locationName ?? ''; bVal = b.locationName ?? ''; break;
        case 'binLocation': aVal = a.binLocation ?? ''; bVal = b.binLocation ?? ''; break;
        case 'quantityAvailable': aVal = a.quantityAvailable; bVal = b.quantityAvailable; break;
        case 'quantityReserved': aVal = a.quantityReserved; bVal = b.quantityReserved; break;
        case 'reorderPoint': aVal = a.reorderPoint ?? -1; bVal = b.reorderPoint ?? -1; break;
      }
      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal as string, undefined, { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [stock, sortKey, sortDir]);

  // Grouping
  const groups = useMemo(() => {
    if (groupBy === 'none') return null;
    const map = new Map<string, { label: string; linkTo?: string; rows: WhStockLevel[] }>();
    for (const row of sortedStock) {
      let key: string;
      let label: string;
      let linkTo: string | undefined;
      if (groupBy === 'location') {
        key = row.locationId;
        label = row.locationName ?? row.locationId.slice(0, 8);
        linkTo = `/warehouse/locations/${row.locationId}`;
      } else {
        key = row.productId;
        label = row.productName ?? row.productId.slice(0, 8);
        linkTo = `/products/${row.productId}`;
      }
      if (!map.has(key)) map.set(key, { label, linkTo, rows: [] });
      map.get(key)!.rows.push(row);
    }
    return [...map.entries()];
  }, [sortedStock, groupBy]);

  // Summary totals
  const totalAvailable = stock.reduce((s, r) => s + r.quantityAvailable, 0);
  const totalReserved = stock.reduce((s, r) => s + r.quantityReserved, 0);
  const lowStockCount = stock.filter(s => s.reorderPoint != null && s.quantityAvailable <= s.reorderPoint).length;

  // Pagination computed
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Active filters
  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; onRemove: () => void }[] = [];
    if (debouncedSearch) {
      filters.push({ key: 'search', label: `"${debouncedSearch}"`, onRemove: () => { setSearchTerm(''); setDebouncedSearch(''); } });
    }
    if (locationFilter !== 'all') {
      const loc = locations.find(l => l.id === locationFilter);
      filters.push({ key: 'location', label: loc?.name ?? locationFilter.slice(0, 8), onRemove: () => setLocationFilter('all') });
    }
    if (zoneFilter !== 'all') {
      filters.push({ key: 'zone', label: zoneFilter, onRemove: () => setZoneFilter('all') });
    }
    if (lowStockOnly) {
      filters.push({ key: 'lowStock', label: t('Low Stock Alerts'), onRemove: () => setLowStockOnly(false) });
    }
    return filters;
  }, [debouncedSearch, locationFilter, zoneFilter, lowStockOnly, locations, t]);

  // Sort handler
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="inline ml-0.5 h-3 w-3" />
      : <ChevronDown className="inline ml-0.5 h-3 w-3" />;
  };

  // Toggle group collapse
  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Adjust submit
  const handleAdjustSubmit = async () => {
    if (!adjustTarget || !adjustReason.trim() || !adjustDelta) return;
    const delta = parseInt(adjustDelta, 10);
    if (isNaN(delta) || delta === 0) return;
    setAdjustSaving(true);
    try {
      await createStockAdjustment({ stockId: adjustTarget.id, quantityChange: delta, reason: adjustReason.trim() });
      toast.success(t('Adjustment saved'));
      setAdjustTarget(null);
      setAdjustDelta('');
      setAdjustReason('');
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setAdjustSaving(false);
    }
  };

  // Transfer submit
  const handleTransferSubmit = async () => {
    if (!transferTarget || !transferDest || !transferQty) return;
    const qty = parseInt(transferQty, 10);
    if (isNaN(qty) || qty <= 0) return;
    if (transferDest === transferTarget.locationId) {
      toast.error(t('Source and destination must differ'));
      return;
    }
    setTransferSaving(true);
    try {
      await createStockTransfer({
        fromLocationId: transferTarget.locationId,
        toLocationId: transferDest,
        productId: transferTarget.productId,
        batchId: transferTarget.batchId,
        quantity: qty,
        notes: transferReason.trim() || undefined,
      });
      toast.success(t('Transfer saved'));
      setTransferTarget(null);
      setTransferDest('');
      setTransferQty('');
      setTransferReason('');
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setTransferSaving(false);
    }
  };

  // Copy SKU
  const copySKU = (s: WhStockLevel) => {
    navigator.clipboard.writeText(s.batchSerialNumber ?? s.batchId);
    toast.success(t('Copied!'));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setLocationFilter('all');
    setZoneFilter('all');
    setLowStockOnly(false);
  };

  // Computed new stock level preview for adjust dialog
  const adjustPreview = useMemo(() => {
    if (!adjustTarget || !adjustDelta) return null;
    const delta = parseInt(adjustDelta, 10);
    if (isNaN(delta)) return null;
    return adjustTarget.quantityAvailable + delta;
  }, [adjustTarget, adjustDelta]);

  // Row actions dropdown content (shared between button and right-click)
  const renderRowActions = (s: WhStockLevel) => (
    <>
      <DropdownMenuItem onClick={() => { setAdjustTarget(s); setAdjustDelta(''); setAdjustReason(''); }}>
        <Pencil className="mr-2 h-4 w-4" />
        {t('Adjust Stock')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => { setTransferTarget(s); setTransferDest(''); setTransferQty(''); setTransferReason(''); }}>
        <ArrowRightLeft className="mr-2 h-4 w-4" />
        {t('Transfer Stock')}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => navigate(`/products/${s.productId}`)}>
        <Eye className="mr-2 h-4 w-4" />
        {t('View Product')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate(`/products/${s.productId}/batches/${s.batchId}`)}>
        <Eye className="mr-2 h-4 w-4" />
        {t('View Batch')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate(`/warehouse/locations/${s.locationId}`)}>
        <Eye className="mr-2 h-4 w-4" />
        {t('View Location')}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => copySKU(s)}>
        <Clipboard className="mr-2 h-4 w-4" />
        {t('Copy SKU')}
      </DropdownMenuItem>
    </>
  );

  // Stock bar with tooltip
  const StockBar = ({ row }: { row: WhStockLevel }) => {
    const total = row.quantityAvailable + row.quantityReserved + row.quantityDamaged + row.quantityQuarantine;
    if (total === 0) return <div className="h-2 w-full rounded-full bg-muted" />;
    const pct = (v: number) => `${(v / total) * 100}%`;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-default">
              <div className="flex h-2 w-full min-w-[80px] rounded-full overflow-hidden bg-muted">
                {row.quantityAvailable > 0 && <div className="bg-emerald-500 transition-all duration-300" style={{ width: pct(row.quantityAvailable) }} />}
                {row.quantityReserved > 0 && <div className="bg-blue-500 transition-all duration-300" style={{ width: pct(row.quantityReserved) }} />}
                {row.quantityDamaged > 0 && <div className="bg-orange-500 transition-all duration-300" style={{ width: pct(row.quantityDamaged) }} />}
                {row.quantityQuarantine > 0 && <div className="bg-red-500 transition-all duration-300" style={{ width: pct(row.quantityQuarantine) }} />}
              </div>
              <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground leading-none">
                <span className="flex items-center gap-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />{row.quantityAvailable}</span>
                <span className="flex items-center gap-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />{row.quantityReserved}</span>
                {row.quantityDamaged > 0 && <span className="flex items-center gap-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />{row.quantityDamaged}</span>}
                {row.quantityQuarantine > 0 && <span className="flex items-center gap-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />{row.quantityQuarantine}</span>}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="space-y-0.5">
              <div>{t('Available Quantity')}: {row.quantityAvailable.toLocaleString()}</div>
              <div>{t('Reserved Quantity')}: {row.quantityReserved.toLocaleString()}</div>
              {row.quantityDamaged > 0 && <div>{t('Damaged Quantity')}: {row.quantityDamaged.toLocaleString()}</div>}
              {row.quantityQuarantine > 0 && <div>{t('Quarantine Quantity')}: {row.quantityQuarantine.toLocaleString()}</div>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Row renderer with stagger animation support
  const rowStagger = useStaggeredList(sortedStock.length, { interval: 25, initialDelay: 150 });

  const renderRow = (s: WhStockLevel, idx: number) => {
    const isLow = s.reorderPoint != null && s.quantityAvailable <= s.reorderPoint;
    return (
      <TableRow
        key={s.id}
        className={`transition-all duration-200 hover:bg-muted/50 ${isLow ? 'border-l-2 border-l-orange-400' : ''} ${rowStagger[idx] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
        style={{ transition: 'opacity 0.3s ease, transform 0.3s ease' }}
        onContextMenu={(e) => {
          e.preventDefault();
          setCtxMenu({ row: s, x: e.clientX, y: e.clientY });
        }}
      >
        <TableCell className="font-medium">
          <Link to={`/products/${s.productId}`} className="hover:underline text-primary">
            {s.productName || s.productId.slice(0, 8)}
          </Link>
        </TableCell>
        <TableCell>
          <Link to={`/products/${s.productId}/batches/${s.batchId}`} className="hover:underline text-primary font-mono text-xs">
            {s.batchSerialNumber || s.batchId.slice(0, 8)}
          </Link>
        </TableCell>
        <TableCell>
          <Link to={`/warehouse/locations/${s.locationId}`} className="hover:underline text-primary">
            {s.locationName ?? '—'}
          </Link>
          {s.locationCode && <span className="text-muted-foreground ml-1 text-xs">({s.locationCode})</span>}
        </TableCell>
        <TableCell className="text-muted-foreground">{s.binLocation || '—'}</TableCell>
        <TableCell className="w-[120px] px-2">
          <StockBar row={s} />
        </TableCell>
        <TableCell className="text-right tabular-nums">
          <span className="inline-flex items-center gap-1">
            {isLow && <AlertTriangle className="h-3 w-3 text-orange-500" />}
            {s.quantityAvailable.toLocaleString()}
          </span>
        </TableCell>
        <TableCell className="text-right tabular-nums">{s.quantityReserved.toLocaleString()}</TableCell>
        <TableCell className="text-right tabular-nums text-muted-foreground">
          {s.reorderPoint != null ? s.reorderPoint.toLocaleString() : '—'}
        </TableCell>
        <TableCell className="w-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {renderRowActions(s)}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  };

  const colCount = 9;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{t('Inventory')}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {totalCount.toLocaleString()} {t('Items')}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('Total Items'), value: totalCount, icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-950' },
          { label: t('Available Stock'), value: totalAvailable, icon: CircleCheck, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-950' },
          { label: t('Reserved Stock'), value: totalReserved, icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-950' },
          { label: t('Low Stock Alerts'), value: lowStockCount, icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-950' },
        ].map((kpi, i) => (
          <div
            key={kpi.label}
            className={`transition-all duration-300 ${kpiVisible[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
          >
            <KPICard {...kpi} loading={loading} />
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card className="backdrop-blur-sm bg-card/80 border">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            {/* Search with clear button */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('Search...')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-8 w-full sm:w-[220px] h-9"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setDebouncedSearch(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Location */}
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder={t('All Locations')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Locations')}</SelectItem>
                {locations.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Zone (only when location selected) */}
            {availableZones.length > 0 && (
              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder={t('All Zones')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Zones')}</SelectItem>
                  {availableZones.map(z => (
                    <SelectItem key={z.code} value={z.code}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Low Stock toggle */}
            <Button
              variant={lowStockOnly ? 'default' : 'outline'}
              size="sm"
              className="h-9"
              onClick={() => setLowStockOnly(v => !v)}
            >
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
              {t('Low Stock Alerts')}
            </Button>

            <div className="flex-1" />

            {/* Group by */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('Group by')}:</span>
              <Select value={groupBy} onValueChange={v => setGroupBy(v as GroupBy)}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('None')}</SelectItem>
                  <SelectItem value="location">{t('By Location')}</SelectItem>
                  <SelectItem value="product">{t('By Product')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filter pills */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground mr-1">{t('Active Filters')}:</span>
              {activeFilters.map(f => (
                <Badge key={f.key} variant="secondary" className="gap-1 pr-1 text-xs">
                  {f.label}
                  <button
                    type="button"
                    onClick={f.onRemove}
                    className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {activeFilters.length > 1 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={clearAllFilters}>
                  {t('Clear Filters')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('productName')}>
                    {t('Product')}<SortIcon col="productName" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('batchSerialNumber')}>
                    {t('Batch')}<SortIcon col="batchSerialNumber" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('locationName')}>
                    {t('Location')}<SortIcon col="locationName" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('binLocation')}>
                    {t('Bin Location')}<SortIcon col="binLocation" />
                  </TableHead>
                  <TableHead className="text-center">{t('Stock Level')}</TableHead>
                  <TableHead className="text-right cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('quantityAvailable')}>
                    {t('Available Quantity')}<SortIcon col="quantityAvailable" />
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('quantityReserved')}>
                    {t('Reserved Quantity')}<SortIcon col="quantityReserved" />
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('reorderPoint')}>
                    {t('Reorder Point')}<SortIcon col="reorderPoint" />
                  </TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">{t('Actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <SkeletonRows />
                ) : sortedStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colCount} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <div className="rounded-full bg-muted p-4">
                          <Package className="h-8 w-8 opacity-50" />
                        </div>
                        {activeFilters.length > 0 ? (
                          <>
                            <p className="font-medium">{t('No items match your filters')}</p>
                            <Button variant="outline" size="sm" onClick={clearAllFilters}>
                              {t('Clear Filters')}
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">{t('No inventory yet')}</p>
                            <Button variant="outline" size="sm" asChild>
                              <Link to="/warehouse/goods-receipt">{t('Goods Receipt')}</Link>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : groups ? (
                  groups.map(([key, group]) => {
                    const isCollapsed = collapsedGroups.has(key);
                    return (
                      <>{/* Fragment per group */}
                        <TableRow
                          key={`group-${key}`}
                          className="bg-muted/50 hover:bg-muted/70 cursor-pointer"
                          onClick={() => toggleGroup(key)}
                        >
                          <TableCell colSpan={colCount} className="py-2">
                            <div className="flex items-center gap-2 font-medium">
                              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              {group.linkTo ? (
                                <Link
                                  to={group.linkTo}
                                  className="hover:underline text-primary"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {group.label}
                                </Link>
                              ) : group.label}
                              <Badge variant="secondary" className="ml-1 text-xs">
                                {group.rows.length}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                        {!isCollapsed && group.rows.map((row, idx) => renderRow(row, idx))}
                      </>
                    );
                  })
                ) : (
                  sortedStock.map((row, idx) => renderRow(row, idx))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span>{t('per page')}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-muted-foreground">
                  {t('Page')} {page} {t('of')} {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right-click context menu (positioned absolutely) */}
      {ctxMenu && (
        <div
          ref={ctxRef}
          className="fixed z-50"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <DropdownMenu open onOpenChange={open => { if (!open) setCtxMenu(null); }}>
            <DropdownMenuTrigger asChild>
              <span className="sr-only">context</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="bottom" className="w-48">
              {renderRowActions(ctxMenu.row)}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Stock Adjustment Dialog */}
      <Dialog open={!!adjustTarget} onOpenChange={open => { if (!open) setAdjustTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Stock Adjustment')}</DialogTitle>
            <DialogDescription>
              {adjustTarget?.productName ?? ''} — {adjustTarget?.batchSerialNumber ?? ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('Current Stock')}</span>
              <span className="font-medium tabular-nums">{adjustTarget?.quantityAvailable.toLocaleString()}</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-delta">{t('Quantity Change')}</Label>
              <Input
                id="adj-delta"
                type="number"
                placeholder="+10 / -5"
                value={adjustDelta}
                onChange={e => setAdjustDelta(e.target.value)}
              />
            </div>
            {adjustPreview != null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('New Stock Level')}</span>
                <span className={`font-medium tabular-nums ${adjustPreview < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {adjustPreview.toLocaleString()}
                </span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="adj-reason">{t('Adjustment Reason')}</Label>
              <Input
                id="adj-reason"
                placeholder={t('Adjustment Reason')}
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustTarget(null)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button
              disabled={adjustSaving || !adjustDelta || !adjustReason.trim()}
              onClick={handleAdjustSubmit}
            >
              {t('Apply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Transfer Dialog */}
      <Dialog open={!!transferTarget} onOpenChange={open => { if (!open) setTransferTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Stock Transfer')}</DialogTitle>
            <DialogDescription>
              {transferTarget?.productName ?? ''} — {transferTarget?.batchSerialNumber ?? ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('From Location')}</Label>
              <Input value={transferTarget?.locationName ?? ''} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Destination Location')}</Label>
              <Select value={transferDest} onValueChange={setTransferDest}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Destination Location')} />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    .filter(l => l.id !== transferTarget?.locationId)
                    .map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('Transfer Quantity')}</Label>
              <Input
                type="number"
                min={1}
                max={transferTarget?.quantityAvailable ?? 9999}
                placeholder="0"
                value={transferQty}
                onChange={e => setTransferQty(e.target.value)}
              />
              {transferTarget && (
                <p className="text-xs text-muted-foreground">
                  {t('Available Quantity')}: {transferTarget.quantityAvailable.toLocaleString()}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t('Transfer Reason')}</Label>
              <Input
                placeholder={t('Transfer Reason')}
                value={transferReason}
                onChange={e => setTransferReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferTarget(null)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button
              disabled={transferSaving || !transferDest || !transferQty || parseInt(transferQty, 10) <= 0}
              onClick={handleTransferSubmit}
            >
              {t('Transfer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
