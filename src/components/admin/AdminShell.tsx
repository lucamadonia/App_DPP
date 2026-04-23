/**
 * AdminShell — separate layout for the super-admin portal.
 * Dark slate theme, dedicated sidebar, impersonation banner at top.
 * Child routes render in the Outlet.
 */
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, ArrowLeft, Shield } from 'lucide-react';
import { useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function AdminShell() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Derive breadcrumb text from path
  const crumb = (() => {
    const map: Record<string, string> = {
      '/admin': 'Overview',
      '/admin/tenants': 'Tenants',
      '/admin/users': 'Benutzer',
      '/admin/billing': 'Billing & Revenue',
      '/admin/support': 'Support',
      '/admin/analytics': 'Analytics',
      '/admin/system': 'System',
      '/admin/feature-flags': 'Feature Flags',
      '/admin/audit-log': 'Audit Log',
      '/admin/coupons': 'Coupons',
      '/admin/master-data': 'Stammdaten',
      '/admin/credits': 'Credits',
    };
    if (map[pathname]) return map[pathname];
    // match longest prefix
    const entry = Object.entries(map).find(([k]) => pathname.startsWith(k + '/'));
    return entry ? entry[1] : 'Admin';
  })();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <ImpersonationBanner />

      <div className="flex flex-1 min-h-0">
        <AdminSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b bg-white dark:bg-slate-950 px-4 shadow-sm">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[220px] bg-slate-950 text-slate-100 border-0">
                <AdminSidebar />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <Shield className="h-4 w-4 text-red-500 shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">Admin</span>
              <span className="text-muted-foreground">/</span>
              <span className="truncate">{crumb}</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
                <Link to="/">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">Zurück zur App</span>
                </Link>
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
