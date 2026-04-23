/**
 * Admin Analytics
 *   - MRR-Waterfall letzte 12 Monate (Bar-Chart)
 *   - Cohort-Retention-Heatmap
 *   - Feature-Adoption-Liste
 */
import { useState, useEffect } from 'react';
import { TrendingUp, Activity, GitBranch, RefreshCw, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { getMrrWaterfall, getCohortRetention, getFeatureAdoption } from '@/services/supabase/admin';
import type { MrrWaterfallEntry, CohortCell, FeatureAdoption } from '@/types/admin-extended';
import { toast } from 'sonner';

function fmtEuro(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
}

export function AdminAnalyticsPage() {
  const [mrr, setMrr] = useState<MrrWaterfallEntry[]>([]);
  const [cohorts, setCohorts] = useState<CohortCell[]>([]);
  const [adoption, setAdoption] = useState<FeatureAdoption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [m, c, a] = await Promise.all([
        getMrrWaterfall(12),
        getCohortRetention(12),
        getFeatureAdoption(),
      ]);
      setMrr(m);
      setCohorts(c);
      setAdoption(a);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Build cohort grid
  const cohortMonths = Array.from(new Set(cohorts.map(c => c.cohortMonth))).sort();
  const maxOffset = cohorts.reduce((max, c) => Math.max(max, c.monthOffset), 0);

  function getCohortCell(month: string, offset: number): CohortCell | null {
    return cohorts.find(c => c.cohortMonth === month && c.monthOffset === offset) || null;
  }

  function retentionColor(pct: number | null | undefined): string {
    if (pct == null) return 'bg-muted/30 text-muted-foreground';
    if (pct >= 80) return 'bg-emerald-500 text-white';
    if (pct >= 60) return 'bg-emerald-300 text-emerald-900';
    if (pct >= 40) return 'bg-amber-300 text-amber-900';
    if (pct >= 20) return 'bg-orange-300 text-orange-900';
    return 'bg-red-300 text-red-900';
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Analytics</h1>
            <p className="text-xs text-muted-foreground">
              MRR-Trend · Cohort-Retention · Feature-Adoption
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Neu berechnen
        </Button>
      </div>

      {/* MRR Waterfall */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            MRR-Trend (12 Monate)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ShimmerSkeleton className="h-[280px]" />
          ) : mrr.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
              Noch keine MRR-Daten verfügbar
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mrr} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtEuro(v)} />
                <Tooltip formatter={(v) => fmtEuro(Number(v) || 0)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="endMrr" name="End-MRR" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="newMrr" name="Neu" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="churnMrr" name="Churn" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Cohort Retention Heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            Cohort-Retention
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Zeilen = Monat der Tenant-Anmeldung. Spalten = N Monate nach Anmeldung. Farbe = % aktive Tenants.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ShimmerSkeleton className="h-[280px]" />
          ) : cohortMonths.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Noch zu wenig Daten für Cohort-Analyse (mind. 2 Tenants über mehrere Monate)
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold text-muted-foreground sticky left-0 bg-background z-10">
                      Signup-Monat
                    </th>
                    <th className="px-2 py-1 text-center font-semibold text-muted-foreground">#</th>
                    {Array.from({ length: maxOffset + 1 }).map((_, i) => (
                      <th key={i} className="px-2 py-1 text-center font-semibold text-muted-foreground min-w-[50px]">
                        M+{i}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohortMonths.map(month => {
                    const m0 = getCohortCell(month, 0);
                    const size = m0?.tenantCount || 0;
                    return (
                      <tr key={month}>
                        <td className="px-2 py-1 font-mono text-[11px] sticky left-0 bg-background">{month}</td>
                        <td className="px-2 py-1 text-center tabular-nums text-muted-foreground">{size}</td>
                        {Array.from({ length: maxOffset + 1 }).map((_, offset) => {
                          const cell = getCohortCell(month, offset);
                          return (
                            <td key={offset} className="p-0.5">
                              {cell ? (
                                <div
                                  className={`w-full h-7 flex items-center justify-center rounded text-[10px] font-semibold tabular-nums ${retentionColor(cell.retentionPct)}`}
                                  title={`${cell.activeCount} von ${cell.tenantCount} aktiv`}
                                >
                                  {cell.retentionPct}%
                                </div>
                              ) : (
                                <div className="w-full h-7 rounded bg-muted/30" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Adoption */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Feature-Adoption
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            % der Tenants mit aktivem Modul-Abo.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => <ShimmerSkeleton key={i} className="h-10" />)
          ) : adoption.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Noch keine Module aktiv</p>
          ) : (
            adoption.map(f => (
              <div key={f.feature}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{f.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {f.activeTenants} / {f.totalTenants} <span className="text-foreground font-semibold">({f.adoptionPct}%)</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-[width] duration-500"
                    style={{ width: `${f.adoptionPct}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
