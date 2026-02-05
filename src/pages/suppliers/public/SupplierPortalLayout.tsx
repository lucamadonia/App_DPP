/**
 * Supplier Portal Layout
 * Public layout for invitation-based supplier registration
 * No authentication required, applies tenant branding
 */

import { useState, useEffect, createContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { Package, Loader2, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSupplierInvitationByCode } from '@/services/supabase/supplier-portal';
import { applyPrimaryColor } from '@/lib/dynamic-theme';
import type { SupplierPortalContext as SupplierPortalContextType } from '@/types/supplier-portal';

export const SupplierPortalContext = createContext<SupplierPortalContextType | null>(null);

export function SupplierPortalLayout() {
  const { invitationCode } = useParams<{ invitationCode: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('supplier-portal');
  const currentLang = i18n.language?.startsWith('de') ? 'de' : 'en';

  const [contextData, setContextData] = useState<SupplierPortalContextType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set initial language to English if not set
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
    async function loadInvitation() {
      if (!invitationCode) {
        setError('No invitation code provided');
        setIsLoading(false);
        return;
      }

      try {
        const result = await getSupplierInvitationByCode(invitationCode);

        const { invitation, tenant, portalSettings, branding } = result;

        // Check if invitation is expired or invalid
        const now = new Date();
        const expiresAt = new Date(invitation.expiresAt);
        const isExpired = invitation.status !== 'pending' || expiresAt < now;

        if (isExpired) {
          navigate(`/suppliers/register/${invitationCode}/expired`, { replace: true });
          return;
        }

        // Apply branding
        if (branding.primaryColor) {
          applyPrimaryColor(branding.primaryColor);
        }

        // Build context
        const ctx: SupplierPortalContextType = {
          tenantId: tenant.id,
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
          invitationCode,
          invitation,
          portalSettings,
          branding: {
            logoUrl: branding.logoUrl,
            primaryColor: branding.primaryColor,
            companyName: tenant.name,
          },
          isExpired,
        };

        setContextData(ctx);
      } catch (err: any) {
        console.error('Failed to load supplier invitation:', err);

        if (err.message?.includes('expired') || err.message?.includes('completed') || err.message?.includes('cancelled')) {
          navigate(`/suppliers/register/${invitationCode}/expired`, { replace: true });
        } else {
          setError(err.message || 'Failed to load invitation');
        }
      }
      setIsLoading(false);
    }

    loadInvitation();
  }, [invitationCode, navigate]);

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

  if (error || !contextData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800 font-medium">{t('Error loading invitation')}</p>
            <p className="text-sm text-red-600 mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SupplierPortalContext.Provider value={contextData}>
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {contextData.branding.logoUrl ? (
                <img
                  src={contextData.branding.logoUrl}
                  alt={contextData.tenantName}
                  className="h-9 w-9 rounded-lg object-contain"
                />
              ) : (
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: contextData.branding.primaryColor || '#3B82F6' }}
                >
                  <Package className="h-5 w-5" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {contextData.tenantName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('Supplier Registration')}
                </span>
              </div>
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

        {/* Main Content */}
        <main className="flex-1">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t py-6 bg-white">
          <div className="max-w-5xl mx-auto px-4 text-center text-sm text-muted-foreground">
            <span>Powered by Trackbliss</span>
          </div>
        </footer>
      </div>
    </SupplierPortalContext.Provider>
  );
}
