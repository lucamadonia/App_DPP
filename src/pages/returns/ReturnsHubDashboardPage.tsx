import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReturnKPICards } from '@/components/returns/ReturnKPICards';
import { ReturnCharts } from '@/components/returns/ReturnCharts';
import { ReturnStatusBadge } from '@/components/returns/ReturnStatusBadge';
import { getReturnStats, getReturns } from '@/services/supabase';
import type { ReturnsHubStats, RhReturn } from '@/types/returns-hub';

export function ReturnsHubDashboardPage() {
  const { t } = useTranslation('returns');
  const [stats, setStats] = useState<ReturnsHubStats | null>(null);
  const [recentReturns, setRecentReturns] = useState<RhReturn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [statsData, returnsData] = await Promise.all([
        getReturnStats(),
        getReturns(undefined, 1, 10),
      ]);
      setStats(statsData);
      setRecentReturns(returnsData.data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const emptyStats: ReturnsHubStats = {
    openReturns: 0, todayReceived: 0, avgProcessingDays: 0,
    returnRate: 0, refundVolume: 0, slaCompliance: 100, openTickets: 0,
    returnsByStatus: {} as any,
    returnsByReason: {},
    dailyReturns: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('Returns Hub')} — {t('Dashboard')}</h1>
        <p className="text-muted-foreground">{t('Overview of your return operations')}</p>
      </div>

      <ReturnKPICards stats={stats || emptyStats} />
      <ReturnCharts stats={stats || emptyStats} />

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
            <p className="text-sm text-muted-foreground text-center py-6">{t('No returns found')}</p>
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
                <tbody>
                  {recentReturns.map((ret) => (
                    <tr key={ret.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2">
                        <Link to={`/returns/${ret.id}`} className="text-primary hover:underline font-medium">
                          {ret.returnNumber}
                        </Link>
                      </td>
                      <td className="py-2">
                        <ReturnStatusBadge status={ret.status} />
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(ret.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2">{ret.reasonCategory || '—'}</td>
                      <td className="py-2 text-right font-medium">
                        {ret.refundAmount != null ? `€${ret.refundAmount.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
