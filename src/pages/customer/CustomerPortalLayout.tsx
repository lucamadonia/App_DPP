import { useTranslation } from 'react-i18next';
import { Outlet, Link } from 'react-router-dom';
import { Package, Languages, Loader2, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CustomerPortalProvider, type TenantOverride } from '@/contexts/CustomerPortalContext';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { CustomerNav } from '@/components/customer/CustomerNav';

function CustomerPortalContent() {
  const { t, i18n } = useTranslation('customer-portal');
  const { tenantSlug, tenantName, primaryColor, logoUrl, isAuthenticated, isLoading } = useCustomerPortal();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentLang = i18n.language?.startsWith('de') ? 'de' : 'en';

  const toggleLanguage = () => {
    const newLang = currentLang === 'de' ? 'en' : 'de';
    i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
    localStorage.setItem('dpp-language', newLang);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">{t('Loading...', { ns: 'common' })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
            <Link
              to={tenantSlug && !window.location.hostname.includes(tenantSlug) ? `/customer/${tenantSlug}` : '/portal'}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              {logoUrl ? (
                <img src={logoUrl} alt={tenantName} className="h-9 w-9 rounded-lg object-contain" />
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
                  {tenantName || t('Customer Portal')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('Customer Portal')}
                </span>
              </div>
            </Link>
          </div>
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

      {/* Main Layout */}
      {isAuthenticated ? (
        <div className="flex-1 flex max-w-7xl w-full mx-auto">
          {/* Sidebar (mobile overlay) */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
              <div className="absolute inset-0 bg-black/50" />
              <aside
                className="absolute left-0 top-16 bottom-0 w-64 bg-white border-r shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <CustomerNav />
              </aside>
            </div>
          )}

          {/* Sidebar (desktop) */}
          <aside className="hidden md:block w-56 bg-white border-r shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
            <CustomerNav />
          </aside>

          {/* Content */}
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      ) : (
        <main className="flex-1">
          <Outlet />
        </main>
      )}

      {/* Footer */}
      <footer className="border-t py-6 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>Powered by DPP Manager</span>
          <div className="flex items-center gap-4">
            <span className="hover:text-foreground transition-colors cursor-default">
              {t('Privacy Policy', { ns: 'returns' })}
            </span>
            <span className="hover:text-foreground transition-colors cursor-default">
              {t('Terms of Service', { ns: 'returns' })}
            </span>
          </div>
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
