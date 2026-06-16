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
import { getReturnReasonLabel, isReasonCategory } from '@/lib/return-reasons';

export interface NotificationContext {
  recipientEmail: string;
  customerName?: string;
  firstName?: string;
  returnNumber?: string;
  status?: string;
  /** Free-text reason OR a canonical reason-category slug (e.g. "other"). */
  reason?: string;
  /** Canonical reason-category slug, used when `reason` carries free text. */
  reasonCategory?: string;
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
// Mail delivery — SINGLE path: DB trigger → notify-dispatch (server-side).
//
// Each notification is INSERTed into rh_notifications below. An AFTER INSERT
// trigger (migration 20260602b_rh_notifications_dispatch_trigger.sql) calls
// the notify-dispatch Edge Function server-to-server, which routes per tenant
// (Fambliss → Family-Joy mail-event-receiver; every other tenant → local
// send-email / tenant SMTP), signs with the server-only HMAC secret, and
// flips the row status to sent/failed.
//
// DO NOT also send from the client here. A previous client-side forward
// (sendNotificationEmail → mail-hub-forward) ran IN ADDITION to the trigger,
// so every client-initiated mail was dispatched twice — once by the client
// (region hard-coded 'dach') and once by notify-dispatch (region derived from
// the recipient TLD, e.g. 'intl'). The Family-Joy receiver dedups on
// source_event_id, but its check is read-before-write (the mail_events row is
// only written after the SMTP send), so two simultaneous POSTs both passed the
// check and both sent. Keeping delivery on the single server-side path removes
// the race entirely. The receiver dedup remains a safety net for other sources.
// ────────────────────────────────────────────────────────────────────

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
/** Base URL of the public app that serves the return-tracking page. Matches the
 *  convention used by the shipment mails (see wh-shipments.ts). The route
 *  `/returns/track/:returnNumber` auto-loads the return (email optional). */
const RETURN_TRACKING_BASE = 'https://dpp-app.fambliss.eu';

/** Build the customer-facing return-tracking URL for the {{trackingUrl}} button. */
function buildReturnTrackingUrl(returnNumber?: string): string {
  if (!returnNumber) return '';
  return `${RETURN_TRACKING_BASE}/returns/track/${encodeURIComponent(returnNumber)}`;
}

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
 * Resolve the human-readable reason shown in mails. Callers historically pass
 * the raw category slug (e.g. "other") in `ctx.reason`, which rendered as a
 * bare "Reason: other". We now: keep genuine free text as-is, map a known slug
 * to its localized label, and otherwise fall back to `ctx.reasonCategory`.
 */
function resolveDisplayReason(ctx: NotificationContext, locale: string): string {
  const raw = (ctx.reason || '').trim();
  if (raw && !isReasonCategory(raw)) return raw; // genuine free-text reason
  const category = raw || ctx.reasonCategory;
  return getReturnReasonLabel(category, locale);
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

    // Localize the reason label and default the tracking-button URL (so the
    // "Retoure verfolgen" button isn't a dead href="") before rendering.
    const lctx: NotificationContext = {
      ...ctx,
      reason: resolveDisplayReason(ctx, emailLocale),
      trackingUrl: ctx.trackingUrl || buildReturnTrackingUrl(ctx.returnNumber),
    };

    // Render subject (locale-aware) and body
    const designConfig = template.designConfig as unknown as EmailDesignConfig | undefined;
    const localeContent = designConfig?.locales?.[emailLocale];
    const subjectToRender = localeContent?.subjectTemplate || template.subjectTemplate;
    const renderedSubject = renderTemplate(subjectToRender, lctx);

    // Prefer rendering from designConfig with locale, fall back to stored htmlTemplate, then bodyTemplate
    let renderedBody: string;
    if (designConfig?.blocks?.length) {
      renderedBody = renderTemplate(renderEmailHtml(designConfig, '', emailLocale), lctx);
    } else if (template.htmlTemplate) {
      renderedBody = renderTemplate(template.htmlTemplate, lctx);
    } else {
      renderedBody = renderTemplate(template.bodyTemplate, lctx);
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

    // Delivery is handled server-side by the rh_notifications AFTER INSERT
    // trigger → notify-dispatch (see top-of-file note). No client send here.
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rhSettings = (tenant?.settings as any)?.returnsHub;
    const emailLocale = rhSettings?.notifications?.emailLocale || 'en';

    // Localize the reason label and default the tracking-button URL (so the
    // "Retoure verfolgen" button isn't a dead href="") before rendering.
    const lctx: NotificationContext = {
      ...ctx,
      reason: resolveDisplayReason(ctx, emailLocale),
      trackingUrl: ctx.trackingUrl || buildReturnTrackingUrl(ctx.returnNumber),
    };

    // Render subject (locale-aware) and body
    const designConfig = template.designConfig as unknown as EmailDesignConfig | undefined;
    const localeContent = designConfig?.locales?.[emailLocale];
    const subjectToRender = localeContent?.subjectTemplate || template.subjectTemplate;
    const renderedSubject = renderTemplate(subjectToRender, lctx);

    let renderedBody: string;
    if (designConfig?.blocks?.length) {
      renderedBody = renderTemplate(renderEmailHtml(designConfig, '', emailLocale), lctx);
    } else if (template.htmlTemplate) {
      renderedBody = renderTemplate(template.htmlTemplate, lctx);
    } else {
      renderedBody = renderTemplate(template.bodyTemplate, lctx);
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

    const { error } = await supabaseAnon
      .from('rh_notifications')
      .insert(notificationPayload)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create public email notification:', error);
      return { success: false, error: error.message };
    }

    // Delivery handled server-side by the AFTER INSERT trigger → notify-dispatch.
    return { success: true };
  } catch (err) {
    console.error('triggerPublicEmailNotification error:', err);
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Wrap a plain-text message in a minimal, brand-consistent HTML shell.
 * Newlines become <br>. Kept deliberately simple — these ad-hoc contact
 * mails carry operational notes (incomplete address, shipping delay, …),
 * not marketing layout.
 */
function wrapCustomMessageHtml(
  message: string,
  greetingName?: string,
  cta?: { label: string; url: string },
): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = esc(message).replace(/\r?\n/g, '<br>');
  const greeting = greetingName
    ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#2d3a28">Hallo ${esc(greetingName)},</p>`
    : '';
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px"><tr><td bgcolor="#2d3a28" style="border-radius:9999px"><a href="${esc(cta.url)}" target="_blank" rel="noopener" style="display:inline-block;padding:15px 40px;color:#f5f4ef;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.12em;text-transform:uppercase">${esc(cta.label)}</a></td></tr></table>`
    : '';
  // Inner fragment only — the Family-Joy receiver wraps this in the full
  // Fambliss brand shell (logo, white card, footer), so branding stays in one
  // place. Colours match the Fambliss palette (#2d3a28 / #6b6e64).
  return greeting
    + `<div style="font-size:16px;line-height:1.6;color:#6b6e64">${body}</div>`
    + button;
}

/**
 * Send a free-text email to a shipment's recipient straight from the system
 * (e.g. from the warehouse packing screen). Unlike triggerEmailNotification
 * this does NOT require an enabled template and does NOT dedup — the operator
 * may legitimately send several messages about the same shipment.
 *
 * Works in both delivery modes: with the Family-Joy mail-hub enabled the
 * rendered subject/body are forwarded (the receiver sends them as-is since
 * there's no template for 'custom_message'); otherwise the local send-email
 * Edge Function is invoked. A mirror row is always written to rh_notifications
 * so the message shows up in the admin notification history.
 */
export async function sendCustomShipmentEmail(params: {
  shipmentId: string;
  shipmentNumber?: string;
  recipientEmail: string;
  recipientName?: string;
  customerId?: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    const recipientEmail = params.recipientEmail?.trim();
    if (!recipientEmail) return { success: false, error: 'No recipient email' };
    if (!params.subject?.trim() || !params.message?.trim()) {
      return { success: false, error: 'Subject and message are required' };
    }

    const tenantId = await getCurrentTenantId();
    if (!tenantId) return { success: false, error: 'No tenant set' };

    const settings = await getReturnsHubSettings();
    const emailLocale = settings.notifications?.emailLocale || 'de';
    const firstName = (params.recipientName || '').trim().split(/\s+/)[0] || undefined;

    const renderedBody = wrapCustomMessageHtml(params.message, firstName);

    const notificationPayload = {
      tenant_id: tenantId,
      return_id: null,
      ticket_id: null,
      customer_id: params.customerId || null,
      wh_shipment_id: params.shipmentId || null,
      channel: 'email',
      template: 'custom_message' as RhNotificationEventType,
      recipient_email: recipientEmail,
      subject: params.subject.trim(),
      content: renderedBody,
      status: 'pending',
      metadata: {
        senderName: settings.notifications?.senderName || '',
        isHtml: true,
        locale: emailLocale,
        custom: true,
        ...(params.shipmentNumber && { shipment_number: params.shipmentNumber }),
      },
    };

    const { data, error } = await supabase
      .from('rh_notifications')
      .insert(notificationPayload)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create custom email notification:', error);
      return { success: false, error: error.message };
    }

    // Delivery handled server-side by the AFTER INSERT trigger → notify-dispatch.
    return { success: true, notificationId: data.id };
  } catch (err) {
    console.error('sendCustomShipmentEmail error:', err);
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Send a customized feedback-request email. Like sendCustomShipmentEmail but
 * guarantees the review link is always present and correct: any
 * `{{feedbackUrl}}` placeholder is stripped from the text and a real
 * "Jetzt bewerten" CTA button (pointing at the verified feedbackUrl) is
 * appended — so an operator editing the copy can never break the link.
 */
export async function sendCustomFeedbackEmail(params: {
  tenantId: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  feedbackUrl: string;
  shipmentId?: string;
  shipmentNumber?: string;
}): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    const recipientEmail = params.recipientEmail?.trim();
    if (!recipientEmail) return { success: false, error: 'No recipient email' };
    if (!params.feedbackUrl) return { success: false, error: 'Missing feedback link' };

    // Subject: substitute the placeholder (the link lives in the CTA button,
    // so we just drop any stray placeholder from the subject line).
    const subject = (params.subject || 'Wie war deine Bestellung?')
      .replace(/\{\{feedbackUrl\}\}/g, '')
      .trim() || 'Wie war deine Bestellung?';

    // Body: strip the placeholder line(s); the verified link is rendered as a
    // CTA button by the wrapper so it can never be malformed.
    const cleanedBody = (params.body || '')
      .replace(/\{\{feedbackUrl\}\}/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const firstName = (params.recipientName || '').trim().split(/\s+/)[0] || undefined;
    const renderedBody = wrapCustomMessageHtml(cleanedBody, firstName, {
      label: 'Jetzt bewerten',
      url: params.feedbackUrl,
    });

    const settings = await getReturnsHubSettings();
    const emailLocale = settings.notifications?.emailLocale || 'de';

    const notificationPayload = {
      tenant_id: params.tenantId,
      return_id: null,
      ticket_id: null,
      customer_id: null,
      wh_shipment_id: params.shipmentId || null,
      channel: 'email',
      template: 'custom_message' as RhNotificationEventType,
      recipient_email: recipientEmail,
      subject,
      content: renderedBody,
      status: 'pending',
      metadata: {
        senderName: settings.notifications?.senderName || '',
        isHtml: true,
        locale: emailLocale,
        custom: true,
        kind: 'feedback_request_custom',
        ...(params.shipmentNumber && { shipment_number: params.shipmentNumber }),
      },
    };

    const { data, error } = await supabase
      .from('rh_notifications')
      .insert(notificationPayload)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create custom feedback email notification:', error);
      return { success: false, error: error.message };
    }

    // Delivery handled server-side by the AFTER INSERT trigger → notify-dispatch.
    return { success: true, notificationId: data.id };
  } catch (err) {
    console.error('sendCustomFeedbackEmail error:', err);
    return { success: false, error: 'Unexpected error' };
  }
}
