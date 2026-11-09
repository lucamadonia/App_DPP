import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import {
  ArrowLeft,
  Save,
  Loader2,
  Hash,
  Boxes,
  Wallet,
  SlidersHorizontal,
  FilePen,
  Radio,
  Archive,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { FormGrid, FormField, InputAffix, ChoiceCards, FormToggleRow, FormSectionNav } from '@/components/ui/form-layout';
import { FormWizard } from '@/components/ui/form-wizard';
import { StickyBottomBar } from '@/components/layout/sticky-bottom-bar';
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
  const [showIdentityErrors, setShowIdentityErrors] = useState(false);
  const [editSection, setEditSection] = useState('identity');

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

  const identityStep = (
    <FormGrid cols={2}>
      <FormField label={t('Serial Number')} htmlFor="batch-serial" required span="full" hint={t('Unique DPP identifier for this batch')}
        error={showIdentityErrors && !formData.serialNumber.trim() ? t('Serial number is required.') : undefined}>
        <Input
          id="batch-serial"
          placeholder="SN-2025-001234"
          value={formData.serialNumber}
          onChange={(e) => updateField('serialNumber', e.target.value)}
          className="font-mono"
          autoCapitalize="characters"
          spellCheck={false}
        />
      </FormField>
      <FormField label={t('Batch Number')} htmlFor="batch-number" optional span="full">
        <Input
          id="batch-number"
          placeholder="LOT-2025-001"
          value={formData.batchNumber}
          onChange={(e) => updateField('batchNumber', e.target.value)}
          className="font-mono"
          autoCapitalize="characters"
          spellCheck={false}
        />
      </FormField>
      <FormField
        label={t('Production Date')}
        htmlFor="batch-production"
        required
        error={showIdentityErrors && !formData.productionDate ? t('Production date is required.') : undefined}
      >
        <Input
          id="batch-production"
          type="date"
          value={formData.productionDate}
          onChange={(e) => updateField('productionDate', e.target.value)}
        />
      </FormField>
      <FormField label={t('Expiration Date')} htmlFor="batch-expiration" optional>
        <Input
          id="batch-expiration"
          type="date"
          value={formData.expirationDate}
          onChange={(e) => updateField('expirationDate', e.target.value)}
        />
      </FormField>
    </FormGrid>
  );

  const quantityStep = (
    <FormGrid cols={2}>
      <FormField label={t('Quantity')} htmlFor="batch-quantity" optional span="full" hint={t('Number of products in this batch')}>
        <InputAffix suffix={t('pcs')}>
          <Input
            id="batch-quantity"
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="500"
            className="tabular-nums"
            value={formData.quantity}
            onChange={(e) => updateField('quantity', e.target.value)}
          />
        </InputAffix>
      </FormField>
      <FormField label={t('Net Weight')} htmlFor="batch-net" optional>
        <InputAffix suffix="g">
          <Input
            id="batch-net"
            type="number"
            inputMode="decimal"
            placeholder="250"
            className="tabular-nums"
            value={formData.netWeight}
            onChange={(e) => updateField('netWeight', e.target.value)}
          />
        </InputAffix>
      </FormField>
      <FormField label={t('Gross Weight')} htmlFor="batch-gross" optional>
        <InputAffix suffix="g">
          <Input
            id="batch-gross"
            type="number"
            inputMode="decimal"
            placeholder="320"
            className="tabular-nums"
            value={formData.grossWeight}
            onChange={(e) => updateField('grossWeight', e.target.value)}
          />
        </InputAffix>
      </FormField>
      <FormField label={t('Status')} span="full">
        <ChoiceCards<'draft' | 'live' | 'archived'>
          value={formData.status}
          onValueChange={(v) => updateField('status', v)}
          columns={3}
          options={[
            { value: 'draft', label: t('Draft'), icon: FilePen },
            { value: 'live', label: t('Live'), icon: Radio },
            { value: 'archived', label: t('Archived'), icon: Archive },
          ]}
        />
      </FormField>
    </FormGrid>
  );

  const pricingStep = (
    <div className="space-y-5">
      <FormGrid cols={2}>
        <FormField label={t('Supplier')} optional span="full" htmlFor="batch-supplier">
          <Select
            value={formData.supplierId}
            onValueChange={(v) => updateField('supplierId', v === '_none' ? '' : v)}
          >
            <SelectTrigger id="batch-supplier" className="w-full">
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
        </FormField>
        <FormField label={t('Price per Unit')} htmlFor="batch-price" optional>
          <InputAffix suffix={formData.currency}>
            <Input
              id="batch-price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="tabular-nums"
              value={formData.pricePerUnit}
              onChange={(e) => updateField('pricePerUnit', e.target.value)}
            />
          </InputAffix>
        </FormField>
        <FormField label={t('Currency')} htmlFor="batch-currency">
          <Select value={formData.currency} onValueChange={(v) => updateField('currency', v)}>
            <SelectTrigger id="batch-currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </FormGrid>
      {totalPrice > 0 && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-lg border bg-muted/40 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">{t('Total Price')}</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(totalPrice, formData.currency, locale)}</p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formData.quantity} {t('pcs')} × {formatCurrency(parseFloat(formData.pricePerUnit) || 0, formData.currency, locale)}
          </span>
        </div>
      )}
      <FormField label={t('Notes')} htmlFor="batch-notes" optional>
        <Textarea
          id="batch-notes"
          placeholder={t('Optional notes about this batch...')}
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={3}
        />
      </FormField>
    </div>
  );

  const overridesStep = (
    <div className="space-y-3">
      <p className="text-sm text-pretty text-muted-foreground">
        {t('Optionally override product master data for this specific batch. Fields left disabled will inherit from the product.')}
      </p>

      {/* Description Override */}
      <div className="rounded-lg border bg-background">
        <FormToggleRow label={t('Override Description')} htmlFor="ov-description" bordered={false} className="p-3 sm:p-4">
          <Switch id="ov-description" checked={overrideDescription} onCheckedChange={setOverrideDescription} />
        </FormToggleRow>
        {overrideDescription && (
          <div className="border-t px-3 pb-4 pt-4 sm:px-4">
            <FormField
              label={t('Batch Description')}
              hint={product?.description ? `${t('Product default')}: ${product.description.slice(0, 100)}${product.description.length > 100 ? '…' : ''}` : undefined}
            >
              <Textarea
                placeholder={t('Batch-specific description...')}
                value={formData.descriptionOverride}
                onChange={(e) => updateField('descriptionOverride', e.target.value)}
                rows={3}
              />
            </FormField>
          </div>
        )}
      </div>

      {/* Materials Override */}
      <div className="rounded-lg border bg-background">
        <FormToggleRow label={t('Override Materials')} htmlFor="ov-materials" bordered={false} className="p-3 sm:p-4">
          <Switch id="ov-materials" checked={overrideMaterials} onCheckedChange={setOverrideMaterials} />
        </FormToggleRow>
        {overrideMaterials && (
          <div className="space-y-3 border-t px-3 pb-4 pt-4 sm:px-4">
            {formData.materialsOverride.map((material, index) => (
              <div key={index} className="rounded-lg border bg-card p-3">
                <FormGrid cols={6}>
                  <FormField label={t('Material')} span={3}>
                    <Input
                      placeholder={t('e.g. Recycled PET')}
                      value={material.name}
                      onChange={(e) => updateMaterial(index, 'name', e.target.value)}
                    />
                  </FormField>
                  <FormField label={t('Share')} span={3}>
                    <InputAffix suffix="%">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max="100"
                        className="tabular-nums"
                        value={material.percentage}
                        onChange={(e) => updateMaterial(index, 'percentage', parseInt(e.target.value) || 0)}
                      />
                    </InputAffix>
                  </FormField>
                  <FormField label={t('Origin')} optional span={3}>
                    <Input
                      placeholder={t('e.g. Germany')}
                      value={material.origin || ''}
                      onChange={(e) => updateMaterial(index, 'origin', e.target.value)}
                    />
                  </FormField>
                  <div className="flex items-end gap-2 @md:col-span-3">
                    <FormToggleRow label={t('Recyclable')} htmlFor={`ov-mat-rec-${index}`} className="flex-1">
                      <Switch
                        id={`ov-mat-rec-${index}`}
                        checked={material.recyclable}
                        onCheckedChange={(v) => updateMaterial(index, 'recyclable', v)}
                      />
                    </FormToggleRow>
                    {formData.materialsOverride.length > 1 && (
                      <Button variant="ghost" size="icon" className="mb-1 shrink-0 pointer-coarse:size-11" aria-label={t('Remove', { ns: 'common' })} onClick={() => removeMaterial(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </FormGrid>
              </div>
            ))}
            <Button variant="outline" size="sm" className="pointer-coarse:min-h-11" onClick={addMaterial}>
              <Plus className="mr-2 h-4 w-4" />
              {t('Add Material')}
            </Button>
          </div>
        )}
      </div>

      {/* Certifications Override */}
      <div className="rounded-lg border bg-background">
        <FormToggleRow label={t('Override Certifications')} htmlFor="ov-certs" bordered={false} className="p-3 sm:p-4">
          <Switch id="ov-certs" checked={overrideCertifications} onCheckedChange={setOverrideCertifications} />
        </FormToggleRow>
        {overrideCertifications && (
          <div className="grid gap-2 border-t px-3 pb-4 pt-4 sm:grid-cols-2 sm:px-4">
            {[
              'CE-Kennzeichnung',
              'EU Ecolabel',
              'OEKO-TEX Standard 100',
              'Fair Trade',
              'GRS (Global Recycled Standard)',
              'GOTS (Global Organic Textile Standard)',
              'FSC',
              'Blauer Engel',
            ].map((cert) => {
              const certId = `ov-cert-${cert.replace(/[^a-z0-9]+/gi, '-')}`;
              return (
                <FormToggleRow key={cert} label={cert} htmlFor={certId} controlPosition="start">
                  <Checkbox
                    id={certId}
                    checked={formData.certificationsOverride.includes(cert)}
                    onCheckedChange={(checked) => {
                      if (checked) {
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
                  />
                </FormToggleRow>
              );
            })}
          </div>
        )}
      </div>

      {/* Dimensions & Packaging Override */}
      <div className="rounded-lg border bg-background">
        <FormToggleRow label={t('Override Dimensions & Packaging')} htmlFor="ov-dims" bordered={false} className="p-3 sm:p-4">
          <Switch id="ov-dims" checked={overrideDimensions} onCheckedChange={setOverrideDimensions} />
        </FormToggleRow>
        {overrideDimensions && (
          <div className="space-y-5 border-t px-3 pb-4 pt-4 sm:px-4">
            <FormGrid cols={2}>
              <FormField label={t('Packaging Type')} span="full" htmlFor="batch-packaging-type">
                <Select
                  value={formData.packagingType || ''}
                  onValueChange={(v) => updateField('packagingType', v)}
                >
                  <SelectTrigger id="batch-packaging-type" className="w-full">
                    <SelectValue placeholder={t('Select packaging type...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(['box', 'blister', 'bottle', 'pouch', 'can', 'tube', 'bag', 'clamshell', 'wrap', 'pallet', 'other'] as const).map((pt) => (
                      <SelectItem key={pt} value={pt}>{t(`packaging.${pt}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={t('Packaging Description')} optional span="full">
                <Textarea
                  placeholder={t('Describe the packaging...')}
                  value={formData.packagingDescription}
                  onChange={(e) => updateField('packagingDescription', e.target.value)}
                  rows={2}
                />
              </FormField>
            </FormGrid>
            {([
              { title: t('Product Dimensions'), keys: ['productHeightCm', 'productWidthCm', 'productDepthCm'] as const },
              { title: t('Packaging Dimensions'), keys: ['packagingHeightCm', 'packagingWidthCm', 'packagingDepthCm'] as const },
            ]).map((group) => (
              <fieldset key={group.title} className="min-w-0">
                <legend className="mb-2 text-sm font-medium">{group.title}</legend>
                <div className="grid grid-cols-3 gap-2 pointer-coarse:[&_[data-slot=input-affix]]:h-11">
                  {group.keys.map((key, i) => (
                    <InputAffix key={key} suffix="cm">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="0"
                        aria-label={`${group.title} – ${[t('Height'), t('Width'), t('Depth')][i]}`}
                        placeholder={[t('Height'), t('Width'), t('Depth')][i]}
                        className="tabular-nums"
                        value={formData[key]}
                        onChange={(e) => updateField(key, e.target.value)}
                      />
                    </InputAffix>
                  ))}
                </div>
              </fieldset>
            ))}
            {product && (product.productHeightCm || product.productWidthCm || product.productDepthCm || product.packagingType) && (
              <p className="text-xs text-muted-foreground tabular-nums">
                {t('Product default')}: {product.productHeightCm && `H: ${product.productHeightCm}cm`}
                {product.productWidthCm && ` W: ${product.productWidthCm}cm`}
                {product.productDepthCm && ` D: ${product.productDepthCm}cm`}
                {product.packagingType && ` | ${t('Packaging')}: ${t(`packaging.${product.packagingType}`)}`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const batchSteps = [
    { id: 'identity', title: t('Batch & Dates'), description: t('Serial number, batch number and production dates'), icon: Hash, content: identityStep },
    { id: 'quantity', title: t('Quantity & Status'), description: t('How many units, their weight and the passport status'), icon: Boxes, content: quantityStep },
    { id: 'pricing', title: t('Pricing & Supplier'), description: t('Unit price, currency and supplier for this batch'), icon: Wallet, content: pricingStep },
    { id: 'overrides', title: t('Overrides'), description: t('Batch-specific differences from the product'), icon: SlidersHorizontal, content: overridesStep },
  ];
  const activeEditStep = batchSteps.find(s => s.id === editSection) ?? batchSteps[0];

  const errorBanner = submitError && (
    <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
      {t(submitError)}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="pointer-coarse:size-11" asChild>
          <Link
            to={isEditMode ? `/products/${productId}/batches/${batchId}` : `/products/${productId}?tab=batches`}
            aria-label={t('Back', { ns: 'common' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground text-balance">
            {isEditMode ? t('Edit Batch') : duplicateFromId ? t('Duplicate Batch') : t('New Batch')}
          </h1>
          {product && (
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <span className="min-w-0 max-w-full truncate font-medium text-foreground">{product.name}</span>
              <code className="font-mono text-xs tabular-nums">{product.gtin}</code>
              {product.category && <span className="truncate">· {product.category}</span>}
            </p>
          )}
        </div>
      </div>

      {isEditMode ? (
        <>
          <FormSectionNav
            sections={batchSteps.map(s => ({ id: s.id, label: s.title, icon: s.icon }))}
            value={activeEditStep.id}
            onValueChange={setEditSection}
            label={t('Sections', { ns: 'common' })}
          >
            <div className="rounded-xl border bg-card p-4 shadow-xs sm:p-6">
              <header className="mb-5">
                <h2 className="text-lg font-semibold tracking-tight">{activeEditStep.title}</h2>
                <p className="mt-1 text-sm text-pretty text-muted-foreground">{activeEditStep.description}</p>
              </header>
              {activeEditStep.content}
            </div>
          </FormSectionNav>
          {errorBanner}
          <StickyBottomBar>
            <Button variant="ghost" asChild>
              <Link to={`/products/${productId}/batches/${batchId}`}>{t('Cancel', { ns: 'common' })}</Link>
            </Button>
            <Button className="min-w-0 flex-1 sm:flex-none sm:min-w-32" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSubmitting ? t('Saving...') : t('Save Changes')}
            </Button>
          </StickyBottomBar>
        </>
      ) : (
        <div className="rounded-xl border bg-card p-4 shadow-xs sm:p-6">
          <FormWizard
            variant="page"
            steps={batchSteps.map(s => s.id === 'identity'
              ? {
                  ...s,
                  validate: () => {
                    setShowIdentityErrors(true);
                    return Boolean(formData.serialNumber.trim() && formData.productionDate);
                  },
                }
              : s)}
            onCancel={() => navigate(`/products/${productId}?tab=batches`)}
            onFinish={handleSubmit}
            finishing={isSubmitting}
            finishLabel={isSubmitting ? t('Saving...') : t('Create Batch')}
          />
          {errorBanner && <div className="mt-4">{errorBanner}</div>}
        </div>
      )}
    </div>
  );
}
