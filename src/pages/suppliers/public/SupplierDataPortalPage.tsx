/**
 * Public Supplier Data Portal
 * Password-protected page where suppliers fill in product/batch data
 * Supports multi-product data requests with product tab navigation
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  FlaskConical,
  Award,
  Leaf,
  Ship,
  Ruler,
  BoxSelect,
  ShieldCheck,
  Hash,
  Truck,
  FileEdit,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import type { PublicSupplierDataRequestResult, FieldDefinition, FieldGroup } from '@/types/supplier-data-portal';
import type { LucideIcon } from 'lucide-react';

// ─── Category Icon Map ────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  basic: Package,
  materials: FlaskConical,
  certifications: Award,
  carbon: Leaf,
  customs: Ship,
  dimensions: Ruler,
  packaging: BoxSelect,
  espr: ShieldCheck,
  core: Hash,
  logistics: Truck,
  overrides: FileEdit,
  batchDimensions: Ruler,
};

// ─── Helper: check if a field value is "filled" ──────────────────────────
function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return Object.values(obj).some(v => isFilled(v));
  }
  return false;
}

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
              <Input size={1} value={(item.name as string) || ''} onChange={e => updateItem(i, 'name', e.target.value)} placeholder={t('e.g. Cotton')} />
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
              <Input size={1} value={(item.origin as string) || ''} onChange={e => updateItem(i, 'origin', e.target.value)} placeholder={t('e.g. Germany')} />
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
              <Input size={1} value={(item.name as string) || ''} onChange={e => updateItem(i, 'name', e.target.value)} placeholder={t('e.g. ISO 9001')} />
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

// ─── Category Card Component ──────────────────────────────────────────────

interface CategoryCardProps {
  group: FieldGroup;
  filledCount: number;
  totalCount: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  primaryColor: string;
}

function CategoryCard({ group, filledCount, totalCount, isOpen, onToggle, children, primaryColor }: CategoryCardProps) {
  const Icon = CATEGORY_ICONS[group.category] || Package;
  const allFilled = filledCount === totalCount && totalCount > 0;
  const { t } = useTranslation('supplier-data-portal');

  return (
    <Card className="overflow-hidden transition-all">
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: allFilled ? '#22c55e' : primaryColor }}
      />
      <button
        type="button"
        className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${primaryColor}15` }}
        >
          <Icon className="h-4.5 w-4.5" style={{ color: primaryColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{t(group.labelKey)}</span>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {allFilled ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Badge variant="secondary" className="text-xs font-medium tabular-nums">
              {filledCount}/{totalCount}
            </Badge>
          )}
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {isOpen && (
        <CardContent className="px-5 pb-5 pt-0 border-t">
          <div className="pt-4">
            {children}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Product Tab Bar ────────────────────────────────────────────────────────

interface ProductTabBarProps {
  products: Array<{ id: string; name: string }>;
  activeProductId: string;
  onSelect: (id: string) => void;
  primaryColor: string;
  productProgress: Record<string, { filled: number; total: number }>;
}

function ProductTabBar({ products, activeProductId, onSelect, primaryColor, productProgress }: ProductTabBarProps) {
  const { t } = useTranslation('supplier-data-portal');

  if (products.length <= 1) return null;

  return (
    <div className="bg-white border rounded-xl p-1.5 overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {products.map((product, index) => {
          const isActive = product.id === activeProductId;
          const prog = productProgress[product.id];
          const allDone = prog && prog.filled === prog.total && prog.total > 0;

          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelect(product.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                ${isActive
                  ? 'text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }
              `}
              style={isActive ? { backgroundColor: primaryColor } : undefined}
            >
              <span>{t('Product {{current}} of {{total}}', { current: index + 1, total: products.length })}</span>
              {prog && (
                <Badge
                  variant={isActive ? 'outline' : 'secondary'}
                  className={`text-[10px] px-1.5 py-0 h-5 ${isActive ? 'border-white/40 text-white/90' : ''}`}
                >
                  {allDone ? <CheckCircle2 className="h-3 w-3" /> : `${prog.filled}/${prog.total}`}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
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

  // Multi-product state
  const [activeProductId, setActiveProductId] = useState<string>('');
  const [allProductData, setAllProductData] = useState<Record<string, Record<string, unknown>>>({});
  const [allBatches, setAllBatches] = useState<Record<string, Record<string, unknown>[]>>({});
  const [allBatchEdits, setAllBatchEdits] = useState<Record<string, Record<string, Record<string, unknown>>>>({});
  const [allNewBatches, setAllNewBatches] = useState<Record<string, Record<string, unknown>[]>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // UI states
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [savingBatchId, setSavingBatchId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Category open/closed state
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const toggleLanguage = () => {
    const newLang = currentLang === 'de' ? 'en' : 'de';
    i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
    localStorage.setItem('dpp-language', newLang);
  };

  // Convenience accessors for current product
  const productData = allProductData[activeProductId] || {};
  const batches = allBatches[activeProductId] || [];
  const batchEdits = allBatchEdits[activeProductId] || {};
  const newBatches = allNewBatches[activeProductId] || [];

  const products = requestInfo?.products || [];
  const isMultiProduct = products.length > 1;

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
        // Set first product as active
        if (result.products.length > 0) {
          setActiveProductId(result.products[0].id);
        }
      } catch (err) {
        setError('not_found');
      }
      setIsLoading(false);
    }

    load();
  }, [accessCode]);

  // Handle password check — load all products data
  const handlePasswordSubmit = async () => {
    if (!requestInfo || !accessCode) return;

    const hash = await hashPassword(passwordInput);
    if (hash === requestInfo.dataRequest.passwordHash) {
      setPasswordHash(hash);
      setIsAuthenticated(true);
      setPasswordError(false);

      // Mark as in_progress
      publicMarkDataRequestInProgress(accessCode);

      // Load all products data
      setIsLoadingProducts(true);
      const productsToLoad = requestInfo.products;
      const productDataMap: Record<string, Record<string, unknown>> = {};
      const batchesMap: Record<string, Record<string, unknown>[]> = {};

      for (const product of productsToLoad) {
        const data = await publicGetProductForDataRequest(accessCode, product.id);
        if (data) {
          productDataMap[product.id] = snakeToCamel(data.product);
          batchesMap[product.id] = data.batches.map(b => snakeToCamel(b));
        }
      }

      setAllProductData(productDataMap);
      setAllBatches(batchesMap);
      setIsLoadingProducts(false);
    } else {
      setPasswordError(true);
    }
  };

  // Product field change (for current product)
  const handleProductFieldChange = (key: string, value: unknown) => {
    setAllProductData(prev => ({
      ...prev,
      [activeProductId]: { ...prev[activeProductId], [key]: value },
    }));
  };

  // Batch field change (for current product)
  const handleBatchFieldChange = (batchId: string, key: string, value: unknown) => {
    setAllBatchEdits(prev => ({
      ...prev,
      [activeProductId]: {
        ...prev[activeProductId],
        [batchId]: { ...(prev[activeProductId]?.[batchId] || {}), [key]: value },
      },
    }));
  };

  // New batch field change (for current product)
  const handleNewBatchFieldChange = (index: number, key: string, value: unknown) => {
    setAllNewBatches(prev => {
      const current = [...(prev[activeProductId] || [])];
      current[index] = { ...current[index], [key]: value };
      return { ...prev, [activeProductId]: current };
    });
  };

  // Save product data (current product)
  const handleSaveProduct = async () => {
    if (!accessCode) return;
    setIsSavingProduct(true);
    try {
      await publicSubmitProductData(accessCode, passwordHash, productData, activeProductId);
      toast({ title: t('Product data saved') });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
    setIsSavingProduct(false);
  };

  // Save batch data (current product)
  const handleSaveBatch = async (batchId: string) => {
    if (!accessCode) return;
    setSavingBatchId(batchId);
    try {
      const edits = batchEdits[batchId] || {};
      await publicSubmitBatchData(accessCode, passwordHash, batchId, edits, activeProductId);
      toast({ title: t('Batch saved') });
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
    setSavingBatchId(null);
  };

  // Create new batch (current product)
  const handleCreateBatch = async (index: number) => {
    if (!accessCode) return;
    setSavingBatchId(`new-${index}`);
    try {
      await publicCreateBatch(accessCode, passwordHash, newBatches[index], activeProductId);
      toast({ title: t('Batch created') });
      // Reload batches for this product
      const data = await publicGetProductForDataRequest(accessCode, activeProductId);
      if (data) {
        setAllBatches(prev => ({ ...prev, [activeProductId]: data.batches.map(b => snakeToCamel(b)) }));
      }
      // Remove the new batch form
      setAllNewBatches(prev => ({
        ...prev,
        [activeProductId]: (prev[activeProductId] || []).filter((_, i) => i !== index),
      }));
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    }
    setSavingBatchId(null);
  };

  // Submit all — save all products + batches, then mark as submitted
  const handleSubmitAll = async () => {
    if (!accessCode || !requestInfo) return;
    setIsSubmitting(true);
    try {
      // Save all products
      for (const product of requestInfo.products) {
        const pData = allProductData[product.id];
        if (pData) {
          await publicSubmitProductData(accessCode, passwordHash, pData, product.id);
        }

        // Save batch edits for this product
        const pBatchEdits = allBatchEdits[product.id] || {};
        for (const [batchId, edits] of Object.entries(pBatchEdits)) {
          if (Object.keys(edits).length > 0) {
            await publicSubmitBatchData(accessCode, passwordHash, batchId, edits, product.id);
          }
        }

        // Create new batches for this product
        const pNewBatches = allNewBatches[product.id] || [];
        for (const newBatch of pNewBatches) {
          await publicCreateBatch(accessCode, passwordHash, newBatch, product.id);
        }
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

  // Compute visible groups (memoized)
  const visibleProductGroups = useMemo(() => {
    if (!requestInfo) return [];
    return getVisibleFields(PRODUCT_FIELD_GROUPS, requestInfo.dataRequest.allowedProductFields);
  }, [requestInfo, getVisibleFields]);

  const visibleBatchGroups = useMemo(() => {
    if (!requestInfo) return [];
    return getVisibleFields(BATCH_FIELD_GROUPS, requestInfo.dataRequest.allowedBatchFields);
  }, [requestInfo, getVisibleFields]);

  // Open all categories by default on first load when product data arrives
  useEffect(() => {
    if (isAuthenticated && visibleProductGroups.length > 0 && openCategories.size === 0) {
      setOpenCategories(new Set(visibleProductGroups.map(g => g.category)));
    }
  }, [isAuthenticated, visibleProductGroups, openCategories.size]);

  // ─── Progress Calculation (per product) ─────────────────────────────────
  const computeProductProgress = useCallback((pData: Record<string, unknown>) => {
    const allFields = visibleProductGroups.flatMap(g => g.fields);
    const totalCount = allFields.length;
    const filledCount = allFields.filter(f => isFilled(pData[f.key])).length;
    const percentage = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

    const perCategory: Record<string, { filled: number; total: number }> = {};
    for (const group of visibleProductGroups) {
      const filled = group.fields.filter(f => isFilled(pData[f.key])).length;
      perCategory[group.category] = { filled, total: group.fields.length };
    }

    return { totalCount, filledCount, percentage, perCategory };
  }, [visibleProductGroups]);

  // Current product progress
  const progress = useMemo(() => computeProductProgress(productData), [computeProductProgress, productData]);

  // Per-product progress map (for tab bar)
  const productProgressMap = useMemo(() => {
    const map: Record<string, { filled: number; total: number }> = {};
    for (const product of products) {
      const pData = allProductData[product.id] || {};
      const allFields = visibleProductGroups.flatMap(g => g.fields);
      const filled = allFields.filter(f => isFilled(pData[f.key])).length;
      map[product.id] = { filled, total: allFields.length };
    }
    return map;
  }, [products, allProductData, visibleProductGroups]);

  // Overall progress across all products
  const overallProgress = useMemo(() => {
    let totalFilled = 0;
    let totalFields = 0;
    for (const product of products) {
      const p = productProgressMap[product.id];
      if (p) {
        totalFilled += p.filled;
        totalFields += p.total;
      }
    }
    return { filled: totalFilled, total: totalFields, percentage: totalFields > 0 ? Math.round((totalFilled / totalFields) * 100) : 0 };
  }, [products, productProgressMap]);

  const editedBatchCount = Object.keys(batchEdits).filter(id => Object.keys(batchEdits[id]).length > 0).length;

  // Active product name
  const activeProductName = products.find(p => p.id === activeProductId)?.name || '';

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

  const { dataRequest, tenant, branding } = requestInfo;
  const primaryColor = branding.primaryColor || '#3B82F6';

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
                <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: primaryColor }}>
                  <Package className="h-5 w-5" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{tenant.name}</span>
                <span className="text-xs text-muted-foreground">{t('EU Digital Product Passport')}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={toggleLanguage} className="gap-1.5">
              <Languages className="h-4 w-4" />
              {currentLang === 'de' ? 'DE' : 'EN'}
            </Button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-lg space-y-6">
            {/* Hero card with gradient */}
            <div
              className="rounded-xl p-6 sm:p-8 text-white relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd, ${primaryColor}99)`,
              }}
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
              <div className="relative space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 opacity-90" />
                  <span className="text-xs font-medium tracking-wide uppercase opacity-90">{t('ESPR 2024/1781')}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold leading-tight">
                  {t('Data requested for your Digital Product Passport')}
                </h1>
                <p className="text-sm opacity-90 leading-relaxed">
                  {t('You have been asked to provide product information for the EU Digital Product Passport. Please enter your password to begin.')}
                </p>
              </div>
            </div>

            {/* Product & Category Preview */}
            <Card>
              <CardContent className="pt-6 space-y-5">
                {/* Product names */}
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {products.length === 1 ? (
                      <>
                        <p className="font-semibold">{products[0].name}</p>
                        <p className="text-sm text-muted-foreground">{t('from')} {tenant.name}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold">
                          {t('{{count}} products', { count: products.length })}
                        </p>
                        <p className="text-sm text-muted-foreground">{t('from')} {tenant.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {products.map(p => (
                            <Badge key={p.id} variant="secondary" className="text-xs">
                              {p.name}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Requested categories preview */}
                {visibleProductGroups.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t('Requested data categories')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {visibleProductGroups.map(group => {
                        const Icon = CATEGORY_ICONS[group.category] || Package;
                        return (
                          <div
                            key={group.category}
                            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
                          >
                            <Icon className="h-3.5 w-3.5" style={{ color: primaryColor }} />
                            {t(group.labelKey)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Admin message */}
                {dataRequest.message && (
                  <div className="rounded-lg border-l-4 bg-muted/50 p-4" style={{ borderLeftColor: primaryColor }}>
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">{t('Message from the requester')}</p>
                        <p className="text-sm">{dataRequest.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Password input */}
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-sm font-medium">{t('Password')}</Label>
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

                <Button className="w-full" onClick={handlePasswordSubmit} disabled={!passwordInput} size="lg">
                  <Lock className="mr-2 h-4 w-4" />
                  {t('Access')}
                </Button>
              </CardContent>
            </Card>

            {/* DPP info footnote */}
            <p className="text-center text-xs text-muted-foreground px-4">
              {t('This data helps ensure your product meets EU sustainability and transparency requirements.')}
            </p>
          </div>
        </main>

        <footer className="border-t py-6 bg-white">
          <div className="max-w-5xl mx-auto px-4 text-center text-sm text-muted-foreground">
            Powered by Trackbliss
          </div>
        </footer>
      </div>
    );
  }

  // ─── Loading products after auth ───────────────────────────────────────
  if (isLoadingProducts) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">{t('Loading...')}</p>
        </div>
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
              <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: primaryColor }}>
                <Package className="h-5 w-5" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{tenant.name}</span>
              <span className="text-xs text-muted-foreground">
                {isMultiProduct
                  ? t('{{count}} products', { count: products.length })
                  : activeProductName
                }
              </span>
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

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-6">
        {/* DPP Info Banner */}
        <div
          className="rounded-xl p-5 sm:p-6 text-white relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
          }}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <h2 className="font-semibold text-base sm:text-lg leading-tight">
                {t('Complete Product Data for the Digital Product Passport')}
              </h2>
              <p className="text-sm opacity-90 leading-relaxed">
                {t('Please fill in all requested fields. This data is needed to create a compliant EU Digital Product Passport (ESPR 2024/1781).')}
              </p>
              {/* Overall Progress */}
              {overallProgress.total > 0 && (
                <div className="pt-1 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{t('Overall Progress')}</span>
                    <span className="opacity-90">
                      {isMultiProduct
                        ? (overallProgress.filled === overallProgress.total
                          ? t('All fields completed')
                          : t('{{filled}} of {{total}} fields across {{count}} products', { filled: overallProgress.filled, total: overallProgress.total, count: products.length }))
                        : (overallProgress.filled === overallProgress.total
                          ? t('All fields completed')
                          : t('{{filled}} of {{total}} fields completed', { filled: overallProgress.filled, total: overallProgress.total }))
                      }
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-500"
                      style={{ width: `${overallProgress.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Admin message */}
        {dataRequest.message && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>{dataRequest.message}</AlertDescription>
          </Alert>
        )}

        {/* Product Tab Bar (multi-product only) */}
        <ProductTabBar
          products={products}
          activeProductId={activeProductId}
          onSelect={setActiveProductId}
          primaryColor={primaryColor}
          productProgress={productProgressMap}
        />

        {/* Current product name indicator (multi-product) */}
        {isMultiProduct && (
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{activeProductName}</span>
          </div>
        )}

        {/* Product Data — Category Cards */}
        {visibleProductGroups.length > 0 && (
          <div className="space-y-3">
            {visibleProductGroups.map((group) => {
              const catProgress = progress.perCategory[group.category] || { filled: 0, total: 0 };
              const isDimensionGroup = group.category === 'dimensions' || group.category === 'batchDimensions';

              return (
                <CategoryCard
                  key={group.category}
                  group={group}
                  filledCount={catProgress.filled}
                  totalCount={catProgress.total}
                  isOpen={openCategories.has(group.category)}
                  onToggle={() => toggleCategory(group.category)}
                  primaryColor={primaryColor}
                >
                  <div className={isDimensionGroup ? 'grid grid-cols-1 sm:grid-cols-3 gap-4' : 'space-y-4'}>
                    {group.fields.map((field) => {
                      const fieldFilled = isFilled(productData[field.key]);
                      return (
                        <div key={field.key} className="space-y-1.5">
                          {field.type !== 'boolean' && (
                            <div className="flex items-center gap-1.5">
                              {fieldFilled ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                              ) : (
                                <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                              )}
                              <Label className="text-sm">{t(field.labelKey)}</Label>
                            </div>
                          )}
                          <FieldRenderer
                            field={field}
                            value={productData[field.key]}
                            onChange={handleProductFieldChange}
                            t={t}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CategoryCard>
              );
            })}

            {/* Save product button */}
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveProduct} disabled={isSavingProduct}>
                {isSavingProduct && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {t('Save Product Data')}
              </Button>
            </div>
          </div>
        )}

        {/* Batches Section */}
        {(visibleBatchGroups.length > 0 || dataRequest.allowBatchCreate) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <Layers className="h-4.5 w-4.5" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {t('Batches')}
                      <Badge variant="secondary" className="text-xs ml-1">{batches.length}</Badge>
                    </CardTitle>
                    <CardDescription>{t('Existing Batches')}: {batches.length}</CardDescription>
                  </div>
                </div>
                {dataRequest.allowBatchCreate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAllNewBatches(prev => ({
                      ...prev,
                      [activeProductId]: [...(prev[activeProductId] || []), {}],
                    }))}
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
                <Card key={`new-${index}`} className="mt-4 border-dashed border-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{t('New Batch')} #{index + 1}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAllNewBatches(prev => ({
                          ...prev,
                          [activeProductId]: (prev[activeProductId] || []).filter((_, i) => i !== index),
                        }))}
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

        {/* Submit Section */}
        <Card className="border-2">
          <CardContent className="pt-6 space-y-4">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">{t('Summary')}</h3>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {isMultiProduct ? (
                  <span>{t('{{filled}} of {{total}} fields across {{count}} products', { filled: overallProgress.filled, total: overallProgress.total, count: products.length })}</span>
                ) : (
                  <span>{t('You have completed {{filled}} of {{total}} product fields', { filled: progress.filledCount, total: progress.totalCount })}</span>
                )}
                {editedBatchCount > 0 && (
                  <span>{t('{{count}} batches edited', { count: editedBatchCount })}</span>
                )}
                {newBatches.length > 0 && (
                  <span>{t('{{count}} new batches created', { count: newBatches.length })}</span>
                )}
              </div>
              {overallProgress.total > 0 && (
                <Progress value={overallProgress.percentage} className="h-2 max-w-md mx-auto" />
              )}
            </div>

            <div className="flex justify-center pt-2">
              <Button
                size="lg"
                onClick={() => setShowSubmitConfirm(true)}
                disabled={isSubmitting}
                className="gap-2 px-8"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
                }}
              >
                <Send className="h-5 w-5" />
                {t('Submit All Data')}
              </Button>
            </div>
          </CardContent>
        </Card>
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
