import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
        const { data: tenant } = await supabase
          .from('tenants')
          .select('settings')
          .eq('id', tenantId)
          .single();

        if (tenant?.settings) {
          const settings = tenant.settings as any;
          const customerPortalSettings = settings.returnsHub?.customerPortal;
          const createTicketsEnabled = customerPortalSettings?.features?.createTickets ?? false;
          setEnabled(createTicketsEnabled);
        } else {
          setEnabled(false);
        }
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
