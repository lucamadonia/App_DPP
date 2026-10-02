/**
 * Supabase Auth Service
 *
 * Authentifizierungsfunktionen für:
 * - Email/Password
 * - Google OAuth
 * - Sign in with Apple (required alongside Google on iOS)
 * - Magic Link (OTP)
 */

import { supabase } from '@/lib/supabase';
import i18n from '@/i18n';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { getAuthOrigin, isNative } from '@/lib/platform';

// Short locale code ('de' | 'en' | 'el') for auth-email-hook template selection.
function currentLocale(): string {
  return (i18n.language || 'en').slice(0, 2).toLowerCase();
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

export interface AuthResult {
  user: AuthUser | null;
  session: Session | null;
  error: AuthError | null;
}

// Transform Supabase user to our AuthUser format
function transformUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || user.user_metadata?.full_name,
    image: user.user_metadata?.avatar_url || user.user_metadata?.picture,
  };
}

/**
 * Get current session
 */
export async function getSession(): Promise<{ user: AuthUser | null; session: Session | null }> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Failed to get session:', error);
    return { user: null, session: null };
  }
  return {
    user: transformUser(session?.user || null),
    session,
  };
}

/**
 * Get current user
 */
export async function getUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return transformUser(user);
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    user: transformUser(data.user),
    session: data.session,
    error,
  };
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        full_name: name,
        locale: currentLocale(),
      },
    },
  });

  return {
    user: transformUser(data.user),
    session: data.session,
    error,
  };
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(redirectTo?: string): Promise<{ error: AuthError | null }> {
  return signInWithOAuthProvider('google', redirectTo);
}

/**
 * Sign in with Apple.
 *
 * The Capacitor shell uses the same browser + Universal Link round-trip as
 * Google. The Apple provider must be enabled in Supabase before the store
 * build is uploaded; the App Store handoff documents the exact account steps.
 */
export async function signInWithApple(redirectTo?: string): Promise<{ error: AuthError | null }> {
  return signInWithOAuthProvider('apple', redirectTo);
}

async function signInWithOAuthProvider(
  provider: 'google' | 'apple',
  redirectTo?: string,
): Promise<{ error: AuthError | null }> {
  const target = redirectTo || `${getAuthOrigin()}/auth/callback`;

  // Native OAuth must be opened in the system browser. Google rejects embedded
  // WebViews outright (`disallowed_useragent`), and Apple uses the same secure
  // browser + Universal Link round-trip. The `appUrlOpen` listener in
  // src/lib/deep-links.ts consumes the callback.
  if (isNative()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: target,
        skipBrowserRedirect: true,
      },
    });
    if (error) return { error };
    if (!data?.url) {
      return { error: new Error('No authorization URL returned') as AuthError };
    }
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: data.url, presentationStyle: 'popover' });
    return { error: null };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: target,
    },
  });

  return { error };
}

/**
 * Send magic link (passwordless OTP)
 */
export async function sendMagicLink(email: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getAuthOrigin()}/auth/callback`,
      data: {
        locale: currentLocale(),
      },
    },
  });

  return { error };
}

/**
 * Verify OTP code
 */
export async function verifyOtp(email: string, token: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  return {
    user: transformUser(data.user),
    session: data.session,
    error,
  };
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAuthOrigin()}/auth/reset-password`,
  });

  return { error };
}

/**
 * Update password (after reset or change)
 */
export async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { error };
}

/**
 * Update user profile
 */
export async function updateProfile(data: {
  name?: string;
  avatar_url?: string;
}): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({
    data: {
      name: data.name,
      full_name: data.name,
      avatar_url: data.avatar_url,
    },
  });

  return { error };
}

/**
 * Persist the current UI language to user_metadata.locale so server-side
 * auth emails (confirmation, reset, magic link, ...) pick up the right
 * template via the auth-email-hook Edge Function.
 */
export async function syncLocaleToMetadata(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const current = currentLocale();
    if (user.user_metadata?.locale === current) return;
    await supabase.auth.updateUser({ data: { locale: current } });
  } catch {
    // Non-critical — silent fail keeps the app responsive.
  }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(transformUser(session?.user || null));
    }
  );

  return () => subscription.unsubscribe();
}

/**
 * Handle OAuth callback (exchange code for session)
 */
export async function handleAuthCallback(): Promise<AuthResult> {
  // On web, supabase-js has already parsed the callback URL (detectSessionInUrl)
  // by the time this runs, so getSession() is enough. On native detection is off
  // and the PKCE code may still be sitting in the URL — exchange it explicitly.
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return {
          user: transformUser(data.session?.user || null),
          session: data.session,
          error: null,
        };
      }
      // Fall through to getSession() — the code may already have been consumed.
    }
  }

  const { data, error } = await supabase.auth.getSession();

  return {
    user: transformUser(data.session?.user || null),
    session: data.session,
    error,
  };
}

// ---------------------------------------------------------------------------
// Account deletion (Apple App Store guideline 5.1.1(v))
//
// Two distinct kinds of account can be signed in through this client:
//   - a tenant user  → row in `profiles`
//   - a portal customer → row in `rh_customer_profiles`
// The account type is derived from the session, never passed in by the caller.
// ---------------------------------------------------------------------------

export type DeletableAccountType = 'admin' | 'customer';

/**
 * `has_members`: the caller is the last admin and other users still belong to
 * the organisation — they must be removed (in-app) before the organisation can
 * be deleted together with the account.
 */
export type AccountDeletionBlockedReason = 'has_members' | 'no_account';

export interface AccountDeletionEligibility {
  /**
   * `null` when a valid session exists but neither profile row does — an
   * account left half-deleted by an earlier failure. Still deletable; see the
   * "Case 3" branch in the `delete-account` edge function.
   */
  accountType: DeletableAccountType | null;
  /** Email of the signed-in user — the string the confirmation gate expects. */
  email: string;
  canDelete: boolean;
  blockedReason: AccountDeletionBlockedReason | null;
  /**
   * The caller is the organisation's last active admin: deleting the account
   * deletes the whole organisation (all data, subscription cancelled). The UI
   * must require the typed organisation name in addition to the email.
   */
  requiresOrganizationDeletion: boolean;
  /** Organisation name the second confirmation expects (only set when required). */
  organizationName: string | null;
}

/**
 * Determine whether the signed-in account may delete itself.
 *
 * A tenant's last remaining admin cannot leave the organisation orphaned, so
 * for them deletion means deleting the organisation together with the account
 * (App Store guideline 5.1.1(v): no other person may be required). That is
 * only offered when nobody else belongs to the organisation; otherwise the
 * admin has to remove those users first. The edge function re-checks all of
 * this server-side.
 */
export async function getAccountDeletionEligibility(): Promise<AccountDeletionEligibility> {
  const { data: { user } } = await supabase.auth.getUser();
  const noOrg = { requiresOrganizationDeletion: false, organizationName: null };
  if (!user) {
    return { accountType: null, email: '', canDelete: false, blockedReason: 'no_account', ...noOrg };
  }

  const email = user.email || '';

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profile) {
    if (profile.role === 'admin' && profile.tenant_id) {
      const { count: adminCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)
        .eq('role', 'admin')
        // Same rule as the edge function: a missing status counts as active.
        .or('status.is.null,status.neq.inactive');

      if ((adminCount ?? 0) <= 1) {
        const [{ data: tenant }, { count: otherMembers }] = await Promise.all([
          supabase.from('tenants').select('name').eq('id', profile.tenant_id).maybeSingle(),
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', profile.tenant_id)
            .neq('id', user.id),
        ]);
        const organizationName = (tenant?.name as string | undefined) || null;
        const hasMembers = (otherMembers ?? 0) > 0;
        return {
          accountType: 'admin',
          email,
          canDelete: !hasMembers && !!organizationName,
          blockedReason: hasMembers ? 'has_members' : null,
          requiresOrganizationDeletion: true,
          organizationName,
        };
      }
    }
    return { accountType: 'admin', email, canDelete: true, blockedReason: null, ...noOrg };
  }

  const { data: customerProfile } = await supabase
    .from('rh_customer_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (customerProfile) {
    return { accountType: 'customer', email, canDelete: true, blockedReason: null, ...noOrg };
  }

  // Valid session, no profile row of either kind: a deletion that failed
  // partway through. Deletion must stay available, otherwise the auth user is
  // stranded forever with no way to clear it.
  return { accountType: null, email, canDelete: true, blockedReason: null, ...noOrg };
}

/**
 * Request permanent deletion of the signed-in account.
 *
 * `confirmEmail` is the address the user typed into the confirmation gate. It
 * is checked here and re-checked server-side against the JWT; no user id is
 * ever sent, so the edge function can only ever delete the caller.
 *
 * On success the local session is signed out — the auth user no longer exists.
 *
 * For the last admin, `confirmOrganizationName` must be the typed
 * organisation name; the organisation is then deleted together with the
 * account (subscription cancelled server-side).
 *
 * Errors are returned as stable codes where the UI needs to explain them
 * ('last_admin', 'has_members', 'no_account', 'email_mismatch',
 * 'organization_name_mismatch', 'subscription_cancel_failed'); anything else
 * is the raw message from the edge function.
 */
export async function requestAccountDeletion(
  confirmEmail: string,
  options: { confirmOrganizationName?: string } = {}
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'no_account' };

  if (confirmEmail.trim().toLowerCase() !== (user.email || '').toLowerCase()) {
    return { success: false, error: 'email_mismatch' };
  }

  const eligibility = await getAccountDeletionEligibility();
  if (!eligibility.canDelete) {
    return { success: false, error: eligibility.blockedReason || 'not_eligible' };
  }

  const body: Record<string, unknown> = { confirmEmail: confirmEmail.trim() };
  if (eligibility.requiresOrganizationDeletion) {
    const typedName = (options.confirmOrganizationName || '').trim().toLowerCase();
    if (!typedName || typedName !== (eligibility.organizationName || '').trim().toLowerCase()) {
      return { success: false, error: 'organization_name_mismatch' };
    }
    body.deleteOrganization = true;
    body.confirmOrganizationName = options.confirmOrganizationName!.trim();
  }

  // Sign in with Apple: hand the provider refresh token (if the session still
  // has it) to the server so it can revoke the Apple grant (App Store 5.1.1(v)).
  const isAppleUser = (user.identities ?? []).some((i) => i.provider === 'apple');
  if (isAppleUser) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.provider_refresh_token) body.appleRefreshToken = session.provider_refresh_token;
  }

  const { invokeEdgeFunction } = await import('@/lib/edge-function');
  const { data, error } = await invokeEdgeFunction<{ success?: boolean; error?: string }>(
    'delete-account',
    body
  );

  // invokeEdgeFunction maps a non-2xx JSON body { error: "<code>" } to error.message.
  if (error) return { success: false, error: error.message };
  if (!data?.success) return { success: false, error: data?.error || 'delete_failed' };

  await supabase.auth.signOut();
  return { success: true };
}

