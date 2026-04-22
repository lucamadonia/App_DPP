import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, History, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { countShopifyOrders, syncShopifyOrdersBackfill, type BackfillParams } from '@/services/supabase/shopify-integration';
import { toast } from 'sonner';

interface Props {
  onCompleted?: () => void;
}

export function ShopifyBackfillDialog({ onCompleted }: Props) {
  const { t } = useTranslation('warehouse');
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'preview' | 'confirm' | 'running' | 'done'>('form');
  const [busy, setBusy] = useState(false);

  const [createdAtMin, setCreatedAtMin] = useState('');
  const [createdAtMax, setCreatedAtMax] = useState('');
  const [status, setStatus] = useState<'any' | 'open' | 'closed' | 'cancelled'>('any');
  const [fulfillmentStatus, setFulfillmentStatus] = useState<'any' | 'unfulfilled' | 'partial' | 'shipped'>('any');
  const [financialStatus, setFinancialStatus] = useState('paid,partially_paid,refunded,partially_refunded');
  const [confirmText, setConfirmText] = useState('');

  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);

  function params(): BackfillParams {
    return {
      backfill: true,
      createdAtMin: createdAtMin ? `${createdAtMin}T00:00:00Z` : undefined,
      createdAtMax: createdAtMax ? `${createdAtMax}T23:59:59Z` : undefined,
      status,
      fulfillmentStatus,
      financialStatus: financialStatus === 'any' ? undefined : financialStatus,
      maxPages: 100,
    };
  }

  const handlePreview = async () => {
    setBusy(true);
    try {
      const { count } = await countShopifyOrders(params());
      setEstimatedCount(count);
      setStep('preview');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (confirmText !== 'IMPORTIEREN') {
      toast.error(t('Type IMPORTIEREN to confirm'));
      return;
    }
    setStep('running');
    setBusy(true);
    try {
      const res = await syncShopifyOrdersBackfill(params());
      setResult(res.data);
      setStep('done');
      onCompleted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setStep('confirm');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep('form');
    setEstimatedCount(null);
    setResult(null);
    setConfirmText('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <History className="h-4 w-4" />
          {t('Import historical orders')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('Import historical orders')}</DialogTitle>
          <DialogDescription>
            {t('Fetch all past Shopify orders into Trackbliss. Already-fulfilled orders are imported as shipped shipments.')}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="from">{t('From')}</Label>
                <Input id="from" type="date" value={createdAtMin} onChange={e => setCreatedAtMin(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="to">{t('To')}</Label>
                <Input id="to" type="date" value={createdAtMax} onChange={e => setCreatedAtMax(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>{t('Order status')}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'any' | 'open' | 'closed' | 'cancelled')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t('Any')}</SelectItem>
                  <SelectItem value="open">{t('Open')}</SelectItem>
                  <SelectItem value="closed">{t('Closed')}</SelectItem>
                  <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('Fulfillment status')}</Label>
              <Select value={fulfillmentStatus} onValueChange={(v) => setFulfillmentStatus(v as 'any' | 'unfulfilled' | 'partial' | 'shipped')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t('Any')}</SelectItem>
                  <SelectItem value="unfulfilled">{t('Unfulfilled')}</SelectItem>
                  <SelectItem value="partial">{t('Partial')}</SelectItem>
                  <SelectItem value="shipped">{t('Shipped')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fs">{t('Financial statuses (comma-separated or "any")')}</Label>
              <Input id="fs" value={financialStatus} onChange={e => setFinancialStatus(e.target.value)} placeholder="paid,refunded,..." />
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-3">
            <div className="rounded-lg border p-4 text-center">
              <div className="text-3xl font-bold">{estimatedCount?.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">{t('Orders will be imported')}</div>
            </div>
            {(estimatedCount ?? 0) > 1000 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  {t('Large import — this may take several minutes. The backend paginates 250 orders at a time with rate-limit safety.')}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-3">
            <div className="text-sm">
              {t('Importing {{count}} orders. Type IMPORTIEREN to confirm.', { count: estimatedCount ?? '?' })}
            </div>
            <Input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="IMPORTIEREN"
              className="font-mono"
            />
          </div>
        )}

        {step === 'running' && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {t('Importing… this runs in the background. You can close this dialog.')}
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-2">
            <div className="rounded-lg border p-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>{t('Total fetched')}:</div><div className="font-mono">{result.counts?.total}</div>
                <div>{t('Created')}:</div><div className="font-mono text-green-700">{result.counts?.created}</div>
                <div>{t('Skipped')}:</div><div className="font-mono">{result.counts?.skipped}</div>
                <div>{t('Failed')}:</div><div className="font-mono text-red-700">{result.counts?.failed}</div>
                <div>{t('Unmapped variants')}:</div><div className="font-mono">{result.unmappedVariants ?? 0}</div>
                <div>{t('Pages processed')}:</div><div className="font-mono">{result.pagesCompleted}</div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'form' && (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
              <Button onClick={handlePreview} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('Estimate count')}
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('form')}>{t('Back')}</Button>
              <Button onClick={() => setStep('confirm')} disabled={(estimatedCount ?? 0) === 0}>
                {t('Proceed')}
              </Button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('preview')}>{t('Back')}</Button>
              <Button onClick={handleConfirm} disabled={busy || confirmText !== 'IMPORTIEREN'}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('Start import')}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={() => setOpen(false)}>{t('Close')}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
