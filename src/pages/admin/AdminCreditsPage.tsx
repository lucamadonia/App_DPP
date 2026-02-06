import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Search, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { listAdminTenants, adjustCredits, setMonthlyAllowance } from '@/services/supabase/admin';
import type { AdminTenant } from '@/types/admin';

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  pro: 'bg-emerald-100 text-emerald-700',
  enterprise: 'bg-violet-100 text-violet-700',
};

export function AdminCreditsPage() {
  const { t } = useTranslation('admin');
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Adjust credits dialog
  const [adjustTenant, setAdjustTenant] = useState<AdminTenant | null>(null);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditReason, setCreditReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Set allowance dialog
  const [allowanceTenant, setAllowanceTenant] = useState<AdminTenant | null>(null);
  const [newAllowance, setNewAllowance] = useState(0);

  const load = async () => {
    setIsLoading(true);
    try {
      setTenants(await listAdminTenants());
    } catch (err) {
      console.error('Failed to load tenants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q));
  }, [tenants, search]);

  const handleAdjustCredits = async () => {
    if (!adjustTenant || !creditAmount) return;
    setSaving(true);
    try {
      await adjustCredits(adjustTenant.id, creditAmount, creditReason);
      setAdjustTenant(null);
      setCreditAmount(0);
      setCreditReason('');
      await load();
    } catch (err) {
      console.error('Failed to adjust credits:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSetAllowance = async () => {
    if (!allowanceTenant) return;
    setSaving(true);
    try {
      await setMonthlyAllowance(allowanceTenant.id, newAllowance);
      setAllowanceTenant(null);
      await load();
    } catch (err) {
      console.error('Failed to set allowance:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6" /> {t('Credit Management')}
        </h1>
        <p className="text-muted-foreground">{t('Manage AI credits for all tenants')}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base">{t('Credits')}</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('Search by tenant...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={load}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Tenant')}</TableHead>
                    <TableHead>{t('Plan')}</TableHead>
                    <TableHead className="text-right">{t('Monthly')}</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">{t('Monthly Used')}</TableHead>
                    <TableHead className="hidden md:table-cell text-right">{t('Purchased')}</TableHead>
                    <TableHead className="text-right">{t('Total')}</TableHead>
                    <TableHead>{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((tenant) => {
                    const monthlyRemaining = tenant.monthlyAllowance - tenant.monthlyUsed;
                    const total = monthlyRemaining + tenant.purchasedBalance;
                    return (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell>
                          <Badge className={PLAN_COLORS[tenant.plan] || ''} variant="secondary">
                            {tenant.plan}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{tenant.monthlyAllowance}</TableCell>
                        <TableCell className="hidden sm:table-cell text-right tabular-nums">{tenant.monthlyUsed}</TableCell>
                        <TableCell className="hidden md:table-cell text-right tabular-nums">{tenant.purchasedBalance}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{total}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setAdjustTenant(tenant); setCreditAmount(0); setCreditReason(''); }}
                            >
                              {t('Adjust Credits')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setAllowanceTenant(tenant); setNewAllowance(tenant.monthlyAllowance); }}
                            >
                              {t('Set Allowance')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t('No credit data')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjust Credits Dialog */}
      <Dialog open={!!adjustTenant} onOpenChange={(open) => !open && setAdjustTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Adjust credits for')} {adjustTenant?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Amount')}</Label>
              <Input type="number" value={creditAmount} onChange={(e) => setCreditAmount(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">{t('Positive adds, negative removes')}</p>
            </div>
            <div>
              <Label>{t('Reason')}</Label>
              <Input value={creditReason} onChange={(e) => setCreditReason(e.target.value)} placeholder={t('e.g. Promotional credits')} />
            </div>
            {adjustTenant && (
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-sm">
                  <strong>{t('New Balance')}:</strong> {adjustTenant.purchasedBalance + creditAmount}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustTenant(null)}>{t('Cancel')}</Button>
            <Button onClick={handleAdjustCredits} disabled={saving || !creditAmount}>{t('Confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Allowance Dialog */}
      <Dialog open={!!allowanceTenant} onOpenChange={(open) => !open && setAllowanceTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Set allowance for')} {allowanceTenant?.name}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>{t('Monthly AI Credits')}</Label>
            <Input type="number" value={newAllowance} onChange={(e) => setNewAllowance(Number(e.target.value))} min={0} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllowanceTenant(null)}>{t('Cancel')}</Button>
            <Button onClick={handleSetAllowance} disabled={saving}>{t('Confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
