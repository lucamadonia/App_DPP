import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';

export function CustomerAuthCallbackPage() {
  const navigate = useNavigate();
  const { tenantSlug, refreshProfile } = useCustomerPortal();

  useEffect(() => {
    async function handleCallback() {
      // Supabase auth automatically handles the token exchange via detectSessionInUrl
      // Small delay for RLS propagation after magic link token exchange
      await new Promise(resolve => setTimeout(resolve, 200));

      const hasProfile = await refreshProfile();
      if (hasProfile) {
        navigate(`/customer/${tenantSlug}`, { replace: true });
      } else {
        // No customer profile found — redirect to login with error
        navigate(`/customer/${tenantSlug}/login`, { replace: true });
      }
    }
    handleCallback();
  }, [navigate, tenantSlug, refreshProfile]);

  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
