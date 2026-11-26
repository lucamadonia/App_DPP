import { useTranslation } from 'react-i18next';
import { BookMarked, Building2, CheckCircle2, ExternalLink, FileText, Gavel, type LucideIcon } from 'lucide-react';
import type { EURegulation } from '@/types/database';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { Progress } from '@/components/ui/progress';
import { useLocale } from '@/hooks/use-locale';
import { Chip, DeadlineChip } from './DeadlineChip';
import { formatDeadline, humanizeKey, parseDeadline, progressBetween } from './regulation-dates';

interface EURegulationCardProps {
  regulation: EURegulation;
  icon: LucideIcon;
  categoryLabel: string;
}

export function EURegulationCard({ regulation: reg, icon, categoryLabel }: EURegulationCardProps) {
  const { t } = useTranslation('compliance');
  const locale = useLocale();

  const entry = parseDeadline(reg.effectiveDate);
  const application = parseDeadline(reg.applicationDate);
  const progress = progressBetween(entry.date, application.date);
  const deadlines = Object.entries(reg.dppDeadlines ?? {});

  return (
    <AccordionItem
      value={reg.id}
      className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm transition-[border-color,box-shadow] duration-200 last:border-b data-[state=open]:border-primary/30 data-[state=open]:shadow-md"
    >
      <AccordionTrigger className="min-h-11 gap-3 px-4 py-4 hover:no-underline sm:px-5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <IconTile icon={icon} size="md" tone={reg.status === 'upcoming' ? 'warning' : 'primary'} className="mt-0.5" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-semibold leading-snug break-words">{reg.name}</p>
              {reg.officialReference && (
                <span className="font-mono text-[11px] text-muted-foreground break-all">{reg.officialReference}</span>
              )}
            </div>
            <p className="line-clamp-2 text-sm font-normal text-muted-foreground">{reg.description}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip>{categoryLabel}</Chip>
              <DeadlineChip value={reg.applicationDate || reg.effectiveDate} />
              {deadlines.length > 0 && <Chip tone="primary">{t('{{count}} DPP deadlines', { count: deadlines.length })}</Chip>}
            </div>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="space-y-5 border-t bg-muted/20 px-4 pt-4 sm:px-5">
        {reg.fullName && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('Full Name')}</p>
            <p className="mt-1 text-sm leading-relaxed break-words">{reg.fullName}</p>
          </div>
        )}

        {/* Entry into force -> application, with how far along today is. */}
        <div className="rounded-xl border bg-card p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('Entered into Force')}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatDeadline(entry, locale) || '—'}</p>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-xs text-muted-foreground">{t('Application from')}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatDeadline(application, locale) || '—'}</p>
            </div>
          </div>
          {progress !== null && (
            <Progress value={progress} className="mt-3 h-1.5" aria-label={t('Transition period elapsed')} />
          )}
        </div>

        {reg.keyRequirements.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">{t('Key Requirements')}</p>
            <ul className="grid gap-2 md:grid-cols-2">
              {reg.keyRequirements.map((req, idx) => (
                <li key={idx} className="flex min-w-0 items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span className="min-w-0 break-words">{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {reg.affectedProducts.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">{t('Affected Product Categories')}</p>
            <div className="flex flex-wrap gap-1.5">
              {reg.affectedProducts.map((p) => (
                <Chip key={p}>{p}</Chip>
              ))}
            </div>
          </div>
        )}

        {(reg.penalties || reg.enforcementBody || reg.officialReference) && (
          <dl className="grid gap-3 md:grid-cols-3">
            {reg.penalties && (
              <Fact icon={Gavel} label={t('Penalties')} value={reg.penalties} danger />
            )}
            {reg.enforcementBody && <Fact icon={Building2} label={t('Enforcement Body')} value={reg.enforcementBody} />}
            {reg.officialReference && <Fact icon={BookMarked} label={t('Official Reference')} value={reg.officialReference} />}
          </dl>
        )}

        {deadlines.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">{t('DPP Deadlines')}</p>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {deadlines.map(([product, deadline]) => (
                <li key={product} className="flex min-w-0 flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 break-words">{humanizeKey(product)}</span>
                  </span>
                  <DeadlineChip value={String(deadline)} className="self-start sm:self-auto" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {reg.link && (
          <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-8">
            <a href={reg.link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              {t('Official source')}
            </a>
          </Button>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function Fact({ icon: Icon, label, value, danger }: { icon: LucideIcon; label: string; value: string; danger?: boolean }) {
  return (
    <div
      className={
        danger
          ? 'min-w-0 rounded-lg bg-destructive/5 p-3 ring-1 ring-inset ring-destructive/15'
          : 'min-w-0 rounded-lg bg-card p-3 ring-1 ring-inset ring-border'
      }
    >
      <dt className={`flex items-center gap-1.5 text-xs font-medium ${danger ? 'text-destructive' : 'text-muted-foreground'}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 text-sm break-words">{value}</dd>
    </div>
  );
}
