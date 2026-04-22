import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, ExternalLink, CheckCircle2, AlertCircle, Clock, Loader2, Undo2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { createShopifyFulfillment, retryShopifyFulfillment, getShopifySettings, updateShopifyFulfillmentTracking } from '@/services/supabase/shopify-integration';
import type { WhShipment } from '@/types/warehouse';
import { toast } from 'sonner';

interface Props {
  shipment: WhShipment;
  onRefresh: () => void;
}

export function ShopifyShipmentSyncCard({ shipment, onRefresh }: Props) {
  const { t } = useTranslation('warehouse');
  const [busy, setBusy] = useState(false);
  const [shopDomain, setShopDomain] = useState('');

  useEffect(() => {
    getShopifySettings().then(s => setShopDomain(s?.shopDomain || ''));
  }, []);

  if (!shipment.orderReference?.startsWith('Shopify ') && !shipment.shopifyOrderId) return null;

  const orderName = shipment.orderReference?.replace('Shopify ', '') || `#${shipment.shopifyOrderId}`;
  const adminUrl = shopDomain && shipment.shopifyOrderId
    ? `https://${shopDomain.replace('.myshopify.com', '')}.myshopify.com/admin/orders/${shipment.shopifyOrderId}`
    : undefined;

  const fulfillmentStatus: 'success' | 'failed' | 'pending' | 'not_pushed' =
    shipment.shopifyFulfillmentStatus === 'success' ? 'success'
      : shipment.shopifyFulfillmentStatus === 'dead_letter' ? 'failed'
      : shipment.shopifyExportPending ? 'pending'
      : shipment.shopifyFulfillmentId ? 'success'
      : 'not_pushed';

  const canPush = !shipment.shopifyFulfillmentId || shipment.shopifyExportPending || fulfillmentStatus === 'failed';

  const handlePush = async () => {
    setBusy(true);
    try {
      if (shipment.shopifyExportPending) {
        await retryShopifyFulfillment(shipment.id);
      } else {
        await createShopifyFulfillment(shipment.id);
      }
      toast.success(t('Fulfillment pushed to Shopify'));
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleTrackingUpdate = async () => {
    setBusy(true);
    try {
      await updateShopifyFulfillmentTracking(shipment.id);
      toast.success(t('Tracking pushed to Shopify'));
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingBag className="h-4 w-4" />
          {t('Shopify')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('Order')}</span>
          <div className="flex items-center gap-1">
            <code className="text-sm font-mono">{orderName}</code>
            {adminUrl && (
              <a href={adminUrl} target="_blank" rel="noopener noreferrer" aria-label={t('View in Shopify Admin')}>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('Fulfillment')}</span>
          <FulfillmentBadge status={fulfillmentStatus} />
        </div>

        {shipment.shopifyFulfillmentId && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('Fulfillment ID')}</span>
            <code className="text-xs font-mono text-muted-foreground">{shipment.shopifyFulfillmentId}</code>
          </div>
        )}

        {shipment.lastFulfillmentAt && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('Last push')}</span>
            <span className="text-xs">{new Date(shipment.lastFulfillmentAt).toLocaleString()}</span>
          </div>
        )}

        {shipment.shopifyExportError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
            {shipment.shopifyExportError}
          </div>
        )}

        {(shipment.shopifyExportAttempts ?? 0) > 0 && (
          <div className="text-xs text-muted-foreground">
            {t('Attempts')}: {shipment.shopifyExportAttempts}/5
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {canPush && ['shipped', 'in_transit', 'delivered'].includes(shipment.status) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('Push to Shopify')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('Push to Shopify?')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('This marks the Shopify order {{name}} as fulfilled and sends a shipping notification to the customer with tracking number {{tracking}}.',
                      { name: orderName, tracking: shipment.trackingNumber || '—' })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePush}>{t('Push')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {shipment.shopifyFulfillmentId && shipment.trackingNumber && (
            <Button size="sm" variant="outline" onClick={handleTrackingUpdate} disabled={busy}>
              <Undo2 className="mr-2 h-4 w-4" />
              {t('Resync tracking')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FulfillmentBadge({ status }: { status: 'success' | 'failed' | 'pending' | 'not_pushed' }) {
  const { t } = useTranslation('warehouse');
  if (status === 'success') {
    return <Badge className="bg-green-50 text-green-700 border-green-200" variant="outline"><CheckCircle2 className="mr-1 h-3 w-3" />{t('Synced')}</Badge>;
  }
  if (status === 'failed') {
    return <Badge className="bg-red-50 text-red-700 border-red-200" variant="outline"><AlertCircle className="mr-1 h-3 w-3" />{t('Failed')}</Badge>;
  }
  if (status === 'pending') {
    return <Badge className="bg-amber-50 text-amber-700 border-amber-200" variant="outline"><Clock className="mr-1 h-3 w-3" />{t('Pending')}</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground">{t('Not pushed')}</Badge>;
}
