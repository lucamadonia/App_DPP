/**
 * BillingPage — /settings/billing
 *
 * 4 sections:
 * 1. Current Plan + Usage
 * 2. Add-on Modules
 * 3. AI Credits
 * 4. Invoice History
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useBilling } from '@/hooks/use-billing';
import {
  PlanCard,
  ModuleCard,
  CreditBalanceCard,
  CreditPurchaseModal,
  UsageBar,
  InvoiceTable,
} from '@/components/billing';
import {
  createCheckoutSession,
  createPortalSession,
  getInvoices,
  getUsageSummary,
} from '@/services/supabase/billing';
import type { BillingPlan, ModuleId, BillingInvoice } from '@/types/billing';
import { MODULE_CONFIGS } from '@/types/billing';
import { getPlanPriceId, getModulePriceId } from '@/config/stripe-prices';

export function BillingPage() {
  const { t, i18n } = useTranslation('billing');
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { entitlements, isLoading: billingLoading, refreshEntitlements } = useBilling();
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [usage, setUsage] = useState<Record<string, { current: number; limit: number }>>({});
  const [actionLoading, setActionLoading] = useState(false);

  // Load invoices and usage
  useEffect(() => {
    const load = async () => {
      setInvoicesLoading(true);
      try {
        const [inv, usg] = await Promise.all([getInvoices(), getUsageSummary()]);
        setInvoices(inv);
        setUsage(usg);
      } finally {
        setInvoicesLoading(false);
      }
    };
    load();
  }, []);

  // Show success toast after Stripe redirect
  useEffect(() => {
    if (searchParams.get('credits') === 'success') {
      toast({ title: t('Credits purchased successfully') });
      refreshEntitlements();
      setSearchParams({}, { replace: true });
    } else if (searchParams.get('upgrade') === 'success') {
      toast({ title: t('Plan upgraded successfully') });
      refreshEntitlements();
      setSearchParams({}, { replace: true });
    } else if (searchParams.get('status') === 'success') {
      toast({ title: t('Module activated successfully') });
      refreshEntitlements();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, toast, t, refreshEntitlements]);

  const handlePlanSelect = useCallback(async (plan: BillingPlan) => {
    if (plan === 'free') {
      // Downgrade handled through Stripe Portal
      handleManageBilling();
      return;
    }

    setActionLoading(true);
    try {
      const priceId = getPlanPriceId(plan, interval);
      if (!priceId) return;

      const result = await createCheckoutSession({
        priceId,
        mode: 'subscription',
        successUrl: `${window.location.origin}/settings/billing?upgrade=success`,
        cancelUrl: `${window.location.origin}/settings/billing`,
        metadata: { plan },
        locale: i18n.language,
      });

      if ('url' in result && result.url) {
        window.location.href = result.url;
      } else {
        toast({ title: t('Error'), description: result.error || t('Failed to start checkout. Please try again.'), variant: 'destructive' });
      }
    } finally {
      setActionLoading(false);
    }
  }, [interval, i18n.language, toast, t]);

  const handleModuleActivate = useCallback(async (moduleId: ModuleId) => {
    setActionLoading(true);
    try {
      const priceId = getModulePriceId(moduleId);

      const result = await createCheckoutSession({
        priceId,
        mode: 'subscription',
        successUrl: `${window.location.origin}/settings/billing?module=${moduleId}&status=success`,
        cancelUrl: `${window.location.origin}/settings/billing`,
        metadata: { module: moduleId },
        locale: i18n.language,
      });

      if ('url' in result && result.url) {
        window.location.href = result.url;
      } else {
        toast({ title: t('Error'), description: result.error || t('Failed to start checkout. Please try again.'), variant: 'destructive' });
      }
    } finally {
      setActionLoading(false);
    }
  }, [i18n.language, toast, t]);

  const handleManageBilling = useCallback(async () => {
    setActionLoading(true);
    try {
      const result = await createPortalSession(
        `${window.location.origin}/settings/billing`,
      );
      if ('url' in result && result.url) {
        window.location.href = result.url;
      } else {
        toast({ title: t('Error'), description: result.error || t('Failed to open billing portal. Please try again.'), variant: 'destructive' });
      }
    } finally {
      setActionLoading(false);
    }
  }, [toast, t]);

  const handleModuleManage = useCallback((_moduleId: ModuleId) => {
    handleManageBilling();
  }, [handleManageBilling]);

  if (billingLoading || !entitlements) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPlan = entitlements.plan;
  const allModuleIds = Object.keys(MODULE_CONFIGS) as ModuleId[];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('Billing & Plans')}</h1>
          <p className="text-muted-foreground">{t('Manage your subscription, modules, and AI credits')}</p>
        </div>
        {entitlements.subscription?.stripeSubscriptionId && (
          <Button variant="outline" onClick={handleManageBilling} disabled={actionLoading}>
            <CreditCard className="mr-2 h-4 w-4" />
            {t('Manage Billing')}
            <ExternalLink className="ml-2 h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Cancellation notice */}
      {entitlements.cancelAtPeriodEnd && entitlements.currentPeriodEnd && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="flex items-center gap-3 py-4">
            <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">
              {t('Canceling')}
            </Badge>
            <p className="text-sm">
              {t('Your plan will be downgraded to Free on {{date}}', {
                date: new Date(entitlements.currentPeriodEnd).toLocaleDateString(),
              })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Section 1: Plans + Usage */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('Plans')}</h2>
          <Tabs value={interval} onValueChange={(v) => setInterval(v as 'monthly' | 'yearly')}>
            <TabsList>
              <TabsTrigger value="monthly">{t('Monthly')}</TabsTrigger>
              <TabsTrigger value="yearly">
                {t('Yearly')}
                <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  -20%
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {(['free', 'pro', 'enterprise'] as BillingPlan[]).map((plan) => (
            <PlanCard
              key={plan}
              plan={plan}
              currentPlan={currentPlan}
              onSelect={handlePlanSelect}
              isLoading={actionLoading}
              interval={interval}
            />
          ))}
        </div>

        {/* Usage bars */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('Current Usage')}</CardTitle>
            <CardDescription>{t('Your resource usage for the current billing period')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageBar
              label={t('Products')}
              current={usage.products?.current || 0}
              limit={usage.products?.limit || entitlements.limits.maxProducts}
            />
            <UsageBar
              label={t('Documents')}
              current={usage.documents?.current || 0}
              limit={usage.documents?.limit || entitlements.limits.maxDocuments}
            />
            <UsageBar
              label={t('Admin Users')}
              current={usage.adminUsers?.current || 0}
              limit={usage.adminUsers?.limit || entitlements.limits.maxAdminUsers}
            />
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Section 2: Add-on Modules */}
      <section>
        <h2 className="text-lg font-semibold mb-4">{t('Add-on Modules')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allModuleIds.map((moduleId) => (
            <ModuleCard
              key={moduleId}
              moduleId={moduleId}
              isActive={entitlements.modules.has(moduleId)}
              currentPlan={currentPlan}
              onActivate={handleModuleActivate}
              onManage={handleModuleManage}
              isLoading={actionLoading}
            />
          ))}
        </div>
      </section>

      <Separator />

      {/* Section 3: AI Credits */}
      <section>
        <h2 className="text-lg font-semibold mb-4">{t('AI Credits')}</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <CreditBalanceCard
            credits={entitlements.credits}
            onPurchase={() => setCreditModalOpen(true)}
          />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('Credit Usage')}</CardTitle>
              <CardDescription>{t('How credits are consumed')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {[
                  { op: t('AI Compliance Check (3 phases)'), cost: 3 },
                  { op: t('AI Overall Assessment'), cost: 1 },
                  { op: t('AI Action Plan'), cost: 1 },
                  { op: t('AI Additional Requirements'), cost: 1 },
                  { op: t('AI Chat Message'), cost: 1 },
                  { op: t('PDF Report'), cost: 0 },
                ].map(({ op, cost }) => (
                  <div key={op} className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">{op}</span>
                    <Badge variant={cost > 0 ? 'secondary' : 'outline'}>
                      {cost > 0 ? `${cost} ${cost === 1 ? 'Credit' : 'Credits'}` : t('Free')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Section 4: Invoice History */}
      <section>
        <h2 className="text-lg font-semibold mb-4">{t('Invoice History')}</h2>
        <Card>
          <CardContent className="pt-6">
            <InvoiceTable invoices={invoices} isLoading={invoicesLoading} />
          </CardContent>
        </Card>
      </section>

      {/* Credit Purchase Modal */}
      <CreditPurchaseModal
        open={creditModalOpen}
        onOpenChange={setCreditModalOpen}
      />
    </div>
  );
}
