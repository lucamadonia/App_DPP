import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const ALPHANUMERIC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function luhnCheckDigit(input: string): number {
  const digits = input.split('').map((c) => {
    const code = c.charCodeAt(0);
    if (code >= 48 && code <= 57) return code - 48;
    if (code >= 65 && code <= 90) return code - 55;
    return 0;
  });
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits[i];
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return (10 - (sum % 10)) % 10;
}

function generateNumber(prefix: string): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
  }
  return `${prefix}-${date}-${random}${luhnCheckDigit(random)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: {
    request_type?: string;
    email?: string;
    description?: string;
    order_number?: string;
    desired_solution?: string;
    subject?: string;
    category?: string;
    tenant_slug?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  // DEBUG: log full request body so we can see what Rebecca sent
  console.log('[chatbot-create] incoming body:', JSON.stringify(body));

  const requestType = (body.request_type || '').trim().toLowerCase();
  const email = (body.email || '').trim().toLowerCase();
  const description = (body.description || '').trim().slice(0, 2000);
  const orderNumber = (body.order_number || '')
    .trim()
    .replace(/^#/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '');
  // Accept German + English equivalents, map to canonical English values
  const desiredSolutionRaw = (body.desired_solution || 'refund').trim().toLowerCase();
  const solutionMap: Record<string, string> = {
    'refund': 'refund',
    'rückerstattung': 'refund',
    'erstattung': 'refund',
    'rueckerstattung': 'refund',
    'geld zurück': 'refund',
    'geld': 'refund',
    'exchange': 'exchange',
    'umtausch': 'exchange',
    'tausch': 'exchange',
    'voucher': 'voucher',
    'gutschein': 'voucher',
    'credit': 'voucher',
    'repair': 'repair',
    'reparatur': 'repair',
  };
  const desiredSolution = solutionMap[desiredSolutionRaw] || desiredSolutionRaw;
  const subject = (body.subject || '').trim().slice(0, 200);
  const category = (body.category || 'general').trim().toLowerCase().slice(0, 50);
  const tenantSlug = (body.tenant_slug || '').trim().replace(/[^a-zA-Z0-9-_]/g, '');

  // Validate common fields
  if (!requestType || !email || !description || !tenantSlug) {
    const missing = [];
    if (!requestType) missing.push('request_type');
    if (!email) missing.push('email');
    if (!description) missing.push('description');
    if (!tenantSlug) missing.push('tenant_slug');
    return jsonResponse({
      error: 'Missing required fields',
      message: `Folgende Felder fehlen oder sind leer: ${missing.join(', ')}.`,
      missing,
      received: {
        request_type: requestType || '(empty)',
        email: email || '(empty)',
        description: description ? `${description.length} chars` : '(empty)',
        tenant_slug: tenantSlug || '(empty)',
        order_number: orderNumber || '(empty)',
        desired_solution: desiredSolution,
      },
    }, 400);
  }

  const validTypes = ['return', 'ticket'];
  if (!validTypes.includes(requestType)) {
    return jsonResponse({
      error: 'Invalid request_type',
      message: `request_type muss einer von ${validTypes.join(', ')} sein.`,
    }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({
      error: 'Invalid email format',
      message: 'Die angegebene E-Mail-Adresse hat kein gültiges Format.',
    }, 400);
  }

  if (description.length < 5) {
    return jsonResponse({
      error: 'Description too short',
      message: 'Bitte gib eine aussagekräftige Beschreibung an (mindestens 5 Zeichen).',
    }, 400);
  }

  // Type-specific validation
  if (requestType === 'return') {
    if (!orderNumber) {
      return jsonResponse({
        error: 'Missing order_number',
        message: 'Für eine Retoure brauche ich die Bestellnummer.',
      }, 400);
    }
    const validSolutions = ['refund', 'exchange', 'voucher', 'repair'];
    if (!validSolutions.includes(desiredSolution)) {
      return jsonResponse({
        error: 'Invalid desired_solution',
        message: `desired_solution muss einer von ${validSolutions.join(', ')} sein.`,
      }, 400);
    }
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Resolve tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, slug, name')
      .eq('slug', tenantSlug)
      .single();

    if (!tenant) {
      return jsonResponse({ success: false, message: 'Tenant nicht gefunden.' }, 404);
    }

    // Find or create customer (shared for both flows)
    const customerId = await findOrCreateCustomer(supabase, tenant.id, email, orderNumber);
    if (!customerId) {
      return jsonResponse({ error: 'Failed to find or create customer record' }, 500);
    }

    if (requestType === 'return') {
      return await createReturn(supabase, tenant, customerId, orderNumber, email, description, desiredSolution);
    } else {
      return await createTicket(supabase, tenant, customerId, email, description, subject, category, orderNumber);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

// ============================================================================
// Customer helper — find existing or create new
// ============================================================================

async function findOrCreateCustomer(
  supabase: any,
  tenantId: string,
  email: string,
  orderNumber: string
): Promise<string | null> {
  // 1. Look for existing customer by email
  const { data: existing } = await supabase
    .from('rh_customers')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('email', email)
    .maybeSingle();

  if (existing) return existing.id;

  // 2. Try to get name from order if available
  let firstName: string | null = null;
  let lastName: string | null = null;
  if (orderNumber) {
    const { data: order } = await supabase
      .from('commerce_orders')
      .select('customer_name')
      .eq('tenant_id', tenantId)
      .or(`external_order_number.eq.${orderNumber},external_order_number.eq.#${orderNumber}`)
      .maybeSingle();
    if (order?.customer_name) {
      const parts = order.customer_name.trim().split(' ');
      firstName = parts[0] || null;
      lastName = parts.slice(1).join(' ') || null;
    }
  }

  // 3. Create new customer
  const { data: newCustomer, error } = await supabase
    .from('rh_customers')
    .insert({ tenant_id: tenantId, email, first_name: firstName, last_name: lastName })
    .select('id')
    .single();

  if (error || !newCustomer) {
    console.error('Failed to create customer:', error);
    return null;
  }
  return newCustomer.id;
}

// ============================================================================
// Return creation
// ============================================================================

async function createReturn(
  supabase: any,
  tenant: any,
  customerId: string,
  orderNumber: string,
  email: string,
  description: string,
  desiredSolution: string
) {
  // Verify order exists and email matches
  const { data: order } = await supabase
    .from('commerce_orders')
    .select('id, external_order_number, customer_email, customer_name')
    .eq('tenant_id', tenant.id)
    .or(`external_order_number.eq.${orderNumber},external_order_number.eq.#${orderNumber}`)
    .maybeSingle();

  if (!order) {
    return jsonResponse({
      success: false,
      message: `Keine Bestellung mit der Nummer #${orderNumber} gefunden.`,
    }, 200);
  }

  if ((order.customer_email || '').toLowerCase() !== email) {
    return jsonResponse({
      success: false,
      message: `Die E-Mail-Adresse stimmt nicht mit der Bestellung #${orderNumber} überein.`,
    }, 200);
  }

  // Check for existing open return
  const { data: existing } = await supabase
    .from('rh_returns')
    .select('return_number, status')
    .eq('tenant_id', tenant.id)
    .eq('order_id', order.external_order_number)
    .not('status', 'in', '(REJECTED,CANCELLED,COMPLETED)')
    .maybeSingle();

  if (existing) {
    return jsonResponse({
      success: false,
      already_exists: true,
      message: `Für Bestellung #${orderNumber} existiert bereits eine offene Retoure: ${existing.return_number} (Status: ${existing.status}).`,
      data: { return_number: existing.return_number, status: existing.status },
    }, 200);
  }

  // Fetch order items
  const { data: orderItems } = await supabase
    .from('commerce_order_items')
    .select('title, variant_title, sku, gtin, quantity, unit_price, total_price')
    .eq('order_id', order.id)
    .limit(50);

  // Create return
  const returnNumber = generateNumber('RET');
  const { data: newReturn, error: createError } = await supabase
    .from('rh_returns')
    .insert({
      tenant_id: tenant.id,
      return_number: returnNumber,
      status: 'PENDING_APPROVAL',
      customer_id: customerId,
      order_id: order.external_order_number,
      reason_category: 'other',
      reason_text: description,
      desired_solution: desiredSolution,
      priority: 'normal',
    })
    .select('id, return_number, status, created_at')
    .single();

  if (createError || !newReturn) {
    console.error('Failed to create return:', createError);
    return jsonResponse({ error: 'Failed to create return record' }, 500);
  }

  // Copy order items into return
  if (orderItems && orderItems.length > 0) {
    const returnItems = orderItems.map((item: any) => ({
      tenant_id: tenant.id,
      return_id: newReturn.id,
      name: item.variant_title ? `${item.title} (${item.variant_title})` : item.title,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unit_price,
      refund_amount: item.total_price,
      condition: 'used',
    }));
    const { error: itemsError } = await supabase.from('rh_return_items').insert(returnItems);
    if (itemsError) {
      console.error('Failed to insert return items:', itemsError);
    }
  }

  // Initial timeline entry
  await supabase.from('rh_return_timeline').insert({
    tenant_id: tenant.id,
    return_id: newReturn.id,
    status: 'PENDING_APPROVAL',
    comment: `Retoure über Chatbot erstellt. Grund: ${description}`,
  });

  const trackingUrl = `https://dpp-app.fambliss.eu/returns/track/${returnNumber}`;

  return jsonResponse({
    success: true,
    type: 'return',
    message: `Deine Retoure wurde erfolgreich angemeldet! Retouren-Nummer: ${returnNumber}. Du erhältst in Kürze eine Bestätigungs-E-Mail. Status verfolgen: ${trackingUrl}`,
    data: {
      return_number: returnNumber,
      status: newReturn.status,
      status_label: 'Wartet auf Freigabe durch unser Team',
      order_number: order.external_order_number,
      tracking_url: trackingUrl,
      items_count: orderItems?.length || 0,
      created_at: newReturn.created_at,
    },
  });
}

// ============================================================================
// Ticket creation
// ============================================================================

async function createTicket(
  supabase: any,
  tenant: any,
  customerId: string,
  email: string,
  description: string,
  subjectInput: string,
  category: string,
  orderNumber: string
) {
  // Auto-derive subject from first sentence if not provided
  const subject = subjectInput || description.split(/[.!?\n]/)[0].trim().slice(0, 100) || 'Support-Anfrage';

  // Optional: link ticket to a return if one exists for this order
  let returnId: string | null = null;
  if (orderNumber) {
    const { data: linkedReturn } = await supabase
      .from('rh_returns')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('order_id', orderNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (linkedReturn) returnId = linkedReturn.id;
  }

  // Create ticket
  const ticketNumber = generateNumber('TKT');
  const { data: newTicket, error: createError } = await supabase
    .from('rh_tickets')
    .insert({
      tenant_id: tenant.id,
      ticket_number: ticketNumber,
      customer_id: customerId,
      return_id: returnId,
      category,
      priority: 'normal',
      status: 'open',
      subject,
      metadata: orderNumber ? { order_reference: orderNumber } : {},
    })
    .select('id, ticket_number, status, created_at')
    .single();

  if (createError || !newTicket) {
    console.error('Failed to create ticket:', createError);
    return jsonResponse({ error: 'Failed to create ticket record' }, 500);
  }

  // Initial customer message with the description
  await supabase.from('rh_ticket_messages').insert({
    tenant_id: tenant.id,
    ticket_id: newTicket.id,
    sender_type: 'customer',
    sender_email: email,
    content: description,
    is_internal: false,
  });

  return jsonResponse({
    success: true,
    type: 'ticket',
    message: `Dein Support-Ticket wurde erstellt! Ticket-Nummer: ${ticketNumber}. Unser Team meldet sich in Kürze bei dir per E-Mail.`,
    data: {
      ticket_number: ticketNumber,
      status: newTicket.status,
      status_label: 'Offen — wartet auf Bearbeitung',
      subject,
      category,
      linked_return_id: returnId,
      created_at: newTicket.created_at,
    },
  });
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
