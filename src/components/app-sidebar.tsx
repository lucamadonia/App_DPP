import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FileText,
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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { Button } from '@/components/ui/button';

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

const mainNavItems = [
  {
    title: 'Dashboard',
    url: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Produkte',
    icon: Package,
    items: [
      { title: 'Alle Produkte', url: '/products' },
      { title: 'Neu anlegen', url: '/products/new' },
      { title: 'Kategorien', url: '/products/categories' },
    ],
  },
  {
    title: 'DPP / Pässe',
    icon: QrCode,
    items: [
      { title: 'Übersicht', url: '/dpp' },
      { title: 'QR-Generator', url: '/dpp/qr-generator' },
      { title: 'Sichtbarkeit', url: '/dpp/visibility' },
      { title: 'Batch-Upload', url: '/dpp/batch-upload' },
    ],
  },
  {
    title: 'Dokumente',
    icon: FolderArchive,
    items: [
      { title: 'Alle Dokumente', url: '/documents' },
      { title: 'Hochladen', url: '/documents/upload' },
      { title: 'Gültigkeits-Tracker', url: '/documents/tracker' },
    ],
  },
  {
    title: 'Lieferkette',
    url: '/supply-chain',
    icon: Link2,
    badge: 'Phase 2',
  },
  {
    title: 'Lieferanten',
    url: '/suppliers',
    icon: Users,
  },
  {
    title: 'Compliance',
    icon: ShieldCheck,
    items: [
      { title: 'Prüfprotokoll', url: '/compliance' },
      { title: 'Export', url: '/compliance/export' },
      { title: 'Audit-Log', url: '/compliance/audit-log' },
    ],
  },
  {
    title: 'Regulierungen',
    icon: Globe,
    items: [
      { title: 'Länder', url: '/regulations/countries' },
      { title: 'EU-Regulierungen', url: '/regulations/eu' },
      { title: 'Piktogramme', url: '/regulations/pictograms' },
      { title: 'News', url: '/regulations/news' },
    ],
  },
  {
    title: 'Checklisten',
    url: '/checklists',
    icon: ClipboardCheck,
  },
  {
    title: 'Anforderungs-Kalkulator',
    url: '/requirements-calculator',
    icon: Calculator,
    badge: 'Neu',
  },
];

const settingsNavItems = [
  {
    title: 'Einstellungen',
    icon: Settings,
    items: [
      { title: 'Firmenprofil', url: '/settings/company', icon: Building2 },
      { title: 'Branding', url: '/settings/branding', icon: FolderKanban },
      { title: 'Benutzer & Rollen', url: '/settings/users', icon: Users },
      { title: 'API-Keys', url: '/settings/api-keys', icon: Key },
    ],
  },
  {
    title: 'Admin Dashboard',
    url: '/admin',
    icon: Shield,
  },
  {
    title: 'Hilfe & Support',
    url: '/help',
    icon: HelpCircle,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { branding } = useBranding();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userEmail = user?.email || '';
  const userName = user?.name || userEmail.split('@')[0] || 'Benutzer';
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
        <Link to="/" className="flex items-center gap-3">
          {branding.logo ? (
            <img
              src={branding.logo}
              alt={branding.appName}
              className="h-9 w-9 rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              {branding.appName}
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              Digital Product Passport
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Hauptmenü</SidebarGroupLabel>
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
          <SidebarGroupLabel>System</SidebarGroupLabel>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground"
            title="Abmelden"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
