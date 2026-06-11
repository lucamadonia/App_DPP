import { Fragment, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  MoreHorizontal,
  LayoutGrid,
  TableIcon,
  Move,
  MinusCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
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
import { ListToolbar } from '@/components/ui/list-toolbar';
import { BulkActionsBar } from '@/components/ui/bulk-actions-bar';
import { EmptyState, ErrorState } from '@/components/ui/state-feedback';
import {
  getStockLevelsPaginated,
  getWarehouseStats,
  createStockAdjustment,
  createStockTransfer,
  moveStockBinLocation,
} from '@/services/supabase/wh-stock';
import { ShelfPicker, type ShelfPickerValue } from '@/components/warehouse/ShelfPicker';
import { getActiveLocations } from '@/services/supabase/wh-locations';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import { useIsMobile } from '@/hooks/use-mobile';
import { blurIn, gridStagger, gridItem, useMotionVariants } from '@/lib/motion';
import { WarehouseKPICard } from '@/components/warehouse/WarehouseKPICard';
import { StockWriteOffDialog } from '@/components/warehouse/StockWriteOffDialog';
import { InventoryCardGrid, type InventoryCardGroup } from '@/components/warehouse/inventory-card-grid';
import {
  InventoryFilterControls,
  InventoryFilterPills,
  type InventoryGroupBy,
  type InventoryFilterPill,
} from '@/components/warehouse/inventory-filter-controls';
import { InventoryRowActions } from '@/components/warehouse/inventory-row-actions';
import { InventoryStockBar, getStockHealth } from '@/components/warehouse/inventory-stock-bar';
import { formatBinLocation } from '@/lib/warehouse-utils';
import type { WhStockLevel, WhLocation, WarehouseZone } from '@/types/warehouse';

type SortKey = 'productName' | 'batchSerialNumber' | 'locationName' | 'binLocation' | 'quantityAvailable' | 'quantityReserved' | 'reorderPoint';
type SortDir = 'asc' | 'desc';
type ViewMode = 'table' | 'cards';

const STORAGE_KEY = 'wh-inventory-view';

interface GlobalStats {
  totalStock: number;
  totalLocations: number;
  lowStockAlerts: number;
}

/* ─── Skeleton Rows ─── */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><ShimmerSkeleton className="h-4 w-4 rounded" /></TableCell>
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

/* ─── Skeleton Cards — mirror the card grid layout ─── */
function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-3.5 pb-3 px-3.5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1">
                <ShimmerSkeleton className="h-4 w-4 rounded mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <ShimmerSkeleton className="h-4 w-32" />
                  <ShimmerSkeleton className="h-3 w-20" />
                </div>
              </div>
              <ShimmerSkeleton className="h-8 w-8 rounded" />
            </div>
            <div className="flex gap-1.5">
              <ShimmerSkeleton className="h-5 w-24 rounded-full" />
              <ShimmerSkeleton className="h-5 w-16 rounded-full" />
            </div>
            <ShimmerSkeleton className="h-2 w-full rounded-full" />
            <div className="flex items-end justify-between">
              <ShimmerSkeleton className="h-7 w-14" />
              <ShimmerSkeleton className="h-3 w-20" />
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

  // Motion variants (no-op when prefers-reduced-motion)
  const headerVariants = useMotionVariants(blurIn);
  const kpiContainerVariants = useMotionVariants(gridStagger);
  const kpiItemVariants = useMotionVariants(gridItem);

  // View mode: persist in localStorage (desktop only — mobile always renders cards)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'table' || stored === 'cards') return stored;
    return 'table';
  });

  // Persist view mode
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Data
  const [stock, setStock] = useState<WhStockLevel[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [locations, setLocations] = useState<WhLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Global stats (whole warehouse, not just current page)
  const [stats, setStats] = useState<GlobalStats | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('lowStock') === 'true');

  // Grouping & sorting
  const [groupBy, setGroupBy] = useState<InventoryGroupBy>('none');
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

  // Write-off dialog (Werbegeschenke, Tester, Spenden, Eigenverbrauch, Bruch, Ausschuss)
  const [writeOffStocks, setWriteOffStocks] = useState<WhStockLevel[]>([]);

  // Multi-select for bulk operations. Stores the FULL row objects so that the
  // selection survives page changes (fix: previously only ids were kept and
  // rows from other pages were silently dropped on bulk write-off).
  const [selectedRows, setSelectedRows] = useState<Map<string, WhStockLevel>>(new Map());

  // Context menu (right-click, desktop table)
  const [ctxMenu, setCtxMenu] = useState<{ row: WhStockLevel; x: number; y: number } | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  // Collapsible groups (table view)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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

  // Load page data (with error handling — fix: previously errors were unhandled)
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadError(message);
      toast.error(t('Failed to load inventory'));
    } finally {
      setLoading(false);
    }
  }, [locationFilter, zoneFilter, lowStockOnly, debouncedSearch, page, pageSize, t]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load global stats (fix: KPIs previously summed only the current page).
  // Non-blocking — page content does not depend on it.
  const loadStats = useCallback(async () => {
    try {
      setStats(await getWarehouseStats());
    } catch {
      // KPI fallback: cards keep showing loading/last value
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Refresh page data + global stats after a mutation
  const refreshAll = useCallback(() => {
    loadData();
    loadStats();
  }, [loadData, loadStats]);

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
  const groups = useMemo<InventoryCardGroup[] | null>(() => {
    if (groupBy === 'none') return null;
    const map = new Map<string, InventoryCardGroup>();
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
      if (!map.has(key)) map.set(key, { key, label, linkTo, rows: [] });
      map.get(key)!.rows.push(row);
    }
    return [...map.values()];
  }, [sortedStock, groupBy]);

  // Page-scoped reserved sum (global reserved is not available from the stats service)
  const totalReserved = stock.reduce((s, r) => s + r.quantityReserved, 0);

  // Pagination computed
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Active filter pills (low-stock has its own quick chip)
  const pillFilters = useMemo<InventoryFilterPill[]>(() => {
    const filters: InventoryFilterPill[] = [];
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
    return filters;
  }, [debouncedSearch, locationFilter, zoneFilter, locations]);

  const hasActiveFilters = pillFilters.length > 0 || lowStockOnly;

  // Count for the mobile filter-drawer badge
  const drawerFilterCount =
    (locationFilter !== 'all' ? 1 : 0) +
    (zoneFilter !== 'all' ? 1 : 0) +
    (lowStockOnly ? 1 : 0) +
    (groupBy !== 'none' ? 1 : 0);

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

  // Toggle group collapse (table view)
  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ── Dialog openers (shared between table, cards and context menu) ──
  const openAdjust = (s: WhStockLevel) => { setAdjustTarget(s); setAdjustDelta(''); setAdjustReason(''); };
  const openMoveShelf = (s: WhStockLevel) => { setMoveBinTarget(s); setMoveBinNewBin(''); setMoveBinNewBinDisplay(''); setMoveBinQty(''); };
  const openTransfer = (s: WhStockLevel) => { setTransferTarget(s); setTransferDest(''); setTransferQty(''); setTransferReason(''); };
  const openWriteOff = (s: WhStockLevel) => setWriteOffStocks([s]);

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
      refreshAll();
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
      refreshAll();
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
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setMoveBinSaving(false);
    }
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

  // ── Multi-select helpers (Map keeps rows across page changes) ──
  const selectedIdSet = useMemo(() => new Set(selectedRows.keys()), [selectedRows]);
  const allOnPageSelected = sortedStock.length > 0 && sortedStock.every(s => selectedRows.has(s.id));
  const someOnPageSelected = sortedStock.some(s => selectedRows.has(s.id)) && !allOnPageSelected;

  const toggleOne = (s: WhStockLevel) => {
    setSelectedRows(prev => {
      const next = new Map(prev);
      if (next.has(s.id)) next.delete(s.id); else next.set(s.id, s);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelectedRows(prev => {
      const next = new Map(prev);
      if (allOnPageSelected) {
        for (const s of sortedStock) next.delete(s.id);
      } else {
        for (const s of sortedStock) next.set(s.id, s);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedRows(new Map());

  // Row renderer with stagger animation support (table view)
  const rowStagger = useStaggeredList(sortedStock.length, { interval: 25, initialDelay: 150 });

  const renderRow = (s: WhStockLevel, idx: number) => {
    const isLow = getStockHealth(s) === 'critical';
    const isSelected = selectedRows.has(s.id);
    return (
      <TableRow
        key={s.id}
        data-state={isSelected ? 'selected' : undefined}
        className={`transition-all duration-200 hover:bg-muted/50 ${isLow ? 'border-l-2 border-l-orange-400' : ''} ${isSelected ? 'bg-primary/5' : ''} ${rowStagger[idx] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
        style={{ transition: 'opacity 0.3s ease, transform 0.3s ease' }}
        onContextMenu={(e) => {
          e.preventDefault();
          setCtxMenu({ row: s, x: e.clientX, y: e.clientY });
        }}
      >
        <TableCell className="w-10" onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleOne(s)}
            aria-label={t('Select item')}
          />
        </TableCell>
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
          <InventoryStockBar row={s} />
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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <InventoryRowActions
                stock={s}
                onAdjust={openAdjust}
                onMoveShelf={openMoveShelf}
                onTransfer={openTransfer}
                onWriteOff={openWriteOff}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  };

  const colCount = 10;

  // Content mode: mobile always renders the card grid (a 10-column table is
  // unusable at 375px and caused horizontal overflow)
  const showCards = isMobile || viewMode === 'cards';

  // ── Toolbar slots ──
  const viewToggle = (
    <div className="hidden md:flex items-center border rounded-md">
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
  );

  // ── Pagination bar (shared between table and card views) ──
  const paginationBar = (withFrame: boolean) => (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-2 text-sm ${withFrame ? 'border-t px-4 py-3' : ''}`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
          <SelectTrigger className="w-[76px] h-11 sm:h-8">
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
          className="h-11 w-11 sm:h-8 sm:w-8"
          disabled={page <= 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-muted-foreground tabular-nums">
          {t('Page')} {page} {t('of')} {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 sm:h-8 sm:w-8"
          disabled={page >= totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // ── Empty / error blocks ──
  const emptyBlock = (
    <Card>
      <CardContent className="py-8">
        {hasActiveFilters ? (
          <EmptyState
            icon={Package}
            title={t('No items match your filters')}
            actionLabel={t('Clear Filters')}
            onAction={clearAllFilters}
          />
        ) : (
          <EmptyState
            icon={Package}
            title={t('No inventory yet')}
            actionLabel={t('Goods Receipt')}
            onAction={() => navigate('/warehouse/goods-receipt')}
          />
        )}
      </CardContent>
    </Card>
  );

  const errorBlock = (
    <Card>
      <CardContent className="py-8">
        <ErrorState
          title={t('Failed to load inventory')}
          message={loadError ?? undefined}
          onRetry={loadData}
        />
      </CardContent>
    </Card>
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

  // Move-bin dialog content (Sheet on mobile / Dialog on desktop — fix:
  // previously the only stock dialog without a mobile bottom-sheet variant)
  const moveBinDialogContent = (
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
  );

  const moveBinSubmitDisabled = moveBinSaving || !moveBinNewBin || (moveBinNewBin === (moveBinTarget?.binLocation ?? ''));

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div variants={headerVariants} initial="initial" animate="animate">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{t('Inventory')}</h1>
        <p className="text-muted-foreground text-sm mt-0.5 tabular-nums">
          {totalCount.toLocaleString()} {t('Items')}
        </p>
      </motion.div>

      {/* KPI Cards — global values via getWarehouseStats() (fix: were page-scoped) */}
      <motion.div
        variants={kpiContainerVariants}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {[
          { label: t('Total Items'), value: totalCount, loading, icon: Package, color: 'text-blue-600', gradient: 'from-blue-500/20 to-blue-600/10', sparkColor: '#3B82F6' },
          { label: t('Available Stock'), value: stats?.totalStock ?? 0, loading: stats === null, icon: CircleCheck, color: 'text-emerald-600', gradient: 'from-emerald-500/20 to-emerald-600/10', sparkColor: '#10B981' },
          { label: `${t('Reserved Stock')} · ${t('On this page')}`, value: totalReserved, loading, icon: Clock, color: 'text-amber-600', gradient: 'from-amber-500/20 to-amber-600/10', sparkColor: '#F59E0B' },
          { label: t('Low Stock Alerts'), value: stats?.lowStockAlerts ?? 0, loading: stats === null, icon: AlertTriangle, color: 'text-red-600', gradient: 'from-red-500/20 to-red-600/10', sparkColor: '#EF4444', onClick: () => setLowStockOnly(true) },
        ].map(kpi => (
          <motion.div key={kpi.label} variants={kpiItemVariants}>
            <WarehouseKPICard {...kpi} />
          </motion.div>
        ))}
      </motion.div>

      {/* Toolbar: search + filters (drawer on mobile, inline on desktop) + view toggle */}
      <ListToolbar
        search={{ value: searchTerm, onChange: setSearchTerm, placeholder: t('Search...') }}
        filters={
          <InventoryFilterControls
            layout={isMobile ? 'sheet' : 'inline'}
            locations={locations}
            availableZones={availableZones}
            locationFilter={locationFilter}
            onLocationChange={setLocationFilter}
            zoneFilter={zoneFilter}
            onZoneChange={setZoneFilter}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            lowStockOnly={lowStockOnly}
            onLowStockChange={setLowStockOnly}
          />
        }
        activeFilterCount={drawerFilterCount}
        viewToggle={viewToggle}
      />

      {/* Quick-filter chips: low-stock toggle + active filter pills */}
      <div className="flex flex-wrap items-center gap-1.5 -mt-2">
        <button
          type="button"
          onClick={() => setLowStockOnly(v => !v)}
          aria-pressed={lowStockOnly}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors min-h-11 sm:min-h-7 sm:px-2.5 ${
            lowStockOnly
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-foreground hover:bg-muted'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {t('Low stock only')}
          {stats != null && stats.lowStockAlerts > 0 && (
            <Badge
              variant={lowStockOnly ? 'secondary' : 'destructive'}
              className="h-4 min-w-4 px-1 text-[10px] tabular-nums"
            >
              {stats.lowStockAlerts}
            </Badge>
          )}
        </button>
        <InventoryFilterPills filters={pillFilters} onClearAll={clearAllFilters} />
      </div>

      {/* Bulk actions — works in table AND card view, selection survives paging */}
      <BulkActionsBar
        count={selectedRows.size}
        onClear={clearSelection}
        label={t('{{n}} items selected', { n: selectedRows.size })}
        actions={[
          {
            id: 'write-off',
            label: t('Write off ({{n}})', { n: selectedRows.size }),
            icon: <MinusCircle className="size-4" />,
            variant: 'destructive',
            onRun: () => setWriteOffStocks([...selectedRows.values()]),
          },
        ]}
      />

      {/* Content */}
      {loadError && !loading ? (
        errorBlock
      ) : !loading && sortedStock.length === 0 ? (
        emptyBlock
      ) : showCards ? (
        loading ? (
          <SkeletonCards />
        ) : (
          <>
            <InventoryCardGrid
              stock={sortedStock}
              groups={groups}
              locations={locations}
              selectedIds={selectedIdSet}
              onToggleSelect={toggleOne}
              onAdjust={openAdjust}
              onMoveShelf={openMoveShelf}
              onTransfer={openTransfer}
              onWriteOff={openWriteOff}
            />
            {/* Pagination — hidden while loading (fix) */}
            {totalCount > 0 && paginationBar(false)}
          </>
        )
      ) : (
        /* Table View (desktop only) */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleAllOnPage}
                        aria-label={t('Select all')}
                      />
                    </TableHead>
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
                      {t('Available Quantity')}
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
                  ) : groups ? (
                    groups.map(group => {
                      const isCollapsed = collapsedGroups.has(group.key);
                      return (
                        /* Fix: group fragments previously rendered without a key */
                        <Fragment key={group.key}>
                          <TableRow
                            className="bg-muted/50 hover:bg-muted/70 cursor-pointer"
                            onClick={() => toggleGroup(group.key)}
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
                                <Badge variant="secondary" className="ml-1 text-xs tabular-nums">
                                  {group.rows.length}
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                          {!isCollapsed && group.rows.map((row, idx) => renderRow(row, idx))}
                        </Fragment>
                      );
                    })
                  ) : (
                    sortedStock.map((row, idx) => renderRow(row, idx))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {!loading && totalCount > 0 && paginationBar(true)}
          </CardContent>
        </Card>
      )}

      {/* Spacer so the fixed mobile bulk bar never covers content */}
      {selectedRows.size > 0 && <div className="h-16 md:hidden" aria-hidden="true" />}

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
            <DropdownMenuContent align="start" side="bottom" className="w-52">
              <InventoryRowActions
                stock={ctxMenu.row}
                onAdjust={openAdjust}
                onMoveShelf={openMoveShelf}
                onTransfer={openTransfer}
                onWriteOff={openWriteOff}
              />
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
              <Button variant="outline" className="flex-1 min-h-11" onClick={() => setAdjustTarget(null)}>{t('Cancel', { ns: 'common' })}</Button>
              <Button
                className="flex-1 min-h-11"
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
              <Button variant="outline" className="flex-1 min-h-11" onClick={() => setTransferTarget(null)}>{t('Cancel', { ns: 'common' })}</Button>
              <Button
                className="flex-1 min-h-11"
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

      {/* Move to another shelf — Sheet on mobile, Dialog on desktop (fix) */}
      {isMobile ? (
        <Sheet open={!!moveBinTarget} onOpenChange={open => { if (!open) setMoveBinTarget(null); }}>
          <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>{t('Move to Another Shelf')}</SheetTitle>
              <SheetDescription>
                {moveBinTarget?.productName ?? ''} — {moveBinTarget?.batchSerialNumber ?? ''}
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 overflow-y-auto flex-1">
              {moveBinDialogContent}
            </div>
            <SheetFooter className="flex-row gap-2">
              <Button variant="outline" className="flex-1 min-h-11" onClick={() => setMoveBinTarget(null)}>{t('Cancel', { ns: 'common' })}</Button>
              <Button
                className="flex-1 min-h-11"
                disabled={moveBinSubmitDisabled}
                onClick={handleMoveBinSubmit}
              >
                <Move className="mr-2 h-4 w-4" />
                {t('Move')}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={!!moveBinTarget} onOpenChange={open => { if (!open) setMoveBinTarget(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('Move to Another Shelf')}</DialogTitle>
              <DialogDescription>
                {moveBinTarget?.productName ?? ''} — {moveBinTarget?.batchSerialNumber ?? ''}
              </DialogDescription>
            </DialogHeader>
            {moveBinDialogContent}
            <DialogFooter>
              <Button variant="outline" onClick={() => setMoveBinTarget(null)}>{t('Cancel', { ns: 'common' })}</Button>
              <Button
                disabled={moveBinSubmitDisabled}
                onClick={handleMoveBinSubmit}
              >
                <Move className="mr-2 h-4 w-4" />
                {t('Move')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <StockWriteOffDialog
        open={writeOffStocks.length > 0}
        onOpenChange={(o) => { if (!o) setWriteOffStocks([]); }}
        stocks={writeOffStocks}
        onSaved={() => {
          refreshAll();
          clearSelection();
        }}
      />
    </div>
  );
}
