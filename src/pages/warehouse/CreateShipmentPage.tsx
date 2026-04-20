import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Plus, Trash2, Check, Search, User, Package, Truck, ClipboardCheck,
  ArrowLeft, ArrowRight, Mail, Phone, Pencil, CreditCard, FileText,
  Building2, Users, Warehouse, Sparkles, MapPin, Calendar,
  Scale, Loader2, Zap, AlertTriangle, Globe,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { getStockLevels } from '@/services/supabase/wh-stock';
import { searchRecipients, type RecipientSearchResult } from '@/services/supabase/wh-contacts';
import { createShipment } from '@/services/supabase/wh-shipments';
import { getCountries } from '@/services/supabase/master-data';
import { PRIORITY_COLORS } from '@/lib/warehouse-constants';
import { SampleMetaFields } from '@/components/warehouse/SampleMetaFields';
import type { WhLocation, WhShipmentItemInput, RecipientType, ShipmentPriority, SampleShipmentMeta } from '@/types/warehouse';
import { CARRIER_OPTIONS } from '@/types/warehouse';
import type { BatchListItem } from '@/types/product';
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
  { icon: User, label: 'Recipient & Priority', short: 'Recipient', color: 'from-blue-500 to-violet-500' },
  { icon: Package, label: 'Items', short: 'Items', color: 'from-violet-500 to-fuchsia-500' },
  { icon: Truck, label: 'Shipping', short: 'Shipping', color: 'from-fuchsia-500 to-rose-500' },
  { icon: ClipboardCheck, label: 'Confirmation', short: 'Confirm', color: 'from-emerald-500 to-blue-500' },
];

/**
 * Recipient type picker — visual card grid replacing a dropdown. Much clearer
 * on mobile and makes the most common choice (customer vs B2B vs influencer)
 * a single tap.
 */
const RECIPIENT_TYPES: { value: 'customer' | 'b2b_partner' | 'warehouse' | 'influencer' | 'other'; icon: typeof User; labelKey: string; color: string }[] = [
  { value: 'customer', icon: User, labelKey: 'customer', color: 'from-blue-500 to-cyan-500' },
  { value: 'b2b_partner', icon: Building2, labelKey: 'b2b_partner', color: 'from-violet-500 to-fuchsia-500' },
  { value: 'warehouse', icon: Warehouse, labelKey: 'warehouse', color: 'from-emerald-500 to-teal-500' },
  { value: 'influencer', icon: Sparkles, labelKey: 'influencer', color: 'from-rose-500 to-pink-500' },
  { value: 'other', icon: Users, labelKey: 'other', color: 'from-slate-500 to-slate-600' },
];

/** Priority pill colors. Kept consistent with PRIORITY_COLORS for badges. */
const PRIORITY_PILLS: { value: 'low' | 'normal' | 'high' | 'urgent'; label: string; ringColor: string; textColor: string }[] = [
  { value: 'low', label: 'low', ringColor: 'ring-slate-400/60', textColor: 'text-slate-300' },
  { value: 'normal', label: 'normal', ringColor: 'ring-blue-400/60', textColor: 'text-blue-300' },
  { value: 'high', label: 'high', ringColor: 'ring-amber-400/60', textColor: 'text-amber-300' },
  { value: 'urgent', label: 'urgent', ringColor: 'ring-rose-400/60', textColor: 'text-rose-300' },
];

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
   */
  const resolvedItems: ContentItem[] = useMemo(() => {
    return items.reduce<ContentItem[]>((acc, row) => {
      if (!row.productId || row.quantity <= 0) return acc;
      const prod = products.find((p) => p.id === row.productId);
      const batch = row.batchOptions.find((b) => b.id === row.batchId);
      const lengthCm = prod?.productDepthCm ?? batch?.productDepthCm;
      const widthCm = prod?.productWidthCm ?? batch?.productWidthCm;
      const heightCm = prod?.productHeightCm ?? batch?.productHeightCm;
      const weightGrams =
        prod?.grossWeight ??
        prod?.netWeight ??
        batch?.grossWeight ??
        batch?.netWeight ??
        0;
      const weightKg = weightGrams / 1000;
      if (!lengthCm || !widthCm || !heightCm) return acc;
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
  }, []);

  // ─── Auto-fill weight from item dimensions × weights ─────────
  // Fills the weight field automatically when the user hasn't typed one.
  // Adds 400 g packaging tare. Stays out of the way once the user edits.
  useEffect(() => {
    if (computedTotalWeightKg <= 0) return;
    const current = Number(weightGrams);
    if (!weightGrams || current === 0) {
      const totalWithTare = computedTotalWeightKg + 0.4;
      setWeightGrams(String(Math.round(totalWithTare * 1000)));
    }
  }, [computedTotalWeightKg, weightGrams]);

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

  const step1Valid = !!recipientName && !!shippingStreet && !!shippingCity && !!shippingPostalCode;
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

  /* ---- Reusable motion helpers ---- */
  const fadeInUp = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: 'easeOut' as const } };

  /* ---- Reusable section wrapper ---- */
  const Section = ({ icon: Icon, title, subtitle, children, gradient }: {
    icon: typeof User; title: string; subtitle?: string; children: React.ReactNode; gradient?: string;
  }) => (
    <motion.div {...fadeInUp} className="relative">
      <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${gradient || 'from-blue-500/30 via-violet-500/20 to-fuchsia-500/30'} opacity-40 blur-sm pointer-events-none`} />
      <Card className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl shadow-slate-900/5">
        <div className="flex items-center gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient || 'from-blue-500 to-violet-500'} shadow-lg shadow-blue-500/20 flex-shrink-0`}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
          </div>
        </div>
        <CardContent className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="relative mx-auto max-w-4xl pb-28 sm:pb-12">
      {/* Ambient gradient background — subtle decoration */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-20 h-80 -z-10">
        <div className="absolute left-1/4 top-0 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-500/10" />
        <div className="absolute right-1/4 top-10 h-56 w-56 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-500/10" />
      </div>

      {/* Header with back button + step counter */}
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6 px-1">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => step > 0 ? goToStep(step - 1) : navigate('/warehouse/shipments')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              {t('Create Shipment')}
            </p>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {t(WIZARD_STEPS[step].label)}
            </h1>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[10px] sm:text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
          {step + 1} / {WIZARD_STEPS.length}
        </span>
      </div>

      {/* Custom step indicator — icon chips + connector bar */}
      <div className="relative mb-6 sm:mb-8 px-1">
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          {WIZARD_STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <button
                key={i}
                type="button"
                onClick={() => i <= step && goToStep(i)}
                disabled={i > step}
                className="group flex-1 flex flex-col items-center gap-1.5 min-w-0 disabled:cursor-not-allowed"
              >
                <div className="relative">
                  <div
                    className={`
                      flex items-center justify-center rounded-2xl transition-all duration-300
                      ${isActive
                        ? `h-11 w-11 sm:h-12 sm:w-12 bg-gradient-to-br ${s.color} shadow-lg shadow-blue-500/30 scale-110`
                        : isDone
                        ? 'h-10 w-10 sm:h-11 sm:w-11 bg-emerald-500 shadow-md shadow-emerald-500/20'
                        : 'h-10 w-10 sm:h-11 sm:w-11 bg-slate-200 dark:bg-slate-800'
                      }
                    `}
                  >
                    {isDone ? (
                      <Check className="h-5 w-5 text-white" strokeWidth={3} />
                    ) : (
                      <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    )}
                  </div>
                  {isActive && (
                    <motion.span
                      className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${s.color} opacity-40 blur-md -z-10`}
                      animate={reducedMotion ? undefined : { scale: [1, 1.15, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>
                <span className={`text-[10px] sm:text-xs font-semibold truncate w-full text-center ${
                  isActive
                    ? 'text-slate-900 dark:text-white'
                    : isDone
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {t(s.short)}
                </span>
              </button>
            );
          })}
        </div>
        {/* Connector progress bar */}
        <div className="absolute left-8 right-8 top-5 sm:top-6 -z-10 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500"
            initial={false}
            animate={{ width: `${(step / (WIZARD_STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' as const }}
          />
        </div>
      </div>

      {/* Step content — animated */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={reducedMotion ? {} : { opacity: 0, x: direction === 'forward' ? 24 : -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reducedMotion ? {} : { opacity: 0, x: direction === 'forward' ? -24 : 24 }}
          transition={{ duration: 0.3, ease: 'easeOut' as const }}
          className="space-y-4 sm:space-y-5"
        >

      {/* Step 0: Recipient & Priority */}
      {step === 0 && (
        <>
          <Section
            icon={Search}
            title={t('Find existing recipient')}
            subtitle={t('Search by name, company, or email')}
            gradient="from-blue-500 to-violet-500"
          >
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                placeholder={t('Search recipients...')}
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                className="pl-10 h-11 rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500/50"
              />
              <AnimatePresence>
                {recipientResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute z-20 mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10 max-h-60 overflow-y-auto p-1.5"
                  >
                    {recipientResults.map((r) => (
                      <button
                        key={`${r.type}-${r.id}`}
                        type="button"
                        onClick={() => selectRecipient(r)}
                        className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                      >
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold text-white ${
                          r.type === 'customer' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
                        }`}>
                          {r.type === 'customer' ? 'B2C' : 'B2B'}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold truncate">{r.name}</span>
                          {r.company && <span className="block text-xs text-slate-500 truncate">{r.company}</span>}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Section>

          <Section
            icon={Users}
            title={t('Recipient Type')}
            subtitle={t('Who are you shipping to?')}
            gradient="from-violet-500 to-fuchsia-500"
          >
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {RECIPIENT_TYPES.map((rt) => {
                const RTIcon = rt.icon;
                const isSelected = recipientType === rt.value;
                return (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => setRecipientType(rt.value as RecipientType)}
                    className={`relative rounded-xl border-2 p-3 text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-transparent bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg scale-[1.02]'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5'
                    }`}
                  >
                    {isSelected && (
                      <span className={`absolute inset-0 rounded-xl bg-gradient-to-br ${rt.color} opacity-20 pointer-events-none`} />
                    )}
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg mb-2 bg-gradient-to-br ${rt.color} shadow-md`}>
                      <RTIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="block text-xs font-semibold truncate">{t(rt.labelKey)}</span>
                    {isSelected && (
                      <Check className="absolute top-2 right-2 h-4 w-4 text-emerald-400" strokeWidth={3} />
                    )}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            icon={Zap}
            title={t('Priority')}
            subtitle={t('How urgent is this shipment?')}
            gradient="from-amber-500 to-rose-500"
          >
            <div className="grid grid-cols-4 gap-2">
              {PRIORITY_PILLS.map((p) => {
                const isSelected = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value as ShipmentPriority)}
                    className={`relative rounded-xl border-2 py-2.5 px-3 text-center transition-all duration-200 ${
                      isSelected
                        ? `border-transparent bg-slate-900 dark:bg-slate-100 ring-2 ${p.ringColor} shadow-lg scale-[1.02]`
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Badge
                      variant="secondary"
                      className={`${PRIORITY_COLORS[p.value as ShipmentPriority]} text-[10px] font-semibold px-2 py-0.5`}
                    >
                      {t(p.label)}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            icon={User}
            title={t('Contact details')}
            gradient="from-blue-500 to-cyan-500"
          >
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('Recipient Name')} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder={t('Full name')}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('Company')}</Label>
                <Input
                  value={recipientCompany}
                  onChange={(e) => setRecipientCompany(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder={t('Optional')}
                />
              </div>
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {t('Email')}
                </Label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {t('Phone')}
                </Label>
                <Input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="+49 …"
                />
              </div>
            </div>
          </Section>

          <Section
            icon={MapPin}
            title={t('Shipping address')}
            gradient="from-emerald-500 to-teal-500"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('Street')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={shippingStreet}
                onChange={(e) => setShippingStreet(e.target.value)}
                className="h-11 rounded-xl"
                placeholder={t('Street and number')}
              />
            </div>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('Postal Code')} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={shippingPostalCode}
                  onChange={(e) => setShippingPostalCode(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="PLZ"
                />
              </div>
              <div className="space-y-1.5 col-span-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('City')} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" /> {t('Country')}
                </Label>
                <Select value={shippingCountry} onValueChange={setShippingCountry}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder={t('Country')} />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>)}
                    {countries.length === 0 && <SelectItem value="DE">Germany (DE)</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          {recipientType === 'influencer' && (
            <Section
              icon={Sparkles}
              title={t('Influencer sample details')}
              gradient="from-rose-500 to-pink-500"
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
            gradient="from-violet-500 to-fuchsia-500"
          >
            <AnimatePresence>
              {items.map((item, idx) => {
                const hasError = item.maxAvailable > 0 && item.quantity > item.maxAvailable;
                const isComplete = item.productId && item.batchId && item.locationId && item.quantity > 0 && !hasError;
                return (
                  <motion.div
                    key={idx}
                    layout
                    initial={reducedMotion ? {} : { opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={reducedMotion ? {} : { opacity: 0, scale: 0.96, x: -40 }}
                    transition={{ duration: 0.25 }}
                    className={`relative rounded-2xl border p-4 space-y-3 transition-colors ${
                      hasError
                        ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                        : isComplete
                        ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700/40 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg font-bold text-xs flex-shrink-0 ${
                          isComplete
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {isComplete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : idx + 1}
                        </div>
                        <span className="text-sm font-semibold truncate text-slate-800 dark:text-slate-100">
                          {item.productName || t('New item')}
                        </span>
                        {item.quantity > 0 && (
                          <Badge variant="outline" className="text-[10px] font-mono">
                            ×{item.quantity}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          {t('Product')}
                        </Label>
                        <Select value={item.productId} onValueChange={(v) => updateItem(idx, 'productId', v)}>
                          <SelectTrigger className="h-10 rounded-lg">
                            <SelectValue placeholder={t('Select Product')} />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          {t('Batch')}
                        </Label>
                        {item.loadingBatches ? (
                          <div className="h-10 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2 px-3 text-sm text-slate-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {t('Loading...', { ns: 'common' })}
                          </div>
                        ) : (
                          <Select
                            value={item.batchId}
                            onValueChange={(v) => updateItem(idx, 'batchId', v)}
                            disabled={!item.productId || item.batchOptions.length === 0}
                          >
                            <SelectTrigger className="h-10 rounded-lg">
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
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          {t('Location')}
                        </Label>
                        <Select value={item.locationId} onValueChange={(v) => updateItem(idx, 'locationId', v)}>
                          <SelectTrigger className="h-10 rounded-lg">
                            <SelectValue placeholder={t('Select Warehouse')} />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          {t('Quantity')}
                          {item.maxAvailable > 0 && (
                            <span className="ml-auto normal-case font-normal text-[10px] text-slate-500">
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
                          className={`h-10 rounded-lg font-mono ${hasError ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                        />
                        {hasError && (
                          <p className="flex items-center gap-1 text-[10px] text-rose-500 mt-1">
                            <AlertTriangle className="h-3 w-3" />
                            {t('Total would exceed batch size', { batchSize: item.maxAvailable })}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <button
              type="button"
              onClick={addItem}
              className="w-full rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('Add Item')}
            </button>
          </Section>

          {/* Live totals summary — visible while building the item list */}
          {items.length > 0 && (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 p-4 text-white shadow-lg"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{t('Summary')}</p>
                  <p className="text-2xl font-bold tabular-nums mt-0.5">
                    {totalUnits} <span className="text-sm text-slate-300 font-normal">{t('Total Units')}</span>
                  </p>
                </div>
                <Badge className="bg-blue-500/20 text-blue-200 border border-blue-400/40">
                  {items.length} {t('Items')}
                </Badge>
              </div>
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
            gradient="from-fuchsia-500 to-rose-500"
          >
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('Carrier')}</Label>
                <Select value={carrier} onValueChange={setCarrier}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder={t('Carrier')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIER_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('Tracking Number')}</Label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="h-11 rounded-xl font-mono"
                  placeholder="e.g. DE00123…"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('Service Level')}</Label>
              <div className="grid grid-cols-4 gap-2">
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
                    className={`rounded-xl border-2 py-2.5 text-xs font-semibold transition-all ${
                      serviceLevel === sl.v
                        ? 'border-transparent bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-md'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
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
            gradient="from-emerald-500 to-blue-500"
          >
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> {t('Estimated Delivery')}
                </Label>
                <Input
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('Shipping Cost')} <span className="text-slate-400">(EUR)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-semibold pointer-events-none">€</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    placeholder="0.00"
                    className="h-11 pl-7 rounded-xl font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5" /> {t('Shipping Weight (g)')}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(e.target.value)}
                    placeholder="0"
                    className="h-11 rounded-xl font-mono pr-14"
                  />
                  {weightGrams && Number(weightGrams) > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 font-mono pointer-events-none">
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
            gradient="from-slate-500 to-slate-700"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('Order Reference')}</Label>
              <Input
                value={orderReference}
                onChange={(e) => setOrderReference(e.target.value)}
                className="h-11 rounded-xl font-mono"
                placeholder="e.g. PO-2026-042"
              />
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('External Notes')}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="rounded-xl resize-none"
                  placeholder={t('Visible to recipient')}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('Internal Notes')}</Label>
                <Textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={3}
                  className="rounded-xl resize-none"
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
            {...fadeInUp}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-blue-500 to-violet-500 p-6 sm:p-8 text-white shadow-2xl shadow-blue-500/20"
          >
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardCheck className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider opacity-90">{t('Final review')}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold">{t('Ready to ship')}</h2>
              <p className="text-sm sm:text-base text-white/80 mt-1">
                {items.length} {t('Items')} · {totalUnits} {t('units')} · {recipientName || '—'}
              </p>
            </div>
          </motion.div>

          <Section
            icon={User}
            title={t('Recipient')}
            gradient="from-blue-500 to-cyan-500"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-base font-bold text-slate-900 dark:text-white">{recipientName}</span>
                  {recipientCompany && <span className="text-sm text-slate-500">({recipientCompany})</span>}
                  <Badge variant="secondary" className={`${PRIORITY_COLORS[priority]} text-[10px] font-semibold`}>{t(priority)}</Badge>
                  <Badge variant="outline" className="text-[10px]">{t(recipientType)}</Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  {shippingStreet}, {shippingPostalCode} {shippingCity}, {shippingCountry}
                </p>
                {(recipientEmail || recipientPhone) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
                    {recipientEmail && (
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{recipientEmail}</span>
                    )}
                    {recipientPhone && (
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{recipientPhone}</span>
                    )}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-8 text-xs rounded-lg flex-shrink-0" onClick={() => goToStep(0)}>
                <Pencil className="h-3 w-3 mr-1" /> {t('Edit step')}
              </Button>
            </div>
          </Section>

          <Section
            icon={Package}
            title={t('Items')}
            subtitle={`${items.length} ${t('Items')} · ${totalUnits} ${t('Total Units')}`}
            gradient="from-violet-500 to-fuchsia-500"
          >
            <div className="-mx-2 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-slate-500">{t('Product')}</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-slate-500 hidden sm:table-cell">{t('Batch')}</th>
                    <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-slate-500 hidden md:table-cell">{t('Location')}</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-slate-500">{t('Quantity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">{item.productName || '—'}</td>
                      <td className="px-3 py-2.5 hidden sm:table-cell font-mono text-xs text-slate-600 dark:text-slate-400">{item.batchSerial || '—'}</td>
                      <td className="px-3 py-2.5 hidden md:table-cell text-slate-600 dark:text-slate-400">{item.locationName || '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-900 dark:text-slate-100">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-900/50">
                    <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">{t('Total')}</td>
                    <td className="hidden sm:table-cell" />
                    <td className="hidden md:table-cell" />
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-base text-blue-600 dark:text-blue-400">{totalUnits}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>

          <Section
            icon={Truck}
            title={t('Shipping')}
            gradient="from-fuchsia-500 to-rose-500"
          >
            {!carrier && !trackingNumber && !serviceLevel && !estimatedDelivery && !shippingCost && !weightGrams ? (
              <p className="text-sm text-slate-500 italic">{t('No shipping details provided')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {carrier && (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                    <span className="text-xs text-slate-500 uppercase font-semibold">{t('Carrier')}</span>
                    <span className="font-semibold">{carrier}</span>
                  </div>
                )}
                {trackingNumber && (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                    <span className="text-xs text-slate-500 uppercase font-semibold">{t('Tracking Number')}</span>
                    <span className="font-mono text-xs truncate">{trackingNumber}</span>
                  </div>
                )}
                {serviceLevel && (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                    <span className="text-xs text-slate-500 uppercase font-semibold">{t('Service Level')}</span>
                    <span className="font-semibold capitalize">{serviceLevel}</span>
                  </div>
                )}
                {estimatedDelivery && (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                    <span className="text-xs text-slate-500 uppercase font-semibold">{t('Estimated Delivery')}</span>
                    <span className="font-semibold">{estimatedDelivery}</span>
                  </div>
                )}
                {shippingCost && (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 uppercase font-semibold">{t('Shipping Cost')}</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">€{Number(shippingCost).toFixed(2)}</span>
                  </div>
                )}
                {weightGrams && (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                    <span className="text-xs text-slate-500 uppercase font-semibold">{t('Weight')}</span>
                    <span className="font-mono font-semibold">{(Number(weightGrams) / 1000).toFixed(2)} kg</span>
                  </div>
                )}
                {orderReference && (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2 sm:col-span-2">
                    <span className="text-xs text-slate-500 uppercase font-semibold">{t('Order Reference')}</span>
                    <span className="font-mono text-xs">{orderReference}</span>
                  </div>
                )}
              </div>
            )}
            <Button variant="ghost" size="sm" className="h-8 text-xs rounded-lg mt-2" onClick={() => goToStep(2)}>
              <Pencil className="h-3 w-3 mr-1" /> {t('Edit step')}
            </Button>
          </Section>
        </>
      )}
        </motion.div>
      </AnimatePresence>

      {/* Sticky bottom action bar — mobile + desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)] sm:static sm:z-auto sm:mt-6 sm:border-0 sm:bg-transparent sm:backdrop-blur-0 sm:shadow-none dark:sm:bg-transparent">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-2 px-4 py-3 sm:px-0 sm:py-0">
          <Button
            variant="outline"
            size="lg"
            onClick={() => step > 0 ? goToStep(step - 1) : navigate('/warehouse/shipments')}
            className="rounded-xl h-11"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">{t('Back', { ns: 'common' })}</span>
          </Button>

          {step < WIZARD_STEPS.length - 1 ? (
            <Button
              size="lg"
              onClick={() => goToStep(step + 1)}
              disabled={!canAdvance}
              className="rounded-xl h-11 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:from-slate-400 disabled:to-slate-400 text-white shadow-lg shadow-blue-500/30 disabled:shadow-none transition-all"
            >
              {t('Continue', { ns: 'common' })}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-xl h-11 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 text-white shadow-lg shadow-emerald-500/30 transition-all"
            >
              {loading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" strokeWidth={3} />
              )}
              {loading ? t('Creating...', { ns: 'common' }) : t('Create & Send')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
