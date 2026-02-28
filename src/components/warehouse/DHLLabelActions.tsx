import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Download, Printer, XCircle, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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

  // Only render for DHL carrier
  if (!shipment.carrier || shipment.carrier !== 'DHL') return null;

  const hasLabel = shipment.status === 'label_created' && shipment.trackingNumber;
  const canCreate = ['draft', 'picking', 'packed'].includes(shipment.status) && !shipment.trackingNumber;
  const isShipped = ['shipped', 'in_transit', 'delivered'].includes(shipment.status);

  const handleCreateLabel = async () => {
    // Validate weight
    if (!shipment.totalWeightGrams || shipment.totalWeightGrams <= 0) {
      toast.error(t('Weight required for DHL label'));
      return;
    }

    // Check DHL configured
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

    setCreating(true);
    try {
      const result = await createDHLLabel(shipment.id);
      toast.success(t('Label Created Successfully'));
      if (result.validationMessages?.length) {
        result.validationMessages.forEach(msg => {
          if (msg.state === 'Warning') toast.warning(msg.message);
        });
      }
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

  // State: Can create label
  if (canCreate) {
    return (
      <Button
        onClick={handleCreateLabel}
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
    );
  }

  // State: Label created — show download, print, cancel
  if (hasLabel) {
    return (
      <div className="flex gap-2">
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
