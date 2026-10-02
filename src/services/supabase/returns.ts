/**
 * Supabase Returns Service
 * Returns CRUD with RLS
 */

import { supabase, supabaseAnon, getCurrentTenantId } from '@/lib/supabase';
import type { RhReturn, ReturnStatus, ReturnsFilter, PaginatedResult, ReturnsHubStats, RhNotificationEventType } from '@/types/returns-hub';
import { generateReturnNumber } from '@/lib/return-number';
import type { TenantSettings } from '@/types/database';
import { triggerEmailNotification, triggerPublicEmailNotification } from './rh-notification-trigger';
import { getPublicTenantBySlug } from './public-tenant';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformReturn(row: any): RhReturn {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    returnNumber: row.return_number,
    status: row.status,
    customerId: row.customer_id || undefined,
    orderId: row.order_id || undefined,
    orderDate: row.order_date || undefined,
    reasonCategory: row.reason_category || undefined,
    reasonSubcategory: row.reason_subcategory || undefined,
    reasonText: row.reason_text || undefined,
    desiredSolution: row.desired_solution || undefined,
    shippingMethod: row.shipping_method || undefined,
    trackingNumber: row.tracking_number || undefined,
    labelUrl: row.label_url || undefined,
    labelExpiresAt: row.label_expires_at || undefined,
    inspectionResult: row.inspection_result || undefined,
    refundAmount: row.refund_amount != null ? Number(row.refund_amount) : undefined,
    refundMethod: row.refund_method || undefined,
    refundReference: row.refund_reference || undefined,
    refundedAt: row.refunded_at || undefined,
    priority: row.priority,
    assignedTo: row.assigned_to || undefined,
    internalNotes: row.internal_notes || undefined,
    customsData: row.customs_data || undefined,
    carrierLabelData: row.carrier_label_data || undefined,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getReturns(
  filter?: ReturnsFilter,
  page = 1,
  pageSize = 20
): Promise<PaginatedResult<RhReturn>> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { data: [], total: 0, page, pageSize, totalPages: 0 };

  let query = supabase
    .from('rh_returns')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filter?.status?.length) {
    query = query.in('status', filter.status);
  }
  if (filter?.priority?.length) {
    query = query.in('priority', filter.priority);
  }
  if (filter?.assignedTo) {
    query = query.eq('assigned_to', filter.assignedTo);
  }
  if (filter?.customerId) {
    query = query.eq('customer_id', filter.customerId);
  }
  if (filter?.dateFrom) {
    query = query.gte('created_at', filter.dateFrom);
  }
  if (filter?.dateTo) {
    query = query.lte('created_at', filter.dateTo);
  }
  if (filter?.search) {
    query = query.or(
      `return_number.ilike.%${filter.search}%,order_id.ilike.%${filter.search}%,reason_text.ilike.%${filter.search}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Failed to load returns:', error);
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const total = count || 0;
  return {
    data: (data || []).map((row) => transformReturn(row)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getReturn(id: string): Promise<RhReturn | null> {
  const { data, error } = await supabase
    .from('rh_returns')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return transformReturn(data);
}

export async function getReturnByNumber(returnNumber: string): Promise<RhReturn | null> {
  const { data, error } = await supabase
    .from('rh_returns')
    .select('*')
    .eq('return_number', returnNumber)
    .single();

  if (error || !data) return null;
  return transformReturn(data);
}

export async function createReturn(
  returnData: Partial<RhReturn> & { returnNumber?: string }
): Promise<{ success: boolean; id?: string; returnNumber?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  // Billing: check returns hub module + quota
  const { hasAnyReturnsHubModule, checkQuota } = await import('./billing');
  const hasRH = await hasAnyReturnsHubModule(tenantId);
  if (!hasRH) {
    return { success: false, error: 'Returns Hub module not active. Please activate it in Billing settings.' };
  }
  const quota = await checkQuota('return', { tenantId });
  if (!quota.allowed) {
    return { success: false, error: `Monthly return limit reached (${quota.current}/${quota.limit}). Please upgrade your Returns Hub plan.` };
  }

  const returnNumber = returnData.returnNumber || generateReturnNumber();

  const insertData = {
    tenant_id: tenantId,
    return_number: returnNumber,
    status: returnData.status || 'CREATED',
    customer_id: returnData.customerId || null,
    order_id: returnData.orderId || null,
    order_date: returnData.orderDate || null,
    reason_category: returnData.reasonCategory || null,
    reason_subcategory: returnData.reasonSubcategory || null,
    reason_text: returnData.reasonText || null,
    desired_solution: returnData.desiredSolution || null,
    shipping_method: returnData.shippingMethod || null,
    tracking_number: returnData.trackingNumber || null,
    priority: returnData.priority || 'normal',
    assigned_to: returnData.assignedTo || null,
    internal_notes: returnData.internalNotes || null,
    customs_data: returnData.customsData || null,
    metadata: returnData.metadata || {},
  };

  const { data, error } = await supabase
    .from('rh_returns')
    .insert(insertData)
    .select('id, return_number')
    .single();

  if (error) {
    console.error('Failed to create return:', error);
    return { success: false, error: error.message };
  }

  // Fire workflow event (fire-and-forget, dynamic import to avoid circular dep)
  import('./rh-workflow-engine').then(({ executeWorkflowsForEvent }) => {
    executeWorkflowsForEvent('return_created', {
      tenantId,
      eventType: 'return_created',
      returnId: data.id,
    });
  }).catch(console.error);

  return { success: true, id: data.id, returnNumber: data.return_number };
}

export async function updateReturn(
  id: string,
  updates: Partial<RhReturn>
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.customerId !== undefined) updateData.customer_id = updates.customerId || null;
  if (updates.orderId !== undefined) updateData.order_id = updates.orderId || null;
  if (updates.orderDate !== undefined) updateData.order_date = updates.orderDate || null;
  if (updates.reasonCategory !== undefined) updateData.reason_category = updates.reasonCategory || null;
  if (updates.reasonSubcategory !== undefined) updateData.reason_subcategory = updates.reasonSubcategory || null;
  if (updates.reasonText !== undefined) updateData.reason_text = updates.reasonText || null;
  if (updates.desiredSolution !== undefined) updateData.desired_solution = updates.desiredSolution || null;
  if (updates.shippingMethod !== undefined) updateData.shipping_method = updates.shippingMethod || null;
  if (updates.trackingNumber !== undefined) updateData.tracking_number = updates.trackingNumber || null;
  if (updates.labelUrl !== undefined) updateData.label_url = updates.labelUrl || null;
  if (updates.labelExpiresAt !== undefined) updateData.label_expires_at = updates.labelExpiresAt || null;
  if (updates.inspectionResult !== undefined) updateData.inspection_result = updates.inspectionResult || null;
  if (updates.refundAmount !== undefined) updateData.refund_amount = updates.refundAmount;
  if (updates.refundMethod !== undefined) updateData.refund_method = updates.refundMethod || null;
  if (updates.refundReference !== undefined) updateData.refund_reference = updates.refundReference || null;
  if (updates.refundedAt !== undefined) updateData.refunded_at = updates.refundedAt || null;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo || null;
  if (updates.internalNotes !== undefined) updateData.internal_notes = updates.internalNotes || null;
  if (updates.customsData !== undefined) updateData.customs_data = updates.customsData || null;
  if (updates.carrierLabelData !== undefined) updateData.carrier_label_data = updates.carrierLabelData || null;
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

  const { error } = await supabase
    .from('rh_returns')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Failed to update return:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateReturnStatus(
  id: string,
  status: ReturnStatus,
  comment?: string,
  actorId?: string
): Promise<{ success: boolean; error?: string }> {
  // Capture previous state before update (for workflow context)
  const previousReturn = await getReturn(id);
  const previousStatus = previousReturn?.status;

  const result = await updateReturn(id, { status });
  if (!result.success) return result;

  // Add timeline entry
  const tenantId = await getCurrentTenantId();
  if (tenantId) {
    await supabase.from('rh_return_timeline').insert({
      return_id: id,
      tenant_id: tenantId,
      status,
      comment: comment || null,
      actor_id: actorId || null,
      actor_type: actorId ? 'agent' : 'system',
    });
  }

  // Trigger email notification for relevant status changes
  const statusToEvent: Partial<Record<ReturnStatus, RhNotificationEventType>> = {
    APPROVED: 'return_approved',
    REJECTED: 'return_rejected',
    CANCELLED: 'return_cancelled',
    SHIPPED: 'return_shipped',
    REFUND_COMPLETED: 'refund_completed',
  };

  const eventType = statusToEvent[status];
  if (eventType) {
    const ret = await getReturn(id);
    if (ret) {
      const retMeta = ret.metadata as Record<string, unknown>;
      const email = retMeta?.email as string;
      const customerName = (retMeta?.customerName as string) || undefined;
      if (email) {
        triggerEmailNotification(eventType, {
          recipientEmail: email,
          customerName,
          firstName: customerName ? customerName.split(' ')[0] : undefined,
          returnNumber: ret.returnNumber,
          status,
          reason: comment || ret.reasonText || '',
          refundAmount: ret.refundAmount != null ? String(ret.refundAmount) : '',
          returnId: id,
          customerId: ret.customerId,
        }).catch((err) => console.error('Notification trigger failed:', err));
      }
    }
  }

  // Auto-generate DHL return label on approval (fire-and-forget)
  if (status === 'APPROVED' && tenantId) {
    (async () => {
      try {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('settings')
          .eq('id', tenantId)
          .single();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rhSettings = (tenant?.settings as any)?.returnsHub;
        if (rhSettings?.autoGenerateLabel) {
          const { createReturnLabel } = await import('./dhl-carrier');
          await createReturnLabel(id);
        }
      } catch (err) {
        console.error('Auto-generate return label failed:', err);
      }
    })();
  }

  // Fire workflow event for status change (fire-and-forget)
  if (tenantId && previousStatus !== status) {
    import('./rh-workflow-engine').then(({ executeWorkflowsForEvent }) => {
      executeWorkflowsForEvent('return_status_changed', {
        tenantId: tenantId!,
        eventType: 'return_status_changed',
        returnId: id,
        return: previousReturn || undefined,
        previousStatus,
      });
    }).catch(console.error);
  }

  // Auto-push refund to Shopify when a Shopify-linked return transitions to REFUND_COMPLETED
  if (status === 'REFUND_COMPLETED' && previousStatus !== 'REFUND_COMPLETED' && tenantId) {
    (async () => {
      try {
        const current = await getReturn(id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const shopifyOrderId = (current as any)?.shopifyOrderId ?? (current as any)?.shopify_order_id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const shopifyRefundId = (current as any)?.shopifyRefundId ?? (current as any)?.shopify_refund_id;
        if (!shopifyOrderId || shopifyRefundId) return;
        if (!current?.refundAmount || current.refundAmount <= 0) return;

        const { data: tenant } = await supabase.from('tenants').select('settings').eq('id', tenantId).single();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const auto = (tenant?.settings as any)?.shopifyIntegration?.syncConfig?.autoPushRefunds;
        if (auto === false) return;

        const { createShopifyRefund } = await import('./shopify-integration');
        await createShopifyRefund(id);
      } catch (err) {
        console.error('Shopify refund auto-push failed:', err);
      }
    })();
  }

  return { success: true };
}

export async function approveReturn(
  id: string,
  actorId?: string
): Promise<{ success: boolean; error?: string }> {
  return updateReturnStatus(id, 'APPROVED', 'Return approved', actorId);
}

export async function rejectReturn(
  id: string,
  reason: string,
  actorId?: string
): Promise<{ success: boolean; error?: string }> {
  return updateReturnStatus(id, 'REJECTED', reason, actorId);
}

// ============================================
// PUBLIC RPC HELPERS
// ============================================
// Anon has no direct table access on rh_returns / rh_return_items /
// rh_return_timeline (migration 20261001c_public_returns_rpc.sql). All public
// flows go through SECURITY DEFINER RPCs.

interface PublicRpcResult {
  success?: boolean;
  error?: string;
}

const PUBLIC_RPC_ERRORS: Record<string, string> = {
  not_found: 'Return not found',
  not_cancellable: 'Return cannot be cancelled in current status',
  rate_limited: 'Too many requests. Please try again later.',
  tenant_not_found: 'Tenant not found',
  invalid_email: 'Invalid email address',
  invalid_solution: 'Invalid desired solution',
  invalid_items: 'Invalid return items',
  invalid_payload: 'Invalid return data',
};

function publicRpcErrorMessage(code?: string): string {
  return (code && PUBLIC_RPC_ERRORS[code]) || code || 'Request failed';
}

interface PublicReturnItem {
  id: string;
  name: string;
  quantity: number;
  condition?: string;
  photos: string[];
}

/** tenantSlug -> tenantId, filled by publicCreateReturn (used for photo paths). */
const publicTenantIdBySlug = new Map<string, string>();
/** returnNumber -> items, filled by publicTrackReturn (used by publicGetReturnItems). */
const publicTrackedItems = new Map<string, PublicReturnItem[]>();

export async function cancelReturn(
  id: string,
  reason?: string,
  actorId?: string
): Promise<{ success: boolean; error?: string }> {
  return updateReturnStatus(id, 'CANCELLED', reason || 'Return cancelled', actorId);
}

/**
 * Public (anon) cancellation. Ownership (return number + e-mail), the
 * cancellable-status check, the status change and the timeline entry all
 * happen server-side in the SECURITY DEFINER RPC `public_cancel_return`.
 */
export async function publicCancelReturn(
  returnNumber: string,
  email: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabaseAnon.rpc('public_cancel_return', {
    p_return_number: returnNumber.trim(),
    p_email: email.trim(),
    p_reason: reason,
  });

  if (error) {
    console.error('[publicCancelReturn] RPC failed:', error.message);
    return { success: false, error: error.message };
  }

  const res = (data || {}) as PublicRpcResult & { tenant_id?: string; customer_name?: string | null };
  if (!res.success || !res.tenant_id) {
    return { success: false, error: publicRpcErrorMessage(res.error) };
  }

  // Trigger email notification
  const customerName = res.customer_name || undefined;
  triggerPublicEmailNotification(res.tenant_id, 'return_cancelled', {
    recipientEmail: email.trim(),
    customerName,
    firstName: customerName?.split(' ')[0],
    returnNumber,
    status: 'CANCELLED',
    reason,
  }).catch(console.error);

  return { success: true };
}

// ============================================
// PUBLIC ACCESS (no auth needed)
// ============================================

export async function publicGetTenantProducts(tenantSlug: string): Promise<Array<{ id: string; name: string; gtin?: string; imageUrl?: string }>> {
  // Go through the SECURITY DEFINER RPC so we get the gallery-image fallback
  // (products.image_url is empty for tenants that use product_images instead).
  const { data, error } = await supabaseAnon.rpc('get_public_tenant_products', {
    p_tenant_slug: tenantSlug,
  });
  if (error) {
    console.error('[publicGetTenantProducts] failed:', error.message);
    return [];
  }
  return ((data as Array<{ id: string; name: string | null; gtin: string | null; image_url: string | null }> | null) || []).map((p) => ({
    id: p.id,
    name: p.name || '',
    gtin: p.gtin || undefined,
    imageUrl: p.image_url || undefined,
  }));
}

export async function publicCreateReturn(
  tenantSlug: string,
  data: {
    orderNumber?: string;
    email: string;
    reasonCategory?: string;
    reasonText?: string;
    desiredSolution: string;
    shippingMethod: string;
    shippingAddress?: { name: string; company: string; street: string; postalCode: string; city: string; country: string };
    items: Array<{ name: string; quantity: number; condition?: string; productId?: string }>;
    /** Tracking token of the matching wh_shipments row, if step 0 looked it up. */
    shipmentToken?: string;
    /** Human-readable shipment number for the operator's UI (e.g. SHP-20260512-FXYBM2). */
    shipmentNumber?: string;
  }
): Promise<{ success: boolean; returnNumber?: string; error?: string }> {
  // Server-side: tenant resolution (by slug), validation, status CREATED,
  // return number, items, timeline, customer lookup/creation + linking and
  // rate limiting all happen inside the SECURITY DEFINER RPC.
  // The return_created workflow event is captured by the DB trigger
  // `workflow_capture` (durable workflows), so no client-side engine call.
  // Only server_execution rules run there; migration 20261001c moves active
  // return_* rules to server execution (anon cannot run the browser engine).
  const { data: rpcData, error } = await supabaseAnon.rpc('public_create_return', {
    p_tenant_id: null,
    p_payload: {
      tenantSlug,
      email: data.email,
      orderNumber: data.orderNumber || null,
      reasonCategory: data.reasonCategory || null,
      reasonText: data.reasonText || null,
      desiredSolution: data.desiredSolution,
      shippingMethod: data.shippingMethod,
      shippingAddress: data.shippingAddress || null,
      shipmentToken: data.shipmentToken || null,
      shipmentNumber: data.shipmentNumber || null,
      items: data.items
        .filter((i) => i.name.trim())
        .map((i) => ({
          name: i.name,
          quantity: i.quantity,
          condition: i.condition || null,
          productId: i.productId || null,
        })),
    },
  });

  if (error) {
    console.error('Failed to create public return:', error);
    return { success: false, error: error.message };
  }

  const res = (rpcData || {}) as PublicRpcResult & {
    return_id?: string;
    return_number?: string;
    tenant_id?: string;
  };
  if (!res.success || !res.return_number || !res.tenant_id || !res.return_id) {
    return { success: false, error: publicRpcErrorMessage(res.error) };
  }

  publicTenantIdBySlug.set(tenantSlug, res.tenant_id);

  // Trigger confirmation email via public notification
  const confirmName = data.shippingAddress?.name || undefined;
  triggerPublicEmailNotification(res.tenant_id, 'return_confirmed', {
    recipientEmail: data.email.trim(),
    customerName: confirmName,
    firstName: confirmName ? confirmName.split(' ')[0] : undefined,
    returnNumber: res.return_number,
    // Free text (if any) goes in `reason`; the category is localized to a
    // readable label by the notification trigger so the mail never shows a
    // bare slug like "Reason: other".
    reason: data.reasonText || undefined,
    reasonCategory: data.reasonCategory,
    returnId: res.return_id,
  }).catch((err) => console.error('Public notification trigger failed:', err));

  return { success: true, returnNumber: res.return_number };
}

type PublicTimelineEntry = {
  id: string;
  returnId: string;
  tenantId: string;
  status: string;
  comment?: string;
  actorType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

/**
 * Public tracking. Requires return number AND the e-mail used for the return;
 * the RPC returns a customer-safe projection only (no internal notes, customs
 * data, metadata or assignment).
 */
export async function publicTrackReturn(
  returnNumber: string,
  email?: string
): Promise<{
  returnData: RhReturn | null;
  timeline: PublicTimelineEntry[];
  items?: PublicReturnItem[];
  tenantSlug?: string;
}> {
  const number = returnNumber.trim();
  const mail = email?.trim();
  if (!number || !mail) return { returnData: null, timeline: [] };

  const { data, error } = await supabaseAnon.rpc('public_track_return', {
    p_return_number: number,
    p_email: mail,
  });

  if (error) {
    console.error('[publicTrackReturn] RPC error:', error.message, error.code);
    return { returnData: null, timeline: [] };
  }
  if (!data) return { returnData: null, timeline: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  const transformed = transformReturn(row);
  transformed.metadata = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeline: PublicTimelineEntry[] = (row.timeline || []).map((t: any) => ({
    id: t.id,
    returnId: row.id,
    tenantId: row.tenant_id,
    status: t.status,
    comment: t.comment || undefined,
    actorType: t.actor_type || 'system',
    metadata: {},
    createdAt: t.created_at,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: PublicReturnItem[] = (row.items || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    condition: item.condition || undefined,
    photos: item.photos || [],
  }));
  publicTrackedItems.set(number, items);
  if (row.return_number) publicTrackedItems.set(row.return_number, items);

  return {
    returnData: transformed,
    timeline,
    items,
    tenantSlug: row.tenant_slug || undefined,
  };
}

/**
 * Public: resolve a return id for linking (e.g. a public support ticket).
 * Anon has no table access to rh_returns, so this goes through
 * public_track_return, which also enforces that the e-mail owns the return.
 * Returns undefined when not found, e-mail mismatch, rate-limited or when the
 * return belongs to a different tenant.
 */
export async function publicResolveReturnId(
  returnNumber: string,
  email: string,
  tenantId?: string
): Promise<string | undefined> {
  const { returnData } = await publicTrackReturn(returnNumber, email);
  if (!returnData) return undefined;
  if (tenantId && returnData.tenantId !== tenantId) return undefined;
  return returnData.id;
}

export async function publicGetTenantName(tenantSlug: string): Promise<string> {
  return (await getPublicTenantBySlug(tenantSlug))?.name || '';
}

export async function publicGetTenantBranding(tenantSlug: string): Promise<{
  name: string;
  primaryColor: string;
  logoUrl: string;
  embedAllowedDomains?: string[];
} | null> {
  const data = await getPublicTenantBySlug(tenantSlug);
  if (!data) return null;

  const settings = data.settings as TenantSettings | null;
  const branding = settings?.returnsHub?.branding;
  const embedAllowedDomains: string[] | undefined = settings?.returnsHub?.embedAllowedDomains;

  return {
    name: data.name || '',
    primaryColor: branding?.primaryColor || '#3B82F6',
    logoUrl: branding?.logoUrl || '',
    embedAllowedDomains,
  };
}

export async function publicUploadReturnPhoto(
  tenantSlug: string,
  returnId: string,
  file: File
): Promise<{ success: boolean; path?: string; error?: string }> {
  // Prefer the tenant id returned by public_create_return (no anon tenant read).
  let tenantId = publicTenantIdBySlug.get(tenantSlug);
  if (!tenantId) {
    tenantId = (await getPublicTenantBySlug(tenantSlug))?.id;
  }

  if (!tenantId) return { success: false, error: 'Tenant not found' };

  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = `${tenantId}/${returnId}/${Date.now()}.${ext}`;

  const { error } = await supabaseAnon.storage
    .from('return-photos')
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error('Failed to upload return photo:', error);
    return { success: false, error: error.message };
  }

  return { success: true, path: filePath };
}

/**
 * Items of a publicly tracked return. Anon has no table access anymore, so
 * this either reuses the items loaded by the last publicTrackReturn() call or,
 * when an e-mail is given, re-tracks via the RPC.
 */
export async function publicGetReturnItems(returnNumber: string, email?: string): Promise<PublicReturnItem[]> {
  const number = returnNumber.trim();
  const cached = publicTrackedItems.get(number);
  if (cached) return cached;
  if (!email) return [];
  const result = await publicTrackReturn(number, email);
  return result.items || [];
}

export async function getReturnStats(): Promise<ReturnsHubStats> {
  const tenantId = await getCurrentTenantId();
  const empty: ReturnsHubStats = {
    openReturns: 0, todayReceived: 0, avgProcessingDays: 0,
    returnRate: 0, refundVolume: 0, slaCompliance: 0, openTickets: 0,
    returnsByStatus: {} as Record<ReturnStatus, number>,
    returnsByReason: {},
    dailyReturns: [],
  };
  if (!tenantId) return empty;

  const { data: returns } = await supabase
    .from('rh_returns')
    .select('id, status, reason_category, refund_amount, created_at, updated_at')
    .eq('tenant_id', tenantId);

  if (!returns?.length) return empty;

  const today = new Date().toISOString().split('T')[0];
  const openStatuses = ['CREATED', 'PENDING_APPROVAL', 'APPROVED', 'LABEL_GENERATED', 'SHIPPED', 'DELIVERED', 'INSPECTION_IN_PROGRESS', 'REFUND_PROCESSING'];
  const closedStatuses = ['COMPLETED', 'REFUND_COMPLETED', 'REJECTED', 'CANCELLED'];

  const openReturns = returns.filter(r => openStatuses.includes(r.status)).length;
  const todayReceived = returns.filter(r => r.created_at?.startsWith(today)).length;
  const refundVolume = returns.reduce((sum, r) => sum + (Number(r.refund_amount) || 0), 0);

  // Calculate avgProcessingDays from completed returns
  const completedReturns = returns.filter(r => closedStatuses.includes(r.status) && r.created_at && r.updated_at);
  let avgProcessingDays = 0;
  if (completedReturns.length > 0) {
    const totalDays = completedReturns.reduce((sum, r) => {
      const created = new Date(r.created_at).getTime();
      const updated = new Date(r.updated_at).getTime();
      return sum + (updated - created) / (1000 * 60 * 60 * 24);
    }, 0);
    avgProcessingDays = Math.round((totalDays / completedReturns.length) * 10) / 10;
  }

  // Calculate return rate (completed / total)
  const returnRate = returns.length > 0 ? Math.round((completedReturns.length / returns.length) * 100) : 0;

  const returnsByStatus = {} as Record<string, number>;
  const returnsByReason = {} as Record<string, number>;
  for (const r of returns) {
    returnsByStatus[r.status] = (returnsByStatus[r.status] || 0) + 1;
    if (r.reason_category) {
      returnsByReason[r.reason_category] = (returnsByReason[r.reason_category] || 0) + 1;
    }
  }

  // Daily returns for last 30 days
  const dailyReturns: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = returns.filter(r => r.created_at?.startsWith(dateStr)).length;
    dailyReturns.push({ date: dateStr, count });
  }

  // Open tickets count
  const { count: openTickets } = await supabase
    .from('rh_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', ['open', 'in_progress', 'waiting']);

  return {
    openReturns,
    todayReceived,
    avgProcessingDays,
    returnRate,
    refundVolume,
    slaCompliance: 100,
    openTickets: openTickets || 0,
    returnsByStatus: returnsByStatus as Record<ReturnStatus, number>,
    returnsByReason,
    dailyReturns,
  };
}
