import { useState, useEffect } from 'react';
import {
  resolveTenantByDomain,
  type DomainResolutionResult,
} from '@/services/supabase/domain-resolution';
import { isNative } from '@/lib/platform';

const KNOWN_HOSTS = [
  'localhost',
  '127.0.0.1',
  'app-dpp.vercel.app',
  'dpp-app.fambliss.eu',
  'trackbliss.eu',
  'www.trackbliss.eu',
  'trackbliss.com',
  'www.trackbliss.com',
];

const SESSION_CACHE_PREFIX = 'domain-resolution:';

export function useCustomDomainDetection(): {
  isCustomDomain: boolean;
  isResolving: boolean;
  resolution: DomainResolutionResult | null;
  error: string | null;
} {
  // Native builds are never a whitelabel custom domain. Inside a Capacitor
  // WebView the hostname is `localhost` (or whatever `server.hostname` is set
  // to) — resolving that as a tenant domain would fail and render
  // DomainNotFoundPage, locking the user out of the app entirely.
  const native = isNative();
  const [isResolving, setIsResolving] = useState(!native);
  const [resolution, setResolution] = useState<DomainResolutionResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isCustomDomain, setIsCustomDomain] = useState(false);

  useEffect(() => {
    if (native) return;

    const hostname = window.location.hostname;

    // Known hosts are never custom domains
    if (KNOWN_HOSTS.includes(hostname) || hostname.endsWith('.vercel.app')) {
      setIsCustomDomain(false);
      setIsResolving(false);
      return;
    }

    // Check sessionStorage cache
    const cacheKey = SESSION_CACHE_PREFIX + hostname;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as DomainResolutionResult;
        setResolution(parsed);
        setIsCustomDomain(true);
        setIsResolving(false);
        return;
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    // Resolve domain
    let cancelled = false;

    async function resolve() {
      try {
        const result = await resolveTenantByDomain(hostname);
        if (cancelled) return;

        if (result) {
          setResolution(result);
          setIsCustomDomain(true);
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } else {
          setIsCustomDomain(true); // It IS a custom domain, just unresolved
          setError('domain_not_found');
        }
      } catch (_err) {
        if (cancelled) return;
        setIsCustomDomain(true);
        setError('resolution_error');
      }
      setIsResolving(false);
    }

    resolve();

    return () => {
      cancelled = true;
    };
  }, [native]);

  return { isCustomDomain, isResolving, resolution, error };
}
