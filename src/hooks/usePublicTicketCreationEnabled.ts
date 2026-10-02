import { useState, useEffect } from 'react';
import { getPublicTenantById } from '@/services/supabase/public-tenant';

interface UsePublicTicketCreationEnabledResult {
  enabled: boolean;
  loading: boolean;
}

/**
 * Hook to check if public ticket creation is enabled for a tenant
 * @param tenantId - The tenant ID to check
 * @returns Object with enabled flag and loading state
 */
export function usePublicTicketCreationEnabled(tenantId: string | null | undefined): UsePublicTicketCreationEnabledResult {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkFeature() {
      if (!tenantId) {
        setEnabled(false);
        setLoading(false);
        return;
      }

      try {
        // Public pages cannot read `tenants` directly; use the allow-list RPC.
        const tenant = await getPublicTenantById(tenantId);
        const customerPortalSettings = tenant?.settings?.returnsHub?.customerPortal;
        setEnabled(customerPortalSettings?.features?.createTickets ?? false);
      } catch (error) {
        console.error('Error checking public ticket creation feature:', error);
        setEnabled(false);
      } finally {
        setLoading(false);
      }
    }

    checkFeature();
  }, [tenantId]);

  return { enabled, loading };
}
