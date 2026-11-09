import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Plus, Trash2, Check, Search, User, Package, Truck, ClipboardCheck,
  ArrowLeft, ArrowRight, Mail, Phone, Pencil, CreditCard, FileText,
  Building2, Users, Warehouse, Sparkles, MapPin,
  Loader2, Zap, AlertTriangle, PackagePlus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/adaptive-dialog';
import { StickyBottomBar } from '@/components/layout/sticky-bottom-bar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WarehouseSuccessAnimation } from '@/components/warehouse/WarehouseSuccessAnimation';
import { SmartPackingCard } from '@/components/warehouse/shipments/SmartPackingCard';
import { estimatePrices, transitTimeEstimate } from '@/lib/smart-packing';
import type { ContentItem } from '@/lib/smart-packing';
import { getProducts } from '@/services/supabase/products';
import { getBatches } from '@/services/supabase/batches';
import { getActiveLocations } from '@/services/supabase/wh-locations';
import { getPackagingTypes } from '@/services/supabase/wh-packaging-types';
import { getStockLevels } from '@/services/supabase/wh-stock';
import { getShopifyBundles } from '@/services/supabase/shopify-integration';
import { searchRecipients, type RecipientSearchResult } from '@/services/supabase/wh-contacts';
import { validateAddress, normalizePostalCode } from '@/lib/address-validation';
import { validateAddressWithDHL, type DHLAddressValidationResult } from '@/services/supabase/dhl-carrier';
import { AddressAutocompleteInput } from '@/components/warehouse/AddressAutocompleteInput';
import { validateGoogleAddress, type GoogleValidationResult } from '@/services/supabase/address-validation';
import { createShipment } from '@/services/supabase/wh-shipments';
import { getCountries } from '@/services/supabase/master-data';
import { SampleMetaFields } from '@/components/warehouse/SampleMetaFields';
import type { WhLocation, WhShipmentItemInput, RecipientType, ShipmentPriority, SampleShipmentMeta } from '@/types/warehouse';
import { CARRIER_OPTIONS } from '@/types/warehouse';
import type { BatchListItem } from '@/types/product';
import type { ShopifyBundleMap } from '@/types/shopify';
import type { Country } from '@/types/database';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface ItemRow {
  productId: string;
  productName: string;
  batchId: string;
  batchSerial: string;
  locationId: string;
  locationName: string;
  quantity: number;
  maxAvailable: number;
  batchOptions: BatchListItem[];
  loadingBatches: boolean;
}

const WIZARD_STEPS = [
  { label: 'Recipient & Priority', short: 'Recipient' },
  { label: 'Items', short: 'Items' },
  { label: 'Shipping', short: 'Shipping' },
  { label: 'Confirmation', short: 'Confirm' },
];

/**
 * Recipient type picker — visual card grid replacing a dropdown. Much clearer
 * on mobile and makes the most common choice (customer vs B2B vs influencer)
 * a single tap.
 */
const RECIPIENT_TYPES: { value: 'customer' | 'b2b_partner' | 'warehouse' | 'influencer' | 'other'; icon: typeof User; labelKey: string }[] = [
  { value: 'customer', icon: User, labelKey: 'customer' },
  { value: 'b2b_partner', icon: Building2, labelKey: 'b2b_partner' },
  { value: 'warehouse', icon: Warehouse, labelKey: 'warehouse' },
  { value: 'influencer', icon: Sparkles, labelKey: 'influencer' },
  { value: 'other', icon: Users, labelKey: 'other' },
];

/**
 * Priority options. Only the levels that carry urgency get a status dot —
 * low/normal stay neutral so color keeps its meaning.
 */
const PRIORITY_PILLS: { value: 'low' | 'normal' | 'high' | 'urgent'; label: string; dot: string }[] = [
  { value: 'low', label: 'low', dot: 'bg-muted-foreground/40' },
  { value: 'normal', label: 'normal', dot: 'bg-muted-foreground/70' },
  { value: 'high', label: 'high', dot: 'bg-amber-500' },
  { value: 'urgent', label: 'urgent', dot: 'bg-destructive' },
];

/** Shared style for single-choice option tiles (recipient type, priority, service level). */
const optionTileClass = (selected: boolean) =>
  `rounded-lg border text-sm transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    selected
      ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary'
      : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'
  }`;

/**
 * Recipient search field with portal-rendered dropdown. Rendering the results
 * list into `document.body` bypasses the parent Card's `overflow-hidden`
 * (needed there for the gradient border) so the dropdown isn't clipped.
 */
function RecipientSearchField({
  value,
  onChange,
  results,
  onSelect,
  onBrowseClick,
  browseLabel,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  results: RecipientSearchResult[];
  onSelect: (r: RecipientSearchResult) => void;
  onBrowseClick?: () => void;
  browseLabel?: string;
  placeholder: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  // Re-measure whenever the input box position changes (scroll, resize).
  useLayoutEffect(() => {
    if (results.length === 0) {
      setRect(null);
      return;
    }
    const update = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 6, left: r.left, width: r.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [results.length]);

  return (
    <div ref={wrapperRef} className="relative flex items-stretch gap-2">
      <div className="relative flex-1">
        {onBrowseClick ? (
          <button
            type="button"
            onClick={onBrowseClick}
            aria-label={browseLabel}
            title={browseLabel}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
          >
            <Search className="h-4 w-4" />
          </button>
        ) : (
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        )}
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 pr-3 h-11 rounded-lg"
        />
      </div>
      {onBrowseClick && (
        <Button
          type="button"
          variant="outline"
          onClick={onBrowseClick}
          className="h-11 rounded-lg px-3 sm:px-4 flex-shrink-0"
        >
          <Search className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline text-sm">{browseLabel}</span>
        </Button>
      )}
      {rect && results.length > 0 && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[1000] rounded-lg border bg-popover text-popover-foreground shadow-md max-h-72 overflow-y-auto p-1"
            style={{ top: rect.top, left: rect.left, width: rect.width }}
          >
            {results.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                type="button"
                onMouseDown={(e) => {
                  // Use mouseDown so the blur on the input doesn't close the popover
                  // before the click registers.
                  e.preventDefault();
                  onSelect(r);
                }}
                className="w-full min-h-11 text-left px-3 py-2 text-sm rounded-md hover:bg-muted flex items-center gap-3 transition-colors duration-150"
              >
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate">{r.name}</span>
                  {r.company && <span className="block text-xs text-muted-foreground truncate">{r.company}</span>}
                </span>
                <span className="shrink-0 rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
                  {r.type === 'customer' ? 'B2C' : 'B2B'}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )
      }
    </div>
  );
}

/**
 * Reusable section card — defined at module scope so React doesn't remount
 * the subtree on every parent render. Nesting it inside the parent used to
 * cause inputs (e.g. the recipient search) to lose focus after each keystroke.
 */
function Section({
  icon: Icon,
  title,
  subtitle,
  children,
  action,
}: {
  icon?: typeof User;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="gap-0 rounded-xl border bg-card py-0 shadow-none">
      <div className="flex items-start gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
        {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-5 text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      <CardContent className="space-y-4 px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
        {children}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page Component                                                             */
/* -------------------------------------------------------------------------- */

export function CreateShipmentPage() {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const prevStepRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdShipmentId, setCreatedShipmentId] = useState('');

  // Countries
  const [countries, setCountries] = useState<Country[]>([]);

  // Step navigation
  const goToStep = (next: number) => {
    setDirection(next > step ? 'forward' : 'backward');
    prevStepRef.current = step;
    // Reset the recipient autocomplete so returning to the recipient step
    // never shows a stale search box / results dropdown.
    setRecipientSearch('');
    setRecipientResults([]);
    setStep(next);
  };

  // Step 1: Recipient
  const [recipientType, setRecipientType] = useState<RecipientType>('b2b_partner');
  const [recipientName, setRecipientName] = useState('');
  const [recipientCompany, setRecipientCompany] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [shippingStreet, setShippingStreet] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [shippingCountry, setShippingCountry] = useState('DE');
  const [priority, setPriority] = useState<ShipmentPriority>('normal');
  const [contactId, setContactId] = useState<string | undefined>();
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientResults, setRecipientResults] = useState<RecipientSearchResult[]>([]);
  const [sampleMeta, setSampleMeta] = useState<Partial<SampleShipmentMeta>>({
    sampleType: 'gift',
    returnExpected: false,
    contentExpected: true,
    sampleStatus: 'distributed',
    contentStatus: 'awaiting',
  });

  // Step 2: Items
  const [items, setItems] = useState<ItemRow[]>([]);
  // Set definitions, so a manually created shipment can pull in a whole Set at
  // once instead of retyping its components (Shopify orders resolve on import).
  const [bundles, setBundles] = useState<ShopifyBundleMap[]>([]);
  const [bundlePickerOpen, setBundlePickerOpen] = useState(false);
  const [products, setProducts] = useState<Array<{
    id: string;
    name: string;
    productHeightCm?: number;
    productWidthCm?: number;
    productDepthCm?: number;
    grossWeight?: number;
    netWeight?: number;
  }>>([]);

  /**
   * Resolve each item row to a {dims, weight} bundle. Falls back from product
   * master → batch override when the product itself has no dimensions/weight
   * set. NOTE: products and batches store weight in **GRAMS** (see Product
   * type comments). We divide by 1000 to convert to kg before handing off to
   * smart-packing, which works in kg throughout.
   *
   * Every selected item is included — items missing dimensions get 0 cm on
   * the L/W/H axes. SmartPackingCard filters those out of carton calculations
   * but keeps their weight in the total and surfaces a warning.
   */
  const resolvedItems: ContentItem[] = useMemo(() => {
    return items.reduce<ContentItem[]>((acc, row) => {
      if (!row.productId || row.quantity <= 0) return acc;
      const prod = products.find((p) => p.id === row.productId);
      const batch = row.batchOptions.find((b) => b.id === row.batchId);
      const lengthCm = prod?.productDepthCm ?? batch?.productDepthCm ?? 0;
      const widthCm = prod?.productWidthCm ?? batch?.productWidthCm ?? 0;
      const heightCm = prod?.productHeightCm ?? batch?.productHeightCm ?? 0;
      const weightGrams =
        prod?.grossWeight ??
        prod?.netWeight ??
        batch?.grossWeight ??
        batch?.netWeight ??
        0;
      const weightKg = weightGrams / 1000;
      acc.push({
        lengthCm,
        widthCm,
        heightCm,
        weightKg,
        quantity: row.quantity,
      });
      return acc;
    }, []);
  }, [items, products]);

  /** Total contents weight in kg, summing every (item × quantity). */
  const computedTotalWeightKg = useMemo(
    () => resolvedItems.reduce((sum, it) => sum + it.weightKg * (it.quantity ?? 1), 0),
    [resolvedItems],
  );
  const [locations, setLocations] = useState<WhLocation[]>([]);

  // Real tare of the tenant's default shipping carton (kg). Used by the
  // Smart Packing Assistant and the weight auto-fill instead of the 0.4 kg
  // flat rate when a carton is configured in wh_packaging_types.
  const [defaultTareKg, setDefaultTareKg] = useState<number | undefined>(undefined);
  useEffect(() => {
    getPackagingTypes()
      .then((types) => {
        const active = types.filter((p) => p.isActive);
        const def = active.find((p) => p.isDefault) ?? active[0];
        if (def && def.tareWeightGrams > 0) setDefaultTareKg(def.tareWeightGrams / 1000);
      })
      .catch(() => { /* keep 0.4 kg fallback */ });
  }, []);

  // Step 3: Shipping
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [serviceLevel, setServiceLevel] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Load products, locations, countries
  useEffect(() => {
    (async () => {
      const [p, l, c] = await Promise.all([getProducts(), getActiveLocations(), getCountries()]);
      setProducts(p.map((pr) => ({
        id: pr.id,
        name: pr.name,
        productHeightCm: pr.productHeightCm,
        productWidthCm: pr.productWidthCm,
        productDepthCm: pr.productDepthCm,
        grossWeight: pr.grossWeight,
        netWeight: pr.netWeight,
      })));
      setLocations(l);
      setCountries(c);
    })();
    // Best-effort: without the Shopify module there simply are no Sets, and the
    // "Insert Set" button stays hidden.
    getShopifyBundles()
      .then(b => setBundles(b.filter(x => x.isActive && x.components.length > 0)))
      .catch(() => setBundles([]));
  }, []);

  // ─── Auto-fill weight from item dimensions × weights ─────────
  // Fills the weight field when empty, OR when the field value has become
  // stale because items were added (current form weight < 80% of computed
  // total — indicates the old auto-fill is outdated, not a manual override
  // set deliberately below the content weight).
  useEffect(() => {
    if (computedTotalWeightKg <= 0) return;
    const currentKg = weightGrams ? Number(weightGrams) / 1000 : 0;
    const totalWithTare = computedTotalWeightKg + (defaultTareKg ?? 0.4);
    const isEmpty = !weightGrams || currentKg === 0;
    const isClearlyStale = currentKg > 0 && currentKg < totalWithTare * 0.8;
    if (isEmpty || isClearlyStale) {
      setWeightGrams(String(Math.round(totalWithTare * 1000)));
    }
  }, [computedTotalWeightKg, weightGrams, defaultTareKg]);

  // ─── Auto-fill carrier + cost from price estimates ───────────
  // When destination + weight are known, suggest the cheapest carrier and
  // its price as defaults. Only fills empty fields.
  useEffect(() => {
    const wKg = weightGrams ? Number(weightGrams) / 1000 : 0;
    if (!shippingCountry || wKg <= 0) return;
    const estimates = estimatePrices('DE', shippingCountry, wKg);
    if (estimates.length === 0) return;
    const cheapest = estimates[0];
    if (!carrier) {
      // Map our compact carrier label (e.g., "DHL Paket") to CARRIER_OPTIONS list
      const match = CARRIER_OPTIONS.find((opt) =>
        opt.toLowerCase().includes(cheapest.carrier.split(' ')[0].toLowerCase()),
      );
      if (match) setCarrier(match);
    }
    if (!shippingCost) {
      setShippingCost(cheapest.priceFrom.toFixed(2));
    }
  }, [shippingCountry, weightGrams, carrier, shippingCost]);

  // ─── Auto-fill estimated delivery from transit times ─────────
  useEffect(() => {
    if (!shippingCountry || estimatedDelivery) return;
    const transits = transitTimeEstimate('DE', shippingCountry);
    if (transits.length === 0) return;
    // Pick the chosen carrier's row, fall back to DHL.
    const chosen = transits.find((t) =>
      carrier && t.carrier.toLowerCase().includes(carrier.split(' ')[0].toLowerCase()),
    ) ?? transits[0];
    // Parse "2–3" → take the upper bound + today.
    const upperDays = parseInt((chosen.days.split(/[–-]/).pop() ?? '0').trim(), 10);
    if (!Number.isFinite(upperDays) || upperDays <= 0) return;
    const date = new Date();
    date.setDate(date.getDate() + upperDays);
    setEstimatedDelivery(date.toISOString().slice(0, 10));
  }, [shippingCountry, carrier, estimatedDelivery]);

  // Recipient search
  useEffect(() => {
    if (recipientSearch.length >= 2) {
      const timer = setTimeout(async () => {
        const results = await searchRecipients(recipientSearch);
        setRecipientResults(results);
      }, 300);
      return () => clearTimeout(timer);
    }
    setRecipientResults([]);
  }, [recipientSearch]);

  const selectRecipient = (r: RecipientSearchResult) => {
    setRecipientType(r.type === 'customer' ? 'customer' : 'b2b_partner');
    setRecipientName(r.name);
    setRecipientCompany(r.company || '');
    setRecipientEmail(r.email || '');
    setRecipientPhone(r.phone || '');
    setShippingStreet(r.street || '');
    setShippingCity(r.city || '');
    setShippingPostalCode(r.postalCode || '');
    setShippingCountry(r.country || 'DE');
    setContactId(r.contactId || undefined);
    setRecipientSearch('');
    setRecipientResults([]);
  };

  // Item management
  const addItem = () => {
    setItems([...items, {
      productId: '', productName: '', batchId: '', batchSerial: '',
      locationId: '', locationName: '', quantity: 1, maxAvailable: 0,
      batchOptions: [], loadingBatches: false,
    }]);
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  /**
   * Append every component of a Set as its own item row.
   *
   * Same principle as the Shopify import: a Set is never one position — it is
   * the articles it consists of, each individually pickable and scannable.
   * A pinned component_batch_id wins (that is what tells the beige wall panel
   * from the rose one); otherwise the batch stays empty and is chosen like on
   * any other manually added row.
   */
  const insertBundle = async (bundle: ShopifyBundleMap) => {
    const defaultLocation = locations[0];
    const rows: ItemRow[] = await Promise.all(bundle.components.map(async (c) => {
      const batches = await getBatches(c.componentProductId).catch(() => [] as BatchListItem[]);
      const batch = c.componentBatchId ? batches.find(b => b.id === c.componentBatchId) : undefined;
      return {
        productId: c.componentProductId,
        productName: c.productName || products.find(p => p.id === c.componentProductId)?.name || '',
        batchId: batch?.id || '',
        batchSerial: batch?.serialNumber || '',
        locationId: defaultLocation?.id || '',
        locationName: defaultLocation?.name || '',
        quantity: c.quantity,
        maxAvailable: 0,
        batchOptions: batches,
        loadingBatches: false,
      };
    }));

    // Availability for the rows that already have both batch and location.
    await Promise.all(rows.map(async (r) => {
      if (!r.batchId || !r.locationId) return;
      const stock = await getStockLevels({ batchId: r.batchId, locationId: r.locationId }).catch(() => []);
      r.maxAvailable = stock[0]?.quantityAvailable || 0;
    }));

    setItems(prev => [...prev, ...rows]);
    setBundlePickerOpen(false);
    toast.success(t('{{count}} component(s) added', { count: rows.length }));
  };

  const updateItem = async (idx: number, field: string, value: string | number) => {
    const updated = [...items];
    (updated[idx] as unknown as Record<string, unknown>)[field] = value;

    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      updated[idx].productName = product?.name || '';
      updated[idx].batchId = '';
      updated[idx].batchSerial = '';
      updated[idx].batchOptions = [];
      updated[idx].loadingBatches = true;
      setItems([...updated]);
      try {
        const batches = await getBatches(value as string);
        const fresh = [...updated];
        fresh[idx].batchOptions = batches;
        fresh[idx].loadingBatches = false;
        setItems(fresh);
      } catch {
        updated[idx].loadingBatches = false;
        setItems([...updated]);
      }
      return;
    }

    if (field === 'batchId') {
      const batch = updated[idx].batchOptions.find(b => b.id === value);
      updated[idx].batchSerial = batch?.serialNumber || '';
    }

    if (field === 'locationId') {
      const loc = locations.find(l => l.id === value);
      updated[idx].locationName = loc?.name || '';
    }

    if ((field === 'batchId' || field === 'locationId') && updated[idx].batchId && updated[idx].locationId) {
      try {
        const stock = await getStockLevels({ batchId: updated[idx].batchId, locationId: updated[idx].locationId });
        updated[idx].maxAvailable = stock[0]?.quantityAvailable || 0;
      } catch {
        updated[idx].maxAvailable = 0;
      }
    }

    setItems(updated);
  };

  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleSubmit = async () => {
    if (!recipientName || !shippingStreet || !shippingCity || !shippingPostalCode || !shippingCountry || items.length === 0) return;
    setLoading(true);
    try {
      const shipmentItems: WhShipmentItemInput[] = items.map(i => ({
        productId: i.productId, batchId: i.batchId, locationId: i.locationId, quantity: i.quantity,
      }));
      const shipment = await createShipment({
        recipientType, recipientName,
        recipientCompany: recipientCompany || undefined,
        recipientEmail: recipientEmail || undefined,
        recipientPhone: recipientPhone || undefined,
        shippingStreet, shippingCity, shippingPostalCode, shippingCountry,
        carrier: carrier || undefined,
        trackingNumber: trackingNumber || undefined,
        serviceLevel: serviceLevel || undefined,
        estimatedDelivery: estimatedDelivery || undefined,
        shippingCost: shippingCost ? Number(shippingCost) : undefined,
        totalWeightGrams: weightGrams ? Number(weightGrams) : undefined,
        orderReference: orderReference || undefined,
        notes: notes || undefined,
        internalNotes: internalNotes || undefined,
        contactId: contactId || undefined,
        priority,
        sampleMeta: recipientType === 'influencer' ? {
          sampleType: sampleMeta.sampleType || 'gift',
          campaignId: sampleMeta.campaignId,
          returnExpected: sampleMeta.returnExpected ?? false,
          returnDeadline: sampleMeta.returnDeadline,
          contentExpected: sampleMeta.contentExpected ?? true,
          contentDeadline: sampleMeta.contentDeadline,
          sampleStatus: 'distributed',
          contentStatus: sampleMeta.contentExpected ? 'awaiting' : 'no_content',
        } : undefined,
        items: shipmentItems,
      });
      setCreatedShipmentId(shipment.id);
      setShowSuccess(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const addressValidation = useMemo(
    () => validateAddress({
      street: shippingStreet,
      city: shippingCity,
      postalCode: shippingPostalCode,
      country: shippingCountry,
    }),
    [shippingStreet, shippingCity, shippingPostalCode, shippingCountry],
  );
  const addressErrorFor = (field: 'street' | 'city' | 'postalCode' | 'country') =>
    addressValidation.errors.find((e) => e.field === field);
  const step1Valid = !!recipientName && addressValidation.valid;

  // ── Tier 3: Google "Did you mean?" address verification ──
  // Calls the Google Address Validation API once the address passes Tier-1.
  // Surfaces corrections (e.g. wrong postal code → suggests the right one) so
  // the user can apply them with a single click.
  const [googleValidation, setGoogleValidation] = useState<GoogleValidationResult | null>(null);
  useEffect(() => {
    if (!addressValidation.valid) {
      setGoogleValidation(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await validateGoogleAddress({
        street: addressValidation.normalized.street,
        postalCode: addressValidation.normalized.postalCode,
        city: addressValidation.normalized.city,
        country: addressValidation.normalized.country,
      });
      if (!cancelled) {
        setGoogleValidation(res);
      }
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    addressValidation.valid,
    addressValidation.normalized.street,
    addressValidation.normalized.postalCode,
    addressValidation.normalized.city,
    addressValidation.normalized.country,
  ]);

  /** Apply Google's normalized address to the form fields. */
  const applyGoogleSuggestion = () => {
    const n = googleValidation?.normalized;
    if (!n) return;
    if (n.street) setShippingStreet(n.street);
    if (n.city) setShippingCity(n.city);
    if (n.postalCode) setShippingPostalCode(n.postalCode);
    if (n.country) setShippingCountry(n.country);
    setGoogleValidation(null);
  };

  /** Is the Google suggestion meaningfully different from what the user typed? */
  const hasGoogleSuggestion =
    googleValidation?.enabled &&
    googleValidation?.normalized?.formattedAddress &&
    !googleValidation.valid &&
    (googleValidation.normalized?.street !== addressValidation.normalized.street ||
      googleValidation.normalized?.postalCode !== addressValidation.normalized.postalCode ||
      googleValidation.normalized?.city !== addressValidation.normalized.city);

  // ── Tier 2: DHL pre-shipment sanity check ──
  // Runs once the address passes Tier-1 format checks. Debounced; DHL probe
  // is best-effort — issues surface as a soft warning, never block the wizard.
  const [dhlValidation, setDhlValidation] = useState<DHLAddressValidationResult | null>(null);
  const [dhlValidating, setDhlValidating] = useState(false);
  useEffect(() => {
    if (!addressValidation.valid) {
      setDhlValidation(null);
      return;
    }
    let cancelled = false;
    setDhlValidating(true);
    const timer = setTimeout(async () => {
      const res = await validateAddressWithDHL({
        street: addressValidation.normalized.street,
        postalCode: addressValidation.normalized.postalCode,
        city: addressValidation.normalized.city,
        country: addressValidation.normalized.country,
        weightKg: 1,
      });
      if (!cancelled) {
        setDhlValidation(res);
        setDhlValidating(false);
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setDhlValidating(false);
    };
  }, [
    addressValidation.valid,
    addressValidation.normalized.street,
    addressValidation.normalized.postalCode,
    addressValidation.normalized.city,
    addressValidation.normalized.country,
  ]);
  const step2Valid = items.length > 0 && items.every(i => i.productId && i.batchId && i.locationId && i.quantity > 0);
  const step3Valid = true; // Shipping fields are optional; SmartPackingCard only advises.
  const canAdvance = step === 0 ? step1Valid : step === 1 ? step2Valid : step === 2 ? step3Valid : false;
  const reducedMotion = useReducedMotion();

  /* ---- Success Screen ---- */
  if (showSuccess) {
    return (
      <WarehouseSuccessAnimation
        title={t('Shipment Created!')}
        subtitle={t('Your shipment has been created and is ready to process.')}
        summaryItems={[
          { label: t('Recipient'), value: recipientName },
          { label: t('Items'), value: `${items.length} ${t('Items')}, ${totalUnits} ${t('units')}` },
          ...(carrier ? [{ label: t('Carrier'), value: carrier }] : []),
        ]}
        steps={[
          { icon: Package, title: t('Shipment details have been saved'), description: t('Items have been reserved from stock') },
          { icon: Truck, title: t('Tracking will be available once shipped'), description: '' },
        ]}
        primaryAction={{ label: t('View Shipment'), onClick: () => navigate(`/warehouse/shipments/${createdShipmentId}`) }}
        secondaryAction={{ label: t('New Shipment'), onClick: () => window.location.reload() }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-28 md:pb-12">
      {/* Header: back + title + step counter */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-lg -ml-2 active:scale-[0.97] transition-transform duration-150 ease-out"
          onClick={() => step > 0 ? goToStep(step - 1) : navigate('/warehouse/shipments')}
          aria-label={t('Back', { ns: 'common' })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {t('Create Shipment')}
          </p>
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {t(WIZARD_STEPS[step].label)}
          </h1>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {step + 1} / {WIZARD_STEPS.length}
        </span>
      </div>

      {/* Step indicator — numbered dots joined by a hairline */}
      <ol className="mb-6 flex items-start sm:mb-8">
        {WIZARD_STEPS.map((s, i) => {
          const isActive = i === step;
          const isDone = i < step;
          const isLast = i === WIZARD_STEPS.length - 1;
          return (
            <li key={i} className={`relative flex min-w-0 ${isLast ? 'flex-none' : 'flex-1'}`}>
              <button
                type="button"
                onClick={() => i <= step && goToStep(i)}
                disabled={i > step}
                aria-current={isActive ? 'step' : undefined}
                className="group flex min-h-11 min-w-0 flex-col items-center gap-1.5 disabled:cursor-default"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium tabular-nums transition-colors duration-200 ease-out ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isDone
                      ? 'border-primary bg-background text-primary group-hover:bg-primary/5'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
                </span>
                <span className={`max-w-[5.5rem] truncate text-xs ${
                  isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
                }`}>
                  {t(s.short)}
                </span>
              </button>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`mx-2 mt-3.5 h-px flex-1 transition-colors duration-200 ease-out ${
                    isDone ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Step content — short cross-fade, no slide theatrics */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={reducedMotion ? {} : { opacity: 0, x: direction === 'forward' ? 8 : -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reducedMotion ? {} : { opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className="space-y-4"
        >

      {/* Step 0: Recipient & Priority */}
      {step === 0 && (
        <>
          <Section
            icon={Search}
            title={t('Find existing recipient')}
            subtitle={t('Search by name, company, or email')}
          >
            <RecipientSearchField
              value={recipientSearch}
              onChange={setRecipientSearch}
              results={recipientResults}
              onSelect={selectRecipient}
              placeholder={t('Search recipients...')}
            />
          </Section>

          <Section
            icon={Users}
            title={t('Recipient Type')}
            subtitle={t('Who are you shipping to?')}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {RECIPIENT_TYPES.map((rt) => {
                const RTIcon = rt.icon;
                const isSelected = recipientType === rt.value;
                return (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => setRecipientType(rt.value as RecipientType)}
                    aria-pressed={isSelected}
                    className={`${optionTileClass(isSelected)} flex min-h-11 items-center gap-2.5 px-3 py-2.5 text-left`}
                  >
                    <RTIcon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
                    <span className="truncate font-medium">{t(rt.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            icon={Zap}
            title={t('Priority')}
            subtitle={t('How urgent is this shipment?')}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRIORITY_PILLS.map((p) => {
                const isSelected = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value as ShipmentPriority)}
                    aria-pressed={isSelected}
                    className={`${optionTileClass(isSelected)} flex min-h-11 items-center justify-center gap-2 px-3 py-2.5 font-medium`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.dot}`} aria-hidden="true" />
                    {t(p.label)}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            icon={User}
            title={t('Contact details')}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t('Recipient Name')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="h-11 rounded-lg"
                  placeholder={t('Full name')}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t('Company')}</Label>
                <Input
                  value={recipientCompany}
                  onChange={(e) => setRecipientCompany(e.target.value)}
                  className="h-11 rounded-lg"
                  placeholder={t('Optional')}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t('Email')}
                </Label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="h-11 rounded-lg"
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t('Phone')}
                </Label>
                <Input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="h-11 rounded-lg"
                  placeholder="+49 …"
                />
              </div>
            </div>
          </Section>

          <Section
            icon={MapPin}
            title={t('Shipping address')}
          >
            <AddressAutocompleteInput
              label={t('Street')}
              required
              value={shippingStreet}
              onChange={setShippingStreet}
              countryHint={shippingCountry}
              placeholder={t('Street and number')}
              className={`h-11 rounded-lg ${addressErrorFor('street') ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
              onAddressPicked={(picked) => {
                if (picked.street) setShippingStreet(picked.street);
                if (picked.city) setShippingCity(picked.city);
                if (picked.postalCode) setShippingPostalCode(picked.postalCode);
                if (picked.country) setShippingCountry(picked.country);
              }}
            />
            {addressErrorFor('street') && (
              <p className="-mt-2 text-xs text-destructive">
                {t(addressErrorFor('street')!.i18nKey, addressErrorFor('street')!.i18nParams)}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t('Postal Code')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={shippingPostalCode}
                  onChange={(e) => setShippingPostalCode(e.target.value)}
                  onBlur={() => setShippingPostalCode(normalizePostalCode(shippingPostalCode, shippingCountry))}
                  className={`h-11 rounded-lg ${addressErrorFor('postalCode') ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                  placeholder="PLZ"
                />
                {addressErrorFor('postalCode') && (
                  <p className="text-xs text-destructive mt-1">
                    {t(addressErrorFor('postalCode')!.i18nKey, addressErrorFor('postalCode')!.i18nParams)}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t('City')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={shippingCity}
                  aria-label={t('City')}
                  onChange={(e) => setShippingCity(e.target.value)}
                  className={`h-11 rounded-lg ${addressErrorFor('city') ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                />
                {addressErrorFor('city') && (
                  <p className="text-xs text-destructive mt-1">
                    {t(addressErrorFor('city')!.i18nKey, addressErrorFor('city')!.i18nParams)}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t('Country')}
                </Label>
                <Select value={shippingCountry} onValueChange={setShippingCountry}>
                  <SelectTrigger className="w-full min-w-0 h-11 rounded-lg">
                    <SelectValue placeholder={t('Country')} />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>)}
                    {countries.length === 0 && <SelectItem value="DE">Germany (DE)</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/*
              Address validation banner — consolidated.
              Priority of display (top to bottom):
                1. Blue "Did you mean?" if Google suggests a correction
                2. Yellow warning if DHL flagged the address
                3. Single slim green confirmation when everything is fine
                4. Subtle loading state while a check is in flight
            */}
            {addressValidation.valid && (() => {
              const isChecking = googleValidation === null || dhlValidating;
              const dhlHasIssue = !!dhlValidation && dhlValidation.configured && !dhlValidation.valid;
              const showSuggestion = !!hasGoogleSuggestion;
              const googleOk = !!googleValidation?.enabled && !!googleValidation?.valid && !showSuggestion;
              const dhlOk = !!dhlValidation && dhlValidation.configured && dhlValidation.valid;
              const allOk = !isChecking && !showSuggestion && !dhlHasIssue && (googleOk || dhlOk);

              if (showSuggestion) {
                return (
                  <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">
                        {t('Did you mean:')}
                      </div>
                      <div className="mt-0.5 text-muted-foreground">
                        {googleValidation?.normalized?.formattedAddress}
                      </div>
                      {(googleValidation?.messages?.length ?? 0) > 0 && (
                        <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                          {googleValidation?.messages.slice(0, 3).map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={applyGoogleSuggestion}
                      className="h-9 shrink-0 rounded-md px-3 active:scale-[0.97] transition-transform duration-150 ease-out"
                    >
                      {t('Apply')}
                    </Button>
                  </div>
                );
              }
              if (dhlHasIssue) {
                return (
                  <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{t('DHL flagged this address')}</div>
                      <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                        {dhlValidation?.messages.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                      <div className="mt-1.5 text-xs text-muted-foreground">{t('You can still continue — DHL will re-check at label creation.')}</div>
                    </div>
                  </div>
                );
              }
              if (isChecking) {
                return (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{t('Checking address...')}</span>
                  </div>
                );
              }
              if (allOk) {
                return (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" strokeWidth={2.5} aria-hidden="true" />
                    <span>{t('Address verified')}</span>
                  </div>
                );
              }
              return null;
            })()}
          </Section>

          {recipientType === 'influencer' && (
            <Section
              icon={Sparkles}
              title={t('Influencer sample details')}
            >
              <SampleMetaFields meta={sampleMeta} onChange={setSampleMeta} />
            </Section>
          )}
        </>
      )}

      {/* Step 1: Items */}
      {step === 1 && (
        <>
          <Section
            icon={Package}
            title={t('Items')}
            subtitle={
              items.length > 0
                ? t('{{items}} item(s) · {{units}} units', { items: items.length, units: totalUnits })
                : t('Add products to this shipment')
            }
          >
            <AnimatePresence>
              {items.map((item, idx) => {
                const hasError = item.maxAvailable > 0 && item.quantity > item.maxAvailable;
                const isComplete = item.productId && item.batchId && item.locationId && item.quantity > 0 && !hasError;
                return (
                  <motion.div
                    key={idx}
                    layout
                    initial={reducedMotion ? {} : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? {} : { opacity: 0 }}
                    transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                    className={`space-y-4 rounded-lg border bg-card p-4 transition-colors duration-150 ${
                      hasError ? 'border-destructive' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums ${
                          isComplete
                            ? 'border-primary text-primary'
                            : 'border-border text-muted-foreground'
                        }`}>
                          {isComplete ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : idx + 1}
                        </span>
                        <span className={`truncate text-sm font-medium ${item.productName ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {item.productName || t('New item')}
                        </span>
                        {item.quantity > 0 && (
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            ×{item.quantity}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="-mr-2 h-11 w-11 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-[0.97] transition-[background-color,color,transform] duration-150 ease-out"
                        onClick={() => removeItem(idx)}
                        aria-label={t('Remove item')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">
                          {t('Product')}
                        </Label>
                        <Select value={item.productId} onValueChange={(v) => updateItem(idx, 'productId', v)}>
                          <SelectTrigger className="w-full min-w-0 h-11 rounded-lg">
                            <SelectValue placeholder={t('Select Product')} />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">
                          {t('Batch')}
                        </Label>
                        {item.loadingBatches ? (
                          <div className="flex h-11 items-center gap-2 rounded-lg border px-3 text-sm text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {t('Loading...', { ns: 'common' })}
                          </div>
                        ) : (
                          <Select
                            value={item.batchId}
                            onValueChange={(v) => updateItem(idx, 'batchId', v)}
                            disabled={!item.productId || item.batchOptions.length === 0}
                          >
                            <SelectTrigger className="w-full min-w-0 h-11 rounded-lg">
                              <SelectValue placeholder={!item.productId ? t('Select Product first') : t('Select Batch')} />
                            </SelectTrigger>
                            <SelectContent>
                              {item.batchOptions.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.serialNumber} {b.status ? `(${b.status})` : ''} {b.quantity != null ? `— ${b.quantity} ${t('units')}` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">
                          {t('Location')}
                        </Label>
                        <Select value={item.locationId} onValueChange={(v) => updateItem(idx, 'locationId', v)}>
                          <SelectTrigger className="w-full min-w-0 h-11 rounded-lg">
                            <SelectValue placeholder={t('Select Warehouse')} />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          {t('Quantity')}
                          {item.maxAvailable > 0 && (
                            <span className="ml-auto font-normal tabular-nums">
                              {item.maxAvailable} {t('Available Stock')}
                            </span>
                          )}
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={item.maxAvailable || undefined}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                          className={`h-11 rounded-lg tabular-nums ${hasError ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                        />
                        {hasError && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('Total would exceed batch size', { batchSize: item.maxAvailable })}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <div className={bundles.length > 0 ? 'grid gap-2 sm:grid-cols-2' : ''}>
              <button
                type="button"
                onClick={addItem}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-sm font-medium text-muted-foreground transition-[background-color,border-color,color,transform] duration-150 ease-out hover:border-primary/50 hover:bg-muted/50 hover:text-foreground active:scale-[0.97]"
              >
                <Plus className="h-4 w-4" />
                {t('Add Item')}
              </button>

              {/* Only offered when Sets are actually defined. */}
              {bundles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBundlePickerOpen(true)}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-sm font-medium text-muted-foreground transition-[background-color,border-color,color,transform] duration-150 ease-out hover:border-primary/50 hover:bg-muted/50 hover:text-foreground active:scale-[0.97]"
                >
                  <PackagePlus className="h-4 w-4" />
                  {t('Insert Set')}
                </button>
              )}
            </div>

            <Dialog open={bundlePickerOpen} onOpenChange={setBundlePickerOpen}>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('Insert Set')}</DialogTitle>
                  <DialogDescription>
                    {t('All components are added as separate positions, so each one can be picked and scanned individually.')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  {bundles.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => void insertBundle(b)}
                      className="w-full rounded-lg border p-3 text-left transition-[background-color,border-color] duration-150 ease-out hover:border-primary/50 hover:bg-muted/50"
                    >
                      <div className="font-medium text-sm break-words">{b.shopifyProductTitle}</div>
                      <div className="mb-2 mt-0.5 text-xs text-muted-foreground">
                        {b.shopifyVariantTitle} · {b.components.length} {t('Components')}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {b.components.map(c => (
                          <span key={c.id} className="rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                            {c.quantity}× {c.productName}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </Section>

          {/* Live totals summary — visible while building the item list */}
          {items.length > 0 && (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 sm:px-6"
            >
              <p className="text-xs text-muted-foreground">{t('Summary')}</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium tabular-nums text-foreground">{items.length}</span> {t('Items')}
                <span className="mx-2 text-border" aria-hidden="true">|</span>
                <span className="font-medium tabular-nums text-foreground">{totalUnits}</span> {t('Total Units')}
              </p>
            </motion.div>
          )}
        </>
      )}

      {/* Step 2: Shipping */}
      {step === 2 && (
        <>
          {/* Smart Packing Assistant — top priority, always visible */}
          <SmartPackingCard
            items={resolvedItems}
            packageWeightKg={weightGrams ? Number(weightGrams) / 1000 : 0}
            packagingTareKg={defaultTareKg}
            destinationCountry={shippingCountry}
            originCountry="DE"
            customerType={recipientType === 'customer' ? 'b2c' : 'b2b'}
            declaredValueEur={shippingCost ? Number(shippingCost) : 0}
            onPickService={(id) => {
              const match = id.split('_')[0];
              const opt = CARRIER_OPTIONS.find((o) => o.toLowerCase().includes(match));
              if (opt) setCarrier(opt);
            }}
          />

          <Section
            icon={Truck}
            title={t('Carrier & Tracking')}
            subtitle={carrier ? `${carrier}${serviceLevel ? ' · ' + serviceLevel : ''}` : t('Pick a carrier')}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t('Carrier')}</Label>
                <Select value={carrier} onValueChange={setCarrier}>
                  <SelectTrigger className="w-full min-w-0 h-11 rounded-lg">
                    <SelectValue placeholder={t('Carrier')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIER_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t('Tracking Number')}</Label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="h-11 rounded-lg"
                  placeholder="e.g. DE00123…"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t('Service Level')}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { v: 'standard', label: 'Standard' },
                  { v: 'express', label: 'Express' },
                  { v: 'overnight', label: 'Overnight' },
                  { v: 'economy', label: 'Economy' },
                ].map((sl) => (
                  <button
                    key={sl.v}
                    type="button"
                    onClick={() => setServiceLevel(serviceLevel === sl.v ? '' : sl.v)}
                    aria-pressed={serviceLevel === sl.v}
                    className={`${optionTileClass(serviceLevel === sl.v)} min-h-11 px-3 py-2.5 font-medium`}
                  >
                    {sl.label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section
            icon={CreditCard}
            title={t('Delivery & Cost')}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t('Estimated Delivery')}
                </Label>
                <Input
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  className="h-11 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t('Shipping Cost')} <span className="font-normal">(EUR)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">€</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    placeholder="0.00"
                    className="h-11 pl-7 rounded-lg tabular-nums"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t('Shipping Weight (g)')}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(e.target.value)}
                    placeholder="0"
                    className="h-11 rounded-lg tabular-nums pr-14"
                  />
                  {weightGrams && Number(weightGrams) > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums pointer-events-none">
                      {(Number(weightGrams) / 1000).toFixed(2)} kg
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Section>

          <Section
            icon={FileText}
            title={t('References & Notes')}
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t('Order Reference')}</Label>
              <Input
                value={orderReference}
                onChange={(e) => setOrderReference(e.target.value)}
                className="h-11 rounded-lg"
                placeholder="e.g. PO-2026-042"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t('External Notes')}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="rounded-lg resize-none"
                  placeholder={t('Visible to recipient')}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t('Internal Notes')}</Label>
                <Textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={3}
                  className="rounded-lg resize-none"
                  placeholder={t('Team only')}
                />
              </div>
            </div>
          </Section>
        </>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <>
          {/* Hero card: all green, this is the moment of truth */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-start gap-3 rounded-xl border bg-card p-4 sm:p-6"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('Final review')}</p>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{t('Ready to ship')}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                <span className="tabular-nums">{items.length}</span> {t('Items')} · <span className="tabular-nums">{totalUnits}</span> {t('units')} · {recipientName || '—'}
              </p>
            </div>
          </motion.div>

          <Section
            icon={User}
            title={t('Recipient')}
            action={
              <Button variant="ghost" size="sm" className="-mr-2 -my-2 h-9 shrink-0 rounded-md px-2.5 text-xs text-muted-foreground hover:text-foreground active:scale-[0.97] transition-[background-color,color,transform] duration-150 ease-out" onClick={() => goToStep(0)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> {t('Edit step')}
              </Button>
            }
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-medium text-foreground">{recipientName}</span>
                  {recipientCompany && <span className="text-sm text-muted-foreground">{recipientCompany}</span>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="gap-1.5 font-normal">
                    <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_PILLS.find(p => p.value === priority)?.dot ?? 'bg-muted-foreground/70'}`} aria-hidden="true" />
                    {t(priority)}
                  </Badge>
                  <Badge variant="outline" className="font-normal">{t(recipientType)}</Badge>
                </div>
                <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{shippingStreet}, {shippingPostalCode} {shippingCity}, {shippingCountry}</span>
                </p>
                {(recipientEmail || recipientPhone) && (
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {recipientEmail && (
                      <span className="flex min-w-0 items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{recipientEmail}</span></span>
                    )}
                    {recipientPhone && (
                      <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{recipientPhone}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section
            icon={Package}
            title={t('Items')}
            subtitle={`${items.length} ${t('Items')} · ${totalUnits} ${t('Total Units')}`}
          >
            <div className="overflow-x-auto overscroll-x-contain rounded-lg border">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">{t('Product')}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">{t('Batch')}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">{t('Location')}</th>
                    <th className="w-20 text-right px-3 py-2 text-xs font-medium text-muted-foreground">{t('Quantity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="px-3 py-2.5 font-medium text-foreground break-words [overflow-wrap:anywhere]">
                        {item.productName || '—'}
                        {item.batchSerial && (
                          <span className="block truncate text-xs font-normal text-muted-foreground sm:hidden">{item.batchSerial}</span>
                        )}
                      </td>
                      <td className="hidden truncate px-3 py-2.5 text-muted-foreground sm:table-cell">{item.batchSerial || '—'}</td>
                      <td className="hidden truncate px-3 py-2.5 text-muted-foreground md:table-cell">{item.locationName || '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/40">
                    <td className="px-3 py-2.5 font-medium text-foreground">{t('Total')}</td>
                    <td className="hidden sm:table-cell" />
                    <td className="hidden md:table-cell" />
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums text-foreground">{totalUnits}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>

          <Section
            icon={Truck}
            title={t('Shipping')}
            action={
              <Button variant="ghost" size="sm" className="-mr-2 -my-2 h-9 shrink-0 rounded-md px-2.5 text-xs text-muted-foreground hover:text-foreground active:scale-[0.97] transition-[background-color,color,transform] duration-150 ease-out" onClick={() => goToStep(2)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> {t('Edit step')}
              </Button>
            }
          >
            {!carrier && !trackingNumber && !serviceLevel && !estimatedDelivery && !shippingCost && !weightGrams ? (
              <p className="text-sm text-muted-foreground">{t('No shipping details provided')}</p>
            ) : (
              <dl className="grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
                {carrier && (
                  <div className="flex items-center justify-between gap-3 border-b py-2.5">
                    <dt className="text-muted-foreground">{t('Carrier')}</dt>
                    <dd className="font-medium text-foreground">{carrier}</dd>
                  </div>
                )}
                {trackingNumber && (
                  <div className="flex items-center justify-between gap-3 border-b py-2.5">
                    <dt className="text-muted-foreground">{t('Tracking Number')}</dt>
                    <dd className="truncate font-medium tabular-nums text-foreground">{trackingNumber}</dd>
                  </div>
                )}
                {serviceLevel && (
                  <div className="flex items-center justify-between gap-3 border-b py-2.5">
                    <dt className="text-muted-foreground">{t('Service Level')}</dt>
                    <dd className="font-medium capitalize text-foreground">{serviceLevel}</dd>
                  </div>
                )}
                {estimatedDelivery && (
                  <div className="flex items-center justify-between gap-3 border-b py-2.5">
                    <dt className="text-muted-foreground">{t('Estimated Delivery')}</dt>
                    <dd className="font-medium tabular-nums text-foreground">{estimatedDelivery}</dd>
                  </div>
                )}
                {shippingCost && (
                  <div className="flex items-center justify-between gap-3 border-b py-2.5">
                    <dt className="text-muted-foreground">{t('Shipping Cost')}</dt>
                    <dd className="font-medium tabular-nums text-foreground">€{Number(shippingCost).toFixed(2)}</dd>
                  </div>
                )}
                {weightGrams && (
                  <div className="flex items-center justify-between gap-3 border-b py-2.5">
                    <dt className="text-muted-foreground">{t('Weight')}</dt>
                    <dd className="font-medium tabular-nums text-foreground">{(Number(weightGrams) / 1000).toFixed(2)} kg</dd>
                  </div>
                )}
                {orderReference && (
                  <div className="flex items-center justify-between gap-3 border-b py-2.5 sm:col-span-2">
                    <dt className="text-muted-foreground">{t('Order Reference')}</dt>
                    <dd className="truncate font-medium tabular-nums text-foreground">{orderReference}</dd>
                  </div>
                )}
              </dl>
            )}
          </Section>
        </>
      )}
        </motion.div>
      </AnimatePresence>

      {/* Portal clears transformed route ancestors and the mobile navigation. */}
      <div className="mt-6">
      <StickyBottomBar className="bottom-[calc(var(--bottom-nav-h)+var(--safe-bottom))] pb-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => step > 0 ? goToStep(step - 1) : navigate('/warehouse/shipments')}
            className="h-11 rounded-lg active:scale-[0.97] transition-[background-color,transform] duration-150 ease-out"
            aria-label={t('Back', { ns: 'common' })}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">{t('Back', { ns: 'common' })}</span>
          </Button>

          {step < WIZARD_STEPS.length - 1 ? (
            <Button
              size="lg"
              onClick={() => goToStep(step + 1)}
              disabled={!canAdvance}
              className="h-11 flex-1 rounded-lg shadow-none active:scale-[0.97] transition-[background-color,opacity,transform] duration-150 ease-out md:flex-none"
            >
              {t('Continue', { ns: 'common' })}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={loading}
              className="h-11 flex-1 rounded-lg shadow-none active:scale-[0.97] transition-[background-color,opacity,transform] duration-150 ease-out md:flex-none"
            >
              {loading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" strokeWidth={2.5} />
              )}
              {loading ? t('Creating...', { ns: 'common' }) : t('Create & Send')}
            </Button>
          )}
      </StickyBottomBar>
      </div>
    </div>
  );
}
