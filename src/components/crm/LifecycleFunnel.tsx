/**
 * Lifecycle Funnel — horizontal bars showing customers per RFM stage
 * with revenue and conversion percentages.
 */
import { useEffect, useState } from 'react';
import { GitBranch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { getLifecycleFunnel, type LifecycleFunnelStage } from '@/services/supabase/crm-analytics';

const STAGE_ORDER = ['new', 'potential', 'loyal', 'champion', 'at_risk', 'hibernating', 'lost', 'unassigned'];
const STAGE_META: Record<string, { label: string; color: string }> = {
  new:         { label: 'Neulinge',    color: '#10b981' },
  potential:   { label: 'Potenziale',  color: '#38bdf8' },
  loyal:       { label: 'Treue',        color: '#22c55e' },
  champion:    { label: 'Champions',   color: '#a855f7' },
  at_risk:     { label: 'Gefährdet',   color: '#f59e0b' },
  hibernating: { label: 'Schlummernd', color: '#f97316' },
  lost:        { label: 'Verloren',    color: '#ef4444' },
  unassigned:  { label: 'Ohne Segment', color: '#94a3b8' },
};

function fmtEuro(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
}

export function LifecycleFunnel() {
  const [data, setData] = useState<LifecycleFunnelStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLifecycleFunnel().then(d => { setData(d); setLoading(false); });
  }, []);

  const sorted = [...data].sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));
  const maxCount = Math.max(1, ...sorted.map(s => s.customerCount));
  const total = sorted.reduce((s, x) => s + x.customerCount, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Lifecycle-Funnel
          <span className="text-xs font-normal text-muted-foreground ml-auto">{total} Kunden</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <ShimmerSkeleton key={i} className="h-6" />)
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Keine Daten</p>
        ) : (
          sorted.map(s => {
            const meta = STAGE_META[s.stage] || STAGE_META.unassigned;
            const pctCount = total > 0 ? (s.customerCount / total) * 100 : 0;
            const pctMax = (s.customerCount / maxCount) * 100;
            return (
              <div key={s.stage} className="group">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="font-medium">{meta.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {s.customerCount} · {pctCount.toFixed(0)}%
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums text-muted-foreground">{fmtEuro(s.revenueSum)}</span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out group-hover:opacity-80"
                    style={{ width: `${pctMax}%`, backgroundColor: meta.color }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
