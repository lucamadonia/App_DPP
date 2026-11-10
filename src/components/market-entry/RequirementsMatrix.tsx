import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { gridStagger, gridItem, useReducedMotion } from '@/lib/motion';
import {
  ClipboardCheck,
  Tag,
  Languages,
  Package,
  Recycle,
  ShieldCheck,
  Percent,
  Building2,
  Clock,
  AlertTriangle,
  Euro,
  Scale,
  type LucideIcon,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { IconTile } from '@/components/ui/icon-tile';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { DeadlineChip } from '@/components/knowledge/DeadlineChip';
import { DetailField, DetailGrid, LinkPills } from '@/components/knowledge/DetailField';
import { PriorityBadge } from '@/components/knowledge/PriorityBadge';
import {
  MARKET_ENTRY_TYPE_ORDER,
  type MarketEntryRequirement,
  type MarketEntryRequirementType,
  type MarketEntryResult,
} from '@/services/supabase';

const TYPE_META: Record<MarketEntryRequirementType, { labelKey: string; icon: LucideIcon }> = {
  registration: { labelKey: 'Registration', icon: ClipboardCheck },
  labeling: { labelKey: 'Labeling', icon: Tag },
  language: { labelKey: 'Language', icon: Languages },
  packaging: { labelKey: 'Packaging', icon: Package },
  disposal: { labelKey: 'Disposal', icon: Recycle },
  standards: { labelKey: 'Standards', icon: ShieldCheck },
  tax: { labelKey: 'Taxes & Fees', icon: Percent },
};

function RequirementDetail({ requirement }: { requirement: MarketEntryRequirement }) {
  const { t } = useTranslation('compliance');

  return (
    <div className="space-y-4 pt-1">
      <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
        {requirement.description}
      </p>

      {requirement.applicableRegulations.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Scale className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          {requirement.applicableRegulations.map((reg) => (
            <Badge key={reg} variant="outline" className="h-auto whitespace-normal text-[11px] font-normal">
              {reg}
            </Badge>
          ))}
        </div>
      )}

      <DetailGrid>
        {requirement.authority && (
          <DetailField icon={Building2} label={t('Responsible Authority')}>
            {requirement.authority}
          </DetailField>
        )}
        {requirement.deadlineNote && (
          <DetailField icon={Clock} label={t('Deadline')}>
            <span className="block">{requirement.deadlineNote}</span>
            <DeadlineChip date={requirement.deadlineNote} className="mt-1.5" />
          </DetailField>
        )}
        {requirement.costEstimate && (
          <DetailField icon={Euro} label={t('Cost Estimate')}>
            {requirement.costEstimate}
          </DetailField>
        )}
        {requirement.penaltiesSummary && (
          <DetailField icon={AlertTriangle} label={t('Penalties')} tone="danger">
            {requirement.penaltiesSummary}
          </DetailField>
        )}
      </DetailGrid>

      {requirement.implementationSteps.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('Implementation Steps')}
          </p>
          <ol className="relative space-y-2 before:absolute before:bottom-3 before:left-[11px] before:top-3 before:w-px before:bg-border">
            {requirement.implementationSteps.map((step, i) => (
              <li key={i} className="relative flex items-start gap-3 text-sm">
                <span className="relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="min-w-0 pt-0.5 break-words">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <LinkPills links={requirement.links} />
    </div>
  );
}

interface RequirementsMatrixProps {
  result: MarketEntryResult | null;
  loading: boolean;
}

export function RequirementsMatrix({ result, loading }: RequirementsMatrixProps) {
  const { t } = useTranslation('compliance');
  const prefersReduced = useReducedMotion();

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <ShimmerSkeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!result || result.requirements.length === 0) return null;

  const GridWrapper = prefersReduced ? 'div' : motion.div;
  const gridProps = prefersReduced
    ? {}
    : { variants: gridStagger, initial: 'initial', animate: 'animate' };

  return (
    <GridWrapper {...gridProps} className="space-y-4">
      {MARKET_ENTRY_TYPE_ORDER.map((type) => {
        const requirements = result.grouped[type];
        if (!requirements || requirements.length === 0) return null;

        const meta = TYPE_META[type];
        const criticalCount = requirements.filter((r) => r.priority === 'critical').length;
        const ItemWrapper = prefersReduced ? 'div' : motion.div;
        const itemProps = prefersReduced ? {} : { variants: gridItem };

        return (
          <ItemWrapper key={type} {...itemProps}>
            <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="flex items-center gap-3 border-b bg-muted/30 px-3 py-3 sm:px-4">
                <IconTile icon={meta.icon} size="sm" tone={criticalCount > 0 ? 'danger' : 'primary'} />
                <h3 className="min-w-0 flex-1 font-semibold leading-snug">{t(meta.labelKey)}</h3>
                {criticalCount > 0 && (
                  <span className="hidden shrink-0 text-xs font-medium text-destructive xs:inline">
                    {t('{{count}} critical', { count: criticalCount })}
                  </span>
                )}
                <Badge variant="secondary" className="shrink-0 tabular-nums">
                  {requirements.length}
                </Badge>
              </div>
              <Accordion type="multiple" className="px-3 sm:px-4">
                {requirements.map((req) => (
                  <AccordionItem key={req.id} value={req.id} className="last:border-b-0">
                    <AccordionTrigger className="min-h-11 gap-3 py-3 text-left hover:no-underline">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug break-words">{req.title}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <PriorityBadge priority={req.priority} />
                          {req.mandatory ? (
                            <Badge variant="outline" className="h-6 text-[11px]">
                              {t('Mandatory')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="h-6 text-[11px] text-muted-foreground">
                              {t('Recommended')}
                            </Badge>
                          )}
                          <DeadlineChip date={req.deadlineNote} showDate={false} />
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <RequirementDetail requirement={req} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          </ItemWrapper>
        );
      })}
    </GridWrapper>
  );
}
