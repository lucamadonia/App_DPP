import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getRhCustomers } from '@/services/supabase';
import type { RhCustomer, PaginatedResult } from '@/types/returns-hub';

export function CustomersListPage() {
  const { t } = useTranslation('returns');
  const [result, setResult] = useState<PaginatedResult<RhCustomer>>({
    data: [], total: 0, page: 1, pageSize: 20, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getRhCustomers(search || undefined, page, 20);
    setResult(data);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const riskColor = (score: number) =>
    score >= 70 ? 'bg-red-100 text-red-800' : score >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('Customer List')}</h1>
        <p className="text-muted-foreground">{t('Manage return customers')}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t('Search by name, email, company...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : result.data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">{t('No customers found')}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">{t('Customer')}</th>
                      <th className="pb-2 font-medium">{t('Email')}</th>
                      <th className="pb-2 font-medium">{t('Company')}</th>
                      <th className="pb-2 font-medium text-center">{t('Total Returns')}</th>
                      <th className="pb-2 font-medium text-right">{t('Total Value')}</th>
                      <th className="pb-2 font-medium text-center">{t('Risk Score')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((cust) => {
                      const name = [cust.firstName, cust.lastName].filter(Boolean).join(' ') || '—';
                      return (
                        <tr key={cust.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3">
                            <Link to={`/returns/customers/${cust.id}`} className="text-primary hover:underline font-medium">
                              {name}
                            </Link>
                          </td>
                          <td className="py-3 text-muted-foreground">{cust.email}</td>
                          <td className="py-3">{cust.company || '—'}</td>
                          <td className="py-3 text-center">{cust.returnStats.totalReturns}</td>
                          <td className="py-3 text-right">€{cust.returnStats.totalValue.toFixed(2)}</td>
                          <td className="py-3 text-center">
                            <Badge variant="outline" className={riskColor(cust.riskScore)}>
                              {cust.riskScore}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {result.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">{page} / {result.totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(result.totalPages, p + 1))} disabled={page >= result.totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
