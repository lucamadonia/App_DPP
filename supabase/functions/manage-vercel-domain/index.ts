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
import { checkTenantCustomDomain, normalizeCustomDomain, vercelDomainPath } from '../_shared/custom-domain.ts';

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
      // Persist the server-side result (RLS-4): clients can no longer set
      // domainStatus themselves. The RPC only touches this tenant's stored
      // portal domain and returns false for any other domain, so the wizard's
      // pre-save verify call stays harmless.
      const { data: persisted, error: persistError } = await supabase.rpc('set_portal_domain_status', {
        p_tenant_id: profile.tenant_id,
        p_domain: normalized,
        p_status: result.status,
      });
      if (persistError) {
        console.error('set_portal_domain_status failed:', persistError.message);
      }
      return new Response(
        JSON.stringify({ success: true, result, persisted: persisted === true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // add/remove act on the PRODUCTION Vercel project (re-audit EF-01):
    // strict hostname (no '/', '?', '#', '%', ...), never a platform host,
    // URL-encoded in every API path, and removal only of domains this
    // function itself added for this tenant (tenant_vercel_domains).
    const checked = checkTenantCustomDomain(domain);
    if (!checked.ok) {
      return new Response(
        JSON.stringify({ success: false, error: checked.error === 'platform_domain' ? 'Domain not allowed' : 'Invalid domain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const cleanDomain = checked.domain;

    if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
      return new Response(
        JSON.stringify({ success: false, error: 'Vercel API not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vercelUrl = (path: string) => {
      const url = new URL(`https://api.vercel.com${path}`);
      if (VERCEL_TEAM_ID) url.searchParams.set('teamId', VERCEL_TEAM_ID);
      return url.toString();
    };

    if (action === 'add') {
      // Paid add-on: Custom Domain / White-Label module.
      const { data: moduleRow } = await supabase
        .from('billing_module_subscriptions')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('module_id', 'custom_domain')
        .in('status', ['active', 'past_due'])
        .limit(1)
        .maybeSingle();
      if (!moduleRow) {
        return new Response(
          JSON.stringify({ success: false, error: 'Custom Domain module required' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Only the domain saved in this tenant's settings (the guard trigger
      // keeps it unique across tenants and rejects platform hosts).
      const { data: tenant } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', profile.tenant_id)
        .single();
      const stored = normalizeCustomDomain(tenant?.settings?.returnsHub?.portalDomain?.customDomain);
      if (stored !== cleanDomain) {
        return new Response(
          JSON.stringify({ success: false, error: 'Domain not found in tenant settings' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: owner } = await supabase
        .from('tenant_vercel_domains')
        .select('tenant_id')
        .eq('domain', cleanDomain)
        .maybeSingle();
      if (owner && owner.tenant_id !== profile.tenant_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Domain already in use' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (owner) {
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const resp = await fetch(
        vercelUrl(`/v10/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/domains`),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: cleanDomain }),
        }
      );

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        // Never record ownership for a domain we did not add ourselves
        // (409 = already on this or another project).
        if (resp.status === 409 || data.error?.code === 'domain_already_in_use') {
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

      const { error: recordError } = await supabase
        .from('tenant_vercel_domains')
        .insert({ domain: cleanDomain, tenant_id: profile.tenant_id, source: 'portal_domain' });
      if (recordError) {
        console.error('[manage-vercel-domain] could not record added domain:', recordError.message);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'remove') {
      const { data: owner } = await supabase
        .from('tenant_vercel_domains')
        .select('tenant_id')
        .eq('domain', cleanDomain)
        .maybeSingle();
      if (!owner || owner.tenant_id !== profile.tenant_id) {
        // Not added by this tenant through this function: nothing to remove.
        return new Response(
          JSON.stringify({ success: false, error: 'Domain was not added by this organisation' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const resp = await fetch(
        vercelUrl(vercelDomainPath(VERCEL_PROJECT_ID, cleanDomain, 'v9')),
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
          },
        }
      );

      if (!resp.ok && resp.status !== 404) {
        const data = await resp.json().catch(() => ({}));
        return new Response(
          JSON.stringify({ success: false, error: data.error?.message || 'Vercel API error' }),
          { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('tenant_vercel_domains')
        .delete()
        .eq('domain', cleanDomain)
        .eq('tenant_id', profile.tenant_id);

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
