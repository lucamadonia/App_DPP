import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Search, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { getCustomerTickets, createCustomerTicket } from '@/services/supabase/customer-portal';
import type { RhTicket } from '@/types/returns-hub';

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  waiting: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

export function CustomerTicketsListPage() {
  const { t } = useTranslation('customer-portal');
  const navigate = useNavigate();
  const { tenantSlug } = useCustomerPortal();
  const [tickets, setTickets] = useState<RhTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // New ticket dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    const filter: { status?: string[]; search?: string } = {};
    if (statusFilter !== 'all') filter.status = [statusFilter];
    if (search) filter.search = search;

    const result = await getCustomerTickets(filter, page, pageSize);
    setTickets(result.data);
    setTotal(result.total);
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, [search, statusFilter, page]);

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setCreating(true);

    const result = await createCustomerTicket({
      subject: newSubject.trim(),
      message: newMessage.trim(),
    });

    if (result.success && result.id) {
      setDialogOpen(false);
      setNewSubject('');
      setNewMessage('');
      navigate(`/customer/${tenantSlug}/tickets/${result.id}`);
    }
    setCreating(false);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('My Tickets')}</h1>
          <p className="text-muted-foreground">{t('View and manage your support tickets')}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('New Ticket')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search tickets...')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('All Statuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Statuses')}</SelectItem>
            <SelectItem value="open">{t('Open')}</SelectItem>
            <SelectItem value="in_progress">{t('In Progress')}</SelectItem>
            <SelectItem value="waiting">{t('Waiting')}</SelectItem>
            <SelectItem value="resolved">{t('Resolved')}</SelectItem>
            <SelectItem value="closed">{t('Closed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium">{t('No tickets found')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('Create a ticket to get help from our team.')}</p>
            <Button className="mt-4 gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('New Ticket')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => navigate(`/customer/${tenantSlug}/tickets/${ticket.id}`)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">{ticket.ticketNumber}</span>
                        <Badge className={`text-[10px] px-1.5 ${statusColors[ticket.status] || 'bg-gray-100 text-gray-700'}`}>
                          {t(ticket.status)}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm mt-1 truncate">{ticket.subject}</p>
                    </div>
                    <span className="text-xs text-muted-foreground ml-4 shrink-0">
                      {new Date(ticket.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {t('Previous', { ns: 'returns' })}
              </Button>
              <span className="flex items-center text-sm text-muted-foreground px-3">
                {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                {t('Next', { ns: 'returns' })}
              </Button>
            </div>
          )}
        </>
      )}

      {/* New Ticket Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('New Support Ticket')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('Subject')} *</Label>
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder={t('Brief description of your issue')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Message')} *</Label>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t('Describe your issue in detail...')}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button onClick={handleCreateTicket} disabled={creating || !newSubject.trim() || !newMessage.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('Create Ticket')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
