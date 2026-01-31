import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import {
  Package,
  MapPin,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  ChevronRight,
  Globe,
  Building2,
  Shield,
  Leaf,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
import {
  PROCESS_TYPE_CONFIG,
  STATUS_CONFIG,
  TRANSPORT_CONFIG,
  getProcessTypeClasses,
  getStatusClasses,
} from '@/lib/supply-chain-constants';

export function SupplyChainPage() {
  const { t } = useTranslation('settings');
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'table' | 'timeline'>('table');
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
  const [formData, setFormData] = useState<Partial<SupplyChainEntry>>({});
  const [activeFormTab, setActiveFormTab] = useState('basic');

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

  // Load supply chain when product filter changes
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

  // Helper functions (defined before memos that use them)
  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Unknown Product';
  };

  const getSupplierName = (entry: SupplyChainEntry) => {
    const id = entry.supplier_id || entry.supplier;
    if (!id) return null;
    return suppliers.find(s => s.id === id)?.name || id;
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = supplyChainEntries.length;
    const highRisk = supplyChainEntries.filter(e => e.risk_level === 'high').length;
    const mediumRisk = supplyChainEntries.filter(e => e.risk_level === 'medium').length;
    const verified = supplyChainEntries.filter(e => e.verified).length;
    const countries = new Set(supplyChainEntries.map(e => e.country)).size;
    const totalEmissions = supplyChainEntries.reduce((sum, e) => sum + (e.emissions_kg || 0), 0);
    const totalCost = supplyChainEntries.reduce((sum, e) => sum + (e.cost || 0), 0);

    return { total, highRisk, mediumRisk, verified, countries, totalEmissions, totalCost };
  }, [supplyChainEntries]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplyChainEntries, searchQuery, processTypeFilter, statusFilter, transportFilter, suppliers]);

  // Timeline view: Grouped by product
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

  // Empty form
  const getEmptyForm = (): Partial<SupplyChainEntry> => ({
    product_id: selectedProductId !== 'all' ? selectedProductId : products[0]?.id || '',
    step: supplyChainEntries.length + 1,
    location: '',
    country: 'DE',
    date: new Date().toISOString().split('T')[0],
    description: '',
    supplier: '',
    supplier_id: '',
    risk_level: 'low',
    verified: false,
    coordinates: '',
    process_type: undefined,
    transport_mode: undefined,
    status: 'completed',
    emissions_kg: undefined,
    duration_days: undefined,
    cost: undefined,
    currency: 'EUR',
    notes: '',
  });

  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingEntry(null);
    setFormData(getEmptyForm());
    setActiveFormTab('basic');
    setDialogOpen(true);
  };

  const openEditDialog = (entry: SupplyChainEntry) => {
    setDialogMode('edit');
    setEditingEntry(entry);
    setFormData({ ...entry });
    setActiveFormTab('basic');
    setDialogOpen(true);
  };

  const updateForm = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (dialogMode === 'create') {
        const result = await createSupplyChainEntry(formData as Omit<SupplyChainEntry, 'id' | 'tenant_id'>);
        if (!result.success) throw new Error('Creation failed');
      } else if (editingEntry) {
        const result = await updateSupplyChainEntry(editingEntry.id, formData);
        if (!result.success) throw new Error('Update failed');
      }
      if (selectedProductId === 'all') {
        await loadAllSupplyChain();
      } else {
        await loadSupplyChain(selectedProductId);
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving:', error);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    setIsLoading(true);
    try {
      const result = await deleteSupplyChainEntry(id);
      if (!result.success) throw new Error('Deletion failed');
      if (selectedProductId === 'all') {
        await loadAllSupplyChain();
      } else {
        await loadSupplyChain(selectedProductId);
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
    setIsLoading(false);
  };

  // Render helpers
  const renderRiskBadge = (level?: string) => {
    switch (level) {
      case 'high':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{t('High')}</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="h-3 w-3" />{t('Medium')}</Badge>;
      default:
        return <Badge variant="outline" className="gap-1 text-green-600 border-green-200"><CheckCircle2 className="h-3 w-3" />{t('Low')}</Badge>;
    }
  };

  const renderProcessTypeBadge = (type?: string) => {
    if (!type) return null;
    const config = PROCESS_TYPE_CONFIG[type];
    if (!config) return null;
    const classes = getProcessTypeClasses(config.color);
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`gap-1 ${classes.bg} ${classes.text} ${classes.border}`}>
        <Icon className="h-3 w-3" />
        {t(config.label)}
      </Badge>
    );
  };

  const renderStatusBadge = (status?: string) => {
    if (!status) return null;
    const config = STATUS_CONFIG[status];
    if (!config) return null;
    const classes = getStatusClasses(config.color);
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`gap-1 ${classes.bg} ${classes.text}`}>
        <Icon className={`h-3 w-3 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
        {t(config.label)}
      </Badge>
    );
  };

  const renderTransportIcon = (mode?: string) => {
    if (!mode) return null;
    const config = TRANSPORT_CONFIG[mode];
    if (!config) return null;
    const Icon = config.icon;
    return (
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {t(config.label)}
      </span>
    );
  };

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

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('Total')}</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{t('Supply Chain Steps')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">{t('High Risk')}</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-destructive">{stats.highRisk}</p>
            <p className="text-xs text-muted-foreground">{t('Entries')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">{t('Medium Risk')}</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.mediumRisk}</p>
            <p className="text-xs text-muted-foreground">{t('Entries')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">{t('Verified')}</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.verified}</p>
            <p className="text-xs text-muted-foreground">{t('of {{total}}', { total: stats.total })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">{t('Countries')}</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.countries}</p>
            <p className="text-xs text-muted-foreground">{t('involved')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">{t('Total Emissions')}</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.totalEmissions.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">{t('kg CO₂')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">{t('Total Cost')}</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-purple-600">{stats.totalCost.toFixed(0)} €</p>
            <p className="text-xs text-muted-foreground">{t('Entries')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="text-lg">{t('Supply Chain Entries')}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={t('Filter by product')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Products')}</SelectItem>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={processTypeFilter} onValueChange={setProcessTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t('Process Type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Types')}</SelectItem>
                  {Object.entries(PROCESS_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{t(config.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Status')}</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{t(config.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={transportFilter} onValueChange={setTransportFilter}>
                <SelectTrigger className="w-[140px] hidden md:flex">
                  <SelectValue placeholder={t('Transport')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Types')}</SelectItem>
                  {Object.entries(TRANSPORT_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{t(config.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('Search...', { ns: 'common' })}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => selectedProductId === 'all' ? loadAllSupplyChain() : loadSupplyChain(selectedProductId)}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeView} onValueChange={v => setActiveView(v as 'table' | 'timeline')} className="mb-4">
            <TabsList>
              <TabsTrigger value="table">{t('Table')}</TabsTrigger>
              <TabsTrigger value="timeline">{t('Timeline')}</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeView === 'table' ? (
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
                      <TableRow key={entry.id}>
                        <TableCell><Badge variant="outline">{entry.step}</Badge></TableCell>
                        <TableCell className="font-medium max-w-[120px] truncate">{getProductName(entry.product_id)}</TableCell>
                        <TableCell>{renderProcessTypeBadge(entry.process_type)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate max-w-[120px]">{entry.location}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{entry.country}</TableCell>
                        <TableCell>{renderStatusBadge(entry.status)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDate(entry.date, locale)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{renderTransportIcon(entry.transport_mode)}</TableCell>
                        <TableCell>{renderRiskBadge(entry.risk_level)}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {entry.emissions_kg != null && (
                            <span className="flex items-center gap-1 text-sm">
                              <Leaf className="h-3 w-3 text-green-600" />
                              {entry.emissions_kg}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {entry.cost != null && (
                            <span className="text-sm">{entry.cost} {entry.currency || 'EUR'}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.verified ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(entry)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Timeline View */
            <div className="space-y-6">
              {Object.keys(entriesByProduct).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t('No entries found')}</div>
              ) : (
                Object.entries(entriesByProduct).map(([productId, entries]) => (
                  <Card key={productId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {getProductName(productId)}
                      </CardTitle>
                      <CardDescription>{t('{{count}} steps in the supply chain', { count: entries.length })}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
                        <div className="space-y-4">
                          {entries.map((entry, index) => {
                            const processConfig = entry.process_type ? PROCESS_TYPE_CONFIG[entry.process_type] : null;
                            const processClasses = processConfig ? getProcessTypeClasses(processConfig.color) : null;
                            const ProcessIcon = processConfig?.icon || Package;

                            return (
                              <div key={entry.id} className="relative flex items-start gap-4 pl-12">
                                {/* Process Type Icon on timeline */}
                                <div
                                  className={`absolute left-2 w-7 h-7 rounded-full border-2 bg-background flex items-center justify-center ${
                                    processClasses
                                      ? `${processClasses.border} ${processClasses.text}`
                                      : entry.risk_level === 'high'
                                      ? 'border-destructive text-destructive'
                                      : entry.risk_level === 'medium'
                                      ? 'border-yellow-500 text-yellow-600'
                                      : 'border-green-500 text-green-600'
                                  }`}
                                >
                                  <ProcessIcon className="h-3.5 w-3.5" />
                                </div>

                                {/* Transport icon between steps */}
                                {index < entries.length - 1 && entry.transport_mode && (
                                  <div className="absolute left-2.5 top-10 w-5 flex justify-center">
                                    {(() => {
                                      const tc = TRANSPORT_CONFIG[entry.transport_mode!];
                                      if (!tc) return null;
                                      const TIcon = tc.icon;
                                      return <TIcon className="h-3 w-3 text-muted-foreground" />;
                                    })()}
                                  </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0 bg-muted/30 rounded-lg p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="font-medium">{entry.location}</span>
                                        <Badge variant="outline" className="text-xs">{entry.country}</Badge>
                                        {renderProcessTypeBadge(entry.process_type)}
                                        {renderStatusBadge(entry.status)}
                                        {renderRiskBadge(entry.risk_level)}
                                      </div>
                                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {formatDate(entry.date, locale)}
                                        </span>
                                        {(entry.supplier_id || entry.supplier) && (
                                          <span className="flex items-center gap-1">
                                            <Building2 className="h-3 w-3" />
                                            {getSupplierName(entry)}
                                          </span>
                                        )}
                                        {entry.transport_mode && renderTransportIcon(entry.transport_mode)}
                                        {entry.emissions_kg != null && (
                                          <span className="flex items-center gap-1 text-green-600">
                                            <Leaf className="h-3 w-3" />
                                            {entry.emissions_kg} kg CO₂
                                          </span>
                                        )}
                                        {entry.verified && (
                                          <span className="flex items-center gap-1 text-green-600">
                                            <CheckCircle2 className="h-3 w-3" />
                                            {t('Verified')}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(entry)}>
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(entry.id)}>
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>

                                {index < entries.length - 1 && (
                                  <ChevronRight className="absolute -bottom-4 left-4 h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog - 3-Tab Form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? t('New Supply Chain Entry') : t('Edit Entry')}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create'
                ? t('Add a new step to the supply chain.')
                : t('Edit the details of this supply chain step.')}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">{t('Basic Data')}</TabsTrigger>
              <TabsTrigger value="process">{t('Process')}</TabsTrigger>
              <TabsTrigger value="logistics">{t('Logistics')}</TabsTrigger>
            </TabsList>

            {/* Tab 1: Basic Data */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div>
                <Label>{t('Product')}</Label>
                <Select
                  value={formData.product_id || ''}
                  onValueChange={v => updateForm('product_id', v)}
                  disabled={dialogMode === 'edit'}
                >
                  <SelectTrigger><SelectValue placeholder={t('Select product')} /></SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('Step')}</Label>
                  <Input type="number" value={formData.step || 1} onChange={e => updateForm('step', parseInt(e.target.value))} min={1} />
                </div>
                <div>
                  <Label>{t('Country')}</Label>
                  <Select value={formData.country || 'DE'} onValueChange={v => updateForm('country', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="AT">Austria</SelectItem>
                      <SelectItem value="CH">Switzerland</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="IT">Italy</SelectItem>
                      <SelectItem value="NL">Netherlands</SelectItem>
                      <SelectItem value="BE">Belgium</SelectItem>
                      <SelectItem value="PL">Poland</SelectItem>
                      <SelectItem value="CZ">Czech Republic</SelectItem>
                      <SelectItem value="CN">China</SelectItem>
                      <SelectItem value="US">USA</SelectItem>
                      <SelectItem value="IN">India</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>{t('Location')}</Label>
                <Input value={formData.location || ''} onChange={e => updateForm('location', e.target.value)} placeholder={t('e.g. Production Plant Munich')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('Date')}</Label>
                  <Input type="date" value={formData.date || ''} onChange={e => updateForm('date', e.target.value)} />
                </div>
                <div>
                  <Label>{t('Supplier (optional)')}</Label>
                  <Select
                    value={formData.supplier_id || formData.supplier || 'none'}
                    onValueChange={v => {
                      const val = v === 'none' ? '' : v;
                      updateForm('supplier_id', val);
                      updateForm('supplier', val);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder={t('Select supplier')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- {t('No Supplier')} --</SelectItem>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>{supplier.name} ({supplier.country})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>{t('Description')}</Label>
                <Input
                  value={formData.description || ''}
                  onChange={e => updateForm('description', e.target.value)}
                  placeholder={t('Describe this supply chain step...')}
                />
              </div>
            </TabsContent>

            {/* Tab 2: Process */}
            <TabsContent value="process" className="space-y-4 mt-4">
              <div>
                <Label>{t('Process Type (optional)')}</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {Object.entries(PROCESS_TYPE_CONFIG).map(([key, config]) => {
                    const classes = getProcessTypeClasses(config.color);
                    const Icon = config.icon;
                    const isSelected = formData.process_type === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateForm('process_type', isSelected ? undefined : key)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-xs ${
                          isSelected
                            ? `${classes.bg} ${classes.text} ${classes.border}`
                            : 'border-transparent bg-muted/30 hover:bg-muted/50'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-center leading-tight">{t(config.label)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('Status')}</Label>
                  <Select value={formData.status || 'completed'} onValueChange={v => updateForm('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{t(config.label)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('Duration (days)')}</Label>
                  <Input type="number" value={formData.duration_days || ''} onChange={e => updateForm('duration_days', e.target.value ? parseInt(e.target.value) : undefined)} min={0} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('Risk Level')}</Label>
                  <Select value={formData.risk_level || 'low'} onValueChange={v => updateForm('risk_level', v as 'low' | 'medium' | 'high')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('Low')}</SelectItem>
                      <SelectItem value="medium">{t('Medium')}</SelectItem>
                      <SelectItem value="high">{t('High')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox id="verified" checked={formData.verified || false} onCheckedChange={v => updateForm('verified', v)} />
                  <Label htmlFor="verified">{t('Verified')}</Label>
                </div>
              </div>

              <div>
                <Label>{t('Coordinates (optional)')}</Label>
                <Input value={formData.coordinates || ''} onChange={e => updateForm('coordinates', e.target.value)} placeholder={t('e.g. 48.1351,11.5820')} />
                <p className="text-xs text-muted-foreground mt-1">{t('Format: Latitude,Longitude')}</p>
              </div>
            </TabsContent>

            {/* Tab 3: Logistics */}
            <TabsContent value="logistics" className="space-y-4 mt-4">
              <div>
                <Label>{t('Transport Mode (optional)')}</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {Object.entries(TRANSPORT_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = formData.transport_mode === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateForm('transport_mode', isSelected ? undefined : key)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-xs ${
                          isSelected ? 'bg-primary/10 text-primary border-primary' : 'border-transparent bg-muted/30 hover:bg-muted/50'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{t(config.label)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('Cost (optional)')}</Label>
                  <Input type="number" step="0.01" value={formData.cost ?? ''} onChange={e => updateForm('cost', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="0.00" />
                </div>
                <div>
                  <Label>{t('Currency')}</Label>
                  <Select value={formData.currency || 'EUR'} onValueChange={v => updateForm('currency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CHF">CHF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>{t('Emissions kg CO₂ (optional)')}</Label>
                <Input type="number" step="0.01" value={formData.emissions_kg ?? ''} onChange={e => updateForm('emissions_kg', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="0.00" />
              </div>

              <div>
                <Label>{t('Notes (optional)')}</Label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={e => updateForm('notes', e.target.value)}
                  placeholder={t('Notes (optional)')}
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              {t('Cancel', { ns: 'common' })}
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t('Save', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
