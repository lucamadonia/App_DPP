import { useState, useEffect, createContext, useContext } from 'react';
import { Outlet, Link, useParams } from 'react-router-dom';
import { FileText, Loader2 } from 'lucide-react';
import { getPublicBrandingByProduct } from '@/services/supabase';
import type { BrandingSettings } from '@/types/database';
import { DEFAULT_BRANDING } from '@/lib/dynamic-theme';

// Context for public branding
interface PublicBrandingContextType {
  branding: BrandingSettings | null;
  isLoading: boolean;
}

const PublicBrandingContext = createContext<PublicBrandingContextType>({
  branding: null,
  isLoading: true,
});

export function usePublicBranding() {
  return useContext(PublicBrandingContext);
}

export function PublicLayout() {
  const { gtin, serial } = useParams();
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load branding based on product
  useEffect(() => {
    async function loadBranding() {
      if (!gtin || !serial) {
        setIsLoading(false);
        return;
      }

      try {
        const brandingData = await getPublicBrandingByProduct(gtin, serial);
        setBranding(brandingData);
      } catch (error) {
        console.error('Failed to load public branding:', error);
        setBranding(null);
      }
      setIsLoading(false);
    }

    loadBranding();
  }, [gtin, serial]);

  // Resolved branding with fallbacks
  const resolvedBranding = {
    appName: branding?.appName || DEFAULT_BRANDING.appName,
    logo: branding?.logo || null,
    poweredByText: branding?.poweredByText || DEFAULT_BRANDING.poweredByText,
    primaryColor: branding?.primaryColor || DEFAULT_BRANDING.primaryColor,
  };

  return (
    <PublicBrandingContext.Provider value={{ branding, isLoading }}>
      <div className="min-h-screen flex flex-col bg-background">
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
                  Digital Product Passport
                </span>
              </div>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t py-6 bg-muted/30">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {resolvedBranding.poweredByText}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Impressum
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Datenschutz
              </a>
            </div>
          </div>
        </footer>
      </div>
    </PublicBrandingContext.Provider>
  );
}
