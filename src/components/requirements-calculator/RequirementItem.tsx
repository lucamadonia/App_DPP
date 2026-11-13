import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Coins,
  FileText,
  Lightbulb,
  Stamp,
} from 'lucide-react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import type { Requirement } from '@/data/requirements-database';
import { DeadlineChip } from '@/components/knowledge/DeadlineChip';
import { DetailField, DetailGrid, LinkPills } from '@/components/knowledge/DetailField';
import { PriorityBadge } from '@/components/knowledge/PriorityBadge';

interface RequirementItemProps {
  req: Requirement;
  /** AI deep-analysis controls, rendered at the bottom of the expanded item. */
  aiSlot?: ReactNode;
}

export function RequirementItem({ req, aiSlot }: RequirementItemProps) {
  const { t } = useTranslation('compliance');

  return (
    <AccordionItem value={req.id} className="group border-0">
      <div className="rounded-xl border bg-card transition-colors duration-200 hover:border-primary/25 group-data-[state=open]:border-primary/30 group-data-[state=open]:shadow-sm">
        <AccordionTrigger className="gap-3 px-3 py-3 font-normal hover:no-underline sm:px-4">
          <div className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-1.5">
              <PriorityBadge priority={req.priority} />
              {req.category && (
                <Badge variant="outline" className="h-6 text-[11px] font-normal">
                  {req.category}
                </Badge>
              )}
              <DeadlineChip date={req.deadlines} showDate={false} />
            </div>
            <p className="mt-1.5 font-semibold leading-snug break-words">{req.name}</p>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{req.description}</p>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-3 pb-4 sm:px-4">
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm leading-relaxed text-pretty">{req.detailedDescription}</p>

            <DetailGrid>
              {req.documents.length > 0 && (
                <DetailField icon={FileText} label={t('Required Documents')}>
                  <ul className="space-y-1">
                    {req.documents.map((doc) => (
                      <li key={doc} className="flex items-start gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        <span className="min-w-0 break-words">{doc}</span>
                      </li>
                    ))}
                  </ul>
                </DetailField>
              )}
              {req.registrations.length > 0 && (
                <DetailField icon={Building2} label={t('Registrations')}>
                  <ul className="space-y-1">
                    {req.registrations.map((reg) => (
                      <li key={reg} className="flex items-start gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        <span className="min-w-0 break-words">{reg}</span>
                      </li>
                    ))}
                  </ul>
                </DetailField>
              )}
              {req.symbols.length > 0 && (
                <DetailField icon={Stamp} label={t('Required Symbols')}>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {req.symbols.map((sym) => (
                      <Badge key={sym} variant="outline" className="h-auto whitespace-normal text-xs">
                        {sym}
                      </Badge>
                    ))}
                  </div>
                </DetailField>
              )}
              {req.deadlines && (
                <DetailField icon={CalendarClock} label={t('Deadline')}>
                  <span className="block">{req.deadlines}</span>
                  <DeadlineChip date={req.deadlines} className="mt-1.5" />
                </DetailField>
              )}
              {req.costs && (
                <DetailField icon={Coins} label={t('Cost Estimate')}>
                  {req.costs}
                </DetailField>
              )}
              {req.authority && (
                <DetailField icon={Building2} label={t('Responsible Authority')}>
                  {req.authority}
                </DetailField>
              )}
              {req.penalties && (
                <DetailField icon={AlertTriangle} label={t('Penalties for Non-Compliance')} tone="danger">
                  {req.penalties}
                </DetailField>
              )}
            </DetailGrid>

            {req.tips.length > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/[0.05] p-3">
                <h5 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Lightbulb className="h-4 w-4 text-primary" aria-hidden="true" />
                  {t('Tips')}
                </h5>
                <ul className="space-y-1.5">
                  {req.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                      <span className="min-w-0 break-words">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {req.links && req.links.length > 0 && (
              <LinkPills links={req.links.map((l) => ({ label: l.title, url: l.url }))} />
            )}

            {aiSlot}
          </div>
        </AccordionContent>
      </div>
    </AccordionItem>
  );
}
