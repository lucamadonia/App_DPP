import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Package, Download, MessageSquare, Ban, Tag, Printer, MapPin } from 'lucide-react';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { StatusPipeline } from '@/components/returns/public/StatusPipeline';
import { AnimatedTimeline } from '@/components/returns/public/AnimatedTimeline';
import { ShipmentTracker } from '@/components/returns/public/ShipmentTracker';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { getCustomerReturn, createCustomerTicket, customerCancelReturn } from '@/services/supabase/customer-portal';
import { supabase } from '@/lib/supabase';
import type { RhReturn, RhReturnItem, RhReturnTimeline, ReturnStatus } from '@/types/returns-hub';

export function CustomerReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('customer-portal');
  const { tenantSlug } = useCustomerPortal();

  const [returnData, setReturnData] = useState<RhReturn | null>(null);
  const [items, setItems] = useState<RhReturnItem[]>([]);
  const [timeline, setTimeline] = useState<RhReturnTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const result = await getCustomerReturn(id);
    setReturnData(result.returnData);
    setItems(result.items);
    setTimeline(result.timeline);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Realtime subscription for status updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`customer-return-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rh_returns',
        filter: `id=eq.${id}`,
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleContactSupport = async () => {
    if (!returnData) return;
    setCreatingTicket(true);

    const result = await createCustomerTicket({
      subject: `${t('Question about return')} ${returnData.returnNumber}`,
      message: t('I have a question about my return {{number}}.', { number: returnData.returnNumber }),
      returnId: returnData.id,
    });

    if (result.success && result.id) {
      navigate(`/customer/${tenantSlug}/tickets/${result.id}`);
    }
    setCreatingTicket(false);
  };

  const canCancel = returnData && ['CREATED', 'PENDING_APPROVAL', 'APPROVED', 'LABEL_GENERATED'].includes(returnData.status);

  const handleCancelReturn = async () => {
    if (!returnData || !cancelReason.trim()) return;
    setCancelLoading(true);
    const result = await customerCancelReturn(returnData.id, cancelReason.trim());
    if (result.success) {
      await loadData();
    }
    setCancelLoading(false);
    setCancelDialogOpen(false);
    setCancelReason('');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <ShimmerSkeleton className="h-9 w-9 rounded-md" />
          <div className="flex-1 space-y-2">
            <ShimmerSkeleton className="h-7 w-40" />
            <ShimmerSkeleton className="h-4 w-32" />
          </div>
        </div>
        <Card><CardContent className="pt-4"><ShimmerSkeleton className="h-16 rounded" /></CardContent></Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="pt-6 space-y-3">{Array.from({ length: 4 }, (_, i) => <ShimmerSkeleton key={i} className="h-4 rounded" />)}</CardContent></Card>
          <Card><CardContent className="pt-6 space-y-3">{Array.from({ length: 3 }, (_, i) => <ShimmerSkeleton key={i} className="h-10 rounded" />)}</CardContent></Card>
        </div>
        <Card><CardContent className="pt-6 space-y-3">{Array.from({ length: 4 }, (_, i) => <ShimmerSkeleton key={i} className="h-4 rounded" />)}</CardContent></Card>
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="text-center py-20">
        <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="font-medium">{t('Return not found')}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(`/customer/${tenantSlug}/returns`)}>
          {t('Back to Returns')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/customer/${tenantSlug}/returns`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{returnData.returnNumber}</h1>
          <p className="text-muted-foreground text-sm">
            {t('Created on {{date}}', { date: new Date(returnData.createdAt).toLocaleDateString() })}
          </p>
        </div>
        <div className="flex gap-2">
          {canCancel && (
            <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setCancelDialogOpen(true)}>
              <Ban className="h-4 w-4 mr-2" />
              {t('Cancel Return')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleContactSupport} disabled={creatingTicket}>
            {creatingTicket ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4 mr-2" />
            )}
            {t('Contact Support')}
          </Button>
        </div>
      </div>

      {/* Status Pipeline */}
      <Card>
        <CardContent className="pt-4">
          <StatusPipeline status={returnData.status as ReturnStatus} />
        </CardContent>
      </Card>

      {/* Label Ready Banner */}
      {returnData.status === 'LABEL_GENERATED' && returnData.labelUrl && (
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <Tag className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-indigo-900">{t('Your shipping label is ready!')}</h3>
                </div>

                {/* 3-Step Instructions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-2 text-sm text-indigo-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-xs font-bold text-indigo-800">1</span>
                    <Download className="h-3.5 w-3.5 shrink-0" />
                    <span>{t('Download')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-indigo-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-xs font-bold text-indigo-800">2</span>
                    <Printer className="h-3.5 w-3.5 shrink-0" />
                    <span>{t('Print')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-indigo-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-xs font-bold text-indigo-800">3</span>
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{t('Drop off')}</span>
                  </div>
                </div>

                {/* Download Button */}
                <Button size="lg" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2" asChild>
                  <a href={returnData.labelUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-5 w-5" />
                    {t('Download Shipping Label (PDF)')}
                  </a>
                </Button>

                {/* Tracking Number + Expiry */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-indigo-700/80">
                  {returnData.trackingNumber && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-indigo-600 font-medium">{t('Tracking')}:</span>
                      <a
                        href={`https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${returnData.trackingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-indigo-600 hover:underline"
                      >
                        {returnData.trackingNumber}
                      </a>
                    </div>
                  )}
                  {returnData.labelExpiresAt && (
                    <div className="text-indigo-600/70 text-xs">
                      {t('Label expires on {{date}}', { date: new Date(returnData.labelExpiresAt).toLocaleDateString() })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipment Tracking */}
      {returnData.trackingNumber && (
        <ShipmentTracker
          trackingNumber={returnData.trackingNumber}
          returnNumber={returnData.returnNumber}
          translationNamespace="customer-portal"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Return Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('Return Details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {returnData.orderId && (
                <>
                  <span className="text-muted-foreground">{t('Order ID')}</span>
                  <span className="font-medium">{returnData.orderId}</span>
                </>
              )}
              {returnData.reasonCategory && (
                <>
                  <span className="text-muted-foreground">{t('Reason')}</span>
                  <span>{returnData.reasonCategory}</span>
                </>
              )}
              {returnData.desiredSolution && (
                <>
                  <span className="text-muted-foreground">{t('Solution')}</span>
                  <span className="capitalize">{t(returnData.desiredSolution)}</span>
                </>
              )}
              {returnData.shippingMethod && (
                <>
                  <span className="text-muted-foreground">{t('Shipping')}</span>
                  <span>{returnData.shippingMethod}</span>
                </>
              )}
              {returnData.trackingNumber && (
                <>
                  <span className="text-muted-foreground">{t('Tracking')}</span>
                  <a
                    href={`https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${returnData.trackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {returnData.trackingNumber}
                  </a>
                </>
              )}
              {returnData.refundAmount != null && (
                <>
                  <span className="text-muted-foreground">{t('Refund')}</span>
                  <span className="font-medium">{'\u20AC'}{returnData.refundAmount.toFixed(2)}</span>
                </>
              )}
            </div>

            {returnData.labelUrl && (
              <Button variant="outline" size="sm" className="w-full gap-2 mt-2" asChild>
                <a href={returnData.labelUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                  {t('Download Shipping Label')}
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('Items')} ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('No items')}</p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{t('Qty')}: {item.quantity}</span>
                        {item.sku && <span>SKU: {item.sku}</span>}
                      </div>
                    </div>
                    {item.condition && (
                      <Badge variant="secondary" className="text-xs capitalize">{item.condition}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('Timeline')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatedTimeline entries={timeline} />
        </CardContent>
      </Card>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Cancel Return')}</DialogTitle>
            <DialogDescription>
              {t('Are you sure you want to cancel this return? This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t('Please tell us why you want to cancel...')}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button variant="destructive" onClick={handleCancelReturn} disabled={cancelLoading || !cancelReason.trim()}>
              {cancelLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-1" />}
              {t('Cancel Return')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
