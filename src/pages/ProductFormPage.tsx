import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createProduct, updateProduct, getProductById, getCategories, getSuppliers, getProductSuppliers, assignProductToSupplier, removeProductFromSupplier, uploadDocument, getProductImages, createSupplier, getCountries, createCategory, addSubcategoryToCategory } from '@/services/supabase';
import { getCurrentTenant } from '@/services/supabase/tenants';
import { getCurrentTenantId } from '@/lib/supabase';
import type { Category, Country, Supplier, ProductRegistrations, SupportResources, Tenant } from '@/types/database';
import { getCategoryDisplayName, getSubcategoryDisplayName } from '@/lib/category-utils';
import type { TranslatableProductFields, PackagingType } from '@/types/product';
import { REGISTRATION_FIELDS } from '@/lib/registration-fields';
import { DOCUMENT_CATEGORIES } from '@/lib/document-categories';
import { CERTIFICATION_CATEGORIES } from '@/lib/certification-options';
import { ProductSupportTab } from '@/components/product/ProductSupportTab';
import { ProductImagesGallery } from '@/components/product/ProductImagesGallery';
import { LanguageSwitcher } from '@/components/product/LanguageSwitcher';
import { ProductComponentsStep, type ComponentEntry } from '@/components/product/ProductComponentsStep';
import { PackagingLayersEditor } from '@/components/product/PackagingLayersEditor';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useBranding } from '@/contexts/BrandingContext';
import type { ProductImage } from '@/types/database';
import type { AggregationOverrides } from '@/types/product';
import { getProductComponents, addProductComponent, removeProductComponent, updateProductComponent } from '@/services/supabase';
import type { VisibilityLevel } from '@/types/visibility';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronsUpDown,
  Package,
  ImageIcon,
  Leaf,
  ShieldCheck,
  FileText,
  Truck,
  Save,
  Plus,
  Trash2,
  Loader2,
  Upload,
  Headphones,
  Lock,
  Users,
  Building2,
  Layers,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from '@/components/ui/command';

const SUPPLIER_ROLES = [
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'importeur', label: 'Importer' },
  { value: 'component', label: 'Component Supplier' },
  { value: 'raw_material', label: 'Raw Material Supplier' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'logistics', label: 'Logistics' },
];

const BASE_STEPS = [
  { id: 'master-data', title: 'Basic Data', icon: Package },
  { id: 'images', title: 'Images', icon: ImageIcon },
  { id: 'sustainability', title: 'Sustainability', icon: Leaf },
  { id: 'compliance', title: 'Compliance', icon: ShieldCheck },
  { id: 'documents', title: 'Documents', icon: FileText },
  { id: 'support', title: 'Support', icon: Headphones },
  { id: 'suppliers', title: 'Suppliers', icon: Truck },
];

const COMPONENTS_STEP = { id: 'components', title: 'Components', icon: Layers };

export function ProductFormPage() {
  const { t, i18n } = useTranslation('products');
  const locale = i18n.language === 'de' ? 'de' : 'en';
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { branding } = useBranding();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedMainCategory, setSelectedMainCategory] = useState('');
  const [subcategoryOpen, setSubcategoryOpen] = useState(false);
  const [manufacturerOpen, setManufacturerOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState('');
  const [quickCreateCountry, setQuickCreateCountry] = useState('');
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [quickCreateCategoryOpen, setQuickCreateCategoryOpen] = useState(false);
  const [quickCreateCategoryNameEn, setQuickCreateCategoryNameEn] = useState('');
  const [quickCreateCategoryNameDe, setQuickCreateCategoryNameDe] = useState('');
  const [isQuickCreatingCategory, setIsQuickCreatingCategory] = useState(false);
  const [quickCreateSubOpen, setQuickCreateSubOpen] = useState(false);
  const [quickCreateSubNameEn, setQuickCreateSubNameEn] = useState('');
  const [quickCreateSubNameDe, setQuickCreateSubNameDe] = useState('');
  const [isQuickCreatingSub, setIsQuickCreatingSub] = useState(false);

  // Multi-language state
  const [activeLanguage, setActiveLanguage] = useState<string>('default');
  const [translations, setTranslations] = useState<Record<string, Partial<TranslatableProductFields>>>({});
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const productLanguages = tenant?.settings?.productLanguages || ['en', 'de'];

  // Supplier state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isSelfManufacturer, setIsSelfManufacturer] = useState(false);
  const [isSelfImporter, setIsSelfImporter] = useState(false);
  const [manufacturerSupplierId, setManufacturerSupplierId] = useState<string>('');
  const [importerSupplierId, setImporterSupplierId] = useState<string>('');
  const [selectedSuppliers, setSelectedSuppliers] = useState<Array<{
    id?: string;
    supplier_id: string;
    role: string;
    is_primary: boolean;
    lead_time_days?: number;
    price_per_unit?: number;
    currency?: string;
  }>>([]);

  // Product type (single vs set/bundle)
  const [productType, setProductType] = useState<'single' | 'set'>('single');
  const [components, setComponents] = useState<ComponentEntry[]>([]);
  const [aggregationOverrides, setAggregationOverrides] = useState<AggregationOverrides>({});

  // Dynamic steps: insert "Components" after "Basic Data" when type is 'set'
  const steps = productType === 'set'
    ? [BASE_STEPS[0], COMPONENTS_STEP, ...BASE_STEPS.slice(1)]
    : BASE_STEPS;

  // Product images state
  const [productImages, setProductImages] = useState<ProductImage[]>([]);

  // Document upload state
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ name: string; size: string; category: string; visibility: string }>>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDocDialogOpen, setIsDocDialogOpen] = useState(false);
  const [pendingDocFile, setPendingDocFile] = useState<File | null>(null);
  const [docUploadForm, setDocUploadForm] = useState({
    name: '',
    category: 'Certificate',
    visibility: 'internal' as VisibilityLevel,
    validUntil: '',
  });

  useEffect(() => {
    Promise.all([
      getCategories().then(setCategories),
      getSuppliers().then(setSuppliers),
      getCurrentTenant().then(setTenant),
      getCountries().then(setCountries),
    ]).catch(console.error).finally(() => setCategoriesLoading(false));
  }, []);

  // Load product data in edit mode
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([
      getProductById(id),
      getProductSuppliers(id),
      getProductImages(id),
      getProductComponents(id),
    ]).then(([product, productSuppliers, images, existingComponents]) => {
      if (!product) {
        setSubmitError('Product not found.');
        setIsLoading(false);
        return;
      }
      // Extract main category from "Main / Sub" format
      const categoryParts = product.category?.includes(' / ')
        ? product.category.split(' / ')
        : null;
      if (categoryParts) {
        setSelectedMainCategory(categoryParts[0]);
      } else if (product.category) {
        setSelectedMainCategory(product.category);
      }

      const productMats = (product.materials || []).filter(m => !m.type || m.type === 'product');
      const packagingMats = (product.materials || []).filter(m => m.type === 'packaging');
      setFormData({
        name: product.name || '',
        manufacturer: product.manufacturer || '',
        gtin: product.gtin || '',
        category: product.category || '',
        description: product.description || '',
        hsCode: product.hsCode || '',
        countryOfOrigin: product.countryOfOrigin || '',
        materials: productMats.length
          ? productMats.map(m => ({
              name: m.name || '',
              percentage: m.percentage || 0,
              recyclable: m.recyclable || false,
              origin: m.origin || '',
            }))
          : [{ name: '', percentage: 0, recyclable: false, origin: '' }],
        recyclablePercentage: product.recyclability?.recyclablePercentage || 0,
        recyclingInstructions: product.recyclability?.instructions || '',
        packagingMaterials: packagingMats.length
          ? packagingMats.map(m => ({
              name: m.name || '',
              percentage: m.percentage || 0,
              recyclable: m.recyclable || false,
              origin: m.origin || '',
            }))
          : [{ name: '', percentage: 0, recyclable: false, origin: '' }],
        packagingRecyclablePercentage: product.recyclability?.packagingRecyclablePercentage || 0,
        packagingRecyclingInstructions: product.recyclability?.packagingInstructions || '',
        certifications: (product.certifications || []).map(c => ({
          name: c.name,
          issuedBy: c.issuedBy || '',
          validUntil: c.validUntil || '',
        })),
        registrations: product.registrations || {},
        supportResources: product.supportResources || {},
        // Dimensions
        productHeightCm: product.productHeightCm ?? '',
        productWidthCm: product.productWidthCm ?? '',
        productDepthCm: product.productDepthCm ?? '',
        // Packaging details
        packagingType: product.packagingType || '',
        packagingDescription: product.packagingDescription || '',
        packagingHeightCm: product.packagingHeightCm ?? '',
        packagingWidthCm: product.packagingWidthCm ?? '',
        packagingDepthCm: product.packagingDepthCm ?? '',
      });

      setTranslations(product.translations || {});
      setManufacturerSupplierId(product.manufacturerSupplierId || '');
      setImporterSupplierId(product.importerSupplierId || '');
      setSelectedSuppliers(
        productSuppliers.map(sp => ({
          id: sp.id,
          supplier_id: sp.supplier_id,
          role: sp.role,
          is_primary: sp.is_primary,
          lead_time_days: sp.lead_time_days,
          price_per_unit: sp.price_per_unit,
          currency: sp.currency,
        }))
      );
      setProductImages(images);
      setProductType(product.productType || 'single');
      setAggregationOverrides(product.aggregationOverrides || {});
      setComponents(existingComponents.map(c => ({
        tempId: c.id,
        dbId: c.id,
        productId: c.componentProductId,
        productName: c.componentProduct?.name || '',
        productGtin: c.componentProduct?.gtin || '',
        productManufacturer: c.componentProduct?.manufacturer || '',
        productImageUrl: c.componentProduct?.imageUrl,
        productCategory: c.componentProduct?.category || '',
        quantity: c.quantity,
        sortOrder: c.sortOrder,
        notes: c.notes,
        materials: c.componentProduct,
      })));
    }).catch(() => {
      setSubmitError('Error loading product.');
    }).finally(() => {
      setIsLoading(false);
    });
  }, [id]);

  const [formData, setFormData] = useState({
    name: '',
    manufacturer: '',
    gtin: '',
    category: '',
    description: '',
    hsCode: '',
    countryOfOrigin: '',
    materials: [{ name: '', percentage: 0, recyclable: false, origin: '' }],
    recyclablePercentage: 0,
    recyclingInstructions: '',
    packagingMaterials: [{ name: '', percentage: 0, recyclable: false, origin: '' }],
    packagingRecyclablePercentage: 0,
    packagingRecyclingInstructions: '',
    certifications: [] as Array<{ name: string; issuedBy: string; validUntil: string }>,
    registrations: {} as ProductRegistrations,
    supportResources: {} as SupportResources,
    // Dimensions
    productHeightCm: '' as number | '',
    productWidthCm: '' as number | '',
    productDepthCm: '' as number | '',
    // Packaging details
    packagingType: '' as PackagingType | '',
    packagingDescription: '' as string,
    packagingHeightCm: '' as number | '',
    packagingWidthCm: '' as number | '',
    packagingDepthCm: '' as number | '',
  });

  const updateField = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addMaterial = () => {
    setFormData((prev) => ({
      ...prev,
      materials: [...prev.materials, { name: '', percentage: 0, recyclable: false, origin: '' }],
    }));
  };

  const removeMaterial = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  };

  const updateMaterial = (index: number, field: string, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }));
  };

  const addPackagingMaterial = () => {
    setFormData((prev) => ({
      ...prev,
      packagingMaterials: [...prev.packagingMaterials, { name: '', percentage: 0, recyclable: false, origin: '' }],
    }));
  };

  const removePackagingMaterial = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      packagingMaterials: prev.packagingMaterials.filter((_, i) => i !== index),
    }));
  };

  const updatePackagingMaterial = (index: number, field: string, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      packagingMaterials: prev.packagingMaterials.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }));
  };

  const selectedSubcategories = categories
    .find(c => c.name === selectedMainCategory)
    ?.subcategories || [];

  const handleCategoryChange = (mainCat: string) => {
    setSelectedMainCategory(mainCat);
    updateField('category', mainCat);
  };

  const handleSubcategoryChange = (sub: string) => {
    updateField('category', `${selectedMainCategory} / ${sub}`);
  };

  // Supplier handlers
  const addSupplierAssignment = () => {
    setSelectedSuppliers(prev => [...prev, {
      supplier_id: '',
      role: 'component',
      is_primary: false,
    }]);
  };

  const removeSupplierAssignment = (index: number) => {
    setSelectedSuppliers(prev => prev.filter((_, i) => i !== index));
  };

  const updateSupplierAssignment = (index: number, field: string, value: unknown) => {
    setSelectedSuppliers(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  // Quick-create supplier handler
  const handleQuickCreateSupplier = async () => {
    if (!quickCreateName.trim()) return;
    setIsQuickCreating(true);
    try {
      const result = await createSupplier({
        name: quickCreateName.trim(),
        country: quickCreateCountry || undefined,
        status: 'active',
        risk_level: 'medium',
        verified: false,
      } as Omit<Supplier, 'id' | 'tenant_id' | 'createdAt'>);
      if (result.success && result.id) {
        const refreshed = await getSuppliers();
        setSuppliers(refreshed);
        setManufacturerSupplierId(result.id);
        updateField('manufacturer', quickCreateName.trim());
      }
    } catch (err) {
      console.error('Quick create supplier failed:', err);
    } finally {
      setIsQuickCreating(false);
      setQuickCreateOpen(false);
      setQuickCreateName('');
      setQuickCreateCountry('');
    }
  };

  // Quick-create category handler
  const handleQuickCreateCategory = async () => {
    if (!quickCreateCategoryNameEn.trim()) return;
    setIsQuickCreatingCategory(true);
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return;
      const result = await createCategory({
        name: quickCreateCategoryNameEn.trim(),
        tenant_id: tenantId,
        translations: {
          en: quickCreateCategoryNameEn.trim(),
          de: quickCreateCategoryNameDe.trim() || quickCreateCategoryNameEn.trim(),
        },
        subcategories: [],
      });
      if (result.success && result.id) {
        const refreshed = await getCategories();
        setCategories(refreshed);
        setSelectedMainCategory(quickCreateCategoryNameEn.trim());
        updateField('category', quickCreateCategoryNameEn.trim());
      }
    } catch (err) {
      console.error('Quick create category failed:', err);
    } finally {
      setIsQuickCreatingCategory(false);
      setQuickCreateCategoryOpen(false);
      setQuickCreateCategoryNameEn('');
      setQuickCreateCategoryNameDe('');
    }
  };

  // Quick-create subcategory handler
  const handleQuickCreateSubcategory = async () => {
    if (!quickCreateSubNameEn.trim() || !selectedMainCategory) return;
    setIsQuickCreatingSub(true);
    try {
      const parentCat = categories.find(c => c.name === selectedMainCategory);
      if (!parentCat) return;
      const result = await addSubcategoryToCategory(parentCat.id, quickCreateSubNameEn.trim(), {
        en: quickCreateSubNameEn.trim(),
        de: quickCreateSubNameDe.trim() || quickCreateSubNameEn.trim(),
      });
      if (result.success) {
        const refreshed = await getCategories();
        setCategories(refreshed);
        handleSubcategoryChange(quickCreateSubNameEn.trim());
      }
    } catch (err) {
      console.error('Quick create subcategory failed:', err);
    } finally {
      setIsQuickCreatingSub(false);
      setQuickCreateSubOpen(false);
      setQuickCreateSubNameEn('');
      setQuickCreateSubNameDe('');
    }
  };

  // Document upload handler — opens dialog instead of uploading directly
  const openDocDialog = (file: File) => {
    setPendingDocFile(file);
    setDocUploadForm(prev => ({ ...prev, name: file.name }));
    setIsDocDialogOpen(true);
  };

  const handleDocUpload = async () => {
    if (!pendingDocFile || !docUploadForm.name) return;
    setIsUploadingDoc(true);
    const result = await uploadDocument(pendingDocFile, {
      name: docUploadForm.name,
      category: docUploadForm.category,
      visibility: docUploadForm.visibility,
      validUntil: docUploadForm.validUntil || undefined,
    });
    if (result.success) {
      setUploadedDocs((prev) => [...prev, {
        name: docUploadForm.name,
        size: `${(pendingDocFile.size / 1024).toFixed(1)} KB`,
        category: docUploadForm.category,
        visibility: docUploadForm.visibility,
      }]);
      setIsDocDialogOpen(false);
      setPendingDocFile(null);
      setDocUploadForm({ name: '', category: 'Certificate', visibility: 'internal', validUntil: '' });
    }
    setIsUploadingDoc(false);
  };

  const handleDocFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) openDocDialog(file);
    if (docFileInputRef.current) docFileInputRef.current.value = '';
  };

  const handleDocDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) openDocDialog(file);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Merge product + packaging materials with type tags
      const mergedMaterials = [
        ...formData.materials
          .filter(m => m.name.trim())
          .map(m => ({ ...m, type: 'product' as const })),
        ...formData.packagingMaterials
          .filter(m => m.name.trim())
          .map(m => ({ ...m, type: 'packaging' as const })),
      ];

      const productData = {
        name: formData.name,
        manufacturer: formData.manufacturer,
        gtin: formData.gtin,
        category: formData.category,
        description: formData.description,
        hsCode: formData.hsCode || undefined,
        countryOfOrigin: formData.countryOfOrigin || undefined,
        materials: mergedMaterials,
        certifications: formData.certifications.map((cert) => ({
          name: cert.name,
          issuedBy: cert.issuedBy,
          validUntil: cert.validUntil,
        })),
        recyclability: {
          recyclablePercentage: formData.recyclablePercentage,
          instructions: formData.recyclingInstructions,
          disposalMethods: [],
          packagingRecyclablePercentage: formData.packagingRecyclablePercentage,
          packagingInstructions: formData.packagingRecyclingInstructions,
          packagingDisposalMethods: [],
        },
        registrations: formData.registrations,
        supportResources: formData.supportResources,
        translations: translations,
        manufacturerSupplierId: (manufacturerSupplierId && manufacturerSupplierId !== '_tenant' && manufacturerSupplierId !== '_none') ? manufacturerSupplierId : null,
        importerSupplierId: (importerSupplierId && importerSupplierId !== '_tenant' && importerSupplierId !== '_none') ? importerSupplierId : null,
        productType,
        aggregationOverrides: productType === 'set' ? aggregationOverrides : {},
        // Dimensions
        productHeightCm: formData.productHeightCm || undefined,
        productWidthCm: formData.productWidthCm || undefined,
        productDepthCm: formData.productDepthCm || undefined,
        // Packaging details
        packagingType: formData.packagingType || undefined,
        packagingDescription: formData.packagingDescription || undefined,
        packagingHeightCm: formData.packagingHeightCm || undefined,
        packagingWidthCm: formData.packagingWidthCm || undefined,
        packagingDepthCm: formData.packagingDepthCm || undefined,
      };

      if (isEditMode && id) {
        // Update existing product
        const result = await updateProduct(id, productData);
        if (result.success) {
          // Remove old supplier assignments and create new ones
          const existingSuppliers = await getProductSuppliers(id);
          for (const existing of existingSuppliers) {
            await removeProductFromSupplier(existing.id);
          }
          const supplierAssignments = selectedSuppliers.filter(s => s.supplier_id);
          for (const assignment of supplierAssignments) {
            await assignProductToSupplier({
              supplier_id: assignment.supplier_id,
              product_id: id,
              role: assignment.role as 'manufacturer' | 'importeur' | 'component' | 'raw_material' | 'packaging' | 'logistics',
              is_primary: assignment.is_primary,
              lead_time_days: assignment.lead_time_days,
              price_per_unit: assignment.price_per_unit,
              currency: assignment.currency,
            });
          }
          // Save components for sets
          if (productType === 'set') {
            // Remove components that are no longer in the list
            const existingComps = await getProductComponents(id);
            const currentIds = new Set(components.map(c => c.dbId).filter(Boolean));
            for (const ec of existingComps) {
              if (!currentIds.has(ec.id)) {
                await removeProductComponent(ec.id);
              }
            }
            // Add new components and update existing ones
            for (let i = 0; i < components.length; i++) {
              const comp = components[i];
              if (comp.dbId) {
                await updateProductComponent(comp.dbId, { quantity: comp.quantity, sortOrder: i });
              } else {
                await addProductComponent(id, comp.productId, comp.quantity);
              }
            }
          }
          navigate(`/products/${id}`);
        } else {
          setSubmitError(result.error || 'Product could not be saved.');
        }
      } else {
        // Create new product
        const result = await createProduct(productData);
        if (result.success && result.id) {
          const supplierAssignments = selectedSuppliers.filter(s => s.supplier_id);
          for (const assignment of supplierAssignments) {
            await assignProductToSupplier({
              supplier_id: assignment.supplier_id,
              product_id: result.id,
              role: assignment.role as 'manufacturer' | 'importeur' | 'component' | 'raw_material' | 'packaging' | 'logistics',
              is_primary: assignment.is_primary,
              lead_time_days: assignment.lead_time_days,
              price_per_unit: assignment.price_per_unit,
              currency: assignment.currency,
            });
          }
          // Save components for sets
          if (productType === 'set') {
            for (let i = 0; i < components.length; i++) {
              await addProductComponent(result.id, components[i].productId, components[i].quantity);
            }
          }
          // Redirect to create first batch for this product
          navigate(`/products/${result.id}/batches/new`);
        } else if (result.success) {
          navigate('/products');
        } else {
          setSubmitError(result.error || 'Product could not be saved.');
        }
      }
    } catch {
      setSubmitError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const currentStepId = steps[currentStep]?.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={isEditMode ? `/products/${id}` : '/products'}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditMode ? t('Edit Product') : t('Create New Product')}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? t('Edit the Digital Product Passport')
              : t('Create a new Digital Product Passport')}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">{t('Loading product data...')}</span>
        </div>
      ) : (<>
      {/* Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-4 overflow-x-auto gap-1 sm:gap-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 ${
                  index <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    index < currentStep
                      ? 'border-primary bg-primary text-primary-foreground'
                      : index === currentStep
                        ? 'border-primary text-primary'
                        : 'border-muted-foreground'
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Language Switcher */}
      {(currentStepId === 'master-data' || currentStepId === 'sustainability' || currentStepId === 'support') && productLanguages.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <LanguageSwitcher
              activeLanguage={activeLanguage}
              onLanguageChange={setActiveLanguage}
              availableLanguages={productLanguages}
              translatedLanguages={Object.keys(translations).filter(lang =>
                translations[lang] && Object.values(translations[lang]).some(v => v && (typeof v === 'string' ? v.length > 0 : true))
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* Form Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const StepIcon = steps[currentStep].icon;
              return <StepIcon className="h-5 w-5" />;
            })()}
            {steps[currentStep].title}
          </CardTitle>
          <CardDescription>
            {currentStepId === 'master-data' && t('Enter basic product information')}
            {currentStepId === 'components' && t('Select products to include in this set')}
            {currentStepId === 'images' && t('Manage product images')}
            {currentStepId === 'sustainability' && t('Define materials and sustainability data')}
            {currentStepId === 'compliance' && t('Add certifications and compliance data')}
            {currentStepId === 'documents' && t('Upload relevant documents')}
            {currentStepId === 'support' && t('Add support resources, FAQ, warranty, and repair information')}
            {currentStepId === 'suppliers' && t('Assign suppliers and economic operators')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic Data */}
          {currentStepId === 'master-data' && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Product Name')} *</label>
                <Input
                  placeholder={t('e.g. Eco Sneaker Pro')}
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Manufacturer')} *</label>
                <Popover open={manufacturerOpen} onOpenChange={setManufacturerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      role="combobox"
                      aria-expanded={manufacturerOpen}
                      className={cn(
                        "border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] h-9",
                        !formData.manufacturer && "text-muted-foreground"
                      )}
                    >
                      {formData.manufacturer || t('e.g. GreenStep GmbH')}
                      <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t('Search supplier...')} />
                      <CommandList>
                        <CommandEmpty>{t('No supplier found.')}</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value={`_tenant_${branding.appName || tenant?.name || 'Own Company'}`}
                            onSelect={() => {
                              setManufacturerSupplierId('_tenant');
                              updateField('manufacturer', branding.appName || tenant?.name || '');
                              setManufacturerOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", manufacturerSupplierId === '_tenant' ? "opacity-100" : "opacity-0")} />
                            <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                            {branding.appName || tenant?.name || t('Own Company')}
                          </CommandItem>
                          {suppliers.map((s) => (
                            <CommandItem
                              key={s.id}
                              value={s.name}
                              onSelect={() => {
                                setManufacturerSupplierId(s.id);
                                updateField('manufacturer', s.name);
                                setManufacturerOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", manufacturerSupplierId === s.id ? "opacity-100" : "opacity-0")} />
                              <span className="truncate">{s.name}</span>
                              {s.country && <span className="ml-auto text-xs text-muted-foreground">{s.country}</span>}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup>
                          <CommandItem
                            value="_create_new_supplier"
                            onSelect={() => {
                              setManufacturerOpen(false);
                              const input = document.querySelector<HTMLInputElement>('[cmdk-input]');
                              setQuickCreateName(input?.value || '');
                              setQuickCreateOpen(true);
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Create new supplier...')}
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Quick Create Supplier Dialog */}
                <Dialog open={quickCreateOpen} onOpenChange={setQuickCreateOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{t('Quick Create Supplier')}</DialogTitle>
                      <DialogDescription>{t('Enter name and country to quickly create a new supplier.')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>{t('Name')} *</Label>
                        <Input
                          value={quickCreateName}
                          onChange={(e) => setQuickCreateName(e.target.value)}
                          placeholder={t('e.g. GreenStep GmbH')}
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('Country of Origin')}</Label>
                        <Select value={quickCreateCountry} onValueChange={setQuickCreateCountry}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('Select country...')} />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((c) => (
                              <SelectItem key={c.id} value={c.name || c.id}>
                                {c.flag} {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setQuickCreateOpen(false)} type="button">
                        {t('Cancel', { ns: 'common' })}
                      </Button>
                      <Button
                        onClick={handleQuickCreateSupplier}
                        disabled={!quickCreateName.trim() || isQuickCreating}
                        type="button"
                      >
                        {isQuickCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('Create Supplier')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('GTIN/EAN')} *</label>
                <Input
                  placeholder="e.g. 4012345678901"
                  value={formData.gtin}
                  onChange={(e) => updateField('gtin', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Category')} *</label>
                <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      role="combobox"
                      aria-expanded={categoryOpen}
                      className={cn(
                        "border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] h-9",
                        !selectedMainCategory && "text-muted-foreground"
                      )}
                    >
                      {selectedMainCategory
                        ? (() => {
                            const cat = categories.find(c => c.name === selectedMainCategory);
                            return cat ? `${cat.icon ? cat.icon + ' ' : ''}${getCategoryDisplayName(cat, locale)}` : selectedMainCategory;
                          })()
                        : (categoriesLoading ? t('Loading...') : t('Select category...'))}
                      <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t('Search category...')} />
                      <CommandList>
                        <CommandEmpty>{t('No category found.')}</CommandEmpty>
                        <CommandGroup>
                          {categories.filter(c => !c.parent_id).map((cat) => (
                            <CommandItem
                              key={cat.id}
                              value={`${cat.name} ${getCategoryDisplayName(cat, locale)}`}
                              onSelect={() => {
                                handleCategoryChange(cat.name);
                                setCategoryOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedMainCategory === cat.name ? "opacity-100" : "opacity-0")} />
                              {cat.icon ? `${cat.icon} ` : ''}{getCategoryDisplayName(cat, locale)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup>
                          <CommandItem
                            value="_create_new_category"
                            onSelect={() => {
                              setCategoryOpen(false);
                              setQuickCreateCategoryOpen(true);
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Create new category...')}
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Quick Create Category Dialog */}
                <Dialog open={quickCreateCategoryOpen} onOpenChange={setQuickCreateCategoryOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{t('Quick Create Category')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>{t('Category Name (English)')} *</Label>
                        <Input
                          value={quickCreateCategoryNameEn}
                          onChange={(e) => setQuickCreateCategoryNameEn(e.target.value)}
                          placeholder="e.g. Electronics"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('Category Name (German)')} *</Label>
                        <Input
                          value={quickCreateCategoryNameDe}
                          onChange={(e) => setQuickCreateCategoryNameDe(e.target.value)}
                          placeholder="z.B. Elektronik"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setQuickCreateCategoryOpen(false)} type="button">
                        {t('Cancel', { ns: 'common' })}
                      </Button>
                      <Button
                        onClick={handleQuickCreateCategory}
                        disabled={!quickCreateCategoryNameEn.trim() || isQuickCreatingCategory}
                        type="button"
                      >
                        {isQuickCreatingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('Create Category')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              {selectedMainCategory && (selectedSubcategories.length > 0 || categories.find(c => c.name === selectedMainCategory)) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('Subcategory')}</label>
                  <Popover open={subcategoryOpen} onOpenChange={setSubcategoryOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        role="combobox"
                        aria-expanded={subcategoryOpen}
                        className={cn(
                          "border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] h-9",
                          !formData.category.includes(' / ') && "text-muted-foreground"
                        )}
                      >
                        {formData.category.includes(' / ')
                          ? (() => {
                              const subName = formData.category.split(' / ')[1];
                              const parentCat = categories.find(c => c.name === selectedMainCategory);
                              return parentCat ? getSubcategoryDisplayName(parentCat, subName, locale) : subName;
                            })()
                          : t('Search subcategory...')}
                        <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder={t('Search subcategory...')} />
                        <CommandList>
                          <CommandEmpty>{t('No subcategory found.')}</CommandEmpty>
                          <CommandGroup>
                            {selectedSubcategories.map((sub) => {
                              const parentCat = categories.find(c => c.name === selectedMainCategory);
                              const displayName = parentCat ? getSubcategoryDisplayName(parentCat, sub, locale) : sub;
                              return (
                                <CommandItem
                                  key={sub}
                                  value={`${sub} ${displayName}`}
                                  onSelect={() => {
                                    handleSubcategoryChange(sub);
                                    setSubcategoryOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.category === `${selectedMainCategory} / ${sub}`
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {displayName}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                          <CommandSeparator />
                          <CommandGroup>
                            <CommandItem
                              value="_add_new_subcategory"
                              onSelect={() => {
                                setSubcategoryOpen(false);
                                setQuickCreateSubOpen(true);
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              {t('Add new subcategory...')}
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Quick Add Subcategory Dialog */}
                  <Dialog open={quickCreateSubOpen} onOpenChange={setQuickCreateSubOpen}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{t('Quick Add Subcategory')}</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label>{t('Subcategory Name (English)')} *</Label>
                          <Input
                            value={quickCreateSubNameEn}
                            onChange={(e) => setQuickCreateSubNameEn(e.target.value)}
                            placeholder="e.g. Smartphones"
                            autoFocus
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('Subcategory Name (German)')} *</Label>
                          <Input
                            value={quickCreateSubNameDe}
                            onChange={(e) => setQuickCreateSubNameDe(e.target.value)}
                            placeholder="z.B. Smartphones"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setQuickCreateSubOpen(false)} type="button">
                          {t('Cancel', { ns: 'common' })}
                        </Button>
                        <Button
                          onClick={handleQuickCreateSubcategory}
                          disabled={!quickCreateSubNameEn.trim() || isQuickCreatingSub}
                          type="button"
                        >
                          {isQuickCreatingSub && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t('Add Subcategory')}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{t('Description')}</label>
                {activeLanguage === 'default' ? (
                  <RichTextEditor
                    value={formData.description}
                    onChange={(html) => updateField('description', html)}
                    placeholder={t('Product description...')}
                    minHeight="6rem"
                  />
                ) : (
                  <RichTextEditor
                    value={translations[activeLanguage]?.description || ''}
                    onChange={(html) => setTranslations(prev => ({
                      ...prev,
                      [activeLanguage]: { ...prev[activeLanguage], description: html },
                    }))}
                    placeholder={t('Product description...')}
                    minHeight="6rem"
                  />
                )}
              </div>

              <Separator className="md:col-span-2" />

              {/* Product Type Toggle */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">{t('Product Type')}</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setProductType('single')}
                    className={cn(
                      'flex-1 p-3 rounded-lg border-2 text-left transition-all',
                      productType === 'single'
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/25'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span className="font-medium text-sm">{t('Single Product')}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductType('set')}
                    className={cn(
                      'flex-1 p-3 rounded-lg border-2 text-left transition-all',
                      productType === 'set'
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/25'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      <span className="font-medium text-sm">{t('Product Set / Bundle')}</span>
                    </div>
                  </button>
                </div>
              </div>

              <Separator className="md:col-span-2" />
              <h3 className="font-medium md:col-span-2">{t('Extended Product Data')}</h3>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('HS Code (Customs Tariff Number)')}</label>
                <Input
                  placeholder="e.g. 8517.12.00"
                  value={formData.hsCode}
                  onChange={(e) => updateField('hsCode', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Country of Origin')}</label>
                <Input
                  placeholder="e.g. Germany"
                  value={formData.countryOfOrigin}
                  onChange={(e) => updateField('countryOfOrigin', e.target.value)}
                />
              </div>

              {isEditMode && (
                <>
                  <div className="md:col-span-2 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                    <p>{t('Batch-specific fields (serial number, batch number, production date, weights) are now managed per batch.')}</p>
                    <p className="mt-1">
                      {t('Go to the Batches tab on the product detail page to manage batches.')}
                    </p>
                  </div>
                </>
              )}

              <Separator className="md:col-span-2" />
              <h3 className="font-medium md:col-span-2">{t('Registration Numbers')}</h3>

              {REGISTRATION_FIELDS.filter(f => f.type !== 'tags').map((field) => (
                <div key={field.key} className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <field.icon className="h-4 w-4 text-muted-foreground" />
                    {t(field.label)}
                  </label>
                  {field.type === 'select' ? (
                    <Select
                      value={(formData.registrations as Record<string, string>)[field.key] || ''}
                      onValueChange={(v) => setFormData(prev => ({
                        ...prev,
                        registrations: { ...prev.registrations, [field.key]: v },
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t(field.placeholder)} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder={field.placeholder}
                      value={(formData.registrations as Record<string, string>)[field.key] || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        registrations: { ...prev.registrations, [field.key]: e.target.value },
                      }))}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">{t(field.tooltip)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Components Step (only for sets) */}
          {currentStepId === 'components' && (
            <ProductComponentsStep
              components={components}
              setComponents={setComponents}
              parentProductId={id}
              aggregationOverrides={aggregationOverrides}
            />
          )}

          {/* Step 2: Images */}
          {currentStepId === 'images' && (
            <div className="space-y-6">
              {isEditMode && id ? (
                <ProductImagesGallery
                  productId={id}
                  images={productImages}
                  onImagesChange={setProductImages}
                />
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium">{t('Images available after saving')}</h3>
                  <p className="text-muted-foreground mt-1">
                    {t('Product images can be uploaded after the product has been created.')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Sustainability */}
          {currentStepId === 'sustainability' && (
            <div className="space-y-6">
              {/* Set Aggregation Override Banner */}
              {productType === 'set' && components.length > 0 && (
                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{t('Aggregated from {{count}} components', { count: components.length })}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {t('Data is auto-aggregated from components. Toggle overrides to enter manual data instead.')}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {(['materials', 'carbonFootprint', 'recyclability', 'netWeight', 'grossWeight'] as const).map(field => (
                      <button
                        key={field}
                        type="button"
                        onClick={() => setAggregationOverrides(prev => ({ ...prev, [field]: !prev[field] }))}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-md border text-xs transition-all',
                          aggregationOverrides[field]
                            ? 'border-amber-300 bg-amber-50 text-amber-800'
                            : 'border-muted bg-background text-muted-foreground'
                        )}
                      >
                        {aggregationOverrides[field] ? (
                          <ToggleRight className="h-3.5 w-3.5" />
                        ) : (
                          <ToggleLeft className="h-3.5 w-3.5" />
                        )}
                        <span className="capitalize">
                          {field === 'carbonFootprint' ? 'CO₂' : field === 'netWeight' ? t('Net Weight') : field === 'grossWeight' ? t('Gross Weight') : t(field.charAt(0).toUpperCase() + field.slice(1))}
                        </span>
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          {aggregationOverrides[field] ? t('Manual') : t('Auto')}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 1: Product Materials */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">{t('Product Materials')}</h3>
                  <Button variant="outline" size="sm" onClick={addMaterial}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('Add Material')}
                  </Button>
                </div>
                <div className="space-y-4">
                  {formData.materials.map((material, index) => (
                    <div key={index} className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-5 p-4 border rounded-lg">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t('Material')}</label>
                        <Input
                          placeholder={t('e.g. Recycled PET')}
                          value={material.name}
                          onChange={(e) => updateMaterial(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t('Share (%)')}</label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={material.percentage}
                          onChange={(e) => updateMaterial(index, 'percentage', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t('Origin')}</label>
                        <Input
                          placeholder="e.g. Germany"
                          value={material.origin}
                          onChange={(e) => updateMaterial(index, 'origin', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t('Recyclable')}</label>
                        <div className="flex items-center h-10">
                          <input
                            type="checkbox"
                            checked={material.recyclable}
                            onChange={(e) => updateMaterial(index, 'recyclable', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="ml-2 text-sm">{t('Yes')}</span>
                        </div>
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMaterial(index)}
                          disabled={formData.materials.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Section 2: Product Recyclability */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('Total Recyclability (%)')}</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.recyclablePercentage}
                    onChange={(e) => updateField('recyclablePercentage', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">{t('Recycling Instructions')}</label>
                  {activeLanguage === 'default' ? (
                    <RichTextEditor
                      value={formData.recyclingInstructions}
                      onChange={(html) => updateField('recyclingInstructions', html)}
                      placeholder={t('Disposal instructions for consumers...')}
                      minHeight="5rem"
                    />
                  ) : (
                    <RichTextEditor
                      value={translations[activeLanguage]?.recyclingInstructions || ''}
                      onChange={(html) => setTranslations(prev => ({
                        ...prev,
                        [activeLanguage]: { ...prev[activeLanguage], recyclingInstructions: html },
                      }))}
                      placeholder={t('Disposal instructions for consumers...')}
                      minHeight="5rem"
                    />
                  )}
                </div>
              </div>

              <Separator />

              {/* Section 3: Packaging Materials */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    {t('Packaging Materials')}
                  </h3>
                  <Button variant="outline" size="sm" onClick={addPackagingMaterial}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('Add Packaging Material')}
                  </Button>
                </div>
                <div className="space-y-4">
                  {formData.packagingMaterials.map((material, index) => (
                    <div key={index} className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-5 p-4 border rounded-lg">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t('Material')}</label>
                        <Input
                          placeholder={t('e.g. Recycled PET')}
                          value={material.name}
                          onChange={(e) => updatePackagingMaterial(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t('Share (%)')}</label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={material.percentage}
                          onChange={(e) => updatePackagingMaterial(index, 'percentage', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t('Origin')}</label>
                        <Input
                          placeholder="e.g. Germany"
                          value={material.origin}
                          onChange={(e) => updatePackagingMaterial(index, 'origin', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t('Recyclable')}</label>
                        <div className="flex items-center h-10">
                          <input
                            type="checkbox"
                            checked={material.recyclable}
                            onChange={(e) => updatePackagingMaterial(index, 'recyclable', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="ml-2 text-sm">{t('Yes')}</span>
                        </div>
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePackagingMaterial(index)}
                          disabled={formData.packagingMaterials.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Section 4: Packaging Recyclability */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('Packaging Recyclability (%)')}</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.packagingRecyclablePercentage}
                    onChange={(e) => updateField('packagingRecyclablePercentage', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">{t('Packaging Recycling Instructions')}</label>
                  {activeLanguage === 'default' ? (
                    <RichTextEditor
                      value={formData.packagingRecyclingInstructions}
                      onChange={(html) => updateField('packagingRecyclingInstructions', html)}
                      placeholder={t('Disposal instructions for packaging...')}
                      minHeight="5rem"
                    />
                  ) : (
                    <RichTextEditor
                      value={translations[activeLanguage]?.packagingInstructions || ''}
                      onChange={(html) => setTranslations(prev => ({
                        ...prev,
                        [activeLanguage]: { ...prev[activeLanguage], packagingInstructions: html },
                      }))}
                      placeholder={t('Disposal instructions for packaging...')}
                      minHeight="5rem"
                    />
                  )}
                </div>
              </div>

              <Separator />

              {/* Section 5: Packaging Details */}
              <div>
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  {t('Packaging Details')}
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('Packaging Type')}</label>
                    <Select
                      value={formData.packagingType || ''}
                      onValueChange={(v) => updateField('packagingType', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('Select packaging type...')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="box">{t('packaging.box')}</SelectItem>
                        <SelectItem value="blister">{t('packaging.blister')}</SelectItem>
                        <SelectItem value="bottle">{t('packaging.bottle')}</SelectItem>
                        <SelectItem value="pouch">{t('packaging.pouch')}</SelectItem>
                        <SelectItem value="can">{t('packaging.can')}</SelectItem>
                        <SelectItem value="tube">{t('packaging.tube')}</SelectItem>
                        <SelectItem value="bag">{t('packaging.bag')}</SelectItem>
                        <SelectItem value="clamshell">{t('packaging.clamshell')}</SelectItem>
                        <SelectItem value="wrap">{t('packaging.wrap')}</SelectItem>
                        <SelectItem value="pallet">{t('packaging.pallet')}</SelectItem>
                        <SelectItem value="other">{t('packaging.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">{t('Packaging Description')}</label>
                    <textarea
                      className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder={t('Describe the packaging...')}
                      value={formData.packagingDescription || ''}
                      onChange={(e) => updateField('packagingDescription', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section 6: Dimensions */}
              <div>
                <h3 className="font-medium mb-4">{t('Dimensions')}</h3>
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Product Dimensions */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="text-sm font-medium mb-4">{t('Product Dimensions')}</h4>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">{t('Height (cm)')}</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder={t('e.g. 10')}
                          value={formData.productHeightCm || ''}
                          onChange={(e) => updateField('productHeightCm', e.target.value ? parseFloat(e.target.value) : '')}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">{t('Width (cm)')}</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder={t('e.g. 20')}
                          value={formData.productWidthCm || ''}
                          onChange={(e) => updateField('productWidthCm', e.target.value ? parseFloat(e.target.value) : '')}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">{t('Depth (cm)')}</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder={t('e.g. 5')}
                          value={formData.productDepthCm || ''}
                          onChange={(e) => updateField('productDepthCm', e.target.value ? parseFloat(e.target.value) : '')}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Packaging Dimensions */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="text-sm font-medium mb-4">{t('Packaging Dimensions')}</h4>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">{t('Height (cm)')}</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder={t('e.g. 10')}
                          value={formData.packagingHeightCm || ''}
                          onChange={(e) => updateField('packagingHeightCm', e.target.value ? parseFloat(e.target.value) : '')}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">{t('Width (cm)')}</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder={t('e.g. 20')}
                          value={formData.packagingWidthCm || ''}
                          onChange={(e) => updateField('packagingWidthCm', e.target.value ? parseFloat(e.target.value) : '')}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">{t('Depth (cm)')}</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder={t('e.g. 5')}
                          value={formData.packagingDepthCm || ''}
                          onChange={(e) => updateField('packagingDepthCm', e.target.value ? parseFloat(e.target.value) : '')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 7: Multiple Packaging Layers (only for existing products) */}
              {productId && (
                <>
                  <Separator />
                  <PackagingLayersEditor productId={productId} />
                </>
              )}
            </div>
          )}

          {/* Step 4: Compliance */}
          {currentStepId === 'compliance' && (
            <div className="space-y-6">
              {CERTIFICATION_CATEGORIES.map((category) => (
                <div key={category.label}>
                  <h3 className="font-medium mb-3">{t(category.label)}</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {category.options.map((opt) => {
                      const certEntry = formData.certifications.find(c => c.name === opt.name);
                      const isChecked = Boolean(certEntry);
                      return (
                        <div key={opt.name} className="border rounded-lg">
                          <label className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    certifications: [...prev.certifications, { name: opt.name, issuedBy: '', validUntil: '' }],
                                  }));
                                } else {
                                  setFormData((prev) => ({
                                    ...prev,
                                    certifications: prev.certifications.filter((c) => c.name !== opt.name),
                                  }));
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <span className="font-medium">{opt.name}</span>
                          </label>
                          {isChecked && certEntry && (
                            <div className="px-4 pb-4 grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">{t('Issued By')}</label>
                                <Input
                                  placeholder={t('e.g. TÜV Süd')}
                                  value={certEntry.issuedBy}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    certifications: prev.certifications.map(c =>
                                      c.name === opt.name ? { ...c, issuedBy: e.target.value } : c
                                    ),
                                  }))}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">{t('Valid Until')}</label>
                                <Input
                                  type="date"
                                  value={certEntry.validUntil}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    certifications: prev.certifications.map(c =>
                                      c.name === opt.name ? { ...c, validUntil: e.target.value } : c
                                    ),
                                  }))}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <Separator />

              {/* Custom certification */}
              <div>
                <h3 className="font-medium mb-3">{t('Custom Certification')}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const name = prompt(t('Enter certification name'));
                    if (name && !formData.certifications.some(c => c.name === name)) {
                      setFormData(prev => ({
                        ...prev,
                        certifications: [...prev.certifications, { name, issuedBy: '', validUntil: '' }],
                      }));
                    }
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('Add Custom Certification')}
                </Button>
              </div>

              {formData.certifications.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium mb-4">{t('Selected Certifications')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {formData.certifications.map((cert) => (
                        <Badge key={cert.name} variant="secondary" className="gap-1">
                          {cert.name}
                          {cert.issuedBy && <span className="text-muted-foreground">({cert.issuedBy})</span>}
                          <button
                            type="button"
                            className="ml-1 hover:text-destructive"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              certifications: prev.certifications.filter(c => c.name !== cert.name),
                            }))}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 5: Documents */}
          {currentStepId === 'documents' && (
            <div className="space-y-6">
              <input
                ref={docFileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                onChange={handleDocFileSelect}
                className="hidden"
              />
              <div
                className={`flex h-48 items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                  isDragOver ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => docFileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDocDrop}
              >
                <div className="text-center">
                  {isUploadingDoc ? (
                    <Loader2 className="mx-auto h-10 w-10 text-muted-foreground animate-spin" />
                  ) : (
                    <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                  )}
                  <p className="mt-2 text-sm font-medium">
                    {isUploadingDoc ? t('Uploading...') : t('Drag files here')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('or click to upload')}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    PDF, PNG, JPG up to 10MB
                  </p>
                </div>
              </div>

              {uploadedDocs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">{t('Uploaded Documents')}</h4>
                  {uploadedDocs.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.size} · {doc.category} · {doc.visibility}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setUploadedDocs((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">{t('Recommended Documents:')}</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {t('Declaration of Conformity (DoC)')}</li>
                  <li>• {t('CE Certificate')}</li>
                  <li>• {t('Test Reports')}</li>
                  <li>• {t('Material Data Sheets')}</li>
                  <li>• {t('LCA (Life Cycle Assessment)')}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 6: Support Resources */}
          {currentStepId === 'support' && (
            <ProductSupportTab
              supportResources={formData.supportResources}
              onChange={(resources) => setFormData(prev => ({ ...prev, supportResources: resources }))}
            />
          )}

          {/* Step 7: Suppliers */}
          {currentStepId === 'suppliers' && (
            <div className="space-y-6">
              {/* Manufacturer Company Selection */}
              <div>
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {t('Manufacturer / Importer')}
                </h3>
                <div className="space-y-4 p-4 border rounded-lg">
                  {/* Manufacturer */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('Select Company')} ({t('is Manufacturer')})</label>
                    <Select
                      value={manufacturerSupplierId || '_none'}
                      onValueChange={(v) => {
                        const val = v === '_none' ? '' : v;
                        setManufacturerSupplierId(val);
                        if (val === '_tenant' && tenant) {
                          setFormData(prev => ({
                            ...prev,
                            manufacturer: branding.appName || tenant.name || '',
                          }));
                          updateField('manufacturer', branding.appName || tenant.name || '');
                        } else if (val && val !== '_tenant') {
                          const supplier = suppliers.find(s => s.id === val);
                          if (supplier) {
                            setFormData(prev => ({
                              ...prev,
                              manufacturer: supplier.name || '',
                            }));
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('Select Company')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">{t('No company assigned')}</SelectItem>
                        <SelectItem value="_tenant">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5" />
                            {branding.appName || tenant?.name || t('Own Company')}
                          </div>
                        </SelectItem>
                        {suppliers.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.country})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {manufacturerSupplierId && manufacturerSupplierId !== '_none' && (
                      <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                        {manufacturerSupplierId === '_tenant' ? (
                          <span>{t('Auto-fill from company data')}: {branding.appName || tenant?.name}</span>
                        ) : (
                          <span>{t('Auto-fill from company data')}: {suppliers.find(s => s.id === manufacturerSupplierId)?.name}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Importer */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('Select Company')} ({t('is Importer')})</label>
                    <Select
                      value={importerSupplierId || '_none'}
                      onValueChange={(v) => setImporterSupplierId(v === '_none' ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('Select Company')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">{t('No company assigned')}</SelectItem>
                        <SelectItem value="_tenant">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5" />
                            {branding.appName || tenant?.name || t('Own Company')}
                          </div>
                        </SelectItem>
                        {suppliers.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.country})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Legacy checkboxes for backward compat */}
                  <div className="flex flex-wrap gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={isSelfManufacturer}
                        onChange={(e) => setIsSelfManufacturer(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      {t('is Manufacturer')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={isSelfImporter}
                        onChange={(e) => setIsSelfImporter(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      {t('is Importer')}
                    </label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* External Suppliers */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">{t('External Suppliers')}</h3>
                  <Button variant="outline" size="sm" onClick={addSupplierAssignment}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('Add Supplier')}
                  </Button>
                </div>

                {selectedSuppliers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <Truck className="mx-auto h-10 w-10 opacity-30 mb-2" />
                    <p>{t('No suppliers assigned yet')}</p>
                    <p className="text-xs mt-1">
                      {t('Click "Add Supplier" to assign external partners')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedSuppliers.map((assignment, index) => (
                      <div key={index} className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-7 p-4 border rounded-lg">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium">{t('Supplier')}</label>
                          <Select
                            value={assignment.supplier_id}
                            onValueChange={(v) => updateSupplierAssignment(index, 'supplier_id', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('Select supplier...')} />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name} ({s.country})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t('Role')}</label>
                          <Select
                            value={assignment.role}
                            onValueChange={(v) => updateSupplierAssignment(index, 'role', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SUPPLIER_ROLES.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t('Lead Time (Days)')}</label>
                          <Input
                            type="number"
                            min="0"
                            value={assignment.lead_time_days || ''}
                            onChange={(e) => updateSupplierAssignment(index, 'lead_time_days', parseInt(e.target.value) || undefined)}
                            placeholder={t('e.g. 14')}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t('Price per Unit')}</label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={assignment.price_per_unit ?? ''}
                            onChange={(e) => updateSupplierAssignment(index, 'price_per_unit', e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t('Currency')}</label>
                          <Select
                            value={assignment.currency || 'EUR'}
                            onValueChange={(v) => updateSupplierAssignment(index, 'currency', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                              <SelectItem value="CHF">CHF</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t('Options')}</label>
                          <div className="flex items-center gap-3 h-10">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={assignment.is_primary}
                                onChange={(e) => updateSupplierAssignment(index, 'is_primary', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <span className="text-sm">{t('Primary')}</span>
                            </label>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSupplierAssignment(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('Back')}
        </Button>

        <div className="flex gap-2">
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            {t('Save as Draft')}
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button onClick={nextStep}>
              {t('Next')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? t('Saving...') : isEditMode ? t('Save Changes') : t('Create Product')}
            </Button>
          )}
        </div>
      </div>

      {submitError && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {submitError}
        </div>
      )}

      {/* Document Upload Dialog */}
      <Dialog open={isDocDialogOpen} onOpenChange={(open) => {
        setIsDocDialogOpen(open);
        if (!open) {
          setPendingDocFile(null);
          setDocUploadForm({ name: '', category: 'Certificate', visibility: 'internal', validUntil: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Upload Document')}</DialogTitle>
            <DialogDescription>
              {t('Configure document details before uploading.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {pendingDocFile && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">{pendingDocFile.name}</p>
                <p className="text-muted-foreground">{(pendingDocFile.size / 1024).toFixed(1)} KB</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="doc-upload-name">{t('Name')}</Label>
              <Input
                id="doc-upload-name"
                value={docUploadForm.name}
                onChange={(e) => setDocUploadForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Category')}</Label>
              <Select
                value={docUploadForm.category}
                onValueChange={(value) => setDocUploadForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{t(cat, { ns: 'documents' })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('Visibility')}</Label>
              <Select
                value={docUploadForm.visibility}
                onValueChange={(value) => setDocUploadForm(prev => ({ ...prev, visibility: value as VisibilityLevel }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5" />
                      {t('Internal Only')}
                    </div>
                  </SelectItem>
                  <SelectItem value="customs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {t('Customs')}
                    </div>
                  </SelectItem>
                  <SelectItem value="consumer">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      {t('Consumer')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-upload-valid-until">{t('Valid Until (optional)')}</Label>
              <Input
                id="doc-upload-valid-until"
                type="date"
                value={docUploadForm.validUntil}
                onChange={(e) => setDocUploadForm(prev => ({ ...prev, validUntil: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocDialogOpen(false)}>
              {t('Cancel', { ns: 'common' })}
            </Button>
            <Button onClick={handleDocUpload} disabled={!docUploadForm.name || isUploadingDoc}>
              {isUploadingDoc ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isUploadingDoc ? t('Uploading...') : t('Upload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>)}
    </div>
  );
}
