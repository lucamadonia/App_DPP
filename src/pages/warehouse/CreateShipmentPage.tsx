import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Plus, Trash2, Check, Search, User, Package, Truck, ClipboardCheck,
  ArrowLeft, ArrowRight, Mail, Phone, Pencil,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProducts } from '@/services/supabase/products';
import { getBatches } from '@/services/supabase/batches';
import { getActiveLocations } from '@/services/supabase/wh-locations';
import { getStockLevels } from '@/services/supabase/wh-stock';
import { searchRecipients, type RecipientSearchResult } from '@/services/supabase/wh-contacts';
import { createShipment } from '@/services/supabase/wh-shipments';
import { PRIORITY_COLORS } from '@/lib/warehouse-constants';
import type { WhLocation, WhShipmentItemInput, RecipientType, ShipmentPriority } from '@/types/warehouse';
import { CARRIER_OPTIONS } from '@/types/warehouse';
import type { BatchListItem } from '@/types/product';

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

/* -------------------------------------------------------------------------- */
/*  Step Indicator                                                             */
/* -------------------------------------------------------------------------- */

const STEPS = [
  { key: 1, icon: User, labelKey: 'Recipient & Priority' },
  { key: 2, icon: Package, labelKey: 'Items' },
  { key: 3, icon: Truck, labelKey: 'Shipping' },
  { key: 4, icon: ClipboardCheck, labelKey: 'Confirmation' },
];

function StepIndicator({ current, t }: { current: number; t: (key: string) => string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {STEPS.map((s, idx) => {
        const isDone = current > s.key;
        const isCurrent = current === s.key;
        const Icon = s.icon;
        return (
          <div key={s.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center rounded-full transition-all duration-300 ${
                isDone
                  ? 'h-9 w-9 bg-green-500 text-white'
                  : isCurrent
                    ? 'h-10 w-10 bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30 ring-offset-2 ring-offset-background'
                    : 'h-9 w-9 bg-muted text-muted-foreground'
              }`}>
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-[10px] sm:text-xs mt-1.5 text-center whitespace-nowrap ${
                isCurrent ? 'font-semibold text-foreground' : isDone ? 'text-green-600' : 'text-muted-foreground'
              }`}>
                <span className="hidden sm:inline">{t(s.labelKey)}</span>
                <span className="sm:hidden">{idx + 1}/{STEPS.length}</span>
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 sm:mx-3 ${isDone ? 'bg-green-500' : 'bg-muted'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page Component                                                             */
/* -------------------------------------------------------------------------- */

export function CreateShipmentPage() {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

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

  // Step 2: Items
  const [items, setItems] = useState<ItemRow[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
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

  // Load products & locations
  useEffect(() => {
    (async () => {
      const [p, l] = await Promise.all([getProducts(), getActiveLocations()]);
      setProducts(p.map((pr: { id: string; name: string }) => ({ id: pr.id, name: pr.name })));
      setLocations(l);
    })();
  }, []);

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

      // Load batches for selected product
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

    // When batch+location selected, look up available stock
    if ((field === 'batchId' || field === 'locationId') && updated[idx].batchId && updated[idx].locationId) {
      try {
        const stock = await getStockLevels({
          batchId: updated[idx].batchId,
          locationId: updated[idx].locationId,
        });
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
        productId: i.productId,
        batchId: i.batchId,
        locationId: i.locationId,
        quantity: i.quantity,
      }));
      const shipment = await createShipment({
        recipientType,
        recipientName,
        recipientCompany: recipientCompany || undefined,
        recipientEmail: recipientEmail || undefined,
        recipientPhone: recipientPhone || undefined,
        shippingStreet,
        shippingCity,
        shippingPostalCode,
        shippingCountry,
        carrier: carrier || undefined,
        trackingNumber: trackingNumber || undefined,
        serviceLevel: serviceLevel || undefined,
        estimatedDelivery: estimatedDelivery || undefined,
        shippingCost: shippingCost ? Number(shippingCost) : undefined,
        orderReference: orderReference || undefined,
        notes: notes || undefined,
        internalNotes: internalNotes || undefined,
        contactId: contactId || undefined,
        priority,
        items: shipmentItems,
      });
      toast.success(t('Shipment created successfully'));
      navigate(`/warehouse/shipments/${shipment.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const step1Valid = !!recipientName && !!shippingStreet && !!shippingCity && !!shippingPostalCode;
  const step2Valid = items.length > 0 && items.every(i => i.productId && i.batchId && i.locationId && i.quantity > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(step - 1) : navigate('/warehouse/shipments')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('Create Shipment')}</h1>
      </div>

      {/* Step Indicator */}
      <StepIndicator current={step} t={t} />

      {/* Step 1: Recipient & Priority */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" /> {t('Recipient & Priority')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Recipient Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('Search recipients...')}
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                className="pl-9"
              />
              {recipientResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
                  {recipientResults.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent flex items-center gap-2"
                      onClick={() => selectRecipient(r)}
                    >
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

            {/* Recipient Type + Priority */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('Recipient Type')}</Label>
                <Select value={recipientType} onValueChange={(v) => setRecipientType(v as RecipientType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">{t('customer')}</SelectItem>
                    <SelectItem value="b2b_partner">{t('b2b_partner')}</SelectItem>
                    <SelectItem value="warehouse">{t('warehouse')}</SelectItem>
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
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`${PRIORITY_COLORS[p]} text-[10px] px-1.5 py-0`}>{t(p)}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Name + Company */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('Recipient Name')} *</Label>
                <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('Company')}</Label>
                <Input value={recipientCompany} onChange={(e) => setRecipientCompany(e.target.value)} />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {t('Email')}</Label>
                <Input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {t('Phone')}</Label>
                <Input type="tel" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label>{t('Street')} *</Label>
              <Input value={shippingStreet} onChange={(e) => setShippingStreet(e.target.value)} />
            </div>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('Postal Code')} *</Label>
                <Input value={shippingPostalCode} onChange={(e) => setShippingPostalCode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('City')} *</Label>
                <Input value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>{t('Country')}</Label>
                <Input value={shippingCountry} onChange={(e) => setShippingCountry(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!step1Valid}>
                {t('Continue', { ns: 'common' })} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Items */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" /> {t('Items')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="rounded-lg border p-3 sm:p-4 space-y-3 relative">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">#{idx + 1}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>

                {/* Product + Batch */}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('Product')}</Label>
                    <Select value={item.productId} onValueChange={(v) => updateItem(idx, 'productId', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder={t('Select Product')} /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('Batch')}</Label>
                    {item.loadingBatches ? (
                      <div className="h-9 rounded-md border flex items-center px-3 text-sm text-muted-foreground animate-pulse">{t('Loading...', { ns: 'common' })}</div>
                    ) : (
                      <Select
                        value={item.batchId}
                        onValueChange={(v) => updateItem(idx, 'batchId', v)}
                        disabled={!item.productId || item.batchOptions.length === 0}
                      >
                        <SelectTrigger className="h-9">
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

                {/* Location + Quantity */}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('Location')}</Label>
                    <Select value={item.locationId} onValueChange={(v) => updateItem(idx, 'locationId', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder={t('Select Warehouse')} /></SelectTrigger>
                      <SelectContent>
                        {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {t('Quantity')}
                      {item.maxAvailable > 0 && (
                        <span className="text-muted-foreground ml-1">({t('Available Stock')}: {item.maxAvailable})</span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={item.maxAvailable || undefined}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                      className={`h-9 ${item.maxAvailable > 0 && item.quantity > item.maxAvailable ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    />
                    {item.maxAvailable > 0 && item.quantity > item.maxAvailable && (
                      <p className="text-[10px] text-red-500 mt-0.5">{t('Total would exceed batch size', { batchSize: item.maxAvailable })}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addItem} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t('Add Item')}
            </Button>

            {items.length > 0 && (
              <div className="text-sm text-muted-foreground pt-1">
                {items.length} {t('Items')}, {totalUnits} {t('Total Units')}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {t('Back', { ns: 'common' })}
              </Button>
              <Button onClick={() => setStep(3)} disabled={!step2Valid}>
                {t('Continue', { ns: 'common' })} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Shipping */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Truck className="h-5 w-5" /> {t('Shipping')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('Carrier')}</Label>
                <Select value={carrier} onValueChange={setCarrier}>
                  <SelectTrigger><SelectValue placeholder={t('Carrier')} /></SelectTrigger>
                  <SelectContent>
                    {CARRIER_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('Tracking Number')}</Label>
                <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
              <div className="space-y-2">
                <Label>{t('Estimated Delivery')}</Label>
                <Input type="date" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('Shipping Cost')} (EUR)</Label>
                <Input type="number" step="0.01" min="0" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>{t('Shipping Weight (g)')}</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" min="0" value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} placeholder="0" />
                  {weightGrams && Number(weightGrams) > 0 && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{(Number(weightGrams) / 1000).toFixed(1)} kg</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('Order Reference')}</Label>
              <Input value={orderReference} onChange={(e) => setOrderReference(e.target.value)} />
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('External Notes')}</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>{t('Internal Notes')}</Label>
                <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {t('Back', { ns: 'common' })}
              </Button>
              <Button onClick={() => setStep(4)}>
                {t('Continue', { ns: 'common' })} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Recipient Summary */}
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" /> {t('Recipient')}</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setStep(1)}>
                <Pencil className="h-3 w-3 mr-1" /> {t('Edit step')}
              </Button>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{recipientName}</span>
                {recipientCompany && <span className="text-muted-foreground">({recipientCompany})</span>}
                <Badge variant="secondary" className={PRIORITY_COLORS[priority]}>{t(priority)}</Badge>
                <Badge variant="outline">{t(recipientType)}</Badge>
              </div>
              <p className="text-muted-foreground">{shippingStreet}, {shippingPostalCode} {shippingCity}, {shippingCountry}</p>
              {(recipientEmail || recipientPhone) && (
                <p className="text-muted-foreground">
                  {recipientEmail && <span>{recipientEmail}</span>}
                  {recipientEmail && recipientPhone && <span> · </span>}
                  {recipientPhone && <span>{recipientPhone}</span>}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Items Summary */}
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><Package className="h-4 w-4" /> {t('Items')} ({items.length})</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setStep(2)}>
                <Pencil className="h-3 w-3 mr-1" /> {t('Edit step')}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-4 py-2 font-medium">{t('Product')}</th>
                      <th className="text-left px-4 py-2 font-medium">{t('Batch')}</th>
                      <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">{t('Location')}</th>
                      <th className="text-right px-4 py-2 font-medium">{t('Quantity')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-4 py-2">{item.productName || '—'}</td>
                        <td className="px-4 py-2">{item.batchSerial || '—'}</td>
                        <td className="px-4 py-2 hidden sm:table-cell">{item.locationName || '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-medium">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50">
                      <td colSpan={3} className="px-4 py-2 font-medium">{t('Total')}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-bold">{totalUnits}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Summary */}
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><Truck className="h-4 w-4" /> {t('Shipping')}</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setStep(3)}>
                <Pencil className="h-3 w-3 mr-1" /> {t('Edit step')}
              </Button>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="grid grid-cols-2 gap-y-1 gap-x-4">
                {carrier && <><span className="text-muted-foreground">{t('Carrier')}</span><span>{carrier}</span></>}
                {trackingNumber && <><span className="text-muted-foreground">{t('Tracking Number')}</span><span className="font-mono">{trackingNumber}</span></>}
                {serviceLevel && <><span className="text-muted-foreground">{t('Service Level')}</span><span>{serviceLevel}</span></>}
                {estimatedDelivery && <><span className="text-muted-foreground">{t('Estimated Delivery')}</span><span>{estimatedDelivery}</span></>}
                {shippingCost && <><span className="text-muted-foreground">{t('Shipping Cost')}</span><span>€{Number(shippingCost).toFixed(2)}</span></>}
                {weightGrams && <><span className="text-muted-foreground">{t('Weight')}</span><span>{weightGrams} g ({(Number(weightGrams) / 1000).toFixed(1)} kg)</span></>}
                {orderReference && <><span className="text-muted-foreground">{t('Order Reference')}</span><span>{orderReference}</span></>}
              </div>
              {!carrier && !trackingNumber && !serviceLevel && (
                <p className="text-muted-foreground">{t('No shipping details provided')}</p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(3)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> {t('Back', { ns: 'common' })}
            </Button>
            <Button onClick={handleSubmit} disabled={loading} size="lg">
              <Check className="mr-2 h-4 w-4" />
              {t('Create & Send')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
