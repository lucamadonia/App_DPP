import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Mail, Phone, AlertTriangle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ReturnStatusBadge } from '@/components/returns/ReturnStatusBadge';
import { getRhCustomer, getRhCustomerReturns, updateRhCustomer } from '@/services/supabase';
import type { RhCustomer, RhReturn } from '@/types/returns-hub';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('returns');
  const [customer, setCustomer] = useState<RhCustomer | null>(null);
  const [returns, setReturns] = useState<RhReturn[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTagsInput, setEditTagsInput] = useState('');

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const [cust, rets] = await Promise.all([
      getRhCustomer(id),
      getRhCustomerReturns(id),
    ]);
    setCustomer(cust);
    setReturns(rets);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const openEdit = () => {
    if (!customer) return;
    setEditEmail(customer.email);
    setEditFirstName(customer.firstName || '');
    setEditLastName(customer.lastName || '');
    setEditPhone(customer.phone || '');
    setEditCompany(customer.company || '');
    setEditNotes(customer.notes || '');
    setEditTagsInput(customer.tags.join(', '));
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!id || !editEmail.trim()) return;
    setSaving(true);

    const tags = editTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const result = await updateRhCustomer(id, {
      email: editEmail.trim(),
      firstName: editFirstName.trim() || undefined,
      lastName: editLastName.trim() || undefined,
      phone: editPhone.trim() || undefined,
      company: editCompany.trim() || undefined,
      notes: editNotes.trim() || undefined,
      tags,
    });

    if (result.success) {
      setEditOpen(false);
      await loadData();
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!customer) {
    return <div className="text-center py-12"><p className="text-muted-foreground">{t('Customer not found')}</p></div>;
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email;
  const riskColor = customer.riskScore >= 70 ? 'text-red-600' : customer.riskScore >= 40 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/returns/customers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{t('360° Customer View')}</h1>
          <p className="text-muted-foreground">{fullName}</p>
        </div>
        <Button variant="outline" onClick={openEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          {t('Edit Customer')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Customer Profile')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-semibold">
                {fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{fullName}</p>
                {customer.company && <p className="text-sm text-muted-foreground">{customer.company}</p>}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{customer.email}</div>
              {customer.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{customer.phone}</div>}
            </div>
            {customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {customer.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Return Statistics')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{customer.returnStats.totalReturns}</p>
                <p className="text-xs text-muted-foreground">{t('Total Returns')}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">€{customer.returnStats.totalValue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">{t('Total Value')}</p>
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{customer.returnStats.returnRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">{t('Return Rate')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Risk Score')}</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4">
            <div className={`flex items-center gap-2 ${riskColor}`}>
              <AlertTriangle className="h-8 w-8" />
              <span className="text-4xl font-bold">{customer.riskScore}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {customer.riskScore >= 70 ? t('High') : customer.riskScore >= 40 ? t('Normal') : t('Low')} {t('Risk')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="returns">
        <TabsList>
          <TabsTrigger value="returns">{t('Return History')} ({returns.length})</TabsTrigger>
          <TabsTrigger value="addresses">{t('Addresses')}</TabsTrigger>
        </TabsList>

        <TabsContent value="returns" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {returns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('No returns found')}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">{t('Return Number')}</th>
                      <th className="pb-2 font-medium">{t('Status')}</th>
                      <th className="pb-2 font-medium">{t('Date')}</th>
                      <th className="pb-2 font-medium text-right">{t('Refund Amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map(ret => (
                      <tr key={ret.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2"><Link to={`/returns/${ret.id}`} className="text-primary hover:underline">{ret.returnNumber}</Link></td>
                        <td className="py-2"><ReturnStatusBadge status={ret.status} /></td>
                        <td className="py-2 text-muted-foreground">{new Date(ret.createdAt).toLocaleDateString()}</td>
                        <td className="py-2 text-right">{ret.refundAmount != null ? `€${ret.refundAmount.toFixed(2)}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {customer.addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('No data available')}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.addresses.map((addr, i) => (
                    <div key={i} className="p-3 rounded-lg border">
                      <Badge variant="outline" className="mb-2 capitalize">{addr.type}</Badge>
                      <p className="text-sm">{addr.street}</p>
                      <p className="text-sm">{addr.postalCode} {addr.city}</p>
                      {addr.state && <p className="text-sm">{addr.state}</p>}
                      <p className="text-sm">{addr.country}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Edit Customer')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('Email')} *</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('First Name')}</Label>
                <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('Last Name')}</Label>
                <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Phone')}</Label>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('Company')}</Label>
                <Input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Notes')}</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>{t('Tags (comma-separated)')}</Label>
              <Input value={editTagsInput} onChange={(e) => setEditTagsInput(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !editEmail.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
