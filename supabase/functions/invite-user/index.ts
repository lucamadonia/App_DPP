/**
 * Supabase Edge Function: invite-user
 *
 * Creates a Supabase Auth user via admin API and sends the invitation email.
 * Called from the frontend after an invitation record is inserted into the DB.
 *
 * Deployment:
 *   supabase functions deploy invite-user --no-verify-jwt
 *
 * Required Supabase Secrets:
 *   - SUPABASE_URL (automatic)
 *   - SUPABASE_SERVICE_ROLE_KEY (automatic)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Missing authorization header' }, 401);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the caller's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return jsonResponse({ success: false, error: 'Invalid auth token' }, 401);
    }

    // Get caller's profile — must be admin
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', caller.id)
      .single();

    if (!callerProfile?.tenant_id || callerProfile.role !== 'admin') {
      return jsonResponse({ success: false, error: 'Unauthorized: admin role required' }, 403);
    }

    const { email, role, name } = await req.json();

    if (!email) {
      return jsonResponse({ success: false, error: 'Missing email' }, 400);
    }

    const tenantId = callerProfile.tenant_id;
    const inviteRole = role || 'viewer';
    const inviteName = name || email;

    // Check if user already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // User already has an auth account — check if they already belong to this tenant
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, tenant_id')
        .eq('id', existingUser.id)
        .single();

      if (existingProfile?.tenant_id === tenantId) {
        return jsonResponse({
          success: true,
          emailSent: false,
          userAlreadyExists: true,
          message: 'User is already a member of this tenant',
        });
      }

      // User exists but in a different tenant — create profile in this tenant
      // (Multi-tenant: user gets added to the new tenant)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: existingUser.id,
          tenant_id: tenantId,
          email: email,
          name: inviteName,
          role: inviteRole,
        }, { onConflict: 'id' });

      if (profileError) {
        return jsonResponse({
          success: false,
          error: `Failed to create profile: ${profileError.message}`,
        }, 500);
      }

      // Mark invitation as accepted
      await supabaseAdmin
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('email', email)
        .eq('tenant_id', tenantId)
        .eq('status', 'pending');

      return jsonResponse({
        success: true,
        emailSent: false,
        userAlreadyExists: true,
        message: 'Existing user added to tenant directly',
      });
    }

    // User does not exist — send invitation via Supabase Auth admin API
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        tenant_id: tenantId,
        role: inviteRole,
        full_name: inviteName,
      },
    });

    if (inviteError) {
      return jsonResponse({
        success: false,
        error: `Failed to send invitation: ${inviteError.message}`,
      }, 500);
    }

    return jsonResponse({
      success: true,
      emailSent: true,
      userAlreadyExists: false,
    });

  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 500);
  }
});
