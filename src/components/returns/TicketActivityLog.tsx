import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, ArrowRight, Flag, Tag, GitMerge, RotateCcw, Lock, Loader2 } from 'lucide-react';
import { getTicketActivity } from '@/services/supabase';
import type { ActivityLogEntry } from '@/types/database';

interface TicketActivityLogProps {
  ticketId: string;
  refreshKey?: number;
}

const actionIcons: Record<string, React.ElementType> = {
  assigned: UserPlus,
  unassigned: UserPlus,
  status_changed: ArrowRight,
  priority_changed: Flag,
  tags_changed: Tag,
  category_changed: ArrowRight,
  merged: GitMerge,
  reopened: RotateCcw,
  closed_with_reason: Lock,
};

export function TicketActivityLog({ ticketId, refreshKey }: TicketActivityLogProps) {
  const { t } = useTranslation('returns');
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTicketActivity(ticketId).then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, [ticketId, refreshKey]);

  if (loading) {
    return <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  }

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">{t('No activity yet')}</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => {
        const Icon = actionIcons[entry.action] || ArrowRight;
        const isLast = index === entries.length - 1;

        let description = entry.action;
        const d = entry.details as Record<string, string>;
        if (entry.action === 'status_changed' && d?.from && d?.to) {
          description = t('Status changed from {{from}} to {{to}}', { from: t(d.from), to: t(d.to) });
        } else if (entry.action === 'assigned' && d?.name) {
          description = t('Assigned to {{name}}', { name: d.name });
        } else if (entry.action === 'priority_changed' && d?.from && d?.to) {
          description = t('Priority changed from {{from}} to {{to}}', { from: t(d.from), to: t(d.to) });
        } else if (entry.action === 'tags_changed') {
          description = t('Tags updated');
        } else if (entry.action === 'category_changed' && d?.category) {
          description = t('Category changed to {{category}}', { category: d.category });
        } else if (entry.action === 'merged') {
          description = t('Ticket merged');
        } else if (entry.action === 'reopened') {
          description = t('Ticket reopened');
        }

        return (
          <div key={entry.id} className="flex gap-2">
            <div className="flex flex-col items-center">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full ${isLast ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Icon className="h-3 w-3" />
              </div>
              {index < entries.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="flex-1 pb-2">
              <p className="text-xs">{description}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
