import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Recycle, Zap } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getComplianceReports } from '@/services/supabase/compliance-reports';
import { generateEarReport } from '@/services/supabase/compliance-ear';
import { generateLucidReport } from '@/services/supabase/compliance-lucid';
import type { ComplianceMonthlyReport, ComplianceReportType } from '@/types/compliance';
import { previousMonthStart, daysUntilDeadline } from '@/types/compliance';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { ComplianceSubnav, SectionHeading } from '@/components/compliance/hub/hub-primitives';
import { ReportDeadlineHero } from '@/components/compliance/hub/ReportDeadlineHero';
import { ReportTypeCard } from '@/components/compliance/hub/ReportTypeCard';
import { CustomMonthReportCard } from '@/components/compliance/hub/CustomMonthReportCard';
import { ReportHistoryList } from '@/components/compliance/hub/ReportHistoryList';
import { dateLocaleFor, formatMonth as formatMonthIn } from '@/components/compliance/hub/compliance-ui';

export function ComplianceReportsPage() {
  const { t, i18n } = useTranslation('compliance');
  const dateLocale = dateLocaleFor(i18n.language);
  const formatMonth = (iso: string) => formatMonthIn(iso, dateLocale);

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
    // Load both registers once; the tab filters client-side so the
    // previous-month cards stay correct whichever tab is selected.
    const data = await getComplianceReports({ limit: 50 });
    setReports(data);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

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

  const earForPreviousMonth = reports.find(r => r.reportType === 'ear' && r.reportMonth === previousMonth);
  const lucidForPreviousMonth = reports.find(r => r.reportType === 'lucid' && r.reportMonth === previousMonth);

  const visibleReports = useMemo(
    () => (tab === 'all' ? reports : reports.filter(r => r.reportType === tab)),
    [reports, tab],
  );
  const counts = useMemo(() => ({
    all: reports.length,
    ear: reports.filter(r => r.reportType === 'ear').length,
    lucid: reports.filter(r => r.reportType === 'lucid').length,
  }), [reports]);

  return (
    <PageContainer
      size="full"
      padding={false}
      onRefresh={reload}
      title={t('Monthly Compliance Reports')}
      description={t('EAR (ElektroG) + LUCID (VerpackG) — due by the 15th of each month for the previous month.')}
    >
      <ComplianceSubnav />
      <div className="space-y-5 sm:space-y-6">
        <ReportDeadlineHero
          daysUntil={daysUntil}
          previousMonth={previousMonth}
          ear={earForPreviousMonth}
          lucid={lucidForPreviousMonth}
        />

        <div className="grid gap-3 sm:gap-4 md:grid-cols-[repeat(2,minmax(0,1fr))]">
          <ReportTypeCard
            kind="ear"
            icon={Zap}
            tone="primary"
            title="EAR"
            law="ElektroG"
            description={t('Monthly electrical equipment report to the Stiftung EAR')}
            month={previousMonth}
            report={earForPreviousMonth}
            generating={generating === 'ear'}
            onGenerate={() => handleGenerate('ear')}
          />
          <ReportTypeCard
            kind="lucid"
            icon={Recycle}
            tone="success"
            title="LUCID"
            law="VerpackG"
            description={t('Monthly packaging report to the ZSVR')}
            month={previousMonth}
            report={lucidForPreviousMonth}
            generating={generating === 'lucid'}
            onGenerate={() => handleGenerate('lucid')}
          />
        </div>

        <CustomMonthReportCard
          month={customMonth}
          onMonthChange={setCustomMonth}
          generating={generating}
          onGenerate={(type) => handleGenerate(type, `${customMonth}-01`)}
          onGenerateBoth={() => handleGenerateBoth(`${customMonth}-01`)}
        />

        <section className="space-y-3">
          <SectionHeading
            title={t('Report history')}
            hint={t('Newest first')}
            action={
              <Tabs value={tab} onValueChange={(v) => setTab(v as ComplianceReportType | 'all')}>
                <TabsList>
                  <TabsTrigger value="all" className="min-h-9 gap-1.5">
                    {t('All')} <span className="tabular-nums text-muted-foreground">{counts.all}</span>
                  </TabsTrigger>
                  <TabsTrigger value="ear" className="min-h-9 gap-1.5">
                    <Zap className="h-3.5 w-3.5" />EAR <span className="tabular-nums text-muted-foreground">{counts.ear}</span>
                  </TabsTrigger>
                  <TabsTrigger value="lucid" className="min-h-9 gap-1.5">
                    <Recycle className="h-3.5 w-3.5" />LUCID <span className="tabular-nums text-muted-foreground">{counts.lucid}</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            }
          />
          <ReportHistoryList reports={visibleReports} loading={loading} />
        </section>
      </div>
    </PageContainer>
  );
}
