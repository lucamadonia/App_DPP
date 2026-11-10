import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2, Plus, RefreshCw, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconTile, type IconTileTone } from '@/components/ui/icon-tile';
import type { ComplianceMonthlyReport } from '@/types/compliance';
import { ReportStatusPill } from './hub-primitives';
import { dateLocaleFor, formatMonth } from './compliance-ui';

interface Props {
  kind: 'ear' | 'lucid';
  icon: LucideIcon;
  tone: IconTileTone;
  title: string;
  law: string;
  description: string;
  month: string;
  report?: ComplianceMonthlyReport;
  generating: boolean;
  onGenerate: () => void;
}

/** One card per register: what it is, last month's status, the one next action. */
export function ReportTypeCard({ kind, icon, tone, title, law, description, month, report, generating, onGenerate }: Props) {
  const { t, i18n } = useTranslation('compliance');
  const dateLocale = dateLocaleFor(i18n.language);
  const monthLabel = formatMonth(month, dateLocale);

  return (
    <Card className="group relative flex min-w-0 flex-col gap-4 overflow-hidden p-4 transition-shadow hover:shadow-md sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <IconTile icon={icon} tone={tone} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-base font-semibold">{title}</h3>
            <span className="text-xs font-medium text-muted-foreground">{law}</span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t('Reporting month')}</p>
          <p className="truncate text-sm font-semibold">{monthLabel}</p>
        </div>
        {report ? (
          <ReportStatusPill status={report.status} />
        ) : (
          <span className="text-xs text-muted-foreground">{t('Not created yet')}</span>
        )}
      </div>

      {report && (
        <dl className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 text-xs">
          <div className="min-w-0">
            <dt className="text-muted-foreground">{t('Shipments')}</dt>
            <dd className="font-semibold tabular-nums">{report.shipmentIds.length}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">{t('Reference')}</dt>
            <dd className="truncate font-mono font-semibold">{report.externalReference || '—'}</dd>
          </div>
        </dl>
      )}

      <div className="mt-auto flex flex-wrap gap-2">
        {report ? (
          <>
            <Button asChild className="min-h-11 flex-1 gap-1.5 sm:min-h-9 sm:flex-none">
              <Link to={`/compliance/reports/${kind}/${report.reportMonth.slice(0, 7)}`}>
                {t('Open report')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            {report.status === 'draft' && (
              <Button
                variant="outline"
                onClick={onGenerate}
                disabled={generating}
                className="min-h-11 gap-1.5 sm:min-h-9"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {t('Regenerate')}
              </Button>
            )}
          </>
        ) : (
          <Button onClick={onGenerate} disabled={generating} className="min-h-11 w-full gap-1.5 sm:min-h-9 sm:w-auto">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="truncate">{t('Create draft for {{month}}', { month: monthLabel })}</span>
          </Button>
        )}
      </div>
    </Card>
  );
}
