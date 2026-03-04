import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldX } from 'lucide-react';
import { publicGetTenantBranding, getPublicReturnReasons, publicGetTenantProducts } from '@/services/supabase';
import { applyPrimaryColor } from '@/lib/dynamic-theme';
import { sendReadyEvent, initEmbedResizeObserver } from '@/lib/embed-messaging';
import { ReturnsPortalContext } from '@/pages/returns/public/ReturnsPortalLayout';
import type { RhReturnReason } from '@/types/returns-hub';
import type { TenantProduct } from '@/pages/returns/public/ReturnsPortalLayout';

function getParentDomain(): string | null {
  try {
    const ref = document.referrer;
    if (!ref) return null;
    const url = new URL(ref);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isDomainAllowed(parentDomain: string, allowedDomains: string[]): boolean {
  return allowedDomains.some((allowed) => {
    if (parentDomain === allowed) return true;
    // Allow subdomains: *.example.com matches sub.example.com
    if (parentDomain.endsWith('.' + allowed)) return true;
    return false;
  });
}

export function EmbedLayout() {
  const { tenantSlug: paramSlug } = useParams<{ tenantSlug: string }>();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation('returns');

  const [tenantName, setTenantName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [logoUrl, setLogoUrl] = useState('');
  const [reasons, setReasons] = useState<RhReturnReason[]>([]);
  const [products, setProducts] = useState<TenantProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [domainBlocked, setDomainBlocked] = useState(false);

  const tenantSlug = paramSlug || '';

  // Apply lang from query param
  useEffect(() => {
    const lang = searchParams.get('lang');
    if (lang && (lang === 'de' || lang === 'en')) {
      i18n.changeLanguage(lang);
      document.documentElement.lang = lang;
    }
  }, [searchParams, i18n]);

  // Init resize observer + send ready event
  useEffect(() => {
    const cleanup = initEmbedResizeObserver();
    // Small delay to let content render before measuring
    const readyTimer = setTimeout(() => sendReadyEvent(), 100);
    return () => {
      cleanup();
      clearTimeout(readyTimer);
    };
  }, []);

  // Load tenant branding, reasons, products
  useEffect(() => {
    async function load() {
      if (!tenantSlug) {
        setIsLoading(false);
        return;
      }
      try {
        const [branding, reasonsData, productsData] = await Promise.all([
          publicGetTenantBranding(tenantSlug),
          getPublicReturnReasons(tenantSlug),
          publicGetTenantProducts(tenantSlug),
        ]);
        if (branding) {
          // Check domain whitelist
          const allowedDomains = branding.embedAllowedDomains;
          if (allowedDomains && allowedDomains.length > 0) {
            const parentDomain = getParentDomain();
            if (parentDomain && !isDomainAllowed(parentDomain, allowedDomains)) {
              setDomainBlocked(true);
              setIsLoading(false);
              return;
            }
          }

          setTenantName(branding.name);
          setPrimaryColor(branding.primaryColor);
          setLogoUrl(branding.logoUrl);
          if (branding.primaryColor) {
            applyPrimaryColor(branding.primaryColor);
          }
        }
        setReasons(reasonsData);
        setProducts(productsData);
      } catch (err) {
        console.error('Failed to load embed branding:', err);
      }
      setIsLoading(false);
    }
    load();
  }, [tenantSlug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">{t('Loading...')}</p>
        </div>
      </div>
    );
  }

  if (domainBlocked) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-sm">
          <ShieldX className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-sm font-medium">{t('Embedding not allowed')}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('This domain is not authorized to embed this portal.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ReturnsPortalContext.Provider
      value={{ tenantSlug, tenantName, primaryColor, logoUrl, reasons, products, isLoading }}
    >
      <div className="bg-background">
        <Outlet />
      </div>
    </ReturnsPortalContext.Provider>
  );
}
