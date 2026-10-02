/**
 * Organisation deletion for the delete-account Edge Function (QA-3).
 *
 * Used only when the caller is the LAST active admin of their tenant and has
 * explicitly confirmed deleting the whole organisation (typed organisation
 * name, re-checked server-side). This is what makes in-app account deletion
 * possible for the typical self-signup user (App Store guideline 5.1.1(v)).
 *
 * Order (each step only runs if the previous one succeeded):
 *   1. Cancel all live Stripe subscriptions of the tenant's Stripe customer
 *      (immediately, no proration). Aborts the whole deletion on failure so a
 *      deleted organisation is never left being billed.
 *   2. Collect customer-portal logins of this tenant (deleted after step 3).
 *   3. DELETE the tenants row. Every tenant-scoped table references
 *      tenants(id) ON DELETE CASCADE, so this removes products, passports,
 *      documents, returns, tickets, billing rows, invitations, profiles, ...
 *      in one statement (atomic in Postgres).
 *   4. Best-effort: remove storage objects under `{tenantId}/` in every
 *      tenant bucket, then the customer-portal auth users from step 2.
 *
 * The caller's own auth user is deleted by index.ts afterwards.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** Buckets whose objects are stored under a `{tenantId}/...` prefix. */
const TENANT_BUCKETS = [
  'documents',
  'product-images',
  'branding',
  'return-photos',
  'return-labels',
  'compliance-reports',
  'feedback-photos',
  'pictograms',
];

const LIVE_STRIPE_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused']);
const MAX_STORAGE_OBJECTS = 50_000;
const MAX_PORTAL_USERS = 5_000;

export type OrganizationDeletionResult =
  | { ok: true; storageObjectsRemoved: number; portalUsersRemoved: number; warnings: string[] }
  | { ok: false; error: string; status: number };

export async function deleteOrganization(
  supabaseAdmin: SupabaseClient,
  tenantId: string,
  stripeCustomerId: string | null,
): Promise<OrganizationDeletionResult> {
  const warnings: string[] = [];

  // 1. Stripe — must succeed before any data is touched.
  const stripe = await cancelStripeSubscriptions(supabaseAdmin, tenantId, stripeCustomerId);
  if (!stripe.ok) {
    console.error(`[delete-account] stripe cancellation failed for tenant ${tenantId}: ${stripe.detail}`);
    return { ok: false, error: 'subscription_cancel_failed', status: 502 };
  }

  // 2. Customer-portal logins that belong only to this tenant.
  const portalUserIds = await collectPortalUserIds(supabaseAdmin, tenantId);

  // 3. The tenant row (cascades over all tenant-scoped tables).
  const { error: tenantError } = await supabaseAdmin.from('tenants').delete().eq('id', tenantId);
  if (tenantError) {
    console.error(`[delete-account] tenant delete failed for ${tenantId}: ${tenantError.message}`);
    return { ok: false, error: 'organization_delete_failed', status: 500 };
  }

  // 4a. Storage (best-effort; the tenant id is logged for manual cleanup).
  let storageObjectsRemoved = 0;
  for (const bucket of TENANT_BUCKETS) {
    try {
      storageObjectsRemoved += await removePrefix(supabaseAdmin, bucket, tenantId);
    } catch (err) {
      warnings.push(`storage:${bucket}`);
      console.warn(`[delete-account] storage cleanup ${bucket}/${tenantId} failed:`, err);
    }
  }

  // 4b. Customer-portal auth users (their rh_customer_profiles rows are gone).
  let portalUsersRemoved = 0;
  for (const id of portalUserIds) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) {
      warnings.push('portal_user');
      console.warn(`[delete-account] portal user ${id} of tenant ${tenantId} not deleted: ${error.message}`);
    } else {
      portalUsersRemoved++;
    }
  }

  return { ok: true, storageObjectsRemoved, portalUsersRemoved, warnings };
}

async function cancelStripeSubscriptions(
  supabaseAdmin: SupabaseClient,
  tenantId: string,
  stripeCustomerId: string | null,
): Promise<{ ok: true } | { ok: false; detail: string }> {
  const { data: subRows, error: subError } = await supabaseAdmin
    .from('billing_subscriptions')
    .select('stripe_subscription_id, stripe_customer_id, status')
    .eq('tenant_id', tenantId);
  if (subError) return { ok: false, detail: `billing_subscriptions: ${subError.message}` };

  const subscriptionIds = new Set<string>();
  const customerIds = new Set<string>();
  if (stripeCustomerId) customerIds.add(stripeCustomerId);
  for (const row of subRows ?? []) {
    if (row.stripe_customer_id) customerIds.add(row.stripe_customer_id);
    if (row.stripe_subscription_id && LIVE_STRIPE_STATUSES.has(row.status)) {
      subscriptionIds.add(row.stripe_subscription_id);
    }
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    // No Stripe configured: fine only if nothing is billed through Stripe.
    return subscriptionIds.size === 0
      ? { ok: true }
      : { ok: false, detail: 'STRIPE_SECRET_KEY missing while live subscriptions exist' };
  }

  // Ask Stripe directly as well: the local mirror can lag behind webhooks.
  for (const customerId of customerIds) {
    const res = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=100`,
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    );
    if (!res.ok) {
      // Unknown customer on this Stripe account (e.g. tenants still pointing at
      // the previous Stripe account): Stripe answers 400 resource_missing
      // "No such customer". Nothing can be billed there through us → skip.
      const err = await readStripeError(res);
      if (isMissingResource(res.status, err)) continue;
      return { ok: false, detail: `list subscriptions ${res.status} ${err.message ?? ''}` };
    }
    const body = await res.json() as { data?: Array<{ id: string; status: string }> };
    for (const sub of body.data ?? []) {
      if (LIVE_STRIPE_STATUSES.has(sub.status)) subscriptionIds.add(sub.id);
    }
  }

  for (const subscriptionId of subscriptionIds) {
    // Immediate cancel; Stripe defaults are invoice_now=false, prorate=false.
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Idempotency-Key': `delete-account:${tenantId}:${subscriptionId}`,
      },
    });
    if (res.ok) continue;
    // Already canceled / unknown on this Stripe account → nothing left to bill.
    const err = await readStripeError(res);
    if (isMissingResource(res.status, err) || (err.message || '').toLowerCase().includes('canceled')) continue;
    return { ok: false, detail: `cancel ${subscriptionId}: ${res.status} ${err.message ?? ''}` };
  }

  return { ok: true };
}

type StripeError = { code?: string; message?: string };

async function readStripeError(res: Response): Promise<StripeError> {
  const body = await res.json().catch(() => ({})) as { error?: StripeError };
  return body.error ?? {};
}

/** 404, or Stripe's 400 `resource_missing` / "No such customer|subscription". */
function isMissingResource(status: number, err: StripeError): boolean {
  if (status === 404 || err.code === 'resource_missing') return true;
  return /no such (customer|subscription)/i.test(err.message || '');
}

async function collectPortalUserIds(supabaseAdmin: SupabaseClient, tenantId: string): Promise<string[]> {
  const { data: rows, error } = await supabaseAdmin
    .from('rh_customer_profiles')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(MAX_PORTAL_USERS);
  if (error || !rows?.length) return [];

  const ids = rows.map((r: { id: string }) => r.id);
  // Never delete a login that is also a tenant user somewhere.
  const { data: staff } = await supabaseAdmin.from('profiles').select('id').in('id', ids);
  const staffIds = new Set((staff ?? []).map((r: { id: string }) => r.id));
  return ids.filter((id: string) => !staffIds.has(id));
}

/** Recursively removes every object below `prefix/` in a bucket. Returns the count removed. */
async function removePrefix(supabaseAdmin: SupabaseClient, bucket: string, prefix: string): Promise<number> {
  const files: string[] = [];
  const queue: string[] = [prefix];
  while (queue.length > 0 && files.length < MAX_STORAGE_OBJECTS) {
    const dir = queue.shift()!;
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabaseAdmin.storage.from(bucket).list(dir, { limit: 1000, offset });
      if (error) {
        // Unknown bucket in this project → nothing to clean.
        if (/not.?found/i.test(error.message)) return 0;
        throw error;
      }
      for (const entry of data ?? []) {
        const path = `${dir}/${entry.name}`;
        // Folders are returned without an id.
        if (entry.id) files.push(path);
        else queue.push(path);
      }
      if (!data || data.length < 1000) break;
    }
  }

  let removed = 0;
  for (let i = 0; i < files.length; i += 100) {
    const batch = files.slice(i, i + 100);
    const { error } = await supabaseAdmin.storage.from(bucket).remove(batch);
    if (error) throw error;
    removed += batch.length;
  }
  return removed;
}
