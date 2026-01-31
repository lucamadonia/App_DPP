import { useState, useEffect, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, Link, useParams } from 'react-router-dom';
import { FileText, Loader2, Globe, Instagram, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPublicBrandingByProduct } from '@/services/supabase';
import { getPublicTenantQRSettings, getPublicTenantDPPDesign } from '@/services/supabase/tenants';
import type { BrandingSettings, DPPDesignSettings } from '@/types/database';
import { DEFAULT_BRANDING } from '@/lib/dynamic-theme';
import { GOOGLE_FONT_URLS } from '@/lib/dpp-design-defaults';
import { resolveDesign, getPageStyle } from '@/lib/dpp-design-utils';
import type { DPPTemplate } from '@/hooks/use-public-product';

// Context for public branding
interface PublicBrandingContextType {
  branding: BrandingSettings | null;
  dppTemplate: DPPTemplate;
  dppDesign: DPPDesignSettings | null;
  isLoading: boolean;
}

const PublicBrandingContext = createContext<PublicBrandingContextType>({
  branding: null,
  dppTemplate: 'modern',
  dppDesign: null,
  isLoading: true,
});

export function usePublicBranding() {
  return useContext(PublicBrandingContext);
}

export function PublicLayout() {
  const { t, i18n } = useTranslation('dpp');
  const { gtin, serial } = useParams();
  const currentLang = i18n.language?.startsWith('de') ? 'de' : 'en';

  // Default public pages to English (unless user has a stored preference)
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
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [dppTemplate, setDppTemplate] = useState<DPPTemplate>('modern');
  const [dppDesign, setDppDesign] = useState<DPPDesignSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load branding based on product
  useEffect(() => {
    async function loadBranding() {
      if (!gtin || !serial) {
        setIsLoading(false);
        return;
      }

      try {
        const [brandingData, qrSettings, designSettings] = await Promise.all([
          getPublicBrandingByProduct(gtin, serial),
          getPublicTenantQRSettings(gtin, serial),
          getPublicTenantDPPDesign(gtin, serial),
        ]);
        setBranding(brandingData);
        if (qrSettings?.dppTemplate) {
          setDppTemplate(qrSettings.dppTemplate as DPPTemplate);
        }
        setDppDesign(designSettings);
      } catch (error) {
        console.error('Failed to load public branding:', error);
        setBranding(null);
      }
      setIsLoading(false);
    }

    loadBranding();
  }, [gtin, serial]);

  // Load Google Font if needed
  const design = resolveDesign(dppDesign);
  useEffect(() => {
    const fontFamily = design.typography.fontFamily;
    if (fontFamily !== 'system' && GOOGLE_FONT_URLS[fontFamily]) {
      const linkId = `dpp-font-${fontFamily.replace(/\s+/g, '-')}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = GOOGLE_FONT_URLS[fontFamily];
        document.head.appendChild(link);
      }
    }
  }, [design.typography.fontFamily]);

  // Resolved branding with fallbacks
  const resolvedBranding = {
    appName: branding?.appName || DEFAULT_BRANDING.appName,
    logo: branding?.logo || null,
    poweredByText: branding?.poweredByText || DEFAULT_BRANDING.poweredByText,
    primaryColor: branding?.primaryColor || DEFAULT_BRANDING.primaryColor,
  };

  const pageStyle = getPageStyle(design);
  const footer = design.footer;
  const hasSocialLinks = footer.socialLinks.website || footer.socialLinks.instagram || footer.socialLinks.linkedin || footer.socialLinks.twitter;

  return (
    <PublicBrandingContext.Provider value={{ branding, dppTemplate, dppDesign, isLoading }}>
      <div className="min-h-screen flex flex-col" style={pageStyle}>
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              {isLoading ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : resolvedBranding.logo ? (
                <img
                  src={resolvedBranding.logo}
                  alt={resolvedBranding.appName}
                  className="h-9 w-9 rounded-lg object-contain"
                />
              ) : (
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: resolvedBranding.primaryColor }}
                >
                  <FileText className="h-5 w-5" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {resolvedBranding.appName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('Digital Product Passport')}
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
        <footer className="border-t py-6 bg-muted/30">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            {footer.showPoweredBy && (
              <p className="text-sm text-muted-foreground">
                {resolvedBranding.poweredByText}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {footer.legalNoticeUrl ? (
                <a href={footer.legalNoticeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  {t('Legal Notice')}
                </a>
              ) : (
                <span className="hover:text-foreground transition-colors cursor-default">
                  {t('Legal Notice')}
                </span>
              )}
              {footer.privacyPolicyUrl ? (
                <a href={footer.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  {t('Privacy Policy')}
                </a>
              ) : (
                <span className="hover:text-foreground transition-colors cursor-default">
                  {t('Privacy Policy')}
                </span>
              )}
            </div>
            {hasSocialLinks && (
              <div className="flex items-center gap-3">
                {footer.socialLinks.website && (
                  <a href={footer.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Globe className="h-4 w-4" />
                  </a>
                )}
                {footer.socialLinks.instagram && (
                  <a href={footer.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {footer.socialLinks.linkedin && (
                  <a href={footer.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </a>
                )}
                {footer.socialLinks.twitter && (
                  <a href={footer.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </footer>
      </div>
    </PublicBrandingContext.Provider>
  );
}
