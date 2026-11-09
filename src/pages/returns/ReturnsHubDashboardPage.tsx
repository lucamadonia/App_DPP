import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReturnKPICards } from '@/components/returns/ReturnKPICards';
import { ReturnCharts } from '@/components/returns/ReturnCharts';
import { ReturnStatusBadge } from '@/components/returns/ReturnStatusBadge';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { SkeletonKPICards } from '@/components/returns/SkeletonKPICards';
import { SkeletonTable } from '@/components/returns/SkeletonTable';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { EmptyState } from '@/components/returns/EmptyState';
import { ErrorState } from '@/components/ui/state-feedback';
import { relativeTime } from '@/lib/animations';
import { pageVariants, pageTransition, scrollRevealVariants, useReducedMotion } from '@/lib/motion';
import { getReturnStats, getReturns } from '@/services/supabase';
import { Package } from 'lucide-react';
import type { ReturnsHubStats, RhReturn } from '@/types/returns-hub';
import { PageContainer } from '@/components/layout/page-container';

export function ReturnsHubDashboardPage() {
  const { t, i18n } = useTranslation('returns');
  const navigate = useNavigate();
  const [stats, setStats] = useState<ReturnsHubStats | null>(null);
  const [recentReturns, setRecentReturns] = useState<RhReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [statsData, returnsData] = await Promise.all([
        getReturnStats(),
        getReturns(undefined, 1, 10),
      ]);
      setStats(statsData);
      setRecentReturns(returnsData.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const prefersReduced = useReducedMotion();

  const emptyStats: ReturnsHubStats = {
    openReturns: 0, todayReceived: 0, avgProcessingDays: 0,
    returnRate: 0, refundVolume: 0, slaCompliance: 100, openTickets: 0,
    returnsByStatus: {} as any,
    returnsByReason: {},
    dailyReturns: [],
  };

  const Wrapper = prefersReduced ? 'div' : motion.div;
  const wrapperProps = prefersReduced ? {} : { variants: pageVariants, initial: 'initial', animate: 'animate', transition: pageTransition };

  return (
    <Wrapper {...wrapperProps as any}>
      <PageContainer
        size="full"
        padding={false}
        onRefresh={load}
        title={<>{t('Returns Hub')} — {t('Dashboard')}</>}
        description={t('Overview of your return operations')}
      >
        <div className="space-y-6">

          {error ? (
            <ErrorState onRetry={load} />
          ) : loading ? (
            <>
              <SkeletonKPICards />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <ShimmerSkeleton className="h-32 rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">{t('Recent Returns')}</CardTitle></CardHeader>
                <CardContent><SkeletonTable rows={5} columns={5} /></CardContent>
              </Card>
            </>
          ) : (
            <>
              <ReturnKPICards stats={stats || emptyStats} />

              {prefersReduced ? (
                <ReturnCharts stats={stats || emptyStats} />
              ) : (
                <motion.div
                  variants={scrollRevealVariants}
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true, margin: '-60px' }}
                >
                  <ReturnCharts stats={stats || emptyStats} />
                </motion.div>
              )}

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t('Recent Returns')}</CardTitle>
                    <Link to="/returns/list" className="touch-hit text-sm text-primary hover:underline">
                      {t('View all')}
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentReturns.length === 0 ? (
                    <EmptyState
                      icon={Package}
                      title={t('No returns found')}
                      description={t('Get started by creating your first return')}
                      actionLabel={t('New Return')}
                      onAction={() => navigate('/returns/new')}
                    />
                  ) : (
                    <ResponsiveTable
                      data={recentReturns}
                      rowKey={(ret) => ret.id}
                      rowHref={(ret) => `/returns/${ret.id}`}
                      columns={[
                      {
                        id: 'number',
                        header: t('Return Number'),
                        mobilePriority: 'title',
                        cell: (ret) => <span className="text-primary font-medium break-all">{ret.returnNumber}</span>,
                      },
                      {
                        id: 'status',
                        header: t('Status'),
                        mobilePriority: 'badge',
                        cell: (ret) => <ReturnStatusBadge status={ret.status} />,
                      },
                      {
                        id: 'date',
                        header: t('Date'),
                        mobilePriority: 'subtitle',
                        cell: (ret) => <span className="text-muted-foreground text-xs">{relativeTime(ret.createdAt, i18n.language)}</span>,
                      },
                      {
                        id: 'reason',
                        header: t('Reason Category'),
                        hideBelow: 'lg',
                        mobilePriority: 'meta',
                        cell: (ret) => ret.reasonCategory || '—',
                      },
                      {
                        id: 'refund',
                        header: t('Refund Amount'),
                        className: 'text-right',
                        mobilePriority: 'meta',
                        cell: (ret) => (
                          <span className="font-medium tabular-nums">
                            {ret.refundAmount != null ? `\u20AC${ret.refundAmount.toFixed(2)}` : '\u2014'}
                          </span>
                        ),
                      },
                    ]}
                    />
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </PageContainer>
    </Wrapper>
  );
}
