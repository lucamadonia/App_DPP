/**
 * Warehouse Content Posts Service
 * CRUD for wh_content_posts (influencer content tracking)
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { WhContentPost, WhContentPostInput } from '@/types/warehouse';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformContentPost(row: any): WhContentPost {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    shipmentId: row.shipment_id,
    campaignId: row.campaign_id || undefined,
    contactId: row.contact_id || undefined,
    platform: row.platform,
    postUrl: row.post_url,
    postedAt: row.posted_at || undefined,
    views: row.views != null ? Number(row.views) : undefined,
    likes: row.likes != null ? Number(row.likes) : undefined,
    comments: row.comments != null ? Number(row.comments) : undefined,
    shares: row.shares != null ? Number(row.shares) : undefined,
    engagementRate: row.engagement_rate != null ? Number(row.engagement_rate) : undefined,
    thumbnailUrl: row.thumbnail_url || undefined,
    estimatedReach: row.estimated_reach != null ? Number(row.estimated_reach) : undefined,
    contentType: row.content_type || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getContentPosts(filters?: {
  shipmentId?: string;
  campaignId?: string;
  contactId?: string;
}): Promise<WhContentPost[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let query = supabase
    .from('wh_content_posts')
    .select('*')
    .eq('tenant_id', tenantId);

  if (filters?.shipmentId) {
    query = query.eq('shipment_id', filters.shipmentId);
  }

  if (filters?.campaignId) {
    query = query.eq('campaign_id', filters.campaignId);
  }

  if (filters?.contactId) {
    query = query.eq('contact_id', filters.contactId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load content posts:', error);
    return [];
  }
  return (data || []).map(transformContentPost);
}

export async function getContentPost(id: string): Promise<WhContentPost | null> {
  const { data, error } = await supabase
    .from('wh_content_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return transformContentPost(data);
}

export async function createContentPost(input: WhContentPostInput): Promise<WhContentPost> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { data, error } = await supabase
    .from('wh_content_posts')
    .insert({
      tenant_id: tenantId,
      shipment_id: input.shipmentId,
      campaign_id: input.campaignId || null,
      contact_id: input.contactId || null,
      platform: input.platform,
      post_url: input.postUrl,
      posted_at: input.postedAt || null,
      views: input.views || null,
      likes: input.likes || null,
      comments: input.comments || null,
      shares: input.shares || null,
      engagement_rate: input.engagementRate || null,
      thumbnail_url: input.thumbnailUrl || null,
      estimated_reach: input.estimatedReach || null,
      content_type: input.contentType || 'post',
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create content post: ${error.message}`);
  return transformContentPost(data);
}

export async function updateContentPost(
  id: string,
  input: Partial<WhContentPostInput>
): Promise<WhContentPost> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};
  if (input.shipmentId !== undefined) update.shipment_id = input.shipmentId;
  if (input.campaignId !== undefined) update.campaign_id = input.campaignId || null;
  if (input.contactId !== undefined) update.contact_id = input.contactId || null;
  if (input.platform !== undefined) update.platform = input.platform;
  if (input.postUrl !== undefined) update.post_url = input.postUrl;
  if (input.postedAt !== undefined) update.posted_at = input.postedAt || null;
  if (input.views !== undefined) update.views = input.views || null;
  if (input.likes !== undefined) update.likes = input.likes || null;
  if (input.comments !== undefined) update.comments = input.comments || null;
  if (input.shares !== undefined) update.shares = input.shares || null;
  if (input.engagementRate !== undefined) update.engagement_rate = input.engagementRate || null;
  if (input.thumbnailUrl !== undefined) update.thumbnail_url = input.thumbnailUrl || null;
  if (input.estimatedReach !== undefined) update.estimated_reach = input.estimatedReach || null;
  if (input.contentType !== undefined) update.content_type = input.contentType;
  if (input.notes !== undefined) update.notes = input.notes || null;

  const { data, error } = await supabase
    .from('wh_content_posts')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update content post: ${error.message}`);
  return transformContentPost(data);
}

export async function deleteContentPost(id: string): Promise<void> {
  const { error } = await supabase
    .from('wh_content_posts')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete content post: ${error.message}`);
}
