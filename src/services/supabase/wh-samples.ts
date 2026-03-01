/**
 * Warehouse Samples Service
 * Sample shipment queries, status updates, dashboard stats, overdue tracking
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  WhShipment,
  SampleStatus,
  ContentStatus,
  SampleDashboardStats,
  SampleShipmentMeta,
} from '@/types/warehouse';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformShipment(row: any): WhShipment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    shipmentNumber: row.shipment_number,
    status: row.status,
    recipientType: row.recipient_type,
    recipientName: row.recipient_name,
    recipientCompany: row.recipient_company || undefined,
    recipientEmail: row.recipient_email || undefined,
    recipientPhone: row.recipient_phone || undefined,
    shippingStreet: row.shipping_street,
    shippingCity: row.shipping_city,
    shippingState: row.shipping_state || undefined,
    shippingPostalCode: row.shipping_postal_code,
    shippingCountry: row.shipping_country,
    carrier: row.carrier || undefined,
    serviceLevel: row.service_level || undefined,
    trackingNumber: row.tracking_number || undefined,
    labelUrl: row.label_url || undefined,
    estimatedDelivery: row.estimated_delivery || undefined,
    shippedAt: row.shipped_at || undefined,
    deliveredAt: row.delivered_at || undefined,
    shippingCost: row.shipping_cost != null ? Number(row.shipping_cost) : undefined,
    currency: row.currency || 'EUR',
    totalWeightGrams: row.total_weight_grams != null ? Number(row.total_weight_grams) : undefined,
    totalItems: row.total_items || 0,
    sourceLocationId: row.source_location_id || undefined,
    orderReference: row.order_reference || undefined,
    customerId: row.customer_id || undefined,
    contactId: row.contact_id || undefined,
    priority: row.priority || 'normal',
    notes: row.notes || undefined,
    internalNotes: row.internal_notes || undefined,
    carrierLabelData: row.carrier_label_data || undefined,
    packedBy: row.packed_by || undefined,
    shippedBy: row.shipped_by || undefined,
    sampleMeta: row.sample_meta || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceLocationName: row.wh_locations?.name || undefined,
  };
}

export async function getSampleShipments(filters?: {
  campaignId?: string;
  sampleStatus?: SampleStatus;
  contactId?: string;
}): Promise<WhShipment[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let query = supabase
    .from('wh_shipments')
    .select('*, wh_locations(name)')
    .eq('tenant_id', tenantId)
    .not('sample_meta', 'is', null);

  if (filters?.contactId) {
    query = query.eq('contact_id', filters.contactId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load sample shipments:', error);
    return [];
  }

  let results = (data || []).map(transformShipment);

  // Filter by campaignId inside sample_meta (client-side JSONB filtering)
  if (filters?.campaignId) {
    results = results.filter(
      (s) => s.sampleMeta?.campaignId === filters.campaignId
    );
  }

  // Filter by sampleStatus inside sample_meta
  if (filters?.sampleStatus) {
    results = results.filter(
      (s) => s.sampleMeta?.sampleStatus === filters.sampleStatus
    );
  }

  return results;
}

export async function updateSampleStatus(
  shipmentId: string,
  status: SampleStatus
): Promise<void> {
  // Fetch current sample_meta to merge
  const { data: current, error: fetchError } = await supabase
    .from('wh_shipments')
    .select('sample_meta')
    .eq('id', shipmentId)
    .single();

  if (fetchError || !current) {
    throw new Error(`Failed to fetch shipment: ${fetchError?.message || 'Not found'}`);
  }

  const meta: SampleShipmentMeta = {
    ...(current.sample_meta as SampleShipmentMeta),
    sampleStatus: status,
  };

  const { error } = await supabase
    .from('wh_shipments')
    .update({ sample_meta: meta })
    .eq('id', shipmentId);

  if (error) throw new Error(`Failed to update sample status: ${error.message}`);
}

export async function updateContentStatus(
  shipmentId: string,
  status: ContentStatus
): Promise<void> {
  // Fetch current sample_meta to merge
  const { data: current, error: fetchError } = await supabase
    .from('wh_shipments')
    .select('sample_meta')
    .eq('id', shipmentId)
    .single();

  if (fetchError || !current) {
    throw new Error(`Failed to fetch shipment: ${fetchError?.message || 'Not found'}`);
  }

  const meta: SampleShipmentMeta = {
    ...(current.sample_meta as SampleShipmentMeta),
    contentStatus: status,
  };

  const { error } = await supabase
    .from('wh_shipments')
    .update({ sample_meta: meta })
    .eq('id', shipmentId);

  if (error) throw new Error(`Failed to update content status: ${error.message}`);
}

export async function getSampleDashboardStats(): Promise<SampleDashboardStats> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return {
      samplesOut: 0,
      awaitingContent: 0,
      returnsPending: 0,
      overdue: 0,
      contentReceived: 0,
      totalCampaigns: 0,
    };
  }

  // Fetch all sample shipments
  const { data: shipments } = await supabase
    .from('wh_shipments')
    .select('sample_meta')
    .eq('tenant_id', tenantId)
    .not('sample_meta', 'is', null);

  const now = new Date().toISOString();
  let samplesOut = 0;
  let awaitingContent = 0;
  let returnsPending = 0;
  let overdue = 0;
  let contentReceived = 0;

  for (const s of shipments || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = s.sample_meta as any as SampleShipmentMeta;
    if (!meta) continue;

    // Samples currently out (not returned, not kept)
    if (meta.sampleStatus === 'distributed' || meta.sampleStatus === 'awaiting_content' || meta.sampleStatus === 'return_pending') {
      samplesOut++;
    }

    if (meta.contentStatus === 'awaiting') {
      awaitingContent++;
    }

    if (meta.sampleStatus === 'return_pending') {
      returnsPending++;
    }

    if (meta.contentStatus === 'received' || meta.contentStatus === 'verified') {
      contentReceived++;
    }

    // Overdue: return deadline or content deadline has passed and not in final state
    const finalSampleStates: SampleStatus[] = ['returned', 'kept'];
    const finalContentStates: ContentStatus[] = ['received', 'verified', 'no_content'];
    const isOverdue =
      (meta.returnDeadline && meta.returnDeadline < now && !finalSampleStates.includes(meta.sampleStatus)) ||
      (meta.contentDeadline && meta.contentDeadline < now && !finalContentStates.includes(meta.contentStatus));

    if (isOverdue) {
      overdue++;
    }
  }

  // Count active campaigns
  const { count: campaignCount } = await supabase
    .from('wh_campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'active']);

  return {
    samplesOut,
    awaitingContent,
    returnsPending,
    overdue,
    contentReceived,
    totalCampaigns: campaignCount || 0,
  };
}

export async function getOverdueSamples(): Promise<WhShipment[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('wh_shipments')
    .select('*, wh_locations(name)')
    .eq('tenant_id', tenantId)
    .not('sample_meta', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load overdue samples:', error);
    return [];
  }

  const now = new Date().toISOString();
  const finalSampleStates: SampleStatus[] = ['returned', 'kept'];
  const finalContentStates: ContentStatus[] = ['received', 'verified', 'no_content'];

  return (data || [])
    .map(transformShipment)
    .filter((s) => {
      const meta = s.sampleMeta;
      if (!meta) return false;

      const returnOverdue =
        meta.returnDeadline &&
        meta.returnDeadline < now &&
        !finalSampleStates.includes(meta.sampleStatus);

      const contentOverdue =
        meta.contentDeadline &&
        meta.contentDeadline < now &&
        !finalContentStates.includes(meta.contentStatus);

      return returnOverdue || contentOverdue;
    });
}
