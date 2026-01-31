/**
 * Supabase Returns Hub Notifications Service
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { RhNotification } from '@/types/returns-hub';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformNotification(row: any): RhNotification {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    returnId: row.return_id || undefined,
    ticketId: row.ticket_id || undefined,
    customerId: row.customer_id || undefined,
    channel: row.channel,
    template: row.template || undefined,
    subject: row.subject || undefined,
    content: row.content || undefined,
    status: row.status,
    sentAt: row.sent_at || undefined,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

export async function getRhNotifications(
  filters?: { returnId?: string; ticketId?: string; customerId?: string }
): Promise<RhNotification[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let query = supabase
    .from('rh_notifications')
    .select('*')
    .eq('tenant_id', tenantId);

  if (filters?.returnId) query = query.eq('return_id', filters.returnId);
  if (filters?.ticketId) query = query.eq('ticket_id', filters.ticketId);
  if (filters?.customerId) query = query.eq('customer_id', filters.customerId);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load notifications:', error);
    return [];
  }

  return (data || []).map((row: any) => transformNotification(row));
}

export async function createRhNotification(
  notification: Omit<RhNotification, 'id' | 'tenantId' | 'createdAt' | 'status' | 'sentAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const { data, error } = await supabase
    .from('rh_notifications')
    .insert({
      tenant_id: tenantId,
      return_id: notification.returnId || null,
      ticket_id: notification.ticketId || null,
      customer_id: notification.customerId || null,
      channel: notification.channel,
      template: notification.template || null,
      subject: notification.subject || null,
      content: notification.content || null,
      status: 'pending',
      metadata: notification.metadata || {},
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create notification:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

export async function markRhNotificationSent(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('rh_notifications')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Failed to mark notification sent:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
