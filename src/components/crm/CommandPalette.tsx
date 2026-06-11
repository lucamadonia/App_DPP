/**
 * Global Cmd+K / Ctrl+K command palette.
 * Jumps to customers by name/email/company and common app pages.
 */
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Users, LayoutDashboard, AlertTriangle, Sparkles, Package, RotateCcw,
  Warehouse, ArrowRight, Search, FolderArchive, QrCode, ShieldCheck,
  Handshake, Ticket, Store, Heart, MessageCircleHeart, Settings, CreditCard,
} from 'lucide-react';
import { getCustomerList, type CrmCustomer } from '@/services/supabase/crm-analytics';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Load customers (first 200) when opened, filter client-side for speed
  useEffect(() => {
    if (!open || customers.length > 0) return;
    getCustomerList({ pageSize: 200 }).then(r => setCustomers(r.data));
  }, [open, customers.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 10);
    return customers
      .filter(c => {
        const hay = [c.email, c.firstName, c.lastName, c.company].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 10);
  }, [customers, query]);

  function go(path: string) {
    setOpen(false);
    setQuery('');
    navigate(path);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden max-w-2xl">
        <Command shouldFilter={false} className="rounded-lg">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={t('Search customers or switch pages...')}
              className="h-10 border-0 focus-visible:ring-0 bg-transparent flex-1"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>
          <CommandList className="max-h-[400px]">
            <CommandEmpty>{t('No results')}</CommandEmpty>

            {filtered.length > 0 && (
              <CommandGroup heading={t('Customers')}>
                {filtered.map(c => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => go(`/crm/customers/${c.id}`)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {(c.firstName?.[0] || c.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || c.id.slice(0, 8)}
                      </div>
                      {c.email && <div className="truncate text-xs text-muted-foreground">{c.email}</div>}
                    </div>
                    {c.totalOrders > 0 && (
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {c.totalOrders} Best · {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(c.totalSpent)}
                      </span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandGroup heading={t('Navigation')}>
              <CmdNav icon={LayoutDashboard} label={t('Dashboard')} onSelect={() => go('/')} />
              <CmdNav icon={Package} label={t('Products')} onSelect={() => go('/products')} />
              <CmdNav icon={FolderArchive} label={t('Documents')} onSelect={() => go('/documents')} />
              <CmdNav icon={QrCode} label={t('DPP')} onSelect={() => go('/dpp')} />
              <CmdNav icon={ShieldCheck} label={t('Compliance')} onSelect={() => go('/compliance')} />
              <CmdNav icon={Handshake} label={t('Suppliers')} onSelect={() => go('/suppliers')} />
              <CmdNav icon={RotateCcw} label={t('Returns')} onSelect={() => go('/returns')} />
              <CmdNav icon={Ticket} label={t('Tickets')} onSelect={() => go('/returns/tickets')} />
              <CmdNav icon={Warehouse} label={t('Warehouse')} onSelect={() => go('/warehouse')} />
              <CmdNav icon={Store} label={t('Commerce')} onSelect={() => go('/commerce')} />
              <CmdNav icon={Heart} label={t('CRM')} onSelect={() => go('/crm')} />
              <CmdNav icon={MessageCircleHeart} label={t('Feedback')} onSelect={() => go('/feedback')} />
              <CmdNav icon={Settings} label={t('Settings')} onSelect={() => go('/settings/company')} />
              <CmdNav icon={CreditCard} label={t('Billing')} onSelect={() => go('/settings/billing')} />
              <CmdNav icon={Users} label={t('Customers')} onSelect={() => go('/crm/customers')} />
              <CmdNav icon={AlertTriangle} label={t('At-risk customers')} onSelect={() => go('/crm/customers?segment=at_risk')} />
              <CmdNav icon={Sparkles} label={t('Top customers')} onSelect={() => go('/crm/customers?sort=total_spent-desc')} />
              <CmdNav icon={Package} label={t('Shipments')} onSelect={() => go('/warehouse/shipments')} />
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function CmdNav({ icon: Icon, label, onSelect }: { icon: React.ComponentType<{ className?: string }>; label: string; onSelect: () => void }) {
  return (
    <CommandItem onSelect={onSelect} className="flex items-center gap-3 cursor-pointer" value={label}>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span>{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
    </CommandItem>
  );
}
