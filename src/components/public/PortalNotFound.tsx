import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SearchX, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LegalFooterLinks } from '@/components/public/LegalFooterLinks';

interface PortalNotFoundProps {
  /** Where the primary action leads (defaults to the public return tracking page). */
  actionTo?: string;
  /** Label of the primary action (already translated). */
  actionLabel?: string;
}

/**
 * Branded "portal not found" state for unknown or mistyped tenant slugs.
 *
 * Without it, an unknown slug renders a generic, fully working portal whose
 * forms can only fail on submit. Only render it for a definite empty lookup
 * result, never for a failed request (see public-tenant-lookup.ts).
 */

// The body sentence is a new `returns` key (handed off to the locale owner).
// Until it lands in public/locales/{en,de}/returns.json, these defaults keep
// German visitors from seeing English text.
const NOT_FOUND_BODY_KEY =
  'This portal does not exist or is no longer available. Please check the link you received from the shop.';
const NOT_FOUND_BODY_DE =
  'Dieses Portal existiert nicht oder ist nicht mehr verfügbar. Bitte prüfen Sie den Link, den Sie vom Shop erhalten haben.';
export function PortalNotFound({ actionTo = '/returns/track', actionLabel }: PortalNotFoundProps) {
  const { t, i18n } = useTranslation('returns');
  const isDe = i18n.language?.startsWith('de') ?? false;

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <header className="border-b bg-card pt-[var(--safe-top)]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
          <span className="text-sm font-semibold">Trackbliss</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div role="alert" className="w-full max-w-md text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <SearchX className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold">{t('Portal not found')}</h1>
          <p className="text-sm text-muted-foreground">
            {t(NOT_FOUND_BODY_KEY, { defaultValue: isDe ? NOT_FOUND_BODY_DE : NOT_FOUND_BODY_KEY })}
          </p>
          <Button asChild className="min-h-11">
            <Link to={actionTo}>
              <Search className="h-4 w-4 mr-2" aria-hidden="true" />
              {actionLabel ?? t('Track Return')}
            </Link>
          </Button>
        </div>
      </main>

      <footer className="border-t py-4 pb-[calc(1rem+var(--safe-bottom))] bg-card">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Powered by Trackbliss</span>
          <LegalFooterLinks />
        </div>
      </footer>
    </div>
  );
}
