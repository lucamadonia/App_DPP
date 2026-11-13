import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckSquare,
  FileText,
  HelpCircle,
  Info,
  Package,
  Scale,
} from 'lucide-react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DeadlineChip } from '@/components/knowledge/DeadlineChip';
import { DetailField, DetailGrid, LinkPills } from '@/components/knowledge/DetailField';
import { PriorityBadge } from '@/components/knowledge/PriorityBadge';
import { STATUS_META, type ChecklistItem, type ChecklistItemStatus } from './checklist-meta';

interface ChecklistItemRowProps {
  item: ChecklistItem;
  status: ChecklistItemStatus;
  onCycleStatus: () => void;
}

export function ChecklistItemRow({ item, status, onCycleStatus }: ChecklistItemRowProps) {
  const { t } = useTranslation('compliance');
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  const done = status === 'completed';

  return (
    <AccordionItem value={item.id} className="border-0">
      <div className={cn('rounded-xl border transition-colors duration-200', meta.rowClass)}>
        <div className="flex items-start gap-1.5 p-1.5 sm:gap-2 sm:p-2">
          <button
            type="button"
            onClick={onCycleStatus}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-[background-color,transform] duration-150 hover:bg-muted active:scale-90 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('Status: {{status}} — tap to change', { status: t(meta.labelKey) })}
            title={t(meta.labelKey)}
          >
            <StatusIcon className={cn('h-[22px] w-[22px]', meta.iconClass)} />
          </button>
          <div className="min-w-0 flex-1">
            <AccordionTrigger className="gap-2 rounded-lg py-2 pr-2 font-normal hover:no-underline">
              <div className="min-w-0 flex-1 text-left">
                <p
                  className={cn(
                    'font-medium leading-snug break-words',
                    done && 'text-muted-foreground line-through decoration-muted-foreground/50'
                  )}
                >
                  {item.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {item.mandatory && (
                    <Badge variant="outline" className="h-6 border-destructive/30 text-[11px] text-destructive">
                      {t('Required')}
                    </Badge>
                  )}
                  <PriorityBadge priority={item.priority} />
                  {item.documentRequired && (
                    <Badge variant="outline" className="h-6 gap-1 text-[11px]">
                      <FileText className="h-3 w-3" />
                      {t('Document')}
                    </Badge>
                  )}
                  {item.deadline && <DeadlineChip date={item.deadline} showDate={false} />}
                  {status !== 'pending' && (
                    <span className={cn('text-[11px] font-medium', meta.iconClass)}>{t(meta.labelKey)}</span>
                  )}
                </div>
              </div>
            </AccordionTrigger>
          </div>
        </div>

        <AccordionContent className="px-3 pb-3 sm:pl-[3.75rem] sm:pr-4">
          <div className="space-y-4 border-t pt-4">
            <div>
              <h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                <Info className="h-4 w-4 text-primary" aria-hidden="true" />
                {t('Detailed Description')}
              </h4>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {item.detailedDescription}
              </p>
            </div>

            <DetailGrid>
              {item.deadline && (
                <DetailField icon={CalendarClock} label={t('Deadline')}>
                  {item.deadline}
                </DetailField>
              )}
              {item.legalBasis && (
                <DetailField icon={Scale} label={t('Legal Basis')}>
                  {item.legalBasis}
                </DetailField>
              )}
              {item.authority && (
                <DetailField icon={Building2} label={t('Responsible Authority')}>
                  {item.authority}
                </DetailField>
              )}
              {item.penalties && (
                <DetailField icon={AlertTriangle} label={t('Penalties')} tone="danger">
                  {item.penalties}
                </DetailField>
              )}
              {item.documentTypes && item.documentTypes.length > 0 && (
                <DetailField icon={FileText} label={t('Required Documents')}>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {item.documentTypes.map((doc) => (
                      <Badge key={doc} variant="outline" className="h-auto whitespace-normal text-xs">
                        {doc}
                      </Badge>
                    ))}
                  </div>
                </DetailField>
              )}
              {item.applicableProducts && item.applicableProducts.length > 0 && (
                <DetailField icon={Package} label={t('Affected Products')}>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {item.applicableProducts.map((product) => (
                      <Badge key={product} variant="secondary" className="h-auto whitespace-normal text-xs">
                        {product}
                      </Badge>
                    ))}
                  </div>
                </DetailField>
              )}
            </DetailGrid>

            {item.tips && item.tips.length > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/[0.05] p-3">
                <h5 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <HelpCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                  {t('Implementation Tips')}
                </h5>
                <ul className="space-y-1.5">
                  {item.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 break-words">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {item.links && item.links.length > 0 && (
              <div>
                <h5 className="mb-2 text-sm font-semibold">{t('Related Links')}</h5>
                <LinkPills links={item.links.map((l) => ({ label: l.title, url: l.url }))} />
              </div>
            )}
          </div>
        </AccordionContent>
      </div>
    </AccordionItem>
  );
}
