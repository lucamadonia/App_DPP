import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ModuleCard } from './ModuleCard';
import { useUsageSummary } from '@/hooks/queries';
import { useBillingOptional } from '@/hooks/use-billing';
import { cn } from '@/lib/utils';

function QuotaBar({ label, current, limit }: { label: string; current: number; limit: number }) {
  const { t } = useTranslation('dashboard');
  const unlimited = !Number.isFinite(limit) || limit <= 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((current / limit) * 100));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {unlimited ? `${current} · ${t('Unlimited')}` : `${current} / ${limit}`}
        </span>
      </div>
      {!unlimited && (
        <Progress
          value={pct}
          className={cn(
            'h-1.5',
            pct >= 100
              ? '[&>[data-slot=progress-indicator]]:bg-destructive'
              : pct >= 80
                ? '[&>[data-slot=progress-indicator]]:bg-warning'
                : undefined,
          )}
        />
      )}
    </div>
  );
}

export function CreditsQuotaCard({ className }: { className?: string }) {
  const { t } = useTranslation('dashboard');
  const billing = useBillingOptional();
  const usage = useUsageSummary();

  const credits = billing?.entitlements?.credits;
  const plan = billing?.entitlements?.plan;
  const isLoading = (!billing?.entitlements && !billing?.error) || usage.isLoading;

  return (
    <ModuleCard
      title={t('Plan & Usage')}
      icon={Sparkles}
      to="/settings/billing"
      accentClassName="text-primary"
      headerExtra={
        plan ? (
          <Badge variant="secondary" className="ml-1 text-[10px] uppercase tracking-wide">
            {plan}
          </Badge>
        ) : undefined
      }
      isLoading={isLoading}
      isError={usage.isError}
      onRetry={() => usage.refetch()}
      className={className}
    >
      <div className="space-y-4">
        {credits && (
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
                {credits.totalAvailable}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {t('{{used}} of {{total}} used', {
                  used: credits.monthlyUsed,
                  total: credits.monthlyAllowance,
                })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{t('AI credits')}</p>
            <Progress
              value={
                credits.monthlyAllowance > 0
                  ? Math.min(100, (credits.monthlyUsed / credits.monthlyAllowance) * 100)
                  : 0
              }
              className="mt-2 h-1.5"
            />
          </div>
        )}
        <div className="space-y-3">
          {usage.data?.products && (
            <QuotaBar
              label={t('Products quota')}
              current={usage.data.products.current}
              limit={usage.data.products.limit}
            />
          )}
          {usage.data?.documents && (
            <QuotaBar
              label={t('Documents quota')}
              current={usage.data.documents.current}
              limit={usage.data.documents.limit}
            />
          )}
        </div>
      </div>
    </ModuleCard>
  );
}
