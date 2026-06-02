/**
 * Admin-side CRUD for customer review requests. The actual token + DB row
 * generation happens server-side (token from `generate_tracking_token()`)
 * and emails are sent via the existing rh-notification-trigger pipeline.
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { FeedbackRequest, FeedbackRequestFilter } from '@/types/feedback';
import { getShipment, getShipmentItems } from './wh-shipments';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transform(row: any): FeedbackRequest {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    shipmentId: row.shipment_id,
    productId: row.product_id,
    batchId: row.batch_id || undefined,
    variantTitle: row.variant_title || undefined,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    token: row.token,
    status: row.status,
    sentAt: row.sent_at || undefined,
    openedAt: row.opened_at || undefined,
    submittedAt: row.submitted_at || undefined,
    expiresAt: row.expires_at,
    reminderSentAt: row.reminder_sent_at || undefined,
    createdAt: row.created_at,
    createdBy: row.created_by || undefined,
    productName: row.products?.name,
    productImage: row.products?.image_url,
    shipmentNumber: row.wh_shipments?.shipment_number,
  };
}

/**
 * Create one feedback_request per (product, batch, variant) on a shipment.
 * Reuses the existing 10-char tracking-token generator (Postgres function).
 * Triggers the request email via the shared notification trigger.
 */
export async function createFeedbackRequestsForShipment(
  shipmentId: string,
  options: {
    silent?: boolean;
    /** Email mode: default template, or a custom (operator-edited) mail.
     *  In custom mode the verified feedback link is injected automatically. */
    email?: { mode: 'default' } | { mode: 'custom'; subject: string; body: string };
  } = {},
): Promise<{
  created: number;
  emailsSent: number;
  firstToken?: string;
  error?: string;
}> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { created: 0, emailsSent: 0, error: 'No tenant' };

  // Module gate
  const { hasModule } = await import('./billing');
  if (!(await hasModule('feedback_starter'))) {
    return { created: 0, emailsSent: 0, error: 'Feedback module not active' };
  }

  const shipment = await getShipment(shipmentId);
  if (!shipment) return { created: 0, emailsSent: 0, error: 'Shipment not found' };
  if (!shipment.recipientEmail) return { created: 0, emailsSent: 0, error: 'No recipient email' };

  const items = await getShipmentItems(shipmentId);
  if (items.length === 0) return { created: 0, emailsSent: 0, error: 'No items to review' };

  // Dedup by (productId, batchId, variantTitle) — one request per variant
  const seen = new Set<string>();
  const variants = items
    .filter(it => it.productId)
    .filter(it => {
      const key = `${it.productId}::${it.batchId || ''}::${it.variantTitle || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (variants.length === 0) return { created: 0, emailsSent: 0, error: 'No valid variants' };

  // Pre-fetch existing requests for this shipment to avoid duplicates if the
  // admin clicks twice. Only block when there's still an open request for the
  // same variant.
  const { data: existing } = await supabase
    .from('feedback_requests')
    .select('product_id, batch_id, variant_title, status')
    .eq('shipment_id', shipmentId)
    .in('status', ['pending', 'opened']);

  const existingKeys = new Set<string>(
    (existing || []).map(r => `${r.product_id}::${r.batch_id || ''}::${r.variant_title || ''}`),
  );

  // Generate tokens server-side via SECURITY DEFINER-equivalent: use the
  // Postgres function `generate_tracking_token()` inline in each INSERT.
  // PostgREST supports default expressions on INSERT — we set token via
  // RPC-driven default since the column doesn't have one yet. Easier: get
  // tokens client-side via an RPC call.
  const rows: Array<{
    tenant_id: string;
    shipment_id: string;
    product_id: string;
    batch_id: string | null;
    variant_title: string | null;
    customer_email: string;
    customer_name: string;
    token: string;
    status: string;
    sent_at: string;
  }> = [];

  const now = new Date().toISOString();
  for (const v of variants) {
    const key = `${v.productId}::${v.batchId || ''}::${v.variantTitle || ''}`;
    if (existingKeys.has(key)) continue;

    const { data: tokenData, error: tokenErr } = await supabase.rpc('generate_tracking_token');
    if (tokenErr || !tokenData) {
      return { created: 0, emailsSent: 0, error: `Token generation failed: ${tokenErr?.message}` };
    }

    rows.push({
      tenant_id: tenantId,
      shipment_id: shipmentId,
      product_id: v.productId,
      batch_id: v.batchId || null,
      variant_title: v.variantTitle || null,
      customer_email: shipment.recipientEmail!,
      customer_name: shipment.recipientName || 'Kunde',
      token: tokenData as string,
      status: 'pending',
      sent_at: now,
    });
  }

  // Resolve the token we link to. If every variant already has a request
  // (e.g. silently pre-created on delivery), reuse the latest one and STILL
  // send — don't abort. Otherwise insert the new requests.
  let firstToken: string | undefined;
  let createdCount = 0;
  if (rows.length === 0) {
    const { data: existing } = await supabase
      .from('feedback_requests')
      .select('token')
      .eq('shipment_id', shipmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    firstToken = existing?.token || undefined;
    if (!firstToken) {
      return { created: 0, emailsSent: 0, error: 'No feedback request found for this shipment' };
    }
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from('feedback_requests')
      .insert(rows)
      .select('id, token');
    if (insErr) return { created: 0, emailsSent: 0, error: insErr.message };
    firstToken = inserted?.[0]?.token;
    createdCount = rows.length;
  }

  // Send via sendCustomFeedbackEmail — it writes the rh_notifications row
  // directly (no dependency on an enabled rh_email_templates row, which could
  // be disabled and silently skip), so the DB dispatch trigger always fires.
  // The verified link is injected as a "Jetzt bewerten" CTA button.
  let emailsSent = 0;
  if (firstToken && !options.silent) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dpp-app.fambliss.eu';
    const feedbackUrl = `${origin}/feedback/${firstToken}`;
    const custom = options.email?.mode === 'custom' ? options.email : null;
    try {
      const { sendCustomFeedbackEmail } = await import('./rh-notification-trigger');
      const res = await sendCustomFeedbackEmail({
        tenantId,
        recipientEmail: shipment.recipientEmail!,
        recipientName: shipment.recipientName,
        subject: custom ? custom.subject : 'Wie war dein Fambliss-Moment?',
        body: custom ? custom.body : DEFAULT_FEEDBACK_BODY,
        feedbackUrl,
        shipmentId: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
      });
      if (res.success) emailsSent = 1;
    } catch (e) {
      console.warn('Feedback email failed (non-fatal):', e);
    }
  }

  return { created: createdCount, emailsSent, firstToken };
}

/** Default warm feedback text. The greeting ("Hallo …") and the "Jetzt
 *  bewerten" CTA button are added automatically by sendCustomFeedbackEmail; the
 *  Family-Joy receiver wraps everything in the Fambliss shell + signature. */
const DEFAULT_FEEDBACK_BODY = `vor ein paar Tagen ist dein Fambliss-Paket bei dir angekommen — wir hoffen, es hat schon einen festen Platz in eurem Familienalltag gefunden. 💛

Wir würden uns riesig freuen, wenn du dir einen kurzen Moment nimmst und deine Erfahrung teilst. Deine Bewertung hilft anderen Familien bei der Entscheidung — und uns, Fambliss noch besser zu machen.

Es dauert wirklich nur eine Minute:`;

export async function getFeedbackRequests(filter?: FeedbackRequestFilter): Promise<FeedbackRequest[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let q = supabase
    .from('feedback_requests')
    .select('*, products(name, image_url), wh_shipments(shipment_number)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (filter?.status) {
    if (Array.isArray(filter.status)) q = q.in('status', filter.status);
    else q = q.eq('status', filter.status);
  }
  if (filter?.shipmentId) q = q.eq('shipment_id', filter.shipmentId);
  if (filter?.limit) q = q.limit(filter.limit);

  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(transform);
}

export async function cancelFeedbackRequest(id: string): Promise<void> {
  await supabase
    .from('feedback_requests')
    .update({ status: 'cancelled' })
    .eq('id', id);
}

export async function resendFeedbackRequest(id: string): Promise<{ success: boolean; error?: string }> {
  const { data: req } = await supabase
    .from('feedback_requests')
    .select('*, wh_shipments(shipment_number, recipient_name, recipient_email)')
    .eq('id', id)
    .single();

  if (!req) return { success: false, error: 'Request not found' };

  try {
    const mod = await import('./rh-notification-trigger');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trigger = (mod as any).triggerPublicEmailNotification;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    await trigger(req.tenant_id, 'feedback_reminder', {
      customerName: req.customer_name,
      customerEmail: req.customer_email,
      feedbackUrl: `${origin}/feedback/${req.token}`,
      shipmentNumber: req.wh_shipments?.shipment_number,
    });
    await supabase
      .from('feedback_requests')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
