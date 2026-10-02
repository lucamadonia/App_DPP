/**
 * Supabase Edge Function: invite-user
 *
 * Sends the Supabase Auth invitation email for a pending row in `invitations`.
 * Called from the frontend after the invitation record was inserted.
 *
 * Security model (SEC-07):
 *   - Caller must be an admin of a tenant.
 *   - A matching *pending* invitation for (caller tenant, email) must exist; the
 *     role is taken from that row (allowlisted), never from the request body.
 *   - Existing auth users are NEVER moved between tenants here. Their
 *     invitation stays pending until they explicitly accept it while logged in
 *     (accept flow is separate). Moving a profile without consent allowed a
 *     cross-tenant takeover of other tenants' owners.
 *   - The response does not reveal whether an account exists for the email:
 *     every outcome after the invitation lookup (invite mail sent, address
 *     already registered, mail provider failure) returns the SAME body
 *     `{ success: true, emailSent: true, userAlreadyExists: false }` and is
 *     padded to a minimum duration. `emailSent` is a legacy constant kept for
 *     the existing client contract and means "invitation processed", not
 *     "an email was delivered". The distinguishing cases are logged
 *     server-side only.
 *   - No `listUsers()` scan: `inviteUserByEmail` itself rejects registered
 *     emails, which also removes the first-page-only lookup bug.
 *   - Seat limit (server-side, plan `maxAdminUsers`): staff profiles of the
 *     tenant plus OTHER pending, unexpired invitations plus this one must fit
 *     the plan. Otherwise 403 `{ error: 'seat_limit' }` and no email is sent.
 *     Defaults mirror PLAN_CONFIGS (free 1, pro 5, enterprise 25); tunable via
 *     INVITE_SEATS_FREE / INVITE_SEATS_PRO / INVITE_SEATS_ENTERPRISE.
 *   - Persistent rate limits (_shared/rate-limit.ts, migration 20261001d),
 *     FAIL CLOSED, because every call can send a platform-sender auth email
 *     and create an auth user: per caller per hour, per IP per hour, per
 *     tenant per day (smaller on Free) and a platform-wide hourly cap that
 *     protects the shared auth email budget (password reset, signup).
 *     Tunable via INVITE_USER_PER_HOUR (10), INVITE_IP_PER_HOUR (20),
 *     INVITE_FREE_TENANT_PER_DAY (5), INVITE_PAID_TENANT_PER_DAY (50),
 *     INVITE_GLOBAL_PER_HOUR (100). 429 `rate_limited` when exceeded.
 *
 * Deployment:
 *   supabase functions deploy invite-user --no-verify-jwt
 *   (the caller JWT is verified in-function via auth.getUser)
 *
 * Required Supabase Secrets:
 *   - SUPABASE_URL (automatic)
 *   - SUPABASE_SERVICE_ROLE_KEY (automatic)
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimits, getClientIp, hashKey, rateLimitedResponse } from '../_shared/rate-limit.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const ALLOWED_ROLES = new Set(['admin', 'editor', 'viewer']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PAID_STATUSES = new Set(['active', 'trialing', 'past_due']);

function envInt(name: string, fallback: number): number {
  const n = Number.parseInt(Deno.env.get(name) || '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Effective plan: a paid plan only counts while its subscription is in good standing. */
async function getTenantPlan(supabase: SupabaseClient, tenantId: string): Promise<'free' | 'pro' | 'enterprise'> {
  const { data, error } = await supabase
    .from('billing_subscriptions')
    .select('plan, status')
    .eq('tenant_id', tenantId);
  if (error) throw new Error(`billing lookup failed: ${error.message}`);
  let plan: 'free' | 'pro' | 'enterprise' = 'free';
  for (const row of (data ?? []) as { plan?: string; status?: string }[]) {
    if (!PAID_STATUSES.has(String(row.status))) continue;
    if (row.plan === 'enterprise') return 'enterprise';
    if (row.plan === 'pro') plan = 'pro';
  }
  return plan;
}

function seatLimitFor(plan: 'free' | 'pro' | 'enterprise'): number {
  if (plan === 'enterprise') return envInt('INVITE_SEATS_ENTERPRISE', 25);
  if (plan === 'pro') return envInt('INVITE_SEATS_PRO', 5);
  return envInt('INVITE_SEATS_FREE', 1);
}

/**
 * Seats in use = staff profiles of the tenant (customer-portal users have no
 * profiles row) + other pending, unexpired invitations. Throws on DB errors so
 * the caller fails closed.
 */
async function countUsedSeats(supabase: SupabaseClient, tenantId: string, excludeInvitationId: string): Promise<number> {
  const nowIso = new Date().toISOString();
  const [profilesRes, invitesRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase
      .from('invitations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .neq('id', excludeInvitationId)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
  ]);
  if (profilesRes.error) throw new Error(`profiles count failed: ${profilesRes.error.message}`);
  if (invitesRes.error) throw new Error(`invitations count failed: ${invitesRes.error.message}`);
  return (profilesRes.count ?? 0) + (invitesRes.count ?? 0);
}

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

/** Minimum wall time for the post-lookup path, so timing does not reveal the outcome. */
const MIN_RESPONSE_MS = 1500;

/**
 * Uniform response for "invitation is pending". Byte-identical for every
 * outcome (new address, already-registered address, provider failure) so it
 * cannot serve as an account-existence oracle.
 */
async function pendingResponse(startedAt: number) {
  const remaining = MIN_RESPONSE_MS + Math.floor(Math.random() * 250) - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
  return jsonResponse({ success: true, emailSent: true, userAlreadyExists: false });
}

function isAlreadyRegisteredError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  if (err.code === 'email_exists' || err.code === 'user_already_exists') return true;
  const msg = (err.message || '').toLowerCase();
  return msg.includes('already been registered') || msg.includes('already registered') || msg.includes('already exists');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Missing authorization header' }, 401);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return jsonResponse({ success: false, error: 'Invalid auth token' }, 401);
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', caller.id)
      .single();

    if (!callerProfile?.tenant_id || callerProfile.role !== 'admin') {
      return jsonResponse({ success: false, error: 'Unauthorized: admin role required' }, 403);
    }

    let body: { email?: unknown; name?: unknown };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
    }

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
      return jsonResponse({ success: false, error: 'Invalid email' }, 400);
    }

    const tenantId = callerProfile.tenant_id as string;

    // The invitation row is the source of truth for tenant + role.
    const { data: invitation } = await supabaseAdmin
      .from('invitations')
      .select('id, email, role, name, expires_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .ilike('email', email.replace(/[\\%_]/g, (c) => `\\${c}`))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!invitation) {
      return jsonResponse({ success: false, error: 'No pending invitation for this email' }, 404);
    }
    if (invitation.expires_at && new Date(invitation.expires_at).getTime() < Date.now()) {
      return jsonResponse({ success: false, error: 'Invitation expired' }, 410);
    }

    const inviteRole = ALLOWED_ROLES.has(invitation.role) ? invitation.role : 'viewer';
    const nameInput = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : '';
    const inviteName = invitation.name || nameInput || email;

    // Seat limit (plan maxAdminUsers): checked before any email goes out.
    let plan: 'free' | 'pro' | 'enterprise' = 'free';
    try {
      plan = await getTenantPlan(supabaseAdmin, tenantId);
      const seatLimit = seatLimitFor(plan);
      const used = await countUsedSeats(supabaseAdmin, tenantId, invitation.id);
      if (used + 1 > seatLimit) {
        return jsonResponse({
          success: false,
          error: 'seat_limit',
          message: `User limit reached (${used}/${seatLimit})`,
          current: used,
          limit: seatLimit,
        }, 403);
      }
    } catch (seatErr) {
      console.error('[invite-user] seat check failed:', seatErr);
      return jsonResponse({ success: false, error: 'Seat check unavailable' }, 503);
    }

    // Rate limits — fail closed: each call can send a platform auth email.
    const ipHash = await hashKey(getClientIp(req));
    const verdict = await enforceRateLimits(supabaseAdmin, [
      { bucket: `invite:ip-hour:${ipHash}`, limit: envInt('INVITE_IP_PER_HOUR', 20), windowSeconds: 3600 },
      { bucket: `invite:user-hour:${caller.id}`, limit: envInt('INVITE_USER_PER_HOUR', 10), windowSeconds: 3600 },
      {
        bucket: `invite:tenant-day:${tenantId}`,
        limit: plan === 'free'
          ? envInt('INVITE_FREE_TENANT_PER_DAY', 5)
          : envInt('INVITE_PAID_TENANT_PER_DAY', 50),
        windowSeconds: 86_400,
      },
      // Platform-wide cap last, so requests already rejected per IP/user/tenant
      // do not eat into it (one abuser cannot block everyone's invites).
      { bucket: 'invite:global-hour', limit: envInt('INVITE_GLOBAL_PER_HOUR', 100), windowSeconds: 3600 },
    ], { failOpen: false });
    if (!verdict.allowed) {
      return rateLimitedResponse(verdict.retryAfterSeconds, corsHeaders);
    }

    const startedAt = Date.now();
    // handle_new_user() joins the tenant only via data.invitation_id (must match a pending, unexpired invitation for this exact email); other metadata is informational.
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(invitation.email, {
      data: {
        invitation_id: invitation.id,
        tenant_id: tenantId,
        role: inviteRole,
        full_name: inviteName,
      },
    });

    if (inviteError) {
      // Existing account (any tenant, including this one): never touch the
      // profile. The invitation stays pending. Logged here only — the caller
      // gets the same answer as for a successfully sent invite.
      if (isAlreadyRegisteredError(inviteError)) {
        console.info(`[invite-user] invitation ${invitation.id}: address already registered, left pending`);
      } else {
        console.error(`[invite-user] invitation ${invitation.id}: inviteUserByEmail failed:`, inviteError.message);
      }
    }

    return await pendingResponse(startedAt);
  } catch (err) {
    console.error('[invite-user] unexpected error:', err);
    return jsonResponse({ success: false, error: 'Internal error' }, 500);
  }
});
