import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Search, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReturnStatusBadge } from '@/components/returns/ReturnStatusBadge';
import { ReturnTimeline } from '@/components/returns/ReturnTimeline';
import { ReturnItemsTable } from '@/components/returns/ReturnItemsTable';
import {
  getReturn, getReturnItems, getReturnTimeline,
  updateReturnStatus, updateReturn,
} from '@/services/supabase';
import type { RhReturn, RhReturnItem, RhReturnTimeline as TimelineType } from '@/types/returns-hub';

export function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('returns');

  const [returnData, setReturnData] = useState<RhReturn | null>(null);
  const [items, setItems] = useState<RhReturnItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineType[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const [ret, itms, tl] = await Promise.all([
        getReturn(id!),
        getReturnItems(id!),
        getReturnTimeline(id!),
      ]);
      setReturnData(ret);
      setItems(itms);
      setTimeline(tl);
      if (ret?.refundAmount) setRefundAmount(ret.refundAmount.toString());
      setLoading(false);
    }
    load();
  }, [id]);

  const handleStatusChange = async (status: string, comment?: string) => {
    if (!id) return;
    setActionLoading(true);
    await updateReturnStatus(id, status as any, comment);
    // Reload
    const [ret, tl] = await Promise.all([getReturn(id), getReturnTimeline(id)]);
    setReturnData(ret);
    setTimeline(tl);
    setActionLoading(false);
  };

  const handleProcessRefund = async () => {
    if (!id || !refundAmount) return;
    setActionLoading(true);
    await updateReturn(id, {
      refundAmount: Number(refundAmount),
      refundMethod: 'original_payment',
      refundedAt: new Date().toISOString(),
    });
    await handleStatusChange('REFUND_COMPLETED', `${t('Refund processed')}: €${refundAmount}`);
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('Return not found')}</p>
        <Link to="/returns/list" className="text-primary hover:underline text-sm mt-2 block">{t('Back to list')}</Link>
      </div>
    );
  }

  const canApprove = ['CREATED', 'PENDING_APPROVAL'].includes(returnData.status);
  const canReject = ['CREATED', 'PENDING_APPROVAL'].includes(returnData.status);
  const canInspect = ['DELIVERED'].includes(returnData.status);
  const canRefund = ['INSPECTION_IN_PROGRESS', 'APPROVED'].includes(returnData.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/returns/list')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{returnData.returnNumber}</h1>
            <ReturnStatusBadge status={returnData.status} />
            <Badge variant="outline" className="capitalize">{t(returnData.priority.charAt(0).toUpperCase() + returnData.priority.slice(1))}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {t('Created')} {new Date(returnData.createdAt).toLocaleString()}
            {returnData.orderId && ` · ${t('Order ID')}: ${returnData.orderId}`}
          </p>
        </div>
        <div className="flex gap-2">
          {canApprove && (
            <Button size="sm" onClick={() => handleStatusChange('APPROVED', t('Return approved'))} disabled={actionLoading}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> {t('Approve')}
            </Button>
          )}
          {canReject && (
            <Button size="sm" variant="destructive" onClick={() => handleStatusChange('REJECTED', t('Return rejected'))} disabled={actionLoading}>
              <XCircle className="h-4 w-4 mr-1" /> {t('Reject')}
            </Button>
          )}
          {canInspect && (
            <Button size="sm" variant="secondary" onClick={() => handleStatusChange('INSPECTION_IN_PROGRESS', t('Inspection started'))} disabled={actionLoading}>
              <Search className="h-4 w-4 mr-1" /> {t('Start Inspection')}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
          <TabsTrigger value="items">{t('Items')} ({items.length})</TabsTrigger>
          <TabsTrigger value="timeline">{t('Timeline')}</TabsTrigger>
          <TabsTrigger value="customs">{t('Customs')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('Return Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t('Desired Solution')}</span><span className="capitalize">{returnData.desiredSolution ? t(returnData.desiredSolution.charAt(0).toUpperCase() + returnData.desiredSolution.slice(1)) : '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('Reason Category')}</span><span>{returnData.reasonCategory || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('Reason Subcategory')}</span><span>{returnData.reasonSubcategory || '—'}</span></div>
                {returnData.reasonText && <div className="pt-2 border-t"><p className="text-muted-foreground text-xs">{returnData.reasonText}</p></div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('Shipping & Refund')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t('Tracking Number')}</span><span>{returnData.trackingNumber || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('Shipping Method')}</span><span>{returnData.shippingMethod || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('Refund Amount')}</span><span className="font-medium">{returnData.refundAmount != null ? `€${returnData.refundAmount.toFixed(2)}` : '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('Refund Method')}</span><span>{returnData.refundMethod || '—'}</span></div>
              </CardContent>
            </Card>
          </div>

          {canRefund && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('Process Refund')}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end gap-3">
                <div className="space-y-1 flex-1 max-w-xs">
                  <label className="text-xs text-muted-foreground">{t('Refund Amount')} (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <Button size="sm" onClick={handleProcessRefund} disabled={actionLoading || !refundAmount}>
                  <CreditCard className="h-4 w-4 mr-1" />
                  {t('Process Refund')}
                </Button>
              </CardContent>
            </Card>
          )}

          {returnData.internalNotes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('Internal Notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{returnData.internalNotes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="items" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <ReturnItemsTable items={items} readonly />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <ReturnTimeline entries={timeline} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customs" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('Customs Information')}</CardTitle>
            </CardHeader>
            <CardContent>
              {returnData.customsData ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t('Scenario')}</span><span className="capitalize">{returnData.customsData.scenario?.replace(/_/g, ' ') || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t('Country of Origin')}</span><span>{returnData.customsData.countryOfOrigin || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t('HS Code')}</span><span>{returnData.customsData.hsCode || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t('Customs Value')}</span><span>{returnData.customsData.customsValue ? `€${returnData.customsData.customsValue}` : '—'}</span></div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('No customs data available')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
