/**
 * ContactsListPage — Kontakte als Aktions-Hub.
 *
 * Card grid (default) with gradient initials avatar, type badge, batched
 * shipment history and quick actions (new shipment / mail / call / copy
 * address). Desktop can toggle to a ResponsiveTable view. Search, type
 * chips and sorting (name / last shipment) on top.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { LayoutGrid, List, Plus, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table';
import { EmptyState, ErrorState } from '@/components/ui/state-feedback';
import {
  getContacts,
  getContactShipmentSummaries,
  createContact,
  updateContact,
  deleteContact,
  type ContactShipmentSummary,
} from '@/services/supabase/wh-contacts';
import { CONTACT_TYPE_CONFIG } from '@/lib/warehouse-constants';
import { gridStagger, blurIn, useReducedMotion } from '@/lib/motion';
import { relativeTime } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { InfluencerFields } from '@/components/warehouse/InfluencerFields';
import {
  ContactActionCard,
  ContactActionCardSkeleton,
} from '@/components/warehouse/contact-action-card';
import type { WhContact, WhContactInput, WhContactType } from '@/types/warehouse';

/** "Maria Curie-Lab" -> "MC"; single word -> first two letters. */
function contactInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

type SortMode = 'name' | 'lastShipment';
type ViewMode = 'grid' | 'table';

const VIEW_STORAGE_KEY = 'wh-contacts-view';

const TYPE_TABS = ['all', 'b2b', 'b2c', 'supplier', 'influencer'] as const;

export function ContactsListPage() {
  const { t, i18n } = useTranslation('warehouse');
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const isMobile = useIsMobile();

  const [contacts, setContacts] = useState<WhContact[]>([]);
  const [summaries, setSummaries] = useState<Map<string, ContactShipmentSummary>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<WhContactType | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortMode>('name');
  const [view, setView] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(VIEW_STORAGE_KEY) === 'table' ? 'table' : 'grid';
    } catch {
      return 'grid';
    }
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WhContact | null>(null);
  const [form, setForm] = useState<WhContactInput>({ contactName: '' });
  const [saving, setSaving] = useState(false);

  const locale = i18n.language === 'de' ? 'de' : 'en';
  // Mobile is always the card grid (1-column); the toggle only exists on md+.
  const effectiveView: ViewMode = isMobile ? 'grid' : view;

  // ── Load (debounced for search, race-safe via cancelled flag) ─────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const data = await getContacts({
          search: search || undefined,
          activeOnly: false,
          type: typeFilter !== 'all' ? typeFilter : undefined,
        });
        if (cancelled) return;
        setContacts(data);
        // ONE batched query for all visible contacts (no N+1)
        const sums = await getContactShipmentSummaries(data.map((c) => c.id));
        if (cancelled) return;
        setSummaries(sums);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('Failed to load contacts'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = setTimeout(run, search ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, typeFilter, reloadKey, t]);

  const refresh = () => setReloadKey((k) => k + 1);

  // ── Sorting (client-side, shared by both views) ───────────────────────
  const sorted = useMemo(() => {
    const list = [...contacts];
    if (sortBy === 'lastShipment') {
      list.sort((a, b) => {
        const aTime = summaries.get(a.id)?.lastShipmentAt;
        const bTime = summaries.get(b.id)?.lastShipmentAt;
        if (aTime && bTime) return new Date(bTime).getTime() - new Date(aTime).getTime();
        if (aTime) return -1;
        if (bTime) return 1;
        return a.contactName.localeCompare(b.contactName);
      });
    } else {
      list.sort((a, b) => a.contactName.localeCompare(b.contactName));
    }
    return list;
  }, [contacts, summaries, sortBy]);

  // ── CRUD dialog ────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm({ contactName: '', type: 'b2b' });
    setDialogOpen(true);
  };

  const openEdit = (c: WhContact) => {
    setEditing(c);
    setForm({
      contactName: c.contactName,
      companyName: c.companyName,
      email: c.email,
      phone: c.phone,
      street: c.street,
      city: c.city,
      postalCode: c.postalCode,
      country: c.country,
      customerNumber: c.customerNumber,
      vatId: c.vatId,
      notes: c.notes,
      type: c.type,
      instagramHandle: c.instagramHandle,
      tiktokHandle: c.tiktokHandle,
      youtubeHandle: c.youtubeHandle,
      otherSocialUrl: c.otherSocialUrl,
      primaryPlatform: c.primaryPlatform,
      followerCount: c.followerCount,
      engagementRate: c.engagementRate,
      niche: c.niche,
      influencerTier: c.influencerTier,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.contactName || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await updateContact(editing.id, form);
      } else {
        await createContact(form);
      }
      setDialogOpen(false);
      toast.success(editing ? t('Contact updated') : t('Contact created'));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: WhContact) => {
    if (!confirm(t('Are you sure?', { ns: 'common' }))) return;
    try {
      await deleteContact(c.id);
      toast.success(t('Deleted', { ns: 'common' }));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const setViewPersisted = (v: ViewMode) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, v);
    } catch {
      // localStorage unavailable (private mode) — view just won't persist
    }
  };

  const getTypeLabel = (type: string) => {
    const cfg = CONTACT_TYPE_CONFIG[type];
    if (!cfg) return type;
    return locale === 'de' ? cfg.labelDe : cfg.labelEn;
  };

  const hasFilters = Boolean(search) || typeFilter !== 'all';

  const emptyState = (
    <EmptyState
      icon={Users}
      title={hasFilters ? t('No contacts found') : t('No contacts yet')}
      description={
        hasFilters
          ? t('Try a different search or filter')
          : t('Add your customers, partners and influencers in one place.')
      }
      actionLabel={hasFilters ? undefined : t('Create your first contact')}
      onAction={hasFilters ? undefined : openCreate}
    />
  );

  // ── Table view columns ─────────────────────────────────────────────────
  const columns: ResponsiveTableColumn<WhContact>[] = [
    {
      id: 'name',
      header: t('Name'),
      mobilePriority: 'title',
      cell: (c) => (
        <span className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-[11px] font-semibold select-none"
          >
            {contactInitials(c.contactName)}
          </span>
          <span className="font-medium truncate">{c.contactName}</span>
        </span>
      ),
    },
    {
      id: 'type',
      header: t('Type'),
      mobilePriority: 'badge',
      cell: (c) => {
        const cfg = CONTACT_TYPE_CONFIG[c.type];
        return cfg ? (
          <Badge variant="outline" className={cn('border-0', cfg.bgColor, cfg.color)}>
            {getTypeLabel(c.type)}
          </Badge>
        ) : (
          <Badge variant="outline">{c.type}</Badge>
        );
      },
    },
    {
      id: 'company',
      header: t('Company'),
      hideBelow: 'md',
      mobilePriority: 'subtitle',
      cell: (c) => c.companyName || '—',
    },
    {
      id: 'email',
      header: t('Email'),
      hideBelow: 'lg',
      cell: (c) => <span className="text-sm">{c.email || '—'}</span>,
    },
    {
      id: 'shipments',
      header: t('Shipments'),
      mobilePriority: 'meta',
      mobileLabel: t('Shipments'),
      cell: (c) => {
        const s = summaries.get(c.id);
        if (!s || s.count === 0) {
          return <span className="text-muted-foreground text-sm">{t('No shipments yet')}</span>;
        }
        return (
          <span className="text-sm tabular-nums">
            {t('{{count}} shipments', { count: s.count })}
            {s.lastShipmentAt && (
              <span className="text-muted-foreground"> · {relativeTime(s.lastShipmentAt, i18n.language)}</span>
            )}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: t('Status'),
      hideBelow: 'lg',
      cell: (c) => (
        <Badge variant={c.isActive ? 'default' : 'secondary'}>
          {c.isActive ? t('Active') : t('Inactive')}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        variants={prefersReduced ? undefined : blurIn}
        initial={prefersReduced ? undefined : 'initial'}
        animate={prefersReduced ? undefined : 'animate'}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {t('Contacts')}
        </h1>
        <Button onClick={openCreate} className="min-h-11">
          <Plus className="mr-2 h-4 w-4" />
          {t('Add Contact')}
        </Button>
      </motion.div>

      {/* Search + sort + view toggle */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('Search contacts...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11"
            aria-label={t('Search contacts...')}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortMode)}>
            <SelectTrigger className="h-11 w-full sm:w-44" aria-label={t('Sort by')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">{t('Name')}</SelectItem>
              <SelectItem value="lastShipment">{t('Last shipment')}</SelectItem>
            </SelectContent>
          </Select>
          {/* View toggle — desktop only, mobile is always the 1-column grid */}
          <div className="hidden md:flex items-center rounded-md border p-0.5" role="group" aria-label={t('View')}>
            <Button
              size="icon"
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              className="h-10 w-11"
              onClick={() => setViewPersisted('grid')}
              aria-label={t('Grid view')}
              aria-pressed={view === 'grid'}
              title={t('Grid view')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={view === 'table' ? 'secondary' : 'ghost'}
              className="h-10 w-11"
              onClick={() => setViewPersisted('table')}
              aria-label={t('Table view')}
              aria-pressed={view === 'table'}
              title={t('Table view')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
        {TYPE_TABS.map((tab) => (
          <Button
            key={tab}
            variant={typeFilter === tab ? 'default' : 'outline'}
            size="sm"
            className="min-h-10 rounded-full px-4 shrink-0"
            onClick={() => setTypeFilter(tab)}
            aria-pressed={typeFilter === tab}
          >
            {tab === 'all' ? t('All') : getTypeLabel(tab)}
          </Button>
        ))}
      </div>

      {/* Content */}
      {error ? (
        <ErrorState title={t('Failed to load contacts')} message={error} onRetry={refresh} />
      ) : effectiveView === 'grid' ? (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <ContactActionCardSkeleton key={i} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          emptyState
        ) : (
          <motion.div
            variants={prefersReduced ? undefined : gridStagger}
            initial={prefersReduced ? undefined : 'initial'}
            animate={prefersReduced ? undefined : 'animate'}
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3"
          >
            {sorted.map((c) => (
              <ContactActionCard
                key={c.id}
                contact={c}
                summary={summaries.get(c.id)}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </motion.div>
        )
      ) : (
        <ResponsiveTable
          data={sorted}
          columns={columns}
          rowKey={(c) => c.id}
          onRowClick={(c) => navigate(`/warehouse/contacts/${c.id}`)}
          loading={loading}
          loadingRows={6}
          emptyState={emptyState}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('Edit Contact') : t('Add Contact')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Contact Type */}
            <div className="space-y-2">
              <Label>{t('Contact Type')}</Label>
              <Select
                value={form.type || 'b2b'}
                onValueChange={(v) => setForm({ ...form, type: v as WhContactType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="b2b">{t('B2B')}</SelectItem>
                  <SelectItem value="b2c">{t('B2C')}</SelectItem>
                  <SelectItem value="supplier">{t('Supplier')}</SelectItem>
                  <SelectItem value="influencer">{t('Influencer')}</SelectItem>
                  <SelectItem value="other">{t('Other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('Contact Name')}</Label>
                <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('Company')}</Label>
                <Input value={form.companyName || ''} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('Email')}</Label>
                <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('Phone')}</Label>
                <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Street')}</Label>
              <Input value={form.street || ''} onChange={(e) => setForm({ ...form, street: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('Postal Code')}</Label>
                <Input value={form.postalCode || ''} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('City')}</Label>
                <Input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('Country')}</Label>
                <Input value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('Customer Number')}</Label>
                <Input value={form.customerNumber || ''} onChange={(e) => setForm({ ...form, customerNumber: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('VAT ID')}</Label>
                <Input value={form.vatId || ''} onChange={(e) => setForm({ ...form, vatId: e.target.value })} />
              </div>
            </div>
            {/* Influencer fields (conditional) */}
            {form.type === 'influencer' && (
              <InfluencerFields
                form={form}
                onChange={(updates) => setForm({ ...form, ...updates })}
              />
            )}
            <div className="space-y-2">
              <Label>{t('Notes')}</Label>
              <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button onClick={handleSave} disabled={!form.contactName || saving}>
              {saving ? t('Saving...', { ns: 'common' }) : t('Save', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
