import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, AlertTriangle, Filter, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { getStockLevelsPaginated, createStockAdjustment } from '@/services/supabase/wh-stock';
import { getActiveLocations } from '@/services/supabase/wh-locations';
import type { WhStockLevel, WhLocation, WarehouseZone } from '@/types/warehouse';

type SortKey = 'productName' | 'batchSerialNumber' | 'locationName' | 'binLocation' | 'quantityAvailable' | 'quantityReserved' | 'reorderPoint';
type SortDir = 'asc' | 'desc';
type GroupBy = 'none' | 'location' | 'product';

export function InventoryListPage() {
  const { t } = useTranslation('warehouse');
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

  // Quick-adjust popover
  const [adjustTarget, setAdjustTarget] = useState<string | null>(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSaving, setAdjustSaving] = useState(false);

  // Collapsible groups
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
  useEffect(() => {
    setZoneFilter('all');
  }, [locationFilter]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, locationFilter, zoneFilter, lowStockOnly, pageSize]);

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

  // Pagination computed
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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

  // Quick-adjust submit
  const handleAdjustSubmit = async () => {
    if (!adjustTarget || !adjustReason.trim() || !adjustDelta) return;
    const delta = parseInt(adjustDelta, 10);
    if (isNaN(delta) || delta === 0) return;
    setAdjustSaving(true);
    try {
      await createStockAdjustment({ stockId: adjustTarget, quantityChange: delta, reason: adjustReason.trim() });
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

  // Stock bar component
  const StockBar = ({ row }: { row: WhStockLevel }) => {
    const total = row.quantityAvailable + row.quantityReserved + row.quantityDamaged + row.quantityQuarantine;
    if (total === 0) return <div className="h-2 w-full rounded-full bg-muted" />;
    const pct = (v: number) => `${(v / total) * 100}%`;
    return (
      <div className="flex h-2 w-full min-w-[80px] rounded-full overflow-hidden bg-muted">
        {row.quantityAvailable > 0 && <div className="bg-emerald-500 transition-all duration-300" style={{ width: pct(row.quantityAvailable) }} />}
        {row.quantityReserved > 0 && <div className="bg-blue-500 transition-all duration-300" style={{ width: pct(row.quantityReserved) }} />}
        {row.quantityDamaged > 0 && <div className="bg-orange-500 transition-all duration-300" style={{ width: pct(row.quantityDamaged) }} />}
        {row.quantityQuarantine > 0 && <div className="bg-red-500 transition-all duration-300" style={{ width: pct(row.quantityQuarantine) }} />}
      </div>
    );
  };

  // Render a single stock row
  const renderRow = (s: WhStockLevel) => {
    const isLow = s.reorderPoint != null && s.quantityAvailable <= s.reorderPoint;
    return (
      <TableRow key={s.id} className={isLow ? 'bg-orange-50/50 dark:bg-orange-950/10' : ''}>
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
          <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground leading-none">
            <span className="flex items-center gap-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />{s.quantityAvailable}</span>
            <span className="flex items-center gap-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />{s.quantityReserved}</span>
            {s.quantityDamaged > 0 && <span className="flex items-center gap-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />{s.quantityDamaged}</span>}
            {s.quantityQuarantine > 0 && <span className="flex items-center gap-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />{s.quantityQuarantine}</span>}
          </div>
        </TableCell>
        <TableCell className="text-right tabular-nums">
          <Popover
            open={adjustTarget === s.id}
            onOpenChange={open => {
              if (open) { setAdjustTarget(s.id); setAdjustDelta(''); setAdjustReason(''); }
              else setAdjustTarget(null);
            }}
          >
            <PopoverTrigger asChild>
              <button
                className="inline-flex items-center gap-1 tabular-nums hover:bg-muted px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                type="button"
              >
                {isLow && <AlertTriangle className="h-3 w-3 text-orange-500" />}
                {s.quantityAvailable.toLocaleString()}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">{t('Stock Adjustment')}</h4>
                <div className="space-y-1.5">
                  <Label htmlFor="adj-delta" className="text-xs">{t('Quantity Change')}</Label>
                  <Input
                    id="adj-delta"
                    type="number"
                    placeholder="+10 / -5"
                    value={adjustDelta}
                    onChange={e => setAdjustDelta(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adj-reason" className="text-xs">{t('Adjustment Reason')}</Label>
                  <Input
                    id="adj-reason"
                    placeholder={t('Adjustment Reason')}
                    value={adjustReason}
                    onChange={e => setAdjustReason(e.target.value)}
                    className="h-8"
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={adjustSaving || !adjustDelta || !adjustReason.trim()}
                  onClick={handleAdjustSubmit}
                >
                  {t('Apply')}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </TableCell>
        <TableCell className="text-right tabular-nums">{s.quantityReserved.toLocaleString()}</TableCell>
        <TableCell className="text-right tabular-nums text-muted-foreground">
          {s.reorderPoint != null ? s.reorderPoint.toLocaleString() : '—'}
        </TableCell>
      </TableRow>
    );
  };

  const colCount = 8;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{t('Inventory')}</h1>
        <p className="text-muted-foreground">
          {totalAvailable.toLocaleString()} {t('Available Quantity')} · {totalReserved.toLocaleString()} {t('Reserved Quantity')}
          {!loading && <span className="ml-2">({totalCount} {t('Items')})</span>}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('Search...')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-[220px] h-9"
              />
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="h-24 text-center text-muted-foreground">
                    {t('Loading...', { ns: 'common' })}
                  </TableCell>
                </TableRow>
              ) : sortedStock.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="h-24 text-center text-muted-foreground">
                    <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    {t('No stock data')}
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
                      {!isCollapsed && group.rows.map(renderRow)}
                    </>
                  );
                })
              ) : (
                sortedStock.map(renderRow)
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
    </div>
  );
}
