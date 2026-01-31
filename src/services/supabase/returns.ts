/**
 * Supabase Returns Service
 * Returns CRUD with RLS
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { RhReturn, ReturnStatus, ReturnsFilter, PaginatedResult, ReturnsHubStats } from '@/types/returns-hub';
import { generateReturnNumber } from '@/lib/return-number';

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
    data: (data || []).map((row: any) => transformReturn(row)),
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
// PUBLIC ACCESS (no auth needed)
// ============================================

export async function publicCreateReturn(
  tenantSlug: string,
  data: {
    orderNumber?: string;
    email: string;
    reasonCategory?: string;
    reasonText?: string;
    desiredSolution: string;
    shippingMethod: string;
    items: Array<{ name: string; quantity: number }>;
  }
): Promise<{ success: boolean; returnNumber?: string; error?: string }> {
  // Get tenant by slug
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, settings')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return { success: false, error: 'Tenant not found' };

  const prefix = (tenant.settings as any)?.returnsHub?.prefix || 'RET';
  const rn = generateReturnNumber(prefix);

  const { data: ret, error } = await supabase
    .from('rh_returns')
    .insert({
      tenant_id: tenant.id,
      return_number: rn,
      status: 'CREATED',
      order_id: data.orderNumber || null,
      reason_category: data.reasonCategory || null,
      reason_text: data.reasonText || null,
      desired_solution: data.desiredSolution,
      shipping_method: data.shippingMethod,
      priority: 'normal',
      metadata: { source: 'public_portal', email: data.email },
    })
    .select('id')
    .single();

  if (error || !ret) {
    console.error('Failed to create public return:', error);
    return { success: false, error: error?.message || 'Insert failed' };
  }

  // Add items
  for (const item of data.items.filter(i => i.name.trim())) {
    await supabase.from('rh_return_items').insert({
      return_id: ret.id,
      tenant_id: tenant.id,
      name: item.name,
      quantity: item.quantity,
    });
  }

  // Add timeline entry
  await supabase.from('rh_return_timeline').insert({
    return_id: ret.id,
    tenant_id: tenant.id,
    status: 'CREATED',
    comment: 'Return registered via customer portal',
    actor_type: 'customer',
  });

  // Create or find customer
  const { data: existingCustomer } = await supabase
    .from('rh_customers')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('email', data.email)
    .single();

  if (!existingCustomer) {
    await supabase.from('rh_customers').insert({
      tenant_id: tenant.id,
      email: data.email,
    });
  }

  return { success: true, returnNumber: rn };
}

export async function publicTrackReturn(
  returnNumber: string,
  email?: string
): Promise<{ returnData: RhReturn | null; timeline: Array<{ id: string; returnId: string; tenantId: string; status: string; comment?: string; actorType: string; metadata: Record<string, unknown>; createdAt: string }> }> {
  const { data: ret } = await supabase
    .from('rh_returns')
    .select('*')
    .eq('return_number', returnNumber.trim())
    .single();

  if (!ret) return { returnData: null, timeline: [] };

  // Verify email if provided
  const meta = ret.metadata as Record<string, unknown> | null;
  if (email && meta?.email && meta.email !== email) {
    return { returnData: null, timeline: [] };
  }

  // Transform but strip internal data
  const transformed = transformReturn(ret);
  transformed.internalNotes = undefined;
  transformed.customsData = undefined;
  transformed.metadata = {};

  // Load timeline
  const { data: tlData } = await supabase
    .from('rh_return_timeline')
    .select('*')
    .eq('return_id', ret.id)
    .order('created_at', { ascending: true });

  const timeline = (tlData || []).map((row: any) => ({
    id: row.id,
    returnId: row.return_id,
    tenantId: row.tenant_id,
    status: row.status,
    comment: row.comment || undefined,
    actorType: row.actor_type || 'system',
    metadata: {},
    createdAt: row.created_at,
  }));

  return { returnData: transformed, timeline };
}

export async function publicGetTenantName(tenantSlug: string): Promise<string> {
  const { data } = await supabase
    .from('tenants')
    .select('name')
    .eq('slug', tenantSlug)
    .single();
  return data?.name || '';
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
