import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { listAdminTenants, updateTenantPlan, toggleModule } from '@/services/supabase/admin';
import type { AdminTenant } from '@/types/admin';
import type { BillingPlan, ModuleId } from '@/types/billing';

const PLAN_MRR: Record<string, number> = { free: 0, pro: 49, enterprise: 149 };

const ALL_MODULES: ModuleId[] = [
  'returns_hub_starter', 'returns_hub_professional', 'returns_hub_business',
  'supplier_portal', 'customer_portal', 'custom_domain',
];

export function AdminBillingPage() {
  const { t } = useTranslation('admin');
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [moduleDialogTenant, setModuleDialogTenant] = useState<AdminTenant | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await listAdminTenants();
      // Sort: enterprise first, then pro, then free
      const order = { enterprise: 0, pro: 1, free: 2 };
      data.sort((a, b) => (order[a.plan as keyof typeof order] ?? 2) - (order[b.plan as keyof typeof order] ?? 2));
      setTenants(data);
    } catch (err) {
      console.error('Failed to load tenants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const revenue = useMemo(() => {
    const planMrr = tenants.reduce((sum, t) => sum + (PLAN_MRR[t.plan] || 0), 0);
    return {
      plans: planMrr,
      modules: 0, // Would need module pricing calc
      total: planMrr,
    };
  }, [tenants]);

  const handlePlanChange = async (tenantId: string, plan: BillingPlan) => {
    try {
      await updateTenantPlan(tenantId, plan);
      setTenants((prev) => prev.map((t) => t.id === tenantId ? { ...t, plan } : t));
    } catch (err) {
      console.error('Failed to update plan:', err);
    }
  };

  const handleToggleModule = async (tenantId: string, moduleId: ModuleId, active: boolean) => {
    try {
      await toggleModule(tenantId, moduleId, active);
      await load();
      // Refresh the module dialog tenant
      if (moduleDialogTenant?.id === tenantId) {
        const updated = await listAdminTenants();
        const refreshed = updated.find((t) => t.id === tenantId);
        if (refreshed) setModuleDialogTenant(refreshed);
      }
    } catch (err) {
      console.error('Failed to toggle module:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" /> {t('Billing Management')}
        </h1>
        <p className="text-muted-foreground">{t('Quick plan and module management for all tenants')}</p>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t('Revenue Breakdown')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">{t('Plans')}</p>
              <p className="text-2xl font-bold tabular-nums">{'\u20AC'}{revenue.plans}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">{t('Modules')}</p>
              <p className="text-2xl font-bold tabular-nums">{'\u20AC'}{revenue.modules}</p>
            </div>
            <div className="rounded-lg border p-4 text-center bg-primary/5">
              <p className="text-sm text-muted-foreground">{t('Total MRR')}</p>
              <p className="text-2xl font-bold tabular-nums flex items-center justify-center gap-1">
                <DollarSign className="h-5 w-5" /> {'\u20AC'}{revenue.total}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Billing Table */}
      <Card>
        <CardContent className="pt-6">
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
                    <TableHead className="hidden md:table-cell">{t('Active Modules Column')}</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">{t('MRR')}</TableHead>
                    <TableHead>{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell>
                        <Select
                          value={tenant.plan}
                          onValueChange={(v) => handlePlanChange(tenant.id, v as BillingPlan)}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">{t('Free')}</SelectItem>
                            <SelectItem value="pro">{t('Pro')}</SelectItem>
                            <SelectItem value="enterprise">{t('Enterprise')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {tenant.activeModules.map((m) => (
                            <Badge key={m} variant="outline" className="text-xs">{t(m)}</Badge>
                          ))}
                          {tenant.activeModules.length === 0 && <span className="text-muted-foreground text-xs">-</span>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right tabular-nums">
                        {'\u20AC'}{PLAN_MRR[tenant.plan] || 0}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setModuleDialogTenant(tenant)}>
                          {t('Manage Modules')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tenants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t('No tenants')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module Toggle Dialog */}
      <Dialog open={!!moduleDialogTenant} onOpenChange={(open) => !open && setModuleDialogTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Module Management')} - {moduleDialogTenant?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {ALL_MODULES.map((moduleId) => {
              const isActive = moduleDialogTenant?.activeModules.includes(moduleId) || false;
              return (
                <div key={moduleId} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t(moduleId)}</span>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => moduleDialogTenant && handleToggleModule(moduleDialogTenant.id, moduleId, checked)}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialogTenant(null)}>{t('Cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
