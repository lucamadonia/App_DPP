/**
 * Influencer Hub Aggregation Service
 * Dashboard stats, analytics, and influencer contact queries
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  InfluencerHubStats,
  InfluencerRanking,
  ActivityItem,
  DeadlineItem,
  PlatformBreakdown,
  CampaignAnalytics,
  WhContact,
  WhCampaign,
  CampaignStats,
  WhContentPost,
  SocialPlatform,
  InfluencerTier,
} from '@/types/warehouse';

export async function getInfluencerHubStats(): Promise<{
  stats: InfluencerHubStats;
  topInfluencers: InfluencerRanking[];
  recentActivity: ActivityItem[];
  upcomingDeadlines: DeadlineItem[];
  platformBreakdown: PlatformBreakdown[];
}> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return {
      stats: { activeCampaigns: 0, totalReach: 0, avgEngagement: 0, samplesOut: 0, contentReceived: 0, budgetSpent: 0, totalViews: 0, overdueItems: 0 },
      topInfluencers: [],
      recentActivity: [],
      upcomingDeadlines: [],
      platformBreakdown: [],
    };
  }

  // Parallel queries
  const [campaignsRes, contentRes, shipmentsRes, eventsRes, influencersRes] = await Promise.all([
    supabase.from('wh_campaigns').select('*').eq('tenant_id', tenantId),
    supabase.from('wh_content_posts').select('*').eq('tenant_id', tenantId),
    supabase.from('wh_shipments').select('id, sample_meta').eq('tenant_id', tenantId).not('sample_meta', 'is', null),
    supabase.from('wh_campaign_events').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(15),
    supabase.from('wh_contacts').select('*').eq('tenant_id', tenantId).eq('type', 'influencer'),
  ]);

  const campaigns = campaignsRes.data || [];
  const content = contentRes.data || [];
  const shipments = shipmentsRes.data || [];
  const events = eventsRes.data || [];
  const influencers = influencersRes.data || [];

  // KPI calculations
  const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'outreach' || c.status === 'planning').length;
  const now = new Date();

  let samplesOut = 0;
  let overdueItems = 0;
  const deadlines: DeadlineItem[] = [];

  for (const s of shipments) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = s.sample_meta as any;
    if (!meta) continue;
    const finalStatuses = ['returned', 'kept'];
    if (!finalStatuses.includes(meta.sampleStatus)) {
      samplesOut++;
    }
    // Overdue check
    if (meta.contentDeadline && meta.contentExpected && meta.contentStatus !== 'received' && meta.contentStatus !== 'verified') {
      const dl = new Date(meta.contentDeadline);
      const daysRemaining = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0) overdueItems++;
      if (daysRemaining <= 14) {
        deadlines.push({
          id: s.id,
          type: 'content',
          label: 'Content deadline',
          deadline: meta.contentDeadline,
          daysRemaining,
        });
      }
    }
    if (meta.returnDeadline && meta.returnExpected && meta.sampleStatus === 'return_pending') {
      const dl = new Date(meta.returnDeadline);
      const daysRemaining = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0) overdueItems++;
      if (daysRemaining <= 14) {
        deadlines.push({
          id: s.id + '-return',
          type: 'return',
          label: 'Return deadline',
          deadline: meta.returnDeadline,
          daysRemaining,
        });
      }
    }
  }

  // Campaign end deadlines
  for (const c of campaigns) {
    if (c.end_date && (c.status === 'active' || c.status === 'review')) {
      const dl = new Date(c.end_date);
      const daysRemaining = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 14) {
        deadlines.push({
          id: c.id,
          type: 'campaign_end',
          label: 'Campaign ends',
          campaignName: c.name,
          deadline: c.end_date,
          daysRemaining,
        });
      }
    }
  }

  deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);

  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let contentReceived = 0;
  const platformMap = new Map<SocialPlatform, { count: number; views: number; engagement: number }>();

  for (const p of content) {
    totalViews += p.views || 0;
    totalLikes += p.likes || 0;
    totalComments += p.comments || 0;
    contentReceived++;

    const platform = p.platform as SocialPlatform;
    const existing = platformMap.get(platform) || { count: 0, views: 0, engagement: 0 };
    existing.count++;
    existing.views += p.views || 0;
    existing.engagement += (p.likes || 0) + (p.comments || 0);
    platformMap.set(platform, existing);
  }

  const totalReach = influencers.reduce((sum, i) => sum + (i.follower_count || 0), 0);
  const avgEngagement = influencers.length > 0
    ? influencers.reduce((sum, i) => sum + (Number(i.engagement_rate) || 0), 0) / influencers.length
    : 0;
  const budgetSpent = campaigns.reduce((sum, c) => sum + (Number(c.budget_spent) || 0), 0);

  // Top influencers by content views
  const influencerContentMap = new Map<string, { views: number; count: number }>();
  for (const p of content) {
    if (p.contact_id) {
      const existing = influencerContentMap.get(p.contact_id) || { views: 0, count: 0 };
      existing.views += p.views || 0;
      existing.count++;
      influencerContentMap.set(p.contact_id, existing);
    }
  }

  const topInfluencers: InfluencerRanking[] = influencers
    .map(i => {
      const contentData = influencerContentMap.get(i.id) || { views: 0, count: 0 };
      return {
        contactId: i.id,
        contactName: i.contact_name,
        platform: (i.primary_platform || 'other') as SocialPlatform,
        followerCount: i.follower_count || 0,
        engagementRate: Number(i.engagement_rate) || 0,
        contentCount: contentData.count,
        totalViews: contentData.views,
      };
    })
    .sort((a, b) => b.totalViews - a.totalViews || b.followerCount - a.followerCount)
    .slice(0, 5);

  // Recent activity
  const campaignNameMap = new Map(campaigns.map(c => [c.id, c.name]));
  const contactNameMap = new Map(influencers.map(i => [i.id, i.contact_name]));

  const recentActivity: ActivityItem[] = events.map(e => ({
    id: e.id,
    eventType: e.event_type,
    description: e.description || e.event_type.replace(/_/g, ' '),
    campaignName: e.campaign_id ? campaignNameMap.get(e.campaign_id) : undefined,
    contactName: e.contact_id ? contactNameMap.get(e.contact_id) : undefined,
    createdAt: e.created_at,
  }));

  // Platform breakdown
  const platformBreakdown: PlatformBreakdown[] = Array.from(platformMap.entries()).map(([platform, data]) => ({
    platform,
    count: data.count,
    totalViews: data.views,
    totalEngagement: data.engagement,
  }));

  return {
    stats: {
      activeCampaigns,
      totalReach,
      avgEngagement: Math.round(avgEngagement * 100) / 100,
      samplesOut,
      contentReceived,
      budgetSpent,
      totalViews,
      overdueItems,
    },
    topInfluencers,
    recentActivity,
    upcomingDeadlines: deadlines.slice(0, 10),
    platformBreakdown,
  };
}

export async function getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  const [campaignRes, contentRes, influencersRes] = await Promise.all([
    supabase.from('wh_campaigns').select('*').eq('id', campaignId).single(),
    supabase.from('wh_content_posts').select('*').eq('tenant_id', tenantId).eq('campaign_id', campaignId),
    supabase.from('wh_campaign_influencers').select('*').eq('tenant_id', tenantId).eq('campaign_id', campaignId),
  ]);

  if (!campaignRes.data) return null;

  const campaign: WhCampaign = {
    id: campaignRes.data.id,
    tenantId: campaignRes.data.tenant_id,
    name: campaignRes.data.name,
    description: campaignRes.data.description || undefined,
    status: campaignRes.data.status,
    startDate: campaignRes.data.start_date || undefined,
    endDate: campaignRes.data.end_date || undefined,
    budget: campaignRes.data.budget != null ? Number(campaignRes.data.budget) : undefined,
    budgetSpent: campaignRes.data.budget_spent != null ? Number(campaignRes.data.budget_spent) : undefined,
    currency: campaignRes.data.currency || 'EUR',
    goals: campaignRes.data.goals || undefined,
    productIds: campaignRes.data.product_ids || [],
    tags: campaignRes.data.tags || [],
    createdBy: campaignRes.data.created_by || undefined,
    createdAt: campaignRes.data.created_at,
    updatedAt: campaignRes.data.updated_at,
  };

  const posts = contentRes.data || [];
  const influencerCount = (influencersRes.data || []).length;

  let totalViews = 0;
  let totalLikes = 0;
  let totalEngagement = 0;
  const platformMap = new Map<SocialPlatform, { count: number; views: number; engagement: number }>();

  for (const p of posts) {
    totalViews += p.views || 0;
    totalLikes += p.likes || 0;
    totalEngagement += (p.likes || 0) + (p.comments || 0);

    const platform = p.platform as SocialPlatform;
    const existing = platformMap.get(platform) || { count: 0, views: 0, engagement: 0 };
    existing.count++;
    existing.views += p.views || 0;
    existing.engagement += (p.likes || 0) + (p.comments || 0);
    platformMap.set(platform, existing);
  }

  const stats: CampaignStats = {
    totalShipments: 0,
    totalSamples: 0,
    contentReceived: posts.length,
    contentPending: 0,
    returnsPending: 0,
    totalViews,
    totalLikes,
    totalEngagement,
  };

  const topContent: WhContentPost[] = posts
    .sort((a, b) => ((b.views || 0) + (b.likes || 0)) - ((a.views || 0) + (a.likes || 0)))
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      tenantId: p.tenant_id,
      shipmentId: p.shipment_id,
      campaignId: p.campaign_id || undefined,
      contactId: p.contact_id || undefined,
      platform: p.platform,
      postUrl: p.post_url,
      postedAt: p.posted_at || undefined,
      views: p.views != null ? Number(p.views) : undefined,
      likes: p.likes != null ? Number(p.likes) : undefined,
      comments: p.comments != null ? Number(p.comments) : undefined,
      shares: p.shares != null ? Number(p.shares) : undefined,
      engagementRate: p.engagement_rate != null ? Number(p.engagement_rate) : undefined,
      thumbnailUrl: p.thumbnail_url || undefined,
      estimatedReach: p.estimated_reach != null ? Number(p.estimated_reach) : undefined,
      contentType: p.content_type || undefined,
      notes: p.notes || undefined,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

  return {
    campaign,
    stats,
    influencerCount,
    platformBreakdown: Array.from(platformMap.entries()).map(([platform, data]) => ({
      platform,
      count: data.count,
      totalViews: data.views,
      totalEngagement: data.engagement,
    })),
    topContent,
  };
}

export async function getInfluencerContacts(filters?: {
  tier?: InfluencerTier;
  platform?: SocialPlatform;
  search?: string;
  sort?: 'followers' | 'engagement' | 'name' | 'recent';
}): Promise<WhContact[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let query = supabase
    .from('wh_contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('type', 'influencer');

  if (filters?.tier) {
    query = query.eq('influencer_tier', filters.tier);
  }
  if (filters?.platform) {
    query = query.eq('primary_platform', filters.platform);
  }
  if (filters?.search) {
    query = query.or(
      `contact_name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,instagram_handle.ilike.%${filters.search}%,niche.ilike.%${filters.search}%`
    );
  }

  // Sort
  switch (filters?.sort) {
    case 'followers':
      query = query.order('follower_count', { ascending: false, nullsFirst: false });
      break;
    case 'engagement':
      query = query.order('engagement_rate', { ascending: false, nullsFirst: false });
      break;
    case 'name':
      query = query.order('contact_name', { ascending: true });
      break;
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to load influencer contacts:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type,
    companyName: row.company_name || undefined,
    contactName: row.contact_name,
    email: row.email || undefined,
    phone: row.phone || undefined,
    street: row.street || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    postalCode: row.postal_code || undefined,
    country: row.country || undefined,
    customerNumber: row.customer_number || undefined,
    vatId: row.vat_id || undefined,
    notes: row.notes || undefined,
    tags: row.tags || [],
    isActive: row.is_active ?? true,
    instagramHandle: row.instagram_handle || undefined,
    tiktokHandle: row.tiktok_handle || undefined,
    youtubeHandle: row.youtube_handle || undefined,
    otherSocialUrl: row.other_social_url || undefined,
    primaryPlatform: row.primary_platform || undefined,
    followerCount: row.follower_count != null ? Number(row.follower_count) : undefined,
    engagementRate: row.engagement_rate != null ? Number(row.engagement_rate) : undefined,
    niche: row.niche || undefined,
    influencerTier: row.influencer_tier || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
