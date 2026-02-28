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
  if (req.method === 'OPTIONS') return json(null, 204);

  try {
    // --- Auth ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Invalid token' }, 401);

    // --- Tenant ---
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    if (!profile?.tenant_id) return json({ error: 'No tenant' }, 403);
    const tenantId = profile.tenant_id;

    // --- Billing Gate ---
    const { data: activeMods } = await supabase
      .from('billing_module_subscriptions')
      .select('module_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active');
    const moduleIds = (activeMods || []).map((m: { module_id: string }) => m.module_id);
    const hasWarehousePro = moduleIds.includes('warehouse_professional') || moduleIds.includes('warehouse_business');
    if (!hasWarehousePro) {
      return json({ error: 'Warehouse Professional or Business module required' }, 403);
    }

    // --- Dispatch ---
    const body = await req.json();
    const { action, params } = body as { action: string; params?: Record<string, unknown> };

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
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error('DHL shipping error:', err);
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
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

    // 200 or 401/403 tells us connection status
    if (resp.ok || resp.status === 200) {
      return json({ success: true });
    }

    // DHL may return 401 for bad credentials
    if (resp.status === 401 || resp.status === 403) {
      return json({ success: false, error: 'Authentication failed — check credentials' });
    }

    // Other status — still connected but maybe not the right endpoint
    // For sandbox, method not allowed is also acceptable (means auth passed)
    if (resp.status === 405) {
      return json({ success: true });
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

  // 3. Validate
  if (!shipment.total_weight_grams || shipment.total_weight_grams <= 0) {
    return json({ error: 'Weight is required for DHL label creation' }, 400);
  }
  if (!shipment.shipping_street || !shipment.shipping_postal_code || !shipment.shipping_city) {
    return json({ error: 'Complete shipping address is required' }, 400);
  }

  // 4. Build DHL order request
  const product = (params.product as string) || settings.defaultProduct || 'V01PAK';
  const labelFormat = settings.labelFormat || 'PDF_A4';
  const weightKg = shipment.total_weight_grams / 1000;

  const dhlOrder = {
    profile: 'STANDARD_GRUPPENPROFIL',
    shipments: [
      {
        product,
        billingNumber: settings.billingNumber,
        refNo: shipment.shipment_number,
        shipper: {
          name1: settings.shipper.name1,
          name2: settings.shipper.name2 || undefined,
          addressStreet: settings.shipper.addressStreet,
          postalCode: settings.shipper.postalCode,
          city: settings.shipper.city,
          country: { countryISOCode: settings.shipper.country || 'DEU' },
          email: settings.shipper.email || undefined,
          phone: settings.shipper.phone || undefined,
        },
        consignee: {
          name1: shipment.recipient_company || shipment.recipient_name,
          name2: shipment.recipient_company ? shipment.recipient_name : undefined,
          addressStreet: shipment.shipping_street,
          postalCode: shipment.shipping_postal_code,
          city: shipment.shipping_city,
          country: { countryISOCode: mapCountryToISO3(shipment.shipping_country) },
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
    const errMsg = respBody?.items?.[0]?.validationMessages?.[0]?.validationMessage
      || respBody?.detail
      || respBody?.title
      || `DHL API error ${resp.status}`;
    return json({ error: errMsg }, resp.status >= 500 ? 502 : 400);
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

  // 3. Cancel at DHL
  const baseUrl = getDHLBaseUrl(settings);
  const headers = getDHLHeaders(settings);

  const resp = await fetch(`${baseUrl}/orders/${dhlShipmentNumber}`, {
    method: 'DELETE',
    headers,
  });

  // DHL returns 200 on success, 400 if already cancelled/shipped
  if (!resp.ok && resp.status !== 200) {
    const respBody = await resp.text();
    // If already cancelled or shipment not found, we still clean up locally
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
/*  Country code mapping helper                                                */
/* -------------------------------------------------------------------------- */

function mapCountryToISO3(country: string): string {
  if (!country) return 'DEU';
  // Already ISO-3
  if (country.length === 3) return country.toUpperCase();
  // Common ISO-2 to ISO-3 mappings
  const map: Record<string, string> = {
    DE: 'DEU', AT: 'AUT', CH: 'CHE', FR: 'FRA', IT: 'ITA',
    ES: 'ESP', NL: 'NLD', BE: 'BEL', PL: 'POL', CZ: 'CZE',
    GB: 'GBR', US: 'USA', SE: 'SWE', DK: 'DNK', NO: 'NOR',
    FI: 'FIN', PT: 'PRT', IE: 'IRL', LU: 'LUX', HU: 'HUN',
    RO: 'ROU', BG: 'BGR', HR: 'HRV', SK: 'SVK', SI: 'SVN',
    LT: 'LTU', LV: 'LVA', EE: 'EST', GR: 'GRC', MT: 'MLT',
    CY: 'CYP',
  };
  return map[country.toUpperCase()] || country.toUpperCase();
}
