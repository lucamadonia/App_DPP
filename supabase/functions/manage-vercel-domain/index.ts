/**
 * Supabase Edge Function: manage-vercel-domain
 *
 * Adds or removes custom domains from the Vercel project, and verifies the
 * customer's CNAME record server-side (action "verify"), so the browser does
 * not need a DNS-over-HTTPS origin in its CSP and cannot fake the result.
 *
 * Deployment:
 *   supabase functions deploy manage-vercel-domain
 *
 * Required Supabase Secrets:
 *   - VERCEL_TOKEN
 *   - VERCEL_PROJECT_ID
 *   - VERCEL_TEAM_ID (optional)
 *   - SUPABASE_URL (automatic)
 *   - SUPABASE_SERVICE_ROLE_KEY (automatic)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VERCEL_TOKEN = Deno.env.get('VERCEL_TOKEN') || '';
const VERCEL_PROJECT_ID = Deno.env.get('VERCEL_PROJECT_ID') || '';
const VERCEL_TEAM_ID = Deno.env.get('VERCEL_TEAM_ID') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Must match CNAME_TARGET in src/lib/dns-providers.ts
const CNAME_TARGET = 'cname.vercel-dns.com';
const DOMAIN_RE = /^(?=.{1,253}$)(?!-)([a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/;

// DNS-over-HTTPS resolvers (JSON API), tried in order.
const DOH_RESOLVERS = [
  'https://dns.google/resolve',
  'https://cloudflare-dns.com/dns-query',
];

interface DnsJsonResponse {
  Status: number;
  Answer?: Array<{ name: string; type: number; TTL: number; data: string }>;
}

interface DNSVerificationResult {
  status: 'verified' | 'pending' | 'failed';
  cnameFound: boolean;
  cnameValue?: string;
  error?: string;
}

async function queryCname(domain: string): Promise<DnsJsonResponse> {
  let lastError: unknown = null;
  for (const resolver of DOH_RESOLVERS) {
    try {
      const resp = await fetch(
        `${resolver}?name=${encodeURIComponent(domain)}&type=CNAME`,
        { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(5000) },
      );
      if (!resp.ok) {
        lastError = new Error(`DNS lookup failed: HTTP ${resp.status}`);
        continue;
      }
      return await resp.json() as DnsJsonResponse;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('DNS lookup failed');
}

async function verifyCname(domain: string): Promise<DNSVerificationResult> {
  let data: DnsJsonResponse;
  try {
    data = await queryCname(domain);
  } catch (err) {
    return {
      status: 'failed',
      cnameFound: false,
      error: err instanceof Error ? err.message : 'DNS lookup failed',
    };
  }

  // Status 0 = NOERROR
  if (data.Status !== 0) {
    return {
      status: 'pending',
      cnameFound: false,
      error: 'No DNS records found. The record may not have propagated yet.',
    };
  }

  // CNAME records are type 5
  const cnameRecords = (data.Answer || []).filter((a) => a.type === 5);
  if (cnameRecords.length === 0) {
    return {
      status: 'pending',
      cnameFound: false,
      error: 'No CNAME record found. Please check your DNS configuration.',
    };
  }

  const strip = (v: string) => v.replace(/\.$/, '');
  const match = cnameRecords.find((r) => strip(r.data).toLowerCase() === CNAME_TARGET);
  if (match) {
    return { status: 'verified', cnameFound: true, cnameValue: strip(match.data) };
  }

  const actual = strip(cnameRecords[0].data);
  return {
    status: 'failed',
    cnameFound: true,
    cnameValue: actual,
    error: `CNAME record found but points to "${actual}" instead of "${CNAME_TARGET}".`,
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the user's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, domain } = await req.json();

    if (!action || !domain || typeof domain !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing action or domain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CNAME check: read-only DNS lookup, allowed before the domain is saved
    // (the setup wizard verifies first and stores the domain afterwards).
    if (action === 'verify') {
      const normalized = domain.trim().toLowerCase().replace(/\.$/, '');
      if (!DOMAIN_RE.test(normalized)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid domain' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const result = await verifyCname(normalized);
      return new Response(
        JSON.stringify({ success: true, result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the domain is stored in the tenant's settings
    const { data: tenant } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', profile.tenant_id)
      .single();

    const portalDomain = tenant?.settings?.returnsHub?.portalDomain;
    if (!portalDomain || portalDomain.customDomain !== domain) {
      return new Response(
        JSON.stringify({ success: false, error: 'Domain not found in tenant settings' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';

    if (action === 'add') {
      const resp = await fetch(
        `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${teamParam}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: domain }),
        }
      );

      const data = await resp.json();

      if (!resp.ok) {
        // Domain might already exist — that's fine
        if (data.error?.code === 'domain_already_in_use') {
          return new Response(
            JSON.stringify({ success: false, error: 'Domain already in use by another project' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ success: false, error: data.error?.message || 'Vercel API error' }),
          { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'remove') {
      const resp = await fetch(
        `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${domain}${teamParam}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
          },
        }
      );

      if (!resp.ok && resp.status !== 404) {
        const data = await resp.json();
        return new Response(
          JSON.stringify({ success: false, error: data.error?.message || 'Vercel API error' }),
          { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action. Use "add", "remove" or "verify".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
