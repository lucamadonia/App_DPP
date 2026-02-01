import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReturnKPICards } from '@/components/returns/ReturnKPICards';
import { ReturnCharts } from '@/components/returns/ReturnCharts';
import { SkeletonKPICards } from '@/components/returns/SkeletonKPICards';
import { EmptyState } from '@/components/returns/EmptyState';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import { getReturnStats, getReturns } from '@/services/supabase';
import type { ReturnsHubStats, RhReturn } from '@/types/returns-hub';

export function ReturnsReportsPage() {
  const { t } = useTranslation('returns');
  const [stats, setStats] = useState<ReturnsHubStats | null>(null);
  const [returns, setReturns] = useState<RhReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [s, r] = await Promise.all([
        getReturnStats(),
        getReturns(undefined, 1, 100),
      ]);
      setStats(s);
      setReturns(r.data);
      setLoading(false);
    }
    load();
  }, [dateRange]);

  const handleExportCSV = () => {
    if (!returns.length) return;
    const headers = ['Return Number', 'Status', 'Date', 'Reason', 'Desired Solution', 'Refund Amount'];
    const rows = returns.map(r => [
      r.returnNumber,
      r.status,
      new Date(r.createdAt).toLocaleDateString(),
      r.reasonCategory || '',
      r.desiredSolution || '',
      r.refundAmount?.toString() || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `returns-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const emptyStats: ReturnsHubStats = {
    openReturns: 0, todayReceived: 0, avgProcessingDays: 0,
    returnRate: 0, refundVolume: 0, slaCompliance: 100, openTickets: 0,
    returnsByStatus: {} as any,
    returnsByReason: {},
    dailyReturns: [],
  };

  const animRefundVolume = useAnimatedNumber(stats?.refundVolume ?? 0, { duration: 900, decimals: 2 });
  const refundsCount = returns.filter(r => r.refundAmount).length;
  const animRefundsProcessed = useAnimatedNumber(refundsCount, { duration: 800, delay: 100 });
  const avgRefund = refundsCount > 0 ? (stats?.refundVolume ?? 0) / refundsCount : 0;
  const animAvgRefund = useAnimatedNumber(avgRefund, { duration: 800, delay: 200, decimals: 2 });

  const reasonEntries = Object.entries(stats?.returnsByReason || {}).sort(([, a], [, b]) => b - a);
  const reasonVisibility = useStaggeredList(reasonEntries.length, { interval: 60, initialDelay: 100 });
  const refundCardVisibility = useStaggeredList(3, { interval: 80, initialDelay: 100 });

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('Reports')}</h1>
          <p className="text-muted-foreground">{t('Analytics and export')}</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t('Last 7 Days')}</SelectItem>
              <SelectItem value="30">{t('Last 30 Days')}</SelectItem>
              <SelectItem value="90">{t('Last 90 Days')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" /> {t('Export CSV')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('Returns Overview')}</TabsTrigger>
          <TabsTrigger value="reasons">{t('By Reason')}</TabsTrigger>
          <TabsTrigger value="refunds">{t('Refunds')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {loading ? (
            <>
              <SkeletonKPICards />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="pt-6 animate-pulse">
                      <div className="h-32 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <>
              <ReturnKPICards stats={stats || emptyStats} />
              <ReturnCharts stats={stats || emptyStats} />
            </>
          )}
        </TabsContent>

        <TabsContent value="reasons" className="mt-4">
          <Card className="animate-fade-in-up">
            <CardHeader><CardTitle className="text-base">{t('Return Reasons')}</CardTitle></CardHeader>
            <CardContent>
              {reasonEntries.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title={t('No data available')}
                  description={t('Return reason data will appear here')}
                />
              ) : (
                <div className="space-y-3">
                  {reasonEntries.map(([reason, count], i) => (
                    <div
                      key={reason}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                        reasonVisibility[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      }`}
                      style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out' }}
                    >
                      <span className="font-medium">{reason}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full animate-bar-grow"
                            style={{ width: `${(count / returns.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-16 text-right">{count} ({((count / returns.length) * 100).toFixed(0)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refunds" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { value: `\u20AC${animRefundVolume}`, label: t('Total Refunds') },
              { value: animRefundsProcessed, label: t('Refunds Processed') },
              { value: `\u20AC${animAvgRefund}`, label: t('Average Refund') },
            ].map((item, i) => (
              <Card
                key={item.label}
                className={`hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ${
                  refundCardVisibility[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
                style={{ transition: 'opacity 0.35s ease-out, transform 0.35s ease-out, box-shadow 0.2s ease' }}
              >
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
