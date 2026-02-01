import { createContext, useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getCustomerPortalBranding, getCustomerProfile, getCustomerReturnReasons } from '@/services/supabase/customer-portal';
import { applyPrimaryColor } from '@/lib/dynamic-theme';
import type { CustomerPortalProfile } from '@/types/customer-portal';
import type { RhReturnReason } from '@/types/returns-hub';

export interface CustomerPortalContextType {
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
  primaryColor: string;
  logoUrl: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  customerProfile: CustomerPortalProfile | null;
  reasons: RhReturnReason[];
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const CustomerPortalContext = createContext<CustomerPortalContextType | null>(null);

export function CustomerPortalProvider({ children }: { children: ReactNode }) {
  const { tenantSlug: paramSlug } = useParams<{ tenantSlug: string }>();
  const tenantSlug = paramSlug || '';

  const [tenantId, setTenantId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [logoUrl, setLogoUrl] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerProfile, setCustomerProfile] = useState<CustomerPortalProfile | null>(null);
  const [reasons, setReasons] = useState<RhReturnReason[]>([]);

  const refreshProfile = async () => {
    const profile = await getCustomerProfile();
    setCustomerProfile(profile);
    setIsAuthenticated(!!profile);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCustomerProfile(null);
    setIsAuthenticated(false);
  };

  // Load branding
  useEffect(() => {
    async function loadBranding() {
      if (!tenantSlug) {
        setIsLoading(false);
        return;
      }
      try {
        const branding = await getCustomerPortalBranding(tenantSlug);
        if (branding) {
          setTenantId(branding.tenantId);
          setTenantName(branding.name);
          setPrimaryColor(branding.primaryColor);
          setLogoUrl(branding.logoUrl);
          if (branding.primaryColor) {
            applyPrimaryColor(branding.primaryColor);
          }

          // Load return reasons
          const reasonsData = await getCustomerReturnReasons(branding.tenantId);
          setReasons(reasonsData);
        }
      } catch (err) {
        console.error('Failed to load portal branding:', err);
      }
    }
    loadBranding();
  }, [tenantSlug]);

  // Check auth state
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await refreshProfile();
      }
      setIsLoading(false);
    }
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await refreshProfile();
      } else {
        setCustomerProfile(null);
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <CustomerPortalContext.Provider
      value={{
        tenantSlug,
        tenantId,
        tenantName,
        primaryColor,
        logoUrl,
        isAuthenticated,
        isLoading,
        customerProfile,
        reasons,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </CustomerPortalContext.Provider>
  );
}
