/**
 * UsageBar — Reusable usage progress bar for billing quotas.
 *
 * Shows current/limit with a colored progress indicator.
 * Turns amber at 80%, red at 100%.
 */

import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UsageBarProps {
  label: string;
  current: number;
  limit: number;
  unit?: string;
  className?: string;
}

export function UsageBar({ label, current, limit, unit, className }: UsageBarProps) {
  const { t } = useTranslation('billing');
  const isUnlimited = !isFinite(limit);
  const percentage = isUnlimited ? 0 : Math.min(100, (current / limit) * 100);
  const isWarning = percentage >= 80 && percentage < 100;
  const isAtLimit = percentage >= 100;

  const displayLimit = isUnlimited ? t('Unlimited') : formatNumber(limit);
  const displayCurrent = formatNumber(current);

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          'font-medium tabular-nums',
          isAtLimit && 'text-destructive',
          isWarning && 'text-amber-600 dark:text-amber-400',
        )}>
          {displayCurrent} / {displayLimit}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <Progress
        value={isUnlimited ? 0 : percentage}
        className={cn(
          'h-2',
          isAtLimit && '[&>div]:bg-destructive',
          isWarning && '[&>div]:bg-amber-500',
        )}
      />
    </div>
  );
}

function formatNumber(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} GB`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)} MB`;
  return n.toLocaleString();
}
