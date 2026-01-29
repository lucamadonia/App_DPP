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

// Helper to get the current user's tenant_id from their profile
export async function getCurrentTenantId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  return (profile as { tenant_id: string } | null)?.tenant_id || null;
}
