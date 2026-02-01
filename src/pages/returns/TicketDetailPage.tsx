import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Printer, RotateCcw, X, GitMerge, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TicketThread } from '@/components/returns/TicketThread';
import { CustomerCard } from '@/components/returns/CustomerCard';
import { TicketPriorityBadge } from '@/components/returns/TicketPriorityBadge';
import { TicketSLABadge } from '@/components/returns/TicketSLABadge';
import { TicketAssigneeSelect } from '@/components/returns/TicketAssigneeSelect';
import { TicketTagsEditor } from '@/components/returns/TicketTagsEditor';
import { TicketActivityLog } from '@/components/returns/TicketActivityLog';
import { SLAProgressBar } from '@/components/returns/SLAProgressBar';
import { EmptyState } from '@/components/returns/EmptyState';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import {
  getRhTicket, getRhTickets, getRhTicketMessages, addRhTicketMessage, updateRhTicket, getRhCustomer,
  logTicketActivity, mergeTickets,
} from '@/services/supabase';
import type { RhTicket, RhTicketMessage, RhCustomer, TicketStatus, ReturnPriority } from '@/types/returns-hub';

const statusLabels: Record<TicketStatus, string> = {
  open: 'Open', in_progress: 'In Progress', waiting: 'Waiting', resolved: 'Resolved', closed: 'Closed',
};

const priorityLabels: Record<ReturnPriority, string> = {
  low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent',
};

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('returns');

  const [ticket, setTicket] = useState<RhTicket | null>(null);
  const [messages, setMessages] = useState<RhTicketMessage[]>([]);
  const [customer, setCustomer] = useState<RhCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activityKey, setActivityKey] = useState(0);

  // Dialogs
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [resolutionReason, setResolutionReason] = useState('');
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeTicketNumber, setMergeTicketNumber] = useState('');
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const [tkt, msgs] = await Promise.all([
        getRhTicket(id!),
        getRhTicketMessages(id!),
      ]);
      setTicket(tkt);
      setMessages(msgs);
      if (tkt?.customerId) {
        const cust = await getRhCustomer(tkt.customerId);
        setCustomer(cust);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const refreshTicket = async () => {
    if (!id) return;
    const tkt = await getRhTicket(id);
    setTicket(tkt);
    setActivityKey((k) => k + 1);
  };

  const handleSend = async (content: string, isInternal: boolean, attachments: string[]) => {
    if (!id || !ticket) return;
    setSending(true);
    await addRhTicketMessage({
      ticketId: id,
      senderType: 'agent',
      content,
      isInternal,
      attachments,
    });
    const msgs = await getRhTicketMessages(id);
    setMessages(msgs);
    setSending(false);
  };

  const handleStatusChange = async (status: string) => {
    if (!id || !ticket) return;
    const oldStatus = ticket.status;
    const updates: Partial<RhTicket> = { status: status as TicketStatus };
    if (status === 'resolved') updates.resolvedAt = new Date().toISOString();
    await updateRhTicket(id, updates);
    await logTicketActivity(id, 'status_changed', { from: oldStatus, to: status });
    await addRhTicketMessage({
      ticketId: id,
      senderType: 'system',
      content: t('Status changed from {{from}} to {{to}}', { from: t(statusLabels[oldStatus]), to: t(statusLabels[status as TicketStatus]) }),
      attachments: [],
      isInternal: false,
    });
    const [tkt, msgs] = await Promise.all([getRhTicket(id), getRhTicketMessages(id)]);
    setTicket(tkt);
    setMessages(msgs);
    setActivityKey((k) => k + 1);
  };

  const handlePriorityChange = async (priority: string) => {
    if (!id || !ticket) return;
    const oldPriority = ticket.priority;
    await updateRhTicket(id, { priority: priority as ReturnPriority });
    await logTicketActivity(id, 'priority_changed', { from: oldPriority, to: priority });
    await refreshTicket();
  };

  const handleAssigneeChange = async (assignedTo: string | undefined) => {
    if (!id || !ticket) return;
    await updateRhTicket(id, { assignedTo: assignedTo || undefined });
    await logTicketActivity(id, assignedTo ? 'assigned' : 'unassigned', { userId: assignedTo });
    await refreshTicket();
  };

  const handleTagsChange = async (tags: string[]) => {
    if (!id || !ticket) return;
    await updateRhTicket(id, { tags });
    await logTicketActivity(id, 'tags_changed', { tags });
    await refreshTicket();
  };

  const handleCategoryChange = async (category: string) => {
    if (!id || !ticket) return;
    await updateRhTicket(id, { category: category || undefined });
    await logTicketActivity(id, 'category_changed', { category });
    await refreshTicket();
  };

  const handleCloseWithReason = async () => {
    if (!id || !ticket) return;
    await updateRhTicket(id, {
      status: 'closed',
      resolvedAt: new Date().toISOString(),
      metadata: { ...ticket.metadata, resolutionReason },
    });
    await logTicketActivity(id, 'closed_with_reason', { reason: resolutionReason });
    await addRhTicketMessage({
      ticketId: id,
      senderType: 'system',
      content: t('Ticket closed'),
      attachments: [],
      isInternal: false,
    });
    setCloseDialogOpen(false);
    setResolutionReason('');
    const [tkt, msgs] = await Promise.all([getRhTicket(id), getRhTicketMessages(id)]);
    setTicket(tkt);
    setMessages(msgs);
    setActivityKey((k) => k + 1);
  };

  const handleReopen = async () => {
    if (!id || !ticket) return;
    await updateRhTicket(id, { status: 'open', resolvedAt: undefined });
    await logTicketActivity(id, 'reopened', {});
    await addRhTicketMessage({
      ticketId: id,
      senderType: 'system',
      content: t('Ticket reopened'),
      attachments: [],
      isInternal: false,
    });
    const [tkt, msgs] = await Promise.all([getRhTicket(id), getRhTicketMessages(id)]);
    setTicket(tkt);
    setMessages(msgs);
    setActivityKey((k) => k + 1);
  };

  const handleMerge = async () => {
    if (!id || !mergeTicketNumber.trim()) return;
    setMerging(true);
    const result = await getRhTickets({ search: mergeTicketNumber.trim() }, 1, 1);
    if (result.data.length === 0 || result.data[0].id === id) {
      setMerging(false);
      return;
    }
    await mergeTickets(id, result.data[0].id);
    setMergeDialogOpen(false);
    setMergeTicketNumber('');
    setMerging(false);
    const [tkt, msgs] = await Promise.all([getRhTicket(id), getRhTicketMessages(id)]);
    setTicket(tkt);
    setMessages(msgs);
    setActivityKey((k) => k + 1);
  };

  const sidebarVisibility = useStaggeredList(8, { interval: 50, initialDelay: 200 });

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 rounded-md bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-muted rounded w-40 animate-pulse" />
            <div className="h-4 bg-muted rounded w-64 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="pt-6 animate-pulse">
                <div className="space-y-4">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-muted rounded w-24" />
                        <div className="h-12 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-20 mb-2" />
                  <div className="h-8 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="animate-fade-in-up">
        <EmptyState
          icon={MessageSquareText}
          title={t('Ticket not found')}
          actionLabel={t('Back to list')}
          onAction={() => navigate('/returns/tickets')}
        />
      </div>
    );
  }

  const isClosedOrResolved = ticket.status === 'resolved' || ticket.status === 'closed';

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/returns/tickets')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{ticket.ticketNumber}</h1>
            <Badge variant="outline" className="capitalize">{t(statusLabels[ticket.status])}</Badge>
            <TicketPriorityBadge priority={ticket.priority} />
          </div>
          <p className="text-muted-foreground text-sm">{ticket.subject}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} title={t('Print')}>
            <Printer className="h-4 w-4" />
          </Button>
          {isClosedOrResolved && (
            <Button variant="outline" size="sm" onClick={handleReopen}>
              <RotateCcw className="h-4 w-4 mr-1" />
              {t('Reopen')}
            </Button>
          )}
          {!isClosedOrResolved && (
            <Button variant="outline" size="sm" onClick={() => setCloseDialogOpen(true)}>
              <X className="h-4 w-4 mr-1" />
              {t('Close with Reason')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setMergeDialogOpen(true)}>
            <GitMerge className="h-4 w-4 mr-1" />
            {t('Merge')}
          </Button>
          <Select value={ticket.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(statusLabels) as TicketStatus[]).map(s => (
                <SelectItem key={s} value={s}>{t(statusLabels[s])}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Thread */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-sm">{t('Communication')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <TicketThread
                messages={messages}
                onSend={handleSend}
                sending={sending}
                ticketId={ticket.id}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Assignment */}
          <Card
            className={`transition-all duration-300 ${sidebarVisibility[0] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out' }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Assignee')}</CardTitle></CardHeader>
            <CardContent>
              <TicketAssigneeSelect
                value={ticket.assignedTo}
                onValueChange={handleAssigneeChange}
              />
            </CardContent>
          </Card>

          {/* Priority */}
          <Card
            className={`transition-all duration-300 ${sidebarVisibility[1] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out' }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Priority')}</CardTitle></CardHeader>
            <CardContent>
              <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(priorityLabels) as ReturnPriority[]).map(p => (
                    <SelectItem key={p} value={p}>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${
                          p === 'urgent' ? 'bg-red-500' : p === 'high' ? 'bg-orange-500' : p === 'normal' ? 'bg-blue-500' : 'bg-gray-400'
                        }`} />
                        {t(priorityLabels[p])}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* SLA */}
          <Card
            className={`transition-all duration-300 ${sidebarVisibility[2] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out' }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('SLA')}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <TicketSLABadge ticket={ticket} />
              {ticket.slaResolutionAt && (
                <SLAProgressBar ticket={ticket} />
              )}
              {ticket.firstRespondedAt && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t('First Responded')}</span>
                  <span>{new Date(ticket.firstRespondedAt).toLocaleString()}</span>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t('Resolved At')}</span>
                  <span>{new Date(ticket.resolvedAt).toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card
            className={`transition-all duration-300 ${sidebarVisibility[3] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out' }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Tags')}</CardTitle></CardHeader>
            <CardContent>
              <TicketTagsEditor tags={ticket.tags} onChange={handleTagsChange} />
            </CardContent>
          </Card>

          {/* Category */}
          <Card
            className={`transition-all duration-300 ${sidebarVisibility[4] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out' }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Category')}</CardTitle></CardHeader>
            <CardContent>
              <Input
                value={ticket.category || ''}
                onChange={(e) => handleCategoryChange(e.target.value)}
                placeholder={t('Category')}
              />
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card
            className={`transition-all duration-300 ${sidebarVisibility[5] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out' }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Ticket Details')}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Created At')}</span>
                <span>{new Date(ticket.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Updated At')}</span>
                <span>{new Date(ticket.updatedAt).toLocaleString()}</span>
              </div>
              {ticket.returnId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Linked Return')}</span>
                  <a href={`/returns/${ticket.returnId}`} className="text-primary hover:underline">{t('View')}</a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer */}
          {customer && (
            <div
              className={`transition-all duration-300 ${sidebarVisibility[6] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
              style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out' }}
            >
              <CustomerCard customer={customer} />
            </div>
          )}

          {/* Activity Log */}
          <Card
            className={`transition-all duration-300 ${sidebarVisibility[7] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out' }}
          >
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Activity Log')}</CardTitle></CardHeader>
            <CardContent>
              <TicketActivityLog ticketId={ticket.id} refreshKey={activityKey} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Close Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Close Ticket')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('Resolution Reason')}</Label>
              <Textarea
                value={resolutionReason}
                onChange={(e) => setResolutionReason(e.target.value)}
                placeholder={t('Describe the resolution...')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handleCloseWithReason} disabled={!resolutionReason.trim()}>
              {t('Close Ticket')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Merge Tickets')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('Enter ticket number to merge')}</Label>
              <Input
                value={mergeTicketNumber}
                onChange={(e) => setMergeTicketNumber(e.target.value)}
                placeholder="TKT-..."
              />
              <p className="text-xs text-muted-foreground">
                {t('The selected ticket will be closed and its messages moved to this ticket.')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handleMerge} disabled={!mergeTicketNumber.trim() || merging}>
              {merging && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('Merge')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
