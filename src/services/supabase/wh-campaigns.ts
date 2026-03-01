/**
 * Warehouse Campaigns Service
 * CRUD for wh_campaigns + campaign stats (samples, content tracking)
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  WhCampaign,
  WhCampaignInput,
  CampaignStatus,
  CampaignStats,
} from '@/types/warehouse';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformCampaign(row: any): WhCampaign {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description || undefined,
    status: row.status,
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    budget: row.budget != null ? Number(row.budget) : undefined,
    currency: row.currency || 'EUR',
    goals: row.goals || undefined,
    productIds: row.product_ids || [],
    tags: row.tags || [],
    createdBy: row.created_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCampaigns(filters?: {
  status?: CampaignStatus;
  search?: string;
}): Promise<WhCampaign[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let query = supabase
    .from('wh_campaigns')
    .select('*')
    .eq('tenant_id', tenantId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load campaigns:', error);
    return [];
  }
  return (data || []).map(transformCampaign);
}

export async function getCampaign(id: string): Promise<WhCampaign | null> {
  const { data, error } = await supabase
    .from('wh_campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return transformCampaign(data);
}

export async function createCampaign(input: WhCampaignInput): Promise<WhCampaign> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  const { data, error } = await supabase
    .from('wh_campaigns')
    .insert({
      tenant_id: tenantId,
      name: input.name,
      description: input.description || null,
      status: input.status || 'draft',
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      budget: input.budget || null,
      currency: input.currency || 'EUR',
      goals: input.goals || null,
      product_ids: input.productIds || [],
      tags: input.tags || [],
      created_by: userId || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create campaign: ${error.message}`);
  return transformCampaign(data);
}

export async function updateCampaign(
  id: string,
  input: Partial<WhCampaignInput>
): Promise<WhCampaign> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.description !== undefined) update.description = input.description || null;
  if (input.status !== undefined) update.status = input.status;
  if (input.startDate !== undefined) update.start_date = input.startDate || null;
  if (input.endDate !== undefined) update.end_date = input.endDate || null;
  if (input.budget !== undefined) update.budget = input.budget || null;
  if (input.currency !== undefined) update.currency = input.currency;
  if (input.goals !== undefined) update.goals = input.goals || null;
  if (input.productIds !== undefined) update.product_ids = input.productIds;
  if (input.tags !== undefined) update.tags = input.tags;

  const { data, error } = await supabase
    .from('wh_campaigns')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update campaign: ${error.message}`);
  return transformCampaign(data);
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase
    .from('wh_campaigns')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete campaign: ${error.message}`);
}

export async function getCampaignStats(campaignId: string): Promise<CampaignStats> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return {
      totalShipments: 0,
      totalSamples: 0,
      contentReceived: 0,
      contentPending: 0,
      returnsPending: 0,
      totalViews: 0,
      totalLikes: 0,
      totalEngagement: 0,
    };
  }

  // Fetch sample shipments linked to this campaign via sample_meta->>campaignId
  const { data: shipments } = await supabase
    .from('wh_shipments')
    .select('id, sample_meta')
    .eq('tenant_id', tenantId)
    .not('sample_meta', 'is', null);

  // Filter client-side for campaignId match inside JSONB
  const campaignShipments = (shipments || []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.sample_meta?.campaignId === campaignId
  );

  const totalShipments = campaignShipments.length;
  let totalSamples = 0;
  let contentReceived = 0;
  let contentPending = 0;
  let returnsPending = 0;

  for (const s of campaignShipments) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = s.sample_meta as any;
    totalSamples++;
    if (meta?.contentStatus === 'received' || meta?.contentStatus === 'verified') {
      contentReceived++;
    } else if (meta?.contentExpected && meta?.contentStatus !== 'no_content') {
      contentPending++;
    }
    if (meta?.returnExpected && meta?.sampleStatus === 'return_pending') {
      returnsPending++;
    }
  }

  // Fetch content posts for this campaign
  const { data: posts } = await supabase
    .from('wh_content_posts')
    .select('views, likes, comments, engagement_rate')
    .eq('tenant_id', tenantId)
    .eq('campaign_id', campaignId);

  let totalViews = 0;
  let totalLikes = 0;
  let totalEngagement = 0;

  for (const p of posts || []) {
    totalViews += p.views || 0;
    totalLikes += p.likes || 0;
    totalEngagement += p.comments || 0;
  }
  // Include likes in total engagement
  totalEngagement += totalLikes;

  return {
    totalShipments,
    totalSamples,
    contentReceived,
    contentPending,
    returnsPending,
    totalViews,
    totalLikes,
    totalEngagement,
  };
}
