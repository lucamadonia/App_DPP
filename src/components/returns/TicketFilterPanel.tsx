import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { TicketAssigneeSelect } from './TicketAssigneeSelect';
import type { TicketsFilter, TicketStatus, ReturnPriority, SlaStatus } from '@/types/returns-hub';

interface TicketFilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: TicketsFilter;
  onFilterChange: (filter: TicketsFilter) => void;
}

const allStatuses: TicketStatus[] = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];
const statusLabels: Record<TicketStatus, string> = {
  open: 'Open', in_progress: 'In Progress', waiting: 'Waiting', resolved: 'Resolved', closed: 'Closed',
};

const allPriorities: ReturnPriority[] = ['low', 'normal', 'high', 'urgent'];
const priorityLabels: Record<ReturnPriority, string> = {
  low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent',
};

const allSlaStatuses: SlaStatus[] = ['met', 'at_risk', 'breached', 'none'];
const slaLabels: Record<SlaStatus, string> = {
  met: 'SLA Met', at_risk: 'SLA At Risk', breached: 'SLA Breached', none: 'No SLA',
};

export function TicketFilterPanel({ open, onOpenChange, filter, onFilterChange }: TicketFilterPanelProps) {
  const { t } = useTranslation('returns');

  const toggleArrayItem = <T extends string>(arr: T[] | undefined, item: T): T[] => {
    const current = arr || [];
    return current.includes(item) ? current.filter(i => i !== item) : [...current, item];
  };

  const handleReset = () => {
    onFilterChange({});
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('Advanced Filters')}</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 mt-4">
          {/* Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('Status')}</Label>
            {allStatuses.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <Checkbox
                  checked={filter.status?.includes(s) || false}
                  onCheckedChange={() => onFilterChange({ ...filter, status: toggleArrayItem(filter.status, s) })}
                />
                <span className="text-sm">{t(statusLabels[s])}</span>
              </div>
            ))}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('Priority')}</Label>
            {allPriorities.map((p) => (
              <div key={p} className="flex items-center gap-2">
                <Checkbox
                  checked={filter.priority?.includes(p) || false}
                  onCheckedChange={() => onFilterChange({ ...filter, priority: toggleArrayItem(filter.priority, p) })}
                />
                <span className="text-sm">{t(priorityLabels[p])}</span>
              </div>
            ))}
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('Assignee')}</Label>
            <TicketAssigneeSelect
              value={filter.assignedTo}
              onValueChange={(v) => onFilterChange({ ...filter, assignedTo: v })}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('Category')}</Label>
            <Input
              value={filter.category || ''}
              onChange={(e) => onFilterChange({ ...filter, category: e.target.value || undefined })}
              placeholder={t('Category')}
            />
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('Date Range')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">{t('From')}</Label>
                <Input
                  type="date"
                  value={filter.dateFrom || ''}
                  onChange={(e) => onFilterChange({ ...filter, dateFrom: e.target.value || undefined })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('To')}</Label>
                <Input
                  type="date"
                  value={filter.dateTo || ''}
                  onChange={(e) => onFilterChange({ ...filter, dateTo: e.target.value || undefined })}
                />
              </div>
            </div>
          </div>

          {/* SLA Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('SLA Status')}</Label>
            {allSlaStatuses.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <Checkbox
                  checked={filter.slaStatus?.includes(s) || false}
                  onCheckedChange={() => onFilterChange({ ...filter, slaStatus: toggleArrayItem(filter.slaStatus, s) })}
                />
                <span className="text-sm">{t(slaLabels[s])}</span>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('Tags')}</Label>
            <Input
              placeholder={t('Type tag and press Enter')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                  e.preventDefault();
                  const tag = (e.target as HTMLInputElement).value.trim().toLowerCase();
                  const current = filter.tags || [];
                  if (!current.includes(tag)) {
                    onFilterChange({ ...filter, tags: [...current, tag] });
                  }
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
            {filter.tags && filter.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filter.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs bg-secondary px-2 py-0.5 rounded">
                    {tag}
                    <button onClick={() => onFilterChange({ ...filter, tags: filter.tags?.filter(t => t !== tag) })}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button variant="outline" className="w-full" onClick={handleReset}>
            {t('Reset Filters')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
