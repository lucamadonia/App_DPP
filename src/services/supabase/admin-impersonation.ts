/**
 * Admin impersonation client-side helpers.
 *
 * Storage: sessionStorage so impersonation scope is the browser tab only.
 * Closing the tab ends the session from the client side.
 */
import type { ImpersonationSession } from '@/types/admin-extended';

const STORAGE_KEY = 'tb_admin_impersonation';

export function saveImpersonation(session: ImpersonationSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent('tb:impersonation-changed', { detail: session }));
  } catch (e) {
    console.error('saveImpersonation failed:', e);
  }
}

export function getImpersonation(): ImpersonationSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as ImpersonationSession;
    // expire stale sessions client-side
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      clearImpersonation();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearImpersonation(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('tb:impersonation-changed', { detail: null }));
}

export function isImpersonating(): boolean {
  return getImpersonation() != null;
}

export function millisecondsUntilImpersonationEnd(): number {
  const s = getImpersonation();
  if (!s) return 0;
  return Math.max(0, new Date(s.expiresAt).getTime() - Date.now());
}
