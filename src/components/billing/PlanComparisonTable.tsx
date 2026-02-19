/**
 * PlanComparisonTable -- Feature matrix comparing Free vs Pro vs Enterprise.
 */

import { useTranslation } from 'react-i18next';
import { Check, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BillingPlan } from '@/types/billing';
import { PLAN_CONFIGS } from '@/types/billing';

interface PlanComparisonTableProps {
  currentPlan: BillingPlan;
  interval: 'monthly' | 'yearly';
}

type CellValue = string | number | boolean;

interface FeatureRow {
  label: string;
  free: CellValue;
  pro: CellValue;
  enterprise: CellValue;
}

export function PlanComparisonTable({ currentPlan, interval }: PlanComparisonTableProps) {
  const { t } = useTranslation('billing');

  const plans: { key: BillingPlan; name: string; price: number }[] = [
    {
      key: 'free',
      name: t('Free'),
      price: 0,
    },
    {
      key: 'pro',
      name: t('Pro'),
      price: interval === 'yearly'
        ? Math.round(PLAN_CONFIGS.pro.priceYearly / 12)
        : PLAN_CONFIGS.pro.priceMonthly,
    },
    {
      key: 'enterprise',
      name: t('Enterprise'),
      price: interval === 'yearly'
        ? Math.round(PLAN_CONFIGS.enterprise.priceYearly / 12)
        : PLAN_CONFIGS.enterprise.priceMonthly,
    },
  ];

  const rows: FeatureRow[] = [
    { label: t('Products'), free: '5', pro: '50', enterprise: t('Unlimited') },
    { label: t('Batches per product'), free: '3', pro: '20', enterprise: t('Unlimited') },
    { label: t('Documents'), free: '10', pro: '200', enterprise: t('Unlimited') },
    { label: t('Admin Users'), free: '1', pro: '5', enterprise: '25' },
    { label: t('Storage'), free: '100 MB', pro: '2 GB', enterprise: '20 GB' },
    { label: t('AI Credits/month'), free: '3', pro: '25', enterprise: '100' },
    { label: t('DPP Templates'), free: '3', pro: t('All 11'), enterprise: t('All 11 + Custom') },
    { label: t('Custom Branding'), free: false, pro: true, enterprise: true },
    { label: t('DPP Design Customization'), free: false, pro: true, enterprise: true },
    { label: t('QR Code Branding'), free: false, pro: true, enterprise: true },
    { label: t('Full White-Label'), free: false, pro: false, enterprise: true },
    { label: t('Custom CSS'), free: false, pro: false, enterprise: true },
    { label: t('Customs Visibility'), free: false, pro: true, enterprise: true },
    { label: t('Internal Visibility'), free: false, pro: false, enterprise: true },
    { label: t('Full Compliance Access'), free: false, pro: true, enterprise: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('Feature Comparison')}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-3 pr-4 text-left font-medium text-muted-foreground">
                {t('Feature')}
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.key}
                  className={cn(
                    'px-4 py-3 text-center font-medium',
                    plan.key === currentPlan && 'bg-primary/5',
                    plan.key === 'pro' && 'relative',
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{plan.name}</span>
                      {plan.key === currentPlan && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {t('Current')}
                        </Badge>
                      )}
                    </div>
                    <div className="text-lg font-bold">
                      {plan.price === 0 ? t('Free') : `\u20AC${plan.price}/${t('mo')}`}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2.5 pr-4 text-muted-foreground">
                  {row.label}
                </td>
                {(['free', 'pro', 'enterprise'] as const).map((planKey) => {
                  const value = row[planKey];
                  return (
                    <td
                      key={planKey}
                      className={cn(
                        'px-4 py-2.5 text-center',
                        planKey === currentPlan && 'bg-primary/5',
                      )}
                    >
                      <CellDisplay value={value} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function CellDisplay({ value }: { value: CellValue }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="mx-auto h-4 w-4 text-green-600" />
    ) : (
      <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />
    );
  }
  return <span className="font-medium">{value}</span>;
}
