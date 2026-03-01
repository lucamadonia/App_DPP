import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import type { WhCampaign } from '@/types/warehouse';

interface CampaignComparisonChartProps {
  campaigns: WhCampaign[];
  className?: string;
}

export function CampaignComparisonChart({ campaigns, className }: CampaignComparisonChartProps) {
  const { t } = useTranslation('warehouse');
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const withBudget = campaigns.filter((c) => c.budget != null && c.budget > 0);

  if (withBudget.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('Campaign Comparison')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <BarChart3 className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">{t('No campaign data')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxBudget = Math.max(...withBudget.map((c) => c.budget ?? 0));

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('Campaign Comparison')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {withBudget.slice(0, 8).map((campaign) => {
          const budget = campaign.budget ?? 0;
          const widthPercent = maxBudget > 0 ? (budget / maxBudget) * 100 : 0;

          return (
            <div key={campaign.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate font-medium max-w-[60%]">{campaign.name}</span>
                <span className="text-muted-foreground text-xs shrink-0">
                  {campaign.currency === 'EUR' ? '\u20AC' : campaign.currency}{' '}
                  {budget.toLocaleString()}
                </span>
              </div>
              <div className="h-5 rounded bg-muted overflow-hidden">
                <div
                  className="h-full rounded bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-700 ease-out"
                  style={{ width: animated ? `${widthPercent}%` : '0%' }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
