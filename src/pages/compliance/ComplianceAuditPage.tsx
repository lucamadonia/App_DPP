import { useEffect, useState } from 'react';
import { History, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { getAuditLog } from '@/services/supabase/compliance-audit';
import type { ComplianceAuditEntry } from '@/types/compliance';

const ACTION_LABELS: Record<string, { label: string; tone: string }> = {
  generated: { label: 'Erstellt', tone: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200' },
  regenerated: { label: 'Neu generiert', tone: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200' },
  submitted: { label: 'Eingereicht', tone: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200' },
  confirmed: { label: 'Bestätigt', tone: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200' },
  rejected: { label: 'Abgelehnt', tone: 'bg-red-50 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200' },
  deleted: { label: 'Gelöscht', tone: 'bg-slate-100 text-slate-800 border-slate-300' },
  exported_pdf: { label: 'PDF exportiert', tone: 'bg-slate-50 text-slate-800 border-slate-300' },
  exported_csv: { label: 'CSV exportiert', tone: 'bg-slate-50 text-slate-800 border-slate-300' },
};

export function ComplianceAuditPage() {
  const [entries, setEntries] = useState<ComplianceAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLog({ limit: 200 }).then(e => { setEntries(e); setLoading(false); });
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
          <History className="h-6 w-6" />
          Compliance-Audit-Log
        </h1>
        <p className="text-sm text-muted-foreground">
          Lückenloser Verlauf aller Compliance-Berichts-Aktionen — append-only, HGB-konform 10 Jahre aufbewahrt.
        </p>
      </div>

      {loading ? (
        <>
          <ShimmerSkeleton className="h-16 w-full" />
          <ShimmerSkeleton className="h-16 w-full" />
        </>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Noch keine Aktionen geloggt. Sobald du den ersten Bericht generierst, erscheinen Einträge hier.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{entries.length} Einträge</CardTitle>
            <CardDescription>Neueste zuerst</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {entries.map(e => {
                const meta = ACTION_LABELS[e.action] || { label: e.action, tone: 'bg-muted text-foreground border-border' };
                return (
                  <div key={e.id} className="p-3 flex flex-wrap items-start gap-3">
                    <Badge variant="outline" className={`text-[10px] ${meta.tone}`}>{meta.label}</Badge>
                    <div className="flex-1 min-w-0 text-sm">
                      {e.details && (
                        <div className="font-mono text-xs text-muted-foreground break-all">
                          {Object.entries(e.details).map(([k, v]) => (
                            <span key={k} className="mr-2"><strong>{k}:</strong> {String(v)}</span>
                          ))}
                        </div>
                      )}
                      {e.reportId && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <FileSpreadsheet className="h-3 w-3" />
                          <span className="font-mono break-all">{e.reportId}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString('de-DE')}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
