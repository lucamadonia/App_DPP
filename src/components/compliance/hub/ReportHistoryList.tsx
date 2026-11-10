import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, FileSpreadsheet, Recycle, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { EmptyState } from '@/components/ui/state-feedback';
import { staggerContainer, staggerItem, useReducedMotion } from '@/lib/motion';
import type { ComplianceMonthlyReport } from '@/types/compliance';
import { ReportStatusPill, ToneChip } from './hub-primitives';
import { dateLocaleFor, formatMonth } from './compliance-ui';

export function ReportHistoryList({ reports, loading }: { reports: ComplianceMonthlyReport[]; loading: boolean }) {
  const { t, i18n } = useTranslation('compliance');
  const dateLocale = dateLocaleFor(i18n.language);
  const prefersReduced = useReducedMotion();
  const List = prefersReduced ? 'ul' : motion.ul;
  const Row = prefersReduced ? 'li' : motion.li;

  if (loading) {
    return (
      <Card className="space-y-2 p-3" aria-busy="true">
        {Array.from({ length: 3 }, (_, i) => <ShimmerSkeleton key={i} className="h-16 w-full rounded-lg" />)}
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card className="p-0">
        <EmptyState
          icon={FileSpreadsheet}
          illustration="reports"
          title={t('No reports yet')}
          description={t('No reports yet. Create the first draft for the previous month using the cards above.')}
        />
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <List
        className="divide-y"
        {...(!prefersReduced && { variants: staggerContainer, initial: 'initial', animate: 'animate' })}
      >
        {reports.map((r) => {
          const isEar = r.reportType === 'ear';
          return (
            <Row key={r.id} {...(!prefersReduced && { variants: staggerItem })}>
              <Link
                to={`/compliance/reports/${r.reportType}/${r.reportMonth.slice(0, 7)}`}
                className="group flex min-h-16 min-w-0 items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:px-4"
              >
                <IconTile icon={isEar ? Zap : Recycle} tone={isEar ? 'primary' : 'success'} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold">{isEar ? 'EAR' : 'LUCID'}</span>
                    <span className="truncate text-sm text-muted-foreground">{formatMonth(r.reportMonth, dateLocale)}</span>
                    <ReportStatusPill status={r.status} />
                  </div>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground tabular-nums">
                    {r.shipmentIds.length > 0 && <span>{t('{{n}} shipments', { n: r.shipmentIds.length })}</span>}
                    {r.externalReference && (
                      <span className="min-w-0 max-w-full truncate font-mono">· {r.externalReference}</span>
                    )}
                    {r.confirmedAt && (
                      <ToneChip tone="success" icon={CheckCircle2}>
                        {new Date(r.confirmedAt).toLocaleDateString(dateLocale)}
                      </ToneChip>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </Row>
          );
        })}
      </List>
    </Card>
  );
}
