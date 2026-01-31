import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ReturnStatusBadge } from '@/components/returns/ReturnStatusBadge';
import { getReturns } from '@/services/supabase';
import type { RhReturn, ReturnStatus, ReturnsFilter, PaginatedResult } from '@/types/returns-hub';

const ALL_STATUSES: ReturnStatus[] = [
  'CREATED', 'PENDING_APPROVAL', 'APPROVED', 'LABEL_GENERATED',
  'SHIPPED', 'DELIVERED', 'INSPECTION_IN_PROGRESS', 'REFUND_PROCESSING',
  'REFUND_COMPLETED', 'COMPLETED', 'REJECTED', 'CANCELLED',
];

export function ReturnsListPage() {
  const { t } = useTranslation('returns');
  const [result, setResult] = useState<PaginatedResult<RhReturn>>({
    data: [], total: 0, page: 1, pageSize: 20, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const loadReturns = useCallback(async () => {
    setLoading(true);
    const filter: ReturnsFilter = {};
    if (statusFilter !== 'all') filter.status = [statusFilter as ReturnStatus];
    if (search) filter.search = search;

    const data = await getReturns(filter, page, 20);
    setResult(data);
    setLoading(false);
  }, [page, statusFilter, search]);

  useEffect(() => { loadReturns(); }, [loadReturns]);

  const handleSearch = () => {
    setPage(1);
    loadReturns();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('Returns')}</h1>
          <p className="text-muted-foreground">
            {t('Showing {{from}} to {{to}} of {{total}} returns', {
              from: Math.min((page - 1) * 20 + 1, result.total),
              to: Math.min(page * 20, result.total),
              total: result.total,
            })}
          </p>
        </div>
        <Link to="/returns/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('New Return')}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t('Search by return number, order ID...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t('All Statuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Statuses')}</SelectItem>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{t(s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\bIn\b/i, 'in').replace(/\bOf\b/i, 'of'))}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : result.data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">{t('No returns found')}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">{t('Return Number')}</th>
                      <th className="pb-2 font-medium">{t('Status')}</th>
                      <th className="pb-2 font-medium">{t('Priority')}</th>
                      <th className="pb-2 font-medium">{t('Date')}</th>
                      <th className="pb-2 font-medium">{t('Desired Solution')}</th>
                      <th className="pb-2 font-medium text-right">{t('Refund Amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((ret) => (
                      <tr key={ret.id} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer">
                        <td className="py-3">
                          <Link to={`/returns/${ret.id}`} className="text-primary hover:underline font-medium">
                            {ret.returnNumber}
                          </Link>
                        </td>
                        <td className="py-3">
                          <ReturnStatusBadge status={ret.status} />
                        </td>
                        <td className="py-3 capitalize">{t(ret.priority.charAt(0).toUpperCase() + ret.priority.slice(1))}</td>
                        <td className="py-3 text-muted-foreground">{new Date(ret.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 capitalize">{ret.desiredSolution ? t(ret.desiredSolution.charAt(0).toUpperCase() + ret.desiredSolution.slice(1)) : '—'}</td>
                        <td className="py-3 text-right font-medium">
                          {ret.refundAmount != null ? `€${ret.refundAmount.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {result.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(result.totalPages, p + 1))}
                    disabled={page >= result.totalPages}
                  >
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
