import { useEffect, useState } from 'react';
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

const MONTH_NAMES_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function formatMonth(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${MONTH_NAMES_DE[d.getMonth()]} ${d.getFullYear()}`;
}

export function ComplianceReportsPage() {
  const [tab, setTab] = useState<ComplianceReportType | 'all'>('all');
  const [reports, setReports] = useState<ComplianceMonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<'ear' | 'lucid' | null>(null);

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

  async function handleGenerate(type: 'ear' | 'lucid') {
    setGenerating(type);
    const res = type === 'ear'
      ? await generateEarReport(previousMonth)
      : await generateLucidReport(previousMonth);
    setGenerating(null);
    if (!res.ok) {
      toast.error(res.error || 'Fehler beim Erstellen');
      return;
    }
    toast.success(`${type.toUpperCase()}-Bericht für ${formatMonth(previousMonth)} erstellt`);
    reload();
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
          Compliance-Monatsberichte
        </h1>
        <p className="text-sm text-muted-foreground">
          EAR (ElektroG) + LUCID (VerpackG) — fällig bis zum 15. jedes Monats für den Vormonat.
        </p>
      </div>

      {/* Deadline-Alert */}
      {daysUntil <= 7 && daysUntil >= 0 && (
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0" />
            <div className="text-sm">
              <span className="font-medium">Meldefrist:</span>{' '}
              {daysUntil === 0
                ? <span className="text-amber-800 font-semibold">heute fällig!</span>
                : <span>noch <strong>{daysUntil} Tag{daysUntil === 1 ? '' : 'e'}</strong> bis zum 15.</span>
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
              <span className="font-semibold">Meldung überfällig</span> — Bußgelder bis zu 200.000 € möglich. Bitte umgehend einreichen.
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
            <CardDescription>Elektrogeräte-Monatsmeldung an die Stiftung EAR</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {earForPreviousMonth ? (
              <div className="flex flex-wrap items-center gap-2">
                <ComplianceStatusBadge status={earForPreviousMonth.status} />
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/compliance/reports/ear/${earForPreviousMonth.reportMonth.slice(0, 7)}`}>
                    Bericht öffnen
                  </Link>
                </Button>
                {earForPreviousMonth.status === 'draft' && (
                  <Button size="sm" onClick={() => handleGenerate('ear')} disabled={generating === 'ear'}>
                    {generating === 'ear' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Neu generieren'}
                  </Button>
                )}
              </div>
            ) : (
              <Button onClick={() => handleGenerate('ear')} disabled={generating === 'ear'} className="gap-1.5">
                {generating === 'ear' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Entwurf für {formatMonth(previousMonth)} erstellen
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
            <CardDescription>Verpackungs-Monatsmeldung an die ZSVR</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lucidForPreviousMonth ? (
              <div className="flex flex-wrap items-center gap-2">
                <ComplianceStatusBadge status={lucidForPreviousMonth.status} />
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/compliance/reports/lucid/${lucidForPreviousMonth.reportMonth.slice(0, 7)}`}>
                    Bericht öffnen
                  </Link>
                </Button>
                {lucidForPreviousMonth.status === 'draft' && (
                  <Button size="sm" onClick={() => handleGenerate('lucid')} disabled={generating === 'lucid'}>
                    {generating === 'lucid' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Neu generieren'}
                  </Button>
                )}
              </div>
            ) : (
              <Button onClick={() => handleGenerate('lucid')} disabled={generating === 'lucid'} className="gap-1.5">
                {generating === 'lucid' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Entwurf für {formatMonth(previousMonth)} erstellen
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Liste aller Berichte */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as ComplianceReportType | 'all')}>
        <TabsList>
          <TabsTrigger value="all">Alle</TabsTrigger>
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
                Noch keine Berichte. Erstelle den ersten Entwurf für den Vormonat über die Karten oben.
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
                      {r.shipmentIds.length > 0 && <span>{r.shipmentIds.length} Sendungen</span>}
                      {r.externalReference && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{r.externalReference}</span>
                        </>
                      )}
                      {r.confirmedAt && (
                        <Badge variant="outline" className="gap-1 text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          {new Date(r.confirmedAt).toLocaleDateString('de-DE')}
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
