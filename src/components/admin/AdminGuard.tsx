import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { BillingProvider } from '@/contexts/BillingContext';
import { AdminShell } from '@/components/admin/AdminShell';

/**
 * AdminGuard renders the dedicated AdminShell. Only authenticated
 * super-admins get access; everyone else is redirected to the login or
 * the app home.
 */
export function AdminGuard() {
  const { isAuthenticated, isSuperAdmin, isLoading } = useAuth();
  const { t } = useTranslation('common');

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">{t('Loading...')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BillingProvider>
        <AdminShell />
      </BillingProvider>
    </QueryClientProvider>
  );
}
