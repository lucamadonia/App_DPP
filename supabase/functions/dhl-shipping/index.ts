/**
 * DHL Parcel DE Shipping API v2 — Edge Function
 *
 * Actions: save_credentials, test_connection, create_label, cancel_label, get_tracking
 * Pattern: shopify-sync (CORS → JWT → Tenant → Billing Gate → Dispatch)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const DHL_SANDBOX_URL = 'https://api-sandbox.dhl.com/parcel/de/shipping/v2';
const DHL_PROD_URL = 'https://api-eu.dhl.com/parcel/de/shipping/v2';
const DHL_RETURNS_SANDBOX_URL = 'https://api-sandbox.dhl.com/parcel/de/returns/v1';
const DHL_RETURNS_PROD_URL = 'https://api-eu.dhl.com/parcel/de/returns/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // --- Parse body first (before auth, so ping works) ---
    const body = await req.json();
    const { action, params } = body as { action: string; params?: Record<string, unknown> };

    // --- Ping action (no auth needed, for debugging) ---
    if (action === 'ping') {
      return json({ pong: true, hasUrl: !!SUPABASE_URL, hasKey: !!SUPABASE_SERVICE_ROLE_KEY });
    }

    // --- Public tracking (no auth needed, validated by returnNumber + trackingNumber) ---
    if (action === 'get_public_tracking') {
      return await handlePublicTracking(params);
    }

    // --- Public shipment tracking by magic-link token (no auth) ---
    if (action === 'get_public_shipment_tracking') {
      return await handlePublicShipmentTracking(params);
    }

    // --- Cron-mode: poll all tenants. Requires Authorization: Bearer <SERVICE_ROLE_KEY> ---
    if (action === 'poll_all_tenants_cron') {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return json({ error: 'Server misconfigured' });
      }
      const cronSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      return await handlePollAllTenantsCron(cronSupabase, req.headers.get('Authorization'));
    }

    // --- Auth ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Server misconfigured: missing Supabase env vars' });
    }

    let supabase;
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    } catch (e) {
      return json({ error: `createClient failed: ${e instanceof Error ? e.message : String(e)}` });
    }

    const token = authHeader.replace('Bearer ', '');
    let user;
    try {
      const { data, error: authErr } = await supabase.auth.getUser(token);
      if (authErr) return json({ error: `Auth error: ${authErr.message}` });
      if (!data?.user) return json({ error: 'No user in token' });
      user = data.user;
    } catch (e) {
      return json({ error: `getUser crashed: ${e instanceof Error ? e.message : String(e)}` });
    }

    // --- Tenant ---
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    if (!profile?.tenant_id) return json({ error: 'No tenant' }, 403);
    const tenantId = profile.tenant_id;

    // --- Billing Gate (skip for config actions — tenants need to set up DHL before subscribing) ---
    const isConfigAction = action === 'save_credentials' || action === 'test_connection';

    if (!isConfigAction) {
      const { data: activeMods } = await supabase
        .from('billing_module_subscriptions')
        .select('module_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');
      const moduleIds = (activeMods || []).map((m: { module_id: string }) => m.module_id);

      const isReturnsAction = action === 'create_return_label' || action === 'cancel_return_label';

      if (isReturnsAction) {
        const hasReturnsHub = moduleIds.some((m: string) =>
          m.startsWith('returns_hub_') || m === 'returns_hub_starter' || m === 'returns_hub_professional' || m === 'returns_hub_business'
        );
        if (!hasReturnsHub) {
          return json({ error: 'Returns Hub module required' });
        }
      } else {
        // Warehouse actions require Warehouse Pro/Business
        const hasWarehousePro = moduleIds.includes('warehouse_professional') || moduleIds.includes('warehouse_business');
        if (!hasWarehousePro) {
          return json({ error: 'Warehouse Professional or Business module required (modules: ' + moduleIds.join(',') + ')' });
        }
      }
    }

    // --- Dispatch ---
    switch (action) {
      case 'save_credentials':
        return await handleSaveCredentials(supabase, tenantId, params);
      case 'test_connection':
        return await handleTestConnection(supabase, tenantId);
      case 'create_label':
        return await handleCreateLabel(supabase, tenantId, params);
      case 'cancel_label':
        return await handleCancelLabel(supabase, tenantId, params);
      case 'get_tracking':
        return await handleGetTracking(supabase, tenantId, params);
      case 'poll_all_tracking':
        return await handlePollAllTracking(supabase, tenantId);
      case 'create_return_label':
        return await handleCreateReturnLabel(supabase, tenantId, params);
      case 'cancel_return_label':
        return await handleCancelReturnLabel(supabase, tenantId, params);
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error('DHL shipping error:', err);
    // Return 200 with error body so supabase-js passes through the error message
    return json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDHLSettings(supabase: any, tenantId: string) {
  const { data } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();
  return data?.settings?.warehouse?.dhl || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDHLBaseUrl(settings: any): string {
  return settings.sandbox ? DHL_SANDBOX_URL : DHL_PROD_URL;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDHLHeaders(settings: any): Record<string, string> {
  const auth = btoa(`${settings.username}:${settings.password}`);
  return {
    'Authorization': `Basic ${auth}`,
    'dhl-api-key': settings.apiKey,
    'Content-Type': 'application/json',
  };
}

/* -------------------------------------------------------------------------- */
/*  Action: save_credentials                                                   */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSaveCredentials(supabase: any, tenantId: string, params?: Record<string, unknown>) {
  if (!params) return json({ error: 'Missing params' }, 400);

  // Read current settings
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const currentSettings = tenant?.settings || {};
  const warehouse = currentSettings.warehouse || {};

  const dhlSettings = {
    enabled: params.enabled ?? true,
    sandbox: params.sandbox ?? true,
    apiKey: params.apiKey || '',
    username: params.username || '',
    password: params.password || '',
    billingNumber: params.billingNumber || '',
    billingNumberInternational: params.billingNumberInternational || '',
    defaultProduct: params.defaultProduct || 'V01PAK',
    labelFormat: params.labelFormat || 'PDF_A4',
    shipper: params.shipper || {},
    connectedAt: params.apiKey ? new Date().toISOString() : undefined,
  };

  const { error } = await supabase
    .from('tenants')
    .update({
      settings: {
        ...currentSettings,
        warehouse: {
          ...warehouse,
          dhl: dhlSettings,
        },
      },
    })
    .eq('id', tenantId);

  if (error) return json({ error: error.message }, 500);
  return json({ success: true });
}

/* -------------------------------------------------------------------------- */
/*  Action: test_connection                                                    */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleTestConnection(supabase: any, tenantId: string) {
  const settings = await getDHLSettings(supabase, tenantId);
  if (!settings?.apiKey) return json({ error: 'DHL not configured' }, 400);

  try {
    const baseUrl = getDHLBaseUrl(settings);
    const headers = getDHLHeaders(settings);

    // Validate credentials with a GET to /orders (returns 200 even with empty results)
    const resp = await fetch(`${baseUrl}/orders`, {
      method: 'GET',
      headers,
    });

    // 200 = OK, 400 = auth passed but missing params, 405 = method not allowed (auth passed)
    // All these mean the API key + credentials are valid
    if (resp.ok || resp.status === 200 || resp.status === 400 || resp.status === 405) {
      return json({ success: true });
    }

    // DHL returns 401/403 for bad credentials
    if (resp.status === 401 || resp.status === 403) {
      return json({ success: false, error: 'Authentication failed — check credentials' });
    }

    const text = await resp.text();
    return json({ success: false, error: `DHL returned ${resp.status}: ${text.slice(0, 200)}` });
  } catch (err) {
    return json({ success: false, error: err instanceof Error ? err.message : 'Connection failed' });
  }
}

/* -------------------------------------------------------------------------- */
/*  Action: create_label                                                       */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCreateLabel(supabase: any, tenantId: string, params?: Record<string, unknown>) {
  if (!params?.shipmentId) return json({ error: 'Missing shipmentId' }, 400);
  const shipmentId = params.shipmentId as string;

  // 1. Load DHL settings
  const settings = await getDHLSettings(supabase, tenantId);
  if (!settings?.apiKey) return json({ error: 'DHL not configured' }, 400);

  // 2. Load shipment (tenant check)
  const { data: shipment, error: shipErr } = await supabase
    .from('wh_shipments')
    .select('*')
    .eq('id', shipmentId)
    .eq('tenant_id', tenantId)
    .single();

  if (shipErr || !shipment) return json({ error: 'Shipment not found' }, 404);

  // 3. Validate. Accept a per-request weight override so the user can tweak
  //    it right before printing without having to re-open step 3 of the wizard.
  const weightOverrideRaw = params.weightGramsOverride;
  const weightOverride =
    typeof weightOverrideRaw === 'number' && weightOverrideRaw > 0
      ? weightOverrideRaw
      : typeof weightOverrideRaw === 'string' && weightOverrideRaw.trim() !== '' && !isNaN(Number(weightOverrideRaw))
        ? Number(weightOverrideRaw)
        : null;
  const effectiveWeightGrams = weightOverride ?? shipment.total_weight_grams;
  if (!effectiveWeightGrams || effectiveWeightGrams <= 0) {
    return json({ error: 'Weight is required for DHL label creation' }, 400);
  }
  if (!shipment.shipping_street || !shipment.shipping_postal_code || !shipment.shipping_city) {
    return json({ error: 'Complete shipping address is required' }, 400);
  }

  // If the caller passed an override, persist it so the shipment record stays
  // in sync with the weight the label was actually printed with.
  if (weightOverride && weightOverride !== shipment.total_weight_grams) {
    await supabase
      .from('wh_shipments')
      .update({ total_weight_grams: weightOverride })
      .eq('id', shipmentId)
      .eq('tenant_id', tenantId);
  }

  // 4. Build DHL order request.
  //    Auto-pick the product: V01PAK (national) only works for DEU→DEU.
  //    For any other destination we fall back to V53WPAK (Paket International).
  //    Caller-supplied `params.product` always wins.
  const shipperCountry = mapCountryToISO3(settings.shipper.country || 'DEU');
  const consigneeCountry = mapCountryToISO3(shipment.shipping_country);
  const isInternational = shipperCountry !== consigneeCountry;
  const configuredProduct = settings.defaultProduct || 'V01PAK';
  const autoProduct = isInternational && configuredProduct === 'V01PAK' ? 'V53WPAK' : configuredProduct;
  const product = (params.product as string) || autoProduct;
  // DHL embeds the product code in positions 11-12 of the billing number, so
  // each product requires its own activated participation. Pick the right
  // billing number for the product. If the international one is missing for
  // an international shipment we fail fast with a clear message instead of
  // letting DHL return its opaque "product unknown" fault.
  const isV53 = product === 'V53WPAK' || product === 'V54EPAK' || product === 'V66WPI' || product === 'V62WP';
  if (isV53 && !settings.billingNumberInternational) {
    return json({
      error: 'No international DHL billing number configured. Open Warehouse → DHL Integration and add the V53WPAK billing number (format: EKP + 53 + Teilnahme). It must be activated in your DHL business contract.',
    });
  }
  const billingNumber = isV53 ? settings.billingNumberInternational : settings.billingNumber;
  const labelFormat = settings.labelFormat || 'PDF_A4';
  const weightKg = effectiveWeightGrams / 1000;

  const dhlOrder = {
    profile: 'STANDARD_GRUPPENPROFIL',
    shipments: [
      {
        product,
        billingNumber,
        refNo: shipment.shipment_number,
        shipper: {
          name1: settings.shipper.name1,
          name2: settings.shipper.name2 || undefined,
          addressStreet: settings.shipper.addressStreet,
          postalCode: settings.shipper.postalCode,
          city: settings.shipper.city,
          country: shipperCountry,
          email: settings.shipper.email || undefined,
          phone: settings.shipper.phone || undefined,
        },
        consignee: {
          name1: shipment.recipient_company || shipment.recipient_name,
          name2: shipment.recipient_company ? shipment.recipient_name : undefined,
          addressStreet: shipment.shipping_street,
          postalCode: shipment.shipping_postal_code,
          city: shipment.shipping_city,
          country: consigneeCountry,
          email: shipment.recipient_email || undefined,
          phone: shipment.recipient_phone || undefined,
        },
        details: {
          dim: { uom: 'mm', height: 100, length: 300, width: 200 },
          weight: { uom: 'kg', value: weightKg },
        },
      },
    ],
  };

  // 5. Call DHL API
  const baseUrl = getDHLBaseUrl(settings);
  const headers = getDHLHeaders(settings);

  const resp = await fetch(`${baseUrl}/orders?includeDocs=URL&docFormat=${labelFormat}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(dhlOrder),
  });

  const respBody = await resp.json();

  if (!resp.ok) {
    console.error('DHL API error response:', JSON.stringify(respBody, null, 2));
    console.error('DHL API request payload:', JSON.stringify(dhlOrder, null, 2));
    const errMsg = respBody?.items?.[0]?.validationMessages?.[0]?.validationMessage
      || respBody?.detail
      || respBody?.title
      || `DHL API error ${resp.status}`;
    // Return 200 so supabase-js passes through the error details (not FunctionsHttpError)
    return json({ error: errMsg, dhlRequest: dhlOrder, dhlResponse: respBody });
  }

  // 6. Extract tracking + label
  const item = respBody?.items?.[0];
  if (!item || item.sstatus?.statusCode !== 200) {
    const errMsg = item?.validationMessages?.[0]?.validationMessage || 'Failed to create label';
    return json({ error: errMsg }, 400);
  }

  const trackingNumber = item.shipmentNo;
  const labelUrl = item.label?.url || '';

  // 7. Download label PDF and store in Supabase Storage
  let storagePath = '';
  let signedUrl = '';
  if (labelUrl) {
    try {
      const labelResp = await fetch(labelUrl);
      const labelBlob = await labelResp.blob();
      const labelBuffer = await labelBlob.arrayBuffer();
      storagePath = `${tenantId}/shipping-labels/${shipmentId}.pdf`;

      await supabase.storage
        .from('documents')
        .upload(storagePath, new Uint8Array(labelBuffer), {
          contentType: 'application/pdf',
          upsert: true,
        });

      const { data: signedData } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days
      signedUrl = signedData?.signedUrl || '';
    } catch (storageErr) {
      console.error('Failed to store label PDF:', storageErr);
      // Continue — we still have the DHL URL
      signedUrl = labelUrl;
    }
  }

  // 8. Update shipment
  const carrierLabelData = {
    carrier: 'DHL',
    dhlShipmentNumber: trackingNumber,
    dhlProduct: product,
    labelFormat,
    labelStoragePath: storagePath,
    createdAt: new Date().toISOString(),
  };

  const { error: updateErr } = await supabase
    .from('wh_shipments')
    .update({
      tracking_number: trackingNumber,
      label_url: signedUrl || labelUrl,
      carrier_label_data: carrierLabelData,
      status: 'label_created',
    })
    .eq('id', shipmentId)
    .eq('tenant_id', tenantId);

  if (updateErr) {
    console.error('Failed to update shipment:', updateErr);
  }

  // 9. Magic-link email — fire and forget. Failures must not block label creation.
  try {
    await sendTrackingMagicLinkEmail(supabase, tenantId, shipmentId);
  } catch (mailErr) {
    console.error('Failed to send tracking magic-link email:', mailErr);
  }

  return json({
    success: true,
    trackingNumber,
    shipmentNumber: trackingNumber,
    labelUrl: signedUrl || labelUrl,
    labelStoragePath: storagePath,
    validationMessages: item.validationMessages || [],
  });
}

/* -------------------------------------------------------------------------- */
/*  Magic-link tracking email — sends customer the /t/:token URL              */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendTrackingMagicLinkEmail(supabase: any, tenantId: string, shipmentId: string) {
  // Re-read the shipment so we have the auto-generated tracking_token
  const { data: shipment } = await supabase
    .from('wh_shipments')
    .select('id, tenant_id, shipment_number, recipient_name, recipient_email, tracking_token, tracking_number, carrier, total_items')
    .eq('id', shipmentId)
    .eq('tenant_id', tenantId)
    .single();

  if (!shipment?.recipient_email || !shipment?.tracking_token) {
    return;
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, settings')
    .eq('id', tenantId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = (tenant?.settings ?? {}) as any;
  const tenantName = (settings.branding?.appName as string) || tenant?.name || 'Trackbliss';
  const primaryColor = (settings.branding?.primaryColor as string) || '#3B82F6';
  const logoUrl = settings.branding?.logoUrl as string | undefined;
  const appOrigin = (settings.branding?.appOrigin as string)
    || (settings.publicAppUrl as string)
    || 'https://dpp-app.fambliss.eu';

  const trackingUrl = `${appOrigin.replace(/\/$/, '')}/t/${shipment.tracking_token}`;
  const firstName = (shipment.recipient_name as string)?.split(' ')[0] || '';

  // Locale heuristic: tenant locale > 'de' (most customers are DE today)
  const locale = (settings.notifications?.emailLocale as string) || 'de';

  const subject = locale === 'en'
    ? `${tenantName} — your package is on its way`
    : `${tenantName} — dein Paket ist unterwegs`;

  const html = renderTrackingMagicLinkHtml({
    locale,
    firstName,
    tenantName,
    primaryColor,
    logoUrl,
    trackingUrl,
    trackingNumber: shipment.tracking_number || '',
    shipmentNumber: shipment.shipment_number,
    carrier: shipment.carrier || 'DHL',
    totalItems: shipment.total_items ?? 1,
  });

  // Insert into rh_notifications (channel=email, status=pending) — the
  // Database Webhook OR our direct invoke below will hand this off to send-email.
  const { data: notif, error: notifErr } = await supabase
    .from('rh_notifications')
    .insert({
      tenant_id: tenantId,
      channel: 'email',
      template: 'shipment_label_ready',
      status: 'pending',
      recipient_email: shipment.recipient_email,
      subject,
      content: html,
      metadata: { isHtml: true, senderName: tenantName, shipmentId, trackingToken: shipment.tracking_token },
    })
    .select()
    .single();

  if (notifErr || !notif) {
    console.error('Failed to insert tracking notification:', notifErr?.message);
    return;
  }

  // Direct invoke so we don't depend on a database webhook being configured.
  await supabase.functions.invoke('send-email', { body: { record: notif } });
}

interface TrackingEmailParams {
  locale: string;
  firstName: string;
  tenantName: string;
  primaryColor: string;
  logoUrl?: string;
  trackingUrl: string;
  trackingNumber: string;
  shipmentNumber: string;
  carrier: string;
  totalItems: number;
}

function renderTrackingMagicLinkHtml(p: TrackingEmailParams): string {
  const t = p.locale === 'en'
    ? {
        greeting: p.firstName ? `Hi ${p.firstName},` : 'Hi,',
        intro: `Your order from <strong>${p.tenantName}</strong> just left our warehouse.`,
        cta: 'Track your package',
        liveStatus: 'Live status, location updates, and delivery prediction — no login, no tracking code, just one click.',
        carrier: 'Carrier',
        tracking: 'Tracking number',
        items: p.totalItems === 1 ? '1 item' : `${p.totalItems} items`,
        shipment: 'Shipment',
        whatsNext: 'What happens next?',
        next1: 'Carrier picks up your package today',
        next2: 'You get live status updates here',
        next3: 'We notify you on delivery',
        footer: `Sent by ${p.tenantName} via Trackbliss. This link is unique to your shipment — please don't share it.`,
        question: 'Questions? Just reply to this email.',
      }
    : {
        greeting: p.firstName ? `Hallo ${p.firstName},` : 'Hallo,',
        intro: `Deine Bestellung von <strong>${p.tenantName}</strong> hat soeben unser Lager verlassen.`,
        cta: 'Paket verfolgen',
        liveStatus: 'Live-Status, Standort-Updates und Liefer-Prognose — kein Login, kein Tracking-Code, ein Klick.',
        carrier: 'Versand mit',
        tracking: 'Sendungsnummer',
        items: p.totalItems === 1 ? '1 Artikel' : `${p.totalItems} Artikel`,
        shipment: 'Auftrag',
        whatsNext: 'Wie geht es weiter?',
        next1: 'Der Versanddienstleister holt das Paket heute ab',
        next2: 'Du bekommst hier Live-Status-Updates',
        next3: 'Wir benachrichtigen dich bei Zustellung',
        footer: `Gesendet von ${p.tenantName} via Trackbliss. Dieser Link ist einzigartig für deine Sendung — bitte nicht weitergeben.`,
        question: 'Fragen? Antworte einfach auf diese E-Mail.',
      };

  const logoBlock = p.logoUrl
    ? `<img src="${p.logoUrl}" alt="${p.tenantName}" style="height:36px;width:auto;display:block;margin-bottom:12px" />`
    : `<div style="font-size:18px;font-weight:700;color:${p.primaryColor};margin-bottom:12px">${p.tenantName}</div>`;

  return `<!DOCTYPE html>
<html lang="${p.locale}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${p.tenantName}</title>
</head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f6f8;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
      <tr><td style="padding:28px 28px 0">
        ${logoBlock}
        <div style="font-size:13px;color:#64748b;letter-spacing:.04em;text-transform:uppercase;font-weight:600">${t.shipment} · ${p.shipmentNumber}</div>
      </td></tr>
      <tr><td style="padding:20px 28px 8px">
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:#0f172a">${t.greeting}</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155">${t.intro}</p>
      </td></tr>
      <tr><td style="padding:0 28px 24px" align="center">
        <a href="${p.trackingUrl}"
           style="display:inline-block;padding:14px 28px;background:${p.primaryColor};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;box-shadow:0 4px 12px ${p.primaryColor}40">
          ${t.cta} →
        </a>
        <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;line-height:1.5">${t.liveStatus}</p>
      </td></tr>
      <tr><td style="padding:0 28px 20px">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0">
          <tr>
            <td style="padding:14px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0">
              <strong style="color:#0f172a">${t.carrier}:</strong> ${p.carrier}
            </td>
          </tr>
          <tr>
            <td style="padding:14px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0">
              <strong style="color:#0f172a">${t.tracking}:</strong> <span style="font-family:'SFMono-Regular',Consolas,monospace">${p.trackingNumber}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 16px;font-size:13px;color:#64748b">
              <strong style="color:#0f172a">${t.items}</strong>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 28px 24px">
        <div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:10px">${t.whatsNext}</div>
        <ol style="margin:0;padding-left:18px;font-size:13px;color:#475569;line-height:1.7">
          <li>${t.next1}</li>
          <li>${t.next2}</li>
          <li>${t.next3}</li>
        </ol>
      </td></tr>
      <tr><td style="padding:18px 28px;border-top:1px solid #e2e8f0;background:#f8fafc">
        <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;line-height:1.5">${t.question}</p>
        <p style="margin:0;font-size:11px;color:#cbd5e1;line-height:1.5">${t.footer}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/*  Action: cancel_label                                                       */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCancelLabel(supabase: any, tenantId: string, params?: Record<string, unknown>) {
  if (!params?.shipmentId) return json({ error: 'Missing shipmentId' }, 400);
  const shipmentId = params.shipmentId as string;

  // 1. Load shipment
  const { data: shipment, error: shipErr } = await supabase
    .from('wh_shipments')
    .select('*, carrier_label_data')
    .eq('id', shipmentId)
    .eq('tenant_id', tenantId)
    .single();

  if (shipErr || !shipment) return json({ error: 'Shipment not found' }, 404);

  const dhlShipmentNumber = shipment.carrier_label_data?.dhlShipmentNumber;
  if (!dhlShipmentNumber) return json({ error: 'No DHL shipment number found' }, 400);

  // 2. Load DHL settings
  const settings = await getDHLSettings(supabase, tenantId);
  if (!settings?.apiKey) return json({ error: 'DHL not configured' }, 400);

  // 3. Cancel at DHL.
  //    DHL Parcel DE v2 uses `DELETE /orders?shipment={num}` — the shipment
  //    number goes in the QUERY STRING, not the URL path. Pointing at a path
  //    segment produces a 401 "RF-UndefinedResource" fault.
  const baseUrl = getDHLBaseUrl(settings);
  const headers = getDHLHeaders(settings);

  const resp = await fetch(`${baseUrl}/orders?shipment=${encodeURIComponent(dhlShipmentNumber)}`, {
    method: 'DELETE',
    headers,
  });

  // DHL returns 200 on success, 400 if already cancelled/shipped.
  if (!resp.ok && resp.status !== 200) {
    const respBody = await resp.text();
    // If already cancelled or shipment not found, we still clean up locally
    // so the UI doesn't get stuck on a zombie label record.
    if (resp.status !== 404 && resp.status !== 400) {
      return json({ error: `DHL cancellation failed: ${respBody.slice(0, 200)}` }, 502);
    }
  }

  // 4. Delete label from storage
  const storagePath = shipment.carrier_label_data?.labelStoragePath;
  if (storagePath) {
    await supabase.storage.from('documents').remove([storagePath]);
  }

  // 5. Update shipment — clear tracking, revert status
  const updatedLabelData = {
    ...shipment.carrier_label_data,
    cancelledAt: new Date().toISOString(),
  };

  const newStatus = shipment.status === 'label_created' ? 'packed' : shipment.status;

  const { error: updateErr } = await supabase
    .from('wh_shipments')
    .update({
      tracking_number: null,
      label_url: null,
      carrier_label_data: updatedLabelData,
      status: newStatus,
    })
    .eq('id', shipmentId)
    .eq('tenant_id', tenantId);

  if (updateErr) {
    console.error('Failed to update shipment after cancel:', updateErr);
  }

  return json({ success: true });
}

/* -------------------------------------------------------------------------- */
/*  Action: get_tracking                                                       */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleGetTracking(supabase: any, tenantId: string, params?: Record<string, unknown>) {
  if (!params?.trackingNumber) return json({ error: 'Missing trackingNumber' }, 400);
  const trackingNumber = params.trackingNumber as string;

  const settings = await getDHLSettings(supabase, tenantId);
  if (!settings?.apiKey) return json({ error: 'DHL not configured' }, 400);

  try {
    // DHL Tracking API (separate from Shipping API)
    const trackingUrl = settings.sandbox
      ? `https://api-sandbox.dhl.com/track/shipments?trackingNumber=${trackingNumber}`
      : `https://api-eu.dhl.com/track/shipments?trackingNumber=${trackingNumber}`;

    const resp = await fetch(trackingUrl, {
      headers: { 'DHL-API-Key': settings.apiKey },
    });

    if (!resp.ok) {
      if (resp.status === 404) return json({ events: [] });
      return json({ error: `DHL tracking API error: ${resp.status}` }, 502);
    }

    const data = await resp.json();
    const shipments = data?.shipments || [];
    if (shipments.length === 0) return json({ events: [] });

    const events = (shipments[0]?.events || []).map((ev: {
      timestamp?: string;
      location?: { address?: { addressLocality?: string } };
      description?: string;
      statusCode?: string;
    }) => ({
      timestamp: ev.timestamp || '',
      location: ev.location?.address?.addressLocality || undefined,
      description: ev.description || '',
      statusCode: ev.statusCode || undefined,
    }));

    return json({ events });
  } catch (err) {
    console.error('DHL tracking error:', err);
    return json({ events: [], error: err instanceof Error ? err.message : 'Tracking failed' });
  }
}

/* -------------------------------------------------------------------------- */
/*  Action: poll_all_tracking                                                  */
/*  Iterates over all active DHL shipments and updates wh_shipments.status    */
/*  based on DHL's latest tracking event. Designed to be called by a cron     */
/*  job every ~30 min.                                                         */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePollAllTracking(supabase: any, tenantId: string) {
  return await pollTrackingForTenant(supabase, tenantId);
}

/** Shared polling logic — called from user-invoked poll_all_tracking as well
 *  as the cron-mode that iterates all tenants. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function pollTrackingForTenant(supabase: any, tenantId: string) {
  const settings = await getDHLSettings(supabase, tenantId);
  if (!settings?.apiKey) return json({ tenantId, skipped: true, reason: 'DHL not configured' });

  const trackingBase = settings.sandbox
    ? 'https://api-sandbox.dhl.com/track/shipments'
    : 'https://api-eu.dhl.com/track/shipments';

  const { data: shipments } = await supabase
    .from('wh_shipments')
    .select('id, shipment_number, tracking_number, status')
    .eq('tenant_id', tenantId)
    .eq('carrier', 'DHL')
    .not('tracking_number', 'is', null)
    .in('status', ['shipped', 'label_created', 'in_transit']);

  const results = { tenantId, total: shipments?.length ?? 0, delivered: 0, inTransit: 0, noChange: 0, errors: 0 };
  const details: Array<Record<string, unknown>> = [];
  const now = new Date().toISOString();

  for (const ship of (shipments || [])) {
    try {
      const resp = await fetch(`${trackingBase}?trackingNumber=${encodeURIComponent(ship.tracking_number)}`, {
        headers: { 'DHL-API-Key': settings.apiKey },
      });
      if (!resp.ok) {
        if (resp.status === 404) {
          await supabase.from('wh_shipments').update({ tracking_polled_at: now }).eq('id', ship.id);
          results.noChange++;
          continue;
        }
        results.errors++;
        details.push({ shipment: ship.shipment_number, error: `DHL ${resp.status}` });
        continue;
      }
      const data = await resp.json();
      const shipmentData = data?.shipments?.[0];
      if (!shipmentData) { results.noChange++; continue; }

      const statusCode = shipmentData.status?.statusCode || shipmentData.status?.status;
      const events = shipmentData.events || [];
      const latestEvent = events[0] || shipmentData.status || {};
      const lastDescription = latestEvent.description || latestEvent.status || null;
      const lastEventAt = latestEvent.timestamp || null;
      const lastLocation = latestEvent.location?.address?.addressLocality || null;

      const patch: Record<string, unknown> = {
        tracking_last_status: statusCode || null,
        tracking_last_description: lastDescription,
        tracking_last_event_at: lastEventAt,
        tracking_last_location: lastLocation,
        tracking_polled_at: now,
      };

      if (statusCode === 'delivered') {
        if (ship.status !== 'delivered') {
          patch.status = 'delivered';
          patch.delivered_at = now;
          results.delivered++;
          details.push({ shipment: ship.shipment_number, newStatus: 'delivered' });
        } else results.noChange++;
      } else if (statusCode === 'transit' || statusCode === 'in_transit' || statusCode === 'out_for_delivery') {
        if (ship.status === 'shipped' || ship.status === 'label_created') {
          patch.status = 'in_transit';
          results.inTransit++;
          details.push({ shipment: ship.shipment_number, newStatus: 'in_transit' });
        } else results.noChange++;
      } else {
        results.noChange++;
      }

      await supabase.from('wh_shipments').update(patch).eq('id', ship.id);
    } catch (e) {
      results.errors++;
      details.push({ shipment: ship.shipment_number, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return json({ success: true, data: results, details });
}

/** Cron-mode: iterate over ALL tenants and poll their DHL shipments.
 *  Read-only on user-input, safe to leave unauthenticated behind Obscurity. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePollAllTenantsCron(supabase: any, _authHeader: string | null) {
  // Find all tenants that have DHL configured
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, settings')
    .not('settings', 'is', null);

  const tenantsWithDHL = (tenants || []).filter((t: { settings?: { warehouse?: { dhl?: { apiKey?: string; enabled?: boolean } } } }) =>
    t.settings?.warehouse?.dhl?.apiKey && t.settings.warehouse.dhl.enabled !== false
  );

  const summary = { tenantsScanned: tenantsWithDHL.length, perTenant: [] as unknown[] };
  for (const tenant of tenantsWithDHL) {
    const res = await pollTrackingForTenant(supabase, tenant.id);
    const body = await res.json();
    summary.perTenant.push({ tenantId: tenant.id, tenantName: tenant.name, result: body.data });
  }

  return json({ success: true, ...summary });
}

/* -------------------------------------------------------------------------- */
/*  Action: get_public_shipment_tracking (no auth — validated by token)        */
/* -------------------------------------------------------------------------- */

async function handlePublicShipmentTracking(params?: Record<string, unknown>) {
  const token = (params?.token as string | undefined)?.trim().toLowerCase();
  if (!token) {
    return json({ events: [], error: 'Missing token' });
  }

  // BCP-47 language for DHL Track API: 'de' or 'en' (default 'de').
  const localeRaw = (params?.locale as string | undefined)?.trim().toLowerCase();
  const locale = localeRaw === 'en' ? 'en' : 'de';

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ events: [], error: 'Server misconfigured' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Validate token + load tenant + tracking number
  const { data: shipment, error: shipErr } = await supabase
    .from('wh_shipments')
    .select('tenant_id, tracking_number, carrier, tracking_history')
    .eq('tracking_token', token)
    .single();

  if (shipErr || !shipment?.tenant_id || !shipment?.tracking_number) {
    return json({ events: [], error: 'Tracking not found' });
  }

  // For non-DHL carriers we have no live integration yet; fall back to the
  // cached tracking_history snapshot.
  if (shipment.carrier !== 'DHL') {
    return json({ events: shipment.tracking_history || [], carrier: shipment.carrier });
  }

  const settings = await getDHLSettings(supabase, shipment.tenant_id);
  if (!settings?.apiKey) {
    return json({ events: shipment.tracking_history || [], carrier: 'DHL' });
  }

  try {
    const base = settings.sandbox
      ? 'https://api-sandbox.dhl.com/track/shipments'
      : 'https://api-eu.dhl.com/track/shipments';
    const trackingUrl = `${base}?trackingNumber=${shipment.tracking_number}&language=${locale}`;

    const resp = await fetch(trackingUrl, { headers: { 'DHL-API-Key': settings.apiKey } });
    if (!resp.ok) {
      return json({ events: shipment.tracking_history || [], carrier: 'DHL' });
    }
    const data = await resp.json();
    const shipments = data?.shipments || [];
    if (shipments.length === 0) {
      return json({ events: shipment.tracking_history || [], carrier: 'DHL' });
    }

    const events = (shipments[0]?.events || []).map((ev: {
      timestamp?: string;
      location?: { address?: { addressLocality?: string } };
      description?: string;
      statusCode?: string;
    }) => ({
      timestamp: ev.timestamp || '',
      location: ev.location?.address?.addressLocality || undefined,
      description: ev.description || '',
      statusCode: ev.statusCode || undefined,
    }));

    // Persist as snapshot so future loads are fast even if DHL is down.
    if (events.length > 0) {
      await supabase
        .from('wh_shipments')
        .update({ tracking_history: events, tracking_polled_at: new Date().toISOString() })
        .eq('tracking_token', token);
    }

    return json({ events, carrier: 'DHL' });
  } catch (err) {
    console.error('Public shipment tracking error:', err);
    return json({ events: shipment.tracking_history || [], carrier: 'DHL' });
  }
}

/* -------------------------------------------------------------------------- */
/*  Action: get_public_tracking (no auth — validated by return+tracking match) */
/* -------------------------------------------------------------------------- */

async function handlePublicTracking(params?: Record<string, unknown>) {
  const trackingNumber = params?.trackingNumber as string | undefined;
  const returnNumber = params?.returnNumber as string | undefined;

  if (!trackingNumber || !returnNumber) {
    return json({ events: [], error: 'Missing trackingNumber or returnNumber' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ events: [], error: 'Server misconfigured' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Validate: return must exist with matching tracking number
  const { data: returnRow, error: returnErr } = await supabase
    .from('rh_returns')
    .select('tenant_id')
    .eq('return_number', returnNumber)
    .eq('tracking_number', trackingNumber)
    .single();

  if (returnErr || !returnRow?.tenant_id) {
    return json({ events: [], error: 'Return not found' });
  }

  // Load DHL settings from tenant
  const settings = await getDHLSettings(supabase, returnRow.tenant_id);
  if (!settings?.apiKey) {
    return json({ events: [], error: 'Carrier not configured' });
  }

  // Call DHL Tracking API
  const localeRaw = (params?.locale as string | undefined)?.trim().toLowerCase();
  const locale = localeRaw === 'en' ? 'en' : 'de';
  try {
    const base = settings.sandbox
      ? 'https://api-sandbox.dhl.com/track/shipments'
      : 'https://api-eu.dhl.com/track/shipments';
    const trackingUrl = `${base}?trackingNumber=${trackingNumber}&language=${locale}`;

    const resp = await fetch(trackingUrl, {
      headers: { 'DHL-API-Key': settings.apiKey },
    });

    if (!resp.ok) {
      if (resp.status === 404) return json({ events: [], carrier: 'DHL' });
      return json({ events: [], error: `DHL tracking API error: ${resp.status}`, carrier: 'DHL' });
    }

    const data = await resp.json();
    const shipments = data?.shipments || [];
    if (shipments.length === 0) return json({ events: [], carrier: 'DHL' });

    const events = (shipments[0]?.events || []).map((ev: {
      timestamp?: string;
      location?: { address?: { addressLocality?: string } };
      description?: string;
      statusCode?: string;
    }) => ({
      timestamp: ev.timestamp || '',
      location: ev.location?.address?.addressLocality || undefined,
      description: ev.description || '',
      statusCode: ev.statusCode || undefined,
    }));

    return json({ events, carrier: 'DHL' });
  } catch (err) {
    console.error('Public DHL tracking error:', err);
    return json({ events: [], error: err instanceof Error ? err.message : 'Tracking failed', carrier: 'DHL' });
  }
}

/* -------------------------------------------------------------------------- */
/*  Action: create_return_label                                                */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDHLReturnsBaseUrl(settings: any): string {
  return settings.sandbox ? DHL_RETURNS_SANDBOX_URL : DHL_RETURNS_PROD_URL;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCreateReturnLabel(supabase: any, tenantId: string, params?: Record<string, unknown>) {
  if (!params?.returnId) return json({ error: 'Missing returnId' }, 400);
  const returnId = params.returnId as string;

  // 1. Load DHL settings
  const settings = await getDHLSettings(supabase, tenantId);
  if (!settings?.apiKey) return json({ error: 'DHL not configured. Please set up DHL credentials in Warehouse > DHL Integration.' }, 400);

  // 2. Load return (tenant check via RLS)
  const { data: ret, error: retErr } = await supabase
    .from('rh_returns')
    .select('*')
    .eq('id', returnId)
    .eq('tenant_id', tenantId)
    .single();

  if (retErr || !ret) return json({ error: 'Return not found' }, 404);

  // Prevent duplicate labels
  if (ret.tracking_number && ret.carrier_label_data?.dhlShipmentNumber) {
    return json({ error: 'Label already exists. Cancel the existing label first.' }, 400);
  }

  // 3. Resolve sender (customer) address
  let senderAddress = params.senderAddress as Record<string, unknown> | undefined;

  if (!senderAddress) {
    // Try to get address from customer record
    if (ret.customer_id) {
      const { data: customer } = await supabase
        .from('rh_customers')
        .select('email, name, first_name, last_name, company, addresses')
        .eq('id', ret.customer_id)
        .single();

      if (customer) {
        const addresses = customer.addresses || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const shippingAddr = addresses.find((a: any) => a.type === 'shipping')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          || addresses.find((a: any) => a.isDefault)
          || addresses[0];

        if (shippingAddr) {
          const customerName = customer.name || [customer.first_name, customer.last_name].filter(Boolean).join(' ');
          const addrName = shippingAddr.name || customerName;
          senderAddress = {
            name1: shippingAddr.company || customer.company || addrName || customer.email,
            name2: (shippingAddr.company || customer.company) ? addrName : undefined,
            addressStreet: shippingAddr.street,
            postalCode: shippingAddr.postalCode,
            city: shippingAddr.city,
            country: shippingAddr.country || 'DE',
            email: customer.email,
          };
        }
      }
    }

    // Fallback: check return metadata for address
    if (!senderAddress && ret.metadata) {
      const meta = ret.metadata;
      if (meta.shippingStreet || meta.street) {
        senderAddress = {
          name1: meta.customerName || meta.name || meta.email || 'Customer',
          addressStreet: meta.shippingStreet || meta.street,
          postalCode: meta.shippingPostalCode || meta.postalCode,
          city: meta.shippingCity || meta.city,
          country: meta.shippingCountry || meta.country || 'DE',
          email: meta.email,
        };
      }
    }
  }

  if (!senderAddress || !senderAddress.addressStreet || !senderAddress.postalCode || !senderAddress.city) {
    return json({ error: 'No shipping address available for this customer. Please provide an address.' }, 400);
  }

  // 4. Get returns API settings
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const returnsApiSettings = tenantData?.settings?.warehouse?.dhl?.returnsApi;
  const useReturnsApi = returnsApiSettings?.enabled && returnsApiSettings?.receiverId;

  let trackingNumber: string;
  let labelUrl: string;

  if (useReturnsApi) {
    // ---- DHL Parcel DE Returns API ----
    const returnsBaseUrl = getDHLReturnsBaseUrl(settings);
    const headers = getDHLHeaders(settings);

    const returnPayload = {
      receiverId: returnsApiSettings.receiverId,
      customerReference: ret.return_number,
      shipmentReference: ret.order_id || ret.return_number,
      shipper: {
        name1: senderAddress.name1 as string,
        name2: (senderAddress.name2 as string) || undefined,
        addressStreet: senderAddress.addressStreet as string,
        postalCode: senderAddress.postalCode as string,
        city: senderAddress.city as string,
        country: mapCountryToISO3((senderAddress.country as string) || 'DE'),
        email: (senderAddress.email as string) || undefined,
      },
      itemWeight: { uom: 'kg', value: 1.0 },
      returnDocumentType: 'SHIPMENT_LABEL',
    };

    const resp = await fetch(`${returnsBaseUrl}/returns`, {
      method: 'POST',
      headers,
      body: JSON.stringify(returnPayload),
    });

    const respBody = await resp.json();

    if (!resp.ok) {
      const errMsg = respBody?.detail || respBody?.title || respBody?.statusText || `DHL Returns API error ${resp.status}`;
      return json({ error: errMsg }, resp.status >= 500 ? 502 : 400);
    }

    trackingNumber = respBody.shipmentNo || respBody.shipmentNumber || '';
    const labelDataBase64 = respBody.labelData || '';
    labelUrl = respBody.labelUrl || '';

    // Store base64 label PDF
    if (labelDataBase64) {
      try {
        const binaryStr = atob(labelDataBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const storagePath = `${tenantId}/return-labels/${returnId}.pdf`;

        await supabase.storage
          .from('documents')
          .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: true });

        const { data: signedData } = await supabase.storage
          .from('documents')
          .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
        labelUrl = signedData?.signedUrl || labelUrl;

        // Store the carrier label data
        const carrierLabelData = {
          carrier: 'DHL',
          dhlShipmentNumber: trackingNumber,
          dhlProduct: 'RETOURE',
          labelFormat: 'PDF',
          labelStoragePath: storagePath,
          createdAt: new Date().toISOString(),
          apiType: 'returns',
        };

        await supabase
          .from('rh_returns')
          .update({
            tracking_number: trackingNumber,
            label_url: labelUrl,
            label_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            carrier_label_data: carrierLabelData,
            status: 'LABEL_GENERATED',
          })
          .eq('id', returnId)
          .eq('tenant_id', tenantId);
      } catch (storageErr) {
        console.error('Failed to store return label PDF:', storageErr);
      }
    }
  } else {
    // ---- DHL Parcel DE Shipping v2 (inverted sender/receiver for returns) ----
    const product = settings.defaultProduct || 'V01PAK';
    const labelFormat = settings.labelFormat || 'PDF_A4';

    const dhlOrder = {
      profile: 'STANDARD_GRUPPENPROFIL',
      shipments: [
        {
          product,
          billingNumber: settings.billingNumber,
          refNo: ret.return_number,
          // For returns: customer is the shipper, warehouse is the consignee
          shipper: {
            name1: senderAddress.name1 as string,
            name2: (senderAddress.name2 as string) || undefined,
            addressStreet: senderAddress.addressStreet as string,
            postalCode: senderAddress.postalCode as string,
            city: senderAddress.city as string,
            country: mapCountryToISO3((senderAddress.country as string) || 'DE'),
            email: (senderAddress.email as string) || undefined,
          },
          consignee: {
            name1: settings.shipper.name1,
            name2: settings.shipper.name2 || undefined,
            addressStreet: settings.shipper.addressStreet,
            postalCode: settings.shipper.postalCode,
            city: settings.shipper.city,
            country: settings.shipper.country || 'DEU',
            email: settings.shipper.email || undefined,
            phone: settings.shipper.phone || undefined,
          },
          details: {
            dim: { uom: 'mm', height: 100, length: 300, width: 200 },
            weight: { uom: 'kg', value: 1.0 },
          },
        },
      ],
    };

    const baseUrl = getDHLBaseUrl(settings);
    const headers = getDHLHeaders(settings);

    const resp = await fetch(`${baseUrl}/orders?includeDocs=URL&docFormat=${labelFormat}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(dhlOrder),
    });

    const respBody = await resp.json();

    if (!resp.ok) {
      const errMsg = respBody?.items?.[0]?.validationMessages?.[0]?.validationMessage
        || respBody?.detail
        || respBody?.title
        || `DHL API error ${resp.status}`;
      return json({ error: errMsg }, resp.status >= 500 ? 502 : 400);
    }

    const item = respBody?.items?.[0];
    if (!item || item.sstatus?.statusCode !== 200) {
      const errMsg = item?.validationMessages?.[0]?.validationMessage || 'Failed to create return label';
      return json({ error: errMsg }, 400);
    }

    trackingNumber = item.shipmentNo;
    labelUrl = item.label?.url || '';

    // Download and store label PDF
    let storagePath = '';
    if (labelUrl) {
      try {
        const labelResp = await fetch(labelUrl);
        const labelBlob = await labelResp.blob();
        const labelBuffer = await labelBlob.arrayBuffer();
        storagePath = `${tenantId}/return-labels/${returnId}.pdf`;

        await supabase.storage
          .from('documents')
          .upload(storagePath, new Uint8Array(labelBuffer), { contentType: 'application/pdf', upsert: true });

        const { data: signedData } = await supabase.storage
          .from('documents')
          .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
        labelUrl = signedData?.signedUrl || labelUrl;
      } catch (storageErr) {
        console.error('Failed to store return label PDF:', storageErr);
      }
    }

    // Update return record
    const carrierLabelData = {
      carrier: 'DHL',
      dhlShipmentNumber: trackingNumber,
      dhlProduct: product,
      labelFormat,
      labelStoragePath: storagePath,
      createdAt: new Date().toISOString(),
      apiType: 'shipping_v2',
    };

    await supabase
      .from('rh_returns')
      .update({
        tracking_number: trackingNumber,
        label_url: labelUrl,
        label_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        carrier_label_data: carrierLabelData,
        status: 'LABEL_GENERATED',
      })
      .eq('id', returnId)
      .eq('tenant_id', tenantId);
  }

  // Add timeline entry
  await supabase.from('rh_return_timeline').insert({
    return_id: returnId,
    tenant_id: tenantId,
    status: 'LABEL_GENERATED',
    comment: `DHL return label created (${trackingNumber})`,
    actor_type: 'system',
  });

  return json({
    success: true,
    trackingNumber,
    shipmentNumber: trackingNumber,
    labelUrl,
    labelStoragePath: `${tenantId}/return-labels/${returnId}.pdf`,
  });
}

/* -------------------------------------------------------------------------- */
/*  Action: cancel_return_label                                                */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCancelReturnLabel(supabase: any, tenantId: string, params?: Record<string, unknown>) {
  if (!params?.returnId) return json({ error: 'Missing returnId' }, 400);
  const returnId = params.returnId as string;

  // 1. Load return
  const { data: ret, error: retErr } = await supabase
    .from('rh_returns')
    .select('*, carrier_label_data')
    .eq('id', returnId)
    .eq('tenant_id', tenantId)
    .single();

  if (retErr || !ret) return json({ error: 'Return not found' }, 404);

  const dhlShipmentNumber = ret.carrier_label_data?.dhlShipmentNumber;
  if (!dhlShipmentNumber) return json({ error: 'No DHL shipment number found' }, 400);

  // 2. Load DHL settings
  const settings = await getDHLSettings(supabase, tenantId);
  if (!settings?.apiKey) return json({ error: 'DHL not configured' }, 400);

  // 3. Cancel at DHL (only for shipping_v2 labels; returns API labels can't be cancelled easily)
  const apiType = ret.carrier_label_data?.apiType || 'shipping_v2';
  if (apiType === 'shipping_v2') {
    const baseUrl = getDHLBaseUrl(settings);
    const headers = getDHLHeaders(settings);

    // Same fix as handleCancelLabel: shipment number goes in the query string.
    const resp = await fetch(`${baseUrl}/orders?shipment=${encodeURIComponent(dhlShipmentNumber)}`, {
      method: 'DELETE',
      headers,
    });

    if (!resp.ok && resp.status !== 200 && resp.status !== 404 && resp.status !== 400) {
      const respBody = await resp.text();
      return json({ error: `DHL cancellation failed: ${respBody.slice(0, 200)}` }, 502);
    }
  }

  // 4. Delete label from storage
  const storagePath = ret.carrier_label_data?.labelStoragePath;
  if (storagePath) {
    await supabase.storage.from('documents').remove([storagePath]);
  }

  // 5. Update return — clear tracking, revert status
  const updatedLabelData = {
    ...ret.carrier_label_data,
    cancelledAt: new Date().toISOString(),
  };

  const newStatus = ret.status === 'LABEL_GENERATED' ? 'APPROVED' : ret.status;

  const { error: updateErr } = await supabase
    .from('rh_returns')
    .update({
      tracking_number: null,
      label_url: null,
      label_expires_at: null,
      carrier_label_data: updatedLabelData,
      status: newStatus,
    })
    .eq('id', returnId)
    .eq('tenant_id', tenantId);

  if (updateErr) {
    console.error('Failed to update return after label cancel:', updateErr);
  }

  // 6. Add timeline entry
  await supabase.from('rh_return_timeline').insert({
    return_id: returnId,
    tenant_id: tenantId,
    status: newStatus,
    comment: `DHL return label cancelled (${dhlShipmentNumber})`,
    actor_type: 'system',
  });

  return json({ success: true });
}

/* -------------------------------------------------------------------------- */
/*  Country code mapping helper                                                */
/* -------------------------------------------------------------------------- */

function mapCountryToISO3(country: string): string {
  if (!country) return 'DEU';
  const trimmed = country.trim();
  const upper = trimmed.toUpperCase();

  // Already ISO-3 (3 alpha chars)
  if (/^[A-Z]{3}$/.test(upper)) return upper;

  // ISO-2 → ISO-3 (most common input: 'DE', 'AT', ...)
  const iso2: Record<string, string> = {
    DE: 'DEU', AT: 'AUT', CH: 'CHE', FR: 'FRA', IT: 'ITA',
    ES: 'ESP', NL: 'NLD', BE: 'BEL', PL: 'POL', CZ: 'CZE',
    GB: 'GBR', UK: 'GBR', US: 'USA', SE: 'SWE', DK: 'DNK',
    NO: 'NOR', FI: 'FIN', PT: 'PRT', IE: 'IRL', LU: 'LUX',
    HU: 'HUN', RO: 'ROU', BG: 'BGR', HR: 'HRV', SK: 'SVK',
    SI: 'SVN', LT: 'LTU', LV: 'LVA', EE: 'EST', GR: 'GRC',
    MT: 'MLT', CY: 'CYP', LI: 'LIE', IS: 'ISL', CA: 'CAN',
    AU: 'AUS', NZ: 'NZL', JP: 'JPN',
  };
  if (iso2[upper]) return iso2[upper];

  // Country NAMES (German + English) → ISO-3. Guards against poorly
  // entered recipient data like "DEUTSCHLAND" or "Germany".
  const names: Record<string, string> = {
    DEUTSCHLAND: 'DEU', GERMANY: 'DEU',
    ÖSTERREICH: 'AUT', OESTERREICH: 'AUT', AUSTRIA: 'AUT',
    SCHWEIZ: 'CHE', SWITZERLAND: 'CHE', SUISSE: 'CHE',
    FRANKREICH: 'FRA', FRANCE: 'FRA',
    ITALIEN: 'ITA', ITALY: 'ITA', ITALIA: 'ITA',
    SPANIEN: 'ESP', SPAIN: 'ESP', ESPAÑA: 'ESP',
    NIEDERLANDE: 'NLD', NETHERLANDS: 'NLD',
    BELGIEN: 'BEL', BELGIUM: 'BEL',
    POLEN: 'POL', POLAND: 'POL',
    TSCHECHIEN: 'CZE', 'CZECH REPUBLIC': 'CZE', CZECHIA: 'CZE',
    GROSSBRITANNIEN: 'GBR', 'GROßBRITANNIEN': 'GBR',
    'UNITED KINGDOM': 'GBR', 'VEREINIGTES KÖNIGREICH': 'GBR',
    'VEREINIGTE STAATEN': 'USA', 'UNITED STATES': 'USA', USA: 'USA',
    SCHWEDEN: 'SWE', SWEDEN: 'SWE',
    DÄNEMARK: 'DNK', DAENEMARK: 'DNK', DENMARK: 'DNK',
    NORWEGEN: 'NOR', NORWAY: 'NOR',
    FINNLAND: 'FIN', FINLAND: 'FIN',
    PORTUGAL: 'PRT',
    IRLAND: 'IRL', IRELAND: 'IRL',
    LUXEMBURG: 'LUX', LUXEMBOURG: 'LUX',
    UNGARN: 'HUN', HUNGARY: 'HUN',
    RUMÄNIEN: 'ROU', RUMAENIEN: 'ROU', ROMANIA: 'ROU',
    BULGARIEN: 'BGR', BULGARIA: 'BGR',
    KROATIEN: 'HRV', CROATIA: 'HRV',
    SLOWAKEI: 'SVK', SLOVAKIA: 'SVK',
    SLOWENIEN: 'SVN', SLOVENIA: 'SVN',
    GRIECHENLAND: 'GRC', GREECE: 'GRC',
    LIECHTENSTEIN: 'LIE',
    ISLAND: 'ISL', ICELAND: 'ISL',
    KANADA: 'CAN', CANADA: 'CAN',
    AUSTRALIEN: 'AUS', AUSTRALIA: 'AUS',
    NEUSEELAND: 'NZL', 'NEW ZEALAND': 'NZL',
    JAPAN: 'JPN',
  };
  if (names[upper]) return names[upper];

  // Last resort: log and default to DEU so the shipment doesn't fail silently.
  console.warn('[dhl-shipping] mapCountryToISO3: unknown country "%s" — defaulting to DEU', country);
  return 'DEU';
}
