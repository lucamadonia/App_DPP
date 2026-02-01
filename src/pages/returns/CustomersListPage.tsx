import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, LayoutList, LayoutGrid, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SkeletonTable } from '@/components/returns/SkeletonTable';
import { EmptyState } from '@/components/returns/EmptyState';
import { PaginationBar } from '@/components/returns/PaginationBar';
import { CustomerGridCard } from '@/components/returns/CustomerGridCard';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import { getRhCustomers, createRhCustomer } from '@/services/supabase';
import type { RhCustomer, PaginatedResult } from '@/types/returns-hub';

export function CustomersListPage() {
  const { t } = useTranslation('returns');
  const navigate = useNavigate();
  const [result, setResult] = useState<PaginatedResult<RhCustomer>>({
    data: [], total: 0, page: 1, pageSize: 20, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Create customer dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getRhCustomers(search || undefined, page, 20);
    setResult(data);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const riskColor = (score: number) =>
    score >= 70 ? 'bg-red-100 text-red-800' : score >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';

  const openDialog = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setCompany('');
    setNotes('');
    setTagsInput('');
    setDialogOpen(true);
  };

  const handleCreateCustomer = async () => {
    if (!email.trim()) return;
    setCreating(true);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const result = await createRhCustomer({
      email: email.trim(),
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      phone: phone.trim() || undefined,
      company: company.trim() || undefined,
      notes: notes.trim() || undefined,
      tags,
      addresses: [],
    });

    if (result.success && result.id) {
      setDialogOpen(false);
      navigate(`/returns/customers/${result.id}`);
    }
    setCreating(false);
  };

  const rowVisibility = useStaggeredList(result.data.length, { interval: 40 });

  // Skeleton for grid view
  const GridSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }, (_, i) => (
        <Card key={i}>
          <CardContent className="pt-5 pb-4 px-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-3 bg-muted rounded w-32" />
              </div>
              <div className="h-16 w-16 rounded-full bg-muted" />
            </div>
            <div className="flex gap-3 mt-4 pt-3 border-t">
              <div className="flex-1 h-8 bg-muted rounded" />
              <div className="flex-1 h-8 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('Customer List')}</h1>
          <p className="text-muted-foreground">{t('Manage return customers')}</p>
        </div>
        <Button onClick={openDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t('New Customer')}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t('Search by name, email, company...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
              />
            </div>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode('table')}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            viewMode === 'grid' ? <GridSkeleton /> : <SkeletonTable rows={6} columns={6} />
          ) : result.data.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('No customers found')}
              description={t('Get started by creating your first return')}
              actionLabel={t('New Customer')}
              onAction={openDialog}
            />
          ) : viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.data.map((cust, i) => (
                  <div
                    key={cust.id}
                    className={`${rowVisibility[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                    style={{ transition: 'opacity 0.35s ease-out, transform 0.35s ease-out' }}
                  >
                    <CustomerGridCard customer={cust} />
                  </div>
                ))}
              </div>
              <PaginationBar page={page} totalPages={result.totalPages} onPageChange={setPage} />
            </>
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
                    {result.data.map((cust, i) => {
                      const name = [cust.firstName, cust.lastName].filter(Boolean).join(' ') || '—';
                      return (
                        <tr
                          key={cust.id}
                          className={`border-b last:border-0 cursor-pointer group hover:bg-muted/50 transition-all duration-200 ${
                            rowVisibility[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                          }`}
                          style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out, background-color 0.15s ease' }}
                          onClick={() => navigate(`/returns/customers/${cust.id}`)}
                        >
                          <td className="py-3 relative">
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="text-primary font-medium pl-2">{name}</span>
                          </td>
                          <td className="py-3 text-muted-foreground">{cust.email}</td>
                          <td className="py-3">{cust.company || '—'}</td>
                          <td className="py-3 text-center">{cust.returnStats.totalReturns}</td>
                          <td className="py-3 text-right">{'\u20AC'}{cust.returnStats.totalValue.toFixed(2)}</td>
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
              <PaginationBar page={page} totalPages={result.totalPages} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('New Customer')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('Email')} *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('First Name')}</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('Last Name')}</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Phone')}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('Company')}</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Notes')}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>{t('Tags (comma-separated)')}</Label>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="vip, wholesale" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handleCreateCustomer} disabled={creating || !email.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
