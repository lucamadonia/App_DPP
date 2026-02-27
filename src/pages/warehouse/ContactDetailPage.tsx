import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft, Pencil, Mail, Phone, MapPin, Building, Tag,
  Package, Truck, FileText, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  getContact, updateContact, getContactStats, getContactShipments,
} from '@/services/supabase/wh-contacts';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { relativeTime } from '@/lib/animations';
import { CONTACT_TYPE_CONFIG } from '@/lib/warehouse-constants';
import type {
  WhContact, WhContactInput, WhContactType, ContactStats, WhShipment,
} from '@/types/warehouse';

// ── Status badge colors for shipments ─────────────────────────────────
const SHIPMENT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  picking: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  packed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  shipped: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  label_created: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  in_transit: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation('warehouse');
  const locale = i18n.language;

  // ── State ────────────────────────────────────────────────────────────
  const [contact, setContact] = useState<WhContact | null>(null);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [shipments, setShipments] = useState<WhShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<WhContactInput>>({});
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Animated KPIs ────────────────────────────────────────────────────
  const animatedShipments = useAnimatedNumber(stats?.totalShipments ?? 0);
  const animatedItems = useAnimatedNumber(stats?.totalItemsShipped ?? 0);

  // ── Load data ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [c, st, sh] = await Promise.all([
          getContact(id!),
          getContactStats(id!),
          getContactShipments(id!),
        ]);
        if (cancelled) return;
        setContact(c);
        setStats(st);
        setShipments(sh);
        if (c) {
          setNotesValue(c.notes || '');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  // ── Edit dialog helpers ──────────────────────────────────────────────
  const openEditDialog = () => {
    if (!contact) return;
    setEditForm({
      contactName: contact.contactName,
      companyName: contact.companyName,
      email: contact.email,
      phone: contact.phone,
      type: contact.type,
      street: contact.street,
      city: contact.city,
      postalCode: contact.postalCode,
      country: contact.country,
      customerNumber: contact.customerNumber,
      vatId: contact.vatId,
      tags: contact.tags,
      notes: contact.notes,
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!id || !editForm.contactName) return;
    setSaving(true);
    try {
      const updated = await updateContact(id, editForm);
      setContact(updated);
      setNotesValue(updated.notes || '');
      setEditOpen(false);
      toast.success(t('Contact updated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await updateContact(id, { notes: notesValue });
      setContact(updated);
      setEditingNotes(false);
      toast.success(t('Contact updated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / Not found ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-muted-foreground">{t('No contacts yet')}</p>
        <Button variant="outline" asChild>
          <Link to="/warehouse/contacts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('Back to Contacts')}
          </Link>
        </Button>
      </div>
    );
  }

  // ── Resolve type badge ───────────────────────────────────────────────
  const typeConfig = CONTACT_TYPE_CONFIG[contact.type] || CONTACT_TYPE_CONFIG.other;
  const typeLabel = locale.startsWith('de') ? typeConfig.labelDe : typeConfig.labelEn;

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-1">
          <Link to="/warehouse/contacts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{contact.contactName}</h1>
          {contact.companyName && (
            <p className="text-muted-foreground text-sm">{contact.companyName}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`${typeConfig.bgColor} ${typeConfig.color} border-0`}>
            {typeLabel}
          </Badge>
          <Badge variant={contact.isActive ? 'default' : 'secondary'}>
            {contact.isActive ? t('Active') : t('Inactive')}
          </Badge>
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            {t('Edit Contact')}
          </Button>
        </div>
      </div>

      {/* ── KPI Row ───────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('Total Shipments')}</p>
              <p className="text-2xl font-bold">{animatedShipments}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-green-100 p-2.5 dark:bg-green-900/30">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('Total Items Shipped')}</p>
              <p className="text-2xl font-bold">{animatedItems}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/30">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('Last Shipment')}</p>
              <p className="text-2xl font-bold">
                {stats?.lastShipmentDate ? relativeTime(stats.lastShipmentDate, locale) : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <Tabs defaultValue="details">
        <div className="overflow-x-auto">
        <TabsList>
          <TabsTrigger value="details">
            <FileText className="mr-1.5 h-4 w-4" />
            {t('Details')}
          </TabsTrigger>
          <TabsTrigger value="shipments">
            <Truck className="mr-1.5 h-4 w-4" />
            {t('Shipments')}
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="mr-1.5 h-4 w-4" />
            {t('Products')}
          </TabsTrigger>
        </TabsList>
        </div>

        {/* ── Tab: Details ────────────────────────────────────────────── */}
        <TabsContent value="details" className="space-y-4 mt-4">
          {/* Contact Info */}
          <Card className="transition-shadow hover:shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t('Contact Details')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <Building className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('Name')}</p>
                  <p className="text-sm font-medium">{contact.contactName}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('Company')}</p>
                  <p className="text-sm font-medium">{contact.companyName || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('Email')}</p>
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`} className="text-sm font-medium text-primary hover:underline">
                      {contact.email}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('Phone')}</p>
                  {contact.phone ? (
                    <a href={`tel:${contact.phone}`} className="text-sm font-medium text-primary hover:underline">
                      {contact.phone}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('Shipping Address')}</p>
                  <p className="text-sm font-medium">
                    {[contact.street, [contact.postalCode, contact.city].filter(Boolean).join(' '), contact.country]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card className="transition-shadow hover:shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t('Business Information')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">{t('Customer Number')}</p>
                <p className="text-sm font-medium font-mono">{contact.customerNumber || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('VAT ID')}</p>
                <p className="text-sm font-medium font-mono">{contact.vatId || '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground mb-1">{t('Tags')}</p>
                <div className="flex flex-wrap gap-1">
                  {contact.tags.length > 0 ? (
                    contact.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag className="mr-1 h-3 w-3" />
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="transition-shadow hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t('Notes')}</CardTitle>
              {!editingNotes && (
                <Button variant="ghost" size="sm" onClick={() => setEditingNotes(true)}>
                  <Pencil className="mr-1.5 h-3 w-3" />
                  {t('Edit Contact')}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="space-y-3">
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    rows={4}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingNotes(false);
                        setNotesValue(contact.notes || '');
                      }}
                    >
                      {t('Cancel', { ns: 'common' })}
                    </Button>
                    <Button size="sm" onClick={handleSaveNotes} disabled={saving}>
                      {t('Save', { ns: 'common' })}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {contact.notes || '—'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Shipments ──────────────────────────────────────────── */}
        <TabsContent value="shipments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Shipment Number')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Carrier')}</TableHead>
                    <TableHead className="text-right">{t('Items')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        <Truck className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        {t('No shipments yet')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    shipments.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Link
                            to={`/warehouse/shipments/${s.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {s.shipmentNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge className={SHIPMENT_STATUS_COLORS[s.status] || ''}>
                            {t(s.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{s.carrier || '—'}</TableCell>
                        <TableCell className="text-right">{s.totalItems}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Products ───────────────────────────────────────────── */}
        <TabsContent value="products" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('Top Products')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Product')}</TableHead>
                    <TableHead className="text-right">{t('Quantity')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!stats?.topProducts?.length ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                        <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        {t('No products yet')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.topProducts.map((p) => (
                      <TableRow key={p.productId}>
                        <TableCell>
                          <Link
                            to={`/products/${p.productId}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {p.productName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-mono">{p.totalQuantity}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Edit Dialog ───────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Edit Contact')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('Contact Name')}</Label>
                <Input
                  value={editForm.contactName || ''}
                  onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Company')}</Label>
                <Input
                  value={editForm.companyName || ''}
                  onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Contact Type')}</Label>
              <Select
                value={editForm.type || 'b2b'}
                onValueChange={(val) => setEditForm({ ...editForm, type: val as WhContactType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="b2b">{t('B2B')}</SelectItem>
                  <SelectItem value="b2c">{t('B2C')}</SelectItem>
                  <SelectItem value="supplier">{t('Supplier')}</SelectItem>
                  <SelectItem value="other">{t('Other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('Email')}</Label>
                <Input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Phone')}</Label>
                <Input
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Street')}</Label>
              <Input
                value={editForm.street || ''}
                onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('Postal Code')}</Label>
                <Input
                  value={editForm.postalCode || ''}
                  onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('City')}</Label>
                <Input
                  value={editForm.city || ''}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Country')}</Label>
                <Input
                  value={editForm.country || ''}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('Customer Number')}</Label>
                <Input
                  value={editForm.customerNumber || ''}
                  onChange={(e) => setEditForm({ ...editForm, customerNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('VAT ID')}</Label>
                <Input
                  value={editForm.vatId || ''}
                  onChange={(e) => setEditForm({ ...editForm, vatId: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Notes')}</Label>
              <Textarea
                value={editForm.notes || ''}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t('Cancel', { ns: 'common' })}
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editForm.contactName || saving}>
              {t('Save', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
