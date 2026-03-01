/**
 * Campaign Events Service
 * Timeline / activity log for campaigns
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { WhCampaignEvent, WhCampaignEventInput } from '@/types/warehouse';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformCampaignEvent(row: any): WhCampaignEvent {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    campaignId: row.campaign_id,
    eventType: row.event_type,
    description: row.description || undefined,
    actorId: row.actor_id || undefined,
    actorType: row.actor_type || 'user',
    contactId: row.contact_id || undefined,
    shipmentId: row.shipment_id || undefined,
    contentPostId: row.content_post_id || undefined,
    metadata: row.metadata || undefined,
    createdAt: row.created_at,
  };
}

export async function getCampaignEvents(
  campaignId: string,
  limit?: number
): Promise<WhCampaignEvent[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let query = supabase
    .from('wh_campaign_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to load campaign events:', error);
    return [];
  }
  return (data || []).map(transformCampaignEvent);
}

export async function getRecentEvents(limit = 20): Promise<WhCampaignEvent[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('wh_campaign_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load recent events:', error);
    return [];
  }
  return (data || []).map(transformCampaignEvent);
}

export async function addCampaignEvent(
  input: WhCampaignEventInput
): Promise<WhCampaignEvent> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  const { data, error } = await supabase
    .from('wh_campaign_events')
    .insert({
      tenant_id: tenantId,
      campaign_id: input.campaignId,
      event_type: input.eventType,
      description: input.description || null,
      actor_id: userId || null,
      actor_type: input.actorType || 'user',
      contact_id: input.contactId || null,
      shipment_id: input.shipmentId || null,
      content_post_id: input.contentPostId || null,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add campaign event: ${error.message}`);
  return transformCampaignEvent(data);
}
