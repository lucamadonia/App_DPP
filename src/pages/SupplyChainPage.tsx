import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Loader2,
  LayoutGrid,
  Table as TableIcon,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getSupplyChain,
  getSupplyChainByTenant,
  createSupplyChainEntry,
  updateSupplyChainEntry,
  deleteSupplyChainEntry,
  getProducts,
  getSuppliers,
  type ProductListItem,
} from '@/services/supabase';
import type { SupplyChainEntry, Supplier } from '@/types/database';

import { SupplyChainStats } from '@/components/supply-chain/SupplyChainStats';
import { SupplyChainFilters } from '@/components/supply-chain/SupplyChainFilters';
import { SupplyChainProductCard } from '@/components/supply-chain/SupplyChainProductCard';
import { SupplyChainTimeline } from '@/components/supply-chain/SupplyChainTimeline';
import { SupplyChainDialog } from '@/components/supply-chain/SupplyChainDialog';
import { SupplyChainEmptyState } from '@/components/supply-chain/SupplyChainEmptyState';
import { SupplyChainStepRow } from '@/components/supply-chain/SupplyChainStepRow';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type ViewMode = 'cards' | 'table' | 'timeline';

export function SupplyChainPage() {
  const { t } = useTranslation('settings');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<ViewMode>('cards');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [processTypeFilter, setProcessTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [transportFilter, setTransportFilter] = useState<string>('all');

  // Data state
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplyChainEntries, setSupplyChainEntries] = useState<SupplyChainEntry[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingEntry, setEditingEntry] = useState<SupplyChainEntry | null>(null);

  // Load data on mount
  useEffect(() => {
    loadInitialData();
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
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (selectedProductId && selectedProductId !== 'all') {
      loadSupplyChain(selectedProductId);
    } else if (selectedProductId === 'all' && products.length > 0) {
      loadAllSupplyChain();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  const loadSupplyChain = async (productId: string) => {
    setIsLoading(true);
    try {
      const data = await getSupplyChain(productId);
      setSupplyChainEntries(data);
    } catch (error) {
      console.error('Error loading supply chain:', error);
    }
    setIsLoading(false);
  };

  const loadAllSupplyChain = async () => {
    setIsLoading(true);
    try {
      const data = await getSupplyChainByTenant();
      setSupplyChainEntries(data);
    } catch (error) {
      console.error('Error loading supply chain:', error);
    }
    setIsLoading(false);
  };

  const handleRefresh = useCallback(() => {
    if (selectedProductId === 'all') {
      loadAllSupplyChain();
    } else {
      loadSupplyChain(selectedProductId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  // Helpers
  const getProductName = useCallback((productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Unknown Product';
  }, [products]);

  const getSupplierName = useCallback((entry: SupplyChainEntry) => {
    const id = entry.supplier_id || entry.supplier;
    if (!id) return null;
    return suppliers.find(s => s.id === id)?.name || id;
  }, [suppliers]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return supplyChainEntries.filter(entry => {
      const supplierName = getSupplierName(entry) || '';
      const matchesSearch =
        entry.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplierName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProcess = processTypeFilter === 'all' || entry.process_type === processTypeFilter;
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      const matchesTransport = transportFilter === 'all' || entry.transport_mode === transportFilter;
      return matchesSearch && matchesProcess && matchesStatus && matchesTransport;
    });
  }, [supplyChainEntries, searchQuery, processTypeFilter, statusFilter, transportFilter, getSupplierName]);

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

  // Dialog handlers
  const openCreateDialog = () => {
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
        if (!result.success) throw new Error('Creation failed');
      } else if (editingEntry) {
        const result = await updateSupplyChainEntry(editingEntry.id, data);
        if (!result.success) throw new Error('Update failed');
      }
      handleRefresh();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving:', error);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('Are you sure you want to delete this entry?'))) return;
    setIsLoading(true);
    try {
      const result = await deleteSupplyChainEntry(id);
      if (!result.success) throw new Error('Deletion failed');
      handleRefresh();
    } catch (error) {
      console.error('Error deleting:', error);
    }
    setIsLoading(false);
  };

  const isEmpty = supplyChainEntries.length === 0 && !isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('Supply Chain')}</h1>
          <p className="text-muted-foreground">{t('Supply chain transparency and traceability')}</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          {t('New Entry')}
        </Button>
      </div>

      {/* Statistics */}
      <SupplyChainStats entries={supplyChainEntries} />

      {/* Filters & View Toggle */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="text-lg">{t('Supply Chain Entries')}</CardTitle>
            <div className="flex items-center gap-4">
              <Tabs value={activeView} onValueChange={v => setActiveView(v as ViewMode)}>
                <TabsList>
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isEmpty ? (
            <SupplyChainEmptyState onCreateFirst={openCreateDialog} />
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
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <SupplyChainDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        entry={editingEntry}
        products={products}
        suppliers={suppliers}
        supplyChainLength={supplyChainEntries.length}
        selectedProductId={selectedProductId}
        onSave={handleSave}
        isLoading={isLoading}
      />
    </div>
  );
}
