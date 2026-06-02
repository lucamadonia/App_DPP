import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// ============================================================================
// Status label dictionaries
// ============================================================================

const RETURN_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Erstellt — Retoure wurde registriert',
  PENDING_APPROVAL: 'Wartet auf Freigabe durch unser Team',
  APPROVED: 'Freigegeben — Versandlabel wird vorbereitet',
  LABEL_GENERATED: 'Versandlabel erstellt — bitte Paket abschicken',
  SHIPPED: 'Paket ist unterwegs zu uns',
  DELIVERED: 'Paket bei uns angekommen',
  INSPECTION_IN_PROGRESS: 'Wird gerade geprüft',
  REFUND_PROCESSING: 'Erstattung wird verarbeitet',
  REFUND_COMPLETED: 'Erstattung abgeschlossen',
  COMPLETED: 'Retoure abgeschlossen',
  REJECTED: 'Retoure wurde abgelehnt',
  CANCELLED: 'Retoure wurde storniert',
};

const FINANCIAL_LABELS: Record<string, string> = {
  paid: 'Bezahlt',
  pending: 'Zahlung ausstehend',
  refunded: 'Komplett erstattet',
  partially_refunded: 'Teilweise erstattet',
  voided: 'Storniert',
  authorized: 'Autorisiert',
};

const FULFILLMENT_LABELS: Record<string, string> = {
  unfulfilled: 'Noch nicht versandt',
  partial: 'Teilweise versandt',
  shipped: 'Versandt — auf dem Weg zu dir',
  delivered: 'Zugestellt',
  fulfilled: 'Versandt',
};

const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Bestellung registriert — wird vorbereitet',
  picking: 'Wird gerade kommissioniert (Artikel werden aus dem Lager geholt)',
  packed: 'Verpackt — wartet auf Versandlabel',
  label_created: 'Versandlabel erstellt — wird abgeholt',
  shipped: 'An den Versanddienstleister übergeben',
  in_transit: 'Unterwegs zu dir',
  delivered: 'Zugestellt',
  cancelled: 'Versand storniert',
};

const TICKET_STATUS_LABELS: Record<string, string> = {
  open: 'Offen — wartet auf Bearbeitung',
  in_progress: 'Wird gerade bearbeitet',
  waiting: 'Warten auf Kunden-Rückmeldung',
  resolved: 'Gelöst',
  closed: 'Geschlossen',
};

// ============================================================================
// Main handler
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: {
    query_type?: string;
    reference_number?: string;
    email?: string;
    tenant_slug?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const queryType = (body.query_type || '').trim().toLowerCase();
  // For product search, keep raw input (spaces, letters allowed for name search)
  const rawReference = (body.reference_number || '').trim();
  const referenceSanitized = rawReference.replace(/^#/, '').replace(/[^a-zA-Z0-9-_]/g, '');
  const email = (body.email || '').trim().toLowerCase();
  const tenantSlug = (body.tenant_slug || '').trim().replace(/[^a-zA-Z0-9-_]/g, '');

  const validTypes = ['return', 'order', 'ticket', 'product'];
  if (!validTypes.includes(queryType)) {
    return jsonResponse({
      error: 'Invalid query_type',
      message: `query_type muss einer von ${validTypes.join(', ')} sein.`,
    }, 400);
  }

  // Product search: no email required (public info), but reference needed
  const isProductQuery = queryType === 'product';
  if (!queryType || !rawReference || !tenantSlug || (!email && !isProductQuery)) {
    return jsonResponse({
      error: 'Missing required fields',
      message: isProductQuery
        ? 'Bitte gib Produktname oder GTIN und den Tenant an.'
        : 'Bitte gib Abfrage-Typ, Referenz-Nummer, E-Mail und Tenant an.',
      required: isProductQuery
        ? ['query_type', 'reference_number', 'tenant_slug']
        : ['query_type', 'reference_number', 'email', 'tenant_slug'],
    }, 400);
  }

  if (!isProductQuery && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({
      error: 'Invalid email format',
      message: 'Die angegebene E-Mail-Adresse hat kein gültiges Format.',
    }, 400);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Resolve tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('slug', tenantSlug)
      .single();

    if (tenantError || !tenant) {
      return jsonResponse({
        found: false,
        message: 'Tenant nicht gefunden. Bitte prüfe den Shop-Namen.',
      }, 404);
    }

    // Route to the right handler
    if (queryType === 'return') {
      return await handleReturnLookup(supabase, tenant.id, referenceSanitized, email);
    }
    if (queryType === 'order') {
      return await handleOrderLookup(supabase, tenant.id, referenceSanitized, email);
    }
    if (queryType === 'ticket') {
      return await handleTicketLookup(supabase, tenant.id, referenceSanitized, email);
    }
    if (queryType === 'product') {
      return await handleProductLookup(supabase, tenant.id, rawReference);
    }

    return jsonResponse({ error: 'Unhandled query_type' }, 400);
  } catch (err) {
    console.error('Unexpected error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

// ============================================================================
// Return lookup
// ============================================================================

async function handleReturnLookup(
  supabase: any,
  tenantId: string,
  returnNumber: string,
  email: string
) {
  const { data: ret } = await supabase
    .from('rh_returns')
    .select(`
      id, return_number, status, reason_category, reason_text,
      desired_solution, tracking_number, label_url,
      refund_amount, refund_method, refunded_at,
      created_at, updated_at,
      rh_customers!inner ( email, first_name, last_name )
    `)
    .eq('tenant_id', tenantId)
    .eq('return_number', returnNumber)
    .maybeSingle();

  if (!ret) {
    return jsonResponse({
      found: false,
      type: 'return',
      message: `Keine Retoure mit der Nummer ${returnNumber} gefunden.`,
    }, 200);
  }

  const customer = Array.isArray(ret.rh_customers) ? ret.rh_customers[0] : ret.rh_customers;
  if ((customer?.email || '').toLowerCase() !== email) {
    return jsonResponse({
      found: false,
      type: 'return',
      message: `Keine Retoure mit der Nummer ${returnNumber} unter dieser E-Mail-Adresse gefunden.`,
    }, 200);
  }

  const { data: timeline } = await supabase
    .from('rh_return_timeline')
    .select('status, comment, created_at')
    .eq('return_id', ret.id)
    .order('created_at', { ascending: false })
    .limit(3);

  const statusLabel = RETURN_STATUS_LABELS[ret.status] || ret.status;
  const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || 'Kunde';

  const parts = [`Retoure ${ret.return_number} (${customerName}): ${statusLabel}.`];
  if (ret.tracking_number) parts.push(`Tracking: ${ret.tracking_number}.`);
  if (ret.refund_amount && ret.status === 'REFUND_COMPLETED') {
    parts.push(`Erstattung über ${ret.refund_amount} EUR abgeschlossen.`);
  } else if (ret.refund_amount && ret.status === 'REFUND_PROCESSING') {
    parts.push(`Erstattung über ${ret.refund_amount} EUR wird verarbeitet.`);
  }

  return jsonResponse({
    found: true,
    type: 'return',
    summary: parts.join(' '),
    data: {
      return_number: ret.return_number,
      status_code: ret.status,
      status_label: statusLabel,
      customer_name: customerName,
      reason: ret.reason_category,
      desired_solution: ret.desired_solution,
      tracking_number: ret.tracking_number,
      label_url: ret.label_url,
      refund_amount: ret.refund_amount,
      refunded_at: ret.refunded_at,
      created_at: ret.created_at,
      timeline: (timeline || []).map((t: any) => ({
        status: t.status,
        label: RETURN_STATUS_LABELS[t.status] || t.status,
        comment: t.comment,
        date: t.created_at,
      })),
    },
  });
}

// ============================================================================
// Order lookup (with Trackbliss shipment integration)
// ============================================================================

async function handleOrderLookup(
  supabase: any,
  tenantId: string,
  orderNumber: string,
  email: string
) {
  const { data: order } = await supabase
    .from('commerce_orders')
    .select(`
      id, external_order_number, external_order_id, external_url, platform,
      currency, total_amount, item_count, customer_email, customer_name,
      financial_status, fulfillment_status, order_status,
      created_at, updated_at
    `)
    .eq('tenant_id', tenantId)
    .or(`external_order_number.eq.${orderNumber},external_order_number.eq.#${orderNumber}`)
    .maybeSingle();

  if (!order) {
    return jsonResponse({
      found: false,
      type: 'order',
      message: `Keine Bestellung mit der Nummer #${orderNumber} gefunden.`,
    }, 200);
  }

  if ((order.customer_email || '').toLowerCase() !== email) {
    return jsonResponse({
      found: false,
      type: 'order',
      message: `Keine Bestellung mit der Nummer #${orderNumber} unter dieser E-Mail-Adresse gefunden.`,
    }, 200);
  }

  const { data: items } = await supabase
    .from('commerce_order_items')
    .select('title, variant_title, sku, gtin, quantity, unit_price, total_price')
    .eq('order_id', order.id)
    .limit(20);

  const { data: shipments } = await supabase
    .from('wh_shipments')
    .select(`shipment_number, status, carrier, tracking_number, estimated_delivery, shipped_at, delivered_at`)
    .eq('tenant_id', tenantId)
    .or(
      `order_reference.eq.${orderNumber},` +
      `order_reference.eq.#${orderNumber},` +
      `order_reference.ilike.%#${orderNumber}`
    )
    .order('created_at', { ascending: false });

  const financialLabel = FINANCIAL_LABELS[order.financial_status || ''] || order.financial_status || 'Unbekannt';
  const fulfillmentLabel = FULFILLMENT_LABELS[order.fulfillment_status || ''] || order.fulfillment_status || 'Unbekannt';

  const shipmentList = (shipments || []).map((s: any) => ({
    shipment_number: s.shipment_number,
    status: s.status,
    status_label: SHIPMENT_STATUS_LABELS[s.status] || s.status,
    carrier: s.carrier,
    tracking_number: s.tracking_number,
    estimated_delivery: s.estimated_delivery,
    shipped_at: s.shipped_at,
    delivered_at: s.delivered_at,
  }));

  const itemsFormatted = (items || []).map((i: any) => ({
    title: i.title,
    variant: i.variant_title,
    sku: i.sku,
    gtin: i.gtin,
    quantity: i.quantity,
    unit_price: i.unit_price,
    total_price: i.total_price,
    display: formatItemLine(i, order.currency),
  }));

  const parts = [
    `Bestellung ${order.external_order_number} (${order.customer_name || 'Kunde'}):`,
    `Zahlungsstatus: ${financialLabel}.`,
  ];

  if (shipmentList.length > 0) {
    const latest = shipmentList[0];
    parts.push(`Bearbeitungsstatus: ${latest.status_label}.`);
    if (latest.tracking_number && latest.carrier) {
      parts.push(`Tracking: ${latest.tracking_number} (${latest.carrier}).`);
    }
    if (latest.estimated_delivery) {
      parts.push(`Voraussichtliche Lieferung: ${latest.estimated_delivery}.`);
    }
  } else {
    parts.push(`Versandstatus: ${fulfillmentLabel}.`);
  }

  if (order.total_amount && order.currency) {
    parts.push(`Gesamtbetrag: ${order.total_amount} ${order.currency}.`);
  }
  if (itemsFormatted.length > 0) {
    const lines = itemsFormatted.slice(0, 5).map((i) => i.display);
    const suffix = itemsFormatted.length > 5 ? ` (und ${itemsFormatted.length - 5} weitere)` : '';
    parts.push(`Bestellte Artikel: ${lines.join('; ')}${suffix}.`);
  }

  return jsonResponse({
    found: true,
    type: 'order',
    summary: parts.join(' '),
    data: {
      order_number: order.external_order_number,
      platform: order.platform,
      customer_name: order.customer_name,
      total_amount: order.total_amount,
      currency: order.currency,
      financial_status: order.financial_status,
      financial_status_label: financialLabel,
      fulfillment_status_label: fulfillmentLabel,
      order_url: order.external_url,
      created_at: order.created_at,
      items: itemsFormatted,
      shipments: shipmentList,
    },
  });
}

// ============================================================================
// Ticket lookup
// ============================================================================

async function handleTicketLookup(
  supabase: any,
  tenantId: string,
  ticketNumber: string,
  email: string
) {
  const { data: ticket } = await supabase
    .from('rh_tickets')
    .select(`
      id, ticket_number, status, priority, category, subject,
      created_at, updated_at, resolved_at,
      rh_customers!inner ( email, first_name, last_name )
    `)
    .eq('tenant_id', tenantId)
    .eq('ticket_number', ticketNumber)
    .maybeSingle();

  if (!ticket) {
    return jsonResponse({
      found: false,
      type: 'ticket',
      message: `Kein Ticket mit der Nummer ${ticketNumber} gefunden.`,
    }, 200);
  }

  const customer = Array.isArray(ticket.rh_customers) ? ticket.rh_customers[0] : ticket.rh_customers;
  if ((customer?.email || '').toLowerCase() !== email) {
    return jsonResponse({
      found: false,
      type: 'ticket',
      message: `Kein Ticket mit der Nummer ${ticketNumber} unter dieser E-Mail-Adresse gefunden.`,
    }, 200);
  }

  const { data: lastMessage } = await supabase
    .from('rh_ticket_messages')
    .select('content, sender_type, created_at, is_internal')
    .eq('ticket_id', ticket.id)
    .eq('is_internal', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const statusLabel = TICKET_STATUS_LABELS[ticket.status] || ticket.status;
  const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || 'Kunde';

  const parts = [`Ticket ${ticket.ticket_number} (${customerName}): ${statusLabel}.`];
  if (ticket.subject) parts.push(`Betreff: "${ticket.subject}".`);
  if (lastMessage) {
    const senderLabel = lastMessage.sender_type === 'agent' ? 'unser Team' : 'der Kunde';
    parts.push(`Letzte Nachricht von ${senderLabel}.`);
  }

  return jsonResponse({
    found: true,
    type: 'ticket',
    summary: parts.join(' '),
    data: {
      ticket_number: ticket.ticket_number,
      status_code: ticket.status,
      status_label: statusLabel,
      priority: ticket.priority,
      category: ticket.category,
      subject: ticket.subject,
      customer_name: customerName,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      resolved_at: ticket.resolved_at,
      last_message: lastMessage
        ? {
            content: lastMessage.content,
            from: lastMessage.sender_type,
            date: lastMessage.created_at,
          }
        : null,
    },
  });
}

// ============================================================================
// Product lookup (DPP data — no email required, search by GTIN or name)
// ============================================================================

async function handleProductLookup(
  supabase: any,
  tenantId: string,
  searchTerm: string
) {
  const isGtin = /^\d{8,14}$/.test(searchTerm.replace(/[^0-9]/g, ''));
  let products: any[] = [];

  if (isGtin) {
    // Exact GTIN match
    const cleanGtin = searchTerm.replace(/[^0-9]/g, '');
    const { data } = await supabase
      .from('products')
      .select(`
        id, name, gtin, serial_number, manufacturer, category, description,
        materials, certifications, carbon_footprint, recyclability,
        country_of_origin, image_url, status
      `)
      .eq('tenant_id', tenantId)
      .eq('gtin', cleanGtin)
      .eq('status', 'published')
      .limit(5);
    products = data || [];
  } else {
    // Fuzzy name search
    const { data } = await supabase
      .from('products')
      .select(`
        id, name, gtin, serial_number, manufacturer, category, description,
        materials, certifications, carbon_footprint, recyclability,
        country_of_origin, image_url, status
      `)
      .eq('tenant_id', tenantId)
      .ilike('name', `%${searchTerm}%`)
      .eq('status', 'published')
      .limit(5);
    products = data || [];
  }

  if (products.length === 0) {
    return jsonResponse({
      found: false,
      type: 'product',
      message: `Kein Produkt zu "${searchTerm}" gefunden. Versuche es mit einem anderen Namen oder einer GTIN.`,
    }, 200);
  }

  // If exact match (1 result), return full detail
  if (products.length === 1) {
    const p = products[0];
    const parts: string[] = [`${p.name} von ${p.manufacturer}.`];
    if (p.description) parts.push(p.description.slice(0, 200) + (p.description.length > 200 ? '...' : ''));

    const materials = Array.isArray(p.materials) ? p.materials : [];
    if (materials.length > 0) {
      const matNames = materials.slice(0, 5).map((m: any) => m.name || m).filter(Boolean).join(', ');
      if (matNames) parts.push(`Materialien: ${matNames}.`);
    }

    const certs = Array.isArray(p.certifications) ? p.certifications : [];
    if (certs.length > 0) {
      const certNames = certs.slice(0, 5).map((c: any) => c.name || c).filter(Boolean).join(', ');
      if (certNames) parts.push(`Zertifizierungen: ${certNames}.`);
    }

    const cf = p.carbon_footprint;
    if (cf && (cf.value || cf.totalKgCO2e)) {
      const value = cf.value || cf.totalKgCO2e;
      const unit = cf.unit || 'kg CO₂e';
      parts.push(`CO₂-Fußabdruck: ${value} ${unit}.`);
    }

    const rec = p.recyclability;
    if (rec && rec.recyclablePercentage > 0) {
      parts.push(`Recyclingfähigkeit: ${rec.recyclablePercentage}%.`);
    }
    if (p.country_of_origin) {
      parts.push(`Herkunftsland: ${p.country_of_origin}.`);
    }

    const dppUrl = p.gtin && p.serial_number
      ? `https://dpp-app.fambliss.eu/p/${p.gtin}/${p.serial_number}`
      : null;
    if (dppUrl) parts.push(`Vollständiger digitaler Produktpass: ${dppUrl}`);

    return jsonResponse({
      found: true,
      type: 'product',
      summary: parts.join(' '),
      data: {
        name: p.name,
        manufacturer: p.manufacturer,
        gtin: p.gtin,
        category: p.category,
        description: p.description,
        materials: materials,
        certifications: certs,
        carbon_footprint: cf,
        recyclability: rec,
        country_of_origin: p.country_of_origin,
        image_url: p.image_url,
        dpp_url: dppUrl,
      },
    });
  }

  // Multiple matches: return list
  const list = products.map((p: any) => ({
    name: p.name,
    manufacturer: p.manufacturer,
    gtin: p.gtin,
    category: p.category,
    image_url: p.image_url,
  }));

  return jsonResponse({
    found: true,
    type: 'product',
    summary: `${products.length} Produkte zu "${searchTerm}" gefunden: ${list.map(p => p.name).join(', ')}. Welches genau meinst du?`,
    multiple_matches: true,
    data: { products: list },
  });
}

// ============================================================================
// Helpers
// ============================================================================

function formatItemLine(item: any, currency: string): string {
  const qty = item.quantity || 1;
  const name = item.variant_title ? `${item.title} (${item.variant_title})` : item.title;
  const price = item.total_price ? ` — ${item.total_price} ${currency || 'EUR'}` : '';
  return `${qty}× ${name}${price}`;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
