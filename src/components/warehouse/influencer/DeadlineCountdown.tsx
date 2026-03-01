import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

interface DeadlineCountdownProps {
  deadline: string;
  label?: string;
}

export function DeadlineCountdown({ deadline, label }: DeadlineCountdownProps) {
  const { t } = useTranslation('warehouse');

  const { days, colorClass } = useMemo(() => {
    const now = new Date();
    const dl = new Date(deadline);
    const diff = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let color: string;
    if (diff < 0) {
      color = 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    } else if (diff < 3) {
      color = 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200';
    } else if (diff < 7) {
      color = 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    } else {
      color = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }

    return { days: diff, colorClass: color };
  }, [deadline]);

  const text = days < 0
    ? t('overdue')
    : `${days} ${t('days')}`;

  return (
    <Badge variant="outline" className={`text-[11px] font-medium ${colorClass} border-0`}>
      {label && <span className="mr-1">{label}</span>}
      {text}
    </Badge>
  );
}
