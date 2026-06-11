import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { ModuleCard, MiniStat, MiniStatGrid } from './ModuleCard';
import { MiniBarRow } from './MiniTrendChart';
import { useFeedbackModuleStats } from '@/hooks/queries';

const RATING_COLORS: Record<number, string> = {
  5: 'bg-emerald-500',
  4: 'bg-emerald-400/70',
  3: 'bg-amber-400',
  2: 'bg-orange-400',
  1: 'bg-rose-500',
};

export function FeedbackModuleCard({ enabled, className }: { enabled: boolean; className?: string }) {
  const { t } = useTranslation('dashboard');
  const { data, isLoading, isError, refetch } = useFeedbackModuleStats(enabled);

  const segments = (data?.ratingDistribution ?? [])
    .slice()
    .sort((a, b) => b.rating - a.rating)
    .map((r) => ({
      value: r.count,
      className: RATING_COLORS[r.rating] ?? 'bg-muted-foreground',
      label: `${r.rating}★`,
    }));

  return (
    <ModuleCard
      title={t('Feedback')}
      icon={Star}
      to="/feedback/queue"
      accentClassName="text-emerald-400"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      className={className}
    >
      {data && (
        <div className="space-y-4">
          <MiniStatGrid className="grid-cols-3">
            <MiniStat
              label={t('Pending reviews')}
              value={data.pending}
              accentClassName={data.pending > 0 ? 'text-warning' : undefined}
            />
            <div className="min-w-0">
              <div className="flex items-baseline gap-1 text-xl font-bold tabular-nums tracking-tight sm:text-2xl">
                {data.averageRating != null ? data.averageRating.toFixed(1) : '–'}
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              </div>
              <p className="truncate text-xs text-muted-foreground">{t('Average rating')}</p>
            </div>
            <MiniStat label={t('Total reviews')} value={data.total} />
          </MiniStatGrid>
          <MiniBarRow segments={segments} />
        </div>
      )}
    </ModuleCard>
  );
}
