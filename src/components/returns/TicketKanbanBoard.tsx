import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TicketPriorityBadge } from './TicketPriorityBadge';
import { TicketSLABadge } from './TicketSLABadge';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import { MessageSquareText } from 'lucide-react';
import type { RhTicket, TicketStatus } from '@/types/returns-hub';

interface TicketKanbanBoardProps {
  tickets: RhTicket[];
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
}

const columns: { status: TicketStatus; label: string; color: string }[] = [
  { status: 'open', label: 'Open', color: 'border-t-blue-500' },
  { status: 'in_progress', label: 'In Progress', color: 'border-t-yellow-500' },
  { status: 'waiting', label: 'Waiting', color: 'border-t-purple-500' },
  { status: 'resolved', label: 'Resolved', color: 'border-t-green-500' },
  { status: 'closed', label: 'Closed', color: 'border-t-gray-400' },
];

const allStatuses: TicketStatus[] = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];
const statusLabels: Record<TicketStatus, string> = {
  open: 'Open', in_progress: 'In Progress', waiting: 'Waiting', resolved: 'Resolved', closed: 'Closed',
};

export function TicketKanbanBoard({ tickets, onStatusChange }: TicketKanbanBoardProps) {
  const { t } = useTranslation('returns');
  const navigate = useNavigate();
  const cardVisibility = useStaggeredList(tickets.length, { interval: 30, initialDelay: 100 });

  // Build a flat index map so each ticket gets a unique stagger index
  const ticketIndexMap = new Map<string, number>();
  tickets.forEach((tk, i) => ticketIndexMap.set(tk.id, i));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {columns.map((col) => {
        const colTickets = tickets.filter((tk) => tk.status === col.status);
        return (
          <div key={col.status} className="space-y-2">
            <div className={`border-t-4 ${col.color} rounded-t`}>
              <div className="flex items-center justify-between px-2 py-2">
                <span className="text-sm font-medium">{t(col.label)}</span>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {colTickets.length}
                </span>
              </div>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {colTickets.map((ticket) => {
                const idx = ticketIndexMap.get(ticket.id) ?? 0;
                return (
                  <Card
                    key={ticket.id}
                    className={`cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ${
                      cardVisibility[idx] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                    }`}
                    style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out, box-shadow 0.2s ease' }}
                    onClick={() => navigate(`/returns/tickets/${ticket.id}`)}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
                        <TicketPriorityBadge priority={ticket.priority} />
                      </div>
                      <p className="text-sm font-medium line-clamp-2">{ticket.subject}</p>
                      <div className="flex items-center justify-between">
                        {ticket.assignedTo ? (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {ticket.assignedTo.charAt(0).toUpperCase()}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t('Unassigned')}</span>
                        )}
                        <TicketSLABadge ticket={ticket} className="text-[10px]" />
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={ticket.status}
                          onValueChange={(v) => onStatusChange(ticket.id, v as TicketStatus)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder={t('Move to...')} />
                          </SelectTrigger>
                          <SelectContent>
                            {allStatuses.filter(s => s !== ticket.status).map((s) => (
                              <SelectItem key={s} value={s}>{t(statusLabels[s])}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {colTickets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <MessageSquareText className="h-5 w-5 mb-1 opacity-40" />
                  <p className="text-xs">{t('No tickets found')}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
