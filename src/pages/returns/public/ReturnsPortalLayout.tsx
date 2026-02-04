import { useState, useEffect, createContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, Link, useParams } from 'react-router-dom';
import { Package, Loader2, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { publicGetTenantBranding, getPublicReturnReasons } from '@/services/supabase';
import { applyPrimaryColor } from '@/lib/dynamic-theme';
import type { RhReturnReason } from '@/types/returns-hub';

export interface ReturnsPortalContextType {
  tenantSlug: string;
  tenantName: string;
  primaryColor: string;
  logoUrl: string;
  reasons: RhReturnReason[];
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
  const [isLoading, setIsLoading] = useState(true);

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
        const reasonsData = await getPublicReturnReasons(tenantOverride.tenantSlug);
        setReasons(reasonsData);
        setIsLoading(false);
        return;
      }

      if (!tenantSlug) {
        setIsLoading(false);
        return;
      }
      try {
        const [branding, reasonsData] = await Promise.all([
          publicGetTenantBranding(tenantSlug),
          getPublicReturnReasons(tenantSlug),
        ]);
        if (branding) {
          setTenantName(branding.name);
          setPrimaryColor(branding.primaryColor);
          setLogoUrl(branding.logoUrl);
          if (branding.primaryColor) {
            applyPrimaryColor(branding.primaryColor);
          }
        }
        setReasons(reasonsData);
      } catch (err) {
        console.error('Failed to load portal branding:', err);
      }
      setIsLoading(false);
    }
    loadBranding();
  }, [tenantSlug, tenantOverride]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">{t('Loading...')}</p>
        </div>
      </div>
    );
  }

  return (
    <ReturnsPortalContext.Provider
      value={{ tenantSlug, tenantName, primaryColor, logoUrl, reasons, isLoading }}
    >
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link
              to={tenantOverride ? '/' : `/returns/portal/${tenantSlug}`}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
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
              className="gap-1.5"
              title={currentLang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
            >
              <Languages className="h-4 w-4" />
              {currentLang === 'de' ? 'DE' : 'EN'}
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t py-6 bg-white">
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>Powered by Trackbliss</span>
            <div className="flex items-center gap-4">
              <span className="hover:text-foreground transition-colors cursor-default">
                {t('Privacy Policy')}
              </span>
              <span className="hover:text-foreground transition-colors cursor-default">
                {t('Terms of Service')}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </ReturnsPortalContext.Provider>
  );
}
