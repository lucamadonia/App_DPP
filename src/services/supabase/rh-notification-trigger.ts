/**
 * Supabase Returns Hub Notification Trigger Service
 *
 * Checks settings + template, renders variables, creates rh_notifications record.
 * The actual email sending is handled by the Supabase Edge Function via DB webhook.
 */
import { supabase, supabaseAnon, getCurrentTenantId } from '@/lib/supabase';
import type { RhNotificationEventType } from '@/types/returns-hub';
import type { EmailDesignConfig } from '@/components/returns/email-editor/emailEditorTypes';
import { renderEmailHtml } from '@/components/returns/email-editor/emailHtmlRenderer';
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

/**
 * Directly invoke the send-email Edge Function after creating a notification record.
 * This bypasses the need for a Database Webhook (which isn't configured).
 * Accepts an optional client parameter for public (anon) context.
 */
async function sendNotificationEmail(
  notificationRecord: Record<string, unknown>,
  client: typeof supabase = supabase
) {
  try {
    await client.functions.invoke('send-email', {
      body: { record: notificationRecord },
    });
  } catch (err) {
    console.warn('Direct send-email invocation failed:', err);
  }
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

    // Resolve email locale from settings
    const emailLocale = settings.notifications?.emailLocale || 'en';

    // Render subject (locale-aware) and body
    const designConfig = template.designConfig as unknown as EmailDesignConfig | undefined;
    const localeContent = designConfig?.locales?.[emailLocale];
    const subjectToRender = localeContent?.subjectTemplate || template.subjectTemplate;
    const renderedSubject = renderTemplate(subjectToRender, ctx);

    // Prefer rendering from designConfig with locale, fall back to stored htmlTemplate, then bodyTemplate
    let renderedBody: string;
    if (designConfig?.blocks?.length) {
      renderedBody = renderTemplate(renderEmailHtml(designConfig, '', emailLocale), ctx);
    } else if (template.htmlTemplate) {
      renderedBody = renderTemplate(template.htmlTemplate, ctx);
    } else {
      renderedBody = renderTemplate(template.bodyTemplate, ctx);
    }

    // Create notification record and invoke send-email Edge Function directly
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return { success: false, error: 'No tenant set' };

    const notificationPayload = {
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
        isHtml: true,
        locale: emailLocale,
      },
    };

    const { data, error } = await supabase
      .from('rh_notifications')
      .insert(notificationPayload)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create email notification:', error);
      return { success: false, error: error.message };
    }

    // Directly invoke Edge Function (no DB webhook configured)
    sendNotificationEmail({ ...notificationPayload, id: data.id });

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
    // Check global settings from tenant (use anon client for public context)
    const { data: tenant } = await supabaseAnon
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

    // Resolve email locale from settings
    const emailLocale = rhSettings?.notifications?.emailLocale || 'en';

    // Render subject (locale-aware) and body
    const designConfig = template.designConfig as unknown as EmailDesignConfig | undefined;
    const localeContent = designConfig?.locales?.[emailLocale];
    const subjectToRender = localeContent?.subjectTemplate || template.subjectTemplate;
    const renderedSubject = renderTemplate(subjectToRender, ctx);

    let renderedBody: string;
    if (designConfig?.blocks?.length) {
      renderedBody = renderTemplate(renderEmailHtml(designConfig, '', emailLocale), ctx);
    } else if (template.htmlTemplate) {
      renderedBody = renderTemplate(template.htmlTemplate, ctx);
    } else {
      renderedBody = renderTemplate(template.bodyTemplate, ctx);
    }

    // Create notification record (use anon client for public context)
    const notificationPayload = {
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
        isHtml: true,
        locale: emailLocale,
      },
    };

    const { data, error } = await supabaseAnon
      .from('rh_notifications')
      .insert(notificationPayload)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create public email notification:', error);
      return { success: false, error: error.message };
    }

    // Directly invoke Edge Function with anon client (no DB webhook configured)
    sendNotificationEmail({ ...notificationPayload, id: data?.id }, supabaseAnon);

    return { success: true };
  } catch (err) {
    console.error('triggerPublicEmailNotification error:', err);
    return { success: false, error: 'Unexpected error' };
  }
}
