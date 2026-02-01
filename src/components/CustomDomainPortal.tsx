import { Routes, Route, Navigate } from 'react-router-dom';
import type { DomainResolutionResult } from '@/services/supabase/domain-resolution';

// Returns Portal pages
import { ReturnsPortalLayout } from '@/pages/returns/public/ReturnsPortalLayout';
import { PublicReturnPortalPage } from '@/pages/returns/public/PublicReturnPortalPage';
import { PublicReturnRegisterPage } from '@/pages/returns/public/PublicReturnRegisterPage';
import { PublicReturnTrackingPage } from '@/pages/returns/public/PublicReturnTrackingPage';

// Customer Portal pages
import { CustomerPortalLayout } from '@/pages/customer/CustomerPortalLayout';
import { CustomerProtectedRoute } from '@/pages/customer/CustomerProtectedRoute';
import { CustomerLoginPage } from '@/pages/customer/CustomerLoginPage';
import { CustomerRegisterPage } from '@/pages/customer/CustomerRegisterPage';
import { CustomerAuthCallbackPage } from '@/pages/customer/CustomerAuthCallbackPage';
import { CustomerDashboardPage } from '@/pages/customer/CustomerDashboardPage';
import { CustomerReturnsListPage } from '@/pages/customer/CustomerReturnsListPage';
import { CustomerReturnDetailPage } from '@/pages/customer/CustomerReturnDetailPage';
import { CustomerNewReturnPage } from '@/pages/customer/CustomerNewReturnPage';
import { CustomerTicketsListPage } from '@/pages/customer/CustomerTicketsListPage';
import { CustomerTicketDetailPage } from '@/pages/customer/CustomerTicketDetailPage';
import { CustomerProfilePage } from '@/pages/customer/CustomerProfilePage';

interface CustomDomainPortalProps {
  resolution: DomainResolutionResult;
}

/**
 * Slug-free portal router for custom domains.
 * Renders portal routes without tenant slug in the URL.
 */
export function CustomDomainPortal({ resolution }: CustomDomainPortalProps) {
  const { portalType } = resolution;
  const showReturns = portalType === 'returns' || portalType === 'both';
  const showCustomer = portalType === 'customer' || portalType === 'both';

  return (
    <Routes>
      {/* Returns Portal routes */}
      {showReturns && (
        <Route
          element={
            <ReturnsPortalLayout tenantOverride={resolution} />
          }
        >
          <Route index element={<PublicReturnPortalPage />} />
          <Route path="register" element={<PublicReturnRegisterPage />} />
          <Route path="track/:returnNumber?" element={<PublicReturnTrackingPage />} />
        </Route>
      )}

      {/* Customer Portal routes */}
      {showCustomer && (
        <Route
          path="portal"
          element={
            <CustomerPortalLayout tenantOverride={resolution} />
          }
        >
          <Route path="login" element={<CustomerLoginPage />} />
          <Route path="register" element={<CustomerRegisterPage />} />
          <Route path="auth/callback" element={<CustomerAuthCallbackPage />} />
          <Route element={<CustomerProtectedRoute />}>
            <Route index element={<CustomerDashboardPage />} />
            <Route path="returns" element={<CustomerReturnsListPage />} />
            <Route path="returns/new" element={<CustomerNewReturnPage />} />
            <Route path="returns/:id" element={<CustomerReturnDetailPage />} />
            <Route path="tickets" element={<CustomerTicketsListPage />} />
            <Route path="tickets/:id" element={<CustomerTicketDetailPage />} />
            <Route path="profile" element={<CustomerProfilePage />} />
          </Route>
        </Route>
      )}

      {/* Default redirects */}
      {portalType === 'customer' && (
        <Route index element={<Navigate to="/portal/login" replace />} />
      )}

      {/* Catch-all: redirect to root or portal */}
      <Route
        path="*"
        element={
          <Navigate
            to={portalType === 'customer' ? '/portal/login' : '/'}
            replace
          />
        }
      />
    </Routes>
  );
}
