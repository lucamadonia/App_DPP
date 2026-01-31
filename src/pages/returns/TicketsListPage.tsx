import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Loader2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getRhTickets, createRhTicket, addRhTicketMessage, getRhCustomers } from '@/services/supabase';
import type { RhTicket, RhCustomer, TicketStatus, TicketsFilter, PaginatedResult } from '@/types/returns-hub';

const statusColors: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
};

const statusLabels: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting: 'Waiting',
  resolved: 'Resolved',
  closed: 'Closed',
};

export function TicketsListPage() {
  const { t } = useTranslation('returns');
  const navigate = useNavigate();
  const [result, setResult] = useState<PaginatedResult<RhTicket>>({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Create ticket dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [customers, setCustomers] = useState<RhCustomer[]>([]);
  const [subject, setSubject] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [ticketPriority, setTicketPriority] = useState('normal');
  const [category, setCategory] = useState('');
  const [initialMessage, setInitialMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const filter: TicketsFilter = {};
    if (statusFilter !== 'all') filter.status = [statusFilter as TicketStatus];
    if (search) filter.search = search;
    const data = await getRhTickets(filter, page, 20);
    setResult(data);
    setLoading(false);
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const isSlaOverdue = (ticket: RhTicket) => {
    if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
    if (ticket.slaResolutionAt && new Date(ticket.slaResolutionAt) < new Date()) return true;
    return false;
  };

  const openDialog = async () => {
    setSubject('');
    setCustomerId('');
    setTicketPriority('normal');
    setCategory('');
    setInitialMessage('');
    const custResult = await getRhCustomers(undefined, 1, 100);
    setCustomers(custResult.data);
    setDialogOpen(true);
  };

  const handleCreateTicket = async () => {
    if (!subject.trim()) return;
    setCreating(true);

    const result = await createRhTicket({
      subject: subject.trim(),
      customerId: customerId || undefined,
      priority: ticketPriority as RhTicket['priority'],
      category: category || undefined,
    });

    if (result.success && result.id) {
      if (initialMessage.trim()) {
        await addRhTicketMessage({
          ticketId: result.id,
          senderType: 'agent',
          content: initialMessage.trim(),
          attachments: [],
          isInternal: false,
        });
      }
      setDialogOpen(false);
      navigate(`/returns/tickets/${result.id}`);
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('Ticket List')}</h1>
          <p className="text-muted-foreground">{result.total} {t('Tickets')}</p>
        </div>
        <Button onClick={openDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t('New Ticket')}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t('Search by ticket number, subject...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t('All Statuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Statuses')}</SelectItem>
                {(Object.keys(statusLabels) as TicketStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{t(statusLabels[s])}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : result.data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">{t('No tickets found')}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">{t('Ticket Number')}</th>
                      <th className="pb-2 font-medium">{t('Subject')}</th>
                      <th className="pb-2 font-medium">{t('Status')}</th>
                      <th className="pb-2 font-medium">{t('Priority')}</th>
                      <th className="pb-2 font-medium">{t('Date')}</th>
                      <th className="pb-2 font-medium">{t('SLA')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((ticket) => (
                      <tr key={ticket.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3">
                          <Link to={`/returns/tickets/${ticket.id}`} className="text-primary hover:underline font-medium">
                            {ticket.ticketNumber}
                          </Link>
                        </td>
                        <td className="py-3 max-w-xs truncate">{ticket.subject}</td>
                        <td className="py-3">
                          <Badge variant="outline" className={statusColors[ticket.status]}>{t(statusLabels[ticket.status])}</Badge>
                        </td>
                        <td className="py-3 capitalize">{t(ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1))}</td>
                        <td className="py-3 text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                        <td className="py-3">
                          {isSlaOverdue(ticket) && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />{t('Overdue')}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm text-muted-foreground">{page} / {result.totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(result.totalPages, p + 1))} disabled={page >= result.totalPages}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('New Ticket')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('Subject')} *</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('Ticket subject...')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Customer')}</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('No customer')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('No customer')}</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Priority')}</Label>
                <Select value={ticketPriority} onValueChange={setTicketPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('Low')}</SelectItem>
                    <SelectItem value="normal">{t('Normal')}</SelectItem>
                    <SelectItem value="high">{t('High')}</SelectItem>
                    <SelectItem value="urgent">{t('Urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('Category')}</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={t('Category')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Initial Message')}</Label>
              <Textarea
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder={t('Initial Message')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handleCreateTicket} disabled={creating || !subject.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
