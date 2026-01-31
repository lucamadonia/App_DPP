import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  FileText,
  Filter,
  Search,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getComplianceOverview,
  getComplianceScores,
  type ComplianceOverview,
  type ComplianceScore,
} from '@/services/supabase';
import { getActivityLog } from '@/services/supabase/activity-log';
import type { ActivityLogEntry } from '@/types/database';

const statusConfig = {
  compliant: {
    label: 'Compliant',
    icon: CheckCircle2,
    className: 'bg-success/10 text-success',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-warning/10 text-warning',
  },
  'non-compliant': {
    label: 'Non-Compliant',
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive',
  },
};

export function CompliancePage() {
  const { t } = useTranslation('compliance');
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<ComplianceOverview | null>(null);
  const [scores, setScores] = useState<ComplianceScore[]>([]);
  const [auditLog, setAuditLog] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [overviewData, scoresData, logData] = await Promise.all([
        getComplianceOverview(),
        getComplianceScores(),
        getActivityLog({ limit: 50 }),
      ]);
      setOverview(overviewData);
      setScores(scoresData);
      setAuditLog(logData);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const filteredScores = scores.filter(s =>
    s.productName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const complianceRate = overview?.overallRate ?? 0;
  const warnings = overview?.warnings ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('Compliance & Audit')}</h1>
          <p className="text-muted-foreground">
            {t('Audit protocols and compliance overview')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            {t('Export Report')}
          </Button>
          <Button>
            <FileText className="mr-2 h-4 w-4" />
            {t('EU-Registry Export')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('Compliance Rate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold">{complianceRate}%</div>
              <Progress value={complianceRate} className="flex-1 h-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('Compliant')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{overview?.compliant ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('Pending')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{overview?.pending ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('Non-Compliant')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overview?.nonCompliant ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Warnings Banner */}
      {warnings.length > 0 && (
        <Card className="border-warning">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-warning text-sm">
              <AlertTriangle className="h-4 w-4" />
              {t('Active Warnings')} ({warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {warnings.slice(0, 10).map((warning, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 text-sm ${
                  warning.severity === 'high' ? 'text-destructive' : 'text-warning'
                }`}
              >
                {warning.severity === 'high' ? (
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                )}
                <span>{warning.message}</span>
                {warning.dueDate && (
                  <Badge variant="outline" className="ml-auto">
                    {formatDate(warning.dueDate, locale)}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTrigger value="checklist">
            <ShieldCheck className="mr-2 h-4 w-4" />
            {t('Audit Protocol')}
          </TabsTrigger>
          <TabsTrigger value="audit">
            <FileText className="mr-2 h-4 w-4" />
            {t('Audit Log')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('Compliance Check')}</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t('Search...', { ns: 'common' })}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredScores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldCheck className="mx-auto h-12 w-12 opacity-30 mb-2" />
                  <p>
                    {scores.length === 0
                      ? t('No compliance data available. Please create products first.')
                      : t('No entries match your search.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredScores.map((score) => {
                    const status = score.overallScore >= 80 ? 'compliant'
                      : score.overallScore >= 50 ? 'pending'
                      : 'non-compliant';
                    const config = statusConfig[status];
                    return (
                      <div
                        key={score.productId}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.className}`}>
                            <config.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{score.productName}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>{t('Documents')}: {score.documentScore}%</span>
                              <span>{t('Checklists')}: {score.checklistScore}%</span>
                              <span>{t('Certificates')}: {score.certificateScore}%</span>
                              <span>{t('Registrations')}: {score.registrationScore}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold">{score.overallScore}%</p>
                          </div>
                          <Badge variant="outline" className={config.className}>
                            {t(config.label)}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('Audit Log')}</CardTitle>
              <CardDescription>
                {t('Complete log of all changes')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLog.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 opacity-30 mb-2" />
                  <p>{t('No audit entries available.')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {auditLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-4 p-4 rounded-lg border"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{entry.action}</p>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(entry.createdAt, locale)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {entry.entityType}
                          {entry.details && Object.keys(entry.details).length > 0 && (
                            <> · {JSON.stringify(entry.details).substring(0, 100)}</>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
