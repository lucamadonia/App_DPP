import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

  return (
    <div className="space-y-6">
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
