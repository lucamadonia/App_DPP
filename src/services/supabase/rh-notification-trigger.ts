/**
 * Supabase Returns Hub Notification Trigger Service
 *
 * Checks settings + template, renders variables, creates rh_notifications record.
 * The actual email sending is handled by the Supabase Edge Function via DB webhook.
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { RhNotificationEventType } from '@/types/returns-hub';
import { getReturnsHubSettings } from './rh-settings';
import { getRhEmailTemplate, getRhEmailTemplateByTenantId } from './rh-email-templates';

export interface NotificationContext {
  recipientEmail: string;
  customerName?: string;
  returnNumber?: string;
  status?: string;
  reason?: string;
  refundAmount?: string;
  ticketNumber?: string;
  subject?: string;
  trackingUrl?: string;
  returnId?: string;
  ticketId?: string;
  customerId?: string;
}

function renderTemplate(template: string, ctx: NotificationContext): string {
  return template
    .replace(/\{\{customerName\}\}/g, ctx.customerName || '')
    .replace(/\{\{returnNumber\}\}/g, ctx.returnNumber || '')
    .replace(/\{\{status\}\}/g, ctx.status || '')
    .replace(/\{\{reason\}\}/g, ctx.reason || '')
    .replace(/\{\{refundAmount\}\}/g, ctx.refundAmount || '')
    .replace(/\{\{ticketNumber\}\}/g, ctx.ticketNumber || '')
    .replace(/\{\{subject\}\}/g, ctx.subject || '')
    .replace(/\{\{trackingUrl\}\}/g, ctx.trackingUrl || '');
}

/**
 * Trigger an email notification (authenticated context).
 * Checks if email is enabled and template exists/is enabled before creating.
 */
export async function triggerEmailNotification(
  eventType: RhNotificationEventType,
  ctx: NotificationContext
): Promise<{ success: boolean; notificationId?: string; skipped?: boolean; error?: string }> {
  try {
    // Check global settings
    const settings = await getReturnsHubSettings();
    if (!settings.notifications?.emailEnabled) {
      return { success: true, skipped: true };
    }

    // Check template
    const template = await getRhEmailTemplate(eventType);
    if (!template || !template.enabled) {
      return { success: true, skipped: true };
    }

    // Render subject and body
    const renderedSubject = renderTemplate(template.subjectTemplate, ctx);
    const renderedBody = template.htmlTemplate
      ? renderTemplate(template.htmlTemplate, ctx)
      : renderTemplate(template.bodyTemplate, ctx);

    // Create notification record (Edge Function picks it up via DB webhook)
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return { success: false, error: 'No tenant set' };

    const { data, error } = await supabase
      .from('rh_notifications')
      .insert({
        tenant_id: tenantId,
        return_id: ctx.returnId || null,
        ticket_id: ctx.ticketId || null,
        customer_id: ctx.customerId || null,
        channel: 'email',
        template: eventType,
        recipient_email: ctx.recipientEmail,
        subject: renderedSubject,
        content: renderedBody,
        status: 'pending',
        metadata: {
          senderName: settings.notifications.senderName || '',
          isHtml: !!template.htmlTemplate,
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create email notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true, notificationId: data.id };
  } catch (err) {
    console.error('triggerEmailNotification error:', err);
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Trigger an email notification from the public portal (no auth).
 * Uses tenantId directly instead of getCurrentTenantId().
 */
export async function triggerPublicEmailNotification(
  tenantId: string,
  eventType: RhNotificationEventType,
  ctx: NotificationContext
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  try {
    // Check global settings from tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    const rhSettings = (tenant?.settings as any)?.returnsHub;
    if (!rhSettings?.notifications?.emailEnabled) {
      return { success: true, skipped: true };
    }

    // Check template
    const template = await getRhEmailTemplateByTenantId(tenantId, eventType);
    if (!template || !template.enabled) {
      return { success: true, skipped: true };
    }

    // Render
    const renderedSubject = renderTemplate(template.subjectTemplate, ctx);
    const renderedBody = template.htmlTemplate
      ? renderTemplate(template.htmlTemplate, ctx)
      : renderTemplate(template.bodyTemplate, ctx);

    // Create notification record
    const { error } = await supabase
      .from('rh_notifications')
      .insert({
        tenant_id: tenantId,
        return_id: ctx.returnId || null,
        ticket_id: ctx.ticketId || null,
        customer_id: ctx.customerId || null,
        channel: 'email',
        template: eventType,
        recipient_email: ctx.recipientEmail,
        subject: renderedSubject,
        content: renderedBody,
        status: 'pending',
        metadata: {
          senderName: rhSettings.notifications.senderName || '',
          isHtml: !!template.htmlTemplate,
        },
      });

    if (error) {
      console.error('Failed to create public email notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('triggerPublicEmailNotification error:', err);
    return { success: false, error: 'Unexpected error' };
  }
}
