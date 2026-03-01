import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Megaphone, Users, TrendingUp, Package, Camera,
  DollarSign, Eye, AlertTriangle, Plus, UserPlus, Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import { getInfluencerHubStats } from '@/services/supabase/wh-influencer-hub';
import { InfluencerKPICard } from '@/components/warehouse/influencer/InfluencerKPICard';
import { EngagementTrendChart } from '@/components/warehouse/influencer/EngagementTrendChart';
import { PlatformDonutChart } from '@/components/warehouse/influencer/PlatformDonutChart';
import { InfluencerLeaderboard } from '@/components/warehouse/influencer/InfluencerLeaderboard';
import { ActivityFeed } from '@/components/warehouse/influencer/ActivityFeed';
import { DeadlinesList } from '@/components/warehouse/influencer/DeadlinesList';
import type {
  InfluencerHubStats,
  InfluencerRanking,
  ActivityItem,
  DeadlineItem,
  PlatformBreakdown,
} from '@/types/warehouse';

export function InfluencerHubPage() {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InfluencerHubStats | null>(null);
  const [topInfluencers, setTopInfluencers] = useState<InfluencerRanking[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<DeadlineItem[]>([]);
  const [platformBreakdown, setPlatformBreakdown] = useState<PlatformBreakdown[]>([]);

  const kpiVisible = useStaggeredList(8);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInfluencerHubStats();
      setStats(data.stats);
      setTopInfluencers(data.topInfluencers);
      setRecentActivity(data.recentActivity);
      setUpcomingDeadlines(data.upcomingDeadlines);
      setPlatformBreakdown(data.platformBreakdown);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Active Campaigns', value: stats?.activeCampaigns ?? 0, icon: Megaphone, color: 'purple' },
    { label: 'Total Reach', value: stats?.totalReach ?? 0, icon: Users, color: 'blue' },
    { label: 'Avg Engagement', value: stats?.avgEngagement ?? 0, icon: TrendingUp, color: 'green', format: 'percent' as const },
    { label: 'Samples Out', value: stats?.samplesOut ?? 0, icon: Package, color: 'amber' },
    { label: 'Content Received', value: stats?.contentReceived ?? 0, icon: Camera, color: 'pink' },
    { label: 'Budget Spent', value: stats?.budgetSpent ?? 0, icon: DollarSign, color: 'emerald', format: 'currency' as const },
    { label: 'Total Views', value: stats?.totalViews ?? 0, icon: Eye, color: 'sky' },
    { label: 'Overdue Items', value: stats?.overdueItems ?? 0, icon: AlertTriangle, color: 'red' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 border rounded-xl p-6">
        <h1 className="bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent text-2xl font-bold">
          {t('Influencer Hub')}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('Manage campaigns, track content, and measure influencer performance')}
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            size="sm"
            onClick={() => navigate('/warehouse/campaigns/new')}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {t('New Campaign')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/warehouse/contacts')}
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            {t('Add Influencer')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/warehouse/shipments')}
          >
            <Truck className="h-4 w-4 mr-1.5" />
            {t('Send Samples')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4">
        {kpis.map((kpi, i) => (
          <InfluencerKPICard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            color={kpi.color}
            format={kpi.format}
            isVisible={kpiVisible[i]}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <EngagementTrendChart className="lg:col-span-2" />
        <PlatformDonutChart data={platformBreakdown} />
      </div>

      {/* Detail Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <InfluencerLeaderboard influencers={topInfluencers} />
        <ActivityFeed activities={recentActivity} />
        <DeadlinesList deadlines={upcomingDeadlines} />
      </div>
    </div>
  );
}
