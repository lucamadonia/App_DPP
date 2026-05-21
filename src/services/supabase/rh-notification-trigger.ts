/**
 * Supabase Returns Hub Notification Trigger Service
 *
 * Checks settings + template, renders variables, creates rh_notifications record.
 * The actual email sending is handled by the Supabase Edge Function via DB webhook.
 */
import { supabase, supabaseAnon, getCurrentTenantId } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edge-function';
import type { RhNotificationEventType } from '@/types/returns-hub';
import type { EmailDesignConfig } from '@/components/returns/email-editor/emailEditorTypes';
import { renderEmailHtml } from '@/components/returns/email-editor/emailHtmlRenderer';
import { getReturnsHubSettings } from './rh-settings';
import { getRhEmailTemplate, getRhEmailTemplateByTenantId } from './rh-email-templates';

export interface NotificationContext {
  recipientEmail: string;
  customerName?: string;
  firstName?: string;
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
  // Shipment lifecycle + engagement mails
  shipmentId?: string;
  shipmentNumber?: string;
  trackingNumber?: string;
  itemCount?: number;
  /** Pre-rendered HTML for per-product tile blocks. Built by the caller from
   *  wh_shipment_items joined to products.onboarding_steps/tutorial_url. */
  productsHtml?: string;
  heroImageUrl?: string;
  tutorialUrl?: string;
  reviewUrl?: string;
  /** Feedback CTA URL used in shipment-delivered + engagement mails (template var: {{feedbackUrl}}). */
  feedbackUrl?: string;
  // Branding / footer (resolved once per tenant by the caller)
  shopUrl?: string;
  journalUrl?: string;
  contactUrl?: string;
  imprintUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
  unsubscribeUrl?: string;
  hrbNumber?: string;
}

// ────────────────────────────────────────────────────────────────────
// Phase D — Family-Joy Mail-Hub cutover
//
// When VITE_MAIL_HUB_VIA_FAMILY_JOY=true the notification trigger POSTs
// to the Family-Joy mail-event-receiver edge function instead of writing
// to rh_notifications + invoking the local send-email function. The
// local rh_notifications row is still written as a *mirror* so the
// admin UIs in Trackbliss (e.g. /returns/notifications) keep working
// without code changes. On Family-Joy delivery success the mirror's
// status is updated to 'sent'; on failure we fall back to the legacy
// local send-email pipeline so customers always get a mail eventually.
//
// To activate:
//   1) Deploy Family-Joy mail-event-receiver (see family-joy/docs/MAIL-HUB-DEPLOY.md)
//   2) Add to App_DPP/.env (or Vercel env):
//      VITE_MAIL_HUB_VIA_FAMILY_JOY=true
//      VITE_MAIL_HUB_URL=https://bkaaepzqejzdczivquoh.supabase.co/functions/v1/mail-event-receiver
//      VITE_MAIL_HUB_SECRET=<MAIL_EVENT_RECEIVER_SECRET from Family-Joy>
//   3) Re-enable Phase-1 shipment templates: node scripts/disable-shipment-templates.mjs (flip to enable=true)
// ────────────────────────────────────────────────────────────────────

const MAIL_HUB_ENABLED = (import.meta.env.VITE_MAIL_HUB_VIA_FAMILY_JOY || '') === 'true';
const MAIL_HUB_URL = import.meta.env.VITE_MAIL_HUB_URL || '';
const MAIL_HUB_SECRET = import.meta.env.VITE_MAIL_HUB_SECRET || '';

/** HMAC-SHA256(hex) over the request body. Family-Joy mail-event-receiver
 *  uses constant-time compare on the same secret. */
async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Forward an event to Family-Joy mail-event-receiver. Returns true on 2xx,
 * false otherwise so the caller can decide to fall back to the local pipe.
 */
async function postToFamilyJoy(input: {
  eventType: RhNotificationEventType;
  sourceEventId: string;
  recipientEmail: string;
  language?: string;
  context: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  if (!MAIL_HUB_ENABLED || !MAIL_HUB_URL) return false;
  const body = JSON.stringify({
    eventType: input.eventType,
    source: 'trackbliss',
    sourceEventId: input.sourceEventId,
    recipientEmail: input.recipientEmail,
    language: input.language || 'de',
    userType: 'customer',
    context: input.context,
    metadata: input.metadata,
  });
  try {
    const signature = MAIL_HUB_SECRET ? await hmacHex(MAIL_HUB_SECRET, body) : '';
    const res = await fetch(MAIL_HUB_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(signature ? { 'X-Hook-Signature': signature } : {}),
      },
      body,
    });
    return res.ok;
  } catch (err) {
    console.warn('[mail-hub] POST failed, will fall back to local pipeline:', err);
    return false;
  }
}

/**
 * Directly invoke the send-email Edge Function after creating a notification record.
 * This bypasses the need for a Database Webhook (which isn't configured).
 * Accepts an optional client parameter for public (anon) context.
 */
async function sendNotificationEmail(
  notificationRecord: Record<string, unknown>,
  client?: typeof supabase
) {
  // Phase D — when the mail-hub is enabled, the Family-Joy receiver is the
  // source of truth for the actual SMTP send. We still wrote a row into
  // rh_notifications above (so Trackbliss admin UIs stay populated), but
  // we forward to Family-Joy instead of invoking Trackbliss's send-email.
  if (MAIL_HUB_ENABLED) {
    const ok = await postToFamilyJoy({
      eventType: notificationRecord.template as RhNotificationEventType,
      sourceEventId: `trackbliss:rh_notif:${notificationRecord.id}`,
      recipientEmail: notificationRecord.recipient_email as string,
      language: (notificationRecord.metadata as { locale?: string } | undefined)?.locale,
      context: {
        // Pass through the rendered subject + content so the receiver can
        // skip its own template lookup if the same trigger_event happens
        // to be missing in Family-Joy. The receiver still prefers its own
        // template lookup when present (Phase C imports cover this).
        renderedSubject: notificationRecord.subject,
        renderedBody: notificationRecord.content,
      },
      metadata: {
        shipment_id: notificationRecord.wh_shipment_id,
        return_id: notificationRecord.return_id,
        ticket_id: notificationRecord.ticket_id,
        customer_id: notificationRecord.customer_id,
        ...(notificationRecord.metadata as Record<string, unknown> | null),
      },
    });
    if (ok) return;
    // If Family-Joy is down we keep the customer journey safe by silently
    // falling through to the legacy local send-email pipeline.
    console.warn('[mail-hub] forward failed, using local fallback');
  }

  try {
    if (client && client !== supabase) {
      // Public (anon) context — use direct invoke (no session refresh needed)
      await client.functions.invoke('send-email', {
        body: { record: notificationRecord },
      });
    } else {
      // Authenticated context — use wrapper with session refresh
      await invokeEdgeFunction('send-email', { record: notificationRecord });
    }
  } catch (err) {
    console.warn('Direct send-email invocation failed:', err);
  }
}

/**
 * Deduplication: check if the same email (eventType + recipient + entity) was
 * already created in the last 60 seconds.  Prevents double-sends when both
 * a hard-coded trigger and a workflow action fire for the same event.
 */
async function isDuplicate(
  client: typeof supabase,
  eventType: string,
  recipientEmail: string,
  returnId?: string | null,
  ticketId?: string | null,
  shipmentId?: string | null,
): Promise<boolean> {
  // For shipment + engagement events the dedup window is larger: a delivered
  // mail should never resend even if status flickers, and a day_N engagement
  // mail must only ever fire once per shipment. For return/ticket events the
  // tight 60-second window stays — covers double-fire from workflow + trigger.
  const isShipmentEvent =
    eventType.startsWith('shipment_') || eventType.startsWith('engagement_');
  const windowMs = isShipmentEvent ? 365 * 24 * 60 * 60_000 : 60_000;
  const since = new Date(Date.now() - windowMs).toISOString();
  let query = client
    .from('rh_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('template', eventType)
    .eq('recipient_email', recipientEmail)
    .gte('created_at', since);

  if (returnId) query = query.eq('return_id', returnId);
  if (ticketId) query = query.eq('ticket_id', ticketId);
  if (shipmentId) query = query.eq('wh_shipment_id', shipmentId);

  const { count } = await query;
  return (count ?? 0) > 0;
}

/** Sensible defaults for Fambliss branding/footer vars so the hand-coded
 *  shipment templates always have non-empty values for legal links, even
 *  when the caller didn't bother to pass them. Tenants can override per-call. */
const DEFAULT_BRAND_VARS = {
  shopUrl:        'https://shop.fambliss.de',
  journalUrl:     'https://shop.fambliss.de/blogs/news',
  contactUrl:     'https://shop.fambliss.de/pages/kontakt',
  imprintUrl:     'https://shop.fambliss.de/pages/impressum',
  privacyUrl:     'https://shop.fambliss.de/pages/datenschutz',
  termsUrl:       'https://shop.fambliss.de/pages/agb',
  unsubscribeUrl: 'https://shop.fambliss.de/pages/abmelden',
  hrbNumber:      'HRB 99999',
} as const;

function renderTemplate(template: string, ctx: NotificationContext): string {
  const brand = { ...DEFAULT_BRAND_VARS };
  return template
    .replace(/\{\{customerName\}\}/g,  ctx.customerName || ctx.firstName || '')
    .replace(/\{\{firstName\}\}/g,     ctx.firstName || ctx.customerName || '')
    .replace(/\{\{returnNumber\}\}/g,  ctx.returnNumber || '')
    .replace(/\{\{status\}\}/g,        ctx.status || '')
    .replace(/\{\{reason\}\}/g,        ctx.reason || '')
    .replace(/\{\{refundAmount\}\}/g,  ctx.refundAmount || '')
    .replace(/\{\{ticketNumber\}\}/g,  ctx.ticketNumber || '')
    .replace(/\{\{subject\}\}/g,       ctx.subject || '')
    .replace(/\{\{trackingUrl\}\}/g,   ctx.trackingUrl || '')
    .replace(/\{\{shipmentNumber\}\}/g, ctx.shipmentNumber || '')
    .replace(/\{\{trackingNumber\}\}/g, ctx.trackingNumber || '')
    .replace(/\{\{itemCount\}\}/g,     ctx.itemCount != null ? String(ctx.itemCount) : '')
    .replace(/\{\{productsHtml\}\}/g,  ctx.productsHtml || '')
    .replace(/\{\{hero_image_url\}\}/g, ctx.heroImageUrl || '')
    .replace(/\{\{heroImageUrl\}\}/g,  ctx.heroImageUrl || '')
    .replace(/\{\{tutorialUrl\}\}/g,   ctx.tutorialUrl || '')
    .replace(/\{\{reviewUrl\}\}/g,     ctx.reviewUrl || '')
    .replace(/\{\{feedbackUrl\}\}/g,   ctx.feedbackUrl || '')
    .replace(/\{\{feedback_url\}\}/g,  ctx.feedbackUrl || '')
    .replace(/\{\{shopUrl\}\}/g,       ctx.shopUrl || brand.shopUrl)
    .replace(/\{\{shop_url\}\}/g,      ctx.shopUrl || brand.shopUrl)
    .replace(/\{\{journalUrl\}\}/g,    ctx.journalUrl || brand.journalUrl)
    .replace(/\{\{journal_url\}\}/g,   ctx.journalUrl || brand.journalUrl)
    .replace(/\{\{contactUrl\}\}/g,    ctx.contactUrl || brand.contactUrl)
    .replace(/\{\{contact_url\}\}/g,   ctx.contactUrl || brand.contactUrl)
    .replace(/\{\{imprintUrl\}\}/g,    ctx.imprintUrl || brand.imprintUrl)
    .replace(/\{\{imprint_url\}\}/g,   ctx.imprintUrl || brand.imprintUrl)
    .replace(/\{\{privacyUrl\}\}/g,    ctx.privacyUrl || brand.privacyUrl)
    .replace(/\{\{privacy_url\}\}/g,   ctx.privacyUrl || brand.privacyUrl)
    .replace(/\{\{termsUrl\}\}/g,      ctx.termsUrl || brand.termsUrl)
    .replace(/\{\{terms_url\}\}/g,     ctx.termsUrl || brand.termsUrl)
    .replace(/\{\{unsubscribeUrl\}\}/g, ctx.unsubscribeUrl || brand.unsubscribeUrl)
    .replace(/\{\{unsubscribe_url\}\}/g, ctx.unsubscribeUrl || brand.unsubscribeUrl)
    .replace(/\{\{hrbNumber\}\}/g,     ctx.hrbNumber || brand.hrbNumber)
    .replace(/\{\{hrb_number\}\}/g,    ctx.hrbNumber || brand.hrbNumber);
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
    // Check template — per-template enabled flag is the only gate
    const template = await getRhEmailTemplate(eventType);
    if (!template || !template.enabled) {
      console.warn(`[notification-trigger] Template "${eventType}" ${!template ? 'not found' : 'is disabled'} — skipping`);
      return { success: true, skipped: true };
    }

    // Resolve email locale from settings
    const settings = await getReturnsHubSettings();
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

    // Dedup: skip if same email was already sent (60s for returns/tickets,
    // 365d for shipment + engagement events — see isDuplicate)
    if (await isDuplicate(supabase, eventType, ctx.recipientEmail, ctx.returnId, ctx.ticketId, ctx.shipmentId)) {
      console.log(`[notification-trigger] Dedup: "${eventType}" to "${ctx.recipientEmail}" already sent recently — skipping`);
      return { success: true, skipped: true };
    }

    const notificationPayload = {
      tenant_id: tenantId,
      return_id: ctx.returnId || null,
      ticket_id: ctx.ticketId || null,
      customer_id: ctx.customerId || null,
      wh_shipment_id: ctx.shipmentId || null,
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
        ...(ctx.shipmentNumber && { shipment_number: ctx.shipmentNumber }),
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
    // Check template — per-template enabled flag is the only gate
    const template = await getRhEmailTemplateByTenantId(tenantId, eventType);
    if (!template || !template.enabled) {
      console.warn(`[notification-trigger] Public: Template "${eventType}" ${!template ? 'not found' : 'is disabled'} — skipping`);
      return { success: true, skipped: true };
    }

    // Resolve email locale from settings
    const { data: tenant } = await supabaseAnon
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    const rhSettings = (tenant?.settings as any)?.returnsHub;
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

    // Dedup: 60s for returns/tickets, 365d for shipment/engagement events
    if (await isDuplicate(supabaseAnon, eventType, ctx.recipientEmail, ctx.returnId, ctx.ticketId, ctx.shipmentId)) {
      console.log(`[notification-trigger] Public dedup: "${eventType}" to "${ctx.recipientEmail}" already sent recently — skipping`);
      return { success: true, skipped: true };
    }

    // Create notification record (use anon client for public context)
    const notificationPayload = {
      tenant_id: tenantId,
      return_id: ctx.returnId || null,
      ticket_id: ctx.ticketId || null,
      customer_id: ctx.customerId || null,
      wh_shipment_id: ctx.shipmentId || null,
      channel: 'email',
      template: eventType,
      recipient_email: ctx.recipientEmail,
      subject: renderedSubject,
      content: renderedBody,
      status: 'pending',
      metadata: {
        senderName: rhSettings?.notifications?.senderName || '',
        isHtml: true,
        locale: emailLocale,
        ...(ctx.shipmentNumber && { shipment_number: ctx.shipmentNumber }),
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
