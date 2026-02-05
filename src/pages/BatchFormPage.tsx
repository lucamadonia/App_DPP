import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import {
  ArrowLeft,
  Save,
  Loader2,
  Layers,
  ChevronDown,
  ChevronUp,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProductById, getProductSuppliersWithDetails } from '@/services/supabase';
import { getBatchById, createBatch, updateBatch } from '@/services/supabase/batches';
import { formatCurrency } from '@/lib/format';
import type { Product, Material, PackagingType } from '@/types/product';
import type { SupplierProduct } from '@/types/database';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const;

export function BatchFormPage() {
  const { t } = useTranslation('products');
  const locale = useLocale();
  const { id: productId, batchId } = useParams<{ id: string; batchId: string }>();
  const [searchParams] = useSearchParams();
  const duplicateFromId = searchParams.get('duplicate');
  const isEditMode = Boolean(batchId);
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [productSuppliers, setProductSuppliers] = useState<Array<SupplierProduct & { supplier_name: string; supplier_country: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Override toggles
  const [overrideMaterials, setOverrideMaterials] = useState(false);
  const [overrideDescription, setOverrideDescription] = useState(false);
  const [overrideCertifications, setOverrideCertifications] = useState(false);
  const [overrideDimensions, setOverrideDimensions] = useState(false);

  const [formData, setFormData] = useState({
    serialNumber: '',
    batchNumber: '',
    productionDate: '',
    expirationDate: '',
    netWeight: '',
    grossWeight: '',
    quantity: '',
    pricePerUnit: '',
    currency: 'EUR',
    supplierId: '',
    status: 'draft' as 'draft' | 'live' | 'archived',
    notes: '',
    // Override fields
    descriptionOverride: '',
    materialsOverride: [{ name: '', percentage: 0, recyclable: false, origin: '' }] as Material[],
    certificationsOverride: [] as string[],
    // Dimensions & Packaging override fields
    productHeightCm: '' as number | '',
    productWidthCm: '' as number | '',
    productDepthCm: '' as number | '',
    packagingType: '' as PackagingType | '',
    packagingDescription: '' as string,
    packagingHeightCm: '' as number | '',
    packagingWidthCm: '' as number | '',
    packagingDepthCm: '' as number | '',
  });

  const updateField = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const totalPrice = useMemo(() => {
    const qty = parseInt(formData.quantity) || 0;
    const ppu = parseFloat(formData.pricePerUnit) || 0;
    return qty * ppu;
  }, [formData.quantity, formData.pricePerUnit]);

  useEffect(() => {
    async function loadData() {
      if (!productId) return;
      setIsLoading(true);

      const [productData, suppliersData] = await Promise.all([
        getProductById(productId),
        getProductSuppliersWithDetails(productId),
      ]);
      setProduct(productData);
      setProductSuppliers(suppliersData);

      if (isEditMode && batchId) {
        const batch = await getBatchById(batchId);
        if (batch) {
          setFormData({
            serialNumber: batch.serialNumber,
            batchNumber: batch.batchNumber || '',
            productionDate: batch.productionDate ? batch.productionDate.slice(0, 10) : '',
            expirationDate: batch.expirationDate ? batch.expirationDate.slice(0, 10) : '',
            netWeight: batch.netWeight != null ? String(batch.netWeight) : '',
            grossWeight: batch.grossWeight != null ? String(batch.grossWeight) : '',
            quantity: batch.quantity != null ? String(batch.quantity) : '',
            pricePerUnit: batch.pricePerUnit != null ? String(batch.pricePerUnit) : '',
            currency: batch.currency || 'EUR',
            supplierId: batch.supplierId || '',
            status: batch.status,
            notes: batch.notes || '',
            descriptionOverride: batch.descriptionOverride || '',
            materialsOverride: batch.materialsOverride || [{ name: '', percentage: 0, recyclable: false, origin: '' }],
            certificationsOverride: batch.certificationsOverride?.map(c => c.name) || [],
            // Dimensions & Packaging override fields
            productHeightCm: batch.productHeightCm ?? '',
            productWidthCm: batch.productWidthCm ?? '',
            productDepthCm: batch.productDepthCm ?? '',
            packagingType: batch.packagingType || '',
            packagingDescription: batch.packagingDescription || '',
            packagingHeightCm: batch.packagingHeightCm ?? '',
            packagingWidthCm: batch.packagingWidthCm ?? '',
            packagingDepthCm: batch.packagingDepthCm ?? '',
          });
          if (batch.descriptionOverride) setOverrideDescription(true);
          if (batch.materialsOverride) setOverrideMaterials(true);
          if (batch.certificationsOverride) setOverrideCertifications(true);
          if (batch.productHeightCm != null || batch.productWidthCm != null || batch.productDepthCm != null ||
              batch.packagingType || batch.packagingDescription ||
              batch.packagingHeightCm != null || batch.packagingWidthCm != null || batch.packagingDepthCm != null) {
            setOverrideDimensions(true);
          }
        }
      } else if (duplicateFromId) {
        const batch = await getBatchById(duplicateFromId);
        if (batch) {
          setFormData({
            serialNumber: '', // Must be unique
            batchNumber: batch.batchNumber || '',
            productionDate: batch.productionDate ? batch.productionDate.slice(0, 10) : '',
            expirationDate: batch.expirationDate ? batch.expirationDate.slice(0, 10) : '',
            netWeight: batch.netWeight != null ? String(batch.netWeight) : '',
            grossWeight: batch.grossWeight != null ? String(batch.grossWeight) : '',
            quantity: batch.quantity != null ? String(batch.quantity) : '',
            pricePerUnit: batch.pricePerUnit != null ? String(batch.pricePerUnit) : '',
            currency: batch.currency || 'EUR',
            supplierId: batch.supplierId || '',
            status: 'draft',
            notes: batch.notes || '',
            descriptionOverride: batch.descriptionOverride || '',
            materialsOverride: batch.materialsOverride || [{ name: '', percentage: 0, recyclable: false, origin: '' }],
            certificationsOverride: batch.certificationsOverride?.map(c => c.name) || [],
            // Dimensions & Packaging override fields
            productHeightCm: batch.productHeightCm ?? '',
            productWidthCm: batch.productWidthCm ?? '',
            productDepthCm: batch.productDepthCm ?? '',
            packagingType: batch.packagingType || '',
            packagingDescription: batch.packagingDescription || '',
            packagingHeightCm: batch.packagingHeightCm ?? '',
            packagingWidthCm: batch.packagingWidthCm ?? '',
            packagingDepthCm: batch.packagingDepthCm ?? '',
          });
          if (batch.descriptionOverride) setOverrideDescription(true);
          if (batch.materialsOverride) setOverrideMaterials(true);
          if (batch.certificationsOverride) setOverrideCertifications(true);
          if (batch.productHeightCm != null || batch.productWidthCm != null || batch.productDepthCm != null ||
              batch.packagingType || batch.packagingDescription ||
              batch.packagingHeightCm != null || batch.packagingWidthCm != null || batch.packagingDepthCm != null) {
            setOverrideDimensions(true);
          }
        }
      }

      setIsLoading(false);
    }

    loadData();
  }, [productId, batchId, duplicateFromId, isEditMode]);

  const addMaterial = () => {
    setFormData((prev) => ({
      ...prev,
      materialsOverride: [...prev.materialsOverride, { name: '', percentage: 0, recyclable: false, origin: '' }],
    }));
  };

  const removeMaterial = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      materialsOverride: prev.materialsOverride.filter((_, i) => i !== index),
    }));
  };

  const updateMaterial = (index: number, field: string, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      materialsOverride: prev.materialsOverride.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    if (!productId) {
      setSubmitError('No product ID');
      setIsSubmitting(false);
      return;
    }

    if (!formData.serialNumber.trim()) {
      setSubmitError('Serial number is required.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.productionDate) {
      setSubmitError('Production date is required.');
      setIsSubmitting(false);
      return;
    }

    try {
      const batchData = {
        productId,
        serialNumber: formData.serialNumber,
        batchNumber: formData.batchNumber || undefined,
        productionDate: formData.productionDate,
        expirationDate: formData.expirationDate || undefined,
        netWeight: formData.netWeight ? parseFloat(formData.netWeight) : undefined,
        grossWeight: formData.grossWeight ? parseFloat(formData.grossWeight) : undefined,
        quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
        pricePerUnit: formData.pricePerUnit ? parseFloat(formData.pricePerUnit) : undefined,
        currency: formData.currency || undefined,
        supplierId: formData.supplierId || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
        descriptionOverride: overrideDescription ? formData.descriptionOverride || undefined : undefined,
        materialsOverride: overrideMaterials ? formData.materialsOverride.filter(m => m.name.trim()) : undefined,
        certificationsOverride: overrideCertifications
          ? formData.certificationsOverride.map(name => ({ name, issuedBy: '', validUntil: '' }))
          : undefined,
        // Dimensions & Packaging overrides
        productHeightCm: overrideDimensions && formData.productHeightCm ? Number(formData.productHeightCm) : undefined,
        productWidthCm: overrideDimensions && formData.productWidthCm ? Number(formData.productWidthCm) : undefined,
        productDepthCm: overrideDimensions && formData.productDepthCm ? Number(formData.productDepthCm) : undefined,
        packagingType: overrideDimensions ? formData.packagingType || undefined : undefined,
        packagingDescription: overrideDimensions ? formData.packagingDescription || undefined : undefined,
        packagingHeightCm: overrideDimensions && formData.packagingHeightCm ? Number(formData.packagingHeightCm) : undefined,
        packagingWidthCm: overrideDimensions && formData.packagingWidthCm ? Number(formData.packagingWidthCm) : undefined,
        packagingDepthCm: overrideDimensions && formData.packagingDepthCm ? Number(formData.packagingDepthCm) : undefined,
      };

      if (isEditMode && batchId) {
        const result = await updateBatch(batchId, batchData);
        if (result.success) {
          navigate(`/products/${productId}/batches/${batchId}`);
        } else {
          setSubmitError(result.error || 'Batch could not be saved.');
        }
      } else {
        const result = await createBatch(batchData);
        if (result.success) {
          navigate(`/products/${productId}?tab=batches`);
        } else {
          setSubmitError(result.error || 'Batch could not be created.');
        }
      }
    } catch {
      setSubmitError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={isEditMode ? `/products/${productId}/batches/${batchId}` : `/products/${productId}?tab=batches`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditMode ? 'Edit Batch' : duplicateFromId ? 'Duplicate Batch' : 'New Batch'}
          </h1>
          <p className="text-muted-foreground">
            {product ? `${product.name} (GTIN: ${product.gtin})` : 'Loading...'}
          </p>
        </div>
      </div>

      {/* Product Info (read-only) */}
      {product && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Layers className="h-5 w-5 text-primary" />
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Product: </span>
                  <span className="font-medium">{product.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">GTIN: </span>
                  <code className="font-mono">{product.gtin}</code>
                </div>
                <div>
                  <span className="text-muted-foreground">Category: </span>
                  <span>{product.category}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Information</CardTitle>
          <CardDescription>Batch-specific data for this product</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Serial Number *</label>
              <Input
                placeholder="e.g. SN-2025-001234"
                value={formData.serialNumber}
                onChange={(e) => updateField('serialNumber', e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Unique DPP identifier for this batch</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Batch Number</label>
              <Input
                placeholder="e.g. LOT-2025-001"
                value={formData.batchNumber}
                onChange={(e) => updateField('batchNumber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Production Date *</label>
              <Input
                type="date"
                value={formData.productionDate}
                onChange={(e) => updateField('productionDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Expiration Date</label>
              <Input
                type="date"
                value={formData.expirationDate}
                onChange={(e) => updateField('expirationDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Net Weight (g)</label>
              <Input
                type="number"
                placeholder="e.g. 250"
                value={formData.netWeight}
                onChange={(e) => updateField('netWeight', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Gross Weight (g)</label>
              <Input
                type="number"
                placeholder="e.g. 320"
                value={formData.grossWeight}
                onChange={(e) => updateField('grossWeight', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity (pcs)</label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 500"
                value={formData.quantity}
                onChange={(e) => updateField('quantity', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Number of products in this batch</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Optional notes about this batch..."
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing & Supplier */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {t('Pricing & Supplier')}
          </CardTitle>
          <CardDescription>{t('Unit price, currency and supplier for this batch')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium">{t('Supplier')}</label>
              <Select
                value={formData.supplierId}
                onValueChange={(v) => updateField('supplierId', v === '_none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('Select supplier...')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {productSuppliers.map((sp) => (
                    <SelectItem key={sp.supplier_id} value={sp.supplier_id}>
                      {sp.supplier_name} ({sp.supplier_country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('Price per Unit')}</label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.pricePerUnit}
                  onChange={(e) => updateField('pricePerUnit', e.target.value)}
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  {formData.currency}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('Currency')}</label>
              <Select value={formData.currency} onValueChange={(v) => updateField('currency', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {totalPrice > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">{t('Total Price')}</p>
                <p className="text-lg font-bold">{formatCurrency(totalPrice, formData.currency, locale)}</p>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">
                {formData.quantity} {t('pcs')} × {formatCurrency(parseFloat(formData.pricePerUnit) || 0, formData.currency, locale)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overrides Section */}
      <Card>
        <CardHeader>
          <CardTitle>Override Master Data</CardTitle>
          <CardDescription>
            Optionally override product master data for this specific batch.
            Fields left disabled will inherit from the product.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description Override */}
          <div className="border rounded-lg">
            <button
              type="button"
              className="flex items-center justify-between w-full p-4 text-left"
              onClick={() => setOverrideDescription(!overrideDescription)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={overrideDescription}
                  onChange={(e) => setOverrideDescription(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="font-medium">Override Description</span>
                {overrideDescription && <Badge variant="outline" className="border-primary text-primary">Active</Badge>}
              </div>
              {overrideDescription ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {overrideDescription && (
              <div className="px-4 pb-4">
                <textarea
                  className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Batch-specific description..."
                  value={formData.descriptionOverride}
                  onChange={(e) => updateField('descriptionOverride', e.target.value)}
                />
                {product?.description && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Product default: {product.description.slice(0, 100)}
                    {product.description.length > 100 ? '...' : ''}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Materials Override */}
          <div className="border rounded-lg">
            <button
              type="button"
              className="flex items-center justify-between w-full p-4 text-left"
              onClick={() => setOverrideMaterials(!overrideMaterials)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={overrideMaterials}
                  onChange={(e) => setOverrideMaterials(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="font-medium">Override Materials</span>
                {overrideMaterials && <Badge variant="outline" className="border-primary text-primary">Active</Badge>}
              </div>
              {overrideMaterials ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {overrideMaterials && (
              <div className="px-4 pb-4 space-y-4">
                {formData.materialsOverride.map((material, index) => (
                  <div key={index} className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 p-3 border rounded-lg">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Material</label>
                      <Input
                        placeholder="e.g. Recycled PET"
                        value={material.name}
                        onChange={(e) => updateMaterial(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Share (%)</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={material.percentage}
                        onChange={(e) => updateMaterial(index, 'percentage', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Origin</label>
                      <Input
                        placeholder="e.g. Germany"
                        value={material.origin || ''}
                        onChange={(e) => updateMaterial(index, 'origin', e.target.value)}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-2 h-9">
                        <input
                          type="checkbox"
                          checked={material.recyclable}
                          onChange={(e) => updateMaterial(index, 'recyclable', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-sm">Recyclable</span>
                      </label>
                      {formData.materialsOverride.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeMaterial(index)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addMaterial}>
                  Add Material
                </Button>
              </div>
            )}
          </div>

          {/* Certifications Override */}
          <div className="border rounded-lg">
            <button
              type="button"
              className="flex items-center justify-between w-full p-4 text-left"
              onClick={() => setOverrideCertifications(!overrideCertifications)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={overrideCertifications}
                  onChange={(e) => setOverrideCertifications(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="font-medium">Override Certifications</span>
                {overrideCertifications && <Badge variant="outline" className="border-primary text-primary">Active</Badge>}
              </div>
              {overrideCertifications ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {overrideCertifications && (
              <div className="px-4 pb-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    'CE-Kennzeichnung',
                    'EU Ecolabel',
                    'OEKO-TEX Standard 100',
                    'Fair Trade',
                    'GRS (Global Recycled Standard)',
                    'GOTS (Global Organic Textile Standard)',
                    'FSC',
                    'Blauer Engel',
                  ].map((cert) => (
                    <label
                      key={cert}
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={formData.certificationsOverride.includes(cert)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData((prev) => ({
                              ...prev,
                              certificationsOverride: [...prev.certificationsOverride, cert],
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              certificationsOverride: prev.certificationsOverride.filter((c) => c !== cert),
                            }));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">{cert}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dimensions & Packaging Override */}
          <div className="border rounded-lg">
            <button
              type="button"
              className="flex items-center justify-between w-full p-4 text-left"
              onClick={() => setOverrideDimensions(!overrideDimensions)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={overrideDimensions}
                  onChange={(e) => setOverrideDimensions(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="font-medium">{t('Override Dimensions & Packaging')}</span>
                {overrideDimensions && <Badge variant="outline" className="border-primary text-primary">Active</Badge>}
              </div>
              {overrideDimensions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {overrideDimensions && (
              <div className="px-4 pb-4 space-y-6">
                {/* Packaging Details */}
                <div>
                  <h4 className="text-sm font-medium mb-3">{t('Packaging Details')}</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">{t('Packaging Type')}</label>
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
                      <label className="text-xs text-muted-foreground">{t('Packaging Description')}</label>
                      <textarea
                        className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder={t('Describe the packaging...')}
                        value={formData.packagingDescription}
                        onChange={(e) => updateField('packagingDescription', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                {/* Dimensions */}
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Product Dimensions */}
                  <div className="p-3 border rounded-lg">
                    <h4 className="text-xs font-medium mb-3">{t('Product Dimensions')}</h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t('Height (cm)')}</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder={t('e.g. 10')}
                          value={formData.productHeightCm}
                          onChange={(e) => updateField('productHeightCm', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t('Width (cm)')}</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder={t('e.g. 20')}
                          value={formData.productWidthCm}
                          onChange={(e) => updateField('productWidthCm', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t('Depth (cm)')}</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder={t('e.g. 5')}
                          value={formData.productDepthCm}
                          onChange={(e) => updateField('productDepthCm', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Packaging Dimensions */}
                  <div className="p-3 border rounded-lg">
                    <h4 className="text-xs font-medium mb-3">{t('Packaging Dimensions')}</h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t('Height (cm)')}</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder={t('e.g. 10')}
                          value={formData.packagingHeightCm}
                          onChange={(e) => updateField('packagingHeightCm', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t('Width (cm)')}</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder={t('e.g. 20')}
                          value={formData.packagingWidthCm}
                          onChange={(e) => updateField('packagingWidthCm', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t('Depth (cm)')}</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder={t('e.g. 5')}
                          value={formData.packagingDepthCm}
                          onChange={(e) => updateField('packagingDepthCm', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {product && (product.productHeightCm || product.productWidthCm || product.productDepthCm || product.packagingType) && (
                  <p className="text-xs text-muted-foreground">
                    Product defaults: {product.productHeightCm && `H: ${product.productHeightCm}cm`}
                    {product.productWidthCm && ` W: ${product.productWidthCm}cm`}
                    {product.productDepthCm && ` D: ${product.productDepthCm}cm`}
                    {product.packagingType && ` | Packaging: ${t(`packaging.${product.packagingType}`)}`}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link to={isEditMode ? `/products/${productId}/batches/${batchId}` : `/products/${productId}?tab=batches`}>
            Cancel
          </Link>
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Batch'}
        </Button>
      </div>

      {submitError && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {submitError}
        </div>
      )}
    </div>
  );
}
