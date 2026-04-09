import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReturnKPICards } from '@/components/returns/ReturnKPICards';
import { ReturnCharts } from '@/components/returns/ReturnCharts';
import { ReturnStatusBadge } from '@/components/returns/ReturnStatusBadge';
import { SkeletonKPICards } from '@/components/returns/SkeletonKPICards';
import { SkeletonTable } from '@/components/returns/SkeletonTable';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { EmptyState } from '@/components/returns/EmptyState';
import { ErrorState } from '@/components/ui/state-feedback';
import { relativeTime } from '@/lib/animations';
import { pageVariants, pageTransition, staggerContainer, staggerItem, scrollRevealVariants, useReducedMotion } from '@/lib/motion';
import { getReturnStats, getReturns } from '@/services/supabase';
import { Package } from 'lucide-react';
import type { ReturnsHubStats, RhReturn } from '@/types/returns-hub';

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
    <Wrapper className="space-y-6" {...wrapperProps as any}>
      <div>
        <h1 className="text-2xl font-bold">{t('Returns Hub')} — {t('Dashboard')}</h1>
        <p className="text-muted-foreground">{t('Overview of your return operations')}</p>
      </div>

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
                <Link to="/returns/list" className="text-sm text-primary hover:underline">
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">{t('Return Number')}</th>
                        <th className="pb-2 font-medium">{t('Status')}</th>
                        <th className="pb-2 font-medium">{t('Date')}</th>
                        <th className="pb-2 font-medium">{t('Reason Category')}</th>
                        <th className="pb-2 font-medium text-right">{t('Refund Amount')}</th>
                      </tr>
                    </thead>
                    {prefersReduced ? (
                      <tbody>
                        {recentReturns.map((ret) => (
                          <tr
                            key={ret.id}
                            className="border-b last:border-0 cursor-pointer group hover:bg-muted/50 transition-colors"
                            onClick={() => navigate(`/returns/${ret.id}`)}
                          >
                            <td className="py-2.5 relative">
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                              <span className="text-primary font-medium pl-2">{ret.returnNumber}</span>
                            </td>
                            <td className="py-2.5"><ReturnStatusBadge status={ret.status} /></td>
                            <td className="py-2.5 text-muted-foreground text-xs">
                              {relativeTime(ret.createdAt, i18n.language)}
                            </td>
                            <td className="py-2.5">{ret.reasonCategory || '—'}</td>
                            <td className="py-2.5 text-right font-medium">
                              {ret.refundAmount != null ? `\u20AC${ret.refundAmount.toFixed(2)}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    ) : (
                      <motion.tbody variants={staggerContainer} initial="initial" animate="animate">
                        {recentReturns.map((ret) => (
                          <motion.tr
                            key={ret.id}
                            variants={staggerItem}
                            className="border-b last:border-0 cursor-pointer group hover:bg-muted/50 transition-colors"
                            onClick={() => navigate(`/returns/${ret.id}`)}
                          >
                            <td className="py-2.5 relative">
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                              <span className="text-primary font-medium pl-2">{ret.returnNumber}</span>
                            </td>
                            <td className="py-2.5"><ReturnStatusBadge status={ret.status} /></td>
                            <td className="py-2.5 text-muted-foreground text-xs">
                              {relativeTime(ret.createdAt, i18n.language)}
                            </td>
                            <td className="py-2.5">{ret.reasonCategory || '—'}</td>
                            <td className="py-2.5 text-right font-medium">
                              {ret.refundAmount != null ? `\u20AC${ret.refundAmount.toFixed(2)}` : '—'}
                            </td>
                          </motion.tr>
                        ))}
                      </motion.tbody>
                    )}
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Wrapper>
  );
}
