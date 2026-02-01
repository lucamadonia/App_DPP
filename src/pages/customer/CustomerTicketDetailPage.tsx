import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CustomerTicketThread } from '@/components/customer/CustomerTicketThread';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { getCustomerTicket, getCustomerTicketMessages, sendCustomerMessage } from '@/services/supabase/customer-portal';
import { supabase } from '@/lib/supabase';
import type { RhTicket, RhTicketMessage } from '@/types/returns-hub';

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  waiting: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

export function CustomerTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('customer-portal');
  const { tenantSlug } = useCustomerPortal();

  const [ticket, setTicket] = useState<RhTicket | null>(null);
  const [messages, setMessages] = useState<RhTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadData = async () => {
    if (!id) return;
    const [ticketData, messagesData] = await Promise.all([
      getCustomerTicket(id),
      getCustomerTicketMessages(id),
    ]);
    setTicket(ticketData);
    setMessages(messagesData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`customer-ticket-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rh_ticket_messages',
        filter: `ticket_id=eq.${id}`,
      }, (payload) => {
        const newMsg = payload.new as Record<string, unknown>;
        // Only show non-internal messages
        if (!newMsg.is_internal) {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id as string,
              ticketId: newMsg.ticket_id as string,
              tenantId: newMsg.tenant_id as string,
              senderType: newMsg.sender_type as 'agent' | 'customer' | 'system',
              senderId: (newMsg.sender_id as string) || undefined,
              senderName: (newMsg.sender_name as string) || undefined,
              senderEmail: (newMsg.sender_email as string) || undefined,
              content: newMsg.content as string,
              attachments: (newMsg.attachments as string[]) || [],
              isInternal: false,
              createdAt: newMsg.created_at as string,
            }];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleSend = async (content: string, attachments: string[]) => {
    if (!id) return;
    setSending(true);
    await sendCustomerMessage(id, content, attachments);
    // Realtime will add the message, but also reload to be safe
    const msgs = await getCustomerTicketMessages(id);
    setMessages(msgs);
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="font-medium">{t('Ticket not found')}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(`/customer/${tenantSlug}/tickets`)}>
          {t('Back to Tickets')}
        </Button>
      </div>
    );
  }

  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved';

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/customer/${tenantSlug}/tickets`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold truncate">{ticket.subject}</h1>
            <Badge className={`text-[10px] px-1.5 shrink-0 ${statusColors[ticket.status] || ''}`}>
              {t(ticket.status)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {ticket.ticketNumber} &middot; {t('Created on {{date}}', { date: new Date(ticket.createdAt).toLocaleDateString() })}
          </p>
        </div>
      </div>

      {/* Thread */}
      <Card className="flex-1 min-h-[400px] flex flex-col overflow-hidden">
        <CustomerTicketThread
          messages={messages}
          onSend={handleSend}
          sending={sending}
          ticketId={ticket.id}
        />
      </Card>

      {isClosed && (
        <p className="text-center text-sm text-muted-foreground py-2">
          {t('This ticket has been resolved. You can still send a message to reopen it.')}
        </p>
      )}
    </div>
  );
}
