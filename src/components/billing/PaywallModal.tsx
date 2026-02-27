/**
 * PaywallModal -- Elegant paywall dialog shown when a user
 * clicks a feature locked behind a plan or module.
 */

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Lock, Check, ArrowRight, Sparkles, Crown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ModuleId, BillingPlan } from '@/types/billing';
import { MODULE_CONFIGS, PLAN_CONFIGS } from '@/types/billing';

type PaywallType = 'module' | 'plan' | 'quota';

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: PaywallType;
  /** Required for type='module' */
  moduleId?: ModuleId;
  /** Required for type='plan' -- the minimum plan needed */
  requiredPlan?: BillingPlan;
  /** Required for type='quota' */
  quotaInfo?: { resource: string; current: number; limit: number };
  /** Custom feature highlights shown as bullet points */
  features?: string[];
}

export function PaywallModal({
  open,
  onOpenChange,
  type,
  moduleId,
  requiredPlan,
  quotaInfo,
  features,
}: PaywallModalProps) {
  const { t } = useTranslation('billing');
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/settings/billing');
  };

  // Module paywall
  if (type === 'module' && moduleId) {
    const config = MODULE_CONFIGS[moduleId];
    const moduleFeatures = features || getModuleHighlights(moduleId, t);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-xl">{config.name}</DialogTitle>
            <DialogDescription className="mt-1">
              {getModulePaywallDescription(moduleId, t)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {moduleFeatures.map((feature, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm text-muted-foreground">
              {t('Starting at')}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{'\u20AC'}{config.priceMonthly}</span>
              <span className="text-sm text-muted-foreground">/{t('mo')}</span>
            </div>
          </div>

          {config.requiresPlan !== 'free' && (
            <p className="text-center text-xs text-muted-foreground">
              {t('Requires {{plan}} plan', {
                plan: config.requiresPlan === 'pro' ? 'Pro' : 'Enterprise',
              })}
            </p>
          )}

          <Button size="lg" className="w-full" onClick={handleUpgrade}>
            {t('View Plans & Activate')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Plan paywall
  if (type === 'plan' && requiredPlan) {
    const planName = requiredPlan === 'pro' ? 'Pro' : 'Enterprise';
    const planConfig = PLAN_CONFIGS[requiredPlan];
    const price = planConfig.priceMonthly;
    const planFeatures = features || getPlanHighlights(requiredPlan, t);
    const PlanIcon = requiredPlan === 'enterprise' ? Crown : Sparkles;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <PlanIcon className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-xl">
              {t('Upgrade to {{plan}}', { plan: planName })}
            </DialogTitle>
            <DialogDescription className="mt-1">
              {t('Unlock this feature and more with {{plan}}', { plan: planName })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {planFeatures.map((feature, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm text-muted-foreground">
              {t('Starting at')}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{'\u20AC'}{price}</span>
              <span className="text-sm text-muted-foreground">/{t('mo')}</span>
            </div>
          </div>

          <Badge variant="secondary" className="mx-auto bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            {t('Save {{percent}}% annually', { percent: 20 })}
          </Badge>

          <Button size="lg" className="w-full" onClick={handleUpgrade}>
            {t('Upgrade to {{plan}}', { plan: planName })}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Quota paywall
  if (type === 'quota' && quotaInfo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/50">
              <Lock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-xl">{t('Quota reached')}</DialogTitle>
            <DialogDescription className="mt-1">
              {t('{{current}}/{{limit}} {{resource}} used. Upgrade to get more.', {
                current: quotaInfo.current,
                limit: quotaInfo.limit,
                resource: quotaInfo.resource,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Visual usage bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{quotaInfo.resource}</span>
                <span className="font-medium">{quotaInfo.current}/{quotaInfo.limit}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={handleUpgrade}>
            {t('View Plans')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}

function getModulePaywallDescription(
  moduleId: ModuleId,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const map: Record<ModuleId, string> = {
    returns_hub_starter: t('Manage customer returns efficiently with automated workflows'),
    returns_hub_professional: t('Advanced returns with tickets, workflows and 300 returns/month'),
    returns_hub_business: t('Unlimited returns, webhooks, API access and full customization'),
    supplier_portal: t('Invite suppliers to self-register and manage their data'),
    customer_portal: t('Self-service portal for customers to track returns and tickets'),
    custom_domain: t('Serve your portal under your own domain with full white-labeling'),
    warehouse_starter: t('Basic inventory management with 1 warehouse location'),
    warehouse_professional: t('Multi-location warehouse with transfers and shipping labels'),
    warehouse_business: t('Unlimited warehouse operations with API and webhooks'),
  };
  return map[moduleId];
}

function getModuleHighlights(
  moduleId: ModuleId,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string[] {
  const map: Record<ModuleId, string[]> = {
    returns_hub_starter: [
      t('Up to 50 returns per month'),
      t('Automated status tracking'),
      t('Email notifications'),
      t('Return registration portal'),
    ],
    returns_hub_professional: [
      t('Up to 300 returns per month'),
      t('Ticket system for support'),
      t('5 workflow automation rules'),
      t('Full email template editor'),
    ],
    returns_hub_business: [
      t('Unlimited returns'),
      t('Webhooks & API access'),
      t('Unlimited workflow rules'),
      t('Priority support'),
    ],
    supplier_portal: [
      t('Invite-based supplier registration'),
      t('Supplier data management'),
      t('Approval workflow'),
      t('Supplier directory'),
    ],
    customer_portal: [
      t('Customer self-service'),
      t('Return tracking'),
      t('Ticket creation'),
      t('Branded portal'),
    ],
    custom_domain: [
      t('Custom domain setup'),
      t('DNS verification wizard'),
      t('Full white-labeling'),
      t('SSL included'),
    ],
    warehouse_starter: [
      t('1 warehouse location'),
      t('100 shipments per month'),
      t('Goods receipt & stock tracking'),
      t('Basic inventory management'),
    ],
    warehouse_professional: [
      t('5 warehouse locations'),
      t('500 shipments per month'),
      t('Stock transfers between locations'),
      t('Shipping labels & barcode scanning'),
    ],
    warehouse_business: [
      t('Unlimited locations & shipments'),
      t('Full API access'),
      t('Webhooks for automation'),
      t('Advanced stock alerts'),
    ],
  };
  return map[moduleId] || [];
}

function getPlanHighlights(
  plan: BillingPlan,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string[] {
  if (plan === 'pro') {
    return [
      t('50 Products, 200 Documents'),
      t('All 11 DPP Templates'),
      t('Custom Branding'),
      t('25 AI Credits/month'),
      t('Customs & Consumer visibility'),
    ];
  }
  return [
    t('Unlimited Products & Documents'),
    t('Full White-Label'),
    t('Custom CSS support'),
    t('100 AI Credits/month'),
    t('25 Admin Users'),
  ];
}
