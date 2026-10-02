import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, Link } from 'react-router-dom';
import { Package, Languages, Loader2, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomerPortalProvider, type TenantOverride } from '@/contexts/CustomerPortalContext';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { CustomerNav } from '@/components/customer/CustomerNav';
import { FloatingHelpButton } from '@/components/customer/FloatingHelpButton';
import { LegalFooterLinks } from '@/components/public/LegalFooterLinks';
import { PortalNotFound } from '@/components/public/PortalNotFound';
import { useForceLightTheme } from '@/hooks/use-force-light-theme';
import { FONT_FAMILY_MAP, GOOGLE_FONT_URLS, BORDER_RADIUS_MAP } from '@/lib/dpp-design-defaults';

function CustomerPortalContent() {
  const { t, i18n } = useTranslation('customer-portal');
  const portal = useCustomerPortal();
  const { tenantSlug, tenantName, branding, isAuthenticated, isLoading, tenantNotFound } = portal;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Portal branding (page/header/card colours) is designed for light
  // backgrounds; keep semantic tokens light even when the OS is in dark mode.
  useForceLightTheme();
  const currentLang = i18n.language?.startsWith('de') ? 'de' : 'en';

  const toggleLanguage = () => {
    const newLang = currentLang === 'de' ? 'en' : 'de';
    i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
    localStorage.setItem('dpp-language', newLang);
  };

  // Inject Google Font and custom CSS
  useEffect(() => {
    const fontFamily = branding.fontFamily || 'system';
    const fontUrl = GOOGLE_FONT_URLS[fontFamily];
    let fontLink: HTMLLinkElement | null = null;
    if (fontUrl) {
      fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = fontUrl;
      fontLink.id = 'customer-portal-font';
      const existing = document.getElementById('customer-portal-font');
      if (existing) existing.remove();
      document.head.appendChild(fontLink);
    }

    // Inject custom CSS
    let styleEl: HTMLStyleElement | null = null;
    if (branding.customCss) {
      styleEl = document.createElement('style');
      styleEl.id = 'customer-portal-custom-css';
      styleEl.textContent = branding.customCss;
      const existingStyle = document.getElementById('customer-portal-custom-css');
      if (existingStyle) existingStyle.remove();
      document.head.appendChild(styleEl);
    }

    return () => {
      fontLink?.remove();
      styleEl?.remove();
    };
  }, [branding.fontFamily, branding.customCss]);

  const fontStack = FONT_FAMILY_MAP[branding.fontFamily || 'system'] || FONT_FAMILY_MAP.system;
  const borderRadius = BORDER_RADIUS_MAP[branding.borderRadius || 'medium'] || BORDER_RADIUS_MAP.medium;
  const logoUrl = branding.logoUrl;
  const primaryColor = branding.primaryColor;

  const portalStyle: React.CSSProperties = {
    fontFamily: fontStack,
    '--portal-primary': primaryColor,
    '--portal-secondary': branding.secondaryColor,
    '--portal-accent': branding.accentColor,
    '--portal-radius': borderRadius,
  } as React.CSSProperties;

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <div className="text-center" role="status">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">{t('Loading...', { ns: 'common' })}</p>
        </div>
      </div>
    );
  }

  if (tenantNotFound) {
    return <PortalNotFound actionTo="/returns/track" actionLabel={t('Track Return', { ns: 'returns' })} />;
  }

  const footerLinks = branding.footerLinks || [];

  return (
    <div
      className="min-h-dvh flex flex-col text-foreground"
      style={{ ...portalStyle, backgroundColor: branding.pageBackground }}
    >
      {/* Header */}
      <header
        className="border-b sticky top-0 z-50 shadow-sm customer-portal-header pt-[var(--safe-top)]"
        style={{
          backgroundColor: branding.headerBackground,
          color: branding.headerTextColor,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden min-h-11 min-w-11"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label={sidebarOpen ? t('Close menu', { ns: 'common' }) : t('Open menu', { ns: 'common' })}
                aria-expanded={sidebarOpen}
              >
                {sidebarOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              </Button>
            )}
            <Link
              to={tenantSlug && !window.location.hostname.includes(tenantSlug) ? `/customer/${tenantSlug}` : '/portal'}
              className="flex min-h-11 items-center gap-3 hover:opacity-80 transition-opacity"
            >
              {logoUrl ? (
                <img src={logoUrl} alt={tenantName} className="h-9 w-auto max-w-[120px] rounded-lg object-contain" />
              ) : (
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Package className="h-5 w-5" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold" style={{ color: branding.headerTextColor }}>
                  {branding.portalTitle || tenantName || t('Customer Portal')}
                </span>
                {tenantName && branding.portalTitle && (
                  <span className="text-xs opacity-60">
                    {tenantName}
                  </span>
                )}
              </div>
            </Link>
          </div>
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

      {/* Main Layout */}
      {isAuthenticated ? (
        <div className="flex-1 flex max-w-7xl w-full mx-auto">
          {/* Sidebar (mobile overlay) */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
              <div className="absolute inset-0 bg-black/50" />
              <aside
                className="absolute left-0 top-[calc(4rem+var(--safe-top))] bottom-0 w-64 border-r shadow-lg"
                style={{
                  backgroundColor: branding.sidebarBackground,
                  color: branding.sidebarTextColor,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <CustomerNav />
              </aside>
            </div>
          )}

          {/* Sidebar (desktop) */}
          <aside
            className="hidden md:block w-56 border-r shrink-0 sticky top-16 h-[calc(100dvh-4rem)] overflow-y-auto"
            style={{
              backgroundColor: branding.sidebarBackground,
              color: branding.sidebarTextColor,
            }}
          >
            <CustomerNav />
          </aside>

          {/* Content */}
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            <Outlet />
          </main>

          {/* Floating Help Button */}
          <FloatingHelpButton />
        </div>
      ) : (
        <main className="flex-1">
          <Outlet />
        </main>
      )}

      {/* Footer */}
      <footer
        className="border-t py-4 pb-[calc(1rem+var(--safe-bottom))]"
        style={{ backgroundColor: branding.cardBackground }}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {branding.showPoweredBy !== false && (
              <span>Powered by Trackbliss</span>
            )}
            {branding.copyrightText && (
              <span>{branding.copyrightText}</span>
            )}
            {branding.footerText && (
              <span>{branding.footerText}</span>
            )}
          </div>
          {footerLinks.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-x-3">
              {footerLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center px-1 hover:text-foreground hover:underline underline-offset-4 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : (
            // No tenant-configured legal links: fall back to the platform pages
            // instead of dead text (GDPR Art. 13, DDG §5).
            <LegalFooterLinks />
          )}
        </div>
      </footer>
    </div>
  );
}

interface CustomerPortalLayoutProps {
  tenantOverride?: TenantOverride;
}

export function CustomerPortalLayout({ tenantOverride }: CustomerPortalLayoutProps = {}) {
  return (
    <CustomerPortalProvider tenantOverride={tenantOverride}>
      <CustomerPortalContent />
    </CustomerPortalProvider>
  );
}
