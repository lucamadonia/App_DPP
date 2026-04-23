/**
 * BrandingContext
 *
 * Provides tenant-specific branding throughout the application.
 * Handles loading branding settings, applying CSS variables,
 * updating document title/favicon, and providing fallback values.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTenantBranding,
  getQRCodeSettings,
  getDPPDesignSettings,
  updateTenantBranding as saveTenantBranding,
  updateQRCodeSettings as saveQRCodeSettings,
  updateDPPDesignSettings as saveDPPDesignSettings,
} from '@/services/supabase';
import { supabase } from '@/lib/supabase';
import type { BrandingSettings, QRCodeDomainSettings, DPPDesignSettings, DPPTemplateName } from '@/types/database';
import {
  applyPrimaryColor,
  applyFavicon,
  applyDocumentTitle,
  resetBranding,
  DEFAULT_BRANDING,
} from '@/lib/dynamic-theme';

// Branding with defaults applied
interface ResolvedBranding {
  appName: string;
  primaryColor: string;
  logo: string | null;
  favicon: string;
  poweredByText: string;
}

// QR Code settings with defaults applied
interface ResolvedQRCodeSettings {
  customDomain: string | null;
  pathPrefix: string;
  useHttps: boolean;
  resolver: 'local' | 'gs1' | 'custom';
  foregroundColor: string;
  backgroundColor: string;
  dppTemplate: DPPTemplateName;
  dppTemplateCustomer: DPPTemplateName;
  dppTemplateCustoms: DPPTemplateName;
}

interface BrandingContextType {
  // Resolved branding with fallback values
  branding: ResolvedBranding;
  // Resolved QR code settings with fallback values
  qrCodeSettings: ResolvedQRCodeSettings;
  // Raw settings from DB (can be null/undefined)
  rawBranding: BrandingSettings | null;
  rawQRCodeSettings: QRCodeDomainSettings | null;
  rawDPPDesign: DPPDesignSettings | null;
  // Loading state
  isLoading: boolean;
  // Update functions
  updateBranding: (settings: Partial<BrandingSettings>) => Promise<boolean>;
  updateQRCodeSettings: (settings: Partial<QRCodeDomainSettings>) => Promise<boolean>;
  updateDPPDesign: (settings: DPPDesignSettings) => Promise<boolean>;
  // Refresh from DB
  refreshBranding: () => Promise<void>;
}

const defaultBranding: ResolvedBranding = {
  appName: DEFAULT_BRANDING.appName,
  primaryColor: DEFAULT_BRANDING.primaryColor,
  logo: null,
  favicon: DEFAULT_BRANDING.favicon,
  poweredByText: DEFAULT_BRANDING.poweredByText,
};

// Default QR code settings - also used as type reference
const DEFAULT_QR_CODE_SETTINGS: ResolvedQRCodeSettings = {
  customDomain: null,
  pathPrefix: '',
  useHttps: true,
  resolver: 'local',
  foregroundColor: '#000000',
  backgroundColor: '#FFFFFF',
  dppTemplate: 'modern',
  dppTemplateCustomer: 'modern',
  dppTemplateCustoms: 'modern',
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

interface BrandingProviderProps {
  children: ReactNode;
}

interface HostWhitelabel {
  tenantId: string;
  tenantName: string;
  appName?: string;
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  supportEmail?: string;
}

// Detects whether the current host is a whitelabel domain (not the default
// trackbliss.eu / dpp-app.fambliss.eu / localhost).
function isWhitelabelCandidateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.startsWith('localhost:')) return false;
  if (h === 'dpp-app.fambliss.eu') return false;
  if (h === 'trackbliss.eu') return false;
  if (h === 'www.trackbliss.eu') return false;
  // Everything else *could* be a whitelabel match — either a subdomain of
  // trackbliss.eu (e.g. fambliss.trackbliss.eu) or a custom domain
  return true;
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const { isAuthenticated, tenantId, isInitializing } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [rawBranding, setRawBranding] = useState<BrandingSettings | null>(null);
  const [rawQRCodeSettings, setRawQRCodeSettings] = useState<QRCodeDomainSettings | null>(null);
  const [rawDPPDesign, setRawDPPDesign] = useState<DPPDesignSettings | null>(null);
  const [hostWhitelabel, setHostWhitelabel] = useState<HostWhitelabel | null>(null);

  // Resolve branding — host whitelabel overrides tenant-branding overrides defaults
  const branding: ResolvedBranding = {
    appName: hostWhitelabel?.appName || rawBranding?.appName || defaultBranding.appName,
    primaryColor: hostWhitelabel?.primaryColor || rawBranding?.primaryColor || defaultBranding.primaryColor,
    logo: hostWhitelabel?.logoUrl || rawBranding?.logo || null,
    favicon: hostWhitelabel?.faviconUrl || rawBranding?.favicon || defaultBranding.favicon,
    poweredByText: rawBranding?.poweredByText || defaultBranding.poweredByText,
  };

  // Resolve QR code settings with fallback values
  const qrCodeSettings: ResolvedQRCodeSettings = {
    customDomain: rawQRCodeSettings?.customDomain || DEFAULT_QR_CODE_SETTINGS.customDomain,
    pathPrefix: rawQRCodeSettings?.pathPrefix || DEFAULT_QR_CODE_SETTINGS.pathPrefix,
    useHttps: rawQRCodeSettings?.useHttps ?? DEFAULT_QR_CODE_SETTINGS.useHttps,
    resolver: rawQRCodeSettings?.resolver || DEFAULT_QR_CODE_SETTINGS.resolver,
    foregroundColor: rawQRCodeSettings?.foregroundColor || DEFAULT_QR_CODE_SETTINGS.foregroundColor,
    backgroundColor: rawQRCodeSettings?.backgroundColor || DEFAULT_QR_CODE_SETTINGS.backgroundColor,
    dppTemplate: rawQRCodeSettings?.dppTemplate || DEFAULT_QR_CODE_SETTINGS.dppTemplate,
    dppTemplateCustomer: rawQRCodeSettings?.dppTemplateCustomer || rawQRCodeSettings?.dppTemplate || DEFAULT_QR_CODE_SETTINGS.dppTemplateCustomer,
    dppTemplateCustoms: rawQRCodeSettings?.dppTemplateCustoms || rawQRCodeSettings?.dppTemplate || DEFAULT_QR_CODE_SETTINGS.dppTemplateCustoms,
  };

  // Load branding from database
  const loadBranding = useCallback(async () => {
    if (!isAuthenticated || !tenantId) {
      setRawBranding(null);
      setRawQRCodeSettings(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [brandingData, qrData, dppDesignData] = await Promise.all([
        getTenantBranding(),
        getQRCodeSettings(),
        getDPPDesignSettings(),
      ]);
      setRawBranding(brandingData);
      setRawQRCodeSettings(qrData);
      setRawDPPDesign(dppDesignData);
    } catch (error) {
      console.error('Failed to load branding:', error);
      setRawBranding(null);
      setRawQRCodeSettings(null);
      setRawDPPDesign(null);
    }
    setIsLoading(false);
  }, [isAuthenticated, tenantId, isInitializing]);

  // Load branding when auth state changes
  useEffect(() => {
    // Wait until auth is fully initialized
    if (isInitializing) return;

    if (isAuthenticated && tenantId) {
      loadBranding();
    } else {
      // Reset to defaults when not authenticated
      setRawBranding(null);
      setRawQRCodeSettings(null);
      setRawDPPDesign(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, tenantId, isInitializing, loadBranding]);

  // Host-based whitelabel resolution — runs once on mount, pre-auth.
  // Maps the current hostname (custom domain or {slug}.trackbliss.eu) to a
  // tenant and applies its whitelabel_config so branding sticks even before
  // the user is logged in and across public pages.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const host = window.location.host;
    if (!isWhitelabelCandidateHost(host)) return;

    (async () => {
      try {
        const { data, error } = await supabase.rpc('resolve_tenant_by_host', { p_host: host });
        if (error) { console.warn('resolve_tenant_by_host failed:', error); return; }
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cfg = (row.whitelabel_config || {}) as any;
        setHostWhitelabel({
          tenantId: row.tenant_id,
          tenantName: row.tenant_name,
          appName: cfg.appName || undefined,
          primaryColor: cfg.primaryColor || undefined,
          accentColor: cfg.accentColor || undefined,
          logoUrl: cfg.logoUrl || undefined,
          faviconUrl: cfg.faviconUrl || undefined,
          supportEmail: cfg.supportEmail || undefined,
        });
      } catch (e) {
        console.warn('host whitelabel resolution error:', e);
      }
    })();
  }, []);

  // Apply branding changes to DOM
  useEffect(() => {
    if (!isAuthenticated) {
      resetBranding();
      return;
    }

    // Apply document title
    applyDocumentTitle(branding.appName);

    // Apply primary color
    if (branding.primaryColor) {
      applyPrimaryColor(branding.primaryColor);
    }

    // Apply favicon
    if (branding.favicon && branding.favicon !== '/vite.svg') {
      applyFavicon(branding.favicon);
    }
  }, [isAuthenticated, branding.appName, branding.primaryColor, branding.favicon]);

  // Update branding in database
  const updateBranding = useCallback(
    async (settings: Partial<BrandingSettings>): Promise<boolean> => {
      const result = await saveTenantBranding(settings);
      if (result.success) {
        // Update local state
        setRawBranding((prev) => ({
          ...prev,
          ...settings,
        }));
      }
      return result.success;
    },
    []
  );

  // Update QR code settings in database
  const updateQRCodeSettings = useCallback(
    async (settings: Partial<QRCodeDomainSettings>): Promise<boolean> => {
      const result = await saveQRCodeSettings(settings);
      if (result.success) {
        // Update local state
        setRawQRCodeSettings((prev) => ({
          ...prev,
          ...settings,
        }));
      }
      return result.success;
    },
    []
  );

  // Update DPP design settings in database
  const updateDPPDesign = useCallback(
    async (settings: DPPDesignSettings): Promise<boolean> => {
      const result = await saveDPPDesignSettings(settings);
      if (result.success) {
        setRawDPPDesign(settings);
      }
      return result.success;
    },
    []
  );

  const value: BrandingContextType = {
    branding,
    qrCodeSettings,
    rawBranding,
    rawQRCodeSettings,
    rawDPPDesign,
    isLoading,
    updateBranding,
    updateQRCodeSettings,
    updateDPPDesign,
    refreshBranding: loadBranding,
  };

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
