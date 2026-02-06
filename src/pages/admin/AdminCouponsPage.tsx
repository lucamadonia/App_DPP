import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Ticket, Plus, Copy, RefreshCw, Trash2, Ban, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { listCoupons, createCoupon, updateCoupon, deleteCoupon } from '@/services/supabase/admin';
import type { AdminCoupon, CreateCouponInput } from '@/types/admin';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';

export function AdminCouponsPage() {
  const { t } = useTranslation('admin');
  const locale = useLocale();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create form
  const [form, setForm] = useState<CreateCouponInput>({
    name: '',
    discountType: 'percent',
    discountValue: 10,
    duration: 'once',
    promoCode: '',
  });

  const load = async () => {
    setIsLoading(true);
    try {
      setCoupons(await listCoupons());
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return coupons;
    if (statusFilter === 'active') return coupons.filter((c) => c.active);
    if (statusFilter === 'expired') return coupons.filter((c) => !c.active || (c.expiresAt && new Date(c.expiresAt) < new Date()));
    return coupons;
  }, [coupons, statusFilter]);

  const handleCreate = async () => {
    if (!form.name || !form.discountValue) return;
    setSaving(true);
    try {
      await createCoupon(form);
      setCreateDialogOpen(false);
      setForm({ name: '', discountType: 'percent', discountValue: 10, duration: 'once', promoCode: '' });
      await load();
    } catch (err) {
      console.error('Failed to create coupon:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (couponId: string) => {
    try {
      await updateCoupon(couponId, false);
      await load();
    } catch (err) {
      console.error('Failed to deactivate coupon:', err);
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!confirm(t('Are you sure?'))) return;
    try {
      await deleteCoupon(couponId);
      await load();
    } catch (err) {
      console.error('Failed to delete coupon:', err);
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDiscount = (coupon: AdminCoupon) => {
    if (coupon.percentOff) return `${coupon.percentOff}%`;
    if (coupon.amountOff) return `\u20AC${coupon.amountOff}`;
    return '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6" /> {t('Coupons')}
          </h1>
          <p className="text-muted-foreground">{t('Manage Stripe promotion codes and coupons')}</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> {t('Create Coupon')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('Coupons')} ({filtered.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Statuses')}</SelectItem>
                  <SelectItem value="active">{t('Active Only')}</SelectItem>
                  <SelectItem value="expired">{t('Expired')}</SelectItem>
                </SelectContent>
              </Select>
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
                    <TableHead>{t('Coupon Name')}</TableHead>
                    <TableHead>{t('Promo Code')}</TableHead>
                    <TableHead>{t('Discount')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('Duration')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('Redemptions')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('Expires')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-medium">{coupon.name}</TableCell>
                      <TableCell>
                        {coupon.promoCode ? (
                          <div className="flex items-center gap-1">
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{coupon.promoCode}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyCode(coupon.promoCode!, coupon.id)}
                            >
                              {copiedId === coupon.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{formatDiscount(coupon)} {t('off')}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm">
                          {t(coupon.duration)}
                          {coupon.duration === 'repeating' && coupon.durationInMonths && (
                            <span className="text-muted-foreground"> ({coupon.durationInMonths} {t('months')})</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell tabular-nums">
                        {coupon.timesRedeemed}/{coupon.maxRedemptions || t('unlimited')}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {coupon.expiresAt ? formatDate(coupon.expiresAt, locale) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={coupon.active ? 'default' : 'secondary'}>
                          {coupon.active ? t('Active') : t('Inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {coupon.active && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeactivate(coupon.id)} title={t('Deactivate')}>
                              <Ban className="h-3.5 w-3.5 text-orange-500" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(coupon.id)} title={t('Delete')}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {t('No coupons found')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Coupon Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('Create New Coupon')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Coupon Name')}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('Discount Type')}</Label>
                <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v as 'percent' | 'amount' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">{t('Percentage')}</SelectItem>
                    <SelectItem value="amount">{t('Fixed Amount')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('Discount Value')}</Label>
                <Input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('Duration')}</Label>
                <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v as 'once' | 'repeating' | 'forever' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">{t('once')}</SelectItem>
                    <SelectItem value="repeating">{t('repeating')}</SelectItem>
                    <SelectItem value="forever">{t('forever')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.duration === 'repeating' && (
                <div>
                  <Label>{t('Duration in Months')}</Label>
                  <Input
                    type="number"
                    value={form.durationInMonths || ''}
                    onChange={(e) => setForm({ ...form, durationInMonths: Number(e.target.value) || undefined })}
                  />
                </div>
              )}
            </div>
            <div>
              <Label>{t('Promotion Code')}</Label>
              <Input
                value={form.promoCode || ''}
                onChange={(e) => setForm({ ...form, promoCode: e.target.value })}
                placeholder={t('optional, auto-generated if empty')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('Max Redemptions')}</Label>
                <Input
                  type="number"
                  value={form.maxRedemptions || ''}
                  onChange={(e) => setForm({ ...form, maxRedemptions: Number(e.target.value) || undefined })}
                  placeholder={t('leave empty for unlimited')}
                />
              </div>
              <div>
                <Label>{t('Expiry Date')}</Label>
                <Input
                  type="date"
                  value={form.expiresAt || ''}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value || undefined })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name}>{t('Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
