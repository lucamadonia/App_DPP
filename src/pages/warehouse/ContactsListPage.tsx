import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getContacts, createContact, updateContact, deleteContact } from '@/services/supabase/wh-contacts';
import { CONTACT_TYPE_CONFIG } from '@/lib/warehouse-constants';
import type { WhContact, WhContactInput, WhContactType } from '@/types/warehouse';

export function ContactsListPage() {
  const { t, i18n } = useTranslation('warehouse');
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<WhContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<WhContactType | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WhContact | null>(null);
  const [form, setForm] = useState<WhContactInput>({ contactName: '' });

  const load = async () => {
    try {
      const data = await getContacts({
        search: search || undefined,
        activeOnly: false,
        type: typeFilter !== 'all' ? typeFilter : undefined,
      });
      setContacts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, typeFilter]);

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
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.contactName) return;
    try {
      if (editing) {
        await updateContact(editing.id, form);
      } else {
        await createContact(form);
      }
      setDialogOpen(false);
      toast.success(editing ? t('Contact updated') : t('Contact created'));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('Are you sure?', { ns: 'common' }))) return;
    try {
      await deleteContact(id);
      toast.success(t('Deleted', { ns: 'common' }));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const locale = i18n.language === 'de' ? 'de' : 'en';

  const getTypeLabel = (type: string) => {
    const cfg = CONTACT_TYPE_CONFIG[type];
    if (!cfg) return type;
    return locale === 'de' ? cfg.labelDe : cfg.labelEn;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('Contacts')}</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('Add Contact')}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('Search contacts...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Type Tabs */}
      <div className="flex gap-1 border-b">
        {(['all', 'b2b', 'b2c', 'supplier'] as const).map((tab) => (
          <Button
            key={tab}
            variant={typeFilter === tab ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTypeFilter(tab)}
          >
            {tab === 'all' ? t('All') : getTypeLabel(tab)}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Name')}</TableHead>
                <TableHead>{t('Type')}</TableHead>
                <TableHead>{t('Company')}</TableHead>
                <TableHead>{t('Email')}</TableHead>
                <TableHead>{t('City')}</TableHead>
                <TableHead>{t('Tags')}</TableHead>
                <TableHead>{t('Customer Number')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    {t('Loading...', { ns: 'common' })}
                  </TableCell>
                </TableRow>
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    {t('No contacts yet')}
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((c) => {
                  const typeCfg = CONTACT_TYPE_CONFIG[c.type];
                  return (
                    <TableRow
                      key={c.id}
                      className={`cursor-pointer hover:bg-muted/50 ${!c.isActive ? 'opacity-60' : ''}`}
                      onClick={() => navigate(`/warehouse/contacts/${c.id}`)}
                    >
                      <TableCell className="font-medium">{c.contactName}</TableCell>
                      <TableCell>
                        {typeCfg ? (
                          <Badge variant="outline" className={`${typeCfg.bgColor} ${typeCfg.color} border-0`}>
                            {getTypeLabel(c.type)}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{c.type}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{c.companyName || '—'}</TableCell>
                      <TableCell className="text-sm">{c.email || '—'}</TableCell>
                      <TableCell>{c.city || '—'}</TableCell>
                      <TableCell>
                        {c.tags && c.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{c.customerNumber || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={c.isActive ? 'default' : 'secondary'}>
                          {c.isActive ? t('Active') : t('Inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(c);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(c.id);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
            <div className="space-y-2">
              <Label>{t('Notes')}</Label>
              <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button onClick={handleSave} disabled={!form.contactName}>{t('Save', { ns: 'common' })}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
