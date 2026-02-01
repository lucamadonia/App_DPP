/**
 * Supabase Edge Function: manage-vercel-domain
 *
 * Adds or removes custom domains from the Vercel project.
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

    if (!action || !domain) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing action or domain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      JSON.stringify({ success: false, error: 'Invalid action. Use "add" or "remove".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
