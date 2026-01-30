import { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  getSupplyChain,
  createSupplyChainEntry,
  updateSupplyChainEntry,
  deleteSupplyChainEntry,
  getProducts,
  getSuppliers,
  type ProductListItem,
} from '@/services/supabase';
import type { SupplyChainEntry, Supplier } from '@/types/database';

export function SupplyChainPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'table' | 'timeline'>('table');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');

  // Data state
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplyChainEntries, setSupplyChainEntries] = useState<SupplyChainEntry[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingEntry, setEditingEntry] = useState<SupplyChainEntry | null>(null);
  const [formData, setFormData] = useState<Partial<SupplyChainEntry>>({});

  // Load data on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load initial data
  const loadInitialData = async () => {
    try {
      const [productsData, suppliersData] = await Promise.all([
        getProducts(),
        getSuppliers(),
      ]);
      setProducts(productsData);
      setSuppliers(suppliersData);
      if (productsData.length > 0) {
        setSelectedProductId('all');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Load supply chain when product is selected
  useEffect(() => {
    if (selectedProductId && selectedProductId !== 'all') {
      loadSupplyChain(selectedProductId);
    } else if (selectedProductId === 'all') {
      loadAllSupplyChain();
    }
  }, [selectedProductId]);


  // Load supply chain for a product
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

  // Load all supply chain entries
  const loadAllSupplyChain = async () => {
    setIsLoading(true);
    try {
      const allEntries: SupplyChainEntry[] = [];
      for (const product of products) {
        const data = await getSupplyChain(product.id);
        allEntries.push(...data);
      }
      setSupplyChainEntries(allEntries);
    } catch (error) {
      console.error('Error loading supply chain:', error);
    }
    setIsLoading(false);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = supplyChainEntries.length;
    const highRisk = supplyChainEntries.filter(e => e.risk_level === 'high').length;
    const mediumRisk = supplyChainEntries.filter(e => e.risk_level === 'medium').length;
    const verified = supplyChainEntries.filter(e => e.verified).length;
    const countries = new Set(supplyChainEntries.map(e => e.country)).size;

    return { total, highRisk, mediumRisk, verified, countries };
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
      return matchesSearch;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplyChainEntries, searchQuery, suppliers]);

  // Timeline view: Grouped by product
  const entriesByProduct = useMemo(() => {
    const grouped: Record<string, SupplyChainEntry[]> = {};
    filteredEntries.forEach(entry => {
      if (!grouped[entry.product_id]) {
        grouped[entry.product_id] = [];
      }
      grouped[entry.product_id].push(entry);
    });
    // Sort within each group by step
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
  });

  // Open dialog
  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingEntry(null);
    setFormData(getEmptyForm());
    setDialogOpen(true);
  };

  const openEditDialog = (entry: SupplyChainEntry) => {
    setDialogMode('edit');
    setEditingEntry(entry);
    setFormData({ ...entry });
    setDialogOpen(true);
  };

  // Update form
  const updateForm = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Save
  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (dialogMode === 'create') {
        const result = await createSupplyChainEntry(formData as Omit<SupplyChainEntry, 'id' | 'tenant_id'>);
        if (!result.success) {
          throw new Error('Creation failed');
        }
      } else if (editingEntry) {
        const result = await updateSupplyChainEntry(editingEntry.id, formData);
        if (!result.success) {
          throw new Error('Update failed');
        }
      }

      // Reload
      if (selectedProductId === 'all') {
        await loadAllSupplyChain();
      } else {
        await loadSupplyChain(selectedProductId);
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving');
    }
    setIsLoading(false);
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    setIsLoading(true);
    try {
      const result = await deleteSupplyChainEntry(id);
      if (!result.success) {
        throw new Error('Deletion failed');
      }
      // Reload
      if (selectedProductId === 'all') {
        await loadAllSupplyChain();
      } else {
        await loadSupplyChain(selectedProductId);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting');
    }
    setIsLoading(false);
  };

  // Risk badge renderer
  const renderRiskBadge = (level?: string) => {
    switch (level) {
      case 'high':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            High
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="h-3 w-3" />
            Medium
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
            <CheckCircle2 className="h-3 w-3" />
            Low
          </Badge>
        );
    }
  };

  // Find product name
  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Unknown Product';
  };

  // Find supplier name (supports supplier_id and supplier TEXT)
  const getSupplierName = (entry: SupplyChainEntry) => {
    const id = entry.supplier_id || entry.supplier;
    if (!id) return null;
    return suppliers.find(s => s.id === id)?.name || id;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Supply Chain</h1>
          <p className="text-muted-foreground">
            Supply chain transparency and traceability
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          New Entry
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Supply Chain Steps</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">High Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-destructive">{stats.highRisk}</p>
            <p className="text-xs text-muted-foreground">Entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Medium Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.mediumRisk}</p>
            <p className="text-xs text-muted-foreground">Entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Verified</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.verified}</p>
            <p className="text-xs text-muted-foreground">of {stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Countries</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.countries}</p>
            <p className="text-xs text-muted-foreground">involved</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Supply Chain Entries</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  selectedProductId === 'all' ? loadAllSupplyChain() : loadSupplyChain(selectedProductId)
                }
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* View Tabs */}
          <Tabs value={activeView} onValueChange={v => setActiveView(v as 'table' | 'timeline')} className="mb-4">
            <TabsList>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeView === 'table' ? (
            /* Table View */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Step</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Badge variant="outline">{entry.step}</Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[150px] truncate">
                        {getProductName(entry.product_id)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {entry.location}
                        </div>
                      </TableCell>
                      <TableCell>{entry.country}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(entry.date).toLocaleDateString('en-US')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(entry.supplier_id || entry.supplier) && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {getSupplierName(entry)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{renderRiskBadge(entry.risk_level)}</TableCell>
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
          ) : (
            /* Timeline View */
            <div className="space-y-6">
              {Object.keys(entriesByProduct).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No entries found</div>
              ) : (
                Object.entries(entriesByProduct).map(([productId, entries]) => (
                  <Card key={productId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {getProductName(productId)}
                      </CardTitle>
                      <CardDescription>{entries.length} steps in the supply chain</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                        <div className="space-y-4">
                          {entries.map((entry, index) => (
                            <div key={entry.id} className="relative flex items-start gap-4 pl-10">
                              {/* Point on the line */}
                              <div
                                className={`absolute left-2 w-5 h-5 rounded-full border-2 bg-background flex items-center justify-center ${
                                  entry.risk_level === 'high'
                                    ? 'border-destructive'
                                    : entry.risk_level === 'medium'
                                    ? 'border-yellow-500'
                                    : 'border-green-500'
                                }`}
                              >
                                <span className="text-xs font-bold">{entry.step}</span>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0 bg-muted/30 rounded-lg p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <MapPin className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">{entry.location}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {entry.country}
                                      </Badge>
                                      {renderRiskBadge(entry.risk_level)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{entry.description}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(entry.date).toLocaleDateString('en-US')}
                                      </span>
                                      {(entry.supplier_id || entry.supplier) && (
                                        <span className="flex items-center gap-1">
                                          <Building2 className="h-3 w-3" />
                                          {getSupplierName(entry)}
                                        </span>
                                      )}
                                      {entry.verified && (
                                        <span className="flex items-center gap-1 text-green-600">
                                          <CheckCircle2 className="h-3 w-3" />
                                          Verified
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(entry)}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(entry.id)}>
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Arrow to next */}
                              {index < entries.length - 1 && (
                                <ChevronRight className="absolute -bottom-4 left-3 h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          ))}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'New Supply Chain Entry' : 'Edit Entry'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create'
                ? 'Add a new step to the supply chain.'
                : 'Edit the details of this supply chain step.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Product Selection */}
            <div>
              <Label>Product</Label>
              <Select
                value={formData.product_id || ''}
                onValueChange={v => updateForm('product_id', v)}
                disabled={dialogMode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step & Country */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Step</Label>
                <Input
                  type="number"
                  value={formData.step || 1}
                  onChange={e => updateForm('step', parseInt(e.target.value))}
                  min={1}
                />
              </div>
              <div>
                <Label>Country</Label>
                <Select value={formData.country || 'DE'} onValueChange={v => updateForm('country', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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

            {/* Location */}
            <div>
              <Label>Location</Label>
              <Input
                value={formData.location || ''}
                onChange={e => updateForm('location', e.target.value)}
                placeholder="e.g. Production Plant Munich"
              />
            </div>

            {/* Date & Supplier */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={formData.date || ''} onChange={e => updateForm('date', e.target.value)} />
              </div>
              <div>
                <Label>Supplier (optional)</Label>
                <Select
                  value={formData.supplier_id || formData.supplier || 'none'}
                  onValueChange={v => {
                    const val = v === 'none' ? '' : v;
                    updateForm('supplier_id', val);
                    updateForm('supplier', val);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- No Supplier --</SelectItem>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.country})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description || ''}
                onChange={e => updateForm('description', e.target.value)}
                placeholder="Describe this supply chain step..."
              />
            </div>

            {/* Risk & Verified */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Risk Level</Label>
                <Select
                  value={formData.risk_level || 'low'}
                  onValueChange={v => updateForm('risk_level', v as 'low' | 'medium' | 'high')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="verified"
                  checked={formData.verified || false}
                  onCheckedChange={v => updateForm('verified', v)}
                />
                <Label htmlFor="verified">Verified</Label>
              </div>
            </div>

            {/* Coordinates (optional) */}
            <div>
              <Label>Coordinates (optional)</Label>
              <Input
                value={formData.coordinates || ''}
                onChange={e => updateForm('coordinates', e.target.value)}
                placeholder="e.g. 48.1351,11.5820"
              />
              <p className="text-xs text-muted-foreground mt-1">Format: Latitude,Longitude</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
