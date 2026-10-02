/**
 * Supabase Edge Function: chatbot-order-lookup
 *
 * Order status lookup for the support chatbot. Hardened (EF-09): requires the
 * CHATBOT_SHARED_SECRET header, persistent rate limits, and one uniform
 * not-found answer for unknown tenant / order / email (no enumeration oracle).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  chatbotCorsHeaders as corsHeaders,
  chatbotJson as jsonResponse,
  checkChatbotSecret,
  enforceChatbotLimits,
  NOT_FOUND_MESSAGE,
} from '../_shared/chatbot-guard.ts';

const FINANCIAL_LABELS_DE: Record<string, string> = {
  paid: 'Bezahlt',
  pending: 'Zahlung ausstehend',
  refunded: 'Komplett erstattet',
  partially_refunded: 'Teilweise erstattet',
  voided: 'Storniert',
  authorized: 'Autorisiert',
};

const FULFILLMENT_LABELS_DE: Record<string, string> = {
  unfulfilled: 'Noch nicht versandt',
  partial: 'Teilweise versandt',
  shipped: 'Versandt — auf dem Weg zu dir',
  delivered: 'Zugestellt',
  fulfilled: 'Versandt',
};

const ORDER_STATUS_LABELS_DE: Record<string, string> = {
  open: 'Offen',
  closed: 'Abgeschlossen',
  cancelled: 'Storniert',
};

const SHIPMENT_STATUS_LABELS_DE: Record<string, string> = {
  draft: 'Bestellung registriert — wird vorbereitet',
  picking: 'Wird gerade kommissioniert (Artikel werden aus dem Lager geholt)',
  packed: 'Verpackt — wartet auf Versandlabel',
  label_created: 'Versandlabel erstellt — wird abgeholt',
  shipped: 'An den Versanddienstleister übergeben',
  in_transit: 'Unterwegs zu dir',
  delivered: 'Zugestellt',
  cancelled: 'Versand storniert',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const denied = checkChatbotSecret(req);
  if (denied) return denied;

  let body: { order_number?: string; email?: string; tenant_slug?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  // Normalize: strip leading #, whitespace, and any non-alphanumeric/dash chars
  // (prevents injection into PostgREST .or() filter syntax)
  const rawOrderNumber = (body.order_number || '')
    .trim()
    .replace(/^#/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .slice(0, 64);
  const email = (body.email || '').trim().toLowerCase().slice(0, 254);
  const tenantSlug = (body.tenant_slug || '').trim().replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 80);

  if (!rawOrderNumber || !email || !tenantSlug) {
    return jsonResponse({
      error: 'Missing required fields',
      message: 'Bitte gib Bestellnummer, E-Mail-Adresse und Tenant an.',
      required: ['order_number', 'email', 'tenant_slug'],
    }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({
      error: 'Invalid email format',
      message: 'Die angegebene E-Mail-Adresse hat kein gültiges Format.',
    }, 400);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const limited = await enforceChatbotLimits(supabase, req, {
      fn: 'order-lookup',
      email,
      tenantSlug,
      reference: rawOrderNumber,
    });
    if (limited) return limited;

    const notFound = () => jsonResponse({ found: false, message: NOT_FOUND_MESSAGE }, 200);

    // 1. Resolve tenant (unknown tenant answers exactly like an unknown order)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('slug', tenantSlug)
      .maybeSingle();

    if (tenantError || !tenant) {
      return notFound();
    }

    // 2. Look up order by external_order_number, filtered by tenant + email
    //    Try both with and without # prefix to handle Shopify variants
    const { data: order, error: orderError } = await supabase
      .from('commerce_orders')
      .select(`
        id,
        external_order_number,
        external_order_id,
        external_url,
        platform,
        currency,
        total_amount,
        item_count,
        customer_email,
        customer_name,
        financial_status,
        fulfillment_status,
        order_status,
        created_at,
        updated_at
      `)
      .eq('tenant_id', tenant.id)
      .or(`external_order_number.eq.${rawOrderNumber},external_order_number.eq.#${rawOrderNumber}`)
      .maybeSingle();

    if (orderError) {
      console.error('Failed to query order:', orderError.message);
      return jsonResponse({ error: 'Database error' }, 500);
    }

    // 2b/3. Unknown order and email mismatch get the identical answer, so the
    // endpoint cannot be used to enumerate order numbers or test emails.
    if (!order || (order.customer_email || '').toLowerCase() !== email) {
      return notFound();
    }

    // 4. Fetch order items (for context)
    const { data: items } = await supabase
      .from('commerce_order_items')
      .select('title, variant_title, sku, gtin, quantity, unit_price, total_price')
      .eq('order_id', order.id)
      .limit(20);

    // 5. Fetch related Trackbliss shipments (warehouse fulfillment)
    //    order_reference can be stored as: "1015", "#1015", "Shopify #1015", "WooCommerce #1015"
    //    → use ILIKE pattern matching to catch all variants
    const { data: shipments } = await supabase
      .from('wh_shipments')
      .select(`
        shipment_number,
        status,
        carrier,
        tracking_number,
        estimated_delivery,
        shipped_at,
        delivered_at,
        priority,
        total_items,
        created_at,
        updated_at
      `)
      .eq('tenant_id', tenant.id)
      .or(
        `order_reference.eq.${rawOrderNumber},` +
        `order_reference.eq.#${rawOrderNumber},` +
        `order_reference.ilike.%#${rawOrderNumber}`
      )
      .order('created_at', { ascending: false });

    // 6. Build labels
    const financialLabel = FINANCIAL_LABELS_DE[order.financial_status || ''] || order.financial_status || 'Unbekannt';
    const fulfillmentLabel = FULFILLMENT_LABELS_DE[order.fulfillment_status || ''] || order.fulfillment_status || 'Unbekannt';
    const orderStatusLabel = ORDER_STATUS_LABELS_DE[order.order_status || ''] || order.order_status || 'Unbekannt';

    const shipmentList = (shipments || []).map((s) => ({
      shipment_number: s.shipment_number,
      status: s.status,
      status_label: SHIPMENT_STATUS_LABELS_DE[s.status] || s.status,
      carrier: s.carrier,
      tracking_number: s.tracking_number,
      estimated_delivery: s.estimated_delivery,
      shipped_at: s.shipped_at,
      delivered_at: s.delivered_at,
    }));

    const summary = buildSummary(order, financialLabel, fulfillmentLabel, items || [], shipmentList);

    return jsonResponse({
      found: true,
      summary,
      data: {
        order_number: order.external_order_number,
        platform: order.platform,
        customer_name: order.customer_name,
        total_amount: order.total_amount,
        currency: order.currency,
        item_count: order.item_count,
        financial_status: order.financial_status,
        financial_status_label: financialLabel,
        fulfillment_status: order.fulfillment_status,
        fulfillment_status_label: fulfillmentLabel,
        order_status: order.order_status,
        order_status_label: orderStatusLabel,
        order_url: order.external_url || null,
        created_at: order.created_at,
        updated_at: order.updated_at,
        items: (items || []).map((i) => ({
          title: i.title,
          variant: i.variant_title,
          sku: i.sku,
          gtin: i.gtin,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.total_price,
          display: formatItemLine(i, order.currency),
        })),
        shipments: shipmentList,
      },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

function buildSummary(
  order: any,
  financialLabel: string,
  fulfillmentLabel: string,
  items: any[],
  shipments: Array<{
    shipment_number: string;
    status: string;
    status_label: string;
    carrier: string | null;
    tracking_number: string | null;
    estimated_delivery: string | null;
  }>
): string {
  const parts: string[] = [];
  const customerName = order.customer_name || 'Kunde';

  parts.push(`Bestellung ${order.external_order_number} (${customerName}):`);
  parts.push(`Zahlungsstatus: ${financialLabel}.`);

  // Prefer Trackbliss internal shipment status over Shopify fulfillment status
  // (more granular: shows picking/packing details)
  if (shipments.length > 0) {
    const latest = shipments[0];
    parts.push(`Bearbeitungsstatus: ${latest.status_label}.`);
    if (latest.tracking_number && latest.carrier) {
      parts.push(`Tracking: ${latest.tracking_number} (${latest.carrier}).`);
    } else if (latest.tracking_number) {
      parts.push(`Tracking-Nummer: ${latest.tracking_number}.`);
    }
    if (latest.estimated_delivery) {
      parts.push(`Voraussichtliche Lieferung: ${latest.estimated_delivery}.`);
    }
    if (shipments.length > 1) {
      parts.push(`(Bestellung umfasst ${shipments.length} Sendungen.)`);
    }
  } else {
    // No Trackbliss shipment yet — fall back to Shopify status
    parts.push(`Versandstatus: ${fulfillmentLabel}.`);
  }

  if (order.total_amount && order.currency) {
    parts.push(`Gesamtbetrag: ${order.total_amount} ${order.currency}.`);
  }
  if (items.length > 0) {
    const lines = items.slice(0, 5).map((i) => formatItemLine(i, order.currency));
    const suffix = items.length > 5 ? ` (und ${items.length - 5} weitere Artikel)` : '';
    parts.push(`Bestellte Artikel: ${lines.join('; ')}${suffix}.`);
  }

  return parts.join(' ');
}

function formatItemLine(item: any, currency: string): string {
  const qty = item.quantity || 1;
  const name = item.variant_title
    ? `${item.title} (${item.variant_title})`
    : item.title;
  const price = item.total_price
    ? ` — ${item.total_price} ${currency || 'EUR'}`
    : '';
  return `${qty}× ${name}${price}`;
}

