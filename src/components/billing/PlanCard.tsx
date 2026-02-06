/**
 * PlanCard — Displays a plan tier with features, price, and upgrade action.
 */

import { useTranslation } from 'react-i18next';
import { Check, Crown, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BillingPlan } from '@/types/billing';
import { PLAN_CONFIGS } from '@/types/billing';

interface PlanCardProps {
  plan: BillingPlan;
  currentPlan: BillingPlan;
  onSelect: (plan: BillingPlan) => void;
  isLoading?: boolean;
  interval?: 'monthly' | 'yearly';
}

export function PlanCard({ plan, currentPlan, onSelect, isLoading, interval = 'monthly' }: PlanCardProps) {
  const { t } = useTranslation('billing');
  const config = PLAN_CONFIGS[plan];
  const isCurrent = plan === currentPlan;
  const isUpgrade = planOrder(plan) > planOrder(currentPlan);
  const isDowngrade = planOrder(plan) < planOrder(currentPlan);
  const price = interval === 'yearly'
    ? Math.round(config.priceYearly / 12)
    : config.priceMonthly;

  const features = getPlanFeatures(plan, t);

  return (
    <Card className={cn(
      'relative flex flex-col',
      isCurrent && 'border-primary ring-1 ring-primary',
      plan === 'pro' && !isCurrent && 'border-blue-200 dark:border-blue-800',
    )}>
      {plan === 'pro' && (
        <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white">
          <Sparkles className="mr-1 h-3 w-3" />
          {t('Most Popular')}
        </Badge>
      )}
      {plan === 'enterprise' && (
        <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white">
          <Crown className="mr-1 h-3 w-3" />
          {t('Full Power')}
        </Badge>
      )}
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{getPlanName(plan, t)}</CardTitle>
        <CardDescription>{getPlanDescription(plan, t)}</CardDescription>
        <div className="mt-3">
          {price === 0 ? (
            <span className="text-3xl font-bold">{t('Free')}</span>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">€{price}</span>
              <span className="text-muted-foreground">/{t('mo')}</span>
            </div>
          )}
          {interval === 'yearly' && config.priceYearly > 0 && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              {t('Save {{percent}}% annually', { percent: 20 })}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <ul className="flex-1 space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          {isCurrent ? (
            <Button variant="outline" className="w-full" disabled>
              {t('Current Plan')}
            </Button>
          ) : isUpgrade ? (
            <Button
              className="w-full"
              onClick={() => onSelect(plan)}
              disabled={isLoading}
            >
              {t('Upgrade to {{plan}}', { plan: getPlanName(plan, t) })}
            </Button>
          ) : isDowngrade ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onSelect(plan)}
              disabled={isLoading}
            >
              {t('Downgrade')}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function planOrder(plan: BillingPlan): number {
  return { free: 0, pro: 1, enterprise: 2 }[plan];
}

function getPlanName(plan: BillingPlan, t: (key: string, opts?: Record<string, unknown>) => string): string {
  return { free: t('Free'), pro: t('Pro'), enterprise: t('Enterprise') }[plan];
}

function getPlanDescription(plan: BillingPlan, t: (key: string, opts?: Record<string, unknown>) => string): string {
  return {
    free: t('Get started with the basics'),
    pro: t('For growing businesses'),
    enterprise: t('For large-scale operations'),
  }[plan];
}

function getPlanFeatures(plan: BillingPlan, t: (key: string, opts?: Record<string, unknown>) => string): string[] {
  const c = PLAN_CONFIGS[plan].limits;
  const f = PLAN_CONFIGS[plan].features;

  const unlimited = t('Unlimited');
  const features: string[] = [
    t('{{count}} Products', { count: isFinite(c.maxProducts) ? c.maxProducts : unlimited }),
    t('{{count}} Batches per product', { count: isFinite(c.maxBatchesPerProduct) ? c.maxBatchesPerProduct : unlimited }),
    t('{{count}} Admin Users', { count: c.maxAdminUsers }),
    t('{{count}} Documents', { count: isFinite(c.maxDocuments) ? c.maxDocuments : unlimited }),
    t('{{count}} AI Credits/month', { count: c.monthlyAICredits }),
    t('{{count}} DPP Templates', { count: c.dppTemplates.length }),
  ];

  if (f.customBranding) features.push(t('Custom Branding'));
  if (f.dppDesignCustomization) features.push(t('DPP Design Customization'));
  if (f.whiteLabel) features.push(t('Full White-Label'));
  if (f.complianceFull) features.push(t('Full Compliance Access'));

  return features;
}
