import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';

interface InfluencerKPICardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  format?: 'number' | 'currency' | 'percent';
  prefix?: string;
  isVisible: boolean;
}

export function InfluencerKPICard({
  label,
  value,
  icon: Icon,
  color,
  format = 'number',
  prefix,
  isVisible,
}: InfluencerKPICardProps) {
  const { t } = useTranslation('warehouse');
  const animated = useAnimatedNumber(value, { duration: 900 });

  function formatValue(v: number): string {
    if (format === 'currency') return `${prefix ?? '\u20AC'}${v.toLocaleString()}`;
    if (format === 'percent') return `${v.toFixed(1)}%`;
    return v.toLocaleString();
  }

  return (
    <Card
      className={`transition-all duration-500 hover:-translate-y-0.5 hover:shadow-md ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <CardContent className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-6">
        <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 text-${color}-600`} />
        </div>
        <div className="min-w-0">
          <p className="text-xl sm:text-2xl font-bold">{formatValue(animated)}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t(label)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
