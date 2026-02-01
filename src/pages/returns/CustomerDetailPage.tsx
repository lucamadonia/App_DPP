import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Mail, Phone, Pencil, Users, Plus, Globe, Shield, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ReturnStatusBadge } from '@/components/returns/ReturnStatusBadge';
import { EmptyState } from '@/components/returns/EmptyState';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import { relativeTime } from '@/lib/animations';
import { getRhCustomer, getRhCustomerReturns, updateRhCustomer } from '@/services/supabase';
import { supabase } from '@/lib/supabase';
import type { RhCustomer, RhReturn } from '@/types/returns-hub';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('returns');
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

  // Portal status
  const [portalProfile, setPortalProfile] = useState<{ lastLoginAt?: string; emailVerified?: boolean } | null>(null);
  // CRM fields
  const [lifecycleStage, setLifecycleStage] = useState<string>('active');
  const [satisfactionScore, setSatisfactionScore] = useState<number | null>(null);
  const [commPrefs, setCommPrefs] = useState<{ email: boolean; sms: boolean; marketing: boolean }>({ email: true, sms: false, marketing: false });

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const [cust, rets] = await Promise.all([
      getRhCustomer(id),
      getRhCustomerReturns(id),
    ]);
    setCustomer(cust);
    setReturns(rets);

    // Load portal profile status
    if (cust) {
      const { data: portalData } = await supabase
        .from('rh_customer_profiles')
        .select('last_login_at, email_verified')
        .eq('customer_id', id)
        .single();
      setPortalProfile(portalData ? { lastLoginAt: portalData.last_login_at, emailVerified: portalData.email_verified } : null);

      // Load CRM fields
      const { data: crmData } = await supabase
        .from('rh_customers')
        .select('lifecycle_stage, satisfaction_score, communication_preferences')
        .eq('id', id)
        .single();
      if (crmData) {
        setLifecycleStage(crmData.lifecycle_stage || 'active');
        setSatisfactionScore(crmData.satisfaction_score != null ? Number(crmData.satisfaction_score) : null);
        setCommPrefs(crmData.communication_preferences || { email: true, sms: false, marketing: false });
      }
    }

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

  // Animated values
  const animTotalReturns = useAnimatedNumber(customer?.returnStats.totalReturns ?? 0, { duration: 800 });
  const animTotalValue = useAnimatedNumber(customer?.returnStats.totalValue ?? 0, { duration: 800, delay: 100 });
  const animReturnRate = useAnimatedNumber(customer?.returnStats.returnRate ?? 0, { duration: 800, delay: 200, decimals: 1 });
  const animRiskScore = useAnimatedNumber(customer?.riskScore ?? 0, { duration: 1000, delay: 150 });
  const rowVisibility = useStaggeredList(returns.length, { interval: 40 });

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 rounded-md bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-muted rounded w-56 animate-pulse" />
            <div className="h-4 bg-muted rounded w-36 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-24" />
                    <div className="h-3 bg-muted rounded w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="animate-fade-in-up">
        <EmptyState
          icon={Users}
          title={t('Customer not found')}
          actionLabel={t('Back to list')}
          onAction={() => navigate('/returns/customers')}
        />
      </div>
    );
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email;
  const riskColor = customer.riskScore >= 70 ? 'text-red-600' : customer.riskScore >= 40 ? 'text-yellow-600' : 'text-green-600';
  const riskBgColor = customer.riskScore >= 70 ? 'stroke-red-500' : customer.riskScore >= 40 ? 'stroke-yellow-500' : 'stroke-green-500';

  // SVG ring parameters
  const ringRadius = 40;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const riskProgress = Math.min((customer.riskScore / 100) * ringCircumference, ringCircumference);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/returns/customers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{t('360° Customer View')}</h1>
          <p className="text-muted-foreground">{fullName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/returns/new')}>
          <Plus className="h-4 w-4 mr-1" />
          {t('New Return')}
        </Button>
        <Button variant="outline" onClick={openEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          {t('Edit Customer')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
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

        <Card className="animate-fade-in-up" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Return Statistics')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{animTotalReturns}</p>
                <p className="text-xs text-muted-foreground">{t('Total Returns')}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{'\u20AC'}{animTotalValue}</p>
                <p className="text-xs text-muted-foreground">{t('Total Value')}</p>
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{animReturnRate}%</p>
              <p className="text-xs text-muted-foreground">{t('Return Rate')}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Risk Score')}</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4">
            <div className="relative">
              <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
                <circle cx="50" cy="50" r={ringRadius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/40" />
                <circle
                  cx="50" cy="50" r={ringRadius} fill="none"
                  strokeWidth="6" strokeLinecap="round"
                  className={riskBgColor}
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringCircumference - riskProgress}
                  style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-bold ${riskColor}`}>{animRiskScore}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {customer.riskScore >= 70 ? t('High') : customer.riskScore >= 40 ? t('Normal') : t('Low')} {t('Risk')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Portal Status & CRM Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="animate-fade-in-up" style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" /> {t('Portal Status')}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('Portal Account')}</span>
              {portalProfile ? (
                <Badge variant="default" className="text-[10px] bg-green-100 text-green-700">{t('Active')}</Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">{t('No Account')}</Badge>
              )}
            </div>
            {portalProfile && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('Email Verified')}</span>
                  <span>{portalProfile.emailVerified ? '\u2705' : '\u274C'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('Last Login')}</span>
                  <span className="text-xs">{portalProfile.lastLoginAt ? new Date(portalProfile.lastLoginAt).toLocaleDateString() : '\u2014'}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> {t('Lifecycle')}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('Stage')}</span>
              <Badge variant="outline" className="capitalize text-xs">{lifecycleStage}</Badge>
            </div>
            {satisfactionScore != null && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('Satisfaction')}</span>
                <span className="font-medium">{satisfactionScore}/5</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Heart className="h-4 w-4" /> {t('Communication')}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('Email')}</span>
              <span>{commPrefs.email ? '\u2705' : '\u274C'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">SMS</span>
              <span>{commPrefs.sms ? '\u2705' : '\u274C'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('Marketing')}</span>
              <span>{commPrefs.marketing ? '\u2705' : '\u274C'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="returns">
        <TabsList>
          <TabsTrigger value="returns">{t('Return History')} ({returns.length})</TabsTrigger>
          <TabsTrigger value="addresses">{t('Addresses')}</TabsTrigger>
        </TabsList>

        <TabsContent value="returns" className="mt-4">
          <Card className="animate-fade-in-up">
            <CardContent className="pt-4">
              {returns.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={t('No returns found')}
                  description={t('This customer has no return history')}
                />
              ) : (
                <div className="overflow-x-auto">
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
                      {returns.map((ret, i) => (
                        <tr
                          key={ret.id}
                          className={`border-b last:border-0 cursor-pointer group hover:bg-muted/50 transition-all duration-200 ${
                            rowVisibility[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                          }`}
                          style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out, background-color 0.15s ease' }}
                          onClick={() => navigate(`/returns/${ret.id}`)}
                        >
                          <td className="py-2.5 relative">
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="text-primary hover:underline font-medium pl-2">{ret.returnNumber}</span>
                          </td>
                          <td className="py-2.5"><ReturnStatusBadge status={ret.status} /></td>
                          <td className="py-2.5 text-muted-foreground text-xs">{relativeTime(ret.createdAt, i18n.language)}</td>
                          <td className="py-2.5 text-right font-medium">{ret.refundAmount != null ? `€${ret.refundAmount.toFixed(2)}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses" className="mt-4">
          <Card className="animate-fade-in-up">
            <CardContent className="pt-4">
              {customer.addresses.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={t('No data available')}
                  description={t('No addresses on file')}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.addresses.map((addr, i) => (
                    <div key={i} className="p-3 rounded-lg border hover:shadow-sm transition-shadow">
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
