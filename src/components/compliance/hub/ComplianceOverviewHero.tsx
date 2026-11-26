import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Package, XCircle, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { IconTile, type IconTileTone } from '@/components/ui/icon-tile';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { gridItem, gridStagger, spring, useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { ComplianceOverview } from '@/services/supabase';
import { ScoreRing, ToneChip } from './hub-primitives';
import { scoreTone, TONE_FILL } from './compliance-ui';

interface Props {
  overview: ComplianceOverview | null;
}

/**
 * Hero band for /compliance: the overall rate as a radial gauge, the
 * compliant/pending/non-compliant split as one stacked bar, and three
 * tappable-sized stat tiles. Everything colours through tokens.
 */
export function ComplianceOverviewHero({ overview }: Props) {
  const { t } = useTranslation('compliance');
  const prefersReduced = useReducedMotion();
  const rate = Math.round(overview?.overallRate ?? 0);
  const compliant = overview?.compliant ?? 0;
  const pending = overview?.pending ?? 0;
  const nonCompliant = overview?.nonCompliant ?? 0;
  const total = overview?.totalProducts ?? compliant + pending + nonCompliant;
  const sum = Math.max(1, compliant + pending + nonCompliant);
  const tone = total === 0 ? 'muted' : scoreTone(rate);

  const verdict =
    total === 0
      ? t('No products assessed yet')
      : tone === 'success'
        ? t('Your portfolio is in good shape')
        : tone === 'warning'
          ? t('Some products need attention')
          : t('Action required on several products');

  const segments = [
    { key: 'compliant', value: compliant, fill: TONE_FILL.success },
    { key: 'pending', value: pending, fill: TONE_FILL.warning },
    { key: 'non', value: nonCompliant, fill: TONE_FILL.danger },
  ];

  const stats: Array<{ id: string; label: string; value: number; icon: LucideIcon; tone: IconTileTone; text: string }> = [
    { id: 'c', label: t('Compliant'), value: compliant, icon: CheckCircle2, tone: 'success', text: 'text-success' },
    { id: 'p', label: t('Pending'), value: pending, icon: Clock, tone: 'warning', text: 'text-warning' },
    { id: 'n', label: t('Non-Compliant'), value: nonCompliant, icon: XCircle, tone: 'danger', text: 'text-destructive' },
  ];

  const Grid = prefersReduced ? 'div' : motion.div;
  const Item = prefersReduced ? 'div' : motion.div;

  return (
    <Card className="relative overflow-hidden p-0">
      {/* Soft brand wash — token based so it follows every app style */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_60%)]"
      />
      <div className="relative grid min-w-0 gap-5 p-4 sm:p-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-8">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <ScoreRing value={rate} tone={tone} size={112} label={t('Compliance Rate') + `: ${rate}%`}>
            <span className="text-2xl font-bold tabular-nums leading-none sm:text-3xl">
              <AnimatedCounter value={rate} suffix="%" />
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {t('Rate')}
            </span>
          </ScoreRing>
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('Compliance Rate')}
            </p>
            <p className="text-lg font-semibold leading-snug text-balance sm:text-xl">{verdict}</p>
            <ToneChip tone="muted" icon={Package}>
              {t('{{count}} products assessed', { count: total })}
            </ToneChip>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          {/* Distribution bar */}
          <div>
            <div
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${t('Compliant')} ${compliant}, ${t('Pending')} ${pending}, ${t('Non-Compliant')} ${nonCompliant}`}
            >
              {segments.map((s) =>
                s.value > 0 ? (
                  prefersReduced ? (
                    <div key={s.key} className={cn('h-full', s.fill)} style={{ width: `${(s.value / sum) * 100}%` }} />
                  ) : (
                    <motion.div
                      key={s.key}
                      className={cn('h-full', s.fill)}
                      initial={{ width: 0 }}
                      animate={{ width: `${(s.value / sum) * 100}%` }}
                      transition={spring.gentle}
                    />
                  )
                ) : null,
              )}
            </div>
          </div>

          <Grid
            className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2 sm:gap-3"
            {...(!prefersReduced && { variants: gridStagger, initial: 'initial', animate: 'animate' })}
          >
            {stats.map((s) => (
              <Item
                key={s.id}
                className="min-w-0 rounded-xl border bg-background/60 p-2.5 sm:p-3"
                {...(!prefersReduced && { variants: gridItem })}
              >
                <div className="flex items-center gap-2">
                  <IconTile icon={s.icon} tone={s.tone} size="sm" className="hidden xs:inline-flex" />
                  <span className="min-w-0 truncate text-[11px] font-medium text-muted-foreground sm:text-xs">
                    {s.label}
                  </span>
                </div>
                <div className={cn('mt-1.5 text-xl font-bold tabular-nums sm:text-2xl', s.text)}>
                  <AnimatedCounter value={s.value} />
                </div>
              </Item>
            ))}
          </Grid>
        </div>
      </div>
    </Card>
  );
}
