import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReturnKPICards } from '@/components/returns/ReturnKPICards';
import { ReturnCharts } from '@/components/returns/ReturnCharts';
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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
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
          <ReturnKPICards stats={stats || emptyStats} />
          <ReturnCharts stats={stats || emptyStats} />
        </TabsContent>

        <TabsContent value="reasons" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{t('Return Reasons')}</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(stats?.returnsByReason || {}).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('No data available')}</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats!.returnsByReason)
                    .sort(([, a], [, b]) => b - a)
                    .map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between p-3 rounded-lg border">
                        <span className="font-medium">{reason}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${(count / returns.length) * 100}%` }} />
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
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold">{'\u20AC'}{(stats?.refundVolume || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                <p className="text-sm text-muted-foreground">{t('Total Refunds')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold">{returns.filter(r => r.refundAmount).length}</p>
                <p className="text-sm text-muted-foreground">{t('Refunds Processed')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold">
                  {'\u20AC'}{returns.filter(r => r.refundAmount).length > 0
                    ? ((stats?.refundVolume || 0) / returns.filter(r => r.refundAmount).length).toFixed(2)
                    : '0.00'}
                </p>
                <p className="text-sm text-muted-foreground">{t('Average Refund')}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
