import { useState, useEffect, createContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, Link, useParams } from 'react-router-dom';
import { Package, Loader2, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPublicReturnReasons, publicGetTenantProducts } from '@/services/supabase';
import {
  lookupPublicTenantBySlug,
  lookupPublicTenantById,
  getReturnsPortalBranding,
  getTenantLegalUrls,
} from '@/services/supabase/public-tenant-lookup';
import { applyPrimaryColor } from '@/lib/dynamic-theme';
import { useForceLightTheme } from '@/hooks/use-force-light-theme';
import { LegalFooterLinks } from '@/components/public/LegalFooterLinks';
import { PortalNotFound } from '@/components/public/PortalNotFound';
import type { RhReturnReason } from '@/types/returns-hub';

export interface TenantProduct {
  id: string;
  name: string;
  gtin?: string;
  imageUrl?: string;
}

export interface ReturnsPortalContextType {
  tenantSlug: string;
  tenantName: string;
  primaryColor: string;
  logoUrl: string;
  reasons: RhReturnReason[];
  products: TenantProduct[];
  isLoading: boolean;
}

export const ReturnsPortalContext = createContext<ReturnsPortalContextType | null>(null);

interface TenantOverride {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  primaryColor: string;
  logoUrl: string;
}

interface ReturnsPortalLayoutProps {
  tenantOverride?: TenantOverride;
}

export function ReturnsPortalLayout({ tenantOverride }: ReturnsPortalLayoutProps = {}) {
  const { tenantSlug: paramSlug } = useParams<{ tenantSlug: string }>();
  const { t, i18n } = useTranslation('returns');
  const currentLang = i18n.language?.startsWith('de') ? 'de' : 'en';

  const [tenantName, setTenantName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [logoUrl, setLogoUrl] = useState('');
  const [reasons, setReasons] = useState<RhReturnReason[]>([]);
  const [products, setProducts] = useState<TenantProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [legalUrls, setLegalUrls] = useState<{ imprintUrl?: string; privacyUrl?: string }>({});

  // Tenant branding is designed for light backgrounds; keep the portal light
  // even when the visitor's OS is in dark mode.
  useForceLightTheme();

  // Extract tenantSlug from any nested route param or override
  const tenantSlug = tenantOverride?.tenantSlug || paramSlug || '';

  useEffect(() => {
    const stored = localStorage.getItem('dpp-language');
    if (!stored) {
      i18n.changeLanguage('en');
      document.documentElement.lang = 'en';
    }
  }, [i18n]);

  const toggleLanguage = () => {
    const newLang = currentLang === 'de' ? 'en' : 'de';
    i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
    localStorage.setItem('dpp-language', newLang);
  };

  useEffect(() => {
    async function loadBranding() {
      // Use override data if provided (custom domain mode)
      if (tenantOverride) {
        setTenantName(tenantOverride.tenantName);
        setPrimaryColor(tenantOverride.primaryColor);
        setLogoUrl(tenantOverride.logoUrl);
        if (tenantOverride.primaryColor) {
          applyPrimaryColor(tenantOverride.primaryColor);
        }
        const [reasonsData, productsData, lookup] = await Promise.all([
          getPublicReturnReasons(tenantOverride.tenantSlug),
          publicGetTenantProducts(tenantOverride.tenantSlug),
          lookupPublicTenantById(tenantOverride.tenantId),
        ]);
        if (lookup.status === 'found') {
          setLegalUrls(getTenantLegalUrls(lookup.tenant));
        }
        setReasons(reasonsData);
        setProducts(productsData);
        setIsLoading(false);
        return;
      }

      if (!tenantSlug) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      setNotFound(false);
      try {
        const [lookup, reasonsData, productsData] = await Promise.all([
          lookupPublicTenantBySlug(tenantSlug),
          getPublicReturnReasons(tenantSlug),
          publicGetTenantProducts(tenantSlug),
        ]);
        if (lookup.status === 'found') {
          const branding = getReturnsPortalBranding(lookup.tenant);
          setTenantName(branding.name);
          setPrimaryColor(branding.primaryColor);
          setLogoUrl(branding.logoUrl);
          setLegalUrls(getTenantLegalUrls(lookup.tenant));
          if (branding.primaryColor) {
            applyPrimaryColor(branding.primaryColor);
          }
        } else if (lookup.status === 'not_found') {
          // Definitely unknown or mistyped slug: show a not-found state instead
          // of a generic portal whose wizard can only fail on submit.
          setNotFound(true);
        }
        // status 'error' (network / 5xx): keep the unbranded portal usable
        // rather than telling customers the shop's portal does not exist.
        setReasons(reasonsData);
        setProducts(productsData);
      } catch (err) {
        console.error('Failed to load portal branding:', err);
      }
      setIsLoading(false);
    }
    loadBranding();
  }, [tenantSlug, tenantOverride]);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <div className="text-center" role="status">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">{t('Loading...')}</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return <PortalNotFound actionLabel={t('Track Return')} />;
  }

  return (
    <ReturnsPortalContext.Provider
      value={{ tenantSlug, tenantName, primaryColor, logoUrl, reasons, products, isLoading }}
    >
      <div className="min-h-dvh flex flex-col bg-gray-50 text-foreground">
        {/* Header — padded below the iOS status bar when opened in the native shell */}
        <header className="bg-white border-b sticky top-0 z-50 pt-[var(--safe-top)]">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link
              to={tenantOverride ? '/' : `/returns/portal/${tenantSlug}`}
              className="flex min-h-11 items-center gap-3 hover:opacity-80 transition-opacity"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={tenantName}
                  className="h-9 w-9 rounded-lg object-contain"
                />
              ) : (
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Package className="h-5 w-5" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {tenantName || t('Returns Hub')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('Returns Portal')}
                </span>
              </div>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="gap-1.5 min-h-11 min-w-11"
              title={currentLang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
            >
              <Languages className="h-4 w-4" aria-hidden="true" />
              {currentLang === 'de' ? 'DE' : 'EN'}
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t py-4 pb-[calc(1rem+var(--safe-bottom))] bg-white">
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>Powered by Trackbliss</span>
            {/* Tenant legal URLs when configured; no platform B2B terms for consumers */}
            <LegalFooterLinks imprintUrl={legalUrls.imprintUrl} privacyUrl={legalUrls.privacyUrl} />
          </div>
        </footer>
      </div>
    </ReturnsPortalContext.Provider>
  );
}
