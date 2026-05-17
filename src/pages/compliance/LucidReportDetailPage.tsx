import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Send, Recycle, Package, RefreshCw, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { ComplianceStatusBadge } from '@/components/compliance/ComplianceStatusBadge';
import { generateLucidReport, getLucidReportForMonth, submitLucidReport } from '@/services/supabase/compliance-lucid';
import { markReportConfirmed, markReportRejected, deleteComplianceReport } from '@/services/supabase/compliance-reports';
import { buildCsv, downloadCsv, timestampedFilename, type CsvColumn } from '@/lib/csv-export';
import type { ComplianceMonthlyReport, LucidSnapshot, LucidAggregateRow } from '@/types/compliance';
import { LUCID_MATERIAL_NAMES_DE, LUCID_MATERIAL_ORDER } from '@/types/compliance';
import { toast } from 'sonner';

function fmtKg(g: number): string {
  return (g / 1000).toFixed(3).replace('.', ',');
}

export function LucidReportDetailPage() {
  const { yearMonth } = useParams<{ yearMonth: string }>();
  const navigate = useNavigate();
  const reportMonth = yearMonth ? `${yearMonth}-01` : '';

  const [report, setReport] = useState<ComplianceMonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [externalRef, setExternalRef] = useState('');

  async function reload() {
    setLoading(true);
    const r = await getLucidReportForMonth(reportMonth);
    setReport(r);
    setLoading(false);
  }
  useEffect(() => { if (reportMonth) reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [reportMonth]);

  async function handleGenerate() {
    setBusy('generate');
    const res = await generateLucidReport(reportMonth);
    setBusy(null);
    if (!res.ok) { toast.error(res.error || 'Fehler'); return; }
    toast.success('Bericht aktualisiert');
    reload();
  }
  async function handleSubmit() {
    if (!report || !externalRef.trim()) return;
    setBusy('submit');
    const res = await submitLucidReport(report.id, externalRef.trim());
    setBusy(null);
    if (!res.ok) { toast.error(res.error || 'Fehler'); return; }
    setSubmitOpen(false);
    toast.success('Als eingereicht markiert');
    reload();
  }
  async function handleConfirm() { if (!report) return; await markReportConfirmed(report.id); toast.success('Als bestätigt markiert'); reload(); }
  async function handleReject() { if (!report) return; await markReportRejected(report.id); toast.success('Als abgelehnt markiert'); reload(); }
  async function handleDelete() {
    if (!report) return;
    if (!confirm('Bericht endgültig löschen?')) return;
    await deleteComplianceReport(report.id);
    toast.success('Gelöscht');
    navigate('/compliance/reports');
  }

  function handleCsv() {
    if (!report) return;
    const snap = report.summary as LucidSnapshot;
    type Row = LucidAggregateRow;
    const cols: CsvColumn<Row>[] = [
      { header: 'Material', value: r => LUCID_MATERIAL_NAMES_DE[r.material] },
      { header: 'Material_Key', value: r => r.material },
      { header: 'Gewicht_kg', value: r => fmtKg(r.totalWeightGrams) },
      { header: 'Sendungen', value: r => r.contributingShipmentCount },
      { header: 'LUCID-Nummer', value: () => snap.lucidNumber },
      { header: 'Rolle', value: () => snap.distributorRole },
      { header: 'Duales_System', value: () => snap.dualSystem || '' },
      { header: 'Monat', value: () => reportMonth.slice(0, 7) },
    ];
    const csv = buildCsv(snap.rows.filter(r => r.totalWeightGrams > 0), cols);
    downloadCsv(timestampedFilename(`lucid-${reportMonth.slice(0, 7)}`), csv);
    toast.success('CSV heruntergeladen');
  }

  if (loading) {
    return <div className="space-y-4"><ShimmerSkeleton className="h-12 w-1/2" /><ShimmerSkeleton className="h-64 w-full" /></div>;
  }
  if (!report) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild><Link to="/compliance/reports"><ArrowLeft className="mr-1 h-4 w-4" />Zurück</Link></Button>
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Recycle className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium">Noch kein LUCID-Bericht für {reportMonth.slice(0, 7)}</p>
            <Button onClick={handleGenerate} disabled={busy === 'generate'}>
              {busy === 'generate' ? 'Wird erstellt…' : 'Entwurf jetzt erstellen'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const snap = report.summary as LucidSnapshot;
  const editable = report.status === 'draft' || report.status === 'obsolete';
  const maxWeight = Math.max(...snap.rows.map(r => r.totalWeightGrams), 1);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start gap-2 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/compliance/reports"><ArrowLeft className="mr-1 h-4 w-4" />Zurück</Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
            <Recycle className="h-5 w-5 text-emerald-600" />
            LUCID-Bericht {reportMonth.slice(0, 7)}
            <ComplianceStatusBadge status={report.status} />
          </h1>
          <p className="text-sm text-muted-foreground">
            Generiert {new Date(report.generatedAt).toLocaleString('de-DE')}
            {report.submittedAt && <> · Eingereicht {new Date(report.submittedAt).toLocaleString('de-DE')}</>}
            {report.externalReference && <> · Ref: <span className="font-mono">{report.externalReference}</span></>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        <Kpi icon={<Package className="h-4 w-4" />} label="Gewicht gesamt" value={`${fmtKg(snap.totalWeightGrams)} kg`} />
        <Kpi icon={<Package className="h-4 w-4" />} label="Sendungen" value={snap.shipmentCount.toString()} />
        <Kpi icon={<Recycle className="h-4 w-4" />} label="LUCID-Nr." value={snap.lucidNumber || '—'} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Aufschlüsselung nach Material</CardTitle>
          <CardDescription>
            8 amtliche VerpackG-Kategorien. Rolle: <strong>{snap.distributorRole}</strong>
            {snap.dualSystem && <> · Duales System: <strong>{snap.dualSystem}</strong></>}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">kg</TableHead>
                  <TableHead className="hidden sm:table-cell">Anteil</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Sendungen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {LUCID_MATERIAL_ORDER.map((m) => {
                  const row = snap.rows.find(r => r.material === m);
                  if (!row || row.totalWeightGrams === 0) {
                    return (
                      <TableRow key={m} className="text-muted-foreground">
                        <TableCell>{LUCID_MATERIAL_NAMES_DE[m]}</TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="hidden sm:table-cell">—</TableCell>
                        <TableCell className="text-right hidden md:table-cell">—</TableCell>
                      </TableRow>
                    );
                  }
                  const pct = (row.totalWeightGrams / maxWeight) * 100;
                  return (
                    <TableRow key={m}>
                      <TableCell className="font-medium">{LUCID_MATERIAL_NAMES_DE[m]}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{fmtKg(row.totalWeightGrams)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums hidden md:table-cell">{row.contributingShipmentCount}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-2 font-bold bg-muted/30">
                  <TableCell>Gesamt</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtKg(snap.totalWeightGrams)}</TableCell>
                  <TableCell className="hidden sm:table-cell" />
                  <TableCell className="text-right tabular-nums hidden md:table-cell">{snap.shipmentCount}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Drill-Down: Verpackungen pro Material */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Verpackungen im Detail</CardTitle>
          <CardDescription>Welche Verpackungs-Typen haben zu jedem Material beigetragen.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Verpackung</TableHead>
                  <TableHead className="text-right">Stück verbraucht</TableHead>
                  <TableHead className="text-right">g pro Stück</TableHead>
                  <TableHead className="text-right">kg gesamt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.rows.flatMap(r => r.perPackaging.map((p, i) => (
                  <TableRow key={`${r.material}-${p.packagingId}`}>
                    <TableCell>{i === 0 ? LUCID_MATERIAL_NAMES_DE[r.material] : ''}</TableCell>
                    <TableCell>{p.packagingName}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.consumedCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.weightPerUnit}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{fmtKg(p.weightContributionGrams)}</TableCell>
                  </TableRow>
                )))}
                {snap.rows.every(r => r.perPackaging.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                      Keine Verpackungs-Verbräuche in diesem Monat. Stelle sicher, dass Sendungen ein Packaging zugeordnet hatten und der Bestand getrackt war.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
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
              <CheckCircle2 className="h-4 w-4" /> Bestätigt durch LUCID
            </Button>
            <Button onClick={handleReject} variant="outline" className="gap-1.5">
              <AlertCircle className="h-4 w-4" /> Abgelehnt durch LUCID
            </Button>
          </>
        )}
        {editable && (
          <Button onClick={handleDelete} variant="ghost" className="gap-1.5 ml-auto text-muted-foreground">
            <Trash2 className="h-4 w-4" /> Löschen
          </Button>
        )}
      </div>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bericht als eingereicht markieren</DialogTitle>
            <DialogDescription>Gib die LUCID-Submission-ID ein, die du nach dem Upload erhalten hast.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Externe Referenz / Submission-ID</label>
            <Input value={externalRef} onChange={e => setExternalRef(e.target.value)} placeholder="z. B. ZSVR-2026-05-67890" />
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
        <div className="mt-1 text-xl font-bold tabular-nums break-words">{value}</div>
      </CardContent>
    </Card>
  );
}
