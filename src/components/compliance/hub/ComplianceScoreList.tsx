import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, Clock, Search, ShieldCheck, XCircle, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { IconTile } from '@/components/ui/icon-tile';
import { EmptyState } from '@/components/ui/state-feedback';
import { staggerContainer, staggerItem, useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { ComplianceScore } from '@/services/supabase';
import { scoreStatus, scoreTone, TONE_FILL, TONE_TEXT, type ScoreStatus } from './compliance-ui';
import { ToneChip } from './hub-primitives';

type Filter = 'all' | ScoreStatus;

const STATUS_META: Record<ScoreStatus, { label: string; icon: LucideIcon; tone: 'success' | 'warning' | 'danger' }> = {
  compliant: { label: 'Compliant', icon: CheckCircle2, tone: 'success' },
  pending: { label: 'Pending', icon: Clock, tone: 'warning' },
  'non-compliant': { label: 'Non-Compliant', icon: XCircle, tone: 'danger' },
};

function SubScore({ label, value }: { label: string; value: number }) {
  const tone = scoreTone(value);
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-1 text-[11px]">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', TONE_FILL[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function ComplianceScoreList({ scores }: { scores: ComplianceScore[] }) {
  const { t } = useTranslation('compliance');
  const prefersReduced = useReducedMotion();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: scores.length, compliant: 0, pending: 0, 'non-compliant': 0 };
    for (const s of scores) c[scoreStatus(s.overallScore)] += 1;
    return c;
  }, [scores]);

  // Weakest first: the list exists to tell you what to fix.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scores
      .filter((s) => s.productName.toLowerCase().includes(q))
      .filter((s) => filter === 'all' || scoreStatus(s.overallScore) === filter)
      .sort((a, b) => a.overallScore - b.overallScore);
  }, [scores, query, filter]);

  const filters: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: t('All') },
    { id: 'non-compliant', label: t('Non-Compliant') },
    { id: 'pending', label: t('Pending') },
    { id: 'compliant', label: t('Compliant') },
  ];

  const List = prefersReduced ? 'ul' : motion.ul;
  const Row = prefersReduced ? 'li' : motion.li;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="space-y-3 border-b p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{t('Compliance Check')}</h2>
            <p className="text-xs text-muted-foreground">{t('Per-product score — weakest first.')}</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('Search...', { ns: 'common' })}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 pl-9 sm:h-9"
              aria-label={t('Search products')}
            />
          </div>
        </div>
        <div className="-mx-1 overflow-x-auto px-1 scrollbar-hide" role="radiogroup" aria-label={t('Filter by status')}>
          <div className="flex w-max gap-1.5">
            {filters.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors sm:min-h-9',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {f.label}
                  <span className={cn('tabular-nums', active ? 'opacity-80' : 'text-muted-foreground/80')}>
                    {counts[f.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={scores.length === 0 ? ShieldCheck : Search}
          title={scores.length === 0 ? t('No compliance data yet') : t('No matches')}
          description={
            scores.length === 0
              ? t('No compliance data available. Please create products first.')
              : t('No entries match your search.')
          }
        />
      ) : (
        <List
          className="divide-y"
          {...(!prefersReduced && { variants: staggerContainer, initial: 'initial', animate: 'animate' })}
        >
          {filtered.map((score) => {
            const status = scoreStatus(score.overallScore);
            const meta = STATUS_META[status];
            const tone = meta.tone;
            return (
              <Row key={score.productId} {...(!prefersReduced && { variants: staggerItem })}>
                <Link
                  to={`/products/${score.productId}`}
                  className="group grid min-w-0 gap-3 p-4 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:px-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_auto] lg:items-center lg:gap-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <IconTile icon={meta.icon} tone={tone} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{score.productName}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <ToneChip tone={tone}>{t(meta.label)}</ToneChip>
                        {score.warnings.length > 0 && (
                          <span className="text-[11px] text-muted-foreground">
                            {t('{{count}} warnings', { count: score.warnings.length })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-x-4 gap-y-2 sm:grid-cols-[repeat(4,minmax(0,1fr))]">
                    <SubScore label={t('Documents')} value={score.documentScore} />
                    <SubScore label={t('Checklists')} value={score.checklistScore} />
                    <SubScore label={t('Certificates')} value={score.certificateScore} />
                    <SubScore label={t('Registrations')} value={score.registrationScore} />
                  </div>
                  <div className="flex items-center justify-between gap-2 lg:justify-end">
                    <span className={cn('text-2xl font-bold tabular-nums', TONE_TEXT[tone])}>
                      {score.overallScore}%
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </div>
                </Link>
              </Row>
            );
          })}
        </List>
      )}
    </Card>
  );
}
