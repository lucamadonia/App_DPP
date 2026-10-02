import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Legal links (Impressum / Datenschutz / AGB) for public surfaces.
 *
 * Every public page that collects personal data must expose a reachable
 * privacy notice and imprint (GDPR Art. 13, DDG §5). Tenants can configure
 * their own URLs; when they have not, we fall back to the platform's legal
 * pages instead of rendering dead text.
 *
 * On a white-label custom domain the platform routes (/imprint, /privacy,
 * /terms) do not exist in the slug-free router, so the fallback points at the
 * canonical platform origin instead.
 *
 * Terms: the platform /terms are the B2B SaaS terms between the platform and
 * its tenants. They do not apply to a shop's consumers, so a terms link is
 * only rendered for a tenant-configured URL, or when a platform surface opts
 * in with `showTerms`.
 *
 * Labels come from the `legal` namespace, which already has en + de keys.
 */

const PLATFORM_HOSTS = [
  'localhost',
  '127.0.0.1',
  'app-dpp.vercel.app',
  'dpp-app.fambliss.eu',
  'trackbliss.eu',
  'www.trackbliss.eu',
  'trackbliss.com',
  'www.trackbliss.com',
];

const PLATFORM_BASE_URL = (
  import.meta.env.VITE_PUBLIC_BASE_URL || 'https://trackbliss.eu'
).replace(/\/+$/, '');

function isPlatformHost(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return PLATFORM_HOSTS.includes(host) || host.endsWith('.vercel.app');
}

export interface LegalFooterLinksProps {
  /** Tenant-configured imprint URL (external). Falls back to the platform imprint. */
  imprintUrl?: string;
  /** Tenant-configured privacy policy URL (external). Falls back to the platform policy. */
  privacyUrl?: string;
  /** Tenant-configured terms URL (external). Always rendered when set. */
  termsUrl?: string;
  /** Fall back to the platform terms when no termsUrl is set. Only for
   *  platform (B2B) surfaces, never for consumer-facing portals. */
  showTerms?: boolean;
  className?: string;
  linkClassName?: string;
  linkStyle?: React.CSSProperties;
}

interface LegalItem {
  key: string;
  label: string;
  tenantUrl?: string;
  platformPath: string;
}

export function LegalFooterLinks({
  imprintUrl,
  privacyUrl,
  termsUrl,
  showTerms = false,
  className,
  linkClassName,
  linkStyle,
}: LegalFooterLinksProps) {
  const { t } = useTranslation('legal');
  const onPlatformHost = isPlatformHost();

  const items: LegalItem[] = [
    { key: 'imprint', label: t('imprint'), tenantUrl: imprintUrl, platformPath: '/imprint' },
    { key: 'privacy', label: t('privacyPolicy'), tenantUrl: privacyUrl, platformPath: '/privacy' },
  ];
  if (termsUrl || showTerms) {
    items.push({ key: 'terms', label: t('terms'), tenantUrl: termsUrl, platformPath: '/terms' });
  }

  // 44px minimum touch target (WCAG 2.5.5) without changing the visual size.
  const baseLink = cn(
    'inline-flex min-h-11 items-center px-1 underline-offset-4 hover:underline hover:text-foreground transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
    linkClassName
  );

  return (
    <nav aria-label={`${t('imprint')} / ${t('privacyPolicy')}`} className={cn('flex flex-wrap items-center justify-center gap-x-3', className)}>
      {items.map((item) => {
        if (item.tenantUrl) {
          return (
            <a
              key={item.key}
              href={item.tenantUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={baseLink}
              style={linkStyle}
            >
              {item.label}
            </a>
          );
        }
        if (onPlatformHost) {
          return (
            <Link key={item.key} to={item.platformPath} className={baseLink} style={linkStyle}>
              {item.label}
            </Link>
          );
        }
        return (
          <a
            key={item.key}
            href={`${PLATFORM_BASE_URL}${item.platformPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className={baseLink}
            style={linkStyle}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
