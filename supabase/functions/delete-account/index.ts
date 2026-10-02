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
 *   7. Organisation deletion (last admin): on staging, delete a throwaway
 *      self-signup tenant that has a Stripe TEST subscription, files in each
 *      bucket and one portal customer. Confirm: subscription cancelled in
 *      Stripe, tenants row + all tenant rows gone, no objects left under
 *      {tenantId}/, portal login and own auth user gone. Also confirm every
 *      FK onto tenants(id) is ON DELETE CASCADE on the live schema
 *      (otherwise the tenant delete fails AFTER the subscription was already
 *      cancelled; no data is deleted in that case).
 *
 * Required Supabase Secrets (both provided automatically):
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Security model:
 *   The target account is derived exclusively from the verified JWT. The
 *   request body carries only `confirmEmail` (compared against the JWT's
 *   email) and, for the last admin of a tenant, `deleteOrganization: true` plus
 *   `confirmOrganizationName` (compared against the tenant's name from the
 *   DB). No user id, tenant id, or account type is ever read from the body,
 *   so a caller cannot address anyone but themselves and their own tenant.
 *
 * Last admin (QA-3, App Store 5.1.1(v)):
 *   The sole admin may delete the organisation together with the account:
 *   Stripe subscriptions are cancelled server-side first (STRIPE_SECRET_KEY),
 *   then the tenant row is deleted (cascades over all tenant data), storage
 *   under {tenantId}/ and the tenant's customer-portal logins are removed, and
 *   finally the auth user. See ./organization.ts. If other users still belong
 *   to the organisation the request is refused with 'has_members' — the admin
 *   can remove them in-app first (no other person's cooperation required).
 *
 * Optional secret: STRIPE_SECRET_KEY (required as soon as a tenant has a live
 * Stripe subscription; without it organisation deletion is refused).
 *
 * Sign in with Apple (QA-3): after every successful deletion the caller's
 * Apple grant is revoked best-effort via ./apple-revoke.ts when the client
 * sends `appleRefreshToken` or `appleAuthorizationCode` and the APPLE_TEAM_ID,
 * APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_CLIENT_ID secrets are set. The token
 * is only revoked if Apple's id_token `sub` matches the caller's own Apple
 * identity. Checklist item 8: verify on staging with a real Apple sign-in that
 * the response reports appleRevocation='revoked' and the app disappears from
 * appleid.apple.com > "Sign in with Apple".
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { deleteOrganization } from './organization.ts';
import { readAppleTokenInput, revokeAppleTokens, type AppleTokenInput } from './apple-revoke.ts';

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
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'method_not_allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Missing authorization header' }, 401);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // The ONLY source of the target identity.
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ success: false, error: 'Invalid auth token' }, 401);
    }

    // Re-check the typed confirmation server-side. The body is trusted for
    // nothing else.
    let confirmEmail = '';
    let wantsOrganizationDeletion = false;
    let confirmOrganizationName = '';
    let appleInput: AppleTokenInput = {};
    try {
      const body = await req.json();
      appleInput = readAppleTokenInput(body);
      confirmEmail = typeof body?.confirmEmail === 'string' ? body.confirmEmail : '';
      wantsOrganizationDeletion = body?.deleteOrganization === true;
      confirmOrganizationName = typeof body?.confirmOrganizationName === 'string' ? body.confirmOrganizationName : '';
    } catch {
      // Empty/invalid body -> confirmEmail stays '' and fails the check below.
    }

    // Called on every successful deletion path (all cases incl. organisation
    // deletion): revoke Sign in with Apple tokens, best-effort, after the data
    // is gone so a refused deletion never revokes anything.
    const succeed = async (payload: Record<string, unknown>) => {
      const apple = await revokeAppleTokens(user, appleInput);
      return jsonResponse({ ...payload, success: true, appleTokenRevoked: apple === 'revoked', appleRevocation: apple });
    };

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
          return await handleLastAdmin(supabaseAdmin, user.id, profile.tenant_id, {
            wantsOrganizationDeletion,
            confirmOrganizationName,
          }, succeed);
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

      return await succeed({ accountType: 'admin' });
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

      return await succeed({ accountType: 'customer' });
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

    return await succeed({ accountType: 'orphaned' });
  } catch (error) {
    console.error('delete-account error:', error);
    return jsonResponse({ success: false, error: 'delete_failed' }, 500);
  }
});

/**
 * The caller is the tenant's only active admin. Without an explicit, typed
 * organisation confirmation this stays a 409 so the client can switch the
 * dialog into "delete organisation and account" mode.
 */
async function handleLastAdmin(
  supabaseAdmin: SupabaseClient,
  userId: string,
  tenantId: string,
  opts: { wantsOrganizationDeletion: boolean; confirmOrganizationName: string },
  succeed: (payload: Record<string, unknown>) => Promise<Response>,
): Promise<Response> {
  if (!opts.wantsOrganizationDeletion) {
    return jsonResponse({ success: false, error: 'last_admin' }, 409);
  }

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('id, name, stripe_customer_id')
    .eq('id', tenantId)
    .maybeSingle();
  if (tenantError || !tenant) {
    return jsonResponse({ success: false, error: 'organization_not_found' }, 404);
  }

  const expectedName = String(tenant.name ?? '').trim().toLowerCase();
  if (!expectedName || opts.confirmOrganizationName.trim().toLowerCase() !== expectedName) {
    return jsonResponse({ success: false, error: 'organization_name_mismatch' }, 400);
  }

  // Never delete other people's access implicitly.
  const { count: otherMembers, error: memberError } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .neq('id', userId);
  if (memberError) {
    return jsonResponse({ success: false, error: 'admin_check_failed' }, 500);
  }
  if ((otherMembers ?? 0) > 0) {
    return jsonResponse({ success: false, error: 'has_members' }, 409);
  }

  const result = await deleteOrganization(supabaseAdmin, tenantId, tenant.stripe_customer_id ?? null);
  if (!result.ok) {
    return jsonResponse({ success: false, error: result.error }, result.status);
  }
  if (result.warnings.length > 0) {
    console.warn(`[delete-account] organisation ${tenantId} deleted with cleanup warnings: ${result.warnings.join(',')}`);
  }

  // profiles row is gone via the tenants cascade; delete explicitly anyway in
  // case the cascade is missing on this project.
  await supabaseAdmin.from('profiles').delete().eq('id', userId);

  // If this fails, a retry lands in "Case 3" (orphaned auth user) and finishes.
  const { error: userDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (userDeleteError) {
    console.error(`[delete-account] auth user delete failed after organisation delete: ${userDeleteError.message}`);
    return jsonResponse({ success: false, error: 'delete_failed' }, 500);
  }

  return await succeed({ accountType: 'admin', organizationDeleted: true });
}
