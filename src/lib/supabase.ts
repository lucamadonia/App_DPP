/**
 * Supabase Client Configuration
 *
 * Zentraler Client für alle Supabase-Operationen:
 * - Authentication
 * - Database queries
 * - Storage operations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Using 'any' for database type until proper types are generated
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.generated.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Anon-only Supabase client for public pages (tracking, portal, registration).
 * Does NOT persist or auto-refresh sessions, so it always runs as anon role
 * and is not affected by a broken admin session in the same browser.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAnon = createClient<any>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storageKey: 'sb-anon-public',
    },
  }
);

// Cache for tenant ID to reduce database queries
let cachedTenantId: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper to get the current user's tenant_id from their profile
export async function getCurrentTenantId(forceRefresh = false): Promise<string | null> {
  // Return cached value if valid
  if (!forceRefresh && cachedTenantId && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedTenantId;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    cachedTenantId = null;
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  cachedTenantId = (profile as { tenant_id: string } | null)?.tenant_id || null;
  cacheTimestamp = Date.now();

  return cachedTenantId;
}

// Export cache invalidation for logout
export function clearTenantIdCache() {
  cachedTenantId = null;
  cacheTimestamp = 0;
}
