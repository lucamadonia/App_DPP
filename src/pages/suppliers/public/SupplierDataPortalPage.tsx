/**
 * Public Supplier Data Portal
 * Password-protected page where suppliers fill in product/batch data
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2,
  Lock,
  Package,
  Languages,
  Layers,
  Plus,
  Save,
  Send,
  AlertCircle,
  Info,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { applyPrimaryColor } from '@/lib/dynamic-theme';
import {
  getSupplierDataRequestByCode,
  publicGetProductForDataRequest,
  publicSubmitProductData,
  publicSubmitBatchData,
  publicCreateBatch,
  publicMarkDataRequestSubmitted,
  publicMarkDataRequestInProgress,
} from '@/services/supabase/supplier-data-portal';
import { PRODUCT_FIELD_GROUPS, BATCH_FIELD_GROUPS } from '@/lib/supplier-data-fields';
import type { PublicSupplierDataRequestResult, FieldDefinition } from '@/types/supplier-data-portal';

// ─── Password Hashing ─────────────────────────────────────────────────────
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Column-to-CamelCase mapping for reading product data ──────────────────
const COLUMN_TO_CAMEL: Record<string, string> = {
  name: 'name', manufacturer: 'manufacturer', gtin: 'gtin', description: 'description',
  category: 'category', country_of_origin: 'countryOfOrigin', materials: 'materials',
  recyclability: 'recyclability', certifications: 'certifications', carbon_footprint: 'carbonFootprint',
  hs_code: 'hsCode', net_weight: 'netWeight', gross_weight: 'grossWeight',
  manufacturer_address: 'manufacturerAddress', manufacturer_eori: 'manufacturerEORI',
  manufacturer_vat: 'manufacturerVAT', product_height_cm: 'productHeightCm',
  product_width_cm: 'productWidthCm', product_depth_cm: 'productDepthCm',
  packaging_type: 'packagingType', packaging_description: 'packagingDescription',
  packaging_height_cm: 'packagingHeightCm', packaging_width_cm: 'packagingWidthCm',
  packaging_depth_cm: 'packagingDepthCm', importer_name: 'importerName',
  importer_eori: 'importerEORI', authorized_representative: 'authorizedRepresentative',
  substances_of_concern: 'substancesOfConcern', durability_years: 'durabilityYears',
  repairability_score: 'repairabilityScore', ce_marking: 'ceMarking',
  eu_declaration_of_conformity: 'euDeclarationOfConformity',
  recycled_content_percentage: 'recycledContentPercentage',
  energy_consumption_kwh: 'energyConsumptionKWh',
  // batch fields
  batch_number: 'batchNumber', serial_number: 'serialNumber', production_date: 'productionDate',
  expiration_date: 'expirationDate', status: 'status', quantity: 'quantity',
  price_per_unit: 'pricePerUnit', currency: 'currency',
  description_override: 'descriptionOverride', materials_override: 'materialsOverride',
  certifications_override: 'certificationsOverride', carbon_footprint_override: 'carbonFootprintOverride',
};

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = COLUMN_TO_CAMEL[key] || key;
    result[camelKey] = value;
  }
  return result;
}

// ─── Dynamic Field Renderer ────────────────────────────────────────────────

interface FieldRendererProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  t: (key: string) => string;
}

function MaterialsEditor({ value, onChange, t }: { value: unknown; onChange: (v: unknown) => void; t: (key: string) => string }) {
  const items = Array.isArray(value) ? value : [];
  const addItem = () => onChange([...items, { name: '', percentage: 0, recyclable: false }]);
  const removeItem = (i: number) => onChange(items.filter((_: unknown, idx: number) => idx !== i));
  const updateItem = (i: number, key: string, val: unknown) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [key]: val };
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {items.map((item: Record<string, unknown>, i: number) => (
        <div key={i} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <Label className="text-xs">{t('Name')}</Label>
              <Input size={1} value={(item.name as string) || ''} onChange={e => updateItem(i, 'name', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{t('Percentage')}</Label>
              <Input type="number" min={0} max={100} value={(item.percentage as number) || 0} onChange={e => updateItem(i, 'percentage', Number(e.target.value))} />
            </div>
            <div className="flex items-end gap-1">
              <Checkbox checked={!!item.recyclable} onCheckedChange={c => updateItem(i, 'recyclable', !!c)} />
              <Label className="text-xs">{t('Recyclable')}</Label>
            </div>
            <div>
              <Label className="text-xs">{t('Origin')}</Label>
              <Input size={1} value={(item.origin as string) || ''} onChange={e => updateItem(i, 'origin', e.target.value)} />
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" className="mt-5" onClick={() => removeItem(i)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="mr-1 h-3 w-3" /> {t('Add Entry')}
      </Button>
    </div>
  );
}

function CertificationsEditor({ value, onChange, t }: { value: unknown; onChange: (v: unknown) => void; t: (key: string) => string }) {
  const items = Array.isArray(value) ? value : [];
  const addItem = () => onChange([...items, { name: '', issuedBy: '', validUntil: '' }]);
  const removeItem = (i: number) => onChange(items.filter((_: unknown, idx: number) => idx !== i));
  const updateItem = (i: number, key: string, val: unknown) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [key]: val };
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {items.map((item: Record<string, unknown>, i: number) => (
        <div key={i} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">{t('Name')}</Label>
              <Input size={1} value={(item.name as string) || ''} onChange={e => updateItem(i, 'name', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{t('Issued By')}</Label>
              <Input size={1} value={(item.issuedBy as string) || ''} onChange={e => updateItem(i, 'issuedBy', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{t('Valid Until')}</Label>
              <Input type="date" value={(item.validUntil as string) || ''} onChange={e => updateItem(i, 'validUntil', e.target.value)} />
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" className="mt-5" onClick={() => removeItem(i)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="mr-1 h-3 w-3" /> {t('Add Entry')}
      </Button>
    </div>
  );
}

function CarbonFootprintEditor({ value, onChange, t }: { value: unknown; onChange: (v: unknown) => void; t: (key: string) => string }) {
  const obj = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const update = (key: string, val: unknown) => onChange({ ...obj, [key]: val });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg border bg-muted/30">
      <div>
        <Label className="text-xs">{t('Total CO₂ (kg)')}</Label>
        <Input type="number" min={0} value={(obj.totalKgCO2 as number) || ''} onChange={e => update('totalKgCO2', Number(e.target.value))} />
      </div>
      <div>
        <Label className="text-xs">{t('Production CO₂ (kg)')}</Label>
        <Input type="number" min={0} value={(obj.productionKgCO2 as number) || ''} onChange={e => update('productionKgCO2', Number(e.target.value))} />
      </div>
      <div>
        <Label className="text-xs">{t('Transport CO₂ (kg)')}</Label>
        <Input type="number" min={0} value={(obj.transportKgCO2 as number) || ''} onChange={e => update('transportKgCO2', Number(e.target.value))} />
      </div>
      <div>
        <Label className="text-xs">{t('Rating')}</Label>
        <Input value={(obj.rating as string) || ''} onChange={e => update('rating', e.target.value)} placeholder="A-E" />
      </div>
    </div>
  );
}

function RecyclabilityEditor({ value, onChange, t }: { value: unknown; onChange: (v: unknown) => void; t: (key: string) => string }) {
  const obj = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const update = (key: string, val: unknown) => onChange({ ...obj, [key]: val });

  return (
    <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{t('Recyclable Percentage')}</Label>
          <Input type="number" min={0} max={100} value={(obj.recyclablePercentage as number) || ''} onChange={e => update('recyclablePercentage', Number(e.target.value))} />
        </div>
        <div>
          <Label className="text-xs">{t('Instructions')}</Label>
          <Input value={(obj.instructions as string) || ''} onChange={e => update('instructions', e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-xs">{t('Disposal Methods')}</Label>
        <Input
          value={Array.isArray(obj.disposalMethods) ? (obj.disposalMethods as string[]).join(', ') : ''}
          onChange={e => update('disposalMethods', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          placeholder="Method 1, Method 2"
        />
      </div>
    </div>
  );
}

function FieldRenderer({ field, value, onChange, t }: FieldRendererProps) {
  const handleChange = (val: unknown) => onChange(field.key, val);

  // Special JSONB editors
  if (field.key === 'materials' || field.key === 'materialsOverride') {
    return <MaterialsEditor value={value} onChange={handleChange} t={t} />;
  }
  if (field.key === 'certifications' || field.key === 'certificationsOverride') {
    return <CertificationsEditor value={value} onChange={handleChange} t={t} />;
  }
  if (field.key === 'carbonFootprint' || field.key === 'carbonFootprintOverride') {
    return <CarbonFootprintEditor value={value} onChange={handleChange} t={t} />;
  }
  if (field.key === 'recyclability') {
    return <RecyclabilityEditor value={value} onChange={handleChange} t={t} />;
  }
  if (field.key === 'substancesOfConcern') {
    // Simplified: just show as JSON-like text editor
    return (
      <Textarea
        value={typeof value === 'string' ? value : JSON.stringify(value || [], null, 2)}
        onChange={e => {
          try { handleChange(JSON.parse(e.target.value)); } catch { /* ignore invalid JSON */ }
        }}
        rows={4}
        className="font-mono text-sm"
      />
    );
  }
  if (field.key === 'authorizedRepresentative') {
    const obj = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    const update = (k: string, v: unknown) => handleChange({ ...obj, [k]: v });
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/30">
        <div>
          <Label className="text-xs">{t('Name')}</Label>
          <Input value={(obj.name as string) || ''} onChange={e => update('name', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input value={(obj.email as string) || ''} onChange={e => update('email', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Address</Label>
          <Input value={(obj.address as string) || ''} onChange={e => update('address', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">EORI</Label>
          <Input value={(obj.eori as string) || ''} onChange={e => update('eori', e.target.value)} />
        </div>
      </div>
    );
  }

  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          value={(value as string) || ''}
          onChange={e => handleChange(e.target.value)}
          rows={3}
        />
      );
    case 'number':
      return (
        <Input
          type="number"
          value={value != null ? String(value) : ''}
          onChange={e => handleChange(e.target.value ? Number(e.target.value) : null)}
        />
      );
    case 'date':
      return (
        <Input
          type="date"
          value={(value as string) || ''}
          onChange={e => handleChange(e.target.value)}
        />
      );
    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={!!value}
            onCheckedChange={c => handleChange(!!c)}
          />
          <span className="text-sm">{t(field.labelKey)}</span>
        </div>
      );
    case 'select':
      if (field.key === 'status') {
        return (
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            value={(value as string) || ''}
            onChange={e => handleChange(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="live">Live</option>
            <option value="archived">Archived</option>
          </select>
        );
      }
      if (field.key === 'packagingType') {
        return (
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            value={(value as string) || ''}
            onChange={e => handleChange(e.target.value)}
          >
            <option value="">—</option>
            {['box', 'blister', 'bottle', 'pouch', 'can', 'tube', 'bag', 'clamshell', 'wrap', 'pallet', 'other'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        );
      }
      return <Input value={(value as string) || ''} onChange={e => handleChange(e.target.value)} />;
    default:
      return (
        <Input
          value={(value as string) || ''}
          onChange={e => handleChange(e.target.value)}
        />
      );
  }
}

// ─── Main Page Component ───────────────────────────────────────────────────

export function SupplierDataPortalPage() {
  const { accessCode } = useParams<{ accessCode: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('supplier-data-portal');
  const { toast } = useToast();
  const currentLang = i18n.language?.startsWith('de') ? 'de' : 'en';

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestInfo, setRequestInfo] = useState<PublicSupplierDataRequestResult | null>(null);

  // Password gate
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordHash, setPasswordHash] = useState('');

  // Product/Batch data
  const [productData, setProductData] = useState<Record<string, unknown>>({});
  const [batches, setBatches] = useState<Record<string, unknown>[]>([]);
  const [batchEdits, setBatchEdits] = useState<Record<string, Record<string, unknown>>>({});
  const [newBatches, setNewBatches] = useState<Record<string, unknown>[]>([]);

  // UI states
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [savingBatchId, setSavingBatchId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const toggleLanguage = () => {
    const newLang = currentLang === 'de' ? 'en' : 'de';
    i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
    localStorage.setItem('dpp-language', newLang);
  };

  // Load data request info
  useEffect(() => {
    async function load() {
      if (!accessCode) {
        setError('No access code');
        setIsLoading(false);
        return;
      }

      try {
        const result = await getSupplierDataRequestByCode(accessCode);
        if (!result) {
          setError('not_found');
          setIsLoading(false);
          return;
        }

        // Check status
        const { dataRequest } = result;
        if (dataRequest.status === 'expired' || new Date(dataRequest.expiresAt) < new Date()) {
          setError('expired');
        } else if (dataRequest.status === 'cancelled') {
          setError('cancelled');
        } else if (dataRequest.status === 'submitted') {
          setError('submitted');
        }

        // Apply branding
        if (result.branding.primaryColor) {
          applyPrimaryColor(result.branding.primaryColor);
        }

        setRequestInfo(result);
      } catch (err) {
        setError('not_found');
      }
      setIsLoading(false);
    }

    load();
  }, [accessCode]);

  // Handle password check
  const handlePasswordSubmit = async () => {
    if (!requestInfo) return;

    const hash = await hashPassword(passwordInput);
    if (hash === requestInfo.dataRequest.passwordHash) {
      setPasswordHash(hash);
      setIsAuthenticated(true);
      setPasswordError(false);

      // Mark as in_progress
      if (accessCode) {
        publicMarkDataRequestInProgress(accessCode);
      }

      // Load product data
      if (accessCode) {
        const data = await publicGetProductForDataRequest(accessCode);
        if (data) {
          setProductData(snakeToCamel(data.product));
          setBatches(data.batches.map(b => snakeToCamel(b)));
        }
      }
    } else {
      setPasswordError(true);
    }
  };

  // Product field change
  const handleProductFieldChange = (key: string, value: unknown) => {
    setProductData(prev => ({ ...prev, [key]: value }));
  };

  // Batch field change
  const handleBatchFieldChange = (batchId: string, key: string, value: unknown) => {
    setBatchEdits(prev => ({
      ...prev,
      [batchId]: { ...prev[batchId], [key]: value },
    }));
  };

  // New batch field change
  const handleNewBatchFieldChange = (index: number, key: string, value: unknown) => {
    setNewBatches(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };

  // Save product data
  const handleSaveProduct = async () => {
    if (!accessCode) return;
    setIsSavingProduct(true);
    try {
      await publicSubmitProductData(accessCode, passwordHash, productData);
      toast({ title: t('Product data saved') });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
    setIsSavingProduct(false);
  };

  // Save batch data
  const handleSaveBatch = async (batchId: string) => {
    if (!accessCode) return;
    setSavingBatchId(batchId);
    try {
      const edits = batchEdits[batchId] || {};
      await publicSubmitBatchData(accessCode, passwordHash, batchId, edits);
      toast({ title: t('Batch saved') });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
    setSavingBatchId(null);
  };

  // Create new batch
  const handleCreateBatch = async (index: number) => {
    if (!accessCode) return;
    setSavingBatchId(`new-${index}`);
    try {
      await publicCreateBatch(accessCode, passwordHash, newBatches[index]);
      toast({ title: t('Batch created') });
      // Reload data
      const data = await publicGetProductForDataRequest(accessCode);
      if (data) {
        setBatches(data.batches.map(b => snakeToCamel(b)));
      }
      // Remove the new batch form
      setNewBatches(prev => prev.filter((_, i) => i !== index));
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
    setSavingBatchId(null);
  };

  // Submit all
  const handleSubmitAll = async () => {
    if (!accessCode) return;
    setIsSubmitting(true);
    try {
      // Save product data first
      await publicSubmitProductData(accessCode, passwordHash, productData);

      // Save all batch edits
      for (const [batchId, edits] of Object.entries(batchEdits)) {
        if (Object.keys(edits).length > 0) {
          await publicSubmitBatchData(accessCode, passwordHash, batchId, edits);
        }
      }

      // Create new batches
      for (const newBatch of newBatches) {
        await publicCreateBatch(accessCode, passwordHash, newBatch);
      }

      // Mark as submitted
      await publicMarkDataRequestSubmitted(accessCode);

      // Navigate to success
      navigate(`/suppliers/data/${accessCode}/submitted`);
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
    setIsSubmitting(false);
    setShowSubmitConfirm(false);
  };

  // Get visible fields for a group based on allowed fields
  const getVisibleFields = useCallback(
    (groups: typeof PRODUCT_FIELD_GROUPS, allowedFields: string[]) => {
      return groups
        .map(group => ({
          ...group,
          fields: group.fields.filter(f => allowedFields.includes(f.key)),
        }))
        .filter(group => group.fields.length > 0);
    },
    [],
  );

  // ─── Loading State ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">{t('Loading...')}</p>
        </div>
      </div>
    );
  }

  // ─── Error States ──────────────────────────────────────────────────────
  if (error === 'not_found') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('Data Request Not Found')}</h2>
            <p className="text-muted-foreground">{t('The data request link is invalid or has been removed')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('expired')}</h2>
            <p className="text-muted-foreground">{t('This data request has expired')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error === 'cancelled') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('cancelled')}</h2>
            <p className="text-muted-foreground">{t('This data request has been cancelled')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error === 'submitted') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('submitted')}</h2>
            <p className="text-muted-foreground">{t('This data request has already been submitted')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!requestInfo) return null;

  const { dataRequest, tenant, product, branding } = requestInfo;
  const visibleProductGroups = getVisibleFields(PRODUCT_FIELD_GROUPS, dataRequest.allowedProductFields);
  const visibleBatchGroups = getVisibleFields(BATCH_FIELD_GROUPS, dataRequest.allowedBatchFields);

  // ─── Password Gate ─────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={tenant.name} className="h-9 w-9 rounded-lg object-contain" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: branding.primaryColor || '#3B82F6' }}>
                  <Package className="h-5 w-5" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{tenant.name}</span>
                <span className="text-xs text-muted-foreground">{t('Data Request')}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={toggleLanguage} className="gap-1.5">
              <Languages className="h-4 w-4" />
              {currentLang === 'de' ? 'DE' : 'EN'}
            </Button>
          </div>
        </header>

        {/* Password form */}
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>{t('Supplier Data Request')}</CardTitle>
              <CardDescription>
                {product.name} · {t('from')} {tenant.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dataRequest.message && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>{dataRequest.message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>{t('Password')}</Label>
                <Input
                  type="password"
                  value={passwordInput}
                  onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
                  onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                  placeholder={t('Enter Password')}
                  autoFocus
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{t('Incorrect password')}</p>
                )}
              </div>

              <Button className="w-full" onClick={handlePasswordSubmit} disabled={!passwordInput}>
                {t('Access')}
              </Button>
            </CardContent>
          </Card>
        </main>

        <footer className="border-t py-6 bg-white">
          <div className="max-w-5xl mx-auto px-4 text-center text-sm text-muted-foreground">
            Powered by Trackbliss
          </div>
        </footer>
      </div>
    );
  }

  // ─── Main Form ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={tenant.name} className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: branding.primaryColor || '#3B82F6' }}>
                <Package className="h-5 w-5" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{tenant.name}</span>
              <span className="text-xs text-muted-foreground">{product.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleLanguage} className="gap-1.5">
              <Languages className="h-4 w-4" />
              {currentLang === 'de' ? 'DE' : 'EN'}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Message */}
        {dataRequest.message && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>{dataRequest.message}</AlertDescription>
          </Alert>
        )}

        {/* Product Data Section */}
        {visibleProductGroups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {t('Product Data')}
              </CardTitle>
              <CardDescription>{product.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {visibleProductGroups.map((group) => (
                <div key={group.category}>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                    {t(group.labelKey)}
                  </h3>
                  <div className="space-y-4">
                    {group.fields.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        {field.type !== 'boolean' && (
                          <Label className="text-sm">{t(field.labelKey)}</Label>
                        )}
                        <FieldRenderer
                          field={field}
                          value={productData[field.key]}
                          onChange={handleProductFieldChange}
                          t={t}
                        />
                      </div>
                    ))}
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}

              <div className="flex justify-end">
                <Button onClick={handleSaveProduct} disabled={isSavingProduct}>
                  {isSavingProduct && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  {t('Save Product Data')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Batches Section */}
        {(visibleBatchGroups.length > 0 || dataRequest.allowBatchCreate) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    {t('Batches')}
                  </CardTitle>
                  <CardDescription>{t('Existing Batches')}: {batches.length}</CardDescription>
                </div>
                {dataRequest.allowBatchCreate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewBatches(prev => [...prev, {}])}
                  >
                    <Plus className="mr-1 h-4 w-4" /> {t('New Batch')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Existing batches */}
              {batches.length > 0 && dataRequest.allowBatchEdit && (
                <Accordion type="multiple" className="space-y-2">
                  {batches.map((batch) => {
                    const batchId = batch.id as string;
                    const batchLabel = (batch.batchNumber as string) || (batch.serialNumber as string) || batchId.slice(0, 8);
                    const mergedBatch = { ...batch, ...batchEdits[batchId] };

                    return (
                      <AccordionItem key={batchId} value={batchId} className="border rounded-lg px-4">
                        <AccordionTrigger className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{batchLabel}</span>
                            <Badge variant="outline" className="text-xs">
                              {(batch.status as string) || 'draft'}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 space-y-4">
                          {visibleBatchGroups.map((group) => (
                            <div key={group.category}>
                              <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                                {t(group.labelKey)}
                              </h4>
                              <div className="space-y-3">
                                {group.fields.map((field) => (
                                  <div key={field.key} className="space-y-1">
                                    {field.type !== 'boolean' && (
                                      <Label className="text-sm">{t(field.labelKey)}</Label>
                                    )}
                                    <FieldRenderer
                                      field={field}
                                      value={mergedBatch[field.key]}
                                      onChange={(key, value) => handleBatchFieldChange(batchId, key, value)}
                                      t={t}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-end pt-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveBatch(batchId)}
                              disabled={savingBatchId === batchId}
                            >
                              {savingBatchId === batchId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              <Save className="mr-1 h-4 w-4" />
                              {t('Save Batch')}
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}

              {batches.length === 0 && !dataRequest.allowBatchCreate && (
                <p className="text-center text-muted-foreground py-6">{t('No batches yet')}</p>
              )}

              {/* New batches */}
              {newBatches.map((newBatch, index) => (
                <Card key={`new-${index}`} className="mt-4 border-dashed">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{t('New Batch')} #{index + 1}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setNewBatches(prev => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {visibleBatchGroups.map((group) => (
                      <div key={group.category}>
                        <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                          {t(group.labelKey)}
                        </h4>
                        <div className="space-y-3">
                          {group.fields.map((field) => (
                            <div key={field.key} className="space-y-1">
                              {field.type !== 'boolean' && (
                                <Label className="text-sm">{t(field.labelKey)}</Label>
                              )}
                              <FieldRenderer
                                field={field}
                                value={newBatch[field.key]}
                                onChange={(key, value) => handleNewBatchFieldChange(index, key, value)}
                                t={t}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleCreateBatch(index)}
                        disabled={savingBatchId === `new-${index}`}
                      >
                        {savingBatchId === `new-${index}` && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-1 h-4 w-4" />
                        {t('Save Batch')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submit All Button */}
        <div className="flex justify-center pb-8">
          <Button
            size="lg"
            onClick={() => setShowSubmitConfirm(true)}
            disabled={isSubmitting}
            className="gap-2"
          >
            <Send className="h-5 w-5" />
            {t('Submit All Data')}
          </Button>
        </div>
      </main>

      <footer className="border-t py-6 bg-white">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-muted-foreground">
          Powered by Trackbliss
        </div>
      </footer>

      {/* Submit Confirmation */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Are you sure you want to submit?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Once submitted, you cannot make further changes')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitAll} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? t('Submitting...') : t('Submit')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
