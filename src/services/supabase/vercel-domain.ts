/**
 * Vercel Domain Service
 *
 * Client-side service to add/remove custom domains via Supabase Edge Function.
 */
import { supabase } from '@/lib/supabase';

interface VercelDomainResponse {
  success: boolean;
  error?: string;
}

/**
 * Adds a custom domain to the Vercel project via Edge Function.
 */
export async function addDomainToVercel(
  domain: string
): Promise<VercelDomainResponse> {
  // Billing: check custom domain module
  const { hasModule } = await import('./billing');
  const hasCustomDomain = await hasModule('custom_domain');
  if (!hasCustomDomain) {
    return { success: false, error: 'Custom Domain module not active. Please activate it in Billing settings.' };
  }

  const { data, error } = await supabase.functions.invoke(
    'manage-vercel-domain',
    {
      body: { action: 'add', domain },
    }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return data as VercelDomainResponse;
}

/**
 * Removes a custom domain from the Vercel project via Edge Function.
 */
export async function removeDomainFromVercel(
  domain: string
): Promise<VercelDomainResponse> {
  const { data, error } = await supabase.functions.invoke(
    'manage-vercel-domain',
    {
      body: { action: 'remove', domain },
    }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return data as VercelDomainResponse;
}
