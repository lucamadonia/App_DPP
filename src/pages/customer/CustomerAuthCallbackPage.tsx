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
      await refreshProfile();
      navigate(`/customer/${tenantSlug}`, { replace: true });
    }
    handleCallback();
  }, [navigate, tenantSlug, refreshProfile]);

  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
