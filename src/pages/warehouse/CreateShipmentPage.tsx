import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Trash2, Check, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProducts } from '@/services/supabase/products';
import { getActiveLocations } from '@/services/supabase/wh-locations';
import { getStockLevels } from '@/services/supabase/wh-stock';
import { searchRecipients, type RecipientSearchResult } from '@/services/supabase/wh-contacts';
import { createShipment } from '@/services/supabase/wh-shipments';
import type { WhLocation, WhShipmentItemInput, RecipientType } from '@/types/warehouse';
import { CARRIER_OPTIONS } from '@/types/warehouse';

interface ItemRow {
  productId: string;
  productName: string;
  batchId: string;
  batchSerial: string;
  locationId: string;
  locationName: string;
  quantity: number;
  maxAvailable: number;
}

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
  const [shippingStreet, setShippingStreet] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [shippingCountry, setShippingCountry] = useState('DE');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientResults, setRecipientResults] = useState<RecipientSearchResult[]>([]);

  // Step 2: Items
  const [items, setItems] = useState<ItemRow[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<WhLocation[]>([]);

  // Step 3: Shipping
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function load() {
      const [p, l] = await Promise.all([getProducts(), getActiveLocations()]);
      setProducts(p.map((pr: { id: string; name: string }) => ({ id: pr.id, name: pr.name })));
      setLocations(l);
    }
    load();
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
    setShippingStreet(r.street || '');
    setShippingCity(r.city || '');
    setShippingPostalCode(r.postalCode || '');
    setShippingCountry(r.country || 'DE');
    setRecipientSearch('');
    setRecipientResults([]);
  };

  const addItem = () => {
    setItems([...items, {
      productId: '', productName: '', batchId: '', batchSerial: '',
      locationId: '', locationName: '', quantity: 1, maxAvailable: 0,
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
    }

    // When batch+location selected, look up available stock
    if ((field === 'batchId' || field === 'locationId') && updated[idx].batchId && updated[idx].locationId) {
      const stock = await getStockLevels({
        batchId: updated[idx].batchId,
        locationId: updated[idx].locationId,
      });
      updated[idx].maxAvailable = stock[0]?.quantityAvailable || 0;
    }

    if (field === 'locationId') {
      const loc = locations.find(l => l.id === value);
      updated[idx].locationName = loc?.name || '';
    }

    setItems(updated);
  };

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
        shippingStreet,
        shippingCity,
        shippingPostalCode,
        shippingCountry,
        carrier: carrier || undefined,
        trackingNumber: trackingNumber || undefined,
        orderReference: orderReference || undefined,
        notes: notes || undefined,
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

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t('Create Shipment')}</h1>

      <div className="flex gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>

      {/* Step 1: Recipient */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{t('Recipient')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
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
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('Recipient Name')}</Label>
                <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('Company')}</Label>
                <Input value={recipientCompany} onChange={(e) => setRecipientCompany(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Street')}</Label>
              <Input value={shippingStreet} onChange={(e) => setShippingStreet(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('Postal Code')}</Label>
                <Input value={shippingPostalCode} onChange={(e) => setShippingPostalCode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('City')}</Label>
                <Input value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('Country')}</Label>
                <Input value={shippingCountry} onChange={(e) => setShippingCountry(e.target.value)} />
              </div>
            </div>
            <Button onClick={() => setStep(2)} disabled={!recipientName || !shippingStreet || !shippingCity || !shippingPostalCode}>
              {t('Continue', { ns: 'common' })}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Items */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('Items')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">#{idx + 1}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('Product')}</Label>
                    <Select value={item.productId} onValueChange={(v) => updateItem(idx, 'productId', v)}>
                      <SelectTrigger><SelectValue placeholder={t('Select Product')} /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('Location')}</Label>
                    <Select value={item.locationId} onValueChange={(v) => updateItem(idx, 'locationId', v)}>
                      <SelectTrigger><SelectValue placeholder={t('Select Warehouse')} /></SelectTrigger>
                      <SelectContent>
                        {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('Batch')}</Label>
                    <Input
                      value={item.batchId}
                      onChange={(e) => updateItem(idx, 'batchId', e.target.value)}
                      placeholder="Batch ID"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('Quantity')} {item.maxAvailable > 0 && `(max: ${item.maxAvailable})`}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={item.maxAvailable || undefined}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addItem}>
              <Plus className="mr-2 h-4 w-4" />
              {t('Add Item')}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>{t('Back', { ns: 'common' })}</Button>
              <Button onClick={() => setStep(3)} disabled={items.length === 0 || items.some(i => !i.productId || !i.batchId || !i.locationId || i.quantity <= 0)}>
                {t('Continue', { ns: 'common' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Shipping */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{t('Shipping')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-2">
              <Label>{t('Order Reference')}</Label>
              <Input value={orderReference} onChange={(e) => setOrderReference(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('Notes')}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>{t('Back', { ns: 'common' })}</Button>
              <Button onClick={() => setStep(4)}>{t('Continue', { ns: 'common' })}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{t('Confirmation')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('Recipient')}:</span><span className="font-medium">{recipientName} {recipientCompany ? `(${recipientCompany})` : ''}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('Shipping Address')}:</span><span>{shippingStreet}, {shippingPostalCode} {shippingCity}, {shippingCountry}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('Items')}:</span><span>{items.length} {t('Items')}, {totalItems} {t('units')}</span></div>
              {carrier && <div className="flex justify-between"><span className="text-muted-foreground">{t('Carrier')}:</span><span>{carrier}</span></div>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>{t('Back', { ns: 'common' })}</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                <Check className="mr-2 h-4 w-4" />
                {t('Create & Send')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
