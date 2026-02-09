import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { BrandingProvider, useBranding } from '@/contexts/BrandingContext';
import { BillingProvider } from '@/contexts/BillingContext';
import { useCustomDomainDetection } from '@/hooks/useCustomDomainDetection';
import { CustomDomainPortal } from '@/components/CustomDomainPortal';
import { DomainNotFoundPage } from '@/pages/DomainNotFoundPage';
import './index.css';

// --- Lazy page imports (code-split per route) ---

// Landing & Auth
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const ImprintPage = lazy(() => import('@/pages/ImprintPage').then(m => ({ default: m.ImprintPage })));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));

// Public DPP
const PublicLayout = lazy(() => import('@/pages/public/PublicLayout').then(m => ({ default: m.PublicLayout })));
const PublicCustomerPage = lazy(() => import('@/pages/public/PublicCustomerPage').then(m => ({ default: m.PublicCustomerPage })));
const PublicCustomsPage = lazy(() => import('@/pages/public/PublicCustomsPage').then(m => ({ default: m.PublicCustomsPage })));

// Returns Portal (public)
const ReturnsPortalLayout = lazy(() => import('@/pages/returns/public/ReturnsPortalLayout').then(m => ({ default: m.ReturnsPortalLayout })));
const PublicReturnPortalPage = lazy(() => import('@/pages/returns/public/PublicReturnPortalPage').then(m => ({ default: m.PublicReturnPortalPage })));
const PublicReturnRegisterPage = lazy(() => import('@/pages/returns/public/PublicReturnRegisterPage').then(m => ({ default: m.PublicReturnRegisterPage })));
const PublicReturnTrackingPage = lazy(() => import('@/pages/returns/public/PublicReturnTrackingPage').then(m => ({ default: m.PublicReturnTrackingPage })));

// Supplier Portal (public)
const SupplierPortalLayout = lazy(() => import('@/pages/suppliers/public/SupplierPortalLayout').then(m => ({ default: m.SupplierPortalLayout })));
const SupplierRegisterPage = lazy(() => import('@/pages/suppliers/public/SupplierRegisterPage').then(m => ({ default: m.SupplierRegisterPage })));
const SupplierRegisterSuccessPage = lazy(() => import('@/pages/suppliers/public/SupplierRegisterSuccessPage').then(m => ({ default: m.SupplierRegisterSuccessPage })));
const SupplierInvitationExpiredPage = lazy(() => import('@/pages/suppliers/public/SupplierInvitationExpiredPage').then(m => ({ default: m.SupplierInvitationExpiredPage })));

// Supplier Data Portal (public)
const SupplierDataPortalPage = lazy(() => import('@/pages/suppliers/public/SupplierDataPortalPage').then(m => ({ default: m.SupplierDataPortalPage })));
const SupplierDataSubmittedPage = lazy(() => import('@/pages/suppliers/public/SupplierDataSubmittedPage').then(m => ({ default: m.SupplierDataSubmittedPage })));

// Customer Portal
const CustomerPortalLayout = lazy(() => import('@/pages/customer/CustomerPortalLayout').then(m => ({ default: m.CustomerPortalLayout })));
const CustomerProtectedRoute = lazy(() => import('@/pages/customer/CustomerProtectedRoute').then(m => ({ default: m.CustomerProtectedRoute })));
const CustomerLoginPage = lazy(() => import('@/pages/customer/CustomerLoginPage').then(m => ({ default: m.CustomerLoginPage })));
const CustomerRegisterPage = lazy(() => import('@/pages/customer/CustomerRegisterPage').then(m => ({ default: m.CustomerRegisterPage })));
const CustomerAuthCallbackPage = lazy(() => import('@/pages/customer/CustomerAuthCallbackPage').then(m => ({ default: m.CustomerAuthCallbackPage })));
const CustomerDashboardPage = lazy(() => import('@/pages/customer/CustomerDashboardPage').then(m => ({ default: m.CustomerDashboardPage })));
const CustomerReturnsListPage = lazy(() => import('@/pages/customer/CustomerReturnsListPage').then(m => ({ default: m.CustomerReturnsListPage })));
const CustomerReturnDetailPage = lazy(() => import('@/pages/customer/CustomerReturnDetailPage').then(m => ({ default: m.CustomerReturnDetailPage })));
const CustomerNewReturnPage = lazy(() => import('@/pages/customer/CustomerNewReturnPage').then(m => ({ default: m.CustomerNewReturnPage })));
const CustomerTicketsListPage = lazy(() => import('@/pages/customer/CustomerTicketsListPage').then(m => ({ default: m.CustomerTicketsListPage })));
const CustomerTicketDetailPage = lazy(() => import('@/pages/customer/CustomerTicketDetailPage').then(m => ({ default: m.CustomerTicketDetailPage })));
const CustomerProfilePage = lazy(() => import('@/pages/customer/CustomerProfilePage').then(m => ({ default: m.CustomerProfilePage })));

// Admin Core
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProductsPage = lazy(() => import('@/pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const ProductPage = lazy(() => import('@/pages/ProductPage').then(m => ({ default: m.ProductPage })));
const ProductFormPage = lazy(() => import('@/pages/ProductFormPage').then(m => ({ default: m.ProductFormPage })));
const ProductCategoriesPage = lazy(() => import('@/pages/ProductCategoriesPage').then(m => ({ default: m.ProductCategoriesPage })));
const BatchFormPage = lazy(() => import('@/pages/BatchFormPage').then(m => ({ default: m.BatchFormPage })));
const BatchDetailPage = lazy(() => import('@/pages/BatchDetailPage').then(m => ({ default: m.BatchDetailPage })));
const DPPOverviewPage = lazy(() => import('@/pages/DPPOverviewPage').then(m => ({ default: m.DPPOverviewPage })));
const QRGeneratorPage = lazy(() => import('@/pages/QRGeneratorPage').then(m => ({ default: m.QRGeneratorPage })));
const DPPVisibilitySettingsPageV3 = lazy(() => import('@/pages/DPPVisibilitySettingsPageV3').then(m => ({ default: m.DPPVisibilitySettingsPageV3 })));
const DPPDesignPage = lazy(() => import('@/pages/DPPDesignPage').then(m => ({ default: m.DPPDesignPage })));
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage').then(m => ({ default: m.DocumentsPage })));
const SupplyChainPage = lazy(() => import('@/pages/SupplyChainPage').then(m => ({ default: m.SupplyChainPage })));
const SuppliersPage = lazy(() => import('@/pages/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const SupplierDetailPage = lazy(() => import('@/pages/SupplierDetailPage').then(m => ({ default: m.SupplierDetailPage })));
const SupplierInvitationsPage = lazy(() => import('@/pages/SupplierInvitationsPage').then(m => ({ default: m.SupplierInvitationsPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const BillingPage = lazy(() => import('@/pages/BillingPage').then(m => ({ default: m.BillingPage })));
// Admin Portal
const AdminGuard = lazy(() => import('@/components/admin/AdminGuard').then(m => ({ default: m.AdminGuard })));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminTenantsPage = lazy(() => import('@/pages/admin/AdminTenantsPage').then(m => ({ default: m.AdminTenantsPage })));
const AdminTenantDetailPage = lazy(() => import('@/pages/admin/AdminTenantDetailPage').then(m => ({ default: m.AdminTenantDetailPage })));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminBillingPage = lazy(() => import('@/pages/admin/AdminBillingPage').then(m => ({ default: m.AdminBillingPage })));
const AdminCreditsPage = lazy(() => import('@/pages/admin/AdminCreditsPage').then(m => ({ default: m.AdminCreditsPage })));
const AdminCouponsPage = lazy(() => import('@/pages/admin/AdminCouponsPage').then(m => ({ default: m.AdminCouponsPage })));
const AdminMasterDataPage = lazy(() => import('@/pages/admin/AdminMasterDataPage').then(m => ({ default: m.AdminMasterDataPage })));
const TrainingGuidePage = lazy(() => import('@/pages/TrainingGuidePage').then(m => ({ default: m.TrainingGuidePage })));
const NewsPage = lazy(() => import('@/pages/NewsPage').then(m => ({ default: m.NewsPage })));
const RequirementsCalculatorPage = lazy(() => import('@/pages/RequirementsCalculatorPage').then(m => ({ default: m.RequirementsCalculatorPage })));

// Compliance
const CompliancePage = lazy(() => import('@/pages/CompliancePage').then(m => ({ default: m.CompliancePage })));
const RegulationsPage = lazy(() => import('@/pages/RegulationsPage').then(m => ({ default: m.RegulationsPage })));
const ChecklistPage = lazy(() => import('@/pages/ChecklistPage').then(m => ({ default: m.ChecklistPage })));

// Returns Hub Admin
const ReturnsHubDashboardPage = lazy(() => import('@/pages/returns/ReturnsHubDashboardPage').then(m => ({ default: m.ReturnsHubDashboardPage })));
const ReturnsListPage = lazy(() => import('@/pages/returns/ReturnsListPage').then(m => ({ default: m.ReturnsListPage })));
const CreateReturnPage = lazy(() => import('@/pages/returns/CreateReturnPage').then(m => ({ default: m.CreateReturnPage })));
const ReturnDetailPage = lazy(() => import('@/pages/returns/ReturnDetailPage').then(m => ({ default: m.ReturnDetailPage })));
const CustomersListPage = lazy(() => import('@/pages/returns/CustomersListPage').then(m => ({ default: m.CustomersListPage })));
const CustomerDetailPage = lazy(() => import('@/pages/returns/CustomerDetailPage').then(m => ({ default: m.CustomerDetailPage })));
const TicketsListPage = lazy(() => import('@/pages/returns/TicketsListPage').then(m => ({ default: m.TicketsListPage })));
const TicketDetailPage = lazy(() => import('@/pages/returns/TicketDetailPage').then(m => ({ default: m.TicketDetailPage })));
const ReturnsReportsPage = lazy(() => import('@/pages/returns/ReturnsReportsPage').then(m => ({ default: m.ReturnsReportsPage })));
const ReturnsSettingsPage = lazy(() => import('@/pages/returns/ReturnsSettingsPage').then(m => ({ default: m.ReturnsSettingsPage })));
const WorkflowRulesPage = lazy(() => import('@/pages/returns/WorkflowRulesPage').then(m => ({ default: m.WorkflowRulesPage })));
const WorkflowBuilderPage = lazy(() => import('@/components/returns/workflow-builder/WorkflowBuilderPage').then(m => ({ default: m.WorkflowBuilderPage })));
const EmailTemplateEditorPage = lazy(() => import('@/components/returns/email-editor/EmailTemplateEditorPage').then(m => ({ default: m.EmailTemplateEditorPage })));

// Protected Route - redirects to login if not authenticated
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation('common');

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('Loading...')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
}

function AppLayout() {
  const { branding } = useBranding();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{branding.appName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  const { t } = useTranslation('common');
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-muted-foreground">{t('This page is under development')}</p>
      </div>
    </div>
  );
}

function CustomDomainGate() {
  const { t } = useTranslation('common');
  const { isCustomDomain, isResolving, resolution } = useCustomDomainDetection();

  if (isResolving) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('Loading...')}</p>
        </div>
      </div>
    );
  }

  if (isCustomDomain) {
    if (resolution) {
      return (
        <BrowserRouter>
          <CustomDomainPortal resolution={resolution} />
        </BrowserRouter>
      );
    }
    // Custom domain but not resolved (not found or error)
    return <DomainNotFoundPage />;
  }

  // Normal app routing
  return <NormalAppRoutes />;
}

function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
      </div>
    </div>
  );
}

function NormalAppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Landing Page */}
        <Route path="landing" element={<LandingPage />} />
        <Route path="imprint" element={<ImprintPage />} />
        <Route path="privacy" element={<PrivacyPolicyPage />} />

        {/* Login & Auth */}
        <Route path="login" element={<LoginPage />} />
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route path="auth/reset-password" element={<ResetPasswordPage />} />

        {/* Public pages without sidebar */}
        <Route element={<PublicLayout />}>
          <Route path="p/:gtin/:serial" element={<PublicCustomerPage />} />
          <Route path="01/:gtin/21/:serial" element={<PublicCustomerPage />} />
          <Route path="p/:gtin/:serial/customs" element={<PublicCustomsPage />} />
          <Route path="01/:gtin/21/:serial/customs" element={<PublicCustomsPage />} />
        </Route>

        {/* Public Returns Portal (no auth, shared layout) */}
        <Route element={<ReturnsPortalLayout />}>
          <Route path="returns/portal/:tenantSlug" element={<PublicReturnPortalPage />} />
          <Route path="returns/register/:tenantSlug" element={<PublicReturnRegisterPage />} />
        </Route>

        {/* Standalone tracking page (loads branding dynamically) */}
        <Route path="returns/track/:returnNumber?" element={<PublicReturnTrackingPage />} />

        {/* Public Supplier Portal (no auth, invitation-based) */}
        <Route path="suppliers/register/:invitationCode" element={<SupplierPortalLayout />}>
          <Route index element={<SupplierRegisterPage />} />
          <Route path="success" element={<SupplierRegisterSuccessPage />} />
          <Route path="expired" element={<SupplierInvitationExpiredPage />} />
        </Route>

        {/* Public Supplier Data Portal (no auth, password-protected) */}
        <Route path="suppliers/data/:accessCode" element={<SupplierDataPortalPage />} />
        <Route path="suppliers/data/:accessCode/submitted" element={<SupplierDataSubmittedPage />} />

        {/* Customer Portal (tenant-branded, own auth) */}
        <Route path="customer/:tenantSlug" element={<CustomerPortalLayout />}>
          {/* Public customer pages (no customer auth needed) */}
          <Route path="login" element={<CustomerLoginPage />} />
          <Route path="register" element={<CustomerRegisterPage />} />
          <Route path="auth/callback" element={<CustomerAuthCallbackPage />} />

          {/* Protected customer pages */}
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

        {/* Admin area with sidebar (protected) */}
        <Route element={<ProtectedRoute />}>
          <Route index element={<DashboardPage />} />

          {/* Products */}
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/categories" element={<ProductCategoriesPage />} />
          <Route path="products/:id" element={<ProductPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />
          <Route path="products/:id/batches/new" element={<BatchFormPage />} />
          <Route path="products/:id/batches/:batchId" element={<BatchDetailPage />} />
          <Route path="products/:id/batches/:batchId/edit" element={<BatchFormPage />} />

          {/* DPP / Passports */}
          <Route path="dpp" element={<DPPOverviewPage />} />
          <Route path="dpp/qr-generator" element={<QRGeneratorPage />} />
          <Route path="dpp/visibility" element={<DPPVisibilitySettingsPageV3 />} />
          <Route path="dpp/design" element={<DPPDesignPage />} />
          <Route path="dpp/batch-upload" element={<PlaceholderPage title="Batch-Upload" />} />

          {/* Documents */}
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="documents/upload" element={<DocumentsPage />} />
          <Route path="documents/tracker" element={<DocumentsPage />} />

          {/* Supply Chain */}
          <Route path="supply-chain" element={<SupplyChainPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="suppliers/invitations" element={<SupplierInvitationsPage />} />
          <Route path="suppliers/:id" element={<SupplierDetailPage />} />

          {/* Returns Hub */}
          <Route path="returns" element={<ReturnsHubDashboardPage />} />
          <Route path="returns/list" element={<ReturnsListPage />} />
          <Route path="returns/new" element={<CreateReturnPage />} />
          <Route path="returns/:id" element={<ReturnDetailPage />} />
          <Route path="returns/customers" element={<CustomersListPage />} />
          <Route path="returns/customers/:id" element={<CustomerDetailPage />} />
          <Route path="returns/tickets" element={<TicketsListPage />} />
          <Route path="returns/tickets/:id" element={<TicketDetailPage />} />
          <Route path="returns/reports" element={<ReturnsReportsPage />} />
          <Route path="returns/settings" element={<ReturnsSettingsPage />} />
          <Route path="returns/email-templates" element={<EmailTemplateEditorPage />} />
          <Route path="returns/workflows" element={<WorkflowRulesPage />} />
          <Route path="returns/workflows/:id/builder" element={<WorkflowBuilderPage />} />

          {/* Compliance */}
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="compliance/export" element={<CompliancePage />} />
          <Route path="compliance/audit-log" element={<CompliancePage />} />

          {/* Regulations & Checklists */}
          <Route path="news" element={<NewsPage />} />
          <Route path="regulations" element={<RegulationsPage />} />
          <Route path="regulations/countries" element={<RegulationsPage />} />
          <Route path="regulations/eu" element={<RegulationsPage />} />
          <Route path="regulations/pictograms" element={<RegulationsPage />} />
          <Route path="regulations/news" element={<RegulationsPage />} />
          <Route path="checklists" element={<ChecklistPage />} />
          <Route path="checklists/:country" element={<ChecklistPage />} />
          <Route path="requirements-calculator" element={<RequirementsCalculatorPage />} />

          {/* Settings */}
          <Route path="settings/company" element={<SettingsPage tab="company" />} />
          <Route path="settings/branding" element={<SettingsPage tab="branding" />} />
          <Route path="settings/users" element={<SettingsPage tab="users" />} />
          <Route path="settings/api-keys" element={<SettingsPage tab="api" />} />
          <Route path="settings/billing" element={<BillingPage />} />

          {/* Help */}
          <Route path="help" element={<TrainingGuidePage />} />

          {/* Admin Portal (Super Admin only) */}
          <Route path="admin" element={<AdminGuard />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="tenants" element={<AdminTenantsPage />} />
            <Route path="tenants/:tenantId" element={<AdminTenantDetailPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="billing" element={<AdminBillingPage />} />
            <Route path="credits" element={<AdminCreditsPage />} />
            <Route path="coupons" element={<AdminCouponsPage />} />
            <Route path="master-data" element={<AdminMasterDataPage />} />
          </Route>
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <BillingProvider>
        <BrandingProvider>
          <CustomDomainGate />
        </BrandingProvider>
      </BillingProvider>
    </AuthProvider>
  );
}

export default App;
