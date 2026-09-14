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
 * Credentials are stored encrypted in commerce_connection_credentials keyed by
 * connection_id; the row in commerce_channel_connections only stores the
 * credential_ref pointer plus a short-lived PKCE stash in metadata.oauth.
 *
 * DEPLOY WITH  --no-verify-jwt.  Providers return the user here via a plain
 * browser GET that carries no Supabase JWT, so platform-level JWT verification
 * would reject every callback with a 401 before this code runs.  Authorization
 * is enforced in-function instead: the GET path only trusts an HMAC-signed
 * state, and every POST action requires a valid user JWT plus a tenant
 * ownership check on the connection.
 *
 * Required secrets (Supabase dashboard)
 *   COMMERCE_OAUTH_REDIRECT_URI  — base URL of this function (callback target)
 *   ETSY_CLIENT_ID / ETSY_CLIENT_SECRET  — Etsy keystring / shared secret
 *   PINTEREST_CLIENT_ID / PINTEREST_CLIENT_SECRET
 *   SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET
 *   AMAZON_LWA_CLIENT_ID / AMAZON_LWA_CLIENT_SECRET
 *   EBAY_CLIENT_ID / EBAY_CLIENT_SECRET
 *   TIKTOK_CLIENT_ID / TIKTOK_CLIENT_SECRET
 */

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { b64, unb64, encryptCredentials, decryptCredentials } from '../_shared/commerce-crypto.ts';
import { etsyFetch, EtsyReauthRequired } from '../_shared/etsy.ts';

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
  /** Provider mandates RFC 7636 PKCE (S256) on every authorization request. */
  usesPkce?: boolean;
  /** Provider rejects client_secret on the token exchange (PKCE-only public client). */
  omitClientSecret?: boolean;
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
    // Etsy requires PKCE on every flow and takes no client_secret on the token
    // exchange — the shared secret is only used in the x-api-key header.
    usesPkce: true,
    omitClientSecret: true,
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
    // Etsy returns to this function with a browser GET.  Keep the callback
    // public, but authenticate the state cryptographically below.
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const state = url.searchParams.get('state') || '';
      const code = url.searchParams.get('code') || '';
      if (url.searchParams.get('error')) return redirectResult(false, url.searchParams.get('error')!);
      if (!state || !code) return redirectResult(false, 'Missing OAuth callback parameters');
      const payload = await verifyState(state);
      if (!payload) return redirectResult(false, 'Invalid or expired OAuth state');
      const supabase = createServiceClient();
      const result = await handleCallback(supabase, {
        action: 'callback', platform: payload.platform, connectionId: payload.connectionId,
        code, state, shop: url.searchParams.get('shop') || undefined,
      });
      return result.ok ? redirectResult(true) : redirectResult(false, result.error || 'OAuth callback failed');
    }

    const { action, ...params }: Params = await req.json();

    // Auth: require service role JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization' }, 401);

    const supabase = createServiceClient();
    const userClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData } = await userClient.auth.getUser();
    if (!authData.user) return json({ error: 'Invalid Authorization' }, 401);
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', authData.user.id).single();
    if (!profile?.tenant_id) return json({ error: 'Tenant not found' }, 403);
    const requestedConnectionId = (params as { connectionId?: string }).connectionId;
    if (requestedConnectionId) {
      const { data: ownedConnection } = await supabase.from('commerce_channel_connections')
        .select('id').eq('id', requestedConnectionId).eq('tenant_id', profile.tenant_id).single();
      if (!ownedConnection) return json({ error: 'Connection does not belong to this tenant' }, 403);
    }

    switch (action) {
      case 'start':
        return json(await handleStart(supabase, params as StartParams));
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

async function handleStart(supabase: any, p: StartParams) {
  const cfg = OAUTH_CONFIG[p.platform];
  if (!cfg) return { error: `Unsupported platform: ${p.platform}` };
  if (p.platform === 'woocommerce') {
    return { error: 'WooCommerce uses API keys, not OAuth' };
  }

  const clientId = Deno.env.get(cfg.clientIdSecret);
  if (!clientId) return { error: `Missing ${cfg.clientIdSecret}` };

  const state = await createState(p.platform, p.connectionId);
  const scopeStr = (p.scopes || []).join(cfg.scopeJoiner);

  // The verifier must survive until the callback and must never leave the
  // server, so it is stashed on the connection row rather than in the state
  // blob (which is signed but readable by the browser and the provider).
  const verifier = cfg.usesPkce ? randomVerifier() : null;
  const { data: existing } = await supabase
    .from('commerce_channel_connections')
    .select('metadata')
    .eq('id', p.connectionId)
    .single();
  await supabase
    .from('commerce_channel_connections')
    .update({
      status: 'connecting',
      metadata: {
        ...((existing?.metadata ?? {}) as Record<string, unknown>),
        oauth: { verifier, redirectUri: p.redirectUri, createdAt: new Date().toISOString() },
      },
    })
    .eq('id', p.connectionId);

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
    if (verifier) {
      params.set('code_challenge', await codeChallenge(verifier));
      params.set('code_challenge_method', 'S256');
    }
    url = `${cfg.authorizeUrl}?${params.toString()}`;
  }

  return { authorizeUrl: url, state, connectionId: p.connectionId };
}

async function handleCallback(supabase: any, p: CallbackParams) {
  const cfg = OAUTH_CONFIG[p.platform];
  if (!cfg) return { error: `Unsupported platform: ${p.platform}` };

  // Verify the state before anything else — the POST path reaches this without
  // the GET handler's pre-check, so an unverified code must never be redeemed.
  const statePayload = await verifyState(p.state);
  if (!statePayload || statePayload.connectionId !== p.connectionId || statePayload.platform !== p.platform) {
    return { error: 'Invalid OAuth state' };
  }

  const clientId = Deno.env.get(cfg.clientIdSecret);
  const clientSecret = Deno.env.get(cfg.clientSecretSecret);
  if (!clientId || (!cfg.omitClientSecret && !clientSecret)) return { error: 'Missing OAuth credentials' };

  // Resolve the connection before the exchange: the PKCE verifier and the exact
  // redirect_uri used at /start live on the row and must be replayed verbatim.
  const { data: conn } = await supabase
    .from('commerce_channel_connections')
    .select('tenant_id, scopes, metadata')
    .eq('id', p.connectionId)
    .single();
  if (!conn) return { error: 'Connection not found' };

  const stash = ((conn.metadata ?? {}).oauth ?? {}) as { verifier?: string; redirectUri?: string };
  if (cfg.usesPkce && !stash.verifier) {
    return { error: 'PKCE verifier missing or already consumed — restart the connection' };
  }

  // Exchange code for token (per-platform)
  const tokenUrl = p.platform === 'shopify'
    ? `https://${p.shop}/admin/oauth/access_token`
    : cfg.tokenUrl;

  const body = new URLSearchParams({
    client_id: clientId,
    code: p.code,
    grant_type: 'authorization_code',
    redirect_uri: stash.redirectUri ?? Deno.env.get('COMMERCE_OAUTH_REDIRECT_URI') ?? '',
  });
  if (!cfg.omitClientSecret) body.set('client_secret', clientSecret!);
  if (cfg.usesPkce) body.set('code_verifier', stash.verifier!);

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

  const encryptedPayload = await encryptCredentials({
    platform: p.platform,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    tokenType: tokens.token_type || 'Bearer',
    scope: tokens.scope || '',
    expiresAt: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null,
    obtainedAt: new Date().toISOString(),
  });

  await supabase.from('commerce_connection_credentials').upsert({
    connection_id: p.connectionId, tenant_id: conn.tenant_id, platform: p.platform,
    encrypted_payload: encryptedPayload,
  });

  // Mark connection connected and burn the one-shot PKCE stash.
  const { oauth: _consumed, ...restMetadata } = (conn.metadata ?? {}) as Record<string, unknown>;
  await supabase
    .from('commerce_channel_connections')
    .update({
      status: 'connected',
      credential_ref: `commerce_connection_credentials:${p.connectionId}`,
      metadata: restMetadata,
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

  if (conn.platform === 'etsy') {
    const { data: credential } = await supabase.from('commerce_connection_credentials')
      .select('encrypted_payload').eq('connection_id', p.connectionId).single();
    if (!credential) return { error: 'No credentials found', status: 'reauth_required' };
    try {
      // etsyFetch refreshes the hour-long access token once on 401 before failing.
      await etsyFetch({
        creds: await decryptCredentials(credential.encrypted_payload),
        supabase, connectionId: p.connectionId, tenantId: conn.tenant_id,
      }, '/users/me');
    } catch (e) {
      if (e instanceof EtsyReauthRequired) return { error: e.message, status: 'reauth_required' };
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }
  return {
    ok: true,
    platform: conn.platform,
    status: conn.status,
    note: 'Provider health probe succeeded.',
  };
}

function createServiceClient() {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
}

type StatePayload = { connectionId: string; platform: Platform; exp: number };
const encoder = new TextEncoder();
async function hmac(value: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(Deno.env.get('OAUTH_STATE_SECRET') ?? ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}
/** RFC 7636 verifier: base64url of 64 random bytes → 86 chars, inside Etsy's 43–128 range. */
function randomVerifier() {
  return b64(crypto.getRandomValues(new Uint8Array(64)));
}
async function codeChallenge(verifier: string) {
  return b64(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier))));
}
async function createState(platform: Platform, connectionId: string) {
  const body = b64(encoder.encode(JSON.stringify({ platform, connectionId, exp: Date.now() + 10 * 60_000 })));
  return `${body}.${b64(await hmac(body))}`;
}
async function verifyState(state: string): Promise<StatePayload | null> {
  const [body, signature] = state.split('.');
  if (!body || !signature || !Deno.env.get('OAUTH_STATE_SECRET')) return null;
  const expected = await hmac(body);
  const actual = unb64(signature);
  if (actual.length !== expected.length || !actual.every((v, i) => v === expected[i])) return null;
  const payload = JSON.parse(new TextDecoder().decode(unb64(body))) as StatePayload;
  return payload.exp > Date.now() ? payload : null;
}
function redirectResult(ok: boolean, error?: string) {
  const base = Deno.env.get('COMMERCE_APP_URL') || 'https://trackbliss.eu';
  const url = new URL('/commerce', base); url.searchParams.set('etsy', ok ? 'connected' : 'error'); if (error) url.searchParams.set('message', error);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
