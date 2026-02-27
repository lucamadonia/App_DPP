import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProducts } from '@/services/supabase/products';
import { getBatches } from '@/services/supabase/batches';
import { getActiveLocations } from '@/services/supabase/wh-locations';
import { createGoodsReceipt } from '@/services/supabase/wh-stock';
import type { WhLocation } from '@/types/warehouse';

export function GoodsReceiptPage() {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [batches, setBatches] = useState<{ id: string; serial_number: string; quantity: number }[]>([]);
  const [locations, setLocations] = useState<WhLocation[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [productId, setProductId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [quantityDamaged, setQuantityDamaged] = useState(0);
  const [quantityQuarantine, setQuantityQuarantine] = useState(0);
  const [binLocation, setBinLocation] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function load() {
      const [p, l] = await Promise.all([
        getProducts(),
        getActiveLocations(),
      ]);
      setProducts(p.map((pr: { id: string; name: string }) => ({ id: pr.id, name: pr.name })));
      setLocations(l);
    }
    load();
  }, []);

  useEffect(() => {
    if (productId) {
      getBatches(productId).then((b) =>
        setBatches(b.map((batch) => ({
          id: batch.id,
          serial_number: batch.serialNumber,
          quantity: batch.quantity ?? 0,
        })))
      );
    }
  }, [productId]);

  const handleSubmit = async () => {
    if (!productId || !batchId || !locationId || quantity <= 0) return;
    setLoading(true);
    try {
      await createGoodsReceipt({
        locationId,
        productId,
        batchId,
        quantity,
        quantityDamaged: quantityDamaged || 0,
        quantityQuarantine: quantityQuarantine || 0,
        binLocation: binLocation || undefined,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
      });
      toast.success(t('Goods received successfully'));
      navigate('/warehouse/inventory');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const goodQuantity = quantity - quantityDamaged - quantityQuarantine;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('Create Goods Receipt')}</h1>
        <p className="text-muted-foreground">{t('Step {{step}} of 3', { step, ns: 'common' }).replace('Step {{step}} of 3', `Step ${step} of 3`)}</p>
      </div>

      {/* Step Indicators */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('Select Product')} & {t('Select Batch')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Product')}</Label>
              <Select value={productId} onValueChange={(v) => { setProductId(v); setBatchId(''); }}>
                <SelectTrigger><SelectValue placeholder={t('Select Product')} /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {productId && (
              <div className="space-y-2">
                <Label>{t('Batch')}</Label>
                <Select value={batchId} onValueChange={setBatchId}>
                  <SelectTrigger><SelectValue placeholder={t('Select Batch')} /></SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.serial_number} (Qty: {b.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={() => setStep(2)} disabled={!productId || !batchId}>
              {t('Continue', { ns: 'common' })}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('Select Warehouse')} & {t('Quantity')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Location')}</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger><SelectValue placeholder={t('Select Warehouse')} /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} {l.code ? `(${l.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('Good Condition')}</Label>
                <Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>{t('Damaged')}</Label>
                <Input type="number" min={0} value={quantityDamaged} onChange={(e) => setQuantityDamaged(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>{t('Quarantine')}</Label>
                <Input type="number" min={0} value={quantityQuarantine} onChange={(e) => setQuantityQuarantine(Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Bin Location')}</Label>
              <Input value={binLocation} onChange={(e) => setBinLocation(e.target.value)} placeholder="z.B. A-03-12" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>{t('Back', { ns: 'common' })}</Button>
              <Button onClick={() => setStep(3)} disabled={!locationId || quantity <= 0}>
                {t('Continue', { ns: 'common' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('Receipt Summary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Product')}:</span>
                <span className="font-medium">{products.find(p => p.id === productId)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Batch')}:</span>
                <span className="font-medium">{batches.find(b => b.id === batchId)?.serial_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Location')}:</span>
                <span className="font-medium">{locations.find(l => l.id === locationId)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Quantity')}:</span>
                <span className="font-medium">{quantity} ({goodQuantity} {t('Good Condition')}, {quantityDamaged} {t('Damaged')}, {quantityQuarantine} {t('Quarantine')})</span>
              </div>
              {binLocation && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Bin Location')}:</span>
                  <span className="font-medium">{binLocation}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('Delivery Note Number')}</Label>
              <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('Notes')}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>{t('Back', { ns: 'common' })}</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                <Check className="mr-2 h-4 w-4" />
                {t('Confirm Receipt')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
