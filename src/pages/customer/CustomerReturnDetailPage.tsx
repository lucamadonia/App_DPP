import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Package, Download, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusPipeline } from '@/components/returns/public/StatusPipeline';
import { AnimatedTimeline } from '@/components/returns/public/AnimatedTimeline';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { getCustomerReturn, createCustomerTicket } from '@/services/supabase/customer-portal';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        <Button variant="outline" size="sm" onClick={handleContactSupport} disabled={creatingTicket}>
          {creatingTicket ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4 mr-2" />
          )}
          {t('Contact Support')}
        </Button>
      </div>

      {/* Status Pipeline */}
      <Card>
        <CardContent className="pt-4">
          <StatusPipeline status={returnData.status as ReturnStatus} />
        </CardContent>
      </Card>

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
                  <span className="font-mono text-xs">{returnData.trackingNumber}</span>
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
    </div>
  );
}
