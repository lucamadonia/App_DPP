/**
 * Address Validation — Edge Function
 *
 * Proxies Google Places Autocomplete (v1) + Google Address Validation API.
 * Keeps the API key server-side and behind JWT auth so it can't be skimmed
 * from the browser bundle.
 *
 * Actions:
 *   autocomplete  → POST https://places.googleapis.com/v1/places:autocomplete
 *   place_details → GET  https://places.googleapis.com/v1/places/{placeId}
 *   validate      → POST https://addressvalidation.googleapis.com/v1:validateAddress
 *
 * Required Supabase secret: GOOGLE_MAPS_API_KEY
 * If absent, all actions return { enabled: false } so the frontend can
 * gracefully fall back to plain inputs.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GOOGLE_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY') || '';

const PLACES_HOST = 'https://places.googleapis.com';
const VALIDATION_HOST = 'https://addressvalidation.googleapis.com';

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
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { action, params } = body as { action: string; params?: Record<string, unknown> };

    // Capability probe — used by the frontend to decide whether to render the
    // Google-powered input or the plain one. No auth needed.
    if (action === 'capability') {
      return json({ enabled: !!GOOGLE_KEY });
    }

    if (!GOOGLE_KEY) {
      // Always non-fatal: frontend renders plain inputs.
      return json({ enabled: false, results: [] });
    }

    // --- JWT auth ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Server misconfigured' }, 500);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData?.user) return json({ error: 'Auth failed' }, 401);

    switch (action) {
      case 'autocomplete':
        return await handleAutocomplete(params);
      case 'place_details':
        return await handlePlaceDetails(params);
      case 'validate':
        return await handleValidate(params);
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error('[address-validation] error:', err);
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});

// -----------------------------------------------------------------------------
// Action: autocomplete
// -----------------------------------------------------------------------------
async function handleAutocomplete(params?: Record<string, unknown>) {
  const input = (params?.input as string) || '';
  if (input.trim().length < 2) return json({ enabled: true, suggestions: [] });

  const country = (params?.country as string) || '';
  const sessionToken = (params?.sessionToken as string) || '';

  const reqBody: Record<string, unknown> = {
    input,
    includedPrimaryTypes: ['street_address', 'route', 'premise', 'subpremise'],
    languageCode: (params?.language as string) || 'de',
  };
  if (country && country.length === 2) {
    reqBody.includedRegionCodes = [country.toUpperCase()];
  }
  if (sessionToken) reqBody.sessionToken = sessionToken;

  const resp = await fetch(`${PLACES_HOST}/v1/places:autocomplete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY,
    },
    body: JSON.stringify(reqBody),
  });
  const data = await resp.json();
  if (!resp.ok) {
    return json({ enabled: true, suggestions: [], error: data?.error?.message || 'Autocomplete failed' });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suggestions = ((data?.suggestions as any[]) || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((s: any) => {
      const p = s?.placePrediction;
      if (!p) return null;
      return {
        placeId: p.placeId,
        text: p?.text?.text || '',
        mainText: p?.structuredFormat?.mainText?.text || '',
        secondaryText: p?.structuredFormat?.secondaryText?.text || '',
      };
    })
    .filter(Boolean);

  return json({ enabled: true, suggestions });
}

// -----------------------------------------------------------------------------
// Action: place_details
// -----------------------------------------------------------------------------
async function handlePlaceDetails(params?: Record<string, unknown>) {
  const placeId = params?.placeId as string;
  if (!placeId) return json({ error: 'Missing placeId' }, 400);
  const sessionToken = (params?.sessionToken as string) || '';

  const fields = 'id,formattedAddress,addressComponents,location';
  const url = `${PLACES_HOST}/v1/places/${encodeURIComponent(placeId)}${sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : ''}`;
  const resp = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_KEY,
      'X-Goog-FieldMask': fields,
    },
  });
  const data = await resp.json();
  if (!resp.ok) {
    return json({ error: data?.error?.message || 'Place details failed' }, 502);
  }

  return json({ enabled: true, place: extractAddress(data) });
}

// -----------------------------------------------------------------------------
// Action: validate
// -----------------------------------------------------------------------------
async function handleValidate(params?: Record<string, unknown>) {
  const addressLines = [(params?.street as string) || ''].filter(Boolean);
  const postalCode = (params?.postalCode as string) || '';
  const locality = (params?.city as string) || '';
  const regionCode = (params?.country as string) || '';

  if (!addressLines.length || !regionCode) {
    return json({ enabled: true, valid: false, messages: ['Missing required fields'] });
  }

  const resp = await fetch(`${VALIDATION_HOST}/v1:validateAddress?key=${encodeURIComponent(GOOGLE_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: {
        regionCode: regionCode.toUpperCase(),
        postalCode,
        locality,
        addressLines,
      },
      enableUspsCass: false,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    return json({ enabled: true, valid: false, messages: [data?.error?.message || 'Validation request failed'] }, 502);
  }

  const verdict = data?.result?.verdict || {};
  const validationGranularity = verdict.validationGranularity || 'OTHER';
  const addressComplete = !!verdict.addressComplete;
  const hasUnconfirmed = !!verdict.hasUnconfirmedComponents;
  const hasReplaced = !!verdict.hasReplacedComponents;

  const messages: string[] = [];
  // Pull human-readable reasoning from missing/unconfirmed components.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (data?.result?.address?.addressComponents || []) as any[]) {
    if (c?.confirmationLevel === 'UNCONFIRMED_BUT_PLAUSIBLE') {
      messages.push(`Unbestätigt: ${c.componentType} "${c?.componentName?.text || ''}"`);
    }
    if (c?.confirmationLevel === 'UNCONFIRMED_AND_SUSPICIOUS') {
      messages.push(`Verdächtig: ${c.componentType} "${c?.componentName?.text || ''}"`);
    }
  }
  if (!addressComplete) messages.unshift('Adresse ist unvollständig.');

  const valid = addressComplete && !hasUnconfirmed && validationGranularity !== 'OTHER';

  return json({
    enabled: true,
    valid,
    granularity: validationGranularity,
    addressComplete,
    hasUnconfirmedComponents: hasUnconfirmed,
    hasReplacedComponents: hasReplaced,
    formattedAddress: data?.result?.address?.formattedAddress || '',
    normalized: extractAddressFromValidation(data?.result?.address),
    messages,
  });
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAddress(place: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comps = (place?.addressComponents || []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const find = (type: string) => comps.find((c: any) => (c.types || []).includes(type));
  const route = find('route');
  const streetNumber = find('street_number');
  const street = [route?.shortText || '', streetNumber?.shortText || ''].filter(Boolean).join(' ').trim();

  return {
    placeId: place?.id || '',
    formattedAddress: place?.formattedAddress || '',
    street,
    city: find('locality')?.shortText || find('postal_town')?.shortText || '',
    postalCode: find('postal_code')?.shortText || '',
    country: find('country')?.shortText || '',
    lat: place?.location?.latitude,
    lng: place?.location?.longitude,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAddressFromValidation(addr: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const find = (type: string) => (addr?.addressComponents || []).find((c: any) => c.componentType === type);
  const route = find('route');
  const number = find('street_number');
  const street = [route?.componentName?.text || '', number?.componentName?.text || '']
    .filter(Boolean)
    .join(' ')
    .trim();
  return {
    street,
    city: find('locality')?.componentName?.text || find('postal_town')?.componentName?.text || '',
    postalCode: find('postal_code')?.componentName?.text || '',
    country: find('country')?.componentName?.text || addr?.regionCode || '',
    formattedAddress: addr?.formattedAddress || '',
  };
}
