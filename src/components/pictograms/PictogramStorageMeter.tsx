import { useTranslation } from 'react-i18next';
import { HardDrive } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatBytes } from './pictogram-config';

interface PictogramStorageMeterProps {
  used: number;
  quota: number;
  className?: string;
}

/** Storage bar that turns amber at 80 % and red at the quota. */
export function PictogramStorageMeter({ used, quota, className }: PictogramStorageMeterProps) {
  const { t } = useTranslation('products');
  const percent = Math.min(100, (used / quota) * 100);
  const atLimit = percent >= 100;
  const warning = percent >= 80;

  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-muted-foreground">
          <HardDrive
            aria-hidden="true"
            className={cn('h-3.5 w-3.5 shrink-0', atLimit ? 'text-destructive' : warning && 'text-warning')}
          />
          <span className="truncate">{t('pictograms.storageUsed', 'Storage Used')}</span>
        </span>
        <span
          className={cn(
            'whitespace-nowrap font-medium tabular-nums',
            atLimit ? 'text-destructive' : warning ? 'text-warning' : 'text-foreground',
          )}
        >
          {formatBytes(used)} / {formatBytes(quota)}
        </span>
      </div>
      <Progress
        value={percent}
        aria-label={t('pictograms.storageUsed', 'Storage Used')}
        className={cn('h-1.5', atLimit && '[&>div]:bg-destructive', warning && !atLimit && '[&>div]:bg-warning')}
      />
    </div>
  );
}
