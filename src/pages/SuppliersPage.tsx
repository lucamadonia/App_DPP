import { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Package,
  MapPin,
  Mail,
  Phone,
  Globe,
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
  Shield,
  Link2,
  ExternalLink,
  User,
  FileCheck,
  Smartphone,
  Linkedin,
  FileText,
  Star,
  Users,
  Factory,
  Truck,
  BadgeCheck,
  AlertCircle,
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
import { Separator } from '@/components/ui/separator';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierProducts,
  getProducts,
  assignProductToSupplier,
  removeProductFromSupplier,
  type ProductListItem,
} from '@/services/supabase';
import type { Supplier, SupplierProduct, SupplierContact } from '@/types/database';

// Verfugbare Zertifizierungen
const CERTIFICATIONS = [
  'ISO 9001', 'ISO 14001', 'ISO 45001', 'ISO 27001', 'ISO 50001',
  'BSCI', 'SA8000', 'GOTS', 'OEKO-TEX', 'FSC', 'PEFC',
  'REACH', 'RoHS', 'CE', 'IATF 16949', 'AS9100',
  'GMP', 'HACCP', 'BRC', 'IFS', 'Fairtrade',
];

// Lieferantentypen
const SUPPLIER_TYPES = [
  { value: 'manufacturer', label: 'Hersteller', icon: Factory },
  { value: 'wholesaler', label: 'Grosshandler', icon: Building2 },
  { value: 'distributor', label: 'Distributor', icon: Truck },
  { value: 'service_provider', label: 'Dienstleister', icon: Users },
];

// Rechtsformen
const LEGAL_FORMS = [
  'GmbH', 'AG', 'GmbH & Co. KG', 'KG', 'OHG', 'GbR', 'e.K.',
  'Ltd.', 'Inc.', 'Corp.', 'LLC', 'S.A.', 'S.r.l.', 'B.V.',
];

// Rollen fur Lieferanten-Produkt-Zuordnung
const SUPPLIER_ROLES: { value: SupplierProduct['role']; label: string }[] = [
  { value: 'manufacturer', label: 'Hersteller' },
  { value: 'component', label: 'Komponenten-Lieferant' },
  { value: 'raw_material', label: 'Rohstoff-Lieferant' },
  { value: 'packaging', label: 'Verpackung' },
  { value: 'logistics', label: 'Logistik' },
];

// Lander
const COUNTRIES = [
  { code: 'DE', name: 'Deutschland' },
  { code: 'AT', name: 'Osterreich' },
  { code: 'CH', name: 'Schweiz' },
  { code: 'FR', name: 'Frankreich' },
  { code: 'IT', name: 'Italien' },
  { code: 'NL', name: 'Niederlande' },
  { code: 'BE', name: 'Belgien' },
  { code: 'PL', name: 'Polen' },
  { code: 'CZ', name: 'Tschechien' },
  { code: 'ES', name: 'Spanien' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GB', name: 'Grossbritannien' },
  { code: 'US', name: 'USA' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'Indien' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'Sudkorea' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'TH', name: 'Thailand' },
];

export function SuppliersPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Daten-State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);

  // Dialog-State fur Lieferant
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>({});
  const [activeFormTab, setActiveFormTab] = useState('basic');

  // Ansprechpartner im Formular
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<SupplierContact | null>(null);
  const [contactForm, setContactForm] = useState<Partial<SupplierContact>>({});

  // Dialog-State fur Produkt-Zuordnung
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [productFormData, setProductFormData] = useState<Partial<SupplierProduct>>({});

  // Detail-Ansicht
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
  const [detailProducts, setDetailProducts] = useState<SupplierProduct[]>([]);
  const [activeDetailTab, setActiveDetailTab] = useState('overview');

  // Daten laden beim Mount
  useEffect(() => {
    loadData();
  }, []);

  // Daten laden
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [suppliersData, productsData] = await Promise.all([
        getSuppliers(),
        getProducts(),
      ]);
      setSuppliers(suppliersData);
      setProducts(productsData);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    }
    setIsLoading(false);
  };

  // Statistiken berechnen
  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter(s => s.status === 'active').length;
    const highRisk = suppliers.filter(s => s.risk_level === 'high').length;
    const verified = suppliers.filter(s => s.verified).length;
    const countries = new Set(suppliers.map(s => s.country)).size;
    const pendingApproval = suppliers.filter(s => s.status === 'pending_approval').length;

    return { total, active, highRisk, verified, countries, pendingApproval };
  }, [suppliers]);

  // Gefilterte Lieferanten
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const matchesSearch =
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (supplier.code?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (supplier.city?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (supplier.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        supplier.country.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
      const matchesRisk = riskFilter === 'all' || supplier.risk_level === riskFilter;
      const matchesType = typeFilter === 'all' || supplier.supplier_type === typeFilter;
      return matchesSearch && matchesStatus && matchesRisk && matchesType;
    });
  }, [suppliers, searchQuery, statusFilter, riskFilter, typeFilter]);

  // Leeres Lieferanten-Formular
  const getEmptySupplierForm = (): Partial<Supplier> => ({
    name: '',
    code: '',
    legal_form: 'GmbH',
    contact_person: '',
    contact_position: '',
    email: '',
    phone: '',
    mobile: '',
    fax: '',
    additional_contacts: [],
    website: '',
    linkedin: '',
    address: '',
    address_line2: '',
    city: '',
    state: '',
    country: 'DE',
    postal_code: '',
    shipping_address: '',
    shipping_city: '',
    shipping_country: '',
    shipping_postal_code: '',
    tax_id: '',
    vat_id: '',
    duns_number: '',
    registration_number: '',
    bank_name: '',
    iban: '',
    bic: '',
    payment_terms: '30 Tage netto',
    risk_level: 'low',
    quality_rating: undefined,
    delivery_rating: undefined,
    verified: false,
    certifications: [],
    compliance_status: 'pending',
    supplier_type: 'manufacturer',
    industry: '',
    product_categories: [],
    contract_start: '',
    contract_end: '',
    min_order_value: undefined,
    currency: 'EUR',
    notes: '',
    internal_notes: '',
    tags: [],
    status: 'active',
  });

  // Leeres Produkt-Zuordnungs-Formular
  const getEmptyProductForm = (): Partial<SupplierProduct> => ({
    product_id: '',
    role: 'component',
    is_primary: false,
    lead_time_days: undefined,
    notes: '',
  });

  // Leeres Kontakt-Formular
  const getEmptyContactForm = (): Partial<SupplierContact> => ({
    name: '',
    position: '',
    department: '',
    email: '',
    phone: '',
    mobile: '',
    is_primary: false,
    notes: '',
  });

  // Dialog offnen: Neuer Lieferant
  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingSupplier(null);
    setFormData(getEmptySupplierForm());
    setActiveFormTab('basic');
    setSupplierDialogOpen(true);
  };

  // Dialog offnen: Lieferant bearbeiten
  const openEditDialog = (supplier: Supplier) => {
    setDialogMode('edit');
    setEditingSupplier(supplier);
    setFormData({ ...supplier });
    setActiveFormTab('basic');
    setSupplierDialogOpen(true);
  };

  // Dialog offnen: Produkt zuordnen
  const openProductDialog = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setProductFormData(getEmptyProductForm());
    setIsLoading(true);
    try {
      const products = await getSupplierProducts(supplier.id);
      setSupplierProducts(products);
    } catch (error) {
      console.error('Fehler beim Laden der Produkte:', error);
    }
    setIsLoading(false);
    setProductDialogOpen(true);
  };

  // Detail-Ansicht offnen
  const openDetailView = async (supplier: Supplier) => {
    setDetailSupplier(supplier);
    setActiveDetailTab('overview');
    setIsLoading(true);
    try {
      const products = await getSupplierProducts(supplier.id);
      setDetailProducts(products);
    } catch (error) {
      console.error('Fehler:', error);
    }
    setIsLoading(false);
  };

  // Formular aktualisieren
  const updateForm = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateProductForm = (field: string, value: unknown) => {
    setProductFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateContactForm = (field: string, value: unknown) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
  };

  // Zertifizierung hinzufugen/entfernen
  const toggleCertification = (cert: string) => {
    const current = formData.certifications || [];
    if (current.includes(cert)) {
      updateForm('certifications', current.filter(c => c !== cert));
    } else {
      updateForm('certifications', [...current, cert]);
    }
  };

  // Ansprechpartner hinzufugen
  const handleAddContact = () => {
    setEditingContact(null);
    setContactForm(getEmptyContactForm());
    setContactFormOpen(true);
  };

  // Ansprechpartner bearbeiten
  const handleEditContact = (contact: SupplierContact, index: number) => {
    setEditingContact({ ...contact, id: String(index) });
    setContactForm({ ...contact });
    setContactFormOpen(true);
  };

  // Ansprechpartner speichern
  const handleSaveContact = () => {
    const contacts = formData.additional_contacts || [];
    if (editingContact?.id !== undefined) {
      const index = parseInt(editingContact.id);
      contacts[index] = contactForm as SupplierContact;
    } else {
      contacts.push(contactForm as SupplierContact);
    }
    updateForm('additional_contacts', [...contacts]);
    setContactFormOpen(false);
  };

  // Ansprechpartner loschen
  const handleDeleteContact = (index: number) => {
    const contacts = formData.additional_contacts || [];
    contacts.splice(index, 1);
    updateForm('additional_contacts', [...contacts]);
  };

  // Lieferant speichern
  const handleSaveSupplier = async () => {
    setIsLoading(true);
    try {
      if (dialogMode === 'create') {
        const result = await createSupplier(formData as Omit<Supplier, 'id' | 'tenant_id' | 'createdAt'>);
        if (!result.success) throw new Error('Erstellen fehlgeschlagen');
      } else if (editingSupplier) {
        const result = await updateSupplier(editingSupplier.id, formData);
        if (!result.success) throw new Error('Aktualisierung fehlgeschlagen');
      }
      await loadData();
      setSupplierDialogOpen(false);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern');
    }
    setIsLoading(false);
  };

  // Lieferant loschen
  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Lieferant wirklich loschen? Alle Produkt-Zuordnungen werden ebenfalls entfernt.')) return;
    setIsLoading(true);
    try {
      const result = await deleteSupplier(id);
      if (!result.success) throw new Error('Loschen fehlgeschlagen');
      await loadData();
      if (detailSupplier?.id === id) {
        setDetailSupplier(null);
      }
    } catch (error) {
      console.error('Fehler:', error);
      alert('Fehler beim Loschen');
    }
    setIsLoading(false);
  };

  // Produkt zuordnen
  const handleAssignProduct = async () => {
    if (!selectedSupplier || !productFormData.product_id) return;
    setIsLoading(true);
    try {
      const result = await assignProductToSupplier({
        supplier_id: selectedSupplier.id,
        product_id: productFormData.product_id,
        role: productFormData.role || 'component',
        is_primary: productFormData.is_primary || false,
        lead_time_days: productFormData.lead_time_days,
        notes: productFormData.notes,
      });
      if (!result.success) throw new Error('Zuordnung fehlgeschlagen');
      const products = await getSupplierProducts(selectedSupplier.id);
      setSupplierProducts(products);
      setProductFormData(getEmptyProductForm());
    } catch (error) {
      console.error('Fehler:', error);
      alert('Fehler bei der Zuordnung');
    }
    setIsLoading(false);
  };

  // Produkt-Zuordnung entfernen
  const handleRemoveProduct = async (id: string) => {
    if (!selectedSupplier) return;
    setIsLoading(true);
    try {
      const result = await removeProductFromSupplier(id);
      if (!result.success) throw new Error('Entfernen fehlgeschlagen');
      const products = await getSupplierProducts(selectedSupplier.id);
      setSupplierProducts(products);
    } catch (error) {
      console.error('Fehler:', error);
    }
    setIsLoading(false);
  };

  // Risiko-Badge Renderer
  const renderRiskBadge = (level: string) => {
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

  // Status-Badge Renderer
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aktiv</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inaktiv</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Gesperrt</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-800">Freigabe ausstehend</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Compliance-Badge Renderer
  const renderComplianceBadge = (status?: string) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-100 text-green-800"><BadgeCheck className="h-3 w-3 mr-1" />Konform</Badge>;
      case 'non_compliant':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Nicht konform</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Prufung ausstehend</Badge>;
    }
  };

  // Sterne-Rating Renderer
  const renderStars = (rating?: number) => {
    if (!rating) return <span className="text-muted-foreground">-</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={`h-3 w-3 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
          />
        ))}
      </div>
    );
  };

  // Produktname finden
  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Unbekannt';
  };

  // Landername finden
  const getCountryName = (code: string) => {
    return COUNTRIES.find(c => c.code === code)?.name || code;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lieferanten</h1>
          <p className="text-muted-foreground">
            Lieferanten verwalten, bewerten und Produkte zuordnen
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Neuer Lieferant
        </Button>
      </div>

      {/* Statistik-Karten */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Gesamt</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Aktiv</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.active}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Freigabe</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.pendingApproval}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Hohes Risiko</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-destructive">{stats.highRisk}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Verifiziert</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.verified}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Lander</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-purple-600">{stats.countries}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lieferanten-Liste */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg">Lieferanten-Liste</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Typen</SelectItem>
                    {SUPPLIER_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="inactive">Inaktiv</SelectItem>
                    <SelectItem value="blocked">Gesperrt</SelectItem>
                    <SelectItem value="pending_approval">Freigabe</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-[110px]">
                    <SelectValue placeholder="Risiko" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Suchen..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Button variant="outline" size="icon" onClick={loadData}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && suppliers.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {suppliers.length === 0 ? 'Noch keine Lieferanten vorhanden' : 'Keine Treffer'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lieferant</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Standort</TableHead>
                    <TableHead>Bewertung</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map(supplier => (
                    <TableRow
                      key={supplier.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openDetailView(supplier)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {SUPPLIER_TYPES.find(t => t.value === supplier.supplier_type)?.icon ? (
                              (() => {
                                const Icon = SUPPLIER_TYPES.find(t => t.value === supplier.supplier_type)!.icon;
                                return <Icon className="h-4 w-4 text-primary" />;
                              })()
                            ) : (
                              <Building2 className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-1">
                              {supplier.name}
                              {supplier.verified && <Shield className="h-3 w-3 text-blue-600" />}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {supplier.code && `${supplier.code} | `}
                              {supplier.legal_form}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.contact_person && (
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              {supplier.contact_person}
                            </div>
                            {supplier.email && (
                              <div className="text-xs text-muted-foreground">{supplier.email}</div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {supplier.city ? `${supplier.city}, ` : ''}{getCountryName(supplier.country)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {renderRiskBadge(supplier.risk_level)}
                          <div className="flex items-center gap-2 text-xs">
                            <span>Q:</span>{renderStars(supplier.quality_rating)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {renderStatusBadge(supplier.status)}
                          {renderComplianceBadge(supplier.compliance_status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => openProductDialog(supplier)} title="Produkte">
                            <Link2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(supplier)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteSupplier(supplier.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Detail-Ansicht */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {detailSupplier ? detailSupplier.name : 'Details'}
            </CardTitle>
            {detailSupplier && (
              <CardDescription>{detailSupplier.legal_form} | {detailSupplier.code || 'Kein Kurzel'}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!detailSupplier ? (
              <div className="text-center py-8 text-muted-foreground">
                Wahlen Sie einen Lieferanten aus der Liste
              </div>
            ) : (
              <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Ubersicht</TabsTrigger>
                  <TabsTrigger value="contacts">Kontakte</TabsTrigger>
                  <TabsTrigger value="products">Produkte</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* Status & Bewertung */}
                  <div className="flex flex-wrap gap-2">
                    {renderStatusBadge(detailSupplier.status)}
                    {renderRiskBadge(detailSupplier.risk_level)}
                    {detailSupplier.verified && (
                      <Badge className="bg-blue-100 text-blue-800">
                        <Shield className="h-3 w-3 mr-1" />Verifiziert
                      </Badge>
                    )}
                  </div>

                  {/* Bewertungen */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Qualitat:</span>
                      <div>{renderStars(detailSupplier.quality_rating)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lieferung:</span>
                      <div>{renderStars(detailSupplier.delivery_rating)}</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Adresse */}
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> Adresse
                    </h4>
                    <div className="text-sm text-muted-foreground">
                      {detailSupplier.address && <div>{detailSupplier.address}</div>}
                      {detailSupplier.address_line2 && <div>{detailSupplier.address_line2}</div>}
                      <div>{detailSupplier.postal_code} {detailSupplier.city}</div>
                      {detailSupplier.state && <div>{detailSupplier.state}</div>}
                      <div>{getCountryName(detailSupplier.country)}</div>
                    </div>
                  </div>

                  {/* Zertifizierungen */}
                  {detailSupplier.certifications && detailSupplier.certifications.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm flex items-center gap-1">
                          <FileCheck className="h-4 w-4" /> Zertifizierungen
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {detailSupplier.certifications.map(cert => (
                            <Badge key={cert} variant="outline" className="text-xs">{cert}</Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Vertrag */}
                  {(detailSupplier.contract_start || detailSupplier.contract_end) && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm flex items-center gap-1">
                          <FileText className="h-4 w-4" /> Vertrag
                        </h4>
                        <div className="text-sm text-muted-foreground">
                          {detailSupplier.contract_start && (
                            <div>Start: {new Date(detailSupplier.contract_start).toLocaleDateString('de-DE')}</div>
                          )}
                          {detailSupplier.contract_end && (
                            <div>Ende: {new Date(detailSupplier.contract_end).toLocaleDateString('de-DE')}</div>
                          )}
                          {detailSupplier.payment_terms && (
                            <div>Zahlungsziel: {detailSupplier.payment_terms}</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Notizen */}
                  {detailSupplier.notes && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm">Notizen</h4>
                        <p className="text-sm text-muted-foreground">{detailSupplier.notes}</p>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="contacts" className="space-y-4 mt-4">
                  {/* Hauptkontakt */}
                  {detailSupplier.contact_person && (
                    <div className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>Hauptkontakt</Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="font-medium">{detailSupplier.contact_person}</div>
                        {detailSupplier.contact_position && (
                          <div className="text-muted-foreground">{detailSupplier.contact_position}</div>
                        )}
                        {detailSupplier.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <a href={`mailto:${detailSupplier.email}`} className="text-primary hover:underline">
                              {detailSupplier.email}
                            </a>
                          </div>
                        )}
                        {detailSupplier.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <a href={`tel:${detailSupplier.phone}`} className="hover:underline">{detailSupplier.phone}</a>
                          </div>
                        )}
                        {detailSupplier.mobile && (
                          <div className="flex items-center gap-1">
                            <Smartphone className="h-3 w-3" />
                            <a href={`tel:${detailSupplier.mobile}`} className="hover:underline">{detailSupplier.mobile}</a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Weitere Kontakte */}
                  {detailSupplier.additional_contacts && detailSupplier.additional_contacts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Weitere Ansprechpartner</h4>
                      {detailSupplier.additional_contacts.map((contact, i) => (
                        <div key={i} className="p-2 rounded border text-sm">
                          <div className="font-medium">{contact.name}</div>
                          {contact.position && <div className="text-muted-foreground">{contact.position}</div>}
                          {contact.department && <div className="text-muted-foreground">{contact.department}</div>}
                          {contact.email && (
                            <div className="flex items-center gap-1 mt-1">
                              <Mail className="h-3 w-3" />
                              <a href={`mailto:${contact.email}`} className="text-primary hover:underline text-xs">
                                {contact.email}
                              </a>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span className="text-xs">{contact.phone}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Online */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Online</h4>
                    {detailSupplier.website && (
                      <div className="flex items-center gap-1 text-sm">
                        <Globe className="h-3 w-3" />
                        <a href={detailSupplier.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          Website <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {detailSupplier.linkedin && (
                      <div className="flex items-center gap-1 text-sm">
                        <Linkedin className="h-3 w-3" />
                        <a href={detailSupplier.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          LinkedIn <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="products" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{detailProducts.length} Produkte</span>
                    <Button variant="outline" size="sm" onClick={() => openProductDialog(detailSupplier)}>
                      <Plus className="h-3 w-3 mr-1" />Zuordnen
                    </Button>
                  </div>
                  {detailProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Keine Produkte zugeordnet</p>
                  ) : (
                    <div className="space-y-2">
                      {detailProducts.map(sp => (
                        <div key={sp.id} className="flex items-center justify-between p-2 rounded border bg-card">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">{getProductName(sp.product_id)}</div>
                              <div className="text-xs text-muted-foreground">
                                {SUPPLIER_ROLES.find(r => r.value === sp.role)?.label}
                                {sp.is_primary && <Badge variant="secondary" className="ml-1 text-xs">Haupt</Badge>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Lieferant erstellen/bearbeiten */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Neuer Lieferant' : 'Lieferant bearbeiten'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Stammdaten</TabsTrigger>
              <TabsTrigger value="contact">Kontakt</TabsTrigger>
              <TabsTrigger value="address">Adressen</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="finance">Finanzen</TabsTrigger>
            </TabsList>

            {/* Stammdaten */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label>Firmenname *</Label>
                  <Input value={formData.name || ''} onChange={e => updateForm('name', e.target.value)} placeholder="Firmenname" />
                </div>
                <div>
                  <Label>Kurzel</Label>
                  <Input value={formData.code || ''} onChange={e => updateForm('code', e.target.value)} placeholder="SUP001" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Rechtsform</Label>
                  <Select value={formData.legal_form || ''} onValueChange={v => updateForm('legal_form', v)}>
                    <SelectTrigger><SelectValue placeholder="Auswahlen" /></SelectTrigger>
                    <SelectContent>
                      {LEGAL_FORMS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Lieferantentyp</Label>
                  <Select value={formData.supplier_type || ''} onValueChange={v => updateForm('supplier_type', v)}>
                    <SelectTrigger><SelectValue placeholder="Auswahlen" /></SelectTrigger>
                    <SelectContent>
                      {SUPPLIER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Branche</Label>
                  <Input value={formData.industry || ''} onChange={e => updateForm('industry', e.target.value)} placeholder="z.B. Elektronik" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status || 'active'} onValueChange={v => updateForm('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktiv</SelectItem>
                      <SelectItem value="inactive">Inaktiv</SelectItem>
                      <SelectItem value="blocked">Gesperrt</SelectItem>
                      <SelectItem value="pending_approval">Freigabe ausstehend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Risikostufe</Label>
                  <Select value={formData.risk_level || 'low'} onValueChange={v => updateForm('risk_level', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Niedrig</SelectItem>
                      <SelectItem value="medium">Mittel</SelectItem>
                      <SelectItem value="high">Hoch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox id="verified" checked={formData.verified || false} onCheckedChange={v => updateForm('verified', v)} />
                  <Label htmlFor="verified">Verifiziert</Label>
                </div>
              </div>

              <div>
                <Label>Notizen</Label>
                <Input value={formData.notes || ''} onChange={e => updateForm('notes', e.target.value)} placeholder="Offentliche Notizen..." />
              </div>

              <div>
                <Label>Interne Notizen</Label>
                <Input value={formData.internal_notes || ''} onChange={e => updateForm('internal_notes', e.target.value)} placeholder="Nur intern sichtbar..." />
              </div>
            </TabsContent>

            {/* Kontakt */}
            <TabsContent value="contact" className="space-y-4 mt-4">
              <h3 className="font-medium">Hauptkontakt</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input value={formData.contact_person || ''} onChange={e => updateForm('contact_person', e.target.value)} placeholder="Max Mustermann" />
                </div>
                <div>
                  <Label>Position</Label>
                  <Input value={formData.contact_position || ''} onChange={e => updateForm('contact_position', e.target.value)} placeholder="Vertriebsleiter" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>E-Mail</Label>
                  <Input type="email" value={formData.email || ''} onChange={e => updateForm('email', e.target.value)} placeholder="kontakt@firma.de" />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input value={formData.phone || ''} onChange={e => updateForm('phone', e.target.value)} placeholder="+49 123 456789" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mobil</Label>
                  <Input value={formData.mobile || ''} onChange={e => updateForm('mobile', e.target.value)} placeholder="+49 170 1234567" />
                </div>
                <div>
                  <Label>Fax</Label>
                  <Input value={formData.fax || ''} onChange={e => updateForm('fax', e.target.value)} placeholder="+49 123 456789-0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Website</Label>
                  <Input value={formData.website || ''} onChange={e => updateForm('website', e.target.value)} placeholder="https://www.firma.de" />
                </div>
                <div>
                  <Label>LinkedIn</Label>
                  <Input value={formData.linkedin || ''} onChange={e => updateForm('linkedin', e.target.value)} placeholder="https://linkedin.com/company/..." />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <h3 className="font-medium">Weitere Ansprechpartner</h3>
                <Button variant="outline" size="sm" onClick={handleAddContact}>
                  <Plus className="h-4 w-4 mr-1" />Hinzufugen
                </Button>
              </div>

              {(formData.additional_contacts || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine weiteren Ansprechpartner</p>
              ) : (
                <div className="space-y-2">
                  {(formData.additional_contacts || []).map((contact, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded border">
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {contact.position}{contact.department && ` | ${contact.department}`}
                        </div>
                        <div className="text-xs text-muted-foreground">{contact.email} | {contact.phone}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditContact(contact, i)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteContact(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Adressen */}
            <TabsContent value="address" className="space-y-4 mt-4">
              <h3 className="font-medium">Firmenadresse</h3>
              <div>
                <Label>Strasse</Label>
                <Input value={formData.address || ''} onChange={e => updateForm('address', e.target.value)} placeholder="Musterstrasse 123" />
              </div>
              <div>
                <Label>Adresszusatz</Label>
                <Input value={formData.address_line2 || ''} onChange={e => updateForm('address_line2', e.target.value)} placeholder="Gebaude B, 3. Stock" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>PLZ</Label>
                  <Input value={formData.postal_code || ''} onChange={e => updateForm('postal_code', e.target.value)} placeholder="12345" />
                </div>
                <div className="col-span-2">
                  <Label>Stadt</Label>
                  <Input value={formData.city || ''} onChange={e => updateForm('city', e.target.value)} placeholder="Berlin" />
                </div>
                <div>
                  <Label>Bundesland</Label>
                  <Input value={formData.state || ''} onChange={e => updateForm('state', e.target.value)} placeholder="Berlin" />
                </div>
              </div>
              <div>
                <Label>Land</Label>
                <Select value={formData.country || 'DE'} onValueChange={v => updateForm('country', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <h3 className="font-medium">Lieferadresse (falls abweichend)</h3>
              <div>
                <Label>Strasse</Label>
                <Input value={formData.shipping_address || ''} onChange={e => updateForm('shipping_address', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>PLZ</Label>
                  <Input value={formData.shipping_postal_code || ''} onChange={e => updateForm('shipping_postal_code', e.target.value)} />
                </div>
                <div>
                  <Label>Stadt</Label>
                  <Input value={formData.shipping_city || ''} onChange={e => updateForm('shipping_city', e.target.value)} />
                </div>
                <div>
                  <Label>Land</Label>
                  <Select value={formData.shipping_country || ''} onValueChange={v => updateForm('shipping_country', v)}>
                    <SelectTrigger><SelectValue placeholder="Auswahlen" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Compliance */}
            <TabsContent value="compliance" className="space-y-4 mt-4">
              <h3 className="font-medium">Rechtliche Informationen</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Steuernummer</Label>
                  <Input value={formData.tax_id || ''} onChange={e => updateForm('tax_id', e.target.value)} placeholder="123/456/78901" />
                </div>
                <div>
                  <Label>USt-IdNr</Label>
                  <Input value={formData.vat_id || ''} onChange={e => updateForm('vat_id', e.target.value)} placeholder="DE123456789" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>D-U-N-S Nummer</Label>
                  <Input value={formData.duns_number || ''} onChange={e => updateForm('duns_number', e.target.value)} placeholder="12-345-6789" />
                </div>
                <div>
                  <Label>Handelsregisternr.</Label>
                  <Input value={formData.registration_number || ''} onChange={e => updateForm('registration_number', e.target.value)} placeholder="HRB 12345" />
                </div>
              </div>

              <Separator />

              <h3 className="font-medium">Compliance & Audits</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Compliance-Status</Label>
                  <Select value={formData.compliance_status || 'pending'} onValueChange={v => updateForm('compliance_status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compliant">Konform</SelectItem>
                      <SelectItem value="pending">Prufung ausstehend</SelectItem>
                      <SelectItem value="non_compliant">Nicht konform</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Letztes Audit</Label>
                  <Input type="date" value={formData.audit_date || ''} onChange={e => updateForm('audit_date', e.target.value)} />
                </div>
                <div>
                  <Label>Nachstes Audit</Label>
                  <Input type="date" value={formData.next_audit_date || ''} onChange={e => updateForm('next_audit_date', e.target.value)} />
                </div>
              </div>

              <Separator />

              <h3 className="font-medium">Zertifizierungen</h3>
              <div className="flex flex-wrap gap-2">
                {CERTIFICATIONS.map(cert => (
                  <Badge
                    key={cert}
                    variant={formData.certifications?.includes(cert) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleCertification(cert)}
                  >
                    {formData.certifications?.includes(cert) && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {cert}
                  </Badge>
                ))}
              </div>

              <Separator />

              <h3 className="font-medium">Bewertungen</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Qualitat (1-5)</Label>
                  <Select value={String(formData.quality_rating || '')} onValueChange={v => updateForm('quality_rating', v ? parseInt(v) : undefined)}>
                    <SelectTrigger><SelectValue placeholder="Bewerten" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Keine Bewertung</SelectItem>
                      {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} Sterne</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Liefertreue (1-5)</Label>
                  <Select value={String(formData.delivery_rating || '')} onValueChange={v => updateForm('delivery_rating', v ? parseInt(v) : undefined)}>
                    <SelectTrigger><SelectValue placeholder="Bewerten" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Keine Bewertung</SelectItem>
                      {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} Sterne</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Finanzen */}
            <TabsContent value="finance" className="space-y-4 mt-4">
              <h3 className="font-medium">Vertragsdaten</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vertragsbeginn</Label>
                  <Input type="date" value={formData.contract_start || ''} onChange={e => updateForm('contract_start', e.target.value)} />
                </div>
                <div>
                  <Label>Vertragsende</Label>
                  <Input type="date" value={formData.contract_end || ''} onChange={e => updateForm('contract_end', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Mindestbestellwert</Label>
                  <Input type="number" value={formData.min_order_value || ''} onChange={e => updateForm('min_order_value', parseFloat(e.target.value) || undefined)} placeholder="0.00" />
                </div>
                <div>
                  <Label>Wahrung</Label>
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
                <div>
                  <Label>Zahlungsziel</Label>
                  <Input value={formData.payment_terms || ''} onChange={e => updateForm('payment_terms', e.target.value)} placeholder="30 Tage netto" />
                </div>
              </div>

              <Separator />

              <h3 className="font-medium">Bankverbindung</h3>
              <div>
                <Label>Bank</Label>
                <Input value={formData.bank_name || ''} onChange={e => updateForm('bank_name', e.target.value)} placeholder="Deutsche Bank" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>IBAN</Label>
                  <Input value={formData.iban || ''} onChange={e => updateForm('iban', e.target.value)} placeholder="DE89 3704 0044 0532 0130 00" />
                </div>
                <div>
                  <Label>BIC</Label>
                  <Input value={formData.bic || ''} onChange={e => updateForm('bic', e.target.value)} placeholder="COBADEFFXXX" />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" />Abbrechen
            </Button>
            <Button onClick={handleSaveSupplier} disabled={isLoading || !formData.name}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ansprechpartner hinzufugen/bearbeiten */}
      <Dialog open={contactFormOpen} onOpenChange={setContactFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Ansprechpartner bearbeiten' : 'Neuer Ansprechpartner'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input value={contactForm.name || ''} onChange={e => updateContactForm('name', e.target.value)} placeholder="Max Mustermann" />
              </div>
              <div>
                <Label>Position</Label>
                <Input value={contactForm.position || ''} onChange={e => updateContactForm('position', e.target.value)} placeholder="Einkaufsleiter" />
              </div>
            </div>
            <div>
              <Label>Abteilung</Label>
              <Input value={contactForm.department || ''} onChange={e => updateContactForm('department', e.target.value)} placeholder="Einkauf" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>E-Mail</Label>
                <Input type="email" value={contactForm.email || ''} onChange={e => updateContactForm('email', e.target.value)} />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input value={contactForm.phone || ''} onChange={e => updateContactForm('phone', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Mobil</Label>
              <Input value={contactForm.mobile || ''} onChange={e => updateContactForm('mobile', e.target.value)} />
            </div>
            <div>
              <Label>Notizen</Label>
              <Input value={contactForm.notes || ''} onChange={e => updateContactForm('notes', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactFormOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSaveContact} disabled={!contactForm.name}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Produkte zuordnen */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Produkte zuordnen</DialogTitle>
            <DialogDescription>Lieferant: {selectedSupplier?.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Neues Produkt zuordnen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Produkt</Label>
                  <Select value={productFormData.product_id || ''} onValueChange={v => updateProductForm('product_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Produkt auswahlen" /></SelectTrigger>
                    <SelectContent>
                      {products.filter(p => !supplierProducts.some(sp => sp.product_id === p.id)).map(product => (
                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Rolle</Label>
                    <Select value={productFormData.role || 'component'} onValueChange={v => updateProductForm('role', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUPPLIER_ROLES.map(role => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lieferzeit (Tage)</Label>
                    <Input type="number" value={productFormData.lead_time_days || ''} onChange={e => updateProductForm('lead_time_days', parseInt(e.target.value) || undefined)} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="is_primary" checked={productFormData.is_primary || false} onCheckedChange={v => updateProductForm('is_primary', v)} />
                  <Label htmlFor="is_primary">Hauptlieferant</Label>
                </div>
                <Button onClick={handleAssignProduct} disabled={!productFormData.product_id || isLoading} className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Zuordnen
                </Button>
              </CardContent>
            </Card>

            <div>
              <h4 className="font-medium text-sm mb-2">Zugeordnete Produkte ({supplierProducts.length})</h4>
              {supplierProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Noch keine Produkte zugeordnet</p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {supplierProducts.map(sp => (
                    <div key={sp.id} className="flex items-center justify-between p-2 rounded border bg-card">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{getProductName(sp.product_id)}</div>
                          <div className="text-xs text-muted-foreground">
                            {SUPPLIER_ROLES.find(r => r.value === sp.role)?.label}
                            {sp.is_primary && <Badge variant="secondary" className="ml-2 text-xs">Haupt</Badge>}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveProduct(sp.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>Schliessen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
