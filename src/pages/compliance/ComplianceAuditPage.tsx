import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  CheckCircle2,
  FileDown,
  FileSpreadsheet,
  History,
  Lock,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { EmptyState } from '@/components/ui/state-feedback';
import { getAuditLog } from '@/services/supabase/compliance-audit';
import type { ComplianceAuditEntry } from '@/types/compliance';
import { PageContainer } from '@/components/layout/page-container';
import { cn } from '@/lib/utils';
import { ComplianceSubnav, ToneChip } from '@/components/compliance/hub/hub-primitives';
import { HubTimeline, DetailChips, type TimelineItem } from '@/components/compliance/hub/HubTimeline';
import type { HubTone } from '@/components/compliance/hub/compliance-ui';

const ACTIONS: Record<string, { label: string; tone: HubTone; icon: LucideIcon }> = {
  generated: { label: 'Generated', tone: 'primary', icon: Sparkles },
  regenerated: { label: 'Regenerated', tone: 'primary', icon: RefreshCw },
  submitted: { label: 'Submitted', tone: 'warning', icon: Send },
  confirmed: { label: 'Confirmed', tone: 'success', icon: CheckCircle2 },
  rejected: { label: 'Rejected', tone: 'danger', icon: XCircle },
  deleted: { label: 'Deleted', tone: 'muted', icon: Trash2 },
  exported_pdf: { label: 'PDF exported', tone: 'muted', icon: FileDown },
  exported_csv: { label: 'CSV exported', tone: 'muted', icon: FileDown },
};

const FALLBACK = { tone: 'muted' as HubTone, icon: Archive };

export function ComplianceAuditPage() {
  const { t } = useTranslation('compliance');
  const [entries, setEntries] = useState<ComplianceAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const load = useCallback(async () => {
    const e = await getAuditLog({ limit: 200 });
    setEntries(e);
    setLoading(false);
  }, []);

  useEffect(() => {
    getAuditLog({ limit: 200 }).then(e => { setEntries(e); setLoading(false); });
  }, []);

  const actionCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.action, (m.get(e.action) ?? 0) + 1);
    return m;
  }, [entries]);

  const items = useMemo<TimelineItem[]>(
    () =>
      entries
        .filter(e => filter === 'all' || e.action === filter)
        .map((e) => {
          const meta = ACTIONS[e.action];
          return {
            id: e.id,
            createdAt: e.createdAt,
            icon: meta?.icon ?? FALLBACK.icon,
            tone: meta?.tone ?? FALLBACK.tone,
            title: meta ? t(meta.label) : e.action,
            meta: e.reportId ? (
              <span className="inline-flex min-w-0 max-w-full items-center gap-1">
                <FileSpreadsheet className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate font-mono">{e.reportId}</span>
              </span>
            ) : undefined,
            body: <DetailChips details={e.details} />,
          };
        }),
    [entries, filter, t],
  );

  const filterOptions = [
    { id: 'all', label: t('All'), count: entries.length },
    ...Array.from(actionCounts, ([id, count]) => ({ id, label: ACTIONS[id] ? t(ACTIONS[id].label) : id, count })),
  ];

  return (
    <PageContainer
      size="full"
      padding={false}
      onRefresh={load}
      title={t('Compliance Audit Trail')}
      description={t('Complete history of all compliance report actions — append-only, retained for 10 years in line with HGB.')}
    >
      <ComplianceSubnav />
      <div className="space-y-4 sm:space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <ToneChip tone="success" icon={Lock}>{t('Append-only')}</ToneChip>
          <ToneChip tone="muted" icon={History}>{t('10-year retention')}</ToneChip>
          {!loading && <ToneChip tone="muted">{t('{{count}} entries', { count: entries.length })}</ToneChip>}
        </div>

        {loading ? (
          <Card className="space-y-3 p-4 sm:p-5" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <ShimmerSkeleton className="h-8 w-8 shrink-0 rounded-full" />
                <ShimmerSkeleton className="h-12 flex-1 rounded-lg" />
              </div>
            ))}
          </Card>
        ) : entries.length === 0 ? (
          <Card className="p-0">
            <EmptyState
              icon={History}
              illustration="reports"
              title={t('No actions logged yet')}
              description={t('As soon as you generate your first report, entries will appear here.')}
            >
              <Link
                to="/compliance/reports"
                className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t('Go to monthly reports')}
              </Link>
            </EmptyState>
          </Card>
        ) : (
          <Card className="gap-0 p-0">
            <div className="border-b p-3 sm:px-5">
              <div className="-mx-1 overflow-x-auto px-1 scrollbar-hide" role="radiogroup" aria-label={t('Filter by action')}>
                <div className="flex w-max gap-1.5">
                  {filterOptions.map((f) => {
                    const active = filter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setFilter(f.id)}
                        className={cn(
                          'inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-medium transition-colors sm:min-h-9',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        {f.label}
                        <span className="tabular-nums opacity-80">{f.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-3 sm:p-5">
              <HubTimeline items={items} />
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
