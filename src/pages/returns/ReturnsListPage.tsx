import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ReturnStatusBadge } from '@/components/returns/ReturnStatusBadge';
import { SkeletonTable } from '@/components/returns/SkeletonTable';
import { EmptyState } from '@/components/returns/EmptyState';
import { PaginationBar } from '@/components/returns/PaginationBar';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import { relativeTime } from '@/lib/animations';
import { getReturns } from '@/services/supabase';
import { Package } from 'lucide-react';
import type { RhReturn, ReturnStatus, ReturnsFilter, PaginatedResult } from '@/types/returns-hub';

const ALL_STATUSES: ReturnStatus[] = [
  'CREATED', 'PENDING_APPROVAL', 'APPROVED', 'LABEL_GENERATED',
  'SHIPPED', 'DELIVERED', 'INSPECTION_IN_PROGRESS', 'REFUND_PROCESSING',
  'REFUND_COMPLETED', 'COMPLETED', 'REJECTED', 'CANCELLED',
];

export function ReturnsListPage() {
  const { t, i18n } = useTranslation('returns');
  const navigate = useNavigate();
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

  const activeFilters: string[] = [];
  if (statusFilter !== 'all') activeFilters.push(statusFilter.replace(/_/g, ' '));

  const rowVisibility = useStaggeredList(result.data.length, { interval: 40 });

  return (
    <div className="space-y-6 animate-fade-in-up">
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

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">{t('Active Filters')}:</span>
              {activeFilters.map((f) => (
                <Badge key={f} variant="secondary" className="text-xs capitalize gap-1">
                  {f}
                  <button onClick={() => { setStatusFilter('all'); setPage(1); }}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonTable rows={8} columns={6} />
          ) : result.data.length === 0 ? (
            <EmptyState
              icon={Package}
              title={t('No returns found')}
              description={t('No results match your filters')}
            />
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
                      <th className="pb-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((ret, i) => (
                      <tr
                        key={ret.id}
                        className={`border-b last:border-0 cursor-pointer group hover:bg-muted/50 transition-all duration-200 ${
                          rowVisibility[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                        }`}
                        style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out, background-color 0.15s ease' }}
                        onClick={() => navigate(`/returns/${ret.id}`)}
                      >
                        <td className="py-3 relative">
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="text-primary font-medium pl-2">{ret.returnNumber}</span>
                        </td>
                        <td className="py-3"><ReturnStatusBadge status={ret.status} /></td>
                        <td className="py-3 capitalize">{t(ret.priority.charAt(0).toUpperCase() + ret.priority.slice(1))}</td>
                        <td className="py-3 text-muted-foreground text-xs">{relativeTime(ret.createdAt, i18n.language)}</td>
                        <td className="py-3 capitalize">{ret.desiredSolution ? t(ret.desiredSolution.charAt(0).toUpperCase() + ret.desiredSolution.slice(1)) : '—'}</td>
                        <td className="py-3 text-right font-medium">
                          {ret.refundAmount != null ? `\u20AC${ret.refundAmount.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/returns/${ret.id}`)}>
                                {t('View')}
                              </DropdownMenuItem>
                              <DropdownMenuItem>{t('Change Status')}</DropdownMenuItem>
                              <DropdownMenuItem>{t('Assign')}</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginationBar
                page={page}
                totalPages={result.totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
