import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, MessageSquare, Plus, User, LogOut, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';

export function CustomerNav() {
  const { t } = useTranslation('customer-portal');
  const { tenantSlug, branding, portalSettings, signOut } = useCustomerPortal();

  const base = `/customer/${tenantSlug}`;
  const primaryColor = branding.primaryColor;

  const links = [
    { to: base, icon: LayoutDashboard, label: t('Dashboard'), end: true },
    { to: `${base}/returns`, icon: Package, label: t('My Returns'), end: false },
    { to: `${base}/tickets`, icon: MessageSquare, label: t('My Tickets'), end: false },
    { to: `${base}/profile`, icon: User, label: t('My Profile'), end: false },
  ];

  return (
    <nav className="flex flex-col gap-1 p-3">
      {/* New Return CTA */}
      <NavLink to={`${base}/returns/new`}>
        <Button className="w-full mb-2 gap-2" size="sm" style={{ backgroundColor: primaryColor }}>
          <Plus className="h-4 w-4" />
          {t('New Return')}
        </Button>
      </NavLink>

      {/* Create Ticket CTA */}
      {portalSettings.features.createTickets && (
        <NavLink to={`${base}/tickets`} state={{ openNewTicket: true }}>
          <Button variant="outline" className="w-full mb-3 gap-2" size="sm">
            <HelpCircle className="h-4 w-4" />
            {t('Create Ticket')}
          </Button>
        </NavLink>
      )}

      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`
          }
        >
          <link.icon className="h-4 w-4" />
          {link.label}
        </NavLink>
      ))}

      <div className="mt-auto pt-4 border-t">
        <button
          onClick={signOut}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          {t('Sign Out')}
        </button>
      </div>
    </nav>
  );
}
