/**
 * Campaign Influencers Service
 * CRUD for wh_campaign_influencers junction table
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  WhCampaignInfluencer,
  WhCampaignInfluencerInput,
  CampaignInfluencerStatus,
} from '@/types/warehouse';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformCampaignInfluencer(row: any): WhCampaignInfluencer {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    campaignId: row.campaign_id,
    contactId: row.contact_id,
    status: row.status,
    budgetAllocated: Number(row.budget_allocated) || 0,
    budgetSpent: Number(row.budget_spent) || 0,
    currency: row.currency || 'EUR',
    deliverables: row.deliverables || [],
    compensationType: row.compensation_type || 'product_only',
    contractTerms: row.contract_terms || undefined,
    paymentTerms: row.payment_terms || undefined,
    notes: row.notes || undefined,
    invitedAt: row.invited_at || undefined,
    acceptedAt: row.accepted_at || undefined,
    completedAt: row.completed_at || undefined,
    shipmentId: row.shipment_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contact: row.wh_contacts ? {
      id: row.wh_contacts.id,
      tenantId: row.wh_contacts.tenant_id,
      type: row.wh_contacts.type,
      companyName: row.wh_contacts.company_name || undefined,
      contactName: row.wh_contacts.contact_name,
      email: row.wh_contacts.email || undefined,
      phone: row.wh_contacts.phone || undefined,
      street: row.wh_contacts.street || undefined,
      city: row.wh_contacts.city || undefined,
      state: row.wh_contacts.state || undefined,
      postalCode: row.wh_contacts.postal_code || undefined,
      country: row.wh_contacts.country || undefined,
      customerNumber: row.wh_contacts.customer_number || undefined,
      vatId: row.wh_contacts.vat_id || undefined,
      notes: row.wh_contacts.notes || undefined,
      tags: row.wh_contacts.tags || [],
      isActive: row.wh_contacts.is_active ?? true,
      instagramHandle: row.wh_contacts.instagram_handle || undefined,
      tiktokHandle: row.wh_contacts.tiktok_handle || undefined,
      youtubeHandle: row.wh_contacts.youtube_handle || undefined,
      otherSocialUrl: row.wh_contacts.other_social_url || undefined,
      primaryPlatform: row.wh_contacts.primary_platform || undefined,
      followerCount: row.wh_contacts.follower_count != null ? Number(row.wh_contacts.follower_count) : undefined,
      engagementRate: row.wh_contacts.engagement_rate != null ? Number(row.wh_contacts.engagement_rate) : undefined,
      niche: row.wh_contacts.niche || undefined,
      influencerTier: row.wh_contacts.influencer_tier || undefined,
      createdAt: row.wh_contacts.created_at,
      updatedAt: row.wh_contacts.updated_at,
    } : undefined,
  };
}

export async function getCampaignInfluencers(
  campaignId: string,
  filters?: { status?: CampaignInfluencerStatus }
): Promise<WhCampaignInfluencer[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let query = supabase
    .from('wh_campaign_influencers')
    .select('*, wh_contacts(*)')
    .eq('tenant_id', tenantId)
    .eq('campaign_id', campaignId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load campaign influencers:', error);
    return [];
  }
  return (data || []).map(transformCampaignInfluencer);
}

export async function getInfluencerCampaigns(contactId: string): Promise<WhCampaignInfluencer[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('wh_campaign_influencers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load influencer campaigns:', error);
    return [];
  }
  return (data || []).map(transformCampaignInfluencer);
}

export async function addInfluencerToCampaign(
  input: WhCampaignInfluencerInput
): Promise<WhCampaignInfluencer> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { data, error } = await supabase
    .from('wh_campaign_influencers')
    .insert({
      tenant_id: tenantId,
      campaign_id: input.campaignId,
      contact_id: input.contactId,
      status: input.status || 'invited',
      budget_allocated: input.budgetAllocated || 0,
      budget_spent: input.budgetSpent || 0,
      currency: input.currency || 'EUR',
      deliverables: input.deliverables || [],
      compensation_type: input.compensationType || 'product_only',
      contract_terms: input.contractTerms || null,
      payment_terms: input.paymentTerms || null,
      notes: input.notes || null,
      shipment_id: input.shipmentId || null,
    })
    .select('*, wh_contacts(*)')
    .single();

  if (error) throw new Error(`Failed to add influencer to campaign: ${error.message}`);

  // Log event
  const { addCampaignEvent } = await import('./wh-campaign-events');
  await addCampaignEvent({
    campaignId: input.campaignId,
    eventType: 'influencer_added',
    contactId: input.contactId,
    description: 'Influencer added to campaign',
  }).catch(() => {});

  return transformCampaignInfluencer(data);
}

export async function updateInfluencerStatus(
  id: string,
  status: CampaignInfluencerStatus,
  campaignId?: string
): Promise<WhCampaignInfluencer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = { status };

  if (status === 'accepted') update.accepted_at = new Date().toISOString();
  if (status === 'completed') update.completed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('wh_campaign_influencers')
    .update(update)
    .eq('id', id)
    .select('*, wh_contacts(*)')
    .single();

  if (error) throw new Error(`Failed to update influencer status: ${error.message}`);

  // Log event
  if (campaignId) {
    const { addCampaignEvent } = await import('./wh-campaign-events');
    await addCampaignEvent({
      campaignId,
      eventType: 'influencer_status_changed',
      contactId: data.contact_id,
      description: `Status changed to ${status}`,
      metadata: { newStatus: status },
    }).catch(() => {});
  }

  return transformCampaignInfluencer(data);
}

export async function updateInfluencerBudget(
  id: string,
  budgetAllocated: number,
  budgetSpent: number
): Promise<WhCampaignInfluencer> {
  const { data, error } = await supabase
    .from('wh_campaign_influencers')
    .update({
      budget_allocated: budgetAllocated,
      budget_spent: budgetSpent,
    })
    .eq('id', id)
    .select('*, wh_contacts(*)')
    .single();

  if (error) throw new Error(`Failed to update influencer budget: ${error.message}`);
  return transformCampaignInfluencer(data);
}

export async function removeInfluencerFromCampaign(
  id: string,
  campaignId?: string,
  contactId?: string
): Promise<void> {
  const { error } = await supabase
    .from('wh_campaign_influencers')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to remove influencer: ${error.message}`);

  // Log event
  if (campaignId) {
    const { addCampaignEvent } = await import('./wh-campaign-events');
    await addCampaignEvent({
      campaignId,
      eventType: 'influencer_removed',
      contactId,
      description: 'Influencer removed from campaign',
    }).catch(() => {});
  }
}
