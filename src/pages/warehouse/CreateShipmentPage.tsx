import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Plus, Trash2, Check, Search, User, Package, Truck, ClipboardCheck,
  ArrowLeft, ArrowRight, Mail, Phone, Pencil, CreditCard, FileText,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { WarehouseStepIndicator } from '@/components/warehouse/WarehouseStepIndicator';
import { WarehouseStepTransition } from '@/components/warehouse/WarehouseStepTransition';
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
  { icon: User, label: 'Recipient & Priority' },
  { icon: Package, label: 'Items' },
  { icon: Truck, label: 'Shipping' },
  { icon: ClipboardCheck, label: 'Confirmation' },
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

  // Collapsible sections state for Step 3
  const [carrierOpen, setCarrierOpen] = useState(true);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [refsOpen, setRefsOpen] = useState(false);

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
   * master → batch override when the product itself has no dimensions/weight set.
   */
  const resolvedItems: ContentItem[] = useMemo(() => {
    return items.reduce<ContentItem[]>((acc, row) => {
      if (!row.productId || row.quantity <= 0) return acc;
      const prod = products.find((p) => p.id === row.productId);
      const batch = row.batchOptions.find((b) => b.id === row.batchId);
      const lengthCm = prod?.productDepthCm ?? batch?.productDepthCm;
      const widthCm = prod?.productWidthCm ?? batch?.productWidthCm;
      const heightCm = prod?.productHeightCm ?? batch?.productHeightCm;
      const weightKg =
        prod?.grossWeight ??
        prod?.netWeight ??
        batch?.grossWeight ??
        batch?.netWeight ??
        0;
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
    <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6 pb-24 px-0 sm:px-0">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => step > 0 ? goToStep(step - 1) : navigate('/warehouse/shipments')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg sm:text-2xl font-bold tracking-tight">{t('Create Shipment')}</h1>
      </div>

      {/* Step Indicator */}
      <WarehouseStepIndicator steps={WIZARD_STEPS} currentStep={step} />

      {/* Step 0: Recipient & Priority */}
      {step === 0 && (
        <WarehouseStepTransition direction={direction} stepKey={step}>
          <Card>
            <CardHeader className="px-4 sm:px-6"><CardTitle className="text-base sm:text-lg flex items-center gap-2"><User className="h-4 w-4 sm:h-5 sm:w-5" /> {t('Recipient & Priority')}</CardTitle></CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder={t('Search recipients...')} value={recipientSearch} onChange={(e) => setRecipientSearch(e.target.value)} className="pl-9" />
                {recipientResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
                    {recipientResults.map((r) => (
                      <button key={`${r.type}-${r.id}`} className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent flex items-center gap-2" onClick={() => selectRecipient(r)}>
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${r.type === 'customer' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {r.type === 'customer' ? t('customer') : 'B2B'}
                        </span>
                        <span className="font-medium">{r.name}</span>
                        {r.company && <span className="text-muted-foreground">({r.company})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('Recipient Type')}</Label>
                  <Select value={recipientType} onValueChange={(v) => setRecipientType(v as RecipientType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">{t('customer')}</SelectItem>
                      <SelectItem value="b2b_partner">{t('b2b_partner')}</SelectItem>
                      <SelectItem value="warehouse">{t('warehouse')}</SelectItem>
                      <SelectItem value="influencer">{t('influencer')}</SelectItem>
                      <SelectItem value="other">{t('other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('Priority')}</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as ShipmentPriority)}>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`${PRIORITY_COLORS[priority]} text-[10px] px-1.5 py-0`}>{t(priority)}</Badge>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {(['low', 'normal', 'high', 'urgent'] as ShipmentPriority[]).map(p => (
                        <SelectItem key={p} value={p}>
                          <div className="flex items-center gap-2"><Badge variant="secondary" className={`${PRIORITY_COLORS[p]} text-[10px] px-1.5 py-0`}>{t(p)}</Badge></div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2"><Label>{t('Recipient Name')} *</Label><Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} /></div>
                <div className="space-y-2"><Label>{t('Company')}</Label><Input value={recipientCompany} onChange={(e) => setRecipientCompany(e.target.value)} /></div>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2"><Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {t('Email')}</Label><Input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} /></div>
                <div className="space-y-2"><Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {t('Phone')}</Label><Input type="tel" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>{t('Street')} *</Label><Input value={shippingStreet} onChange={(e) => setShippingStreet(e.target.value)} /></div>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                <div className="space-y-2"><Label>{t('Postal Code')} *</Label><Input value={shippingPostalCode} onChange={(e) => setShippingPostalCode(e.target.value)} /></div>
                <div className="space-y-2"><Label>{t('City')} *</Label><Input value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} /></div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>{t('Country')}</Label>
                  <Select value={shippingCountry} onValueChange={setShippingCountry}>
                    <SelectTrigger><SelectValue placeholder={t('Country')} /></SelectTrigger>
                    <SelectContent>
                      {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>)}
                      {countries.length === 0 && <SelectItem value="DE">Germany (DE)</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {recipientType === 'influencer' && <SampleMetaFields meta={sampleMeta} onChange={setSampleMeta} />}
              <div className="flex justify-end pt-2">
                <Button onClick={() => goToStep(1)} disabled={!step1Valid}>{t('Continue', { ns: 'common' })} <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </WarehouseStepTransition>
      )}

      {/* Step 1: Items */}
      {step === 1 && (
        <WarehouseStepTransition direction={direction} stepKey={step}>
          <Card>
            <CardHeader className="px-4 sm:px-6"><CardTitle className="text-base sm:text-lg flex items-center gap-2"><Package className="h-4 w-4 sm:h-5 sm:w-5" /> {t('Items')}</CardTitle></CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              {items.map((item, idx) => (
                <div key={idx} className="rounded-lg border p-3 sm:p-4 space-y-3 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">#{idx + 1}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                  </div>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t('Product')}</Label>
                      <Select value={item.productId} onValueChange={(v) => updateItem(idx, 'productId', v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={t('Select Product')} /></SelectTrigger>
                        <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('Batch')}</Label>
                      {item.loadingBatches ? (
                        <div className="h-9 rounded-md border flex items-center px-3 text-sm text-muted-foreground animate-pulse">{t('Loading...', { ns: 'common' })}</div>
                      ) : (
                        <Select value={item.batchId} onValueChange={(v) => updateItem(idx, 'batchId', v)} disabled={!item.productId || item.batchOptions.length === 0}>
                          <SelectTrigger className="h-9"><SelectValue placeholder={!item.productId ? t('Select Product first') : t('Select Batch')} /></SelectTrigger>
                          <SelectContent>
                            {item.batchOptions.map((b) => (
                              <SelectItem key={b.id} value={b.id}>{b.serialNumber} {b.status ? `(${b.status})` : ''} {b.quantity != null ? `— ${b.quantity} ${t('units')}` : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t('Location')}</Label>
                      <Select value={item.locationId} onValueChange={(v) => updateItem(idx, 'locationId', v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={t('Select Warehouse')} /></SelectTrigger>
                        <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('Quantity')}{item.maxAvailable > 0 && <span className="text-muted-foreground ml-1">({t('Available Stock')}: {item.maxAvailable})</span>}</Label>
                      <Input type="number" min={1} max={item.maxAvailable || undefined} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                        className={`h-9 ${item.maxAvailable > 0 && item.quantity > item.maxAvailable ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                      {item.maxAvailable > 0 && item.quantity > item.maxAvailable && (
                        <p className="text-[10px] text-red-500 mt-0.5">{t('Total would exceed batch size', { batchSize: item.maxAvailable })}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addItem} className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />{t('Add Item')}</Button>
              {items.length > 0 && <div className="text-sm text-muted-foreground pt-1">{items.length} {t('Items')}, {totalUnits} {t('Total Units')}</div>}
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => goToStep(0)}><ArrowLeft className="mr-2 h-4 w-4" /> {t('Back', { ns: 'common' })}</Button>
                <Button onClick={() => goToStep(2)} disabled={!step2Valid}>{t('Continue', { ns: 'common' })} <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </WarehouseStepTransition>
      )}

      {/* Step 2: Shipping — Collapsible Sections */}
      {step === 2 && (
        <WarehouseStepTransition direction={direction} stepKey={step}>
          {/* Smart Packing Assistant — recommends carton + carriers based on items + weight */}
          <div className="mb-4">
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
          </div>
          <Card>
            <CardHeader className="px-4 sm:px-6"><CardTitle className="text-base sm:text-lg flex items-center gap-2"><Truck className="h-4 w-4 sm:h-5 sm:w-5" /> {t('Shipping')}</CardTitle></CardHeader>
            <CardContent className="space-y-3 px-4 sm:px-6">
              {/* Carrier & Tracking */}
              <Collapsible open={carrierOpen} onOpenChange={setCarrierOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-medium"><Truck className="h-4 w-4 text-primary" /> {t('Carrier & Tracking')}</div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${carrierOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-4 px-1">
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t('Carrier')}</Label>
                      <Select value={carrier} onValueChange={setCarrier}>
                        <SelectTrigger><SelectValue placeholder={t('Carrier')} /></SelectTrigger>
                        <SelectContent>{CARRIER_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>{t('Tracking Number')}</Label><Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('Service Level')}</Label>
                    <Select value={serviceLevel} onValueChange={setServiceLevel}>
                      <SelectTrigger><SelectValue placeholder={t('Service Level')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="express">Express</SelectItem>
                        <SelectItem value="overnight">Overnight</SelectItem>
                        <SelectItem value="economy">Economy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Delivery & Cost */}
              <Collapsible open={deliveryOpen} onOpenChange={setDeliveryOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-medium"><CreditCard className="h-4 w-4 text-primary" /> {t('Delivery & Cost')}</div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${deliveryOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-4 px-1">
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-2"><Label>{t('Estimated Delivery')}</Label><Input type="date" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} /></div>
                    <div className="space-y-2"><Label>{t('Shipping Cost')} (EUR)</Label><Input type="number" step="0.01" min="0" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} placeholder="0.00" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('Shipping Weight (g)')}</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min="0" value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} placeholder="0" />
                      {weightGrams && Number(weightGrams) > 0 && <span className="text-xs text-muted-foreground whitespace-nowrap">{(Number(weightGrams) / 1000).toFixed(1)} kg</span>}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* References & Notes */}
              <Collapsible open={refsOpen} onOpenChange={setRefsOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4 text-primary" /> {t('References & Notes')}</div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${refsOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-4 px-1">
                  <div className="space-y-2"><Label>{t('Order Reference')}</Label><Input value={orderReference} onChange={(e) => setOrderReference(e.target.value)} /></div>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-2"><Label>{t('External Notes')}</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
                    <div className="space-y-2"><Label>{t('Internal Notes')}</Label><Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} /></div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => goToStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> {t('Back', { ns: 'common' })}</Button>
                <Button onClick={() => goToStep(3)}>{t('Continue', { ns: 'common' })} <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </WarehouseStepTransition>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <WarehouseStepTransition direction={direction} stepKey={step}>
          <div className="space-y-3 sm:space-y-4">
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between px-4 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2"><User className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t('Recipient')}</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => goToStep(0)}><Pencil className="h-3 w-3 mr-1" /> {t('Edit step')}</Button>
              </CardHeader>
              <CardContent className="text-sm space-y-1 px-4 sm:px-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{recipientName}</span>
                  {recipientCompany && <span className="text-muted-foreground">({recipientCompany})</span>}
                  <Badge variant="secondary" className={PRIORITY_COLORS[priority]}>{t(priority)}</Badge>
                  <Badge variant="outline">{t(recipientType)}</Badge>
                </div>
                <p className="text-muted-foreground">{shippingStreet}, {shippingPostalCode} {shippingCity}, {shippingCountry}</p>
                {(recipientEmail || recipientPhone) && (
                  <p className="text-muted-foreground">
                    {recipientEmail}{recipientEmail && recipientPhone && ' · '}{recipientPhone}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between px-4 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2"><Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t('Items')} ({items.length})</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => goToStep(1)}><Pencil className="h-3 w-3 mr-1" /> {t('Edit step')}</Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead><tr className="border-b">
                      <th className="text-left px-3 sm:px-4 py-2 font-medium">{t('Product')}</th>
                      <th className="text-left px-3 sm:px-4 py-2 font-medium hidden sm:table-cell">{t('Batch')}</th>
                      <th className="text-left px-3 sm:px-4 py-2 font-medium hidden md:table-cell">{t('Location')}</th>
                      <th className="text-right px-3 sm:px-4 py-2 font-medium">{t('Quantity')}</th>
                    </tr></thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="px-3 sm:px-4 py-2">{item.productName || '—'}</td>
                          <td className="px-3 sm:px-4 py-2 hidden sm:table-cell">{item.batchSerial || '—'}</td>
                          <td className="px-3 sm:px-4 py-2 hidden md:table-cell">{item.locationName || '—'}</td>
                          <td className="px-3 sm:px-4 py-2 text-right tabular-nums font-medium">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="bg-muted/50">
                      <td className="px-3 sm:px-4 py-2 font-medium">{t('Total')}</td>
                      <td className="hidden sm:table-cell" />
                      <td className="hidden md:table-cell" />
                      <td className="px-3 sm:px-4 py-2 text-right tabular-nums font-bold">{totalUnits}</td>
                    </tr></tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between px-4 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2"><Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t('Shipping')}</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => goToStep(2)}><Pencil className="h-3 w-3 mr-1" /> {t('Edit step')}</Button>
              </CardHeader>
              <CardContent className="text-sm space-y-1 px-4 sm:px-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4">
                  {carrier && <><span className="text-muted-foreground">{t('Carrier')}</span><span>{carrier}</span></>}
                  {trackingNumber && <><span className="text-muted-foreground">{t('Tracking Number')}</span><span className="font-mono">{trackingNumber}</span></>}
                  {serviceLevel && <><span className="text-muted-foreground">{t('Service Level')}</span><span>{serviceLevel}</span></>}
                  {estimatedDelivery && <><span className="text-muted-foreground">{t('Estimated Delivery')}</span><span>{estimatedDelivery}</span></>}
                  {shippingCost && <><span className="text-muted-foreground">{t('Shipping Cost')}</span><span>€{Number(shippingCost).toFixed(2)}</span></>}
                  {weightGrams && <><span className="text-muted-foreground">{t('Weight')}</span><span>{weightGrams} g ({(Number(weightGrams) / 1000).toFixed(1)} kg)</span></>}
                  {orderReference && <><span className="text-muted-foreground">{t('Order Reference')}</span><span>{orderReference}</span></>}
                </div>
                {!carrier && !trackingNumber && !serviceLevel && <p className="text-muted-foreground">{t('No shipping details provided')}</p>}
              </CardContent>
            </Card>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => goToStep(2)}><ArrowLeft className="mr-2 h-4 w-4" /> {t('Back', { ns: 'common' })}</Button>
              <Button onClick={handleSubmit} disabled={loading} size="lg"><Check className="mr-2 h-4 w-4" />{t('Create & Send')}</Button>
            </div>
          </div>
        </WarehouseStepTransition>
      )}
    </div>
  );
}
