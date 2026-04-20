import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Download, Printer, XCircle, Truck, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { createDHLLabel, cancelDHLLabel, getDHLSettings } from '@/services/supabase/dhl-carrier';
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

  // Seed the editable weight from the shipment whenever the dialog opens.
  useEffect(() => {
    if (showPrintDialog) {
      setWeightGramsInput(shipment.totalWeightGrams ? String(shipment.totalWeightGrams) : '');
    }
  }, [showPrintDialog, shipment.totalWeightGrams]);

  // Only render for DHL carrier
  if (!shipment.carrier || shipment.carrier !== 'DHL') return null;

  const hasLabel = shipment.status === 'label_created' && shipment.trackingNumber;
  const canCreate = ['draft', 'picking', 'packed'].includes(shipment.status) && !shipment.trackingNumber;
  const isShipped = ['shipped', 'in_transit', 'delivered'].includes(shipment.status);

  const openPrintDialog = async () => {
    // Check DHL configured first — no point opening the dialog if creds are missing.
    const settings = await getDHLSettings();
    if (!settings?.hasCredentials) {
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
      const result = await createDHLLabel(shipment.id, undefined, override);
      toast.success(t('Label Created Successfully'));
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
      toast.success(t('Label Cancelled Successfully'));
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
          {t('Create DHL Label')}
        </Button>

        <Dialog open={showPrintDialog} onOpenChange={(o) => !creating && setShowPrintDialog(o)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-amber-500" />
                {t('Confirm weight before printing')}
              </DialogTitle>
              <DialogDescription>
                {t('DHL bills by the weight you print. Weigh the packed box and adjust if needed.')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
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
                disabled={creating || !Number(weightGramsInput) || Number(weightGramsInput) <= 0}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4 mr-1.5" />
                )}
                {t('Print with {{kg}} kg', { kg: weightKgPreview ?? '?' })}
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
              {t('Cancel DHL Label')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('Confirm cancel label')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('This will cancel the DHL shipment and remove the tracking number.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelLabel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('Cancel DHL Label')}
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
