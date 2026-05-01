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
  LayoutGrid,
  TableIcon,
  SlidersHorizontal,
  Move,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { getStockLevelsPaginated, createStockAdjustment, createStockTransfer, moveStockBinLocation } from '@/services/supabase/wh-stock';
import { ShelfPicker, type ShelfPickerValue } from '@/components/warehouse/ShelfPicker';
import { getActiveLocations } from '@/services/supabase/wh-locations';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import { useIsMobile } from '@/hooks/use-mobile';
import { WarehouseKPICard } from '@/components/warehouse/WarehouseKPICard';
import { InventoryCardView } from '@/components/warehouse/InventoryCardView';
import { formatBinLocation } from '@/lib/warehouse-utils';
import type { WhStockLevel, WhLocation, WarehouseZone } from '@/types/warehouse';

type SortKey = 'productName' | 'batchSerialNumber' | 'locationName' | 'binLocation' | 'quantityAvailable' | 'quantityReserved' | 'reorderPoint';
type SortDir = 'asc' | 'desc';
type GroupBy = 'none' | 'location' | 'product';
type ViewMode = 'table' | 'cards';

const STORAGE_KEY = 'wh-inventory-view';

/* ─── Skeleton Rows ─── */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><ShimmerSkeleton className="h-4 w-28" /></TableCell>
          <TableCell><ShimmerSkeleton className="h-4 w-20" /></TableCell>
          <TableCell><ShimmerSkeleton className="h-4 w-24" /></TableCell>
          <TableCell><ShimmerSkeleton className="h-4 w-16" /></TableCell>
          <TableCell><ShimmerSkeleton className="h-2 w-20 rounded-full" /></TableCell>
          <TableCell className="text-right"><ShimmerSkeleton className="h-4 w-10 ml-auto" /></TableCell>
          <TableCell className="text-right"><ShimmerSkeleton className="h-4 w-10 ml-auto" /></TableCell>
          <TableCell className="text-right"><ShimmerSkeleton className="h-4 w-10 ml-auto" /></TableCell>
          <TableCell><ShimmerSkeleton className="h-6 w-6 rounded" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

/* ─── Skeleton Cards ─── */
function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-4 pb-3 px-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <ShimmerSkeleton className="h-4 w-32" />
                <ShimmerSkeleton className="h-3 w-20" />
              </div>
              <ShimmerSkeleton className="h-7 w-7 rounded" />
            </div>
            <div className="flex gap-1.5">
              <ShimmerSkeleton className="h-4 w-20 rounded-full" />
              <ShimmerSkeleton className="h-4 w-14 rounded-full" />
            </div>
            <ShimmerSkeleton className="h-2 w-full rounded-full" />
            <div className="flex items-center justify-between">
              <ShimmerSkeleton className="h-6 w-12" />
              <ShimmerSkeleton className="h-3 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function InventoryListPage() {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();

  // View mode: persist in localStorage, default to cards on mobile
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'table' || stored === 'cards') return stored;
    return 'table'; // will override to cards on mobile via effect
  });

  // On first render, default to cards on mobile if no stored preference
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored && isMobile) {
      setViewMode('cards');
    }
  }, [isMobile]);

  // Persist view mode
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

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

  // Mobile filter sheet
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

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

  // Move shelf (bin within same location) dialog
  const [moveBinTarget, setMoveBinTarget] = useState<WhStockLevel | null>(null);
  const [moveBinNewBin, setMoveBinNewBin] = useState('');
  const [moveBinNewBinDisplay, setMoveBinNewBinDisplay] = useState('');
  const [moveBinQty, setMoveBinQty] = useState('');
  const [moveBinSaving, setMoveBinSaving] = useState(false);

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

  // Move bin (shelf) submit — moves stock to another shelf in the SAME location
  const handleMoveBinSubmit = async () => {
    if (!moveBinTarget || !moveBinNewBin) return;
    const requestedQty = moveBinQty ? parseInt(moveBinQty, 10) : moveBinTarget.quantityAvailable;
    if (isNaN(requestedQty) || requestedQty <= 0) return;
    if (requestedQty > moveBinTarget.quantityAvailable) {
      toast.error(t('Move quantity exceeds available stock'));
      return;
    }
    if (moveBinNewBin === (moveBinTarget.binLocation || '')) {
      toast.error(t('New shelf must differ from current shelf'));
      return;
    }
    setMoveBinSaving(true);
    try {
      await moveStockBinLocation({
        stockId: moveBinTarget.id,
        newBinLocation: moveBinNewBin,
        quantity: requestedQty,
      });
      toast.success(t('Stock moved to new shelf'));
      setMoveBinTarget(null);
      setMoveBinNewBin('');
      setMoveBinNewBinDisplay('');
      setMoveBinQty('');
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setMoveBinSaving(false);
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
      <DropdownMenuItem onClick={() => { setMoveBinTarget(s); setMoveBinNewBin(''); setMoveBinNewBinDisplay(''); setMoveBinQty(''); }}>
        <Move className="mr-2 h-4 w-4" />
        {t('Move to Another Shelf')}
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
        <TableCell className="hidden md:table-cell">
          <Link to={`/products/${s.productId}/batches/${s.batchId}`} className="hover:underline text-primary font-mono text-xs">
            {s.batchSerialNumber || s.batchId.slice(0, 8)}
          </Link>
        </TableCell>
        <TableCell>
          <Link to={`/warehouse/locations/${s.locationId}`} className="hover:underline text-primary">
            {s.locationName ?? '—'}
          </Link>
          {s.locationCode && <span className="text-muted-foreground ml-1 text-xs hidden sm:inline">({s.locationCode})</span>}
        </TableCell>
        <TableCell className="hidden lg:table-cell text-muted-foreground">{formatBinLocation(s.binLocation, locations.find(l => l.id === s.locationId))}</TableCell>
        <TableCell className="hidden sm:table-cell w-[120px] px-2">
          <StockBar row={s} />
        </TableCell>
        <TableCell className="text-right tabular-nums">
          <span className="inline-flex items-center gap-1">
            {isLow && <AlertTriangle className="h-3 w-3 text-orange-500" />}
            {s.quantityAvailable.toLocaleString()}
          </span>
        </TableCell>
        <TableCell className="hidden md:table-cell text-right tabular-nums">{s.quantityReserved.toLocaleString()}</TableCell>
        <TableCell className="hidden lg:table-cell text-right tabular-nums text-muted-foreground">
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

  // Active filter count for mobile badge
  const filterCount = activeFilters.length;

  // ── Filter controls (shared between inline and sheet) ──
  const filterControls = (isSheet: boolean) => (
    <div className={isSheet ? 'space-y-4' : 'flex flex-wrap gap-2 sm:gap-3 items-center'}>
      {/* Search */}
      <div className={`relative ${isSheet ? '' : ''}`}>
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('Search...')}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className={`pl-8 pr-8 h-9 ${isSheet ? 'w-full' : 'w-full sm:w-[220px]'}`}
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
      <div className={isSheet ? '' : ''}>
        {isSheet && <Label className="text-xs text-muted-foreground mb-1.5 block">{t('Location')}</Label>}
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className={`h-9 ${isSheet ? 'w-full' : 'w-[180px]'}`}>
            <SelectValue placeholder={t('All Locations')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Locations')}</SelectItem>
            {locations.map(l => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Zone (only when location selected) */}
      {availableZones.length > 0 && (
        <div>
          {isSheet && <Label className="text-xs text-muted-foreground mb-1.5 block">{t('Zone')}</Label>}
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className={`h-9 ${isSheet ? 'w-full' : 'w-[160px]'}`}>
              <SelectValue placeholder={t('All Zones')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Zones')}</SelectItem>
              {availableZones.map(z => (
                <SelectItem key={z.code} value={z.code}>{z.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Low Stock toggle */}
      <Button
        variant={lowStockOnly ? 'default' : 'outline'}
        size="sm"
        className={`h-9 ${isSheet ? 'w-full justify-start' : ''}`}
        onClick={() => setLowStockOnly(v => !v)}
      >
        <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
        {t('Low Stock Alerts')}
      </Button>

      {/* Group by (only in sheet or desktop) */}
      {isSheet ? (
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">{t('Group by')}</Label>
          <Select value={groupBy} onValueChange={v => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('None')}</SelectItem>
              <SelectItem value="location">{t('By Location')}</SelectItem>
              <SelectItem value="product">{t('By Product')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );

  // Adjust dialog content
  const adjustDialogContent = (
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
  );

  // Transfer dialog content
  const transferDialogContent = (
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
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{t('Inventory')}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {totalCount.toLocaleString()} {t('Items')}
        </p>
      </div>

      {/* KPI Cards — using WarehouseKPICard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: t('Total Items'), value: totalCount, icon: Package, color: 'text-blue-600', gradient: 'from-blue-500/20 to-blue-600/10', sparkColor: '#3B82F6' },
          { label: t('Available Stock'), value: totalAvailable, icon: CircleCheck, color: 'text-emerald-600', gradient: 'from-emerald-500/20 to-emerald-600/10', sparkColor: '#10B981' },
          { label: t('Reserved Stock'), value: totalReserved, icon: Clock, color: 'text-amber-600', gradient: 'from-amber-500/20 to-amber-600/10', sparkColor: '#F59E0B' },
          { label: t('Low Stock Alerts'), value: lowStockCount, icon: AlertTriangle, color: 'text-red-600', gradient: 'from-red-500/20 to-red-600/10', sparkColor: '#EF4444', onClick: () => setLowStockOnly(true) },
        ].map((kpi, i) => (
          <div
            key={kpi.label}
            className={`transition-all duration-300 ${kpiVisible[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
          >
            <WarehouseKPICard {...kpi} loading={loading} />
          </div>
        ))}
      </div>

      {/* Filters — Desktop: inline card, Mobile: Sheet trigger */}
      {isMobile ? (
        <>
          <div className="flex items-center gap-2">
            {/* Mobile: search always visible */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('Search...')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-8 h-9 w-full"
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

            {/* Filter trigger */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 shrink-0"
              onClick={() => setFilterSheetOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t('Filters')}
              {filterCount > 0 && (
                <Badge variant="secondary" className="h-5 min-w-[20px] px-1 text-[10px]">
                  {filterCount}
                </Badge>
              )}
            </Button>

            {/* View toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-r-none"
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-l-none"
                onClick={() => setViewMode('table')}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Filter Sheet */}
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>{t('Filters')}</SheetTitle>
                <SheetDescription>{t('Filter inventory items')}</SheetDescription>
              </SheetHeader>
              <div className="px-4 overflow-y-auto flex-1">
                {filterControls(true)}
              </div>
              <SheetFooter className="flex-row gap-2">
                {activeFilters.length > 0 && (
                  <Button variant="outline" className="flex-1" onClick={() => { clearAllFilters(); setFilterSheetOpen(false); }}>
                    {t('Clear Filters')}
                  </Button>
                )}
                <Button className="flex-1" onClick={() => setFilterSheetOpen(false)}>
                  {t('Apply')}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <Card className="backdrop-blur-sm bg-card/80 border">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
              {filterControls(false)}

              <div className="flex-1" />

              {/* Group by */}
              <div className="flex items-center gap-2">
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

              {/* View Toggle — desktop */}
              <div className="flex items-center border rounded-md ml-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={() => setViewMode('table')}
                  title={t('Table View')}
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => setViewMode('cards')}
                  title={t('Card View')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
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
      )}

      {/* Mobile active filter pills (shown outside sheet) */}
      {isMobile && activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 -mt-3">
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

      {/* Content: Card View or Table View */}
      {viewMode === 'cards' ? (
        loading ? (
          <SkeletonCards />
        ) : sortedStock.length === 0 ? (
          <Card>
            <CardContent className="py-16">
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
            </CardContent>
          </Card>
        ) : (
          <>
            <InventoryCardView
              stock={sortedStock}
              locations={locations}
              onAdjust={s => { setAdjustTarget(s); setAdjustDelta(''); setAdjustReason(''); }}
              onTransfer={s => { setTransferTarget(s); setTransferDest(''); setTransferQty(''); setTransferReason(''); }}
            />
            {/* Card View Pagination */}
            {totalCount > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
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
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-muted-foreground">
                    {t('Page')} {page} {t('of')} {totalPages}
                  </span>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )
      ) : (
        /* Table View */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('productName')}>
                      {t('Product')}<SortIcon col="productName" />
                    </TableHead>
                    <TableHead className="hidden md:table-cell cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('batchSerialNumber')}>
                      {t('Batch')}<SortIcon col="batchSerialNumber" />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('locationName')}>
                      {t('Location')}<SortIcon col="locationName" />
                    </TableHead>
                    <TableHead className="hidden lg:table-cell cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('binLocation')}>
                      {t('Bin Location')}<SortIcon col="binLocation" />
                    </TableHead>
                    <TableHead className="hidden sm:table-cell text-center">{t('Stock Level')}</TableHead>
                    <TableHead className="text-right cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('quantityAvailable')}>
                      <span className="hidden sm:inline">{t('Available Quantity')}</span>
                      <span className="sm:hidden">{t('Avail.')}</span>
                      <SortIcon col="quantityAvailable" />
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-right cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('quantityReserved')}>
                      {t('Reserved Quantity')}<SortIcon col="quantityReserved" />
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-right cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => handleSort('reorderPoint')}>
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
      )}

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

      {/* Stock Adjustment — Sheet on mobile, Dialog on desktop */}
      {isMobile ? (
        <Sheet open={!!adjustTarget} onOpenChange={open => { if (!open) setAdjustTarget(null); }}>
          <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>{t('Stock Adjustment')}</SheetTitle>
              <SheetDescription>
                {adjustTarget?.productName ?? ''} — {adjustTarget?.batchSerialNumber ?? ''}
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 overflow-y-auto flex-1">
              {adjustDialogContent}
            </div>
            <SheetFooter className="flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAdjustTarget(null)}>{t('Cancel', { ns: 'common' })}</Button>
              <Button
                className="flex-1"
                disabled={adjustSaving || !adjustDelta || !adjustReason.trim()}
                onClick={handleAdjustSubmit}
              >
                {t('Apply')}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={!!adjustTarget} onOpenChange={open => { if (!open) setAdjustTarget(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('Stock Adjustment')}</DialogTitle>
              <DialogDescription>
                {adjustTarget?.productName ?? ''} — {adjustTarget?.batchSerialNumber ?? ''}
              </DialogDescription>
            </DialogHeader>
            {adjustDialogContent}
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
      )}

      {/* Stock Transfer — Sheet on mobile, Dialog on desktop */}
      {isMobile ? (
        <Sheet open={!!transferTarget} onOpenChange={open => { if (!open) setTransferTarget(null); }}>
          <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>{t('Stock Transfer')}</SheetTitle>
              <SheetDescription>
                {transferTarget?.productName ?? ''} — {transferTarget?.batchSerialNumber ?? ''}
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 overflow-y-auto flex-1">
              {transferDialogContent}
            </div>
            <SheetFooter className="flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setTransferTarget(null)}>{t('Cancel', { ns: 'common' })}</Button>
              <Button
                className="flex-1"
                disabled={transferSaving || !transferDest || !transferQty || parseInt(transferQty, 10) <= 0}
                onClick={handleTransferSubmit}
              >
                {t('Transfer')}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={!!transferTarget} onOpenChange={open => { if (!open) setTransferTarget(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('Stock Transfer')}</DialogTitle>
              <DialogDescription>
                {transferTarget?.productName ?? ''} — {transferTarget?.batchSerialNumber ?? ''}
              </DialogDescription>
            </DialogHeader>
            {transferDialogContent}
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
      )}

      {/* Move to another shelf within the same location */}
      <Dialog open={!!moveBinTarget} onOpenChange={open => { if (!open) setMoveBinTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Move to Another Shelf')}</DialogTitle>
            <DialogDescription>
              {moveBinTarget?.productName ?? ''} — {moveBinTarget?.batchSerialNumber ?? ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">{t('Location')}</Label>
                <div className="font-medium">{moveBinTarget?.locationName}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('Current Shelf')}</Label>
                <div className="font-medium font-mono">
                  {moveBinTarget?.binLocation
                    ? formatBinLocation(moveBinTarget.binLocation)
                    : <span className="text-muted-foreground italic">{t('Unassigned')}</span>}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('New Shelf')}</Label>
              {(() => {
                const loc = locations.find(l => l.id === moveBinTarget?.locationId);
                if (!loc) return <Input value={moveBinNewBin} onChange={e => setMoveBinNewBin(e.target.value)} placeholder="A-03-12" />;
                return (
                  <ShelfPicker
                    location={loc}
                    value={moveBinNewBin || undefined}
                    onSelect={(val: ShelfPickerValue) => {
                      setMoveBinNewBin(val.binLocation);
                      setMoveBinNewBinDisplay(val.displayLabel);
                    }}
                    onClear={() => {
                      setMoveBinNewBin('');
                      setMoveBinNewBinDisplay('');
                    }}
                  />
                );
              })()}
            </div>

            <div className="space-y-1.5">
              <Label>{t('Quantity to Move')}</Label>
              <Input
                type="number"
                min={1}
                max={moveBinTarget?.quantityAvailable ?? 9999}
                placeholder={String(moveBinTarget?.quantityAvailable ?? '')}
                value={moveBinQty}
                onChange={e => setMoveBinQty(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('Available Quantity')}: {moveBinTarget?.quantityAvailable.toLocaleString()} —{' '}
                {t('Leave empty to move everything')}
              </p>
            </div>

            {moveBinNewBinDisplay && (
              <div className="rounded-md bg-muted/40 p-2 text-xs">
                {t('Will move to')}: <span className="font-mono font-medium">{moveBinNewBinDisplay}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveBinTarget(null)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button
              disabled={moveBinSaving || !moveBinNewBin || (moveBinNewBin === (moveBinTarget?.binLocation ?? ''))}
              onClick={handleMoveBinSubmit}
            >
              <Move className="mr-2 h-4 w-4" />
              {t('Move')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
