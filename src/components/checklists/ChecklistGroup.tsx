import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { Accordion } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { IconTile } from '@/components/ui/icon-tile';
import { cn } from '@/lib/utils';
import { ChecklistItemRow } from './ChecklistItemRow';
import {
  getChecklistGroupIcon,
  type ChecklistItem,
  type ChecklistItemStatus,
} from './checklist-meta';

interface ChecklistGroupProps {
  category: string;
  items: ChecklistItem[];
  getStatus: (item: ChecklistItem) => ChecklistItemStatus;
  onCycleStatus: (item: ChecklistItem) => void;
}

export function ChecklistGroup({ category, items, getStatus, onCycleStatus }: ChecklistGroupProps) {
  const { t } = useTranslation('compliance');
  const [open, setOpen] = useState(true);
  const Icon = getChecklistGroupIcon(category);

  const completed = items.filter((i) => getStatus(i) === 'completed').length;
  const openCritical = items.filter((i) => i.priority === 'critical' && getStatus(i) !== 'completed').length;
  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
  const allDone = completed === items.length && items.length > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <CollapsibleTrigger className="flex min-h-14 w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4">
          <IconTile icon={Icon} size="md" tone={allDone ? 'success' : openCritical > 0 ? 'danger' : 'primary'} />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-snug break-words">{category}</h3>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none',
                    allDone ? 'bg-success' : 'bg-primary'
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {completed}/{items.length}
              </span>
              {openCritical > 0 && (
                <span className="hidden shrink-0 text-xs font-medium text-destructive xs:inline">
                  {t('{{count}} critical open', { count: openCritical })}
                </span>
              )}
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none',
              open && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-2 sm:p-3">
            <Accordion type="multiple" className="space-y-2">
              {items.map((item) => (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  status={getStatus(item)}
                  onCycleStatus={() => onCycleStatus(item)}
                />
              ))}
            </Accordion>
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
