/**
 * Supabase Returns Hub Tickets Service
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { RhTicket, RhTicketMessage, TicketsFilter, TicketStats, PaginatedResult } from '@/types/returns-hub';
import { generateTicketNumber } from '@/lib/return-number';
import { triggerEmailNotification } from './rh-notification-trigger';
import { logActivity, getActivityLog } from './activity-log';

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
function transformTicketMessage(row: any): RhTicketMessage {
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

export async function getRhTickets(
  filter?: TicketsFilter,
  page = 1,
  pageSize = 20
): Promise<PaginatedResult<RhTicket>> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { data: [], total: 0, page, pageSize, totalPages: 0 };

  let query = supabase
    .from('rh_tickets')
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
  if (filter?.returnId) {
    query = query.eq('return_id', filter.returnId);
  }
  if (filter?.search) {
    query = query.or(
      `ticket_number.ilike.%${filter.search}%,subject.ilike.%${filter.search}%`
    );
  }
  if (filter?.dateFrom) {
    query = query.gte('created_at', filter.dateFrom);
  }
  if (filter?.dateTo) {
    query = query.lte('created_at', filter.dateTo);
  }
  if (filter?.tags?.length) {
    query = query.overlaps('tags', filter.tags);
  }
  if (filter?.category) {
    query = query.eq('category', filter.category);
  }

  const sortColumn = filter?.sortBy || 'created_at';
  const ascending = filter?.sortOrder === 'asc';

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order(sortColumn, { ascending })
    .range(from, to);

  if (error) {
    console.error('Failed to load tickets:', error);
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const total = count || 0;
  return {
    data: (data || []).map((row: any) => transformTicket(row)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getRhTicket(id: string): Promise<RhTicket | null> {
  const { data, error } = await supabase
    .from('rh_tickets')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return transformTicket(data);
}

export async function createRhTicket(
  ticket: Partial<RhTicket>
): Promise<{ success: boolean; id?: string; ticketNumber?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const ticketNumber = generateTicketNumber();

  const { data, error } = await supabase
    .from('rh_tickets')
    .insert({
      tenant_id: tenantId,
      ticket_number: ticketNumber,
      customer_id: ticket.customerId || null,
      return_id: ticket.returnId || null,
      category: ticket.category || null,
      subcategory: ticket.subcategory || null,
      priority: ticket.priority || 'normal',
      status: ticket.status || 'open',
      subject: ticket.subject || '',
      assigned_to: ticket.assignedTo || null,
      tags: ticket.tags || [],
      metadata: ticket.metadata || {},
    })
    .select('id, ticket_number')
    .single();

  if (error) {
    console.error('Failed to create ticket:', error);
    return { success: false, error: error.message };
  }

  // Trigger ticket_created notification if customer has email
  if (ticket.customerId) {
    const { data: customer } = await supabase
      .from('rh_customers')
      .select('email')
      .eq('id', ticket.customerId)
      .single();

    if (customer?.email) {
      triggerEmailNotification('ticket_created', {
        recipientEmail: customer.email,
        ticketNumber: data.ticket_number,
        subject: ticket.subject || '',
        ticketId: data.id,
        customerId: ticket.customerId,
      }).catch((err) => console.error('Ticket notification trigger failed:', err));
    }
  }

  return { success: true, id: data.id, ticketNumber: data.ticket_number };
}

export async function updateRhTicket(
  id: string,
  updates: Partial<RhTicket>
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.category !== undefined) updateData.category = updates.category || null;
  if (updates.subcategory !== undefined) updateData.subcategory = updates.subcategory || null;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.subject !== undefined) updateData.subject = updates.subject;
  if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo || null;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.resolvedAt !== undefined) updateData.resolved_at = updates.resolvedAt || null;
  if (updates.firstRespondedAt !== undefined) updateData.first_responded_at = updates.firstRespondedAt || null;
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

  const { error } = await supabase
    .from('rh_tickets')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Failed to update ticket:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getRhTicketMessages(ticketId: string): Promise<RhTicketMessage[]> {
  const { data, error } = await supabase
    .from('rh_ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load ticket messages:', error);
    return [];
  }

  return (data || []).map((row: any) => transformTicketMessage(row));
}

export async function addRhTicketMessage(
  message: Omit<RhTicketMessage, 'id' | 'tenantId' | 'createdAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const { data, error } = await supabase
    .from('rh_ticket_messages')
    .insert({
      ticket_id: message.ticketId,
      tenant_id: tenantId,
      sender_type: message.senderType,
      sender_id: message.senderId || null,
      sender_name: message.senderName || null,
      sender_email: message.senderEmail || null,
      content: message.content,
      attachments: message.attachments || [],
      is_internal: message.isInternal || false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to add ticket message:', error);
    return { success: false, error: error.message };
  }

  // Update first responded at if this is the first agent response
  if (message.senderType === 'agent') {
    const ticket = await getRhTicket(message.ticketId);
    if (ticket && !ticket.firstRespondedAt) {
      await updateRhTicket(message.ticketId, {
        firstRespondedAt: new Date().toISOString(),
      });
    }

    // Trigger agent reply notification if not internal note
    if (!message.isInternal && ticket?.customerId) {
      const { data: customer } = await supabase
        .from('rh_customers')
        .select('email')
        .eq('id', ticket.customerId)
        .single();

      if (customer?.email) {
        triggerEmailNotification('ticket_agent_reply', {
          recipientEmail: customer.email,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          ticketId: message.ticketId,
          customerId: ticket.customerId,
        }).catch((err) => console.error('Agent reply notification failed:', err));
      }
    }
  }

  return { success: true, id: data.id };
}

export async function assignRhTicket(
  ticketId: string,
  assignedTo: string
): Promise<{ success: boolean; error?: string }> {
  return updateRhTicket(ticketId, { assignedTo, status: 'in_progress' });
}

export async function deleteRhTicket(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const ticket = await getRhTicket(id);
  if (!ticket) return { success: false, error: 'Ticket not found' };

  return updateRhTicket(id, {
    status: 'closed',
    metadata: { ...ticket.metadata, archived: true },
  });
}

export async function getTicketStats(): Promise<TicketStats> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { open: 0, inProgress: 0, waiting: 0, resolved: 0, closed: 0, overdue: 0, avgFirstResponseMinutes: 0, avgResolutionMinutes: 0 };

  const { data, error } = await supabase
    .from('rh_tickets')
    .select('status, sla_resolution_at, first_responded_at, resolved_at, created_at')
    .eq('tenant_id', tenantId);

  if (error || !data) {
    console.error('Failed to load ticket stats:', error);
    return { open: 0, inProgress: 0, waiting: 0, resolved: 0, closed: 0, overdue: 0, avgFirstResponseMinutes: 0, avgResolutionMinutes: 0 };
  }

  const now = new Date();
  let overdue = 0;
  const counts: Record<string, number> = { open: 0, in_progress: 0, waiting: 0, resolved: 0, closed: 0 };
  let totalFirstResponse = 0;
  let firstResponseCount = 0;
  let totalResolution = 0;
  let resolutionCount = 0;

  for (const row of data) {
    counts[row.status] = (counts[row.status] || 0) + 1;

    if (row.sla_resolution_at && !['resolved', 'closed'].includes(row.status) && new Date(row.sla_resolution_at) < now) {
      overdue++;
    }
    if (row.first_responded_at && row.created_at) {
      totalFirstResponse += new Date(row.first_responded_at).getTime() - new Date(row.created_at).getTime();
      firstResponseCount++;
    }
    if (row.resolved_at && row.created_at) {
      totalResolution += new Date(row.resolved_at).getTime() - new Date(row.created_at).getTime();
      resolutionCount++;
    }
  }

  return {
    open: counts.open || 0,
    inProgress: counts.in_progress || 0,
    waiting: counts.waiting || 0,
    resolved: counts.resolved || 0,
    closed: counts.closed || 0,
    overdue,
    avgFirstResponseMinutes: firstResponseCount > 0 ? Math.round(totalFirstResponse / firstResponseCount / 60000) : 0,
    avgResolutionMinutes: resolutionCount > 0 ? Math.round(totalResolution / resolutionCount / 60000) : 0,
  };
}

export async function bulkUpdateTickets(
  ids: string[],
  updates: Partial<Pick<RhTicket, 'status' | 'priority' | 'assignedTo'>>
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo || null;

  const { error } = await supabase
    .from('rh_tickets')
    .update(updateData)
    .in('id', ids);

  if (error) {
    console.error('Failed to bulk update tickets:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getTicketActivity(ticketId: string) {
  return getActivityLog({ entityType: 'ticket', entityId: ticketId, limit: 50 });
}

export async function logTicketActivity(
  ticketId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logActivity({
    action,
    entityType: 'ticket',
    entityId: ticketId,
    details,
  });
}

export async function mergeTickets(
  primaryId: string,
  secondaryId: string
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const [primary, secondary] = await Promise.all([
    getRhTicket(primaryId),
    getRhTicket(secondaryId),
  ]);

  if (!primary || !secondary) return { success: false, error: 'Ticket not found' };

  // Move secondary messages to primary
  const { error: moveError } = await supabase
    .from('rh_ticket_messages')
    .update({ ticket_id: primaryId })
    .eq('ticket_id', secondaryId);

  if (moveError) {
    console.error('Failed to move messages:', moveError);
    return { success: false, error: moveError.message };
  }

  // Close secondary
  await updateRhTicket(secondaryId, {
    status: 'closed',
    metadata: { ...secondary.metadata, mergedInto: primaryId },
  });

  // Add system messages
  await addRhTicketMessage({
    ticketId: primaryId,
    senderType: 'system',
    content: `Ticket ${secondary.ticketNumber} was merged into this ticket.`,
    attachments: [],
    isInternal: false,
  });

  await addRhTicketMessage({
    ticketId: secondaryId,
    senderType: 'system',
    content: `This ticket was merged into ${primary.ticketNumber}.`,
    attachments: [],
    isInternal: false,
  });

  // Log activity
  await logTicketActivity(primaryId, 'merged', {
    mergedTicketId: secondaryId,
    mergedTicketNumber: secondary.ticketNumber,
  });

  return { success: true };
}
