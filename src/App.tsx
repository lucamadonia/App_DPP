import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
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
import { PublicProductPage } from '@/pages/public/PublicProductPage';
import './index.css';

function AppLayout() {
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
                <BreadcrumbPage>DPP Manager</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-muted-foreground">Diese Seite ist in Entwicklung</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Öffentliche Seiten ohne Sidebar */}
        <Route element={<PublicLayout />}>
          <Route path="p/:gtin/:serial" element={<PublicProductPage />} />
          <Route path="01/:gtin/21/:serial" element={<PublicProductPage />} />
        </Route>

        {/* Admin-Bereich mit Sidebar */}
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />

          {/* Produkte */}
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/categories" element={<ProductCategoriesPage />} />
          <Route path="products/:id" element={<ProductPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />

          {/* DPP / Pässe */}
          <Route path="dpp" element={<DPPOverviewPage />} />
          <Route path="dpp/qr-generator" element={<QRGeneratorPage />} />
          <Route path="dpp/visibility" element={<DPPVisibilitySettingsPage />} />
          <Route path="dpp/batch-upload" element={<PlaceholderPage title="Batch-Upload" />} />

          {/* Dokumente */}
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="documents/upload" element={<DocumentsPage />} />
          <Route path="documents/tracker" element={<DocumentsPage />} />

          {/* Lieferkette */}
          <Route path="supply-chain" element={<PlaceholderPage title="Lieferkette (Phase 2)" />} />

          {/* Compliance */}
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="compliance/export" element={<CompliancePage />} />
          <Route path="compliance/audit-log" element={<CompliancePage />} />

          {/* Regulierungen & Checklisten */}
          <Route path="regulations" element={<RegulationsPage />} />
          <Route path="regulations/countries" element={<RegulationsPage />} />
          <Route path="regulations/eu" element={<RegulationsPage />} />
          <Route path="regulations/pictograms" element={<RegulationsPage />} />
          <Route path="regulations/news" element={<RegulationsPage />} />
          <Route path="checklists" element={<ChecklistPage />} />
          <Route path="checklists/:country" element={<ChecklistPage />} />
          <Route path="requirements-calculator" element={<RequirementsCalculatorPage />} />

          {/* Einstellungen */}
          <Route path="settings/company" element={<SettingsPage tab="company" />} />
          <Route path="settings/branding" element={<SettingsPage tab="branding" />} />
          <Route path="settings/users" element={<SettingsPage tab="users" />} />
          <Route path="settings/api-keys" element={<SettingsPage tab="api" />} />

          {/* Hilfe */}
          <Route path="help" element={<PlaceholderPage title="Hilfe & Support" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
