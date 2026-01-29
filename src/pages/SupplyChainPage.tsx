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

  // Daten-State
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplyChainEntries, setSupplyChainEntries] = useState<SupplyChainEntry[]>([]);

  // Dialog-State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingEntry, setEditingEntry] = useState<SupplyChainEntry | null>(null);
  const [formData, setFormData] = useState<Partial<SupplyChainEntry>>({});

  // Daten laden beim Mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Initiale Daten laden
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
      console.error('Fehler beim Laden:', error);
    }
  };

  // Supply Chain laden wenn Produkt ausgewahlt
  useEffect(() => {
    if (selectedProductId && selectedProductId !== 'all') {
      loadSupplyChain(selectedProductId);
    } else if (selectedProductId === 'all') {
      loadAllSupplyChain();
    }
  }, [selectedProductId]);


  // Supply Chain fur ein Produkt laden
  const loadSupplyChain = async (productId: string) => {
    setIsLoading(true);
    try {
      const data = await getSupplyChain(productId);
      setSupplyChainEntries(data);
    } catch (error) {
      console.error('Fehler beim Laden der Supply Chain:', error);
    }
    setIsLoading(false);
  };

  // Alle Supply Chain Eintrage laden
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
      console.error('Fehler beim Laden der Supply Chain:', error);
    }
    setIsLoading(false);
  };

  // Statistiken berechnen
  const stats = useMemo(() => {
    const total = supplyChainEntries.length;
    const highRisk = supplyChainEntries.filter(e => e.risk_level === 'high').length;
    const mediumRisk = supplyChainEntries.filter(e => e.risk_level === 'medium').length;
    const verified = supplyChainEntries.filter(e => e.verified).length;
    const countries = new Set(supplyChainEntries.map(e => e.country)).size;

    return { total, highRisk, mediumRisk, verified, countries };
  }, [supplyChainEntries]);

  // Gefilterte Eintrage
  const filteredEntries = useMemo(() => {
    return supplyChainEntries.filter(entry => {
      const matchesSearch =
        entry.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      return matchesSearch;
    });
  }, [supplyChainEntries, searchQuery]);

  // Timeline-Ansicht: Gruppiert nach Produkt
  const entriesByProduct = useMemo(() => {
    const grouped: Record<string, SupplyChainEntry[]> = {};
    filteredEntries.forEach(entry => {
      if (!grouped[entry.product_id]) {
        grouped[entry.product_id] = [];
      }
      grouped[entry.product_id].push(entry);
    });
    // Sortiere innerhalb jeder Gruppe nach Step
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.step - b.step);
    });
    return grouped;
  }, [filteredEntries]);

  // Leeres Formular
  const getEmptyForm = (): Partial<SupplyChainEntry> => ({
    product_id: selectedProductId !== 'all' ? selectedProductId : products[0]?.id || '',
    step: supplyChainEntries.length + 1,
    location: '',
    country: 'DE',
    date: new Date().toISOString().split('T')[0],
    description: '',
    supplier: '',
    risk_level: 'low',
    verified: false,
    coordinates: '',
  });

  // Dialog offnen
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

  // Formular aktualisieren
  const updateForm = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Speichern
  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (dialogMode === 'create') {
        const result = await createSupplyChainEntry(formData as Omit<SupplyChainEntry, 'id' | 'tenant_id'>);
        if (!result.success) {
          throw new Error('Erstellen fehlgeschlagen');
        }
      } else if (editingEntry) {
        const result = await updateSupplyChainEntry(editingEntry.id, formData);
        if (!result.success) {
          throw new Error('Aktualisierung fehlgeschlagen');
        }
      }

      // Neu laden
      if (selectedProductId === 'all') {
        await loadAllSupplyChain();
      } else {
        await loadSupplyChain(selectedProductId);
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern');
    }
    setIsLoading(false);
  };

  // Loschen
  const handleDelete = async (id: string) => {
    if (!confirm('Wirklich loschen?')) return;
    setIsLoading(true);
    try {
      const result = await deleteSupplyChainEntry(id);
      if (!result.success) {
        throw new Error('Loschen fehlgeschlagen');
      }
      // Neu laden
      if (selectedProductId === 'all') {
        await loadAllSupplyChain();
      } else {
        await loadSupplyChain(selectedProductId);
      }
    } catch (error) {
      console.error('Fehler beim Loschen:', error);
      alert('Fehler beim Loschen');
    }
    setIsLoading(false);
  };

  // Risiko-Badge Renderer
  const renderRiskBadge = (level?: string) => {
    switch (level) {
      case 'high':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Hoch
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="h-3 w-3" />
            Mittel
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
            <CheckCircle2 className="h-3 w-3" />
            Niedrig
          </Badge>
        );
    }
  };

  // Produktname finden
  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Unbekanntes Produkt';
  };

  // Lieferantenname finden
  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return null;
    return suppliers.find(s => s.id === supplierId)?.name || supplierId;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lieferkette</h1>
          <p className="text-muted-foreground">
            Supply Chain Transparenz und Ruckverfolgbarkeit
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Neuer Eintrag
        </Button>
      </div>

      {/* Statistik-Karten */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Gesamt</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Lieferketten-Schritte</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Hohes Risiko</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-destructive">{stats.highRisk}</p>
            <p className="text-xs text-muted-foreground">Eintrage</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Mittleres Risiko</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.mediumRisk}</p>
            <p className="text-xs text-muted-foreground">Eintrage</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Verifiziert</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.verified}</p>
            <p className="text-xs text-muted-foreground">von {stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Lander</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.countries}</p>
            <p className="text-xs text-muted-foreground">involviert</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Suche */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Lieferketten-Eintrage</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Produkt filtern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Produkte</SelectItem>
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
                  placeholder="Suchen..."
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
          {/* Ansicht-Tabs */}
          <Tabs value={activeView} onValueChange={v => setActiveView(v as 'table' | 'timeline')} className="mb-4">
            <TabsList>
              <TabsTrigger value="table">Tabelle</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeView === 'table' ? (
            /* Tabellen-Ansicht */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Schritt</TableHead>
                  <TableHead>Produkt</TableHead>
                  <TableHead>Standort</TableHead>
                  <TableHead>Land</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Lieferant</TableHead>
                  <TableHead>Risiko</TableHead>
                  <TableHead>Verifiziert</TableHead>
                  <TableHead className="w-[100px]">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Keine Eintrage gefunden
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
                          {new Date(entry.date).toLocaleDateString('de-DE')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.supplier && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {getSupplierName(entry.supplier)}
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
            /* Timeline-Ansicht */
            <div className="space-y-6">
              {Object.keys(entriesByProduct).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Keine Eintrage gefunden</div>
              ) : (
                Object.entries(entriesByProduct).map(([productId, entries]) => (
                  <Card key={productId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {getProductName(productId)}
                      </CardTitle>
                      <CardDescription>{entries.length} Schritte in der Lieferkette</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        {/* Vertikale Linie */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                        <div className="space-y-4">
                          {entries.map((entry, index) => (
                            <div key={entry.id} className="relative flex items-start gap-4 pl-10">
                              {/* Punkt auf der Linie */}
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

                              {/* Inhalt */}
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
                                        {new Date(entry.date).toLocaleDateString('de-DE')}
                                      </span>
                                      {entry.supplier && (
                                        <span className="flex items-center gap-1">
                                          <Building2 className="h-3 w-3" />
                                          {getSupplierName(entry.supplier)}
                                        </span>
                                      )}
                                      {entry.verified && (
                                        <span className="flex items-center gap-1 text-green-600">
                                          <CheckCircle2 className="h-3 w-3" />
                                          Verifiziert
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

                              {/* Pfeil zum nachsten */}
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

      {/* Dialog zum Erstellen/Bearbeiten */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Neuer Lieferketten-Eintrag' : 'Eintrag bearbeiten'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create'
                ? 'Fugen Sie einen neuen Schritt zur Lieferkette hinzu.'
                : 'Bearbeiten Sie die Details dieses Lieferketten-Schritts.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Produkt-Auswahl */}
            <div>
              <Label>Produkt</Label>
              <Select
                value={formData.product_id || ''}
                onValueChange={v => updateForm('product_id', v)}
                disabled={dialogMode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Produkt auswahlen" />
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

            {/* Schritt & Land */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Schritt</Label>
                <Input
                  type="number"
                  value={formData.step || 1}
                  onChange={e => updateForm('step', parseInt(e.target.value))}
                  min={1}
                />
              </div>
              <div>
                <Label>Land</Label>
                <Select value={formData.country || 'DE'} onValueChange={v => updateForm('country', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DE">Deutschland</SelectItem>
                    <SelectItem value="AT">Osterreich</SelectItem>
                    <SelectItem value="CH">Schweiz</SelectItem>
                    <SelectItem value="FR">Frankreich</SelectItem>
                    <SelectItem value="IT">Italien</SelectItem>
                    <SelectItem value="NL">Niederlande</SelectItem>
                    <SelectItem value="BE">Belgien</SelectItem>
                    <SelectItem value="PL">Polen</SelectItem>
                    <SelectItem value="CZ">Tschechien</SelectItem>
                    <SelectItem value="CN">China</SelectItem>
                    <SelectItem value="US">USA</SelectItem>
                    <SelectItem value="IN">Indien</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Standort */}
            <div>
              <Label>Standort</Label>
              <Input
                value={formData.location || ''}
                onChange={e => updateForm('location', e.target.value)}
                placeholder="z.B. Produktionswerk Munchen"
              />
            </div>

            {/* Datum & Lieferant */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Datum</Label>
                <Input type="date" value={formData.date || ''} onChange={e => updateForm('date', e.target.value)} />
              </div>
              <div>
                <Label>Lieferant (optional)</Label>
                <Select
                  value={formData.supplier || 'none'}
                  onValueChange={v => updateForm('supplier', v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Lieferant auswahlen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Kein Lieferant --</SelectItem>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.country})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Beschreibung */}
            <div>
              <Label>Beschreibung</Label>
              <Input
                value={formData.description || ''}
                onChange={e => updateForm('description', e.target.value)}
                placeholder="Beschreiben Sie diesen Lieferketten-Schritt..."
              />
            </div>

            {/* Risiko & Verifiziert */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Risikostufe</Label>
                <Select
                  value={formData.risk_level || 'low'}
                  onValueChange={v => updateForm('risk_level', v as 'low' | 'medium' | 'high')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="verified"
                  checked={formData.verified || false}
                  onCheckedChange={v => updateForm('verified', v)}
                />
                <Label htmlFor="verified">Verifiziert</Label>
              </div>
            </div>

            {/* Koordinaten (optional) */}
            <div>
              <Label>Koordinaten (optional)</Label>
              <Input
                value={formData.coordinates || ''}
                onChange={e => updateForm('coordinates', e.target.value)}
                placeholder="z.B. 48.1351,11.5820"
              />
              <p className="text-xs text-muted-foreground mt-1">Format: Breitengrad,Langengrad</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
