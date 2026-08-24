import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { isNative } from '@/lib/platform';

/**
 * Carries guest checklist progress into a freshly created account.
 *
 * Renders nothing and sits beside OnboardingGate in the app shell, mirroring
 * that pattern: the check runs once per shell mount, because re-running it on
 * every navigation would fire redundant work while the async Preferences read
 * is still in flight.
 *
 * Web is excluded because guest mode is native-only, so there is never anything
 * to migrate there.
 *
 * The import itself is best-effort and swallows its own failures — this only
 * ever adds a toast, never an error state. `migrateGuestState` is pulled in
 * dynamically so its Supabase dependency stays out of the shell chunk.
 */
export function GuestMigrationGate() {
  const { t } = useTranslation('journey');
  const ran = useRef(false);

  useEffect(() => {
    if (!isNative() || ran.current) return;
    ran.current = true;

    let cancelled = false;
    void (async () => {
      const { migrateGuestState } = await import('@/lib/guest-migration');
      const result = await migrateGuestState();
      if (cancelled || !result) return;
      toast.success(t('discover.migrated', { count: result.imported }));
    })();

    return () => {
      cancelled = true;
    };
  }, [t]);

  return null;
}
