import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarRange, Loader2, Plus, Recycle, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { dateLocaleFor, formatMonth } from './compliance-ui';

interface Props {
  month: string; // YYYY-MM
  onMonthChange: (v: string) => void;
  generating: 'ear' | 'lucid' | null;
  onGenerate: (type: 'ear' | 'lucid') => void;
  onGenerateBoth: () => void;
}

export function CustomMonthReportCard({ month, onMonthChange, generating, onGenerate, onGenerateBoth }: Props) {
  const { t, i18n } = useTranslation('compliance');
  const id = useId();
  const monthLabel = month ? formatMonth(month, dateLocaleFor(i18n.language)) : '';

  return (
    <Card className="gap-4 p-4 sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <IconTile icon={CalendarRange} tone="muted" />
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{t('Report for another month')}</h3>
          <p className="text-sm text-muted-foreground">{t('If you want to aggregate retroactively or in advance.')}</p>
        </div>
      </div>
      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:items-end">
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{t('Month')}</label>
          <input
            id={id}
            type="month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-base text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:text-sm"
          />
        </div>
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 sm:flex sm:flex-wrap">
          <Button
            onClick={() => onGenerate('ear')}
            disabled={generating === 'ear' || !month}
            variant="outline"
            className="min-h-11 gap-1.5 sm:min-h-9"
          >
            <Zap className="h-4 w-4 text-primary" />
            {t('Create EAR')}
          </Button>
          <Button
            onClick={() => onGenerate('lucid')}
            disabled={generating === 'lucid' || !month}
            variant="outline"
            className="min-h-11 gap-1.5 sm:min-h-9"
          >
            <Recycle className="h-4 w-4 text-success" />
            {t('Create LUCID')}
          </Button>
          <Button
            onClick={onGenerateBoth}
            disabled={!!generating || !month}
            className="col-span-2 min-h-11 min-w-0 gap-1.5 sm:col-span-1 sm:min-h-9"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="truncate">{t('Create both for {{month}}', { month: monthLabel })}</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
