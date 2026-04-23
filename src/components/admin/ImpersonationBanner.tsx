/**
 * Sticky red banner shown while an admin is impersonating a tenant.
 * Counts down to auto-expiry; [Beenden] clears the session.
 */
import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getImpersonation, clearImpersonation } from '@/services/supabase/admin-impersonation';
import { endImpersonation } from '@/services/supabase/admin';
import type { ImpersonationSession } from '@/types/admin-extended';

function formatCountdown(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mm = Math.floor(total / 60).toString().padStart(2, '0');
  const ss = (total % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export function ImpersonationBanner() {
  const [session, setSession] = useState<ImpersonationSession | null>(getImpersonation());
  const [remaining, setRemaining] = useState<number>(
    session ? Math.max(0, new Date(session.expiresAt).getTime() - Date.now()) : 0,
  );

  useEffect(() => {
    function refresh() {
      setSession(getImpersonation());
    }
    window.addEventListener('tb:impersonation-changed', refresh);
    return () => window.removeEventListener('tb:impersonation-changed', refresh);
  }, []);

  useEffect(() => {
    if (!session) return;
    const int = setInterval(() => {
      const ms = new Date(session.expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, ms));
      if (ms <= 0) {
        clearImpersonation();
        setSession(null);
      }
    }, 1000);
    return () => clearInterval(int);
  }, [session]);

  async function handleEnd() {
    if (!session) return;
    try {
      await endImpersonation(session.sessionId);
    } catch {
      // ignore, client-side end is enough
    }
    clearImpersonation();
    setSession(null);
    // Hard reload to flush any tenant-scoped caches that might have leaked
    window.location.reload();
  }

  if (!session) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 w-full border-b border-red-700 bg-red-600 text-white shadow-lg"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 animate-pulse" aria-hidden="true" />
        <span className="font-semibold truncate">
          Impersonation aktiv: {session.tenantName}
        </span>
        <span className="hidden sm:inline opacity-80">
          — alle Aktionen werden protokolliert
        </span>
        <span className="ml-auto font-mono tabular-nums text-xs sm:text-sm">
          {formatCountdown(remaining)}
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleEnd}
          className="h-7 px-2.5 bg-white text-red-700 hover:bg-red-50"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Beenden
        </Button>
      </div>
    </div>
  );
}
