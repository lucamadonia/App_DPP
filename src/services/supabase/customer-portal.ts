/**
 * Customer Portal Service
 *
 * All database operations for the customer-facing portal.
 * Uses authenticated Supabase client (customer RLS policies apply).
 */

import { supabase } from '@/lib/supabase';
import type { RhReturn, RhReturnItem, RhReturnTimeline, RhTicket, RhTicketMessage, RhReturnReason, CustomerPortalBrandingOverrides, CustomerPortalSettings } from '@/types/returns-hub';
import type { CustomerPortalProfile, CustomerDashboardStats, CustomerReturnInput, CustomerReturnsFilter, CustomerTicketsFilter } from '@/types/customer-portal';
import { generateReturnNumber } from '@/lib/return-number';
import { DEFAULT_CUSTOMER_PORTAL_SETTINGS } from '@/services/supabase/rh-settings';

// ============================================
// AUTH HELPERS
// ============================================

export async function getCustomerContext(): Promise<{
  userId: string;
  customerId: string;
  tenantId: string;
} | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('rh_customer_profiles')
    .select('customer_id, tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return {
    userId: user.id,
    customerId: profile.customer_id,
    tenantId: profile.tenant_id,
  };
}

export async function isCustomerUser(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('rh_customer_profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  return !!data;
}

export async function customerSignUp(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!params.tenantId) {
    return { success: false, error: 'Registration is currently unavailable. Please try again later.' };
  }

  const { error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        user_type: 'customer',
        tenant_id: params.tenantId,
        first_name: params.firstName,
        last_name: params.lastName,
      },
    },
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function customerSendMagicLink(
  email: string,
  tenantSlug: string,
): Promise<{ success: boolean; error?: string }> {
  const redirectUrl = `${window.location.origin}/customer/${tenantSlug}/auth/callback`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectUrl },
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// PROFILE
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformCustomerProfile(profile: any, customer: any): CustomerPortalProfile {
  return {
    id: profile.id,
    customerId: profile.customer_id,
    tenantId: profile.tenant_id,
    displayName: profile.display_name || undefined,
    avatarUrl: profile.avatar_url || undefined,
    emailVerified: profile.email_verified || false,
    lastLoginAt: profile.last_login_at || undefined,
    email: customer.email,
    firstName: customer.first_name || undefined,
    lastName: customer.last_name || undefined,
    phone: customer.phone || undefined,
    company: customer.company || undefined,
    addresses: customer.addresses || [],
    communicationPreferences: customer.communication_preferences || { email: true, sms: false, marketing: false },
  };
}

export async function getCustomerProfile(): Promise<CustomerPortalProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('rh_customer_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  const { data: customer } = await supabase
    .from('rh_customers')
    .select('*')
    .eq('id', profile.customer_id)
    .single();

  if (!customer) return null;

  return transformCustomerProfile(profile, customer);
}

export async function updateCustomerProfile(updates: {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  addresses?: CustomerPortalProfile['addresses'];
  communicationPreferences?: CustomerPortalProfile['communicationPreferences'];
}): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCustomerContext();
  if (!ctx) return { success: false, error: 'Not authenticated' };

  // Update rh_customer_profiles
  if (updates.displayName !== undefined) {
    await supabase
      .from('rh_customer_profiles')
      .update({ display_name: updates.displayName, updated_at: new Date().toISOString() })
      .eq('id', ctx.userId);
  }

  // Update rh_customers
  const customerUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.firstName !== undefined) customerUpdates.first_name = updates.firstName || null;
  if (updates.lastName !== undefined) customerUpdates.last_name = updates.lastName || null;
  if (updates.phone !== undefined) customerUpdates.phone = updates.phone || null;
  if (updates.company !== undefined) customerUpdates.company = updates.company || null;
  if (updates.addresses !== undefined) customerUpdates.addresses = updates.addresses;
  if (updates.communicationPreferences !== undefined) customerUpdates.communication_preferences = updates.communicationPreferences;

  const { error } = await supabase
    .from('rh_customers')
    .update(customerUpdates)
    .eq('id', ctx.customerId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// RETURNS
// ============================================

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
    internalNotes: undefined, // Never expose to customer
    customsData: undefined,
    metadata: {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCustomerReturns(
  filter?: CustomerReturnsFilter,
  page = 1,
  pageSize = 20,
): Promise<{ data: RhReturn[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const ctx = await getCustomerContext();
  if (!ctx) return { data: [], total: 0, page, pageSize, totalPages: 0 };

  let query = supabase
    .from('rh_returns')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .eq('customer_id', ctx.customerId);

  if (filter?.status?.length) {
    query = query.in('status', filter.status);
  }
  if (filter?.search) {
    query = query.or(`return_number.ilike.%${filter.search}%,order_id.ilike.%${filter.search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Failed to load customer returns:', error);
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const total = count || 0;
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: (data || []).map((row: any) => transformReturn(row)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getCustomerReturn(id: string): Promise<{
  returnData: RhReturn | null;
  items: RhReturnItem[];
  timeline: RhReturnTimeline[];
}> {
  const { data: ret } = await supabase
    .from('rh_returns')
    .select('*')
    .eq('id', id)
    .single();

  if (!ret) return { returnData: null, items: [], timeline: [] };

  const [itemsResult, timelineResult] = await Promise.all([
    supabase
      .from('rh_return_items')
      .select('*')
      .eq('return_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('rh_return_timeline')
      .select('*')
      .eq('return_id', id)
      .order('created_at', { ascending: true }),
  ]);

  return {
    returnData: transformReturn(ret),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: (itemsResult.data || []).map((row: any) => ({
      id: row.id,
      returnId: row.return_id,
      tenantId: row.tenant_id,
      productId: row.product_id || undefined,
      sku: row.sku || undefined,
      name: row.name,
      quantity: row.quantity,
      unitPrice: row.unit_price != null ? Number(row.unit_price) : undefined,
      batchNumber: row.batch_number || undefined,
      serialNumber: row.serial_number || undefined,
      warrantyStatus: row.warranty_status || undefined,
      condition: row.condition || undefined,
      approved: row.approved || false,
      refundAmount: row.refund_amount != null ? Number(row.refund_amount) : undefined,
      photos: row.photos || [],
      notes: row.notes || undefined,
      createdAt: row.created_at,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    timeline: (timelineResult.data || []).map((row: any) => ({
      id: row.id,
      returnId: row.return_id,
      tenantId: row.tenant_id,
      status: row.status,
      comment: row.comment || undefined,
      actorId: row.actor_id || undefined,
      actorType: row.actor_type || 'system',
      metadata: {},
      createdAt: row.created_at,
    })),
  };
}

export async function createCustomerReturn(
  input: CustomerReturnInput,
): Promise<{ success: boolean; returnNumber?: string; id?: string; error?: string }> {
  const ctx = await getCustomerContext();
  if (!ctx) return { success: false, error: 'Not authenticated' };

  // Get tenant prefix
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', ctx.tenantId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prefix = (tenant?.settings as any)?.returnsHub?.prefix || 'RET';
  const returnNumber = generateReturnNumber(prefix);

  // Get customer email for metadata
  const { data: customer } = await supabase
    .from('rh_customers')
    .select('email')
    .eq('id', ctx.customerId)
    .single();

  const { data: ret, error } = await supabase
    .from('rh_returns')
    .insert({
      tenant_id: ctx.tenantId,
      return_number: returnNumber,
      status: 'CREATED',
      customer_id: ctx.customerId,
      order_id: input.orderId || null,
      reason_category: input.reasonCategory || null,
      reason_subcategory: input.reasonSubcategory || null,
      reason_text: input.reasonText || null,
      desired_solution: input.desiredSolution,
      shipping_method: input.shippingMethod,
      priority: 'normal',
      metadata: { source: 'customer_portal', email: customer?.email || '' },
    })
    .select('id')
    .single();

  if (error || !ret) {
    console.error('Failed to create customer return:', error);
    return { success: false, error: error?.message || 'Insert failed' };
  }

  // Add items
  for (const item of input.items.filter(i => i.name.trim())) {
    await supabase.from('rh_return_items').insert({
      return_id: ret.id,
      tenant_id: ctx.tenantId,
      name: item.name,
      quantity: item.quantity,
      sku: item.sku || null,
      photos: item.photos || [],
    });
  }

  // Add timeline entry
  await supabase.from('rh_return_timeline').insert({
    return_id: ret.id,
    tenant_id: ctx.tenantId,
    status: 'CREATED',
    comment: 'Return registered via customer portal',
    actor_id: ctx.userId,
    actor_type: 'customer',
  });

  return { success: true, returnNumber, id: ret.id };
}

// ============================================
// TICKETS
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformTicket(row: any): RhTicket {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    ticketNumber: row.ticket_number,
    customerId: row.customer_id || undefined,
    returnId: row.return_id || undefined,
    category: row.category || undefined,
    subcategory: row.subcategory || undefined,
    priority: row.priority,
    status: row.status,
    subject: row.subject,
    assignedTo: row.assigned_to || undefined,
    slaFirstResponseAt: row.sla_first_response_at || undefined,
    slaResolutionAt: row.sla_resolution_at || undefined,
    firstRespondedAt: row.first_responded_at || undefined,
    resolvedAt: row.resolved_at || undefined,
    tags: row.tags || [],
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformMessage(row: any): RhTicketMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    tenantId: row.tenant_id,
    senderType: row.sender_type,
    senderId: row.sender_id || undefined,
    senderName: row.sender_name || undefined,
    senderEmail: row.sender_email || undefined,
    content: row.content,
    attachments: row.attachments || [],
    isInternal: row.is_internal || false,
    createdAt: row.created_at,
  };
}

export async function getCustomerTickets(
  filter?: CustomerTicketsFilter,
  page = 1,
  pageSize = 20,
): Promise<{ data: RhTicket[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const ctx = await getCustomerContext();
  if (!ctx) return { data: [], total: 0, page, pageSize, totalPages: 0 };

  let query = supabase
    .from('rh_tickets')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .eq('customer_id', ctx.customerId);

  if (filter?.status?.length) {
    query = query.in('status', filter.status);
  }
  if (filter?.search) {
    query = query.or(`ticket_number.ilike.%${filter.search}%,subject.ilike.%${filter.search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Failed to load customer tickets:', error);
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const total = count || 0;
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: (data || []).map((row: any) => transformTicket(row)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getCustomerTicket(id: string): Promise<RhTicket | null> {
  const { data, error } = await supabase
    .from('rh_tickets')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return transformTicket(data);
}

export async function createCustomerTicket(params: {
  subject: string;
  message: string;
  returnId?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const ctx = await getCustomerContext();
  if (!ctx) return { success: false, error: 'Not authenticated' };

  const { data: customer } = await supabase
    .from('rh_customers')
    .select('email, first_name, last_name')
    .eq('id', ctx.customerId)
    .single();

  const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;

  const { data: ticket, error } = await supabase
    .from('rh_tickets')
    .insert({
      tenant_id: ctx.tenantId,
      ticket_number: ticketNumber,
      customer_id: ctx.customerId,
      return_id: params.returnId || null,
      priority: 'normal',
      status: 'open',
      subject: params.subject,
      tags: [],
      metadata: { source: 'customer_portal' },
    })
    .select('id')
    .single();

  if (error || !ticket) {
    console.error('Failed to create customer ticket:', error);
    return { success: false, error: error?.message || 'Insert failed' };
  }

  // Add initial message
  const senderName = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || customer?.email || '';
  await supabase.from('rh_ticket_messages').insert({
    ticket_id: ticket.id,
    tenant_id: ctx.tenantId,
    sender_type: 'customer',
    sender_id: ctx.userId,
    sender_name: senderName,
    sender_email: customer?.email || '',
    content: params.message,
    attachments: [],
    is_internal: false,
  });

  return { success: true, id: ticket.id };
}

export async function getCustomerTicketMessages(ticketId: string): Promise<RhTicketMessage[]> {
  const { data, error } = await supabase
    .from('rh_ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .eq('is_internal', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load ticket messages:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => transformMessage(row));
}

export async function sendCustomerMessage(
  ticketId: string,
  content: string,
  attachments: string[] = [],
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getCustomerContext();
  if (!ctx) return { success: false, error: 'Not authenticated' };

  const { data: customer } = await supabase
    .from('rh_customers')
    .select('email, first_name, last_name')
    .eq('id', ctx.customerId)
    .single();

  const senderName = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || customer?.email || '';

  const { error } = await supabase.from('rh_ticket_messages').insert({
    ticket_id: ticketId,
    tenant_id: ctx.tenantId,
    sender_type: 'customer',
    sender_id: ctx.userId,
    sender_name: senderName,
    sender_email: customer?.email || '',
    content,
    attachments,
    is_internal: false,
  });

  if (error) {
    console.error('Failed to send customer message:', error);
    return { success: false, error: error.message };
  }

  // Update ticket updated_at
  await supabase
    .from('rh_tickets')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  return { success: true };
}

// ============================================
// DASHBOARD
// ============================================

export async function getCustomerDashboardStats(): Promise<CustomerDashboardStats> {
  const ctx = await getCustomerContext();
  const empty: CustomerDashboardStats = {
    activeReturns: 0,
    openTickets: 0,
    totalRefunds: 0,
    recentReturns: [],
    recentMessages: [],
  };
  if (!ctx) return empty;

  const openStatuses = ['CREATED', 'PENDING_APPROVAL', 'APPROVED', 'LABEL_GENERATED', 'SHIPPED', 'DELIVERED', 'INSPECTION_IN_PROGRESS', 'REFUND_PROCESSING'];

  const [returnsResult, ticketsResult] = await Promise.all([
    supabase
      .from('rh_returns')
      .select('id, return_number, status, refund_amount, created_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('customer_id', ctx.customerId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('rh_tickets')
      .select('id, subject, status, updated_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('customer_id', ctx.customerId)
      .in('status', ['open', 'in_progress', 'waiting'])
      .order('updated_at', { ascending: false }),
  ]);

  const returns = returnsResult.data || [];
  const tickets = ticketsResult.data || [];

  const activeReturns = returns.filter(r => openStatuses.includes(r.status)).length;
  const totalRefunds = returns.reduce((sum, r) => sum + (Number(r.refund_amount) || 0), 0);
  const lastReturn = returns[0];

  const recentReturns = returns.slice(0, 5).map(r => ({
    id: r.id,
    returnNumber: r.return_number,
    status: r.status,
    createdAt: r.created_at,
  }));

  // Get recent messages across all tickets
  const ticketIds = tickets.map(t => t.id);
  let recentMessages: CustomerDashboardStats['recentMessages'] = [];
  if (ticketIds.length > 0) {
    const { data: msgs } = await supabase
      .from('rh_ticket_messages')
      .select('id, ticket_id, sender_type, content, created_at')
      .in('ticket_id', ticketIds)
      .eq('is_internal', false)
      .order('created_at', { ascending: false })
      .limit(5);

    recentMessages = (msgs || []).map(m => {
      const ticket = tickets.find(t => t.id === m.ticket_id);
      return {
        id: m.id,
        ticketId: m.ticket_id,
        ticketSubject: ticket?.subject || '',
        senderType: m.sender_type,
        content: m.content,
        createdAt: m.created_at,
      };
    });
  }

  return {
    activeReturns,
    openTickets: tickets.length,
    totalRefunds,
    lastReturnStatus: lastReturn?.status,
    recentReturns,
    recentMessages,
  };
}

// ============================================
// RETURN REASONS (public read)
// ============================================

export async function getCustomerReturnReasons(tenantId: string): Promise<RhReturnReason[]> {
  const { data, error } = await supabase
    .from('rh_return_reasons')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to load return reasons:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    category: row.category,
    subcategories: row.subcategories || [],
    followUpQuestions: row.follow_up_questions || [],
    requiresPhotos: row.requires_photos || false,
    sortOrder: row.sort_order,
    active: row.active,
    createdAt: row.created_at,
  }));
}

// ============================================
// TENANT BRANDING (public)
// ============================================

export interface CustomerPortalBrandingResult {
  tenantId: string;
  name: string;
  branding: CustomerPortalBrandingOverrides;
  portalSettings: CustomerPortalSettings;
}

export async function getCustomerPortalBranding(tenantSlug: string): Promise<CustomerPortalBrandingResult | null> {
  const { data } = await supabase
    .from('tenants')
    .select('id, name, settings')
    .eq('slug', tenantSlug)
    .single();

  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = data.settings as Record<string, any> | null;
  const rhBranding = settings?.returnsHub?.branding;
  const portalSettings: CustomerPortalSettings = {
    ...DEFAULT_CUSTOMER_PORTAL_SETTINGS,
    ...settings?.returnsHub?.customerPortal,
  };
  const savedBranding = portalSettings.branding || {};

  // Merge with defaults, using Returns Hub branding as fallback when inheriting
  const defaultBranding = DEFAULT_CUSTOMER_PORTAL_SETTINGS.branding;
  const branding: CustomerPortalBrandingOverrides = {
    ...defaultBranding,
    ...savedBranding,
    // When inheriting, override primary color and logo from returns hub branding
    ...(savedBranding.inheritFromReturnsHub && rhBranding ? {
      primaryColor: rhBranding.primaryColor || defaultBranding.primaryColor,
      logoUrl: rhBranding.logoUrl || defaultBranding.logoUrl,
    } : {}),
  };

  return {
    tenantId: data.id,
    name: data.name || '',
    branding,
    portalSettings,
  };
}
