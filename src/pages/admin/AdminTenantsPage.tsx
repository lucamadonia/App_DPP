import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Search, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { listAdminTenants } from '@/services/supabase/admin';
import type { AdminTenant } from '@/types/admin';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  pro: 'bg-emerald-100 text-emerald-700',
  enterprise: 'bg-violet-100 text-violet-700',
};

export function AdminTenantsPage() {
  const { t } = useTranslation('admin');
  const locale = useLocale();
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');

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
    return tenants.filter((t) => {
      const q = search.toLowerCase();
      const matchSearch = !q || t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
      const matchPlan = planFilter === 'all' || t.plan === planFilter;
      return matchSearch && matchPlan;
    });
  }, [tenants, search, planFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" /> {t('Tenants')}
        </h1>
        <p className="text-muted-foreground">{t('Manage all tenants on the platform')}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base">{t('All Tenants')}</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('Search tenants...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Plans')}</SelectItem>
                  <SelectItem value="free">{t('Free')}</SelectItem>
                  <SelectItem value="pro">{t('Pro')}</SelectItem>
                  <SelectItem value="enterprise">{t('Enterprise')}</SelectItem>
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
                    <TableHead>{t('Name')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('Slug')}</TableHead>
                    <TableHead>{t('Plan')}</TableHead>
                    <TableHead className="hidden md:table-cell text-right">{t('Users')}</TableHead>
                    <TableHead className="hidden md:table-cell text-right">{t('Products')}</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">{t('Credits')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('Created')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((tenant) => {
                    const totalCredits = (tenant.monthlyAllowance - tenant.monthlyUsed) + tenant.purchasedBalance;
                    return (
                      <TableRow key={tenant.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Link to={`/admin/tenants/${tenant.id}`} className="font-medium hover:underline">
                            {tenant.name}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">{tenant.slug}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={PLAN_COLORS[tenant.plan] || ''} variant="secondary">
                            {tenant.plan}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right tabular-nums">{tenant.userCount}</TableCell>
                        <TableCell className="hidden md:table-cell text-right tabular-nums">{tenant.productCount}</TableCell>
                        <TableCell className="hidden lg:table-cell text-right tabular-nums">{totalCredits}</TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {formatDate(tenant.createdAt, locale)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t('No tenants found')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
