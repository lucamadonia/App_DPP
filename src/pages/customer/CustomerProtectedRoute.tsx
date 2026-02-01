import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';

export function CustomerProtectedRoute() {
  const { tenantSlug, isAuthenticated, isLoading } = useCustomerPortal();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/customer/${tenantSlug}/login`} replace />;
  }

  return <Outlet />;
}
