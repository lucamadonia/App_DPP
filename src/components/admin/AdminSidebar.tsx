/**
 * Admin-dedicated sidebar: compact, power-user-oriented,
 * grouped by frequency of use.
 */
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, CreditCard, LifeBuoy, TrendingUp,
  ToggleRight, ScrollText, ServerCog, Database, Ticket as TicketIcon,
  ArrowLeft, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}
interface NavSection {
  label: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    label: 'Command-Center',
    items: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
      { to: '/admin/tenants', label: 'Tenants', icon: Building2 },
      { to: '/admin/users', label: 'Benutzer', icon: Users },
      { to: '/admin/billing', label: 'Billing & Revenue', icon: CreditCard },
    ],
  },
  {
    label: 'Betrieb',
    items: [
      { to: '/admin/support', label: 'Support', icon: LifeBuoy },
      { to: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
      { to: '/admin/system', label: 'System', icon: ServerCog },
    ],
  },
  {
    label: 'Steuerung',
    items: [
      { to: '/admin/feature-flags', label: 'Feature Flags', icon: ToggleRight },
      { to: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
      { to: '/admin/coupons', label: 'Coupons', icon: TicketIcon },
      { to: '/admin/master-data', label: 'Stammdaten', icon: Database },
    ],
  },
];

export function AdminSidebar() {
  const { pathname } = useLocation();

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return pathname === to;
    return pathname === to || pathname.startsWith(to + '/');
  };

  return (
    <aside className="hidden md:flex md:flex-col w-[220px] shrink-0 border-r bg-slate-950 text-slate-100">
      <div className="px-4 pt-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-red-400" />
          <span className="font-bold tracking-wide">ADMIN-HUB</span>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Super-Admin</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {section.label}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.to, item.exact);
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer',
                        active
                          ? 'bg-red-500/15 text-red-100 font-medium ring-1 ring-red-500/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-red-300' : 'text-slate-400')} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <Link
          to="/"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurück zur App
        </Link>
      </div>
    </aside>
  );
}
