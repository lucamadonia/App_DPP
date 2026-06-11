import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  CheckCircle2,
  FileSpreadsheet,
  FileWarning,
  Inbox,
  PackageMinus,
  Star,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ModuleCard } from './ModuleCard';
import {
  useAgendaDeadlines,
  useReturnsModuleStats,
  useWarehouseModuleStats,
  useFeedbackModuleStats,
} from '@/hooks/queries';
import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';

function dueLabel(dateIso: string, t: (k: string, o?: Record<string, unknown>) => string): { label: string; tone: 'overdue' | 'soon' | 'normal' } {
  const due = new Date(dateIso);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.floor((due.getTime() - startOfToday.getTime()) / 86_400_000);
  if (days < 0) return { label: t('{{count}} days overdue', { count: Math.abs(days) }), tone: 'overdue' };
  if (days === 0) return { label: t('Due today'), tone: 'soon' };
  if (days === 1) return { label: t('Due tomorrow'), tone: 'soon' };
  if (days <= 7) return { label: t('Due in {{count}} days', { count: days }), tone: 'soon' };
  return { label: t('Due in {{count}} days', { count: days }), tone: 'normal' };
}

const TONE_CLASS: Record<'overdue' | 'soon' | 'normal', string> = {
  overdue: 'text-destructive',
  soon: 'text-warning',
  normal: 'text-muted-foreground',
};

interface DeadlineRowProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  dateIso: string;
  t: (k: string, o?: Record<string, unknown>) => string;
  locale: string;
}

function DeadlineRow({ to, icon, title, dateIso, t, locale }: DeadlineRowProps) {
  const { label, tone } = dueLabel(dateIso, t);
  const dateStr = new Date(dateIso).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/50"
    >
      <span className={cn('flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-md bg-muted text-[10px] font-semibold leading-tight', TONE_CLASS[tone])}>
        {dateStr.split(' ')[0]}
        <span className="text-[8px] uppercase">{dateStr.split(' ').slice(1).join(' ')}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate text-sm font-medium">
          {icon}
          <span className="truncate" title={title}>{title}</span>
        </span>
        <span className={cn('text-xs', TONE_CLASS[tone])}>{label}</span>
      </span>
    </Link>
  );
}

function TaskRow({ to, icon, label, count }: { to: string; icon: React.ReactNode; label: string; count: number }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50"
    >
      {icon}
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{label}</span>
      <Badge variant="secondary" className="shrink-0 tabular-nums">{count}</Badge>
    </Link>
  );
}

interface AgendaWidgetProps {
  hasReturns: boolean;
  hasWarehouse: boolean;
  hasFeedback: boolean;
  className?: string;
}

/** Upcoming deadlines (filings, expiring documents) + open task counts. */
export function AgendaWidget({ hasReturns, hasWarehouse, hasFeedback, className }: AgendaWidgetProps) {
  const { t } = useTranslation('dashboard');
  const locale = useLocale();
  const agenda = useAgendaDeadlines();
  // These share the react-query cache with the module cards — no extra fetches.
  const returns = useReturnsModuleStats(hasReturns);
  const warehouse = useWarehouseModuleStats(hasWarehouse);
  const feedback = useFeedbackModuleStats(hasFeedback);

  const monthLabel = (reportMonth: string) =>
    new Date(reportMonth + 'T00:00:00').toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
      month: 'long',
      year: 'numeric',
    });

  const overdueTickets = returns.data?.tickets.overdue ?? 0;
  const pendingReviews = feedback.data?.pending ?? 0;
  const lowStock = warehouse.data?.stock.lowStockAlerts ?? 0;
  const hasTasks = overdueTickets > 0 || pendingReviews > 0 || lowStock > 0;
  const hasDeadlines = (agenda.data?.filings.length ?? 0) > 0 || (agenda.data?.documents.length ?? 0) > 0;

  return (
    <ModuleCard
      title={t('Agenda & Tasks')}
      icon={CalendarClock}
      to="/compliance/reports"
      accentClassName="text-cyan-400"
      isLoading={agenda.isLoading}
      isError={agenda.isError}
      onRetry={() => agenda.refetch()}
      className={className}
    >
      <div className="space-y-3">
        {!hasDeadlines && !hasTasks ? (
          <div className="py-5 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-success/60" />
            <p className="mt-2 text-sm text-muted-foreground">
              {t('All caught up — nothing due')}
            </p>
          </div>
        ) : (
          <>
            {agenda.data?.filings.map((f) => (
              <DeadlineRow
                key={f.kind}
                to="/compliance/reports"
                icon={<FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-cyan-400" />}
                title={
                  f.kind === 'ear'
                    ? t('EAR report {{month}}', { month: monthLabel(f.reportMonth) })
                    : t('LUCID report {{month}}', { month: monthLabel(f.reportMonth) })
                }
                dateIso={f.dueDate}
                t={t}
                locale={locale}
              />
            ))}
            {agenda.data?.documents.map((d) => (
              <DeadlineRow
                key={d.id}
                to="/documents"
                icon={<FileWarning className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
                title={d.name}
                dateIso={d.validUntil}
                t={t}
                locale={locale}
              />
            ))}
            {hasTasks && (
              <div className="border-t pt-2">
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('Open tasks')}
                </p>
                {overdueTickets > 0 && (
                  <TaskRow
                    to="/returns/tickets"
                    icon={<Inbox className="h-3.5 w-3.5 shrink-0 text-rose-400" />}
                    label={t('Overdue tickets')}
                    count={overdueTickets}
                  />
                )}
                {pendingReviews > 0 && (
                  <TaskRow
                    to="/feedback/queue"
                    icon={<Star className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                    label={t('Pending reviews')}
                    count={pendingReviews}
                  />
                )}
                {lowStock > 0 && (
                  <TaskRow
                    to="/warehouse/inventory"
                    icon={<PackageMinus className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
                    label={t('Low stock alerts')}
                    count={lowStock}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </ModuleCard>
  );
}
