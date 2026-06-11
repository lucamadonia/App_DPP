import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, Plus, Zap, Recycle, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { ComplianceStatusBadge } from '@/components/compliance/ComplianceStatusBadge';
import { getComplianceReports } from '@/services/supabase/compliance-reports';
import { generateEarReport } from '@/services/supabase/compliance-ear';
import { generateLucidReport } from '@/services/supabase/compliance-lucid';
import type { ComplianceMonthlyReport, ComplianceReportType } from '@/types/compliance';
import { previousMonthStart, daysUntilDeadline } from '@/types/compliance';
import { toast } from 'sonner';

export function ComplianceReportsPage() {
  const { t, i18n } = useTranslation('compliance');
  const dateLocale = i18n.language === 'de' ? 'de-DE' : 'en-US';

  function formatMonth(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' });
  }

  const [tab, setTab] = useState<ComplianceReportType | 'all'>('all');
  const [reports, setReports] = useState<ComplianceMonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<'ear' | 'lucid' | null>(null);
  const [customMonth, setCustomMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const previousMonth = previousMonthStart();
  const daysUntil = daysUntilDeadline();

  async function reload() {
    setLoading(true);
    const data = await getComplianceReports({
      reportType: tab === 'all' ? undefined : tab,
      limit: 50,
    });
    setReports(data);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleGenerate(type: 'ear' | 'lucid', month: string = previousMonth) {
    setGenerating(type);
    try {
      const res = type === 'ear'
        ? await generateEarReport(month)
        : await generateLucidReport(month);
      if (!res.ok) {
        toast.error(res.error || t('Error creating report'));
        return;
      }
      toast.success(t('{{type}} report for {{month}} created', { type: type.toUpperCase(), month: formatMonth(month) }));
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Error creating report'));
    } finally {
      setGenerating(null);
    }
  }

  async function handleGenerateBoth(month: string) {
    try {
      setGenerating('ear');
      const earRes = await generateEarReport(month);
      if (!earRes.ok) toast.error(`EAR: ${earRes.error || t('Error creating report')}`);
      setGenerating('lucid');
      const lucidRes = await generateLucidReport(month);
      if (!lucidRes.ok) toast.error(`LUCID: ${lucidRes.error || t('Error creating report')}`);
      if (earRes.ok && lucidRes.ok) toast.success(t('Both reports for {{month}} created', { month: formatMonth(month) }));
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Error creating report'));
    } finally {
      setGenerating(null);
    }
  }

  // Find existing reports for the previous month (for prominent cards at top)
  const earForPreviousMonth = reports.find(r => r.reportType === 'ear' && r.reportMonth === previousMonth);
  const lucidForPreviousMonth = reports.find(r => r.reportType === 'lucid' && r.reportMonth === previousMonth);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6" />
          {t('Monthly Compliance Reports')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('EAR (ElektroG) + LUCID (VerpackG) — due by the 15th of each month for the previous month.')}
        </p>
      </div>

      {/* Deadline-Alert */}
      {daysUntil <= 7 && daysUntil >= 0 && (
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0" />
            <div className="text-sm">
              <span className="font-medium">{t('Reporting deadline:')}</span>{' '}
              {daysUntil === 0
                ? <span className="text-amber-800 font-semibold">{t('due today!')}</span>
                : <strong>{daysUntil === 1 ? t('1 day remaining until the 15th') : t('{{days}} days remaining until the 15th', { days: daysUntil })}</strong>
              }
            </div>
          </CardContent>
        </Card>
      )}
      {daysUntil < 0 && (
        <Card className="border-red-300 bg-red-50/50 dark:bg-red-900/10">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-700 shrink-0" />
            <div className="text-sm text-red-800 dark:text-red-200">
              <span className="font-semibold">{t('Report overdue')}</span> — {t('Fines up to €200,000 possible. Please submit immediately.')}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vormonats-Quick-Action */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              EAR / ElektroG — {formatMonth(previousMonth)}
            </CardTitle>
            <CardDescription>{t('Monthly electrical equipment report to the Stiftung EAR')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {earForPreviousMonth ? (
              <div className="flex flex-wrap items-center gap-2">
                <ComplianceStatusBadge status={earForPreviousMonth.status} />
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/compliance/reports/ear/${earForPreviousMonth.reportMonth.slice(0, 7)}`}>
                    {t('Open report')}
                  </Link>
                </Button>
                {earForPreviousMonth.status === 'draft' && (
                  <Button size="sm" onClick={() => handleGenerate('ear')} disabled={generating === 'ear'}>
                    {generating === 'ear' ? <Loader2 className="h-3 w-3 animate-spin" /> : t('Regenerate')}
                  </Button>
                )}
              </div>
            ) : (
              <Button onClick={() => handleGenerate('ear')} disabled={generating === 'ear'} className="gap-1.5">
                {generating === 'ear' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {t('Create draft for {{month}}', { month: formatMonth(previousMonth) })}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Recycle className="h-4 w-4 text-emerald-600" />
              LUCID / VerpackG — {formatMonth(previousMonth)}
            </CardTitle>
            <CardDescription>{t('Monthly packaging report to the ZSVR')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lucidForPreviousMonth ? (
              <div className="flex flex-wrap items-center gap-2">
                <ComplianceStatusBadge status={lucidForPreviousMonth.status} />
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/compliance/reports/lucid/${lucidForPreviousMonth.reportMonth.slice(0, 7)}`}>
                    {t('Open report')}
                  </Link>
                </Button>
                {lucidForPreviousMonth.status === 'draft' && (
                  <Button size="sm" onClick={() => handleGenerate('lucid')} disabled={generating === 'lucid'}>
                    {generating === 'lucid' ? <Loader2 className="h-3 w-3 animate-spin" /> : t('Regenerate')}
                  </Button>
                )}
              </div>
            ) : (
              <Button onClick={() => handleGenerate('lucid')} disabled={generating === 'lucid'} className="gap-1.5">
                {generating === 'lucid' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {t('Create draft for {{month}}', { month: formatMonth(previousMonth) })}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Beliebigen Monat erstellen */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('Report for another month')}</CardTitle>
          <CardDescription>{t('If you want to aggregate retroactively or in advance.')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('Month')}</label>
            <input
              type="month"
              value={customMonth}
              onChange={(e) => setCustomMonth(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <Button
            onClick={() => handleGenerate('ear', `${customMonth}-01`)}
            disabled={generating === 'ear'}
            variant="outline"
            className="gap-1.5"
          >
            <Zap className="h-4 w-4 text-blue-600" />
            {t('Create EAR')}
          </Button>
          <Button
            onClick={() => handleGenerate('lucid', `${customMonth}-01`)}
            disabled={generating === 'lucid'}
            variant="outline"
            className="gap-1.5"
          >
            <Recycle className="h-4 w-4 text-emerald-600" />
            {t('Create LUCID')}
          </Button>
          <Button
            onClick={() => handleGenerateBoth(`${customMonth}-01`)}
            disabled={!!generating}
            className="gap-1.5"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t('Create both for {{month}}', { month: customMonth })}
          </Button>
        </CardContent>
      </Card>

      {/* Liste aller Berichte */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as ComplianceReportType | 'all')}>
        <TabsList>
          <TabsTrigger value="all">{t('All')}</TabsTrigger>
          <TabsTrigger value="ear" className="gap-1.5"><Zap className="h-3.5 w-3.5" />EAR</TabsTrigger>
          <TabsTrigger value="lucid" className="gap-1.5"><Recycle className="h-3.5 w-3.5" />LUCID</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-2">
          {loading ? (
            <>
              <ShimmerSkeleton className="h-16 w-full" />
              <ShimmerSkeleton className="h-16 w-full" />
            </>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                {t('No reports yet. Create the first draft for the previous month using the cards above.')}
              </CardContent>
            </Card>
          ) : (
            reports.map(r => {
              const url = `/compliance/reports/${r.reportType}/${r.reportMonth.slice(0, 7)}`;
              const isEar = r.reportType === 'ear';
              return (
                <Link
                  key={r.id}
                  to={url}
                  className="block rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      {isEar ? <Zap className="h-4 w-4 text-blue-600 shrink-0" /> : <Recycle className="h-4 w-4 text-emerald-600 shrink-0" />}
                      <div className="font-medium text-sm">
                        {isEar ? 'EAR' : 'LUCID'} · {formatMonth(r.reportMonth)}
                      </div>
                      <ComplianceStatusBadge status={r.status} />
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums flex flex-wrap gap-2">
                      {r.shipmentIds.length > 0 && <span>{t('{{n}} shipments', { n: r.shipmentIds.length })}</span>}
                      {r.externalReference && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{r.externalReference}</span>
                        </>
                      )}
                      {r.confirmedAt && (
                        <Badge variant="outline" className="gap-1 text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          {new Date(r.confirmedAt).toLocaleDateString(dateLocale)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
