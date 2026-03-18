import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CheckCircle2, XCircle, Search, CreditCard, Package, Ban, Truck,
  Pencil, MessageSquarePlus, MinusCircle, Undo2, User, Mail, MapPin as MapPinIcon,
  Building2, ClipboardList, FileCheck, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ReturnStatusBadge } from '@/components/returns/ReturnStatusBadge';
import { StatusPipeline } from '@/components/returns/public/StatusPipeline';
import { AnimatedTimeline } from '@/components/returns/public/AnimatedTimeline';
import { ReturnItemsTable } from '@/components/returns/ReturnItemsTable';
import { SkeletonTable } from '@/components/returns/SkeletonTable';
import { EmptyState } from '@/components/returns/EmptyState';
import { ReturnShippingCard } from '@/components/returns/ReturnShippingCard';
import { relativeTime } from '@/lib/animations';
import { pageVariants, pageTransition, useReducedMotion } from '@/lib/motion';
import {
  getReturn, getReturnItems, getReturnTimeline,
  updateReturnStatus, updateReturn, cancelReturn,
  addTimelineEntry, getProfiles,
} from '@/services/supabase';
import type { RhReturn, RhReturnItem, RhReturnTimeline as TimelineType, ItemCondition, ReturnPriority, ReturnStatus } from '@/types/returns-hub';
import type { Profile } from '@/services/supabase/profiles';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// ============================================
// WORKFLOW STAGE DEFINITIONS
// ============================================

interface WorkflowStage {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  statuses: ReturnStatus[];
}

const WORKFLOW_STAGES: WorkflowStage[] = [
  { id: 'registered', labelKey: 'Registered', icon: ClipboardList, statuses: ['CREATED', 'PENDING_APPROVAL'] },
  { id: 'approved', labelKey: 'Approved', icon: FileCheck, statuses: ['APPROVED', 'LABEL_GENERATED'] },
  { id: 'shipped', labelKey: 'Shipped Back', icon: Truck, statuses: ['SHIPPED', 'DELIVERED'] },
  { id: 'inspection', labelKey: 'Inspection', icon: Search, statuses: ['INSPECTION_IN_PROGRESS'] },
  { id: 'refund', labelKey: 'Refund', icon: CreditCard, statuses: ['REFUND_PROCESSING', 'REFUND_COMPLETED'] },
  { id: 'completed', labelKey: 'Completed', icon: CheckCircle2, statuses: ['COMPLETED'] },
];

function getStageIndex(status: ReturnStatus): number {
  for (let i = 0; i < WORKFLOW_STAGES.length; i++) {
    if (WORKFLOW_STAGES[i].statuses.includes(status)) return i;
  }
  return -1;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('returns');

  // Data state
  const [returnData, setReturnData] = useState<RhReturn | null>(null);
  const [items, setItems] = useState<RhReturnItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineType[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState('registered');
  const [actionLoading, setActionLoading] = useState(false);

  // Dialogs
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [deductionDialogOpen, setDeductionDialogOpen] = useState(false);
  const [deductionAmount, setDeductionAmount] = useState('');
  const [deductionReason, setDeductionReason] = useState('');
  const [inspRejectDialogOpen, setInspRejectDialogOpen] = useState(false);
  const [inspRejectReason, setInspRejectReason] = useState('');
  const [inspReturnToCustomer, setInspReturnToCustomer] = useState(false);

  // Inspection state
  const [inspCondition, setInspCondition] = useState<ItemCondition | ''>('');
  const [inspNotes, setInspNotes] = useState('');
  const [inspSaving, setInspSaving] = useState(false);

  // Refund state
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('original_payment');

  // Notes
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  // Timeline comment
  const [timelineComment, setTimelineComment] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);

  // Customs collapsible
  const [customsOpen, setCustomsOpen] = useState(false);

  const prefersReduced = useReducedMotion();

  // ============================================
  // DATA LOADING
  // ============================================

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
      if (ret?.inspectionResult) {
        setInspCondition(ret.inspectionResult.condition || '');
        setInspNotes(ret.inspectionResult.notes || '');
      }
      // Auto-select active tab based on status
      if (ret) {
        const idx = getStageIndex(ret.status);
        if (idx >= 0) setActiveTab(WORKFLOW_STAGES[idx].id);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const reload = async () => {
    if (!id) return;
    const [ret, tl] = await Promise.all([getReturn(id), getReturnTimeline(id)]);
    setReturnData(ret);
    setTimeline(tl);
  };

  // ============================================
  // COMPUTED
  // ============================================

  const activeStageIndex = useMemo(() => {
    if (!returnData) return -1;
    return getStageIndex(returnData.status);
  }, [returnData]);

  const isRejected = returnData ? ['REJECTED', 'CANCELLED'].includes(returnData.status) : false;

  // ============================================
  // ACTION HANDLERS
  // ============================================

  const handleStatusChange = async (status: string, comment?: string) => {
    if (!id) return;
    setActionLoading(true);
    await updateReturnStatus(id, status as ReturnStatus, comment);
    await reload();
    // Auto-switch tab after status change
    const idx = getStageIndex(status as ReturnStatus);
    if (idx >= 0) setActiveTab(WORKFLOW_STAGES[idx].id);
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

  const handleSaveInspection = async () => {
    if (!id || !inspCondition) return;
    setInspSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const result = {
      condition: inspCondition as ItemCondition,
      notes: inspNotes || undefined,
      inspectedBy: user?.id,
      inspectedAt: new Date().toISOString(),
    };
    await updateReturn(id, { inspectionResult: result });
    await reload();
    setInspSaving(false);
  };

  const handleInspectionApprove = async () => {
    if (!id || !inspCondition) return;
    setInspSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const result = {
      condition: inspCondition as ItemCondition,
      notes: inspNotes || undefined,
      approved: true,
      inspectedBy: user?.id,
      inspectedAt: new Date().toISOString(),
    };
    await updateReturn(id, { inspectionResult: result });
    await handleStatusChange('REFUND_PROCESSING', t('Inspection approved, proceeding to refund'));
    setInspSaving(false);
  };

  const handleInspectionDeduction = async () => {
    if (!id || !inspCondition || !deductionAmount || !deductionReason.trim()) return;
    setInspSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const deduction = Number(deductionAmount);
    const originalAmount = returnData?.refundAmount || 0;
    const finalAmount = Math.max(0, originalAmount - deduction);
    const result = {
      condition: inspCondition as ItemCondition,
      notes: inspNotes || undefined,
      approved: true,
      deductionAmount: deduction,
      deductionReason: deductionReason.trim(),
      inspectedBy: user?.id,
      inspectedAt: new Date().toISOString(),
    };
    await updateReturn(id, { inspectionResult: result, refundAmount: finalAmount });
    await handleStatusChange('REFUND_PROCESSING', t('Inspection approved with deductions, proceeding to refund'));
    setDeductionDialogOpen(false);
    setDeductionAmount('');
    setDeductionReason('');
    setInspSaving(false);
  };

  const handleInspectionReject = async () => {
    if (!id || !inspCondition || !inspRejectReason.trim()) return;
    setInspSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const result = {
      condition: inspCondition as ItemCondition,
      notes: inspNotes || undefined,
      approved: false,
      rejectedAfterInspection: true,
      rejectionReason: inspRejectReason.trim(),
      returnToCustomer: inspReturnToCustomer,
      inspectedBy: user?.id,
      inspectedAt: new Date().toISOString(),
    };
    await updateReturn(id, { inspectionResult: result });
    await handleStatusChange('REJECTED', `${t('Rejected after inspection')}: ${inspRejectReason.trim()}`);
    if (inspReturnToCustomer) {
      await addTimelineEntry({
        returnId: id,
        status: 'REJECTED',
        comment: t('Items will be returned to customer'),
        actorType: 'system',
        metadata: { type: 'return_to_customer' },
      });
    }
    setInspRejectDialogOpen(false);
    setInspRejectReason('');
    setInspReturnToCustomer(false);
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
    await reload();
    setActionLoading(false);
  };

  const handleAssigneeChange = async (assignedTo: string) => {
    if (!id || !returnData) return;
    const value = assignedTo === '__unassigned' ? undefined : assignedTo;
    if (value === (returnData.assignedTo || undefined)) return;
    setActionLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateReturn(id, { assignedTo: value || '' as any });
    const assigneeName = value ? profiles.find(p => p.id === value)?.name || value : t('Unassigned');
    await addTimelineEntry({
      returnId: id,
      status: returnData.status,
      comment: `${t('Assigned to')} ${assigneeName}`,
      actorType: 'agent',
      metadata: { type: 'assignee_change', to: value || null },
    });
    await reload();
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

  const handleCancel = async () => {
    if (!id) return;
    setActionLoading(true);
    await cancelReturn(id, cancelReason || undefined);
    await reload();
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

  // ============================================
  // RENDER HELPERS
  // ============================================

  const Wrapper = prefersReduced ? 'div' : motion.div;
  const wrapperProps = prefersReduced ? {} : { variants: pageVariants, initial: 'initial', animate: 'animate', transition: pageTransition };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 rounded-md bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-muted rounded w-48 animate-pulse" />
            <div className="h-4 bg-muted rounded w-72 animate-pulse" />
          </div>
        </div>
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
        <SkeletonTable rows={4} columns={4} />
      </div>
    );
  }

  if (!returnData) {
    return (
      <EmptyState
        icon={Package}
        title={t('Return not found')}
        description={t('The return you are looking for does not exist')}
        actionLabel={t('Back to list')}
        onAction={() => navigate('/returns/list')}
      />
    );
  }

  const meta = returnData.metadata as Record<string, unknown> | null;
  const customerName = meta?.customerName as string | undefined;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Wrapper className="space-y-6" {...wrapperProps as any}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/returns/list')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{returnData.returnNumber}</h1>
            <ReturnStatusBadge status={returnData.status} />
            <Badge variant="outline" className="capitalize">
              {t(returnData.priority.charAt(0).toUpperCase() + returnData.priority.slice(1))}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {t('Created')} {relativeTime(returnData.createdAt, i18n.language)}
            {returnData.orderId && ` · ${t('Order ID')}: ${returnData.orderId}`}
            {customerName && ` · ${customerName}`}
          </p>
        </div>
        {/* Quick actions in header — only Cancel which is always relevant */}
        <div className="flex gap-2 shrink-0">
          {['CREATED', 'PENDING_APPROVAL', 'APPROVED', 'LABEL_GENERATED'].includes(returnData.status) && (
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setCancelDialogOpen(true)} disabled={actionLoading}>
              <Ban className="h-4 w-4 mr-1" /> {t('Cancel Return')}
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

      {/* Quick Actions Bar */}
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

      {/* Main Content: Workflow Tabs + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left: Workflow Step Tabs */}
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex gap-1 p-1.5 bg-muted rounded-xl border overflow-x-auto">
            {WORKFLOW_STAGES.map((stage, i) => {
              const isCompleted = i < activeStageIndex;
              const isFuture = i > activeStageIndex && !isRejected;
              const isDisabled = isFuture;
              const Icon = stage.icon;

              return (
                <button
                  key={stage.id}
                  onClick={() => !isDisabled && setActiveTab(stage.id)}
                  disabled={isDisabled}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center',
                    activeTab === stage.id
                      ? 'bg-background shadow-sm text-foreground ring-1 ring-border'
                      : isCompleted
                      ? 'text-primary hover:bg-background/60 cursor-pointer'
                      : isFuture
                      ? 'text-muted-foreground/40 cursor-not-allowed opacity-50'
                      : 'text-muted-foreground hover:bg-background/60 cursor-pointer'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Icon className={cn('h-4 w-4 shrink-0', activeTab === stage.id && 'text-primary')} />
                  )}
                  <span className="hidden md:inline">{t(stage.labelKey)}</span>
                  <span className="inline md:hidden text-xs">{i + 1}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {/* ---- REGISTERED TAB ---- */}
            {activeTab === 'registered' && (
              <RegisteredTab
                returnData={returnData}
                items={items}
                activeStageIndex={activeStageIndex}
                actionLoading={actionLoading}
                onApprove={() => handleStatusChange('APPROVED', t('Return approved'))}
                onReject={() => setRejectDialogOpen(true)}
                t={t}
              />
            )}

            {/* ---- APPROVED TAB ---- */}
            {activeTab === 'approved' && (
              <ApprovedTab
                returnData={returnData}
                activeStageIndex={activeStageIndex}
                actionLoading={actionLoading}
                onMarkShipped={() => handleStatusChange('SHIPPED', t('Parcel shipped by customer'))}
                onReload={reload}
                t={t}
              />
            )}

            {/* ---- SHIPPED BACK TAB ---- */}
            {activeTab === 'shipped' && (
              <ShippedTab
                returnData={returnData}
                activeStageIndex={activeStageIndex}
                actionLoading={actionLoading}
                onMarkDelivered={() => handleStatusChange('DELIVERED', t('Parcel delivered to warehouse'))}
                onStartInspection={() => handleStatusChange('INSPECTION_IN_PROGRESS', t('Inspection started'))}
                customsOpen={customsOpen}
                onToggleCustoms={() => setCustomsOpen(!customsOpen)}
                t={t}
              />
            )}

            {/* ---- INSPECTION TAB ---- */}
            {activeTab === 'inspection' && (
              <InspectionTab
                returnData={returnData}
                activeStageIndex={activeStageIndex}
                inspCondition={inspCondition}
                inspNotes={inspNotes}
                inspSaving={inspSaving}
                onConditionChange={setInspCondition}
                onNotesChange={setInspNotes}
                onSave={handleSaveInspection}
                onApprove={handleInspectionApprove}
                onDeduction={() => setDeductionDialogOpen(true)}
                onReject={() => setInspRejectDialogOpen(true)}
                t={t}
              />
            )}

            {/* ---- REFUND TAB ---- */}
            {activeTab === 'refund' && (
              <RefundTab
                returnData={returnData}
                activeStageIndex={activeStageIndex}
                actionLoading={actionLoading}
                refundAmount={refundAmount}
                refundMethod={refundMethod}
                onRefundAmountChange={setRefundAmount}
                onRefundMethodChange={setRefundMethod}
                onProcess={handleProcessRefund}
                onComplete={() => handleStatusChange('COMPLETED', t('Return completed'))}
                t={t}
              />
            )}

            {/* ---- COMPLETED TAB ---- */}
            {activeTab === 'completed' && (
              <CompletedTab returnData={returnData} items={items} t={t} />
            )}
          </div>
        </div>

        {/* Right Sidebar: Timeline + Notes (always visible) */}
        <div className="space-y-4">
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
                  <Textarea className="min-h-[80px] text-sm" value={notesValue} onChange={(e) => setNotesValue(e.target.value)} placeholder={t('Add internal notes...')} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes} disabled={notesSaving}>
                      {notesSaving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      {t('Save', { ns: 'common' })}
                    </Button>
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

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('Timeline')}</CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatedTimeline entries={timeline} />
            </CardContent>
          </Card>

          {/* Add Comment */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquarePlus className="h-4 w-4" />
                {t('Add Comment')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea className="min-h-[70px] text-sm" value={timelineComment} onChange={(e) => setTimelineComment(e.target.value)} placeholder={t('Enter a comment...')} />
              <Button size="sm" onClick={handleAddComment} disabled={commentSaving || !timelineComment.trim()}>
                {commentSaving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {t('Add Comment')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Cancel Return')}</DialogTitle>
            <DialogDescription>{t('Are you sure you want to cancel this return? This action cannot be undone.')}</DialogDescription>
          </DialogHeader>
          <Textarea placeholder={t('Enter reason for cancellation...')} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
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
            <DialogDescription>{t('Please provide a reason for rejecting this return.')}</DialogDescription>
          </DialogHeader>
          <Textarea placeholder={t('Enter reason for rejection...')} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}>
              <XCircle className="h-4 w-4 mr-1" /> {t('Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deductionDialogOpen} onOpenChange={setDeductionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Approve with Deductions')}</DialogTitle>
            <DialogDescription>{t('The refund amount will be reduced by the deduction.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('Original Amount')}</span>
              <span className="font-medium">€{(returnData.refundAmount || 0).toFixed(2)}</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{t('Deduction Amount')} (€)</Label>
              <input type="number" step="0.01" min="0" max={returnData.refundAmount || undefined} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={deductionAmount} onChange={(e) => setDeductionAmount(e.target.value)} placeholder="0.00" />
            </div>
            {deductionAmount && Number(deductionAmount) > 0 && (
              <div className="flex justify-between text-sm font-medium">
                <span>{t('Final Refund Amount')}</span>
                <span className="text-green-600">€{Math.max(0, (returnData.refundAmount || 0) - Number(deductionAmount)).toFixed(2)}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm">{t('Deduction Reason')}</Label>
              <Textarea placeholder={t('Enter deduction reason...')} value={deductionReason} onChange={(e) => setDeductionReason(e.target.value)} required />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeductionDialogOpen(false)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleInspectionDeduction} disabled={inspSaving || !deductionAmount || !deductionReason.trim() || Number(deductionAmount) <= 0}>
              <MinusCircle className="h-4 w-4 mr-1" /> {t('Confirm Deduction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inspRejectDialogOpen} onOpenChange={setInspRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Reject After Inspection')}</DialogTitle>
            <DialogDescription>{t('This will reject the return after inspection. The customer will be notified.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{t('Rejection Reason')}</Label>
              <Textarea placeholder={t('Enter rejection reason...')} value={inspRejectReason} onChange={(e) => setInspRejectReason(e.target.value)} required />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="return-to-customer" checked={inspReturnToCustomer} onCheckedChange={(v) => setInspReturnToCustomer(!!v)} />
              <Label htmlFor="return-to-customer" className="text-sm cursor-pointer flex items-center gap-1.5">
                <Undo2 className="h-3.5 w-3.5" />
                {t('Return items to customer')}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInspRejectDialogOpen(false)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button variant="destructive" onClick={handleInspectionReject} disabled={inspSaving || !inspRejectReason.trim()}>
              <XCircle className="h-4 w-4 mr-1" /> {t('Confirm Rejection')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Wrapper>
  );
}

// ============================================
// TAB COMPONENTS
// ============================================

function CustomerInfoCard({ returnData, t }: { returnData: RhReturn; t: (k: string, opts?: Record<string, unknown>) => string }) {
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
}

function ReturnInfoSummary({ returnData, t }: { returnData: RhReturn; t: (k: string, opts?: Record<string, unknown>) => string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('Return Information')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('Desired Solution')}</span>
          <span className="capitalize">{returnData.desiredSolution ? t(returnData.desiredSolution.charAt(0).toUpperCase() + returnData.desiredSolution.slice(1)) : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('Reason Category')}</span>
          <span>{returnData.reasonCategory || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('Reason Subcategory')}</span>
          <span>{returnData.reasonSubcategory || '—'}</span>
        </div>
        {returnData.reasonText && (
          <div className="pt-2 border-t">
            <p className="text-muted-foreground text-xs">{returnData.reasonText}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompletedBanner({ label, t }: { label: string; t: (k: string) => string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-sm">
      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
      <span className="font-medium text-emerald-800 dark:text-emerald-300">{t(label)}</span>
    </div>
  );
}

// ---- REGISTERED ----
interface RegisteredTabProps {
  returnData: RhReturn;
  items: RhReturnItem[];
  activeStageIndex: number;
  actionLoading: boolean;
  onApprove: () => void;
  onReject: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

function RegisteredTab({ returnData, items, activeStageIndex, actionLoading, onApprove, onReject, t }: RegisteredTabProps) {
  const isPast = activeStageIndex > 0;

  return (
    <div className="space-y-4">
      {isPast && <CompletedBanner label="Step completed" t={t} />}

      <CustomerInfoCard returnData={returnData} t={t} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReturnInfoSummary returnData={returnData} t={t} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('Items')} ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ReturnItemsTable items={items} readonly />
          </CardContent>
        </Card>
      </div>

      {/* Actions — only when this is the active step */}
      {!isPast && ['CREATED', 'PENDING_APPROVAL'].includes(returnData.status) && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="py-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold">{t('Review this return')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('Approve or reject the return request')}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={onApprove} disabled={actionLoading}>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> {t('Approve')}
                </Button>
                <Button variant="destructive" onClick={onReject} disabled={actionLoading}>
                  <XCircle className="h-4 w-4 mr-1.5" /> {t('Reject')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---- APPROVED ----
interface ApprovedTabProps {
  returnData: RhReturn;
  activeStageIndex: number;
  actionLoading: boolean;
  onMarkShipped: () => void;
  onReload: () => Promise<void>;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

function ApprovedTab({ returnData, activeStageIndex, actionLoading, onMarkShipped, onReload, t }: ApprovedTabProps) {
  const isPast = activeStageIndex > 1;

  return (
    <div className="space-y-4">
      {isPast && <CompletedBanner label="Step completed" t={t} />}

      {/* Shipping Label */}
      <ReturnShippingCard
        returnData={returnData}
        onUpdate={async () => { await onReload(); }}
      />

      {/* Mark as Shipped */}
      {!isPast && ['LABEL_GENERATED', 'APPROVED'].includes(returnData.status) && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="py-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold">{t('Waiting for shipment')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('Mark as shipped once the customer sends the parcel')}</p>
              </div>
              <Button variant="secondary" onClick={onMarkShipped} disabled={actionLoading}>
                <Truck className="h-4 w-4 mr-1.5" /> {t('Mark as Shipped')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---- SHIPPED BACK ----
interface ShippedTabProps {
  returnData: RhReturn;
  activeStageIndex: number;
  actionLoading: boolean;
  onMarkDelivered: () => void;
  onStartInspection: () => void;
  customsOpen: boolean;
  onToggleCustoms: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

function ShippedTab({ returnData, activeStageIndex, actionLoading, onMarkDelivered, onStartInspection, customsOpen, onToggleCustoms, t }: ShippedTabProps) {
  const isPast = activeStageIndex > 2;

  return (
    <div className="space-y-4">
      {isPast && <CompletedBanner label="Step completed" t={t} />}

      {/* Tracking info */}
      {returnData.trackingNumber && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="h-4 w-4" />
              {t('Shipment Information')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Tracking Number')}</span>
              <span className="font-mono">{returnData.trackingNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Shipping Method')}</span>
              <span>{returnData.shippingMethod || 'DHL'}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customs Data (collapsible) */}
      {returnData.customsData && (
        <Card>
          <CardHeader className="pb-2">
            <button onClick={onToggleCustoms} className="flex items-center justify-between w-full">
              <CardTitle className="text-sm">{t('Customs Information')}</CardTitle>
              {customsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CardHeader>
          {customsOpen && (
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t('Scenario')}</span><span className="capitalize">{returnData.customsData.scenario?.replace(/_/g, ' ') || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('Country of Origin')}</span><span>{returnData.customsData.countryOfOrigin || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('HS Code')}</span><span>{returnData.customsData.hsCode || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('Customs Value')}</span><span>{returnData.customsData.customsValue ? `€${returnData.customsData.customsValue}` : '—'}</span></div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Actions */}
      {!isPast && returnData.status === 'SHIPPED' && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="py-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold">{t('Parcel in transit')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('Mark as delivered when the parcel arrives at the warehouse')}</p>
              </div>
              <Button variant="secondary" onClick={onMarkDelivered} disabled={actionLoading}>
                <Package className="h-4 w-4 mr-1.5" /> {t('Mark as Delivered')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isPast && returnData.status === 'DELIVERED' && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="py-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold">{t('Parcel delivered')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('Start inspection to check item condition')}</p>
              </div>
              <Button onClick={onStartInspection} disabled={actionLoading}>
                <Search className="h-4 w-4 mr-1.5" /> {t('Start Inspection')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---- INSPECTION ----
interface InspectionTabProps {
  returnData: RhReturn;
  activeStageIndex: number;
  inspCondition: ItemCondition | '';
  inspNotes: string;
  inspSaving: boolean;
  onConditionChange: (c: ItemCondition | '') => void;
  onNotesChange: (n: string) => void;
  onSave: () => void;
  onApprove: () => void;
  onDeduction: () => void;
  onReject: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

function InspectionTab({ returnData, activeStageIndex, inspCondition, inspNotes, inspSaving, onConditionChange, onNotesChange, onSave, onApprove, onDeduction, onReject, t }: InspectionTabProps) {
  const isPast = activeStageIndex > 3;
  const isCurrent = activeStageIndex === 3;

  // Show summary if past
  if (isPast && returnData.inspectionResult) {
    const ir = returnData.inspectionResult;
    return (
      <div className="space-y-4">
        <CompletedBanner label="Step completed" t={t} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="h-4 w-4" />
              {t('Inspection Result')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Condition')}</span>
              <span className="capitalize">{ir.condition ? t(ir.condition === 'like_new' ? 'Like New' : ir.condition.charAt(0).toUpperCase() + ir.condition.slice(1)) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Decision')}</span>
              <span>{ir.approved ? (ir.deductionAmount ? t('Approved with deductions') : t('Approved')) : t('Rejected')}</span>
            </div>
            {ir.deductionAmount != null && ir.deductionAmount > 0 && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2 space-y-1">
                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                  <span className="text-xs font-medium">{t('Deduction')}</span>
                  <span className="text-xs font-medium">−€{ir.deductionAmount.toFixed(2)}</span>
                </div>
                {ir.deductionReason && <p className="text-xs text-amber-600 dark:text-amber-500">{ir.deductionReason}</p>}
              </div>
            )}
            {ir.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">{ir.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isCurrent && (
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
                <Select value={inspCondition} onValueChange={(v) => onConditionChange(v as ItemCondition)}>
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
                <Textarea className="min-h-[70px] text-sm" value={inspNotes} onChange={(e) => onNotesChange(e.target.value)} placeholder={t('Enter inspection notes...')} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={onSave} disabled={inspSaving || !inspCondition}>
                {inspSaving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {t('Save Inspection')}
              </Button>
            </div>

            {/* Decision Buttons */}
            <div className="border-t pt-4 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">{t('Inspection Decision')}</Label>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={onApprove} disabled={inspSaving || !inspCondition}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {t('Approve & Proceed to Refund')}
                </Button>
                <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30" onClick={onDeduction} disabled={inspSaving || !inspCondition}>
                  <MinusCircle className="h-4 w-4 mr-1" />
                  {t('Approve with Deductions')}
                </Button>
                <Button size="sm" variant="destructive" onClick={onReject} disabled={inspSaving || !inspCondition}>
                  <XCircle className="h-4 w-4 mr-1" />
                  {t('Reject After Inspection')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---- REFUND ----
interface RefundTabProps {
  returnData: RhReturn;
  activeStageIndex: number;
  actionLoading: boolean;
  refundAmount: string;
  refundMethod: string;
  onRefundAmountChange: (v: string) => void;
  onRefundMethodChange: (v: string) => void;
  onProcess: () => void;
  onComplete: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

function RefundTab({ returnData, activeStageIndex, actionLoading, refundAmount, refundMethod, onRefundAmountChange, onRefundMethodChange, onProcess, onComplete, t }: RefundTabProps) {
  const isPast = activeStageIndex > 4;
  const isProcessing = returnData.status === 'REFUND_PROCESSING';
  const isCompleted = returnData.status === 'REFUND_COMPLETED';

  return (
    <div className="space-y-4">
      {isPast && <CompletedBanner label="Step completed" t={t} />}

      {/* Deduction info from inspection */}
      {returnData.inspectionResult?.deductionAmount != null && returnData.inspectionResult.deductionAmount > 0 && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 space-y-1">
          <div className="flex justify-between text-amber-700 dark:text-amber-400">
            <span className="text-sm font-medium">{t('Deduction from inspection')}</span>
            <span className="text-sm font-medium">−€{returnData.inspectionResult.deductionAmount.toFixed(2)}</span>
          </div>
          {returnData.inspectionResult.deductionReason && (
            <p className="text-xs text-amber-600 dark:text-amber-500">{returnData.inspectionResult.deductionReason}</p>
          )}
        </div>
      )}

      {/* Refund summary (if already processed) */}
      {(isCompleted || isPast) && returnData.refundedAt && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t('Refund Summary')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Refund Amount')}</span>
              <span className="font-medium text-green-600">€{returnData.refundAmount?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Refund Method')}</span>
              <span className="capitalize">{returnData.refundMethod ? t(returnData.refundMethod === 'original_payment' ? 'Original Payment' : returnData.refundMethod === 'store_credit' ? 'Store Credit' : returnData.refundMethod === 'bank_transfer' ? 'Bank Transfer' : 'Voucher') : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Refunded at')}</span>
              <span>{new Date(returnData.refundedAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process Refund Form */}
      {isProcessing && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('Process Refund')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1 flex-1 max-w-xs">
                <label className="text-xs text-muted-foreground">{t('Refund Amount')} (€)</label>
                <input type="number" step="0.01" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={refundAmount} onChange={(e) => onRefundAmountChange(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1 w-[200px]">
                <label className="text-xs text-muted-foreground">{t('Refund Method')}</label>
                <Select value={refundMethod} onValueChange={onRefundMethodChange}>
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
              <Button size="sm" onClick={onProcess} disabled={actionLoading || !refundAmount}>
                {actionLoading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                <CreditCard className="h-4 w-4 mr-1" />
                {t('Process Refund')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete button when refund is done but return not completed yet */}
      {isCompleted && (
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="py-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold">{t('Refund completed')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('Complete the return to finalize the process')}</p>
              </div>
              <Button onClick={onComplete} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> {t('Complete Return')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---- COMPLETED ----
function CompletedTab({ returnData, items, t }: { returnData: RhReturn; items: RhReturnItem[]; t: (k: string, opts?: Record<string, unknown>) => string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <div>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{t('Return completed')}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{t('This return has been fully processed')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReturnInfoSummary returnData={returnData} t={t} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('Refund Summary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Refund Amount')}</span>
              <span className="font-medium text-green-600">€{returnData.refundAmount?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Refund Method')}</span>
              <span className="capitalize">{returnData.refundMethod ? t(returnData.refundMethod === 'original_payment' ? 'Original Payment' : returnData.refundMethod === 'store_credit' ? 'Store Credit' : returnData.refundMethod === 'bank_transfer' ? 'Bank Transfer' : 'Voucher') : '—'}</span>
            </div>
            {returnData.inspectionResult?.deductionAmount != null && returnData.inspectionResult.deductionAmount > 0 && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2">
                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                  <span className="text-xs font-medium">{t('Deduction')}</span>
                  <span className="text-xs font-medium">−€{returnData.inspectionResult.deductionAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('Items')} ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ReturnItemsTable items={items} readonly />
        </CardContent>
      </Card>
    </div>
  );
}
