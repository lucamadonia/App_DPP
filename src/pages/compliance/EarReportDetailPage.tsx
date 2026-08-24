import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Send, Zap, Battery, Package, RefreshCw, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/adaptive-dialog';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { ComplianceStatusBadge } from '@/components/compliance/ComplianceStatusBadge';
import { generateEarReport, getEarReportForMonth, submitEarReport } from '@/services/supabase/compliance-ear';
import { markReportConfirmed, markReportRejected, deleteComplianceReport } from '@/services/supabase/compliance-reports';
import { buildCsv, downloadCsv, timestampedFilename, type CsvColumn } from '@/lib/csv-export';
import { generateEarPDF } from '@/components/compliance/ComplianceReportPDFs';
import { getCurrentTenant } from '@/services/supabase/tenants';
import type { ComplianceMonthlyReport, EarSnapshot, EarAggregateRow, EarCategory } from '@/types/compliance';
import { EAR_CATEGORY_NAMES_DE } from '@/types/compliance';
import { toast } from 'sonner';

function fmtKg(g: number): string {
  return (g / 1000).toFixed(3).replace('.', ',');
}

/**
 * One line of the category breakdown, flattened so it can go through
 * ResponsiveTable (real table on md+, one card per line below).
 *
 * `empty` stands in for a category with no data, `total` for the Gesamt line —
 * both were `colSpan` rows in the old raw <Table>. Blank cells reproduce the
 * span exactly on desktop, since the table draws no vertical rules.
 */
type EarBreakdownRow =
  | { kind: 'data'; key: string; category: EarCategory; showName: boolean; row: EarAggregateRow }
  | { kind: 'empty'; key: string; category: EarCategory }
  | { kind: 'total'; key: string };

function buildEarBreakdownRows(snap: EarSnapshot): EarBreakdownRow[] {
  const out = ([1, 2, 3, 4, 5, 6] as EarCategory[]).flatMap<EarBreakdownRow>(category => {
    const rows = snap.rows.filter(r => r.category === category);
    if (rows.length === 0) {
      return [{ kind: 'empty', key: `${category}-empty`, category }];
    }
    return rows.map((row, i) => ({
      kind: 'data' as const,
      key: `${category}-${row.b2b}`,
      category,
      showName: i === 0,
      row,
    }));
  });
  out.push({ kind: 'total', key: '__total' });
  return out;
}

export function EarReportDetailPage() {
  const { yearMonth } = useParams<{ yearMonth: string }>();
  const navigate = useNavigate();
  // yearMonth comes in as "YYYY-MM"; build a Date string "YYYY-MM-01"
  const reportMonth = yearMonth ? `${yearMonth}-01` : '';

  const [report, setReport] = useState<ComplianceMonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [externalRef, setExternalRef] = useState('');

  async function reload() {
    setLoading(true);
    const r = await getEarReportForMonth(reportMonth);
    setReport(r);
    setLoading(false);
  }

  useEffect(() => {
    if (reportMonth) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportMonth]);

  async function handleGenerate() {
    setBusy('generate');
    const res = await generateEarReport(reportMonth);
    setBusy(null);
    if (!res.ok) {
      toast.error(res.error || 'Fehler');
      return;
    }
    toast.success('Bericht aktualisiert');
    reload();
  }

  async function handleSubmit() {
    if (!report || !externalRef.trim()) return;
    setBusy('submit');
    const res = await submitEarReport(report.id, externalRef.trim());
    setBusy(null);
    if (!res.ok) {
      toast.error(res.error || 'Fehler');
      return;
    }
    setSubmitOpen(false);
    toast.success('Als eingereicht markiert');
    reload();
  }

  async function handleConfirm() {
    if (!report) return;
    await markReportConfirmed(report.id);
    toast.success('Als bestätigt markiert');
    reload();
  }
  async function handleReject() {
    if (!report) return;
    await markReportRejected(report.id);
    toast.success('Als abgelehnt markiert');
    reload();
  }
  async function handleDelete() {
    if (!report) return;
    if (!confirm('Bericht endgültig löschen?')) return;
    await deleteComplianceReport(report.id);
    toast.success('Gelöscht');
    navigate('/compliance/reports');
  }

  async function handlePdf() {
    if (!report) return;
    setBusy('pdf');
    try {
      const tenant = await getCurrentTenant();
      await generateEarPDF(report, tenant?.name);
      toast.success('PDF heruntergeladen');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function handleCsv() {
    if (!report) return;
    const snap = report.summary as EarSnapshot;
    type Row = EarAggregateRow;
    const cols: CsvColumn<Row>[] = [
      { header: 'Kategorie', value: r => r.category },
      { header: 'Kategorie_Name', value: r => EAR_CATEGORY_NAMES_DE[r.category] },
      { header: 'B2B', value: r => (r.b2b ? 'true' : 'false') },
      { header: 'Stueckzahl', value: r => r.unitCount },
      { header: 'Gewicht_kg', value: r => fmtKg(r.totalWeightGrams) },
      { header: 'Stueck_mit_Batterie', value: r => r.unitsWithBattery },
      { header: 'Batterie_Gewicht_kg', value: r => fmtKg(r.batteryWeightGrams) },
      { header: 'Marke', value: () => snap.brand },
      { header: 'WEEE-Nummer', value: () => snap.weeeNumber },
      { header: 'Monat', value: () => reportMonth.slice(0, 7) },
    ];
    const csv = buildCsv(snap.rows, cols);
    downloadCsv(timestampedFilename(`ear-${reportMonth.slice(0, 7)}`), csv);
    toast.success('CSV heruntergeladen');
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <ShimmerSkeleton className="h-12 w-1/2" />
        <ShimmerSkeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/compliance/reports"><ArrowLeft className="mr-1 h-4 w-4" />Zurück</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Zap className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium">Noch kein EAR-Bericht für {reportMonth.slice(0, 7)}</p>
            <p className="text-sm text-muted-foreground">
              Erstelle einen Entwurf, um eine Aggregation der versendeten Elektrogeräte zu sehen.
            </p>
            <Button onClick={handleGenerate} disabled={busy === 'generate'}>
              {busy === 'generate' ? 'Wird erstellt…' : 'Entwurf jetzt erstellen'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const snap = report.summary as EarSnapshot;
  const editable = report.status === 'draft' || report.status === 'obsolete';

  const breakdownColumns: ResponsiveTableColumn<EarBreakdownRow>[] = [
    {
      id: 'category',
      header: 'Kategorie',
      mobilePriority: 'title',
      cell: r => {
        if (r.kind === 'total') return 'Gesamt';
        const muted = r.kind === 'empty' || !r.showName;
        return (
          <span className={muted ? 'text-muted-foreground' : undefined}>
            <span className="font-mono tabular-nums mr-2">{r.category}</span>
            {(r.kind === 'empty' || r.showName) && EAR_CATEGORY_NAMES_DE[r.category]}
          </span>
        );
      },
    },
    {
      id: 'market',
      header: 'Markt',
      mobilePriority: 'badge',
      cell: r => {
        if (r.kind === 'empty') return <span className="text-xs text-muted-foreground">—</span>;
        if (r.kind === 'total') return null;
        return (
          <Badge
            variant="outline"
            className={
              r.row.b2b
                ? 'bg-purple-50 text-purple-800 border-purple-300'
                : 'bg-blue-50 text-blue-800 border-blue-300'
            }
          >
            {r.row.b2b ? 'B2B' : 'B2C'}
          </Badge>
        );
      },
    },
    {
      id: 'units',
      header: 'Stück',
      className: 'text-right',
      mobilePriority: 'meta',
      mobileLabel: 'Stück',
      cell: r => {
        if (r.kind === 'empty') return null;
        const v = r.kind === 'total' ? snap.totalUnits : r.row.unitCount;
        return <span className="tabular-nums font-semibold">{v}</span>;
      },
    },
    {
      id: 'kg',
      header: 'kg',
      className: 'text-right',
      mobilePriority: 'meta',
      mobileLabel: 'kg',
      cell: r => {
        if (r.kind === 'empty') return null;
        const v = r.kind === 'total' ? snap.totalWeightGrams : r.row.totalWeightGrams;
        return <span className="tabular-nums">{fmtKg(v)}</span>;
      },
    },
    {
      id: 'withBattery',
      header: 'mit Batterie',
      className: 'text-right',
      mobilePriority: 'meta',
      mobileLabel: 'mit Batterie',
      cell: r => {
        if (r.kind === 'empty') return null;
        const v = r.kind === 'total' ? snap.totalUnitsWithBattery : r.row.unitsWithBattery;
        return <span className="tabular-nums">{v}</span>;
      },
    },
    {
      id: 'batteryKg',
      header: 'Batterie kg',
      className: 'text-right',
      mobilePriority: 'meta',
      mobileLabel: 'Batterie kg',
      cell: r => {
        if (r.kind === 'empty') return null;
        const v = r.kind === 'total' ? snap.totalBatteryWeightGrams : r.row.batteryWeightGrams;
        return <span className="tabular-nums">{fmtKg(v)}</span>;
      },
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start gap-2 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/compliance/reports"><ArrowLeft className="mr-1 h-4 w-4" />Zurück</Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
            <Zap className="h-5 w-5 text-blue-600" />
            EAR-Bericht {reportMonth.slice(0, 7)}
            <ComplianceStatusBadge status={report.status} />
          </h1>
          <p className="text-sm text-muted-foreground">
            Generiert {new Date(report.generatedAt).toLocaleString('de-DE')}
            {report.submittedAt && <> · Eingereicht {new Date(report.submittedAt).toLocaleString('de-DE')}</>}
            {report.externalReference && <> · Ref: <span className="font-mono">{report.externalReference}</span></>}
          </p>
        </div>
      </div>

      {/* Header KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={<Package className="h-4 w-4" />} label="Geräte gesamt" value={snap.totalUnits.toString()} />
        <Kpi icon={<Package className="h-4 w-4" />} label="Gewicht gesamt" value={`${fmtKg(snap.totalWeightGrams)} kg`} />
        <Kpi icon={<Battery className="h-4 w-4" />} label="mit Batterie" value={snap.totalUnitsWithBattery.toString()} />
        <Kpi icon={<Battery className="h-4 w-4" />} label="Batterie-Gewicht" value={`${fmtKg(snap.totalBatteryWeightGrams)} kg`} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Aufschlüsselung nach Kategorie</CardTitle>
          <CardDescription>
            6 amtliche Stiftung-EAR-Kategorien × B2C / B2B.
            Marke: <strong>{snap.brand || '—'}</strong>. WEEE-Nr: <strong>{snap.weeeNumber || '—'}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ResponsiveTable
            data={buildEarBreakdownRows(snap)}
            columns={breakdownColumns}
            rowKey={r => r.key}
            className="border-0 bg-transparent rounded-none"
            rowClassName={r =>
              r.kind === 'total'
                ? 'border-t-2 font-bold bg-muted/30'
                : r.kind === 'empty'
                  ? 'text-muted-foreground'
                  : undefined
            }
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handlePdf} variant="outline" className="gap-1.5" disabled={busy === 'pdf'}>
          <Download className="h-4 w-4" /> {busy === 'pdf' ? 'PDF wird erstellt…' : 'PDF herunterladen'}
        </Button>
        <Button onClick={handleCsv} variant="outline" className="gap-1.5">
          <Download className="h-4 w-4" /> CSV herunterladen
        </Button>
        {editable && (
          <Button onClick={handleGenerate} variant="outline" className="gap-1.5" disabled={busy === 'generate'}>
            <RefreshCw className={`h-4 w-4 ${busy === 'generate' ? 'animate-spin' : ''}`} />
            Neu generieren
          </Button>
        )}
        {report.status === 'draft' && (
          <Button onClick={() => setSubmitOpen(true)} className="gap-1.5">
            <Send className="h-4 w-4" /> Als eingereicht markieren
          </Button>
        )}
        {report.status === 'submitted' && (
          <>
            <Button onClick={handleConfirm} className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Bestätigt durch EAR
            </Button>
            <Button onClick={handleReject} variant="outline" className="gap-1.5">
              <AlertCircle className="h-4 w-4" /> Abgelehnt durch EAR
            </Button>
          </>
        )}
        {editable && (
          <Button onClick={handleDelete} variant="ghost" className="gap-1.5 ml-auto text-muted-foreground">
            <Trash2 className="h-4 w-4" /> Löschen
          </Button>
        )}
      </div>

      {/* Submit Dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bericht als eingereicht markieren</DialogTitle>
            <DialogDescription>
              Gib die Bestätigungsnummer (AR-Nr.) ein, die du nach dem Upload im Stiftung-EAR-Portal erhalten hast.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Externe Referenz / AR-Nr.</label>
            <Input value={externalRef} onChange={e => setExternalRef(e.target.value)} placeholder="z. B. AR-2026-05-12345" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSubmit} disabled={!externalRef.trim() || busy === 'submit'}>
              <Send className="mr-1 h-4 w-4" /> Bestätigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
        <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
