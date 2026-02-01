/**
 * Supabase Returns Hub Customers Service
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { RhCustomer, PaginatedResult } from '@/types/returns-hub';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformCustomer(row: any): RhCustomer {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    externalId: row.external_id || undefined,
    email: row.email,
    firstName: row.first_name || undefined,
    lastName: row.last_name || undefined,
    phone: row.phone || undefined,
    company: row.company || undefined,
    addresses: row.addresses || [],
    paymentMethods: row.payment_methods || [],
    returnStats: row.return_stats || { totalReturns: 0, totalValue: 0, returnRate: 0 },
    riskScore: row.risk_score || 0,
    notes: row.notes || undefined,
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getRhCustomers(
  search?: string,
  page = 1,
  pageSize = 20
): Promise<PaginatedResult<RhCustomer>> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { data: [], total: 0, page, pageSize, totalPages: 0 };

  let query = supabase
    .from('rh_customers')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (search) {
    query = query.or(
      `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company.ilike.%${search}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Failed to load customers:', error);
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const total = count || 0;
  return {
    data: (data || []).map((row: any) => transformCustomer(row)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getRhCustomer(id: string): Promise<RhCustomer | null> {
  const { data, error } = await supabase
    .from('rh_customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return transformCustomer(data);
}

export async function createRhCustomer(
  customer: Omit<RhCustomer, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'returnStats' | 'riskScore' | 'paymentMethods'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const { data, error } = await supabase
    .from('rh_customers')
    .insert({
      tenant_id: tenantId,
      external_id: customer.externalId || null,
      email: customer.email,
      first_name: customer.firstName || null,
      last_name: customer.lastName || null,
      phone: customer.phone || null,
      company: customer.company || null,
      addresses: customer.addresses || [],
      tags: customer.tags || [],
      notes: customer.notes || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create customer:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

export async function updateRhCustomer(
  id: string,
  updates: Partial<RhCustomer>
): Promise<{ success: boolean; error?: string }> {
  // Capture previous state for workflow triggers
  const needsPreviousState = updates.riskScore !== undefined || updates.tags !== undefined;
  const previousCustomer = needsPreviousState ? await getRhCustomer(id) : null;

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.firstName !== undefined) updateData.first_name = updates.firstName || null;
  if (updates.lastName !== undefined) updateData.last_name = updates.lastName || null;
  if (updates.phone !== undefined) updateData.phone = updates.phone || null;
  if (updates.company !== undefined) updateData.company = updates.company || null;
  if (updates.addresses !== undefined) updateData.addresses = updates.addresses;
  if (updates.notes !== undefined) updateData.notes = updates.notes || null;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.riskScore !== undefined) updateData.risk_score = updates.riskScore;
  if (updates.externalId !== undefined) updateData.external_id = updates.externalId || null;

  const { error } = await supabase
    .from('rh_customers')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Failed to update customer:', error);
    return { success: false, error: error.message };
  }

  // Fire workflow events for relevant changes (fire-and-forget)
  if (previousCustomer) {
    const tenantId = previousCustomer.tenantId;

    // Risk score changed
    if (updates.riskScore !== undefined && previousCustomer.riskScore !== updates.riskScore) {
      import('./rh-workflow-engine').then(({ executeWorkflowsForEvent }) => {
        executeWorkflowsForEvent('customer_risk_changed', {
          tenantId,
          eventType: 'customer_risk_changed',
          customerId: id,
          customer: previousCustomer,
          previousRiskScore: previousCustomer.riskScore,
        });
      }).catch(console.error);
    }

    // Tag added
    if (updates.tags !== undefined) {
      const newTags = updates.tags.filter((t) => !previousCustomer.tags.includes(t));
      if (newTags.length > 0) {
        import('./rh-workflow-engine').then(({ executeWorkflowsForEvent }) => {
          executeWorkflowsForEvent('customer_tag_added', {
            tenantId,
            eventType: 'customer_tag_added',
            customerId: id,
            customer: previousCustomer,
            previousTags: previousCustomer.tags,
          });
        }).catch(console.error);
      }
    }
  }

  return { success: true };
}

export async function getRhCustomerReturns(customerId: string): Promise<import('@/types/returns-hub').RhReturn[]> {
  const { data, error } = await supabase
    .from('rh_returns')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load customer returns:', error);
    return [];
  }

  // Re-use the transform from returns service inline
  return (data || []).map((row: any) => ({
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
  }));
}
