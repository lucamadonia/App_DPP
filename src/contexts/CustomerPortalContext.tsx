import { createContext, useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getCustomerPortalBranding, getCustomerProfile, getCustomerReturnReasons } from '@/services/supabase/customer-portal';
import { applyPrimaryColor, applyFavicon } from '@/lib/dynamic-theme';
import { DEFAULT_CUSTOMER_PORTAL_SETTINGS } from '@/services/supabase/rh-settings';
import type { CustomerPortalProfile } from '@/types/customer-portal';
import type { RhReturnReason, CustomerPortalBrandingOverrides, CustomerPortalSettings } from '@/types/returns-hub';

export interface TenantOverride {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  primaryColor: string;
  logoUrl: string;
}

export interface CustomerPortalContextType {
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
  primaryColor: string;
  logoUrl: string;
  branding: CustomerPortalBrandingOverrides;
  portalSettings: CustomerPortalSettings;
  isAuthenticated: boolean;
  isLoading: boolean;
  customerProfile: CustomerPortalProfile | null;
  reasons: RhReturnReason[];
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const CustomerPortalContext = createContext<CustomerPortalContextType | null>(null);

interface CustomerPortalProviderProps {
  children: ReactNode;
  tenantOverride?: TenantOverride;
}

export function CustomerPortalProvider({ children, tenantOverride }: CustomerPortalProviderProps) {
  const { tenantSlug: paramSlug } = useParams<{ tenantSlug: string }>();
  const tenantSlug = tenantOverride?.tenantSlug || paramSlug || '';

  const [tenantId, setTenantId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [branding, setBranding] = useState<CustomerPortalBrandingOverrides>(DEFAULT_CUSTOMER_PORTAL_SETTINGS.branding);
  const [portalSettings, setPortalSettings] = useState<CustomerPortalSettings>(DEFAULT_CUSTOMER_PORTAL_SETTINGS);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerProfile, setCustomerProfile] = useState<CustomerPortalProfile | null>(null);
  const [reasons, setReasons] = useState<RhReturnReason[]>([]);

  const primaryColor = branding.primaryColor;
  const logoUrl = branding.logoUrl;

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
      // Use override data if provided (custom domain mode)
      if (tenantOverride) {
        setTenantId(tenantOverride.tenantId);
        setTenantName(tenantOverride.tenantName);
        setBranding(prev => ({
          ...prev,
          primaryColor: tenantOverride.primaryColor,
          logoUrl: tenantOverride.logoUrl,
        }));
        if (tenantOverride.primaryColor) {
          applyPrimaryColor(tenantOverride.primaryColor);
        }
        const reasonsData = await getCustomerReturnReasons(tenantOverride.tenantId);
        setReasons(reasonsData);
        return;
      }

      if (!tenantSlug) {
        setIsLoading(false);
        return;
      }
      try {
        const result = await getCustomerPortalBranding(tenantSlug);
        if (result) {
          setTenantId(result.tenantId);
          setTenantName(result.name);
          setBranding(result.branding);
          setPortalSettings(result.portalSettings);

          if (result.branding.primaryColor) {
            applyPrimaryColor(result.branding.primaryColor);
          }
          if (result.branding.faviconUrl) {
            applyFavicon(result.branding.faviconUrl);
          }
          if (result.branding.portalTitle) {
            document.title = result.branding.portalTitle;
          }

          // Load return reasons
          const reasonsData = await getCustomerReturnReasons(result.tenantId);
          setReasons(reasonsData);
        }
      } catch (err) {
        console.error('Failed to load portal branding:', err);
      }
    }
    loadBranding();
  }, [tenantSlug, tenantOverride]);

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
        branding,
        portalSettings,
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
