import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TicketThread } from '@/components/returns/TicketThread';
import { CustomerCard } from '@/components/returns/CustomerCard';
import { getRhTicket, getRhTicketMessages, addRhTicketMessage, updateRhTicket, getRhCustomer } from '@/services/supabase';
import type { RhTicket, RhTicketMessage, RhCustomer, TicketStatus } from '@/types/returns-hub';

const statusLabels: Record<TicketStatus, string> = {
  open: 'Open', in_progress: 'In Progress', waiting: 'Waiting', resolved: 'Resolved', closed: 'Closed',
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

  const handleSend = async (content: string, isInternal: boolean) => {
    if (!id || !ticket) return;
    setSending(true);
    await addRhTicketMessage({
      ticketId: id,
      senderType: 'agent',
      content,
      isInternal,
      attachments: [],
    });
    const msgs = await getRhTicketMessages(id);
    setMessages(msgs);
    setSending(false);
  };

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    await updateRhTicket(id, { status: status as TicketStatus });
    const tkt = await getRhTicket(id);
    setTicket(tkt);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!ticket) {
    return <div className="text-center py-12"><p className="text-muted-foreground">{t('Ticket not found')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/returns/tickets')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{ticket.ticketNumber}</h1>
            <Badge variant="outline" className="capitalize">{t(statusLabels[ticket.status])}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">{ticket.subject}</p>
        </div>
        <Select value={ticket.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(statusLabels) as TicketStatus[]).map(s => (
              <SelectItem key={s} value={s}>{t(statusLabels[s])}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-sm">{t('Communication')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <TicketThread messages={messages} onSend={handleSend} sending={sending} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {customer && <CustomerCard customer={customer} />}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Ticket Details')}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('Category')}</span><span>{ticket.category || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('Priority')}</span><span className="capitalize">{t(ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('Date')}</span><span>{new Date(ticket.createdAt).toLocaleDateString()}</span></div>
              {ticket.returnId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Linked Return')}</span>
                  <a href={`/returns/${ticket.returnId}`} className="text-primary hover:underline">{t('View')}</a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
