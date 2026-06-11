import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Clock,
  Route,
  Package,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  getSupplyChainByTenant,
  createSupplyChainEntry,
  updateSupplyChainEntry,
  deleteSupplyChainEntry,
  reorderSupplyChain,
  getProducts,
  getSuppliers,
  type ProductListItem,
} from '@/services/supabase';
import type { SupplyChainEntry, Supplier } from '@/types/database';

import { motion, AnimatePresence } from 'framer-motion';
import { blurIn, tabContentVariants, useReducedMotion } from '@/lib/motion';
import { SupplyChainStats } from '@/components/supply-chain/SupplyChainStats';
import { SupplyChainFilters } from '@/components/supply-chain/SupplyChainFilters';
import { SupplyChainProductCard } from '@/components/supply-chain/SupplyChainProductCard';
import { SupplyChainTimeline } from '@/components/supply-chain/SupplyChainTimeline';
import { SupplyChainDialog } from '@/components/supply-chain/SupplyChainDialog';
import { SupplyChainEmptyState } from '@/components/supply-chain/SupplyChainEmptyState';
import { SupplyChainStepRow } from '@/components/supply-chain/SupplyChainStepRow';
import { SupplyChainJourney } from '@/components/supply-chain/SupplyChainJourney';
import { SupplyChainStationSheet } from '@/components/supply-chain/SupplyChainStationSheet';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ViewMode = 'journey' | 'cards' | 'table' | 'timeline';

export function SupplyChainPage() {
  const { t } = useTranslation('settings');
  const prefersReduced = useReducedMotion();
  const MotionDiv = prefersReduced ? 'div' as const : motion.div;
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<ViewMode>('journey');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [processTypeFilter, setProcessTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [transportFilter, setTransportFilter] = useState<string>('all');
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  // Data state
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplyChainEntries, setSupplyChainEntries] = useState<SupplyChainEntry[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingEntry, setEditingEntry] = useState<SupplyChainEntry | null>(null);
  const [createPrefill, setCreatePrefill] = useState<{ productId?: string; step?: number } | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Station detail sheet state
  const [sheetEntry, setSheetEntry] = useState<SupplyChainEntry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [productsData, suppliersData, entriesData] = await Promise.all([
        getProducts(),
        getSuppliers(),
        getSupplyChainByTenant(),
      ]);
      setProducts(productsData);
      setSuppliers(suppliersData);
      setSupplyChainEntries(entriesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(t('Error loading data'));
    }
    setIsLoading(false);
  };

  // Single refresh path: always reload the full tenant data set so that
  // every view mode (journey, cards, table, timeline) and the KPI strip
  // reflect mutations — product selection is a pure client-side filter.
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSupplyChainByTenant();
      setSupplyChainEntries(data);
    } catch (error) {
      console.error('Error loading supply chain:', error);
      toast.error(t('Error loading data'));
    }
    setIsLoading(false);
  }, [t]);

  // Helpers
  const getProductName = useCallback((productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Unknown Product';
  }, [products]);

  const getSupplierName = useCallback((entry: SupplyChainEntry) => {
    const id = entry.supplier_id || entry.supplier;
    if (!id) return null;
    return suppliers.find(s => s.id === id)?.name || id;
  }, [suppliers]);

  // Filtered entries (product filter is applied client-side)
  const filteredEntries = useMemo(() => {
    return supplyChainEntries.filter(entry => {
      const supplierName = getSupplierName(entry) || '';
      const matchesSearch =
        entry.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplierName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProduct = selectedProductId === 'all' || entry.product_id === selectedProductId;
      const matchesProcess = processTypeFilter === 'all' || entry.process_type === processTypeFilter;
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      const matchesTransport = transportFilter === 'all' || entry.transport_mode === transportFilter;
      return matchesSearch && matchesProduct && matchesProcess && matchesStatus && matchesTransport;
    });
  }, [supplyChainEntries, searchQuery, selectedProductId, processTypeFilter, statusFilter, transportFilter, getSupplierName]);

  // Grouped by product
  const entriesByProduct = useMemo(() => {
    const grouped: Record<string, SupplyChainEntry[]> = {};
    filteredEntries.forEach(entry => {
      if (!grouped[entry.product_id]) {
        grouped[entry.product_id] = [];
      }
      grouped[entry.product_id].push(entry);
    });
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.step - b.step);
    });
    return grouped;
  }, [filteredEntries]);

  // Entries of the product the sheet entry belongs to (for move earlier/later)
  const sheetProductEntries = useMemo(() => {
    if (!sheetEntry) return [];
    return supplyChainEntries
      .filter(e => e.product_id === sheetEntry.product_id)
      .sort((a, b) => a.step - b.step);
  }, [sheetEntry, supplyChainEntries]);

  const sheetEntryIndex = sheetEntry
    ? sheetProductEntries.findIndex(e => e.id === sheetEntry.id)
    : -1;

  // Dialog handlers
  const openCreateDialog = (prefill?: { productId?: string; step?: number }) => {
    setCreatePrefill(prefill ?? null);
    setDialogMode('create');
    setEditingEntry(null);
    setDialogOpen(true);
  };

  const openEditDialog = (entry: SupplyChainEntry) => {
    setDialogMode('edit');
    setEditingEntry(entry);
    setDialogOpen(true);
  };

  const handleSave = async (data: Partial<SupplyChainEntry>) => {
    setIsLoading(true);
    try {
      if (dialogMode === 'create') {
        const result = await createSupplyChainEntry(data as Omit<SupplyChainEntry, 'id' | 'tenant_id'>);
        if (!result.success) throw new Error(result.error || t('Error saving'));
        // When inserting between existing stations, renumber the journey
        // so steps stay sequential (uses the existing reorder service).
        const productEntries = supplyChainEntries
          .filter(e => e.product_id === data.product_id)
          .sort((a, b) => a.step - b.step);
        if (result.id && data.product_id && data.step && data.step <= productEntries.length) {
          const orderedIds = productEntries.map(e => e.id);
          orderedIds.splice(Math.max(0, data.step - 1), 0, result.id);
          await reorderSupplyChain(data.product_id, orderedIds);
        }
        toast.success(t('Entry saved'));
      } else if (editingEntry) {
        const result = await updateSupplyChainEntry(editingEntry.id, data);
        if (!result.success) throw new Error(result.error || t('Error saving'));
        toast.success(t('Entry saved'));
      }
      await handleRefresh();
      setDialogOpen(false);
      setCreatePrefill(null);
    } catch (error) {
      console.error('Error saving:', error);
      toast.error(error instanceof Error && error.message ? error.message : t('Error saving'));
    }
    setIsLoading(false);
  };

  const handleDelete = (id: string) => {
    setSheetOpen(false);
    setEntryToDelete(id);
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    setIsLoading(true);
    try {
      const result = await deleteSupplyChainEntry(entryToDelete);
      if (!result.success) throw new Error(result.error || 'Deletion failed');
      toast.success(t('Entry deleted'));
      await handleRefresh();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(t('Error deleting'));
    }
    setIsLoading(false);
    setEntryToDelete(null);
  };

  const handleMove = async (entry: SupplyChainEntry, direction: 'earlier' | 'later') => {
    const productEntries = supplyChainEntries
      .filter(e => e.product_id === entry.product_id)
      .sort((a, b) => a.step - b.step);
    const index = productEntries.findIndex(e => e.id === entry.id);
    const target = direction === 'earlier' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= productEntries.length) return;

    const orderedIds = productEntries.map(e => e.id);
    [orderedIds[index], orderedIds[target]] = [orderedIds[target], orderedIds[index]];

    const result = await reorderSupplyChain(entry.product_id, orderedIds);
    if (!result.success) {
      toast.error(t('Error saving'));
      return;
    }
    toast.success(t('Order updated'));
    setSheetEntry(prev => (prev ? { ...prev, step: target + 1 } : prev));
    await handleRefresh();
  };

  const openStationSheet = (entry: SupplyChainEntry) => {
    setSheetEntry(entry);
    setSheetOpen(true);
  };

  const isEmpty = supplyChainEntries.length === 0 && !isLoading;
  const selectedProductName =
    selectedProductId === 'all' ? t('All Products') : getProductName(selectedProductId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <MotionDiv
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        {...(!prefersReduced && { variants: blurIn, initial: 'initial', animate: 'animate' })}
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('Supply Chain')}</h1>
          <p className="text-muted-foreground">{t('Supply chain transparency and traceability')}</p>
        </div>
        <Button onClick={() => openCreateDialog()} className="h-11">
          <Plus className="mr-2 h-4 w-4" />
          {t('New Entry')}
        </Button>
      </MotionDiv>

      {/* Prominent product switcher */}
      <MotionDiv
        className="flex flex-wrap items-center gap-3"
        {...(!prefersReduced && {
          variants: blurIn,
          initial: 'initial',
          animate: 'animate',
          transition: { delay: 0.05 },
        })}
      >
        <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={productPickerOpen}
              className="h-11 w-full justify-between sm:w-auto sm:min-w-[240px]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Package className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{selectedProductName}</span>
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="start">
            <Command>
              <CommandInput placeholder={t('Search product...')} />
              <CommandList>
                <CommandEmpty>{t('No product found')}</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="__all__"
                    onSelect={() => {
                      setSelectedProductId('all');
                      setProductPickerOpen(false);
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${selectedProductId === 'all' ? 'opacity-100' : 'opacity-0'}`}
                    />
                    {t('All Products')}
                  </CommandItem>
                  {products.map(product => (
                    <CommandItem
                      key={product.id}
                      value={product.name}
                      onSelect={() => {
                        setSelectedProductId(product.id);
                        setProductPickerOpen(false);
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${selectedProductId === product.id ? 'opacity-100' : 'opacity-0'}`}
                      />
                      <span className="truncate">{product.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <span className="text-sm text-muted-foreground tabular-nums">
          {t('{{count}} steps in the supply chain', { count: filteredEntries.length })}
        </span>
      </MotionDiv>

      {/* KPI strip (reflects active filters) */}
      <SupplyChainStats entries={filteredEntries} />

      {/* Filters & View Toggle */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="text-lg">{t('Supply Chain Entries')}</CardTitle>
            <div className="flex items-center gap-4">
              <Tabs value={activeView} onValueChange={v => setActiveView(v as ViewMode)}>
                <TabsList>
                  <TabsTrigger value="journey" className="gap-1.5">
                    <Route className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('Journey')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="cards" className="gap-1.5">
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('Cards')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="table" className="gap-1.5">
                    <TableIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('Table')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('Timeline')}</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <SupplyChainFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedProductId={selectedProductId}
            setSelectedProductId={setSelectedProductId}
            processTypeFilter={processTypeFilter}
            setProcessTypeFilter={setProcessTypeFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            transportFilter={transportFilter}
            setTransportFilter={setTransportFilter}
            products={products}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          />

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <ShimmerSkeleton className="h-5 w-32" />
                    <ShimmerSkeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {Array.from({ length: 3 }, (_, j) => (
                      <ShimmerSkeleton key={j} className="h-20 rounded" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <SupplyChainEmptyState onCreateFirst={() => openCreateDialog()} />
          ) : (
            <AnimatePresence mode="wait">
              <MotionDiv
                key={activeView}
                {...(!prefersReduced && { variants: tabContentVariants, initial: 'initial', animate: 'animate', exit: 'exit' })}
              >
              {activeView === 'journey' ? (
                /* Journey View — animated station path per product */
                <SupplyChainJourney
                  entriesByProduct={entriesByProduct}
                  getProductName={getProductName}
                  getSupplierName={getSupplierName}
                  onSelectStation={openStationSheet}
                  onAddStation={(productId, position) =>
                    openCreateDialog({ productId, step: position })
                  }
                />
              ) : activeView === 'cards' ? (
                /* Cards View — Product Cards */
                <div className="space-y-4">
                  {Object.keys(entriesByProduct).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">{t('No entries found')}</div>
                  ) : (
                    Object.entries(entriesByProduct).map(([productId, entries]) => (
                      <SupplyChainProductCard
                        key={productId}
                        productId={productId}
                        productName={getProductName(productId)}
                        entries={entries}
                        suppliers={suppliers}
                        onEdit={openEditDialog}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </div>
              ) : activeView === 'table' ? (
                /* Table View */
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">{t('Step')}</TableHead>
                        <TableHead>{t('Product')}</TableHead>
                        <TableHead>{t('Process Type')}</TableHead>
                        <TableHead>{t('Location')}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('Country')}</TableHead>
                        <TableHead>{t('Status')}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('Date')}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('Transport')}</TableHead>
                        <TableHead>{t('Risk')}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('Emissions (kg CO₂)')}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('Cost')}</TableHead>
                        <TableHead>{t('Verified')}</TableHead>
                        <TableHead className="w-[100px]">{t('Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                            {t('No entries found')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEntries.map(entry => (
                          <SupplyChainStepRow
                            key={entry.id}
                            entry={entry}
                            productName={getProductName(entry.product_id)}
                            supplierName={getSupplierName(entry) || undefined}
                            onEdit={openEditDialog}
                            onDelete={handleDelete}
                          />
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                /* Timeline View */
                <SupplyChainTimeline
                  entriesByProduct={entriesByProduct}
                  getProductName={getProductName}
                  getSupplierName={getSupplierName}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                />
              )}
              </MotionDiv>
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <SupplyChainDialog
        open={dialogOpen}
        onOpenChange={open => {
          setDialogOpen(open);
          if (!open) setCreatePrefill(null);
        }}
        mode={dialogMode}
        entry={editingEntry}
        products={products}
        suppliers={suppliers}
        supplyChainLength={
          selectedProductId === 'all'
            ? supplyChainEntries.length
            : supplyChainEntries.filter(e => e.product_id === selectedProductId).length
        }
        selectedProductId={selectedProductId}
        prefill={createPrefill}
        onSave={handleSave}
        isLoading={isLoading}
      />

      {/* Station detail sheet */}
      <SupplyChainStationSheet
        entry={sheetEntry}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        productName={sheetEntry ? getProductName(sheetEntry.product_id) : ''}
        supplierName={sheetEntry ? getSupplierName(sheetEntry) : null}
        canMoveEarlier={sheetEntryIndex > 0}
        canMoveLater={sheetEntryIndex >= 0 && sheetEntryIndex < sheetProductEntries.length - 1}
        onEdit={entry => {
          setSheetOpen(false);
          openEditDialog(entry);
        }}
        onDelete={handleDelete}
        onMove={handleMove}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!entryToDelete}
        onOpenChange={(open) => {
          if (!open) setEntryToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete entry?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Are you sure you want to delete this entry?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('Delete', { ns: 'common' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
