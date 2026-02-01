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
import { useCustomDomainDetection } from '@/hooks/useCustomDomainDetection';
import { CustomDomainPortal } from '@/components/CustomDomainPortal';
import { DomainNotFoundPage } from '@/pages/DomainNotFoundPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { ProductPage } from '@/pages/ProductPage';
import { ProductFormPage } from '@/pages/ProductFormPage';
import { DPPOverviewPage } from '@/pages/DPPOverviewPage';
import { QRGeneratorPage } from '@/pages/QRGeneratorPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { CompliancePage } from '@/pages/CompliancePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { RegulationsPage } from '@/pages/RegulationsPage';
import { ChecklistPage } from '@/pages/ChecklistPage';
import { RequirementsCalculatorPage } from '@/pages/RequirementsCalculatorPage';
import { ProductCategoriesPage } from '@/pages/ProductCategoriesPage';
import { DPPVisibilitySettingsPage } from '@/pages/DPPVisibilitySettingsPage';
import { PublicLayout } from '@/pages/public/PublicLayout';
import { PublicCustomerPage } from '@/pages/public/PublicCustomerPage';
import { PublicCustomsPage } from '@/pages/public/PublicCustomsPage';
import { LoginPage } from '@/pages/LoginPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { AdminPage } from '@/pages/AdminPage';
import { NewsPage } from '@/pages/NewsPage';
import { SupplyChainPage } from '@/pages/SupplyChainPage';
import { SuppliersPage } from '@/pages/SuppliersPage';
import { BatchFormPage } from '@/pages/BatchFormPage';
import { BatchDetailPage } from '@/pages/BatchDetailPage';
import { ReturnsHubDashboardPage } from '@/pages/returns/ReturnsHubDashboardPage';
import { ReturnsListPage } from '@/pages/returns/ReturnsListPage';
import { CreateReturnPage } from '@/pages/returns/CreateReturnPage';
import { ReturnDetailPage } from '@/pages/returns/ReturnDetailPage';
import { CustomersListPage } from '@/pages/returns/CustomersListPage';
import { CustomerDetailPage } from '@/pages/returns/CustomerDetailPage';
import { TicketsListPage } from '@/pages/returns/TicketsListPage';
import { TicketDetailPage } from '@/pages/returns/TicketDetailPage';
import { ReturnsReportsPage } from '@/pages/returns/ReturnsReportsPage';
import { ReturnsSettingsPage } from '@/pages/returns/ReturnsSettingsPage';
import { WorkflowRulesPage } from '@/pages/returns/WorkflowRulesPage';
import { WorkflowBuilderPage } from '@/components/returns/workflow-builder/WorkflowBuilderPage';
import { EmailTemplateEditorPage } from '@/components/returns/email-editor/EmailTemplateEditorPage';
import { ReturnsPortalLayout } from '@/pages/returns/public/ReturnsPortalLayout';
import { PublicReturnPortalPage } from '@/pages/returns/public/PublicReturnPortalPage';
import { PublicReturnRegisterPage } from '@/pages/returns/public/PublicReturnRegisterPage';
import { PublicReturnTrackingPage } from '@/pages/returns/public/PublicReturnTrackingPage';
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
import './index.css';

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

function NormalAppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
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
          <Route path="returns/track/:returnNumber?" element={<PublicReturnTrackingPage />} />
        </Route>

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
          <Route path="dpp/visibility" element={<DPPVisibilitySettingsPage />} />
          <Route path="dpp/batch-upload" element={<PlaceholderPage title="Batch-Upload" />} />

          {/* Documents */}
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="documents/upload" element={<DocumentsPage />} />
          <Route path="documents/tracker" element={<DocumentsPage />} />

          {/* Supply Chain */}
          <Route path="supply-chain" element={<SupplyChainPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />

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

          {/* Help */}
          <Route path="help" element={<PlaceholderPage title="Help & Support" />} />

          {/* Admin */}
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrandingProvider>
        <CustomDomainGate />
      </BrandingProvider>
    </AuthProvider>
  );
}

export default App;
