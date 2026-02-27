import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowLeft, Package, Truck, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getShipment, getShipmentItems, updateShipmentStatus } from '@/services/supabase/wh-shipments';
import type { WhShipment, WhShipmentItem, ShipmentStatus } from '@/types/warehouse';
import { SHIPMENT_STATUS_ORDER } from '@/types/warehouse';

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  picking: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  packed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  label_created: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  in_transit: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('warehouse');
  const [shipment, setShipment] = useState<WhShipment | null>(null);
  const [items, setItems] = useState<WhShipmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [s, i] = await Promise.all([getShipment(id!), getShipmentItems(id!)]);
        setShipment(s);
        setItems(i);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleStatusChange = async (newStatus: ShipmentStatus) => {
    if (!id) return;
    try {
      const updated = await updateShipmentStatus(id, newStatus);
      setShipment(updated);
      toast.success(t(newStatus));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  if (loading) return <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!shipment) return <div className="text-center py-12 text-muted-foreground">Shipment not found</div>;

  const currentIdx = SHIPMENT_STATUS_ORDER.indexOf(shipment.status);
  const nextStatus = currentIdx >= 0 && currentIdx < SHIPMENT_STATUS_ORDER.length - 1
    ? SHIPMENT_STATUS_ORDER[currentIdx + 1]
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/warehouse/shipments"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{shipment.shipmentNumber}</h1>
          <p className="text-muted-foreground">{t('Shipment Details')}</p>
        </div>
        <Badge className={STATUS_COLORS[shipment.status]}>{t(shipment.status)}</Badge>
      </div>

      {/* Status Pipeline */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-1">
            {SHIPMENT_STATUS_ORDER.map((status, idx) => {
              const isCurrent = status === shipment.status;
              const isPast = SHIPMENT_STATUS_ORDER.indexOf(shipment.status) > idx;
              return (
                <div key={status} className="flex items-center flex-1">
                  <div className={`h-2 flex-1 rounded-full ${isPast || isCurrent ? 'bg-primary' : 'bg-muted'}`} />
                  {idx < SHIPMENT_STATUS_ORDER.length - 1 && <div className="w-1" />}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            {SHIPMENT_STATUS_ORDER.map((status) => (
              <span key={status} className="text-[10px] text-muted-foreground">{t(status)}</span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recipient */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> {t('Recipient')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{shipment.recipientName}</p>
            {shipment.recipientCompany && <p>{shipment.recipientCompany}</p>}
            <p>{shipment.shippingStreet}</p>
            <p>{shipment.shippingPostalCode} {shipment.shippingCity}</p>
            <p>{shipment.shippingCountry}</p>
            {shipment.recipientEmail && <p className="text-muted-foreground">{shipment.recipientEmail}</p>}
          </CardContent>
        </Card>

        {/* Shipping Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" /> {t('Shipping')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">{t('Carrier')}:</span><span>{shipment.carrier || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('Tracking Number')}:</span><span className="font-mono">{shipment.trackingNumber || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('Service Level')}:</span><span>{shipment.serviceLevel || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('Priority')}:</span><span>{t(shipment.priority)}</span></div>
            {shipment.orderReference && (
              <div className="flex justify-between"><span className="text-muted-foreground">{t('Order Reference')}:</span><span>{shipment.orderReference}</span></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" /> {t('Items')} ({shipment.totalItems})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Product')}</TableHead>
                <TableHead>{t('Batch')}</TableHead>
                <TableHead>{t('Location')}</TableHead>
                <TableHead className="text-right">{t('Quantity')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.productName || item.productId.slice(0, 8)}</TableCell>
                  <TableCell>{item.batchSerialNumber || item.batchId.slice(0, 8)}</TableCell>
                  <TableCell>{item.locationName || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Actions */}
      {shipment.status !== 'delivered' && shipment.status !== 'cancelled' && (
        <div className="flex gap-2">
          {nextStatus && (
            <Button onClick={() => handleStatusChange(nextStatus)}>
              {nextStatus === 'picking' && t('Mark as Picking')}
              {nextStatus === 'packed' && t('Mark as Packed')}
              {nextStatus === 'label_created' && t('Mark as Packed')}
              {nextStatus === 'shipped' && t('Mark as Shipped')}
              {nextStatus === 'in_transit' && t('Mark as Shipped')}
              {nextStatus === 'delivered' && t('Mark as Delivered')}
            </Button>
          )}
          <Button variant="destructive" onClick={() => handleStatusChange('cancelled')}>
            {t('Cancel Shipment')}
          </Button>
        </div>
      )}
    </div>
  );
}
