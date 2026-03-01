import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EngagementTrendChart } from '@/components/warehouse/influencer/EngagementTrendChart';
import { PlatformDonutChart } from '@/components/warehouse/influencer/PlatformDonutChart';
import { CampaignComparisonChart } from '@/components/warehouse/influencer/CampaignComparisonChart';
import { TopContentTable } from '@/components/warehouse/influencer/TopContentTable';
import { InfluencerROITable } from '@/components/warehouse/influencer/InfluencerROITable';
import { getInfluencerHubStats } from '@/services/supabase/wh-influencer-hub';
import { getCampaigns } from '@/services/supabase/wh-campaigns';
import type { InfluencerHubStats, PlatformBreakdown, WhCampaign } from '@/types/warehouse';

export function InfluencerAnalyticsPage() {
  const { t } = useTranslation('warehouse');
  const [_stats, setStats] = useState<InfluencerHubStats | null>(null);
  const [platformBreakdown, setPlatformBreakdown] = useState<PlatformBreakdown[]>([]);
  const [campaigns, setCampaigns] = useState<WhCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getInfluencerHubStats(),
      getCampaigns(),
    ])
      .then(([hubData, campaignData]) => {
        setStats(hubData.stats);
        setPlatformBreakdown(hubData.platformBreakdown);
        setCampaigns(campaignData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <Skeleton className="h-7 sm:h-8 w-48 sm:w-64 mb-2" />
          <Skeleton className="h-4 w-64 sm:w-96" />
        </div>
        <Skeleton className="h-[200px] sm:h-[240px] w-full rounded-lg" />
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          <Skeleton className="h-[250px] sm:h-[300px] rounded-lg" />
          <Skeleton className="h-[250px] sm:h-[300px] rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Gradient Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
          <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-pink-600" />
          {t('Influencer Analytics')}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {t('Comprehensive performance insights across campaigns and influencers')}
        </p>
      </div>

      {/* Engagement overview - full width */}
      <EngagementTrendChart />

      {/* Row 1: Platform Donut + Campaign Comparison */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <PlatformDonutChart data={platformBreakdown} />
        <CampaignComparisonChart campaigns={campaigns} />
      </div>

      {/* Row 2: Top Content + Influencer ROI */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <TopContentTable />
        <InfluencerROITable />
      </div>
    </div>
  );
}
