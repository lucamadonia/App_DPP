/**
 * Supabase Edge Function: delete-account
 *
 * ############################################################################
 * ##  NOT DEPLOYED. DO NOT DEPLOY WITHOUT COMPLETING THE CHECKLIST BELOW.   ##
 * ############################################################################
 *
 * This function permanently and irreversibly deletes the calling user's auth
 * account. It was written to satisfy Apple App Store guideline 5.1.1(v)
 * (in-app account deletion) and has never been executed against any database.
 *
 * MUST BE VERIFIED BY A HUMAN BEFORE `supabase functions deploy delete-account`:
 *
 *   1. Run it against a staging project first, with a throwaway tenant user
 *      and a throwaway customer account. Confirm both paths end with the auth
 *      user gone and nothing else in the tenant touched. Also test the
 *      half-deleted case (delete a profile row by hand, leave the auth user,
 *      then call this) — it must succeed via "Case 3" rather than 404.
 *
 *   2. Confirm the FK cascades assumed here still hold:
 *        - profiles.id                -> auth.users(id) ON DELETE CASCADE
 *        - rh_customer_profiles.id    -> auth.users(id) ON DELETE CASCADE
 *      This function deletes those rows explicitly first, so a missing cascade
 *      is not fatal, but a cascade onto anything *else* keyed on auth.users
 *      would silently widen the blast radius. Enumerate every FK referencing
 *      auth.users before deploying.
 *
 *   3. Confirm the customer anonymisation below is legally correct for your
 *      retention obligations (DE: §147 AO / §257 HGB, 6-10 years for
 *      commercial records). The current behaviour keeps rh_returns and
 *      rh_tickets intact and scrubs the PII on the rh_customers row they point
 *      at. A lawyer, not this function, decides whether that is sufficient.
 *
 *   4. Confirm the unique constraint on rh_customers tolerates the tombstone
 *      email format `deleted+<uuid>@deleted.invalid`. If (tenant_id, email) is
 *      unique this is fine — the uuid makes it unique per customer.
 *
 *   5. Decide whether deletion should be logged. Nothing is written to
 *      activity_log here, because an audit row naming the deleted user would
 *      re-introduce the PII that was just removed. If an audit trail is
 *      required, log the tenant + timestamp only.
 *
 *   6. Deploy WITH JWT verification (i.e. NOT `--no-verify-jwt`):
 *        supabase functions deploy delete-account
 *
 * Required Supabase Secrets (both provided automatically):
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Security model:
 *   The target account is derived exclusively from the verified JWT. The
 *   request body carries only `confirmEmail`, which is compared against the
 *   JWT's email. No user id, tenant id, or account type is ever read from the
 *   body, so a caller cannot address anyone but themselves.
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Missing authorization header' }, 401);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // The ONLY source of the target identity.
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ success: false, error: 'Invalid auth token' }, 401);
    }

    // Re-check the typed confirmation server-side. The body is trusted for
    // nothing else.
    let confirmEmail = '';
    try {
      const body = await req.json();
      confirmEmail = typeof body?.confirmEmail === 'string' ? body.confirmEmail : '';
    } catch {
      // Empty/invalid body -> confirmEmail stays '' and fails the check below.
    }

    const sessionEmail = (user.email || '').trim().toLowerCase();
    if (!sessionEmail || confirmEmail.trim().toLowerCase() !== sessionEmail) {
      return jsonResponse({ success: false, error: 'email_mismatch' }, 400);
    }

    // ---------------------------------------------------------------------
    // Case 1 — tenant user (profiles)
    // ---------------------------------------------------------------------
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, tenant_id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      if (profile.role === 'admin') {
        // Refuse to orphan a tenant. Counted server-side so a patched client
        // cannot skip the check.
        const { data: admins, error: adminError } = await supabaseAdmin
          .from('profiles')
          .select('id, status')
          .eq('tenant_id', profile.tenant_id)
          .eq('role', 'admin');

        if (adminError) {
          return jsonResponse({ success: false, error: 'admin_check_failed' }, 500);
        }

        // `status` was added by a later migration; treat a missing value as active.
        const activeAdmins = (admins || []).filter(
          (row: { status?: string | null }) => (row.status ?? 'active') !== 'inactive'
        ).length;

        if (activeAdmins <= 1) {
          return jsonResponse({ success: false, error: 'last_admin' }, 409);
        }
      }

      // Tenant-owned data (products, passports, documents, returns) is NOT
      // touched: it belongs to the organisation, not to this user.
      const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileDeleteError) {
        return jsonResponse({ success: false, error: profileDeleteError.message }, 500);
      }

      const { error: userDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (userDeleteError) {
        return jsonResponse({ success: false, error: userDeleteError.message }, 500);
      }

      return jsonResponse({ success: true, accountType: 'admin' });
    }

    // ---------------------------------------------------------------------
    // Case 2 — portal customer (rh_customer_profiles)
    // ---------------------------------------------------------------------
    const { data: customerProfile } = await supabaseAdmin
      .from('rh_customer_profiles')
      .select('id, customer_id, tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (customerProfile) {
      // Returns/refunds/invoices are commercial records under statutory
      // retention, so the rh_customers row is anonymised in place rather than
      // deleted — rh_returns.customer_id keeps pointing at a row with no PII.
      const { error: anonError } = await supabaseAdmin
        .from('rh_customers')
        .update({
          email: `deleted+${customerProfile.customer_id}@deleted.invalid`,
          external_id: null,
          first_name: null,
          last_name: null,
          phone: null,
          company: null,
          addresses: [],
          payment_methods: [],
          notes: null,
          tags: [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerProfile.customer_id)
        .eq('tenant_id', customerProfile.tenant_id);

      if (anonError) {
        return jsonResponse({ success: false, error: anonError.message }, 500);
      }

      const { error: portalProfileError } = await supabaseAdmin
        .from('rh_customer_profiles')
        .delete()
        .eq('id', user.id);

      if (portalProfileError) {
        return jsonResponse({ success: false, error: portalProfileError.message }, 500);
      }

      const { error: userDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (userDeleteError) {
        return jsonResponse({ success: false, error: userDeleteError.message }, 500);
      }

      return jsonResponse({ success: true, accountType: 'customer' });
    }

    // ---------------------------------------------------------------------
    // Case 3 — auth user with no profile row of either kind.
    //
    // DO NOT REMOVE THIS BRANCH. It is not a hole in the authorisation model;
    // it is what makes deletion recoverable.
    //
    // The two branches above are sequential calls, not a transaction. If the
    // profile row is deleted and `auth.admin.deleteUser` then fails (network
    // blip, rate limit, GoTrue error), the account lands exactly here: a valid
    // auth user with nothing pointing at it. Without this branch a retry
    // returns 404 forever, the auth user can never be removed, and the person
    // can still sign in to a broken shell — strictly worse than finishing the
    // job.
    //
    // The authorisation on this path is identical to the main paths: a
    // server-verified JWT plus a `confirmEmail` matching that JWT's own email
    // claim, both checked above. Nothing here is derived from a
    // caller-supplied identifier — it can only ever delete the caller. This is
    // completing a deletion the caller already authorised and that already
    // partially executed.
    //
    // Deliberately NOT solved by deleting the auth user first and relying on
    // ON DELETE CASCADE: only two of the FKs onto auth.users have been
    // verified, and that ordering would fire every unverified cascade first.
    // ---------------------------------------------------------------------
    const { error: orphanDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (orphanDeleteError) {
      return jsonResponse({ success: false, error: orphanDeleteError.message }, 500);
    }

    return jsonResponse({ success: true, accountType: 'orphaned' });
  } catch (error) {
    console.error('delete-account error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return jsonResponse({ success: false, error: msg }, 500);
  }
});
