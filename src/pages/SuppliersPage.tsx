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
  getCountries,
  type ProductListItem,
} from '@/services/supabase';
import type { Country } from '@/types/database';
import type { Supplier, SupplierProduct, SupplierContact } from '@/types/database';

// Available certifications
const CERTIFICATIONS = [
  'ISO 9001', 'ISO 14001', 'ISO 45001', 'ISO 27001', 'ISO 50001',
  'BSCI', 'SA8000', 'GOTS', 'OEKO-TEX', 'FSC', 'PEFC',
  'REACH', 'RoHS', 'CE', 'IATF 16949', 'AS9100',
  'GMP', 'HACCP', 'BRC', 'IFS', 'Fairtrade',
];

// Supplier types
const SUPPLIER_TYPES = [
  { value: 'manufacturer', label: 'Manufacturer', icon: Factory },
  { value: 'wholesaler', label: 'Wholesaler', icon: Building2 },
  { value: 'distributor', label: 'Distributor', icon: Truck },
  { value: 'service_provider', label: 'Service Provider', icon: Users },
];

// Legal forms
const LEGAL_FORMS = [
  'GmbH', 'AG', 'GmbH & Co. KG', 'KG', 'OHG', 'GbR', 'e.K.',
  'Ltd.', 'Inc.', 'Corp.', 'LLC', 'S.A.', 'S.r.l.', 'B.V.',
];

// Roles for supplier-product assignment
const SUPPLIER_ROLES: { value: SupplierProduct['role']; label: string }[] = [
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'importeur', label: 'Importer' },
  { value: 'component', label: 'Component Supplier' },
  { value: 'raw_material', label: 'Raw Material Supplier' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'logistics', label: 'Logistics' },
];


export function SuppliersPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Data state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);

  // Dialog state for supplier
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>({});
  const [activeFormTab, setActiveFormTab] = useState('basic');

  // Contact person in form
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<SupplierContact | null>(null);
  const [contactForm, setContactForm] = useState<Partial<SupplierContact>>({});

  // Dialog state for product assignment
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [productFormData, setProductFormData] = useState<Partial<SupplierProduct>>({});

  // Detail view
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
  const [detailProducts, setDetailProducts] = useState<SupplierProduct[]>([]);
  const [activeDetailTab, setActiveDetailTab] = useState('overview');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [suppliersData, productsData, countriesData] = await Promise.all([
        getSuppliers(),
        getProducts(),
        getCountries(),
      ]);
      setSuppliers(suppliersData);
      setProducts(productsData);
      setCountries(countriesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter(s => s.status === 'active').length;
    const highRisk = suppliers.filter(s => s.risk_level === 'high').length;
    const verified = suppliers.filter(s => s.verified).length;
    const countries = new Set(suppliers.map(s => s.country)).size;
    const pendingApproval = suppliers.filter(s => s.status === 'pending_approval').length;

    return { total, active, highRisk, verified, countries, pendingApproval };
  }, [suppliers]);

  // Filtered suppliers
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

  // Empty supplier form
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
    payment_terms: 'Net 30',
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

  // Empty product assignment form
  const getEmptyProductForm = (): Partial<SupplierProduct> => ({
    product_id: '',
    role: 'component',
    is_primary: false,
    lead_time_days: undefined,
    notes: '',
  });

  // Empty contact form
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

  // Open dialog: New supplier
  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingSupplier(null);
    setFormData(getEmptySupplierForm());
    setActiveFormTab('basic');
    setSupplierDialogOpen(true);
  };

  // Open dialog: Edit supplier
  const openEditDialog = (supplier: Supplier) => {
    setDialogMode('edit');
    setEditingSupplier(supplier);
    setFormData({ ...supplier });
    setActiveFormTab('basic');
    setSupplierDialogOpen(true);
  };

  // Open dialog: Assign product
  const openProductDialog = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setProductFormData(getEmptyProductForm());
    setIsLoading(true);
    try {
      const products = await getSupplierProducts(supplier.id);
      setSupplierProducts(products);
    } catch (error) {
      console.error('Error loading products:', error);
    }
    setIsLoading(false);
    setProductDialogOpen(true);
  };

  // Open detail view
  const openDetailView = async (supplier: Supplier) => {
    setDetailSupplier(supplier);
    setActiveDetailTab('overview');
    setIsLoading(true);
    try {
      const products = await getSupplierProducts(supplier.id);
      setDetailProducts(products);
    } catch (error) {
      console.error('Error:', error);
    }
    setIsLoading(false);
  };

  // Update form
  const updateForm = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateProductForm = (field: string, value: unknown) => {
    setProductFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateContactForm = (field: string, value: unknown) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
  };

  // Toggle certification
  const toggleCertification = (cert: string) => {
    const current = formData.certifications || [];
    if (current.includes(cert)) {
      updateForm('certifications', current.filter(c => c !== cert));
    } else {
      updateForm('certifications', [...current, cert]);
    }
  };

  // Add contact person
  const handleAddContact = () => {
    setEditingContact(null);
    setContactForm(getEmptyContactForm());
    setContactFormOpen(true);
  };

  // Edit contact person
  const handleEditContact = (contact: SupplierContact, index: number) => {
    setEditingContact({ ...contact, id: String(index) });
    setContactForm({ ...contact });
    setContactFormOpen(true);
  };

  // Save contact person
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

  // Delete contact person
  const handleDeleteContact = (index: number) => {
    const contacts = formData.additional_contacts || [];
    contacts.splice(index, 1);
    updateForm('additional_contacts', [...contacts]);
  };

  // Save supplier
  const handleSaveSupplier = async () => {
    setIsLoading(true);
    try {
      if (dialogMode === 'create') {
        const result = await createSupplier(formData as Omit<Supplier, 'id' | 'tenant_id' | 'createdAt'>);
        if (!result.success) throw new Error('Creation failed');
      } else if (editingSupplier) {
        const result = await updateSupplier(editingSupplier.id, formData);
        if (!result.success) throw new Error('Update failed');
      }
      await loadData();
      setSupplierDialogOpen(false);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving');
    }
    setIsLoading(false);
  };

  // Delete supplier
  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Really delete this supplier? All product assignments will also be removed.')) return;
    setIsLoading(true);
    try {
      const result = await deleteSupplier(id);
      if (!result.success) throw new Error('Deletion failed');
      await loadData();
      if (detailSupplier?.id === id) {
        setDetailSupplier(null);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting');
    }
    setIsLoading(false);
  };

  // Assign product
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
      if (!result.success) throw new Error('Assignment failed');
      const products = await getSupplierProducts(selectedSupplier.id);
      setSupplierProducts(products);
      setProductFormData(getEmptyProductForm());
    } catch (error) {
      console.error('Error:', error);
      alert('Error assigning product');
    }
    setIsLoading(false);
  };

  // Remove product assignment
  const handleRemoveProduct = async (id: string) => {
    if (!selectedSupplier) return;
    setIsLoading(true);
    try {
      const result = await removeProductFromSupplier(id);
      if (!result.success) throw new Error('Removal failed');
      const products = await getSupplierProducts(selectedSupplier.id);
      setSupplierProducts(products);
    } catch (error) {
      console.error('Error:', error);
    }
    setIsLoading(false);
  };

  // Risk badge renderer
  const renderRiskBadge = (level: string) => {
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

  // Status badge renderer
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Compliance badge renderer
  const renderComplianceBadge = (status?: string) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-100 text-green-800"><BadgeCheck className="h-3 w-3 mr-1" />Compliant</Badge>;
      case 'non_compliant':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Non-Compliant</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Review Pending</Badge>;
    }
  };

  // Star rating renderer
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

  // Find product name
  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Unknown';
  };

  // Find country name
  const getCountryName = (code: string) => {
    return countries.find(c => c.code === code)?.name || code;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
          <p className="text-muted-foreground">
            Manage suppliers, rate them, and assign products
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          New Supplier
        </Button>
      </div>

      {/* Statistics cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Active</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.active}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Approval</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.pendingApproval}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">High Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-destructive">{stats.highRisk}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Verified</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.verified}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Countries</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-purple-600">{stats.countries}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Supplier list */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg">Supplier List</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
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
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="pending_approval">Approval</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-[110px]">
                    <SelectValue placeholder="Risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
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
                {suppliers.length === 0 ? 'No suppliers yet' : 'No results'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
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
                          <Button variant="ghost" size="icon" onClick={() => openProductDialog(supplier)} title="Products">
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

        {/* Detail view */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {detailSupplier ? detailSupplier.name : 'Details'}
            </CardTitle>
            {detailSupplier && (
              <CardDescription>{detailSupplier.legal_form} | {detailSupplier.code || 'No code'}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!detailSupplier ? (
              <div className="text-center py-8 text-muted-foreground">
                Select a supplier from the list
              </div>
            ) : (
              <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="contacts">Contacts</TabsTrigger>
                  <TabsTrigger value="products">Products</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* Status & Rating */}
                  <div className="flex flex-wrap gap-2">
                    {renderStatusBadge(detailSupplier.status)}
                    {renderRiskBadge(detailSupplier.risk_level)}
                    {detailSupplier.verified && (
                      <Badge className="bg-blue-100 text-blue-800">
                        <Shield className="h-3 w-3 mr-1" />Verified
                      </Badge>
                    )}
                  </div>

                  {/* Ratings */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quality:</span>
                      <div>{renderStars(detailSupplier.quality_rating)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Delivery:</span>
                      <div>{renderStars(detailSupplier.delivery_rating)}</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Address */}
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> Address
                    </h4>
                    <div className="text-sm text-muted-foreground">
                      {detailSupplier.address && <div>{detailSupplier.address}</div>}
                      {detailSupplier.address_line2 && <div>{detailSupplier.address_line2}</div>}
                      <div>{detailSupplier.postal_code} {detailSupplier.city}</div>
                      {detailSupplier.state && <div>{detailSupplier.state}</div>}
                      <div>{getCountryName(detailSupplier.country)}</div>
                    </div>
                  </div>

                  {/* Certifications */}
                  {detailSupplier.certifications && detailSupplier.certifications.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm flex items-center gap-1">
                          <FileCheck className="h-4 w-4" /> Certifications
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {detailSupplier.certifications.map(cert => (
                            <Badge key={cert} variant="outline" className="text-xs">{cert}</Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Contract */}
                  {(detailSupplier.contract_start || detailSupplier.contract_end) && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm flex items-center gap-1">
                          <FileText className="h-4 w-4" /> Contract
                        </h4>
                        <div className="text-sm text-muted-foreground">
                          {detailSupplier.contract_start && (
                            <div>Start: {new Date(detailSupplier.contract_start).toLocaleDateString('en-US')}</div>
                          )}
                          {detailSupplier.contract_end && (
                            <div>End: {new Date(detailSupplier.contract_end).toLocaleDateString('en-US')}</div>
                          )}
                          {detailSupplier.payment_terms && (
                            <div>Payment Terms: {detailSupplier.payment_terms}</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Notes */}
                  {detailSupplier.notes && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm">Notes</h4>
                        <p className="text-sm text-muted-foreground">{detailSupplier.notes}</p>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="contacts" className="space-y-4 mt-4">
                  {/* Primary contact */}
                  {detailSupplier.contact_person && (
                    <div className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>Primary Contact</Badge>
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

                  {/* Additional contacts */}
                  {detailSupplier.additional_contacts && detailSupplier.additional_contacts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Additional Contacts</h4>
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
                    <span className="text-sm text-muted-foreground">{detailProducts.length} Products</span>
                    <Button variant="outline" size="sm" onClick={() => openProductDialog(detailSupplier)}>
                      <Plus className="h-3 w-3 mr-1" />Assign
                    </Button>
                  </div>
                  {detailProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No products assigned</p>
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
                                {sp.is_primary && <Badge variant="secondary" className="ml-1 text-xs">Primary</Badge>}
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

      {/* Dialog: Create/edit supplier */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'New Supplier' : 'Edit Supplier'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
            <TabsList className="flex w-full overflow-x-auto">
              <TabsTrigger value="basic" className="flex-shrink-0">General</TabsTrigger>
              <TabsTrigger value="contact" className="flex-shrink-0">Contact</TabsTrigger>
              <TabsTrigger value="address" className="flex-shrink-0">Addresses</TabsTrigger>
              <TabsTrigger value="compliance" className="flex-shrink-0">Compliance</TabsTrigger>
              <TabsTrigger value="finance" className="flex-shrink-0">Finance</TabsTrigger>
            </TabsList>

            {/* General */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Label>Company Name *</Label>
                  <Input value={formData.name || ''} onChange={e => updateForm('name', e.target.value)} placeholder="Company Name" />
                </div>
                <div>
                  <Label>Code</Label>
                  <Input value={formData.code || ''} onChange={e => updateForm('code', e.target.value)} placeholder="SUP001" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Legal Form</Label>
                  <Select value={formData.legal_form || ''} onValueChange={v => updateForm('legal_form', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {LEGAL_FORMS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Supplier Type</Label>
                  <Select value={formData.supplier_type || ''} onValueChange={v => updateForm('supplier_type', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {SUPPLIER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Industry</Label>
                  <Input value={formData.industry || ''} onChange={e => updateForm('industry', e.target.value)} placeholder="e.g. Electronics" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status || 'active'} onValueChange={v => updateForm('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Risk Level</Label>
                  <Select value={formData.risk_level || 'low'} onValueChange={v => updateForm('risk_level', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox id="verified" checked={formData.verified || false} onCheckedChange={v => updateForm('verified', v)} />
                  <Label htmlFor="verified">Verified</Label>
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Input value={formData.notes || ''} onChange={e => updateForm('notes', e.target.value)} placeholder="Public notes..." />
              </div>

              <div>
                <Label>Internal Notes</Label>
                <Input value={formData.internal_notes || ''} onChange={e => updateForm('internal_notes', e.target.value)} placeholder="Internal use only..." />
              </div>
            </TabsContent>

            {/* Contact */}
            <TabsContent value="contact" className="space-y-4 mt-4">
              <h3 className="font-medium">Primary Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input value={formData.contact_person || ''} onChange={e => updateForm('contact_person', e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <Label>Position</Label>
                  <Input value={formData.contact_position || ''} onChange={e => updateForm('contact_position', e.target.value)} placeholder="Sales Manager" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email || ''} onChange={e => updateForm('email', e.target.value)} placeholder="contact@company.com" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.phone || ''} onChange={e => updateForm('phone', e.target.value)} placeholder="+1 234 567890" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Mobile</Label>
                  <Input value={formData.mobile || ''} onChange={e => updateForm('mobile', e.target.value)} placeholder="+1 234 567890" />
                </div>
                <div>
                  <Label>Fax</Label>
                  <Input value={formData.fax || ''} onChange={e => updateForm('fax', e.target.value)} placeholder="+1 234 567890" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Website</Label>
                  <Input value={formData.website || ''} onChange={e => updateForm('website', e.target.value)} placeholder="https://www.company.com" />
                </div>
                <div>
                  <Label>LinkedIn</Label>
                  <Input value={formData.linkedin || ''} onChange={e => updateForm('linkedin', e.target.value)} placeholder="https://linkedin.com/company/..." />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <h3 className="font-medium">Additional Contacts</h3>
                <Button variant="outline" size="sm" onClick={handleAddContact}>
                  <Plus className="h-4 w-4 mr-1" />Add
                </Button>
              </div>

              {(formData.additional_contacts || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No additional contacts</p>
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

            {/* Addresses */}
            <TabsContent value="address" className="space-y-4 mt-4">
              <h3 className="font-medium">Company Address</h3>
              <div>
                <Label>Street</Label>
                <Input value={formData.address || ''} onChange={e => updateForm('address', e.target.value)} placeholder="123 Main Street" />
              </div>
              <div>
                <Label>Address Line 2</Label>
                <Input value={formData.address_line2 || ''} onChange={e => updateForm('address_line2', e.target.value)} placeholder="Building B, 3rd Floor" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label>ZIP/Postal Code</Label>
                  <Input value={formData.postal_code || ''} onChange={e => updateForm('postal_code', e.target.value)} placeholder="12345" />
                </div>
                <div className="col-span-2">
                  <Label>City</Label>
                  <Input value={formData.city || ''} onChange={e => updateForm('city', e.target.value)} placeholder="Berlin" />
                </div>
                <div>
                  <Label>State/Province</Label>
                  <Input value={formData.state || ''} onChange={e => updateForm('state', e.target.value)} placeholder="Berlin" />
                </div>
              </div>
              <div>
                <Label>Country</Label>
                <Select value={formData.country || 'DE'} onValueChange={v => updateForm('country', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <h3 className="font-medium">Shipping Address (if different)</h3>
              <div>
                <Label>Street</Label>
                <Input value={formData.shipping_address || ''} onChange={e => updateForm('shipping_address', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>ZIP/Postal Code</Label>
                  <Input value={formData.shipping_postal_code || ''} onChange={e => updateForm('shipping_postal_code', e.target.value)} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={formData.shipping_city || ''} onChange={e => updateForm('shipping_city', e.target.value)} />
                </div>
                <div>
                  <Label>Country</Label>
                  <Select value={formData.shipping_country || ''} onValueChange={v => updateForm('shipping_country', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Compliance */}
            <TabsContent value="compliance" className="space-y-4 mt-4">
              <h3 className="font-medium">Legal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Tax ID</Label>
                  <Input value={formData.tax_id || ''} onChange={e => updateForm('tax_id', e.target.value)} placeholder="123/456/78901" />
                </div>
                <div>
                  <Label>VAT ID</Label>
                  <Input value={formData.vat_id || ''} onChange={e => updateForm('vat_id', e.target.value)} placeholder="DE123456789" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>D-U-N-S Number</Label>
                  <Input value={formData.duns_number || ''} onChange={e => updateForm('duns_number', e.target.value)} placeholder="12-345-6789" />
                </div>
                <div>
                  <Label>Registration No.</Label>
                  <Input value={formData.registration_number || ''} onChange={e => updateForm('registration_number', e.target.value)} placeholder="HRB 12345" />
                </div>
              </div>

              <Separator />

              <h3 className="font-medium">Compliance & Audits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Compliance Status</Label>
                  <Select value={formData.compliance_status || 'pending'} onValueChange={v => updateForm('compliance_status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compliant">Compliant</SelectItem>
                      <SelectItem value="pending">Review Pending</SelectItem>
                      <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Last Audit</Label>
                  <Input type="date" value={formData.audit_date || ''} onChange={e => updateForm('audit_date', e.target.value)} />
                </div>
                <div>
                  <Label>Next Audit</Label>
                  <Input type="date" value={formData.next_audit_date || ''} onChange={e => updateForm('next_audit_date', e.target.value)} />
                </div>
              </div>

              <Separator />

              <h3 className="font-medium">Certifications</h3>
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

              <h3 className="font-medium">Ratings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Quality (1-5)</Label>
                  <Select value={String(formData.quality_rating || '')} onValueChange={v => updateForm('quality_rating', v ? parseInt(v) : undefined)}>
                    <SelectTrigger><SelectValue placeholder="Rate" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Rating</SelectItem>
                      {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} Stars</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Delivery Reliability (1-5)</Label>
                  <Select value={String(formData.delivery_rating || '')} onValueChange={v => updateForm('delivery_rating', v ? parseInt(v) : undefined)}>
                    <SelectTrigger><SelectValue placeholder="Rate" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Rating</SelectItem>
                      {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} Stars</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Finance */}
            <TabsContent value="finance" className="space-y-4 mt-4">
              <h3 className="font-medium">Contract Data</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Contract Start</Label>
                  <Input type="date" value={formData.contract_start || ''} onChange={e => updateForm('contract_start', e.target.value)} />
                </div>
                <div>
                  <Label>Contract End</Label>
                  <Input type="date" value={formData.contract_end || ''} onChange={e => updateForm('contract_end', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Minimum Order Value</Label>
                  <Input type="number" value={formData.min_order_value || ''} onChange={e => updateForm('min_order_value', parseFloat(e.target.value) || undefined)} placeholder="0.00" />
                </div>
                <div>
                  <Label>Currency</Label>
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
                  <Label>Payment Terms</Label>
                  <Input value={formData.payment_terms || ''} onChange={e => updateForm('payment_terms', e.target.value)} placeholder="Net 30" />
                </div>
              </div>

              <Separator />

              <h3 className="font-medium">Bank Details</h3>
              <div>
                <Label>Bank</Label>
                <Input value={formData.bank_name || ''} onChange={e => updateForm('bank_name', e.target.value)} placeholder="Deutsche Bank" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <X className="mr-2 h-4 w-4" />Cancel
            </Button>
            <Button onClick={handleSaveSupplier} disabled={isLoading || !formData.name}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add/edit contact person */}
      <Dialog open={contactFormOpen} onOpenChange={setContactFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Edit Contact' : 'New Contact'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input value={contactForm.name || ''} onChange={e => updateContactForm('name', e.target.value)} placeholder="John Doe" />
              </div>
              <div>
                <Label>Position</Label>
                <Input value={contactForm.position || ''} onChange={e => updateContactForm('position', e.target.value)} placeholder="Purchasing Manager" />
              </div>
            </div>
            <div>
              <Label>Department</Label>
              <Input value={contactForm.department || ''} onChange={e => updateContactForm('department', e.target.value)} placeholder="Purchasing" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={contactForm.email || ''} onChange={e => updateContactForm('email', e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={contactForm.phone || ''} onChange={e => updateContactForm('phone', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Mobile</Label>
              <Input value={contactForm.mobile || ''} onChange={e => updateContactForm('mobile', e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={contactForm.notes || ''} onChange={e => updateContactForm('notes', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveContact} disabled={!contactForm.name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Assign products */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Assign Products</DialogTitle>
            <DialogDescription>Supplier: {selectedSupplier?.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Assign New Product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Product</Label>
                  <Select value={productFormData.product_id || ''} onValueChange={v => updateProductForm('product_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products.filter(p => !supplierProducts.some(sp => sp.product_id === p.id)).map(product => (
                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Role</Label>
                    <Select value={productFormData.role || 'component'} onValueChange={v => updateProductForm('role', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUPPLIER_ROLES.map(role => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lead Time (Days)</Label>
                    <Input type="number" value={productFormData.lead_time_days || ''} onChange={e => updateProductForm('lead_time_days', parseInt(e.target.value) || undefined)} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="is_primary" checked={productFormData.is_primary || false} onCheckedChange={v => updateProductForm('is_primary', v)} />
                  <Label htmlFor="is_primary">Primary Supplier</Label>
                </div>
                <Button onClick={handleAssignProduct} disabled={!productFormData.product_id || isLoading} className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Assign
                </Button>
              </CardContent>
            </Card>

            <div>
              <h4 className="font-medium text-sm mb-2">Assigned Products ({supplierProducts.length})</h4>
              {supplierProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No products assigned yet</p>
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
                            {sp.is_primary && <Badge variant="secondary" className="ml-2 text-xs">Primary</Badge>}
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
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
