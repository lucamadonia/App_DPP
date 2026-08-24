import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNative } from '@/lib/platform';
import { isOnboardingCompleted } from './onboarding-state';

/**
 * Sends a first-run authenticated user to the intro tour.
 *
 * Renders nothing and lives inside the app shell so the redirect logic stays in
 * one place instead of being spread across the router. The check runs once per
 * shell mount — re-running it on every navigation would fight the user's own
 * routing while the async Preferences read is still in flight.
 *
 * Web is deliberately excluded: the browser build is a desktop admin tool that
 * people reload constantly, and a takeover screen there is pure friction.
 */
export function OnboardingGate() {
  const navigate = useNavigate();
  const checked = useRef(false);

  useEffect(() => {
    if (!isNative() || checked.current) return;
    checked.current = true;

    let cancelled = false;
    void (async () => {
      const done = await isOnboardingCompleted();
      if (cancelled || done) return;
      navigate('/onboarding', { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return null;
}
