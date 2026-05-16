import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { spring } from '@/lib/motion';
import {
  LayoutDashboard,
  Package,
  FolderArchive,
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
  Shield,
  LogOut,
  RotateCcw,
  CreditCard,
  Sparkles,
  Ticket,
  Database,
  Sun,
  Moon,
  Lock,
  Warehouse,
  Heart,
  Megaphone,
  BookOpen,
  Handshake,
  Store,
  History,
  MessageCircleHeart,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useBillingOptional } from '@/contexts/BillingContext';
import { useTheme } from '@/hooks/use-theme';
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
  const { resolvedTheme, toggleTheme } = useTheme();
  const { t } = useTranslation('common');
  const prefersReduced = useReducedMotion();

  type NavItem = {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    url?: string;
    badge?: string;
    locked?: boolean;
    items?: { title: string; url: string }[];
  };
  type NavGroup = { label: string; items: NavItem[] };

  const navGroups = useMemo<NavGroup[]>(() => [
    {
      label: t('Start'),
      items: [
        { title: t('Dashboard'), url: '/', icon: LayoutDashboard },
      ],
    },
    {
      label: t('Tagesgeschäft'),
      items: [
        {
          title: t('Lager & Versand'),
          icon: Warehouse,
          locked: billing ? !billing.hasAnyWarehouseModule() : false,
          items: [
            { title: t('Dashboard'), url: '/warehouse' },
            { title: t('Scanner', { ns: 'warehouse' }), url: '/warehouse/scanner' },
            { title: t('Inventory', { ns: 'warehouse' }), url: '/warehouse/inventory' },
            { title: t('Goods Receipt', { ns: 'warehouse' }), url: '/warehouse/goods-receipt' },
            { title: t('Outstanding Goods Receipts', { ns: 'warehouse' }), url: '/warehouse/outstanding-receipts' },
            { title: t('Stocktake', { ns: 'warehouse' }), url: '/warehouse/stocktake' },
            { title: t('Shipments', { ns: 'warehouse' }), url: '/warehouse/shipments' },
            { title: t('Umverpackung', { ns: 'warehouse' }), url: '/warehouse/packaging-types' },
            { title: t('Transfers', { ns: 'warehouse' }), url: '/warehouse/transfers' },
            { title: t('Bewegungen & Auswertung', { ns: 'warehouse' }), url: '/warehouse/movements' },
            { title: t('Reports & Analytics', { ns: 'warehouse' }), url: '/warehouse/reports' },
            { title: t('Warehouse Locations', { ns: 'warehouse' }), url: '/warehouse/locations' },
            { title: t('Contacts', { ns: 'warehouse' }), url: '/warehouse/contacts' },
            { title: t('Shopify', { ns: 'warehouse' }), url: '/warehouse/integrations/shopify' },
            { title: t('DHL', { ns: 'warehouse' }), url: '/warehouse/integrations/dhl' },
            { title: t('AI Logistics Hub', { ns: 'warehouse' }), url: '/warehouse/ai' },
            { title: t('Settings'), url: '/warehouse/settings' },
          ],
        },
        {
          title: t('CRM'),
          icon: Heart,
          items: [
            { title: t('Dashboard'), url: '/crm' },
            { title: t('Kundenliste', { ns: 'warehouse' }), url: '/crm/customers' },
          ],
        },
        {
          title: t('Commerce Hub', { ns: 'commerce' }),
          icon: Store,
          locked: billing ? !billing.hasAnyCommerceHubModule() : false,
          badge: 'NEU',
          items: [
            { title: t('Channels', { ns: 'commerce' }), url: '/commerce' },
            { title: t('Mega Dashboard', { ns: 'commerce' }), url: '/commerce/mega' },
            { title: t('All Orders', { ns: 'commerce' }), url: '/commerce/orders' },
          ],
        },
        {
          title: t('Retouren & Support'),
          icon: RotateCcw,
          locked: billing ? !billing.hasAnyReturnsHubModule() : false,
          items: [
            { title: t('Dashboard'), url: '/returns' },
            { title: t('Returns'), url: '/returns/list' },
            { title: t('Tickets'), url: '/returns/tickets' },
            { title: t('Reports'), url: '/returns/reports' },
            { title: t('Workflows'), url: '/returns/workflows' },
            { title: t('Settings'), url: '/returns/settings' },
          ],
        },
        {
          title: t('Feedback'),
          icon: MessageCircleHeart,
          locked: billing ? !billing.hasAnyFeedbackModule() : false,
          badge: 'NEU',
          items: [
            { title: t('Queue'), url: '/feedback/queue' },
            { title: t('Idea Board'), url: '/feedback/ideas' },
            { title: t('Partner Invites'), url: '/feedback/invites' },
            { title: t('Settings'), url: '/feedback/settings' },
          ],
        },
      ],
    },
    {
      label: t('Sortiment'),
      items: [
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
            { title: t('Transparency Page'), url: '/dpp/transparency' },
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
      ],
    },
    {
      label: t('Partner'),
      items: [
        {
          title: t('Influencer Hub', { ns: 'warehouse' }),
          icon: Megaphone,
          items: [
            { title: t('Dashboard'), url: '/warehouse/influencer-hub' },
            { title: t('Influencer Directory', { ns: 'warehouse' }), url: '/warehouse/influencer-directory' },
            { title: t('Campaigns', { ns: 'warehouse' }), url: '/warehouse/campaigns' },
            { title: t('Content Gallery', { ns: 'warehouse' }), url: '/warehouse/content-gallery' },
            { title: t('Sample Tracking', { ns: 'warehouse' }), url: '/warehouse/samples' },
            { title: t('Analytics', { ns: 'warehouse' }), url: '/warehouse/influencer-analytics' },
          ],
        },
        {
          title: t('Lieferanten'),
          icon: Handshake,
          locked: billing ? !billing.hasModule('supplier_portal') && billing.entitlements?.plan === 'free' : false,
          items: [
            { title: t('Alle Lieferanten'), url: '/suppliers' },
            { title: t('Lieferkette'), url: '/supply-chain' },
          ],
        },
      ],
    },
    {
      label: t('Compliance & Ressourcen'),
      items: [
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
            { title: t('Pictograms'), url: '/pictograms' },
          ],
        },
        {
          title: t('Wissen'),
          icon: BookOpen,
          items: [
            { title: t('Checklists'), url: '/checklists' },
            { title: t('Requirements Calculator'), url: '/requirements-calculator' },
            { title: t('News'), url: '/news' },
          ],
        },
      ],
    },
  ], [t, billing]);

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
        { title: t('Activity Log'), url: '/settings/activity-log', icon: History },
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

  // Auto-expand collapsible sections that contain the active route
  const hasActiveChild = (items: { url: string }[]) =>
    items.some((item) => isActive(item.url));

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
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
              {group.items.map((item) =>
                item.items ? (
                  <Collapsible key={item.title} defaultOpen={hasActiveChild(item.items)} className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <item.icon className="h-4 w-4 transition-colors" />
                          <span>{item.title}</span>
                          {item.locked ? (
                            <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />
                          ) : (
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="animate-in fade-in-0 slide-in-from-top-1 duration-200">
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
                  <SidebarMenuItem key={item.title} className="relative">
                    {!prefersReduced && isActive(item.url!) && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-md bg-sidebar-accent"
                        transition={spring.snappy}
                      />
                    )}
                    <SidebarMenuButton asChild isActive={isActive(item.url!)} className="relative z-10">
                      <Link to={item.url!}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.locked && (
                          <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />
                        )}
                        {!item.locked && item.badge && (
                          <span className="ml-auto rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary animate-pulse">
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
        ))}

        <SidebarGroup>
          <SidebarGroupLabel>{t('System')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) =>
                item.items ? (
                  <Collapsible key={item.title} defaultOpen={hasActiveChild(item.items)} className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <item.icon className="h-4 w-4 transition-colors" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="animate-in fade-in-0 slide-in-from-top-1 duration-200">
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
                  <SidebarMenuItem key={item.title} className="relative">
                    {!prefersReduced && isActive(item.url!) && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-md bg-sidebar-accent"
                        transition={spring.snappy}
                      />
                    )}
                    <SidebarMenuButton asChild isActive={isActive(item.url!)} className="relative z-10">
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
          <motion.div
            animate={prefersReduced ? undefined : {
              boxShadow: [
                '0 0 0px rgba(59,130,246,0)',
                '0 0 8px rgba(59,130,246,0.15)',
                '0 0 0px rgba(59,130,246,0)',
              ],
            }}
            transition={prefersReduced ? undefined : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="mb-2 rounded-md"
          >
            <Link
              to="/settings/billing"
              className="flex items-center justify-between rounded-md bg-sidebar-accent/50 px-3 py-1.5 text-xs transition-colors hover:bg-sidebar-accent"
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
          </motion.div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={prefersReduced ? undefined : { scale: 1.08 }}
              whileTap={prefersReduced ? undefined : { scale: 0.95 }}
              transition={spring.snappy}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </motion.div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">
                {userName}
              </span>
              <span className="text-xs text-sidebar-foreground/60 max-w-[min(60vw,200px)] truncate">
                {userEmail}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground"
              title={resolvedTheme === 'dark' ? t('Light Mode') : t('Dark Mode')}
              aria-label={resolvedTheme === 'dark' ? t('Switch to light mode') : t('Switch to dark mode')}
            >
              {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <LanguageSwitcher />
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="h-8 gap-1.5 px-2 text-sidebar-foreground/60 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/30"
              title={t('Sign Out')}
            >
              <LogOut className="h-4 w-4" />
              <span className="text-xs">{t('Sign Out')}</span>
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
