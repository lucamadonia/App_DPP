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
  ExternalLink,
  Scale,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { cn } from '@/lib/utils';
import {
  MARKET_ENTRY_TYPE_ORDER,
  type MarketEntryRequirement,
  type MarketEntryRequirementType,
  type MarketEntryResult,
  type MarketEntryPriority,
} from '@/services/supabase';

const TYPE_META: Record<
  MarketEntryRequirementType,
  { labelKey: string; icon: React.ComponentType<{ className?: string }> }
> = {
  registration: { labelKey: 'Registration', icon: ClipboardCheck },
  labeling: { labelKey: 'Labeling', icon: Tag },
  language: { labelKey: 'Language', icon: Languages },
  packaging: { labelKey: 'Packaging', icon: Package },
  disposal: { labelKey: 'Disposal', icon: Recycle },
  standards: { labelKey: 'Standards', icon: ShieldCheck },
  tax: { labelKey: 'Taxes & Fees', icon: Percent },
};

const PRIORITY_META: Record<MarketEntryPriority, { labelKey: string; className: string }> = {
  critical: {
    labelKey: 'Critical',
    className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  },
  high: {
    labelKey: 'High',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400',
  },
  medium: {
    labelKey: 'Medium',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  },
  low: {
    labelKey: 'Low',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
  },
};

function RequirementDetail({ requirement }: { requirement: MarketEntryRequirement }) {
  const { t } = useTranslation('compliance');

  return (
    <div className="space-y-4 pt-1">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {requirement.description}
      </p>

      {requirement.applicableRegulations.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Scale className="h-3.5 w-3.5 text-muted-foreground" />
          {requirement.applicableRegulations.map((reg) => (
            <Badge key={reg} variant="outline" className="text-[10px] font-normal">
              {reg}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {requirement.authority && (
          <div className="flex items-start gap-2 text-sm">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="block text-xs text-muted-foreground">
                {t('Responsible Authority')}
              </span>
              {requirement.authority}
            </span>
          </div>
        )}
        {requirement.deadlineNote && (
          <div className="flex items-start gap-2 text-sm">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="block text-xs text-muted-foreground">{t('Deadline')}</span>
              {requirement.deadlineNote}
            </span>
          </div>
        )}
        {requirement.costEstimate && (
          <div className="flex items-start gap-2 text-sm">
            <Euro className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="block text-xs text-muted-foreground">{t('Cost Estimate')}</span>
              {requirement.costEstimate}
            </span>
          </div>
        )}
        {requirement.penaltiesSummary && (
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <span>
              <span className="block text-xs text-muted-foreground">{t('Penalties')}</span>
              {requirement.penaltiesSummary}
            </span>
          </div>
        )}
      </div>

      {requirement.implementationSteps.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('Implementation Steps')}
          </p>
          <ol className="space-y-1.5">
            {requirement.implementationSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {requirement.links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {requirement.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-primary transition-colors hover:bg-primary/5"
            >
              <ExternalLink className="h-3 w-3" />
              {link.label}
            </a>
          ))}
        </div>
      )}
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
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <ShimmerSkeleton key={i} className="h-16 rounded-xl" />
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
        const ItemWrapper = prefersReduced ? 'div' : motion.div;
        const itemProps = prefersReduced ? {} : { variants: gridItem };

        return (
          <ItemWrapper key={type} {...itemProps}>
            <div className="rounded-xl border bg-card">
              <div className="flex items-center gap-2.5 border-b px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <meta.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold">{t(meta.labelKey)}</h3>
                <Badge variant="secondary" className="ml-auto tabular-nums">
                  {requirements.length}
                </Badge>
              </div>
              <Accordion type="multiple" className="px-4">
                {requirements.map((req) => {
                  const priority = PRIORITY_META[req.priority];
                  return (
                    <AccordionItem key={req.id} value={req.id} className="last:border-b-0">
                      <AccordionTrigger className="min-h-[44px] gap-3 py-3 text-left hover:no-underline">
                        <span className="flex flex-1 flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{req.title}</span>
                          <Badge
                            className={cn(
                              'h-5 px-1.5 text-[10px] hover:bg-current/10',
                              priority.className
                            )}
                          >
                            {t(priority.labelKey)}
                          </Badge>
                          {req.mandatory ? (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                              {t('Mandatory')}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="h-5 px-1.5 text-[10px] text-muted-foreground"
                            >
                              {t('Recommended')}
                            </Badge>
                          )}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <RequirementDetail requirement={req} />
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </ItemWrapper>
        );
      })}
    </GridWrapper>
  );
}
