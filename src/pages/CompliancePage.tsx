import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Download,
  FileText,
  PlusCircle,
  Pencil,
  Trash2,
  Upload,
  Activity,
  type LucideIcon,
} from 'lucide-react';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { ErrorState, EmptyState } from '@/components/ui/state-feedback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getComplianceOverview,
  getComplianceScores,
  type ComplianceOverview,
  type ComplianceScore,
} from '@/services/supabase';
import { getActivityLog } from '@/services/supabase/activity-log';
import type { ActivityLogEntry } from '@/types/database';
import { PageContainer } from '@/components/layout/page-container';
import { ComplianceSubnav } from '@/components/compliance/hub/hub-primitives';
import { ComplianceOverviewHero } from '@/components/compliance/hub/ComplianceOverviewHero';
import { ComplianceWarningsPanel } from '@/components/compliance/hub/ComplianceWarningsPanel';
import { ComplianceScoreList } from '@/components/compliance/hub/ComplianceScoreList';
import { HubTimeline, DetailChips, type TimelineItem } from '@/components/compliance/hub/HubTimeline';
import type { HubTone } from '@/components/compliance/hub/compliance-ui';

function actionVisual(action: string): { icon: LucideIcon; tone: HubTone } {
  const a = action.toLowerCase();
  if (/(delete|remove|reject)/.test(a)) return { icon: Trash2, tone: 'danger' };
  if (/(create|add|insert|invite)/.test(a)) return { icon: PlusCircle, tone: 'success' };
  if (/(upload|import)/.test(a)) return { icon: Upload, tone: 'primary' };
  if (/(update|edit|change|save)/.test(a)) return { icon: Pencil, tone: 'warning' };
  return { icon: Activity, tone: 'muted' };
}

function CompliancePageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <ShimmerSkeleton className="h-8 w-48" />
        <ShimmerSkeleton className="h-4 w-72 max-w-full" />
      </div>
      <ShimmerSkeleton className="h-11 w-full max-w-md rounded-2xl" />
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <ShimmerSkeleton className="h-28 w-28 shrink-0 rounded-full" />
          <div className="grid flex-1 grid-cols-[repeat(3,minmax(0,1fr))] gap-3">
            {Array.from({ length: 3 }, (_, i) => <ShimmerSkeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        </div>
      </Card>
      <Card className="space-y-3 p-4 sm:p-5">
        {Array.from({ length: 4 }, (_, i) => <ShimmerSkeleton key={i} className="h-16 rounded-lg" />)}
      </Card>
    </div>
  );
}

export function CompliancePage() {
  const { t } = useTranslation('compliance');
  const { pathname } = useLocation();
  const [activeTab, setActiveTab] = useState(() => (pathname.endsWith('/audit-log') ? 'audit' : 'checklist'));
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [overview, setOverview] = useState<ComplianceOverview | null>(null);
  const [scores, setScores] = useState<ComplianceScore[]>([]);
  const [auditLog, setAuditLog] = useState<ActivityLogEntry[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [overviewData, scoresData, logData] = await Promise.all([
        getComplianceOverview(),
        getComplianceScores(),
        getActivityLog({ limit: 50 }),
      ]);
      setOverview(overviewData);
      setScores(scoresData);
      setAuditLog(logData);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (pathname.endsWith('/audit-log')) setActiveTab('audit');
  }, [pathname]);

  const timelineItems = useMemo<TimelineItem[]>(
    () =>
      auditLog.map((entry) => {
        const v = actionVisual(entry.action);
        return {
          id: entry.id,
          createdAt: entry.createdAt,
          icon: v.icon,
          tone: v.tone,
          title: entry.action,
          meta: (
            <span className="break-words">
              {entry.entityType}
              {(entry.actorName || entry.actorEmail) && <> · {entry.actorName || entry.actorEmail}</>}
            </span>
          ),
          body: <DetailChips details={entry.details} />,
        };
      }),
    [auditLog],
  );

  if (isLoading) return <CompliancePageSkeleton />;
  if (isError) return <ErrorState onRetry={loadData} />;

  const warnings = overview?.warnings ?? [];

  return (
    <PageContainer
      size="full"
      padding={false}
      onRefresh={loadData}
      title={t('Compliance & Audit')}
      description={t('Audit protocols and compliance overview')}
      actions={
        <>
          <Button variant="outline" className="min-h-11 sm:min-h-9">
            <Download className="mr-2 h-4 w-4" />
            {t('Export Report')}
          </Button>
          <Button className="min-h-11 sm:min-h-9">
            <FileText className="mr-2 h-4 w-4" />
            {t('EU-Registry Export')}
          </Button>
        </>
      }
    >
      <ComplianceSubnav />
      <div className="space-y-5 sm:space-y-6">
        <ComplianceOverviewHero overview={overview} />

        <ComplianceWarningsPanel warnings={warnings} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto w-full sm:w-auto">
            <TabsTrigger value="checklist" className="min-h-10 flex-1 sm:flex-none">
              <ShieldCheck className="mr-2 h-4 w-4" />
              {t('Audit Protocol')}
            </TabsTrigger>
            <TabsTrigger value="audit" className="min-h-10 flex-1 sm:flex-none">
              <FileText className="mr-2 h-4 w-4" />
              {t('Audit Log')}
              {auditLog.length > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">
                  {auditLog.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="mt-4">
            <ComplianceScoreList scores={scores} />
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <Card className="gap-0 p-4 sm:p-5">
              <div className="mb-4">
                <h2 className="text-base font-semibold">{t('Audit Log')}</h2>
                <p className="text-xs text-muted-foreground">{t('Complete log of all changes')}</p>
              </div>
              {timelineItems.length === 0 ? (
                <EmptyState icon={FileText} title={t('No audit entries available.')} />
              ) : (
                <HubTimeline items={timelineItems} />
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
