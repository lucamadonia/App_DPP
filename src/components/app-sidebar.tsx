import { Link, useLocation } from 'react-router-dom';
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
} from 'lucide-react';

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
    title: 'Hilfe & Support',
    url: '/help',
    icon: HelpCircle,
  },
];

export function AppSidebar() {
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              DPP Manager
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
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              AD
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-sidebar-foreground">
              Admin User
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              admin@company.de
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
