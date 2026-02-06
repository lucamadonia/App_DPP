import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Building2, CreditCard, Users, Sparkles, BarChart3, Settings,
  Shield, ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  getAdminTenant, updateTenantPlan, toggleModule,
  adjustCredits, setMonthlyAllowance, updateUserRole,
} from '@/services/supabase/admin';
import type { AdminTenantDetail } from '@/types/admin';
import type { BillingPlan, ModuleId } from '@/types/billing';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  pro: 'bg-emerald-100 text-emerald-700',
  enterprise: 'bg-violet-100 text-violet-700',
};

const ALL_MODULES: ModuleId[] = [
  'returns_hub_starter', 'returns_hub_professional', 'returns_hub_business',
  'supplier_portal', 'customer_portal', 'custom_domain',
];

export function AdminTenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { t } = useTranslation('admin');
  const locale = useLocale();
  const [tenant, setTenant] = useState<AdminTenantDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Dialog states
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>('free');
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditReason, setCreditReason] = useState('');
  const [allowanceDialogOpen, setAllowanceDialogOpen] = useState(false);
  const [newAllowance, setNewAllowance] = useState(3);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      setTenant(await getAdminTenant(tenantId));
    } catch (err) {
      console.error('Failed to load tenant:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [tenantId]);

  const handlePlanChange = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      await updateTenantPlan(tenantId, selectedPlan);
      setPlanDialogOpen(false);
      await load();
    } catch (err) {
      console.error('Failed to update plan:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleModule = async (moduleId: ModuleId, active: boolean) => {
    if (!tenantId) return;
    try {
      await toggleModule(tenantId, moduleId, active);
      await load();
    } catch (err) {
      console.error('Failed to toggle module:', err);
    }
  };

  const handleAdjustCredits = async () => {
    if (!tenantId || !creditAmount) return;
    setSaving(true);
    try {
      await adjustCredits(tenantId, creditAmount, creditReason);
      setCreditDialogOpen(false);
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
    if (!tenantId) return;
    setSaving(true);
    try {
      await setMonthlyAllowance(tenantId, newAllowance);
      setAllowanceDialogOpen(false);
      await load();
    } catch (err) {
      console.error('Failed to set allowance:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateUserRole(userId, role);
      await load();
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  if (isLoading || !tenant) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalCredits = (tenant.monthlyAllowance - tenant.monthlyUsed) + tenant.purchasedBalance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/tenants"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{tenant.name}</h1>
          <p className="text-muted-foreground">{tenant.slug}</p>
        </div>
        <Badge className={PLAN_COLORS[tenant.plan] || ''} variant="secondary">
          {tenant.plan}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="overview" className="gap-1"><Building2 className="h-3 w-3 hidden sm:block" />{t('Overview')}</TabsTrigger>
          <TabsTrigger value="billing" className="gap-1"><CreditCard className="h-3 w-3 hidden sm:block" />{t('Billing')}</TabsTrigger>
          <TabsTrigger value="users" className="gap-1"><Users className="h-3 w-3 hidden sm:block" />{t('Users')}</TabsTrigger>
          <TabsTrigger value="credits" className="gap-1"><Sparkles className="h-3 w-3 hidden sm:block" />{t('Credits')}</TabsTrigger>
          <TabsTrigger value="usage" className="gap-1"><BarChart3 className="h-3 w-3 hidden sm:block" />{t('Usage')}</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1"><Settings className="h-3 w-3 hidden sm:block" />{t('Settings')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle>{t('Company Information')}</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  [t('Name'), tenant.name],
                  [t('Slug'), tenant.slug],
                  [t('Address'), tenant.address || '-'],
                  [t('Country'), tenant.country || '-'],
                  [t('EORI Number'), tenant.eori || '-'],
                  [t('VAT ID'), tenant.vat || '-'],
                  [t('Stripe Customer'), tenant.stripeCustomerId || '-'],
                  [t('Created'), formatDate(tenant.createdAt, locale)],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-sm">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t('Current Plan')}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => { setSelectedPlan(tenant.plan as BillingPlan); setPlanDialogOpen(true); }}>
                  {t('Change Plan')}
                </Button>
              </CardHeader>
              <CardContent>
                <Badge className={`text-lg px-3 py-1 ${PLAN_COLORS[tenant.plan] || ''}`} variant="secondary">
                  {tenant.plan.toUpperCase()}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t('Active Modules')}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setModuleDialogOpen(true)}>
                  {t('Manage Modules')}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tenant.activeModules.length > 0 ? (
                    tenant.activeModules.map((m) => (
                      <Badge key={m} variant="secondary">{t(m)}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('No active modules')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoices */}
          <Card>
            <CardHeader><CardTitle className="text-base">{t('Invoices')}</CardTitle></CardHeader>
            <CardContent>
              {tenant.invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Status')}</TableHead>
                      <TableHead className="text-right">{t('Amount')}</TableHead>
                      <TableHead>{t('Created')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenant.invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell><Badge variant={inv.status === 'paid' ? 'default' : 'secondary'}>{inv.status}</Badge></TableCell>
                        <TableCell className="text-right tabular-nums">{'\u20AC'}{(inv.amountPaid / 100).toFixed(2)}</TableCell>
                        <TableCell>{formatDate(inv.createdAt, locale)}</TableCell>
                        <TableCell>
                          {inv.invoicePdfUrl && (
                            <a href={inv.invoicePdfUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">{t('No invoices')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader><CardTitle className="text-base">{t('Tenant Users')}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Name')}</TableHead>
                    <TableHead>{t('Email')}</TableHead>
                    <TableHead>{t('Role')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('Last Login')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.fullName || '-'}
                        {user.isSuperAdmin && (
                          <Shield className="inline ml-1 h-3 w-3 text-violet-500" />
                        )}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select value={user.role} onValueChange={(v) => handleRoleChange(user.id, v)}>
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">{t('Admin')}</SelectItem>
                            <SelectItem value="manager">{t('Manager')}</SelectItem>
                            <SelectItem value="user">{t('User')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {user.lastSignInAt ? formatDate(user.lastSignInAt, locale) : t('Never')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits" className="space-y-4">
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            {[
              { label: t('Monthly Allowance'), value: tenant.monthlyAllowance },
              { label: t('Monthly Used'), value: tenant.monthlyUsed },
              { label: t('Purchased Balance'), value: tenant.purchasedBalance },
              { label: t('Total Available'), value: totalCredits },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold tabular-nums">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { setCreditAmount(0); setCreditReason(''); setCreditDialogOpen(true); }}>
              {t('Adjust Credits')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setNewAllowance(tenant.monthlyAllowance); setAllowanceDialogOpen(true); }}>
              {t('Set Allowance')}
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">{t('Transaction History')}</CardTitle></CardHeader>
            <CardContent>
              {tenant.creditTransactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">{t('Amount')}</TableHead>
                      <TableHead>{t('Reason')}</TableHead>
                      <TableHead>{t('Created')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenant.creditTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell><Badge variant="outline">{tx.type}</Badge></TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{tx.description || tx.source}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(tx.createdAt, locale)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">{t('No transactions')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage">
          <Card>
            <CardHeader><CardTitle className="text-base">{t('Resource Usage')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: t('Products'), value: tenant.usage.products },
                { label: t('Documents'), value: tenant.usage.documents },
                { label: t('Admin Users'), value: tenant.usage.adminUsers },
                { label: t('Returns'), value: tenant.usage.returns },
                { label: t('Tickets'), value: tenant.usage.tickets },
                { label: t('Suppliers'), value: tenant.usage.suppliers },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-sm tabular-nums">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle className="text-base">{t('Tenant Settings')}</CardTitle></CardHeader>
            <CardContent>
              <pre className="rounded-lg bg-muted p-4 overflow-auto text-xs max-h-[500px]">
                {JSON.stringify(tenant.settings, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plan Change Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('Change Plan')}</DialogTitle></DialogHeader>
          <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as BillingPlan)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="free">{t('Free')}</SelectItem>
              <SelectItem value="pro">{t('Pro')}</SelectItem>
              <SelectItem value="enterprise">{t('Enterprise')}</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handlePlanChange} disabled={saving}>{t('Confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Module Management Dialog */}
      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('Module Management')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {ALL_MODULES.map((moduleId) => {
              const isActive = tenant.activeModules.includes(moduleId);
              return (
                <div key={moduleId} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t(moduleId)}</span>
                  <Switch checked={isActive} onCheckedChange={(checked) => handleToggleModule(moduleId, checked)} />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialogOpen(false)}>{t('Cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Adjust Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('Adjust credits for')} {tenant.name}</DialogTitle></DialogHeader>
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
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-sm"><strong>{t('New Balance')}:</strong> {tenant.purchasedBalance + creditAmount}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handleAdjustCredits} disabled={saving || !creditAmount}>{t('Confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allowance Dialog */}
      <Dialog open={allowanceDialogOpen} onOpenChange={setAllowanceDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('Set allowance for')} {tenant.name}</DialogTitle></DialogHeader>
          <div>
            <Label>{t('Monthly AI Credits')}</Label>
            <Input type="number" value={newAllowance} onChange={(e) => setNewAllowance(Number(e.target.value))} min={0} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllowanceDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handleSetAllowance} disabled={saving}>{t('Confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
