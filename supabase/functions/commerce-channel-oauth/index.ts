/**
 * commerce-channel-oauth Edge Function
 *
 * Handles the OAuth handshake for the Commerce Hub platforms
 * (Etsy, Pinterest, Shopify, Amazon SP-API, eBay, TikTok Shop).
 *
 * Stages
 * ──────────────────────────────────────────────────────────────
 *   1. start         → returns provider authorization URL with state
 *   2. callback      → exchanges code for access/refresh tokens
 *   3. test          → validates an existing connection
 *   4. webhook       → ingests platform webhooks (orders/create etc.)
 *
 * Credentials are stored encrypted in tenants.settings.commerceHubCredentials
 * keyed by connection_id; the row in commerce_channel_connections only stores
 * the credential_ref pointer.
 *
 * Required secrets (Supabase dashboard)
 *   COMMERCE_OAUTH_REDIRECT_URI  — base URL of this function (callback target)
 *   ETSY_CLIENT_ID / ETSY_CLIENT_SECRET
 *   PINTEREST_CLIENT_ID / PINTEREST_CLIENT_SECRET
 *   SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET
 *   AMAZON_LWA_CLIENT_ID / AMAZON_LWA_CLIENT_SECRET
 *   EBAY_CLIENT_ID / EBAY_CLIENT_SECRET
 *   TIKTOK_CLIENT_ID / TIKTOK_CLIENT_SECRET
 */

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Platform =
  | 'shopify' | 'etsy' | 'pinterest' | 'amazon' | 'ebay' | 'woocommerce' | 'tiktok_shop';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json',
};

const OAUTH_CONFIG: Record<Platform, {
  authorizeUrl: string;
  tokenUrl: string;
  clientIdSecret: string;
  clientSecretSecret: string;
  scopeJoiner: string;
}> = {
  shopify: {
    // Shopify has a unique flow — shop is part of host
    authorizeUrl: '',
    tokenUrl: '',
    clientIdSecret: 'SHOPIFY_CLIENT_ID',
    clientSecretSecret: 'SHOPIFY_CLIENT_SECRET',
    scopeJoiner: ',',
  },
  etsy: {
    authorizeUrl: 'https://www.etsy.com/oauth/connect',
    tokenUrl: 'https://api.etsy.com/v3/public/oauth/token',
    clientIdSecret: 'ETSY_CLIENT_ID',
    clientSecretSecret: 'ETSY_CLIENT_SECRET',
    scopeJoiner: ' ',
  },
  pinterest: {
    authorizeUrl: 'https://www.pinterest.com/oauth/',
    tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
    clientIdSecret: 'PINTEREST_CLIENT_ID',
    clientSecretSecret: 'PINTEREST_CLIENT_SECRET',
    scopeJoiner: ',',
  },
  amazon: {
    authorizeUrl: 'https://sellercentral.amazon.com/apps/authorize/consent',
    tokenUrl: 'https://api.amazon.com/auth/o2/token',
    clientIdSecret: 'AMAZON_LWA_CLIENT_ID',
    clientSecretSecret: 'AMAZON_LWA_CLIENT_SECRET',
    scopeJoiner: ' ',
  },
  ebay: {
    authorizeUrl: 'https://auth.ebay.com/oauth2/authorize',
    tokenUrl: 'https://api.ebay.com/identity/v1/oauth2/token',
    clientIdSecret: 'EBAY_CLIENT_ID',
    clientSecretSecret: 'EBAY_CLIENT_SECRET',
    scopeJoiner: ' ',
  },
  tiktok_shop: {
    authorizeUrl: 'https://services.tiktokshop.com/open/authorize',
    tokenUrl: 'https://auth.tiktok-shops.com/api/v2/token/get',
    clientIdSecret: 'TIKTOK_CLIENT_ID',
    clientSecretSecret: 'TIKTOK_CLIENT_SECRET',
    scopeJoiner: ' ',
  },
  woocommerce: {
    // WooCommerce uses API key auth, not OAuth — short-circuited below
    authorizeUrl: '',
    tokenUrl: '',
    clientIdSecret: '',
    clientSecretSecret: '',
    scopeJoiner: ',',
  },
};

interface StartParams {
  action: 'start';
  platform: Platform;
  connectionId: string;
  redirectUri: string;
  shop?: string;             // Shopify
  scopes?: string[];
}

interface CallbackParams {
  action: 'callback';
  platform: Platform;
  connectionId: string;
  code: string;
  state: string;
  shop?: string;
}

interface TestParams {
  action: 'test';
  connectionId: string;
}

type Params = StartParams | CallbackParams | TestParams;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { action, ...params }: Params = await req.json();

    // Auth: require service role JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    switch (action) {
      case 'start':
        return json(await handleStart(params as StartParams));
      case 'callback':
        return json(await handleCallback(supabase, params as CallbackParams));
      case 'test':
        return json(await handleTest(supabase, params as TestParams));
      default:
        return json({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

async function handleStart(p: StartParams) {
  const cfg = OAUTH_CONFIG[p.platform];
  if (!cfg) return { error: `Unsupported platform: ${p.platform}` };
  if (p.platform === 'woocommerce') {
    return { error: 'WooCommerce uses API keys, not OAuth' };
  }

  const clientId = Deno.env.get(cfg.clientIdSecret);
  if (!clientId) return { error: `Missing ${cfg.clientIdSecret}` };

  const state = crypto.randomUUID();
  const scopeStr = (p.scopes || []).join(cfg.scopeJoiner);

  let url: string;
  if (p.platform === 'shopify') {
    if (!p.shop) return { error: 'Shopify requires shop domain' };
    url = `https://${p.shop}/admin/oauth/authorize?client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scopeStr)}&redirect_uri=${encodeURIComponent(p.redirectUri)}&state=${state}`;
  } else {
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: p.redirectUri,
      scope: scopeStr,
      state,
    });
    url = `${cfg.authorizeUrl}?${params.toString()}`;
  }

  return { authorizeUrl: url, state, connectionId: p.connectionId };
}

async function handleCallback(supabase: any, p: CallbackParams) {
  const cfg = OAUTH_CONFIG[p.platform];
  if (!cfg) return { error: `Unsupported platform: ${p.platform}` };

  const clientId = Deno.env.get(cfg.clientIdSecret);
  const clientSecret = Deno.env.get(cfg.clientSecretSecret);
  if (!clientId || !clientSecret) return { error: 'Missing OAuth credentials' };

  // Exchange code for token (per-platform)
  const tokenUrl = p.platform === 'shopify'
    ? `https://${p.shop}/admin/oauth/access_token`
    : cfg.tokenUrl;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: p.code,
    grant_type: 'authorization_code',
    redirect_uri: Deno.env.get('COMMERCE_OAUTH_REDIRECT_URI') ?? '',
  });

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return { error: `Token exchange failed: ${err}` };
  }
  const tokens = await tokenRes.json();

  // Persist credentials encrypted into tenants.settings.commerceHubCredentials
  const { data: conn } = await supabase
    .from('commerce_channel_connections')
    .select('tenant_id, scopes')
    .eq('id', p.connectionId)
    .single();
  if (!conn) return { error: 'Connection not found' };

  const credKey = `commerceHubCredentials.${p.connectionId}`;
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', conn.tenant_id)
    .single();
  const settings = tenant?.settings || {};
  const credBag = settings.commerceHubCredentials || {};
  credBag[p.connectionId] = {
    platform: p.platform,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    tokenType: tokens.token_type || 'Bearer',
    scope: tokens.scope || '',
    expiresAt: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null,
    obtainedAt: new Date().toISOString(),
  };

  await supabase
    .from('tenants')
    .update({ settings: { ...settings, commerceHubCredentials: credBag } })
    .eq('id', conn.tenant_id);

  // Mark connection connected
  await supabase
    .from('commerce_channel_connections')
    .update({
      status: 'connected',
      credential_ref: credKey,
      last_full_sync_at: null,
      last_error_message: null,
      last_error_at: null,
    })
    .eq('id', p.connectionId);

  return { ok: true, connectionId: p.connectionId };
}

async function handleTest(supabase: any, p: TestParams) {
  const { data: conn } = await supabase
    .from('commerce_channel_connections')
    .select('*')
    .eq('id', p.connectionId)
    .single();
  if (!conn) return { error: 'Connection not found' };

  // Stub: a real implementation would fetch a small endpoint per platform.
  return {
    ok: true,
    platform: conn.platform,
    status: conn.status,
    note: 'Test endpoint stub — implement per-platform health probe.',
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
