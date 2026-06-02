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

function generateReturnNumber(): string {
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
  return `RET-${date}-${random}${luhnCheckDigit(random)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: {
    order_number?: string;
    email?: string;
    reason?: string;
    desired_solution?: string;
    tenant_slug?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const orderNumber = (body.order_number || '')
    .trim()
    .replace(/^#/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '');
  const email = (body.email || '').trim().toLowerCase();
  const reason = (body.reason || '').trim().slice(0, 500);
  const desiredSolution = (body.desired_solution || 'refund').trim().toLowerCase();
  const tenantSlug = (body.tenant_slug || '').trim().replace(/[^a-zA-Z0-9-_]/g, '');

  if (!orderNumber || !email || !tenantSlug) {
    return jsonResponse({
      error: 'Missing required fields',
      message: 'Bitte gib Bestellnummer, E-Mail-Adresse und Tenant an.',
      required: ['order_number', 'email', 'tenant_slug'],
    }, 400);
  }

  const validSolutions = ['refund', 'exchange', 'voucher', 'repair'];
  if (!validSolutions.includes(desiredSolution)) {
    return jsonResponse({
      error: 'Invalid desired_solution',
      message: `desired_solution muss einer von ${validSolutions.join(', ')} sein.`,
    }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({
      error: 'Invalid email format',
      message: 'Die angegebene E-Mail-Adresse hat kein gültiges Format.',
    }, 400);
  }

  if (!reason || reason.length < 5) {
    return jsonResponse({
      error: 'Reason too short',
      message: 'Bitte gib einen aussagekräftigen Grund für die Retoure an (mindestens 5 Zeichen).',
    }, 400);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Resolve tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, slug, name')
      .eq('slug', tenantSlug)
      .single();

    if (!tenant) {
      return jsonResponse({
        success: false,
        message: 'Tenant nicht gefunden.',
      }, 404);
    }

    // 2. Find the order and verify email
    const { data: order } = await supabase
      .from('commerce_orders')
      .select(`id, external_order_number, customer_email, customer_name, total_amount, currency`)
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

    // 3. Check for existing open return for this order
    const { data: existing } = await supabase
      .from('rh_returns')
      .select('id, return_number, status')
      .eq('tenant_id', tenant.id)
      .eq('order_id', order.external_order_number)
      .not('status', 'in', '(REJECTED,CANCELLED,COMPLETED)')
      .maybeSingle();

    if (existing) {
      return jsonResponse({
        success: false,
        already_exists: true,
        message: `Für Bestellung #${orderNumber} existiert bereits eine offene Retoure: ${existing.return_number} (Status: ${existing.status}).`,
        data: {
          return_number: existing.return_number,
          status: existing.status,
        },
      }, 200);
    }

    // 4. Find or create customer
    let customerId: string | null = null;
    const { data: customer } = await supabase
      .from('rh_customers')
      .select('id')
      .eq('tenant_id', tenant.id)
      .ilike('email', email)
      .maybeSingle();

    if (customer) {
      customerId = customer.id;
    } else {
      // Create new customer from order data
      const nameParts = (order.customer_name || '').trim().split(' ');
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(' ') || null;

      const { data: newCustomer, error: createCustomerError } = await supabase
        .from('rh_customers')
        .insert({
          tenant_id: tenant.id,
          email,
          first_name: firstName,
          last_name: lastName,
        })
        .select('id')
        .single();

      if (createCustomerError || !newCustomer) {
        console.error('Failed to create customer:', createCustomerError);
        return jsonResponse({ error: 'Failed to create customer record' }, 500);
      }
      customerId = newCustomer.id;
    }

    // 5. Fetch order items (to copy into return)
    const { data: orderItems } = await supabase
      .from('commerce_order_items')
      .select('title, variant_title, sku, gtin, quantity, unit_price, total_price')
      .eq('order_id', order.id)
      .limit(50);

    // 6. Create the return
    const returnNumber = generateReturnNumber();
    const { data: newReturn, error: createReturnError } = await supabase
      .from('rh_returns')
      .insert({
        tenant_id: tenant.id,
        return_number: returnNumber,
        status: 'PENDING_APPROVAL',
        customer_id: customerId,
        order_id: order.external_order_number,
        reason_category: 'other',
        reason_text: reason,
        desired_solution: desiredSolution,
        priority: 'normal',
      })
      .select('id, return_number, status, created_at')
      .single();

    if (createReturnError || !newReturn) {
      console.error('Failed to create return:', createReturnError);
      return jsonResponse({ error: 'Failed to create return record' }, 500);
    }

    // 7. Copy order items into return items
    if (orderItems && orderItems.length > 0) {
      const returnItems = orderItems.map((item: any) => ({
        tenant_id: tenant.id,
        return_id: newReturn.id,
        product_name: item.title,
        variant_title: item.variant_title,
        sku: item.sku,
        gtin: item.gtin,
        quantity: item.quantity,
        unit_price: item.unit_price,
        refund_amount: item.total_price,
        condition: 'used',
      }));

      const { error: itemsError } = await supabase
        .from('rh_return_items')
        .insert(returnItems);

      if (itemsError) {
        console.error('Failed to insert return items:', itemsError);
        // Non-fatal: return was created, items just not copied
      }
    }

    // 8. Create initial timeline entry
    await supabase.from('rh_return_timeline').insert({
      tenant_id: tenant.id,
      return_id: newReturn.id,
      status: 'PENDING_APPROVAL',
      comment: `Retoure über Chatbot erstellt. Grund: ${reason}`,
    });

    // 9. Build tracking URL for customer
    const trackingUrl = `https://dpp-app.fambliss.eu/returns/track/${returnNumber}`;
    const portalUrl = `https://dpp-app.fambliss.eu/returns/portal/${tenant.slug}`;

    return jsonResponse({
      success: true,
      message: `Deine Retoure wurde erfolgreich angemeldet! Retouren-Nummer: ${returnNumber}. Du erhältst in Kürze eine Bestätigungs-E-Mail. Du kannst den Status hier verfolgen: ${trackingUrl}`,
      data: {
        return_number: returnNumber,
        status: newReturn.status,
        status_label: 'Wartet auf Freigabe durch unser Team',
        order_number: order.external_order_number,
        tracking_url: trackingUrl,
        portal_url: portalUrl,
        items_count: orderItems?.length || 0,
        created_at: newReturn.created_at,
      },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
