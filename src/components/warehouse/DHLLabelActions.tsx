import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Download, Printer, XCircle, Truck, Scale, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/adaptive-dialog';
import {
  createDHLLabel,
  createDeutschePostLetterLabel,
  cancelDHLLabel,
  getDHLSettings,
  getDeutschePostLetterProducts,
} from '@/services/supabase/dhl-carrier';
import { DHL_PRODUCT_LABELS } from '@/types/dhl';
import type { DeutschePostLetterProduct, DHLParcelProduct } from '@/types/dhl';
import type { WhShipment } from '@/types/warehouse';

interface DHLLabelActionsProps {
  shipment: WhShipment;
  onUpdate: () => void;
}

export function DHLLabelActions({ shipment, onUpdate }: DHLLabelActionsProps) {
  const { t } = useTranslation('warehouse');
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [weightGramsInput, setWeightGramsInput] = useState('');
  const [shippingMethod, setShippingMethod] = useState<'parcel' | 'letter'>('parcel');
  const [hasParcelCredentials, setHasParcelCredentials] = useState(false);
  const [hasLetterCredentials, setHasLetterCredentials] = useState(false);
  const [letterProducts, setLetterProducts] = useState<DeutschePostLetterProduct[]>([]);
  const [letterProductsLoading, setLetterProductsLoading] = useState(false);
  const [letterProductCode, setLetterProductCode] = useState('');

  // Seed the editable weight from the shipment whenever the dialog opens.
  useEffect(() => {
    if (showPrintDialog) {
      setWeightGramsInput(shipment.totalWeightGrams ? String(shipment.totalWeightGrams) : '');
    }
  }, [showPrintDialog, shipment.totalWeightGrams]);

  // Only render for DHL carrier
  if (!shipment.carrier || shipment.carrier !== 'DHL') return null;

  const hasLabel = shipment.status === 'label_created' && !!shipment.labelUrl;
  const canCreate = ['draft', 'picking', 'packed'].includes(shipment.status) && !shipment.trackingNumber;
  const isShipped = ['shipped', 'in_transit', 'delivered'].includes(shipment.status);

  const openPrintDialog = async () => {
    // Check DHL configured first — no point opening the dialog if creds are missing.
    const settings = await getDHLSettings();
    const parcelReady = !!settings?.hasCredentials;
    const letterReady = !!(settings?.internetmarke.enabled && settings.internetmarke.hasCredentials);
    setHasParcelCredentials(parcelReady);
    setHasLetterCredentials(letterReady);
    if (!parcelReady && !letterReady) {
      toast.error(
        <div className="flex flex-col gap-1">
          <span>{t('DHL not configured')}</span>
          <Link to="/warehouse/integrations/dhl" className="text-primary hover:underline text-xs">
            {t('Configure DHL')} →
          </Link>
        </div>
      );
      return;
    }
    setShippingMethod(parcelReady ? 'parcel' : 'letter');
    if (letterReady) {
      setLetterProductsLoading(true);
      try {
        const products = await getDeutschePostLetterProducts();
        setLetterProducts(products);
        const destination = (shipment.shippingCountry || 'DE').toUpperCase();
        const transport = destination === 'DE' || destination === 'DEU' ? 'national' : 'international';
        const matching = products.filter((product) => product.transport === transport);
        setLetterProductCode((current) => matching.some((product) => product.productCode === current)
          ? current
          : matching[0]?.productCode || '');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('Could not load letter products'));
      } finally {
        setLetterProductsLoading(false);
      }
    }
    setShowPrintDialog(true);
  };

  const handleConfirmPrint = async () => {
    const grams = Number(weightGramsInput);
    if (!Number.isFinite(grams) || grams <= 0) {
      toast.error(t('Weight required for DHL label'));
      return;
    }

    setCreating(true);
    try {
      const override = grams !== shipment.totalWeightGrams ? grams : undefined;
      if (shippingMethod === 'letter' && !letterProductCode) {
        toast.error(t('Select a letter product'));
        return;
      }
      const result = shippingMethod === 'letter'
        ? await createDeutschePostLetterLabel(shipment.id, letterProductCode, override)
        : await createDHLLabel(shipment.id, undefined, override);
      // Surface which product the system auto-selected (e.g. Kleinpaket when it fit).
      const selectedLetter = letterProducts.find((product) => product.productCode === letterProductCode);
      const productName = shippingMethod === 'letter'
        ? selectedLetter?.name || t('Deutsche Post Brief')
        : result.product
        ? t(DHL_PRODUCT_LABELS[result.product as DHLParcelProduct] ?? result.product)
        : '';
      toast.success(productName ? t('Label created — {{product}}', { product: productName }) : t('Label Created Successfully'));
      if (result.validationMessages?.length) {
        result.validationMessages.forEach(msg => {
          if (msg.state === 'Warning') toast.warning(msg.message);
        });
      }
      setShowPrintDialog(false);
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error creating label');
    } finally {
      setCreating(false);
    }
  };

  const handleCancelLabel = async () => {
    setCancelling(true);
    try {
      await cancelDHLLabel(shipment.id);
      toast.success(shipment.carrierLabelData?.apiType === 'internetmarke'
        ? t('Letter stamp refund requested')
        : t('Label Cancelled Successfully'));
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cancelling label');
    } finally {
      setCancelling(false);
    }
  };

  const handleDownload = () => {
    if (shipment.labelUrl) {
      window.open(shipment.labelUrl, '_blank');
    }
  };

  const handlePrint = () => {
    if (shipment.labelUrl) {
      const w = window.open(shipment.labelUrl, '_blank');
      if (w) {
        w.addEventListener('load', () => w.print());
      }
    }
  };

  // State: Can create label — opens the weight-confirm dialog instead of
  // firing immediately, so the user gets one last chance to set weight.
  if (canCreate) {
    const weightKgPreview = weightGramsInput
      ? (Number(weightGramsInput) / 1000).toFixed(2)
      : null;
    const autoWeightKg = shipment.totalWeightGrams
      ? (shipment.totalWeightGrams / 1000).toFixed(2)
      : null;
    const destination = (shipment.shippingCountry || 'DE').toUpperCase();
    const expectedTransport = destination === 'DE' || destination === 'DEU' ? 'national' : 'international';
    const availableLetterProducts = letterProducts.filter((product) => product.transport === expectedTransport);
    const selectedLetterProduct = availableLetterProducts.find((product) => product.productCode === letterProductCode);
    return (
      <>
        <Button
          onClick={openPrintDialog}
          disabled={creating}
          className="bg-yellow-500 hover:bg-yellow-600 text-black"
          size="sm"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Truck className="h-4 w-4 mr-1.5" />
          )}
          {t('Create shipping label')}
        </Button>

        <Dialog open={showPrintDialog} onOpenChange={(o) => !creating && setShowPrintDialog(o)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {shippingMethod === 'letter'
                  ? <Mail className="h-5 w-5 text-blue-600" />
                  : <Scale className="h-5 w-5 text-amber-500" />}
                {t('Create shipping label')}
              </DialogTitle>
              <DialogDescription>
                {t('Choose the shipping method and confirm the packed shipment weight before purchase.')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {t('Shipping method')}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={shippingMethod === 'parcel' ? 'default' : 'outline'} disabled={!hasParcelCredentials} onClick={() => setShippingMethod('parcel')} className="justify-start">
                    <Truck className="mr-2 h-4 w-4" /> {t('DHL Parcel')}
                  </Button>
                  <Button type="button" variant={shippingMethod === 'letter' ? 'default' : 'outline'} disabled={!hasLetterCredentials} onClick={() => setShippingMethod('letter')} className="justify-start">
                    <Mail className="mr-2 h-4 w-4" /> {t('Deutsche Post Brief')}
                  </Button>
                </div>
              </div>

              {shippingMethod === 'letter' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    {t('Letter product')}
                  </Label>
                  <Select value={letterProductCode} onValueChange={setLetterProductCode} disabled={letterProductsLoading}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder={letterProductsLoading ? t('Loading products...') : t('Select a letter product')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLetterProducts.map((product) => (
                        <SelectItem key={product.productCode} value={product.productCode}>
                          {product.name} — {(product.priceCents / 100).toLocaleString(undefined, { style: 'currency', currency: product.currency || 'EUR' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedLetterProduct && (
                    <p className="text-[11px] text-muted-foreground">
                      {t('Live price from Deutsche Post')} · {t('up to')} {selectedLetterProduct.maxWeightGrams ?? '—'} g
                    </p>
                  )}
                  {!letterProductsLoading && availableLetterProducts.length === 0 && (
                    <p className="text-xs text-destructive">{t('No matching letter products are currently available for this destination.')}</p>
                  )}
                </div>
              )}

              {autoWeightKg && autoWeightKg !== weightKgPreview && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                  {t('Auto-filled from items: {{kg}} kg', { kg: autoWeightKg })}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="dhl-weight-grams" className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {t('Shipping Weight (g)')}
                </Label>
                <div className="relative">
                  <Input
                    id="dhl-weight-grams"
                    type="number"
                    min="1"
                    value={weightGramsInput}
                    onChange={(e) => setWeightGramsInput(e.target.value)}
                    placeholder="e.g. 1800"
                    className="h-12 text-lg font-mono pr-20 rounded-xl"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono pointer-events-none">
                    {weightKgPreview ? `${weightKgPreview} kg` : 'g'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {t('Quick picks')}:{' '}
                  {[250, 500, 1000, 2000, 5000].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setWeightGramsInput(String(g))}
                      className="ml-1 inline-flex items-center rounded-md border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-[10px] font-mono hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {g} g
                    </button>
                  ))}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPrintDialog(false)}
                disabled={creating}
              >
                {t('Cancel', { ns: 'common' })}
              </Button>
              <Button
                onClick={handleConfirmPrint}
                disabled={creating || !Number(weightGramsInput) || Number(weightGramsInput) <= 0 || (shippingMethod === 'letter' && !letterProductCode)}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4 mr-1.5" />
                )}
                {shippingMethod === 'letter'
                  ? t('Buy and create letter stamp')
                  : t('Print with {{kg}} kg', { kg: weightKgPreview ?? '?' })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // State: Label created — show download, print, cancel
  if (hasLabel) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-3.5 w-3.5 mr-1" />
          {t('Download Label')}
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-3.5 w-3.5 mr-1" />
          {t('Print Label')}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={cancelling}>
              {cancelling ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
              {shipment.carrierLabelData?.apiType === 'internetmarke' ? t('Refund letter stamp') : t('Cancel DHL Label')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{shipment.carrierLabelData?.apiType === 'internetmarke' ? t('Refund letter stamp') : t('Confirm cancel label')}</AlertDialogTitle>
              <AlertDialogDescription>
                {shipment.carrierLabelData?.apiType === 'internetmarke'
                  ? t('This requests a refund from Deutsche Post and removes the letter stamp from the shipment.')
                  : t('This will cancel the DHL shipment and remove the tracking number.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelLabel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {shipment.carrierLabelData?.apiType === 'internetmarke' ? t('Refund letter stamp') : t('Cancel DHL Label')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // State: Already shipped — download only
  if (isShipped && shipment.labelUrl) {
    return (
      <Button variant="outline" size="sm" onClick={handleDownload}>
        <Download className="h-3.5 w-3.5 mr-1" />
        {t('Download Label')}
      </Button>
    );
  }

  return null;
}
