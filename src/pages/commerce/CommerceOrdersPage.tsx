import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Database, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listOrders } from '@/services/supabase/commerce-orders';
import {
  type CommerceOrder,
  type CommercePlatform,
  ALL_COMMERCE_PLATFORMS,
  getPlatformDescriptor,
} from '@/types/commerce-channels';
import { PlatformIcon } from '@/components/commerce/PlatformIcon';

export function CommerceOrdersPage() {
  const { t } = useTranslation('commerce');
  const [orders, setOrders] = useState<CommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<CommercePlatform | 'all'>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listOrders({
        platform: platform === 'all' ? undefined : platform,
        search: search || undefined,
        limit: 100,
      });
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }, [platform, search]);

  useEffect(() => {
    const debounce = setTimeout(() => load(), 300);
    return () => clearTimeout(debounce);
  }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/commerce"><ArrowLeft className="mr-1 h-4 w-4" />{t('Back to Hub')}</Link>
        </Button>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">{t('All Orders')}</h1>
            <p className="text-sm text-muted-foreground">{t('Unified view of every order across your connected channels.')}</p>
          </div>
          <Badge variant="secondary" className="gap-1"><Database className="h-3 w-3" />{orders.length}</Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('Search by order number, email or customer name…')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={platform} onValueChange={(v) => setPlatform(v as CommercePlatform | 'all')}>
          <SelectTrigger className="w-full md:w-[220px]">
            <Filter className="mr-2 h-3.5 w-3.5" />
            <SelectValue placeholder={t('All platforms')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All platforms')}</SelectItem>
            {ALL_COMMERCE_PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>{getPlatformDescriptor(p).label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Orders table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">{t('Channel')}</th>
                <th className="px-4 py-2 font-medium">{t('Order')}</th>
                <th className="px-4 py-2 font-medium">{t('Customer')}</th>
                <th className="px-4 py-2 font-medium">{t('Country')}</th>
                <th className="px-4 py-2 font-medium">{t('Items')}</th>
                <th className="px-4 py-2 font-medium">{t('DPP linked')}</th>
                <th className="px-4 py-2 text-right font-medium">{t('Amount')}</th>
                <th className="px-4 py-2 font-medium">{t('Placed')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{t('Loading…')}</td></tr>
              )}
              {!loading && orders.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{t('No orders match these filters.')}</td></tr>
              )}
              {!loading && orders.map((o) => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={o.platform} size={16} />
                      <span className="text-xs text-muted-foreground">{getPlatformDescriptor(o.platform).label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 font-medium">{o.externalOrderNumber || o.externalOrderId.slice(0, 12)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{o.customerName || o.customerEmail || '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{o.customerCountryName || o.customerCountry || '—'}</td>
                  <td className="px-4 py-2 tabular-nums">{o.itemCount}</td>
                  <td className="px-4 py-2">
                    {o.dppTotalCount > 0 ? (
                      <span className={[
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                        o.dppLinkedCount === o.dppTotalCount
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : o.dppLinkedCount === 0
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
                      ].join(' ')}>
                        {o.dppLinkedCount}/{o.dppTotalCount}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: o.currency }).format(o.totalAmount)}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(o.placedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
