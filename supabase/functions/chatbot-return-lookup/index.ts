import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const STATUS_LABELS_DE: Record<string, string> = {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: { return_number?: string; email?: string; tenant_slug?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const returnNumber = (body.return_number || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const tenantSlug = (body.tenant_slug || '').trim();

  if (!returnNumber || !email || !tenantSlug) {
    return jsonResponse({
      error: 'Missing required fields',
      message: 'Bitte gib Retouren-Nummer, E-Mail-Adresse und Tenant an.',
      required: ['return_number', 'email', 'tenant_slug'],
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

    // 1. Resolve tenant
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

    // 2. Look up return with customer join, filtered by tenant
    const { data: ret, error: returnError } = await supabase
      .from('rh_returns')
      .select(`
        id,
        return_number,
        status,
        reason_category,
        reason_text,
        desired_solution,
        tracking_number,
        label_url,
        refund_amount,
        refund_method,
        refunded_at,
        created_at,
        updated_at,
        rh_customers!inner ( email, first_name, last_name )
      `)
      .eq('tenant_id', tenant.id)
      .eq('return_number', returnNumber)
      .maybeSingle();

    if (returnError) {
      console.error('Failed to query return:', returnError);
      return jsonResponse({ error: 'Database error' }, 500);
    }

    if (!ret) {
      return jsonResponse({
        found: false,
        message: `Keine Retoure mit der Nummer ${returnNumber} gefunden. Bitte prüfe die Nummer.`,
      }, 200);
    }

    // 3. Verify email matches (identity check — prevents leak across customers)
    const customer = Array.isArray(ret.rh_customers)
      ? ret.rh_customers[0]
      : ret.rh_customers;
    const customerEmail = (customer?.email || '').toLowerCase();

    if (customerEmail !== email) {
      // Same error as "not found" — don't reveal that the return exists with a different email
      return jsonResponse({
        found: false,
        message: `Keine Retoure mit der Nummer ${returnNumber} unter dieser E-Mail-Adresse gefunden.`,
      }, 200);
    }

    // 4. Fetch latest 3 timeline entries (status history)
    const { data: timeline } = await supabase
      .from('rh_return_timeline')
      .select('status, comment, created_at')
      .eq('return_id', ret.id)
      .order('created_at', { ascending: false })
      .limit(3);

    // 5. Build AI-friendly response
    const statusLabel = STATUS_LABELS_DE[ret.status] || ret.status;
    const customerName = [customer?.first_name, customer?.last_name]
      .filter(Boolean)
      .join(' ') || 'Kunde';

    const summary = buildSummary(ret, statusLabel, customerName);

    return jsonResponse({
      found: true,
      summary,
      data: {
        return_number: ret.return_number,
        status_code: ret.status,
        status_label: statusLabel,
        customer_name: customerName,
        reason: ret.reason_category || null,
        desired_solution: ret.desired_solution || null,
        tracking_number: ret.tracking_number || null,
        label_url: ret.label_url || null,
        refund_amount: ret.refund_amount,
        refund_method: ret.refund_method || null,
        refunded_at: ret.refunded_at,
        created_at: ret.created_at,
        updated_at: ret.updated_at,
        timeline: (timeline || []).map((t) => ({
          status: t.status,
          label: STATUS_LABELS_DE[t.status] || t.status,
          comment: t.comment,
          date: t.created_at,
        })),
      },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

function buildSummary(ret: any, statusLabel: string, customerName: string): string {
  const parts: string[] = [];
  parts.push(`Retoure ${ret.return_number} (${customerName}): ${statusLabel}.`);

  if (ret.tracking_number) {
    parts.push(`Tracking-Nummer: ${ret.tracking_number}.`);
  }
  if (ret.label_url && ['APPROVED', 'LABEL_GENERATED'].includes(ret.status)) {
    parts.push(`Versandlabel ist verfügbar.`);
  }
  if (ret.refund_amount && ret.status === 'REFUND_COMPLETED') {
    parts.push(`Erstattung über ${ret.refund_amount} EUR wurde abgeschlossen.`);
  } else if (ret.refund_amount && ret.status === 'REFUND_PROCESSING') {
    parts.push(`Erstattung über ${ret.refund_amount} EUR wird gerade verarbeitet.`);
  }
  if (ret.desired_solution) {
    const solutions: Record<string, string> = {
      refund: 'Gewünschte Lösung: Erstattung',
      exchange: 'Gewünschte Lösung: Umtausch',
      voucher: 'Gewünschte Lösung: Gutschein',
      repair: 'Gewünschte Lösung: Reparatur',
    };
    parts.push(solutions[ret.desired_solution] + '.');
  }

  return parts.join(' ');
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
