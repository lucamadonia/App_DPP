/**
 * Top products a customer has bought — horizontal bars ranked by revenue.
 */
import { useState, useEffect } from 'react';
import { Package2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { getCustomerProductAffinity, type ProductAffinity } from '@/services/supabase/crm-analytics';

function fmtEuro(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
}

interface ProductAffinityListProps {
  customerId: string;
  limit?: number;
}

export function ProductAffinityList({ customerId, limit = 5 }: ProductAffinityListProps) {
  const [data, setData] = useState<ProductAffinity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getCustomerProductAffinity(customerId, limit).then(p => {
      if (active) { setData(p); setLoading(false); }
    });
    return () => { active = false; };
  }, [customerId, limit]);

  const maxRevenue = Math.max(1, ...data.map(d => d.totalRevenue));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package2 className="h-4 w-4" />
          Lieblings-Produkte
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <ShimmerSkeleton key={i} className="h-8" />)}
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Noch keine Produkte gekauft
          </p>
        ) : (
          <ul className="space-y-3">
            {data.map((p, i) => {
              const pct = (p.totalRevenue / maxRevenue) * 100;
              return (
                <li key={p.productId}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span className="truncate">{p.productName}</span>
                    </span>
                    <span className="font-semibold tabular-nums ml-2 shrink-0">{fmtEuro(p.totalRevenue)}</span>
                  </div>
                  <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-500 ease-out rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                    <span>{p.totalQuantity} Stück</span>
                    <span>{p.orderCount} Bestellung{p.orderCount === 1 ? '' : 'en'}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
