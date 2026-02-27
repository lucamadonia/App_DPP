/**
 * ModuleCard — Displays an add-on module with price, status, and activate action.
 */

import { useTranslation } from 'react-i18next';
import { Check, Lock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ModuleId, BillingPlan } from '@/types/billing';
import { MODULE_CONFIGS } from '@/types/billing';

interface ModuleCardProps {
  moduleId: ModuleId;
  isActive: boolean;
  currentPlan: BillingPlan;
  activeModules?: Set<ModuleId>;
  onActivate: (moduleId: ModuleId) => void;
  onManage: (moduleId: ModuleId) => void;
  isLoading?: boolean;
}

export function ModuleCard({
  moduleId,
  isActive,
  currentPlan,
  activeModules,
  onActivate,
  onManage,
  isLoading,
}: ModuleCardProps) {
  const { t } = useTranslation('billing');
  const config = MODULE_CONFIGS[moduleId];
  const planOrder: Record<BillingPlan, number> = { free: 0, pro: 1, enterprise: 2 };
  const meetsRequirement = planOrder[currentPlan] >= planOrder[config.requiresPlan];
  const missingDependency = config.requiresModule?.length
    ? !config.requiresModule.some(dep => activeModules?.has(dep))
    : false;

  const features = getModuleFeatures(moduleId, t);

  return (
    <Card className={cn(
      'flex flex-col',
      isActive && 'border-green-300 dark:border-green-700',
      (!meetsRequirement || missingDependency) && !isActive && 'opacity-60',
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{config.name}</CardTitle>
          {isActive && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <Check className="mr-1 h-3 w-3" />
              {t('Active')}
            </Badge>
          )}
        </div>
        <CardDescription>
          {getModuleDescription(moduleId, t)}
        </CardDescription>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-bold">€{config.priceMonthly}</span>
          <span className="text-muted-foreground">/{t('mo')}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {features.length > 0 && (
          <ul className="flex-1 space-y-1.5 mb-4">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}

        {!meetsRequirement ? (
          <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" />
            <span>{t('Requires {{plan}} plan', { plan: config.requiresPlan === 'pro' ? 'Pro' : 'Enterprise' })}</span>
          </div>
        ) : missingDependency ? (
          <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" />
            <span>{t('Requires {{module}}', { module: MODULE_CONFIGS[config.requiresModule![0]].name })}</span>
          </div>
        ) : isActive ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onManage(moduleId)}
          >
            {t('Manage')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() => onActivate(moduleId)}
            disabled={isLoading}
          >
            {t('Activate')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function getModuleDescription(moduleId: ModuleId, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const descriptions: Record<ModuleId, string> = {
    returns_hub_starter: t('Basic returns management with up to 50 returns/month'),
    returns_hub_professional: t('Advanced returns with tickets, workflows and 300 returns/month'),
    returns_hub_business: t('Unlimited returns, webhooks, API access and full customization'),
    supplier_portal: t('Invite suppliers to self-register and manage their data'),
    customer_portal: t('Self-service portal for customers to track returns and tickets'),
    custom_domain: t('Serve your portal under your own domain with full white-labeling'),
    warehouse_starter: t('Basic warehouse management with 1 location and 100 shipments/month'),
    warehouse_professional: t('Multi-warehouse with transfers, labels and 500 shipments/month'),
    warehouse_business: t('Unlimited warehouses, shipments, API access and webhooks'),
  };
  return descriptions[moduleId];
}

function getModuleFeatures(moduleId: ModuleId, t: (key: string, opts?: Record<string, unknown>) => string): string[] {
  const config = MODULE_CONFIGS[moduleId];
  const limits = config.limits;
  if (!limits) return [];

  const features: string[] = [];
  // Returns Hub features
  if (limits.maxReturnsPerMonth !== undefined) {
    features.push(t('{{count}} Returns/month', {
      count: isFinite(limits.maxReturnsPerMonth) ? limits.maxReturnsPerMonth : t('Unlimited'),
    }));
  }
  if (limits.ticketsEnabled) features.push(t('Ticket System'));
  if (limits.maxWorkflowRules && limits.maxWorkflowRules > 0) {
    features.push(t('{{count}} Workflow Rules', {
      count: isFinite(limits.maxWorkflowRules) ? limits.maxWorkflowRules : t('Unlimited'),
    }));
  }
  if (limits.webhooksEnabled) features.push(t('Webhooks'));
  if (limits.apiAccess && limits.apiAccess !== 'none') {
    features.push(t('API Access ({{mode}})', { mode: limits.apiAccess }));
  }
  // Warehouse features
  if (limits.maxWarehouseLocations !== undefined) {
    features.push(t('{{count}} Warehouse Locations', {
      count: isFinite(limits.maxWarehouseLocations) ? limits.maxWarehouseLocations : t('Unlimited'),
    }));
  }
  if (limits.maxShipmentsPerMonth !== undefined) {
    features.push(t('{{count}} Shipments/month', {
      count: isFinite(limits.maxShipmentsPerMonth) ? limits.maxShipmentsPerMonth : t('Unlimited'),
    }));
  }
  if (limits.warehouseTransfersEnabled) features.push(t('Multi-Warehouse Transfers'));
  if (limits.warehouseLabelsEnabled) features.push(t('Shipping Labels'));
  if (limits.warehouseCsvEnabled) features.push(t('CSV Import/Export'));
  if (limits.warehouseWebhooksEnabled) features.push(t('Webhooks'));
  if (limits.warehouseApiAccess && limits.warehouseApiAccess !== 'none') {
    features.push(t('API Access ({{mode}})', { mode: limits.warehouseApiAccess }));
  }
  return features;
}
