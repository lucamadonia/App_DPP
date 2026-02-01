import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2, Save, Plus, Trash2, Mail, Pencil, Copy, Check, ExternalLink, MessageSquareText, ArrowRight, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/returns/EmptyState';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import {
  getReturnsHubSettings, updateReturnsHubSettings,
  getReturnReasons, createReturnReason, updateReturnReason, deleteReturnReason,
  getCurrentTenant, getCannedResponses, saveCannedResponses,
} from '@/services/supabase';
import type { ReturnsHubSettings, RhReturnReason, RhCannedResponse } from '@/types/returns-hub';

export function ReturnsSettingsPage() {
  const { t } = useTranslation('returns');
  const navigate = useNavigate();
  const [settings, setSettings] = useState<ReturnsHubSettings | null>(null);
  const [reasons, setReasons] = useState<RhReturnReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [copied, setCopied] = useState(false);

  // Canned responses
  const [cannedResponses, setCannedResponses] = useState<RhCannedResponse[]>([]);
  const [newResponseTitle, setNewResponseTitle] = useState('');
  const [newResponseContent, setNewResponseContent] = useState('');
  const [editingResponse, setEditingResponse] = useState<RhCannedResponse | null>(null);
  const [editResponseTitle, setEditResponseTitle] = useState('');
  const [editResponseContent, setEditResponseContent] = useState('');
  const [savingResponses, setSavingResponses] = useState(false);

  // SLA defaults
  const [slaFirstResponseHours, setSlaFirstResponseHours] = useState('4');
  const [slaResolutionHours, setSlaResolutionHours] = useState('24');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [s, r, tenant, cr] = await Promise.all([
        getReturnsHubSettings(),
        getReturnReasons(),
        getCurrentTenant(),
        getCannedResponses(),
      ]);
      setSettings(s);
      setReasons(r);
      setCannedResponses(cr);
      if (tenant) setTenantSlug(tenant.slug || tenant.id);
      if (s?.features) {
        const slaSettings = (s as any).slaDefaults;
        if (slaSettings) {
          setSlaFirstResponseHours(String(slaSettings.firstResponseHours || 4));
          setSlaResolutionHours(String(slaSettings.resolutionHours || 24));
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    await updateReturnsHubSettings(settings);
    setSaving(false);
  };

  const handleAddReason = async () => {
    if (!newCategory.trim()) return;
    await createReturnReason({
      category: newCategory.trim(),
      subcategories: [],
      followUpQuestions: [],
      requiresPhotos: false,
      sortOrder: reasons.length,
      active: true,
    });
    setNewCategory('');
    const r = await getReturnReasons();
    setReasons(r);
  };

  const handleDeleteReason = async (id: string) => {
    await deleteReturnReason(id);
    const r = await getReturnReasons();
    setReasons(r);
  };

  const handleToggleReason = async (id: string, active: boolean) => {
    await updateReturnReason(id, { active });
    const r = await getReturnReasons();
    setReasons(r);
  };

  const handleSaveNotificationSettings = async () => {
    if (!settings) return;
    setSaving(true);
    await updateReturnsHubSettings({ notifications: settings.notifications });
    setSaving(false);
  };

  const handleAddCannedResponse = async () => {
    if (!newResponseTitle.trim() || !newResponseContent.trim()) return;
    setSavingResponses(true);
    const newResponse: RhCannedResponse = {
      id: crypto.randomUUID(),
      title: newResponseTitle.trim(),
      content: newResponseContent.trim(),
    };
    const updated = [...cannedResponses, newResponse];
    await saveCannedResponses(updated);
    setCannedResponses(updated);
    setNewResponseTitle('');
    setNewResponseContent('');
    setSavingResponses(false);
  };

  const handleDeleteCannedResponse = async (id: string) => {
    setSavingResponses(true);
    const updated = cannedResponses.filter((r) => r.id !== id);
    await saveCannedResponses(updated);
    setCannedResponses(updated);
    setSavingResponses(false);
  };

  const handleOpenEditResponse = (response: RhCannedResponse) => {
    setEditingResponse(response);
    setEditResponseTitle(response.title);
    setEditResponseContent(response.content);
  };

  const handleSaveEditResponse = async () => {
    if (!editingResponse) return;
    setSavingResponses(true);
    const updated = cannedResponses.map((r) =>
      r.id === editingResponse.id
        ? { ...r, title: editResponseTitle.trim(), content: editResponseContent.trim() }
        : r
    );
    await saveCannedResponses(updated);
    setCannedResponses(updated);
    setEditingResponse(null);
    setSavingResponses(false);
  };

  const handleSaveSlaDefaults = async () => {
    if (!settings) return;
    setSaving(true);
    await updateReturnsHubSettings({
      ...settings,
      slaDefaults: {
        firstResponseHours: parseInt(slaFirstResponseHours) || 4,
        resolutionHours: parseInt(slaResolutionHours) || 24,
      },
    } as any);
    setSaving(false);
  };

  const reasonVisibility = useStaggeredList(reasons.length, { interval: 40 });
  const responseVisibility = useStaggeredList(cannedResponses.length, { interval: 40 });

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="space-y-2">
          <div className="h-6 bg-muted rounded w-32 animate-pulse" />
          <div className="h-4 bg-muted rounded w-56 animate-pulse" />
        </div>
        <div className="h-10 bg-muted rounded w-96 animate-pulse" />
        <Card>
          <CardContent className="pt-6 animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-48" />
            <div className="h-9 bg-muted rounded" />
            <div className="h-9 bg-muted rounded" />
            <div className="h-9 bg-muted rounded w-24 ml-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!settings) return null;

  // License usage gauge
  const usagePercent = settings.maxReturnsPerMonth > 0
    ? Math.min((settings.usage.returnsThisMonth / settings.maxReturnsPerMonth) * 100, 100)
    : 0;
  const usageColor = usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold">{t('Settings')}</h1>
        <p className="text-muted-foreground">{t('Configure your Returns Hub')}</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t('General')}</TabsTrigger>
          <TabsTrigger value="reasons">{t('Return Reasons')}</TabsTrigger>
          <TabsTrigger value="license">{t('License')}</TabsTrigger>
          <TabsTrigger value="branding">{t('Branding')}</TabsTrigger>
          <TabsTrigger value="tickets">{t('Tickets')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('Notifications')}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-base">{t('General')}</CardTitle>
              <CardDescription>{t('Basic Returns Hub configuration')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('Enable Returns Hub')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Activate the Returns Hub module for your organization')}</p>
                </div>
                <Switch checked={settings.enabled} onCheckedChange={(v) => setSettings({ ...settings, enabled: v })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Return Number Prefix')}</Label>
                  <Input value={settings.prefix} onChange={(e) => setSettings({ ...settings, prefix: e.target.value })} placeholder="RET" />
                </div>
                <div className="space-y-2">
                  <Label>{t('Default Solution')}</Label>
                  <Select value="refund" onValueChange={() => {}}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="refund">{t('Refund')}</SelectItem>
                      <SelectItem value="exchange">{t('Exchange')}</SelectItem>
                      <SelectItem value="voucher">{t('Voucher')}</SelectItem>
                      <SelectItem value="repair">{t('Repair')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {t('Save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reasons" className="mt-4 space-y-4">
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-base">{t('Return Reasons')}</CardTitle>
              <CardDescription>{t('Configure return reason categories')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder={t('New reason category...')}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddReason()}
                />
                <Button onClick={handleAddReason} disabled={!newCategory.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> {t('Add Reason')}
                </Button>
              </div>

              {reasons.length === 0 ? (
                <EmptyState
                  icon={Settings2}
                  title={t('No return reasons configured')}
                  description={t('Add reason categories for your returns')}
                />
              ) : (
                <div className="space-y-2">
                  {reasons.map((reason, i) => (
                    <div
                      key={reason.id}
                      className={`flex items-center justify-between p-3 rounded-lg border hover:shadow-sm transition-all duration-200 ${
                        reasonVisibility[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                      }`}
                      style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out, box-shadow 0.2s ease' }}
                    >
                      <div className="flex items-center gap-3">
                        <Switch checked={reason.active} onCheckedChange={(v) => handleToggleReason(reason.id, v)} />
                        <div>
                          <span className="font-medium">{reason.category}</span>
                          {reason.subcategories.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {reason.subcategories.map(sub => (
                                <Badge key={sub} variant="secondary" className="text-xs">{sub}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {reason.requiresPhotos && <Badge variant="outline" className="text-xs">{t('Requires Photos')}</Badge>}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteReason(reason.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="license" className="mt-4 space-y-4">
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-base">{t('License')}</CardTitle>
              <CardDescription>{t('Your current plan and usage')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className="text-lg px-3 py-1 capitalize">{settings.plan}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted space-y-2">
                  <p className="text-sm text-muted-foreground">{t('Returns this month')}</p>
                  <p className="text-2xl font-bold">{settings.usage.returnsThisMonth} <span className="text-sm font-normal text-muted-foreground">{t('of {{max}} included', { max: settings.maxReturnsPerMonth })}</span></p>
                  {/* Usage gauge */}
                  <div className="h-2 bg-muted-foreground/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${usageColor} rounded-full transition-all duration-700`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">{t('Admin users')}</p>
                  <p className="text-2xl font-bold">{settings.maxAdminUsers}</p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">{t('Features')}</h4>
                {Object.entries(settings.features).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-1 text-sm">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span>{typeof value === 'boolean' ? (value ? '\u2713' : '\u2014') : value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="mt-4 space-y-4">
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-base">{t('Branding')}</CardTitle>
              <CardDescription>{t('Customize the customer portal appearance')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Primary Color')}</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.branding.primaryColor}
                      onChange={(e) => setSettings({
                        ...settings,
                        branding: { ...settings.branding, primaryColor: e.target.value },
                      })}
                      className="h-9 w-12 rounded border cursor-pointer"
                    />
                    <Input
                      value={settings.branding.primaryColor}
                      onChange={(e) => setSettings({
                        ...settings,
                        branding: { ...settings.branding, primaryColor: e.target.value },
                      })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('Logo URL')}</Label>
                  <Input
                    value={settings.branding.logoUrl}
                    onChange={(e) => setSettings({
                      ...settings,
                      branding: { ...settings.branding, logoUrl: e.target.value },
                    })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {tenantSlug && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-2">
                    <Label>{t('Portal URL')}</Label>
                    <p className="text-xs text-muted-foreground">{t('Share this link with your customers')}</p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={`${window.location.origin}/returns/portal/${tenantSlug}`}
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/returns/portal/${tenantSlug}`);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                      >
                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a href={`/returns/portal/${tenantSlug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> {t('Returns Portal')}
                    </a>
                    <a href={`/returns/portal/${tenantSlug}/register`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> {t('Register Return')}
                    </a>
                    <a href={`/returns/portal/${tenantSlug}/track`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> {t('Track Return')}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {t('Save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="mt-4 space-y-4">
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-base">{t('SLA')}</CardTitle>
              <CardDescription>{t('Default SLA times for new tickets')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('SLA First Response')} ({t('hours')})</Label>
                  <Input
                    type="number"
                    min="1"
                    value={slaFirstResponseHours}
                    onChange={(e) => setSlaFirstResponseHours(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('SLA Resolution')} ({t('hours')})</Label>
                  <Input
                    type="number"
                    min="1"
                    value={slaResolutionHours}
                    onChange={(e) => setSlaResolutionHours(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveSlaDefaults} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {t('Save')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquareText className="h-4 w-4" />
                {t('Canned Responses')}
              </CardTitle>
              <CardDescription>{t('Text templates for quick ticket replies')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                <div className="space-y-2">
                  <Label>{t('Title')}</Label>
                  <Input
                    value={newResponseTitle}
                    onChange={(e) => setNewResponseTitle(e.target.value)}
                    placeholder={t('Response title...')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Content')}</Label>
                  <Textarea
                    value={newResponseContent}
                    onChange={(e) => setNewResponseContent(e.target.value)}
                    placeholder={t('Response text...')}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddCannedResponse}
                    disabled={!newResponseTitle.trim() || !newResponseContent.trim() || savingResponses}
                    size="sm"
                  >
                    {savingResponses ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                    {t('Add')}
                  </Button>
                </div>
              </div>

              {cannedResponses.length === 0 ? (
                <EmptyState
                  icon={MessageSquareText}
                  title={t('No canned responses')}
                  description={t('Add templates for quick ticket replies')}
                />
              ) : (
                <div className="space-y-2">
                  {cannedResponses.map((resp, i) => (
                    <div
                      key={resp.id}
                      className={`flex items-start justify-between p-3 rounded-lg border hover:shadow-sm transition-all duration-200 ${
                        responseVisibility[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                      }`}
                      style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out, box-shadow 0.2s ease' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{resp.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{resp.content}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditResponse(resp)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCannedResponse(resp.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('Email Notifications')}
              </CardTitle>
              <CardDescription>{t('Send email notifications when return status changes')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('Enable email notifications')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Send email notifications when return status changes')}</p>
                </div>
                <Switch
                  checked={settings.notifications?.emailEnabled ?? false}
                  onCheckedChange={(v) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, emailEnabled: v },
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Sender Name')}</Label>
                <Input
                  value={settings.notifications?.senderName ?? ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, senderName: e.target.value },
                  })}
                  placeholder={t('Name shown as email sender')}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotificationSettings} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {t('Save')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
            <CardHeader>
              <CardTitle className="text-base">{t('Email Templates Configuration')}</CardTitle>
              <CardDescription>{t('Configure email templates for different events')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div>
                  <p className="font-medium text-sm">{t('Email Template Editor')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Visual editor with 15 templates, block editor, and live preview')}</p>
                </div>
                <Button onClick={() => navigate('/returns/email-templates')} className="gap-1.5">
                  {t('Open Email Template Editor')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Canned Response Dialog */}
      <Dialog open={!!editingResponse} onOpenChange={(open) => !open && setEditingResponse(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('Edit')} — {editingResponse?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Title')}</Label>
              <Input value={editResponseTitle} onChange={(e) => setEditResponseTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('Content')}</Label>
              <Textarea value={editResponseContent} onChange={(e) => setEditResponseContent(e.target.value)} rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingResponse(null)}>{t('Cancel')}</Button>
            <Button onClick={handleSaveEditResponse} disabled={savingResponses || !editResponseTitle.trim() || !editResponseContent.trim()}>
              {savingResponses ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {t('Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
