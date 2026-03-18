import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle, Search, CreditCard, Package, Ban, Truck, Pencil, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ReturnStatusBadge } from '@/components/returns/ReturnStatusBadge';
import { AnimatedTimeline } from '@/components/returns/public/AnimatedTimeline';
import { StatusPipeline } from '@/components/returns/public/StatusPipeline';
import { ReturnItemsTable } from '@/components/returns/ReturnItemsTable';
import { SkeletonTable } from '@/components/returns/SkeletonTable';
import { EmptyState } from '@/components/returns/EmptyState';
import { ReturnShippingCard } from '@/components/returns/ReturnShippingCard';
import { relativeTime } from '@/lib/animations';
import { pageVariants, pageTransition, staggerContainer, cardEntrance, useReducedMotion } from '@/lib/motion';
import {
  getReturn, getReturnItems, getReturnTimeline,
  updateReturnStatus, updateReturn, cancelReturn,
  addTimelineEntry, getProfiles,
} from '@/services/supabase';
import type { RhReturn, RhReturnItem, RhReturnTimeline as TimelineType, ItemCondition, ReturnPriority } from '@/types/returns-hub';
import type { Profile } from '@/services/supabase/profiles';
import { supabase } from '@/lib/supabase';
import { User, Mail, MapPin as MapPinIcon, Building2 } from 'lucide-react';

export function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('returns');

  const [returnData, setReturnData] = useState<RhReturn | null>(null);
  const [items, setItems] = useState<RhReturnItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineType[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('original_payment');
  // Inspection state
  const [inspCondition, setInspCondition] = useState<ItemCondition | ''>('');
  const [inspNotes, setInspNotes] = useState('');
  const [inspApproved, setInspApproved] = useState(false);
  const [inspSaving, setInspSaving] = useState(false);
  // Internal notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  // Quick actions
  const [profiles, setProfiles] = useState<Profile[]>([]);
  // Timeline comment
  const [timelineComment, setTimelineComment] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const [ret, itms, tl, profs] = await Promise.all([
        getReturn(id!),
        getReturnItems(id!),
        getReturnTimeline(id!),
        getProfiles(),
      ]);
      setReturnData(ret);
      setItems(itms);
      setTimeline(tl);
      setProfiles(profs);
      if (ret?.refundAmount) setRefundAmount(ret.refundAmount.toString());
      if (ret?.refundMethod) setRefundMethod(ret.refundMethod);
      // Init inspection from existing data
      if (ret?.inspectionResult) {
        setInspCondition(ret.inspectionResult.condition || '');
        setInspNotes(ret.inspectionResult.notes || '');
        setInspApproved(ret.inspectionResult.approved || false);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleStatusChange = async (status: string, comment?: string) => {
    if (!id) return;
    setActionLoading(true);
    await updateReturnStatus(id, status as any, comment);
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
      refundMethod: refundMethod,
      refundedAt: new Date().toISOString(),
    });
    await handleStatusChange('REFUND_COMPLETED', `${t('Refund processed')}: €${refundAmount}`);
    setActionLoading(false);
  };

  const handleSaveInspection = async (proceed?: boolean) => {
    if (!id || !inspCondition) return;
    setInspSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const result = {
      condition: inspCondition as ItemCondition,
      notes: inspNotes || undefined,
      approved: inspApproved,
      inspectedBy: user?.id,
      inspectedAt: new Date().toISOString(),
    };
    await updateReturn(id, { inspectionResult: result });
    if (proceed) {
      await handleStatusChange('REFUND_PROCESSING', t('Inspection completed, proceeding to refund'));
    } else {
      const [ret, tl] = await Promise.all([getReturn(id), getReturnTimeline(id)]);
      setReturnData(ret);
      setTimeline(tl);
    }
    setInspSaving(false);
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    setNotesSaving(true);
    await updateReturn(id, { internalNotes: notesValue || undefined });
    const ret = await getReturn(id);
    setReturnData(ret);
    setEditingNotes(false);
    setNotesSaving(false);
  };

  const handlePriorityChange = async (priority: ReturnPriority) => {
    if (!id || !returnData || priority === returnData.priority) return;
    setActionLoading(true);
    await updateReturn(id, { priority });
    await addTimelineEntry({
      returnId: id,
      status: returnData.status,
      comment: `${t('Priority changed to')} ${t(priority.charAt(0).toUpperCase() + priority.slice(1))}`,
      actorType: 'agent',
      metadata: { type: 'priority_change', from: returnData.priority, to: priority },
    });
    const [ret, tl] = await Promise.all([getReturn(id), getReturnTimeline(id)]);
    setReturnData(ret);
    setTimeline(tl);
    setActionLoading(false);
  };

  const handleAssigneeChange = async (assignedTo: string) => {
    if (!id || !returnData) return;
    const value = assignedTo === '__unassigned' ? undefined : assignedTo;
    if (value === (returnData.assignedTo || undefined)) return;
    setActionLoading(true);
    await updateReturn(id, { assignedTo: value || '' as any });
    const assigneeName = value ? profiles.find(p => p.id === value)?.name || value : t('Unassigned');
    await addTimelineEntry({
      returnId: id,
      status: returnData.status,
      comment: `${t('Assigned to')} ${assigneeName}`,
      actorType: 'agent',
      metadata: { type: 'assignee_change', to: value || null },
    });
    const [ret, tl] = await Promise.all([getReturn(id), getReturnTimeline(id)]);
    setReturnData(ret);
    setTimeline(tl);
    setActionLoading(false);
  };

  const handleAddComment = async () => {
    if (!id || !returnData || !timelineComment.trim()) return;
    setCommentSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await addTimelineEntry({
      returnId: id,
      status: returnData.status,
      comment: timelineComment.trim(),
      actorId: user?.id,
      actorType: 'agent',
      metadata: { type: 'manual_comment' },
    });
    const tl = await getReturnTimeline(id);
    setTimeline(tl);
    setTimelineComment('');
    setCommentSaving(false);
  };

  const Wrapper = prefersReduced ? 'div' : motion.div;
  const wrapperProps = prefersReduced ? {} : { variants: pageVariants, initial: 'initial', animate: 'animate', transition: pageTransition };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton header */}
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 rounded-md bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-muted rounded w-48 animate-pulse" />
            <div className="h-4 bg-muted rounded w-72 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-muted rounded animate-pulse" />
            <div className="h-8 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
        {/* Skeleton pipeline */}
        <Card>
          <CardContent className="py-6 animate-pulse">
            <div className="flex items-center gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center flex-1">
                  <div className="h-8 w-8 rounded-full bg-muted" />
                  {i < 5 && <div className="flex-1 h-0.5 bg-muted mx-1" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Skeleton tabs content */}
        <SkeletonTable rows={4} columns={4} />
      </div>
    );
  }

  if (!returnData) {
    return (
      <div>
        <EmptyState
          icon={Package}
          title={t('Return not found')}
          description={t('The return you are looking for does not exist')}
          actionLabel={t('Back to list')}
          onAction={() => navigate('/returns/list')}
        />
      </div>
    );
  }

  const canApprove = ['CREATED', 'PENDING_APPROVAL'].includes(returnData.status);
  const canReject = ['CREATED', 'PENDING_APPROVAL'].includes(returnData.status);
  const canCancel = ['CREATED', 'PENDING_APPROVAL', 'APPROVED', 'LABEL_GENERATED'].includes(returnData.status);
  const canMarkShipped = ['LABEL_GENERATED', 'APPROVED'].includes(returnData.status);
  const canMarkDelivered = ['SHIPPED'].includes(returnData.status);
  const canInspect = ['DELIVERED'].includes(returnData.status);
  const canRefund = ['INSPECTION_IN_PROGRESS', 'APPROVED'].includes(returnData.status);
  const canComplete = ['REFUND_COMPLETED', 'INSPECTION_IN_PROGRESS'].includes(returnData.status);

  const handleCancel = async () => {
    if (!id) return;
    setActionLoading(true);
    await cancelReturn(id, cancelReason || undefined);
    const [ret, tl] = await Promise.all([getReturn(id), getReturnTimeline(id)]);
    setReturnData(ret);
    setTimeline(tl);
    setActionLoading(false);
    setCancelDialogOpen(false);
    setCancelReason('');
  };

  const handleReject = async () => {
    if (!id || !rejectReason.trim()) return;
    setActionLoading(true);
    await handleStatusChange('REJECTED', rejectReason.trim());
    setActionLoading(false);
    setRejectDialogOpen(false);
    setRejectReason('');
  };

  return (
    <Wrapper className="space-y-6" {...wrapperProps as any}>
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
            {t('Created')} {relativeTime(returnData.createdAt, i18n.language)}
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
            <Button size="sm" variant="destructive" onClick={() => setRejectDialogOpen(true)} disabled={actionLoading}>
              <XCircle className="h-4 w-4 mr-1" /> {t('Reject')}
            </Button>
          )}
          {canMarkShipped && (
            <Button size="sm" variant="secondary" onClick={() => handleStatusChange('SHIPPED', t('Parcel shipped by customer'))} disabled={actionLoading}>
              <Truck className="h-4 w-4 mr-1" /> {t('Mark as Shipped')}
            </Button>
          )}
          {canMarkDelivered && (
            <Button size="sm" variant="secondary" onClick={() => handleStatusChange('DELIVERED', t('Parcel delivered to warehouse'))} disabled={actionLoading}>
              <Package className="h-4 w-4 mr-1" /> {t('Mark as Delivered')}
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setCancelDialogOpen(true)} disabled={actionLoading}>
              <Ban className="h-4 w-4 mr-1" /> {t('Cancel Return')}
            </Button>
          )}
          {canInspect && (
            <Button size="sm" variant="secondary" onClick={() => handleStatusChange('INSPECTION_IN_PROGRESS', t('Inspection started'))} disabled={actionLoading}>
              <Search className="h-4 w-4 mr-1" /> {t('Start Inspection')}
            </Button>
          )}
          {canComplete && (
            <Button size="sm" onClick={() => handleStatusChange('COMPLETED', t('Return completed'))} disabled={actionLoading}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> {t('Complete Return')}
            </Button>
          )}
        </div>
      </div>

      {/* Status Pipeline */}
      <Card>
        <CardContent className="py-4">
          <StatusPipeline status={returnData.status} />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">{t('Priority')}:</Label>
          <Select value={returnData.priority} onValueChange={(v) => handlePriorityChange(v as ReturnPriority)} disabled={actionLoading}>
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['low', 'normal', 'high', 'urgent'] as ReturnPriority[]).map(p => (
                <SelectItem key={p} value={p}>{t(p.charAt(0).toUpperCase() + p.slice(1))}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">{t('Assigned to')}:</Label>
          <Select value={returnData.assignedTo || '__unassigned'} onValueChange={handleAssigneeChange} disabled={actionLoading}>
            <SelectTrigger className="w-[180px] h-8 text-sm">
              <SelectValue placeholder={t('Unassigned')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unassigned">{t('Unassigned')}</SelectItem>
              {profiles.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
          <TabsTrigger value="items">{t('Items')} ({items.length})</TabsTrigger>
          <TabsTrigger value="shipping" className="gap-1.5">
            <Truck className="h-3.5 w-3.5" />
            {t('Shipping')}
          </TabsTrigger>
          <TabsTrigger value="timeline">{t('Timeline')}</TabsTrigger>
          <TabsTrigger value="customs">{t('Customs')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Customer Info Card — extracted from metadata for portal returns */}
          {(() => {
            const meta = returnData.metadata as Record<string, unknown> | null;
            const customerName = meta?.customerName as string | undefined;
            const customerEmail = meta?.email as string | undefined;
            const street = meta?.shippingStreet as string | undefined;
            const city = meta?.shippingCity as string | undefined;
            const postalCode = meta?.shippingPostalCode as string | undefined;
            const country = meta?.shippingCountry as string | undefined;
            const company = meta?.shippingCompany as string | undefined;
            const hasAddress = street || city;
            if (!customerName && !customerEmail) return null;
            return (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t('Customer Information')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      {customerName && (
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{customerName}</span>
                        </div>
                      )}
                      {customerEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <a href={`mailto:${customerEmail}`} className="text-primary hover:underline">{customerEmail}</a>
                        </div>
                      )}
                      {company && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{company}</span>
                        </div>
                      )}
                    </div>
                    {hasAddress && (
                      <div className="flex items-start gap-2">
                        <MapPinIcon className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                        <div className="text-muted-foreground">
                          <p>{street}</p>
                          <p>{postalCode} {city}</p>
                          {country && <p>{country}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {prefersReduced ? (
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
          ) : (
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" variants={staggerContainer} initial="initial" animate="animate">
              <motion.div variants={cardEntrance}>
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
              </motion.div>
              <motion.div variants={cardEntrance}>
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
              </motion.div>
            </motion.div>
          )}

          {/* Inspection Card */}
          {returnData.status === 'INSPECTION_IN_PROGRESS' && (
            <Card className="border-blue-200 bg-blue-50/30 dark:border-blue-900 dark:bg-blue-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  {t('Inspection')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('Condition')}</Label>
                    <Select value={inspCondition} onValueChange={(v) => setInspCondition(v as ItemCondition)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t('Select condition')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(['new', 'like_new', 'used', 'damaged', 'defective'] as ItemCondition[]).map(c => (
                          <SelectItem key={c} value={c}>{t(c === 'like_new' ? 'Like New' : c.charAt(0).toUpperCase() + c.slice(1))}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('Inspection Notes')}</Label>
                    <Textarea
                      className="min-h-[70px] text-sm"
                      value={inspNotes}
                      onChange={(e) => setInspNotes(e.target.value)}
                      placeholder={t('Enter inspection notes...')}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="insp-approved" checked={inspApproved} onCheckedChange={(v) => setInspApproved(!!v)} />
                  <Label htmlFor="insp-approved" className="text-sm cursor-pointer">{t('Item approved for refund')}</Label>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleSaveInspection(false)} disabled={inspSaving || !inspCondition}>
                    {t('Save Inspection')}
                  </Button>
                  <Button size="sm" onClick={() => handleSaveInspection(true)} disabled={inspSaving || !inspCondition}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {t('Complete & Proceed to Refund')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Refund Card */}
          {canRefund && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('Process Refund')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end gap-3 flex-wrap">
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
                  <div className="space-y-1 w-[200px]">
                    <label className="text-xs text-muted-foreground">{t('Refund Method')}</label>
                    <Select value={refundMethod} onValueChange={setRefundMethod}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="original_payment">{t('Original Payment')}</SelectItem>
                        <SelectItem value="store_credit">{t('Store Credit')}</SelectItem>
                        <SelectItem value="bank_transfer">{t('Bank Transfer')}</SelectItem>
                        <SelectItem value="voucher">{t('Voucher')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={handleProcessRefund} disabled={actionLoading || !refundAmount}>
                    <CreditCard className="h-4 w-4 mr-1" />
                    {t('Process Refund')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Internal Notes */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{t('Internal Notes')}</CardTitle>
                {!editingNotes && (
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { setNotesValue(returnData.internalNotes || ''); setEditingNotes(true); }}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> {t('Edit')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    className="min-h-[80px] text-sm"
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder={t('Add internal notes...')}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes} disabled={notesSaving}>{t('Save', { ns: 'common' })}</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)}>{t('Cancel', { ns: 'common' })}</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {returnData.internalNotes || t('No internal notes yet')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <ReturnItemsTable items={items} readonly />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping" className="mt-4">
          <ReturnShippingCard
            returnData={returnData}
            onUpdate={async () => {
              if (!id) return;
              const [ret, tl] = await Promise.all([getReturn(id), getReturnTimeline(id)]);
              setReturnData(ret);
              setTimeline(tl);
            }}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-4">
              <AnimatedTimeline entries={timeline} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquarePlus className="h-4 w-4" />
                {t('Add Comment')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                className="min-h-[70px] text-sm"
                value={timelineComment}
                onChange={(e) => setTimelineComment(e.target.value)}
                placeholder={t('Enter a comment...')}
              />
              <Button size="sm" onClick={handleAddComment} disabled={commentSaving || !timelineComment.trim()}>
                {t('Add Comment')}
              </Button>
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

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Cancel Return')}</DialogTitle>
            <DialogDescription>
              {t('Are you sure you want to cancel this return? This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t('Enter reason for cancellation...')}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={actionLoading}>
              <Ban className="h-4 w-4 mr-1" /> {t('Cancel Return')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Reject Return')}</DialogTitle>
            <DialogDescription>
              {t('Please provide a reason for rejecting this return.')}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t('Enter reason for rejection...')}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}>
              <XCircle className="h-4 w-4 mr-1" /> {t('Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Wrapper>
  );
}
