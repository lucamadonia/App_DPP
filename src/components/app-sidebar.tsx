import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Package,
  FolderArchive,
  Link2,
  ShieldCheck,
  Settings,
  HelpCircle,
  QrCode,
  FolderKanban,
  Users,
  Key,
  Building2,
  ChevronDown,
  Globe,
  ClipboardCheck,
  Calculator,
  Shield,
  LogOut,
  Newspaper,
  RotateCcw,
  CreditCard,
  Sparkles,
  Ticket,
  Database,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useBillingOptional } from '@/contexts/BillingContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isSuperAdmin } = useAuth();
  const { branding } = useBranding();
  const billing = useBillingOptional();
  const { t } = useTranslation('common');

  const mainNavItems = useMemo(() => [
    {
      title: t('Dashboard'),
      url: '/',
      icon: LayoutDashboard,
    },
    {
      title: t('Products'),
      icon: Package,
      items: [
        { title: t('All Products'), url: '/products' },
        { title: t('Create New'), url: '/products/new' },
        { title: t('Categories'), url: '/products/categories' },
      ],
    },
    {
      title: t('DPP / Passports'),
      icon: QrCode,
      items: [
        { title: t('Overview'), url: '/dpp' },
        { title: t('QR Generator'), url: '/dpp/qr-generator' },
        { title: t('Visibility'), url: '/dpp/visibility' },
        { title: t('Design'), url: '/dpp/design' },
        { title: t('Batch Upload'), url: '/dpp/batch-upload' },
      ],
    },
    {
      title: t('Documents'),
      icon: FolderArchive,
      items: [
        { title: t('All Documents'), url: '/documents' },
        { title: t('Upload'), url: '/documents/upload' },
        { title: t('Validity Tracker'), url: '/documents/tracker' },
      ],
    },
    {
      title: t('Supply Chain'),
      url: '/supply-chain',
      icon: Link2,
      badge: t('Phase 2'),
    },
    {
      title: t('Suppliers'),
      url: '/suppliers',
      icon: Users,
    },
    {
      title: t('Returns Hub'),
      icon: RotateCcw,
      items: [
        { title: t('Dashboard'), url: '/returns' },
        { title: t('Returns'), url: '/returns/list' },
        { title: t('Customers'), url: '/returns/customers' },
        { title: t('Tickets'), url: '/returns/tickets' },
        { title: t('Reports'), url: '/returns/reports' },
        { title: t('Workflows'), url: '/returns/workflows' },
        { title: t('Settings'), url: '/returns/settings' },
      ],
    },
    {
      title: t('Compliance'),
      icon: ShieldCheck,
      items: [
        { title: t('Audit Report'), url: '/compliance' },
        { title: t('Export'), url: '/compliance/export' },
        { title: t('Audit Log'), url: '/compliance/audit-log' },
      ],
    },
    {
      title: t('Regulations'),
      icon: Globe,
      items: [
        { title: t('Countries'), url: '/regulations/countries' },
        { title: t('EU Regulations'), url: '/regulations/eu' },
        { title: t('Pictograms'), url: '/regulations/pictograms' },
      ],
    },
    {
      title: t('News'),
      url: '/news',
      icon: Newspaper,
    },
    {
      title: t('Checklists'),
      url: '/checklists',
      icon: ClipboardCheck,
    },
    {
      title: t('Requirements Calculator'),
      url: '/requirements-calculator',
      icon: Calculator,
      badge: t('New'),
    },
  ], [t]);

  const settingsNavItems = useMemo(() => [
    {
      title: t('Settings'),
      icon: Settings,
      items: [
        { title: t('Company Profile'), url: '/settings/company', icon: Building2 },
        { title: t('Branding'), url: '/settings/branding', icon: FolderKanban },
        { title: t('Users & Roles'), url: '/settings/users', icon: Users },
        { title: t('API Keys'), url: '/settings/api-keys', icon: Key },
        { title: t('Billing'), url: '/settings/billing', icon: CreditCard },
      ],
    },
    ...(isSuperAdmin ? [{
      title: t('Admin'),
      icon: Shield,
      items: [
        { title: t('Dashboard'), url: '/admin', icon: LayoutDashboard },
        { title: t('Tenants'), url: '/admin/tenants', icon: Building2 },
        { title: t('Users'), url: '/admin/users', icon: Users },
        { title: t('Billing'), url: '/admin/billing', icon: CreditCard },
        { title: t('Credits'), url: '/admin/credits', icon: Sparkles },
        { title: t('Coupons'), url: '/admin/coupons', icon: Ticket },
        { title: t('Master Data'), url: '/admin/master-data', icon: Database },
      ],
    }] : []),
    {
      title: t('Help & Support'),
      url: '/help',
      icon: HelpCircle,
    },
  ], [t, isSuperAdmin]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userEmail = user?.email || '';
  const userName = user?.name || userEmail.split('@')[0] || 'User';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link to="/" className="flex items-center">
          <img
            src={branding.logo || '/trackbliss-logo.png'}
            alt={branding.appName}
            className="h-12 object-contain"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('Main Menu')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) =>
                item.items ? (
                  <Collapsible key={item.title} defaultOpen className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActive(subItem.url)}
                              >
                                <Link to={subItem.url}>{subItem.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url!)}>
                      <Link to={item.url!}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.badge && (
                          <span className="ml-auto rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t('System')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) =>
                item.items ? (
                  <Collapsible key={item.title} className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActive(subItem.url)}
                              >
                                <Link to={subItem.url}>
                                  {subItem.icon && <subItem.icon className="h-3 w-3" />}
                                  {subItem.title}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url!)}>
                      <Link to={item.url!}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {/* Credit Badge */}
        {billing?.entitlements && (
          <Link
            to="/settings/billing"
            className="mb-2 flex items-center justify-between rounded-md bg-sidebar-accent/50 px-3 py-1.5 text-xs transition-colors hover:bg-sidebar-accent"
          >
            <span className="flex items-center gap-1.5 text-sidebar-foreground/70">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-medium tabular-nums">{billing.entitlements.credits.totalAvailable}</span>
              <span>Credits</span>
            </span>
            <Badge className="h-5 text-[10px] px-1.5 capitalize bg-sidebar-accent text-sidebar-foreground/70">
              {billing.entitlements.plan}
            </Badge>
          </Link>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">
                {userName}
              </span>
              <span className="text-xs text-sidebar-foreground/60 max-w-[140px] truncate">
                {userEmail}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground"
              title={t('Sign Out')}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
