/**
 * Supabase Auth Service
 *
 * Authentifizierungsfunktionen für:
 * - Email/Password
 * - Google OAuth
 * - Magic Link (OTP)
 */

import { supabase } from '@/lib/supabase';
import i18n from '@/i18n';
import type { User, Session, AuthError } from '@supabase/supabase-js';

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
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
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
      emailRedirectTo: `${window.location.origin}/auth/callback`,
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
    redirectTo: `${window.location.origin}/auth/reset-password`,
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
  const { data, error } = await supabase.auth.getSession();

  return {
    user: transformUser(data.session?.user || null),
    session: data.session,
    error,
  };
}
