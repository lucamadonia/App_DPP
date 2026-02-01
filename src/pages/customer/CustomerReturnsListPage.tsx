import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReturnStatusBadge } from '@/components/returns/ReturnStatusBadge';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { getCustomerReturns } from '@/services/supabase/customer-portal';
import type { RhReturn, ReturnStatus } from '@/types/returns-hub';

export function CustomerReturnsListPage() {
  const { t } = useTranslation('customer-portal');
  const navigate = useNavigate();
  const { tenantSlug } = useCustomerPortal();
  const [returns, setReturns] = useState<RhReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const loadReturns = async () => {
    setLoading(true);
    const filter: { status?: string[]; search?: string } = {};
    if (statusFilter !== 'all') filter.status = [statusFilter];
    if (search) filter.search = search;

    const result = await getCustomerReturns(filter, page, pageSize);
    setReturns(result.data);
    setTotal(result.total);
    setLoading(false);
  };

  useEffect(() => {
    loadReturns();
  }, [search, statusFilter, page]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('My Returns')}</h1>
          <p className="text-muted-foreground">{t('Track and manage your returns')}</p>
        </div>
        <Button onClick={() => navigate(`/customer/${tenantSlug}/returns/new`)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('New Return')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search by return number or order ID...')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('All Statuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Statuses')}</SelectItem>
            <SelectItem value="CREATED">{t('Created')}</SelectItem>
            <SelectItem value="PENDING_APPROVAL">{t('Pending Approval')}</SelectItem>
            <SelectItem value="APPROVED">{t('Approved')}</SelectItem>
            <SelectItem value="SHIPPED">{t('Shipped')}</SelectItem>
            <SelectItem value="INSPECTION_IN_PROGRESS">{t('Inspection')}</SelectItem>
            <SelectItem value="REFUND_PROCESSING">{t('Refund Processing')}</SelectItem>
            <SelectItem value="COMPLETED">{t('Completed')}</SelectItem>
            <SelectItem value="REJECTED">{t('Rejected')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Returns List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : returns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium">{t('No returns found')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('Start a new return to get started.')}</p>
            <Button
              className="mt-4 gap-2"
              onClick={() => navigate(`/customer/${tenantSlug}/returns/new`)}
            >
              <Plus className="h-4 w-4" />
              {t('New Return')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {returns.map((ret) => (
              <Card
                key={ret.id}
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => navigate(`/customer/${tenantSlug}/returns/${ret.id}`)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium text-sm">{ret.returnNumber}</p>
                        {ret.orderId && (
                          <p className="text-xs text-muted-foreground">
                            {t('Order')}: {ret.orderId}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ReturnStatusBadge status={ret.status as ReturnStatus} />
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {new Date(ret.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {(ret.reasonCategory || ret.desiredSolution) && (
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      {ret.reasonCategory && <span>{ret.reasonCategory}</span>}
                      {ret.desiredSolution && (
                        <span className="capitalize">{t(ret.desiredSolution)}</span>
                      )}
                      {ret.refundAmount != null && (
                        <span className="font-medium text-foreground">
                          {'\u20AC'}{ret.refundAmount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t('Previous', { ns: 'returns' })}
              </Button>
              <span className="flex items-center text-sm text-muted-foreground px-3">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                {t('Next', { ns: 'returns' })}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
