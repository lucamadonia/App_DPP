import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Save, Plus, Trash2, Mail, Pencil, MessageSquareText, ArrowRight, Settings2, Truck } from 'lucide-react';
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
import { ErrorState } from '@/components/ui/state-feedback';
import { PortalDesignTab } from '@/components/returns/PortalDesignTab';
import { PortalSetupTab } from '@/components/returns/PortalSetupTab';
import { EmbedSnippetCard } from '@/components/returns/EmbedSnippetCard';
import { ShippingSettingsTab } from '@/components/returns/ShippingSettingsTab';
import { pageVariants, pageTransition, useReducedMotion } from '@/lib/motion';
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
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [tenantName, setTenantName] = useState('');

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

  // Shipping / DHL
  const [autoGenerateLabel, setAutoGenerateLabel] = useState(false);

  const load = async () => {
    setError(false);
    setLoading(true);
    try {
      const [s, r, tenant, cr] = await Promise.all([
        getReturnsHubSettings(),
        getReturnReasons(),
        getCurrentTenant(),
        getCannedResponses(),
      ]);
      setSettings(s);
      setReasons(r);
      setCannedResponses(cr);
      if (tenant) {
        setTenantSlug(tenant.slug || tenant.id);
        setTenantName(tenant.name || '');
      }
      if (s?.features) {
        const slaSettings = (s as any).slaDefaults;
        if (slaSettings) {
          setSlaFirstResponseHours(String(slaSettings.firstResponseHours || 4));
          setSlaResolutionHours(String(slaSettings.resolutionHours || 24));
        }
        setAutoGenerateLabel((s as any).autoGenerateLabel ?? false);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const prefersReduced = useReducedMotion();

  if (error) {
    return <ErrorState onRetry={load} />;
  }

  if (loading) {
    return (
      <div className="space-y-6">
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

  const Wrapper = prefersReduced ? 'div' : motion.div;
  const wrapperProps = prefersReduced ? {} : { variants: pageVariants, initial: 'initial', animate: 'animate', transition: pageTransition };

  return (
    <Wrapper className="space-y-6" {...wrapperProps as any}>
      <div>
        <h1 className="text-2xl font-bold">{t('Settings')}</h1>
        <p className="text-muted-foreground">{t('Configure your Returns Hub')}</p>
      </div>

      <Tabs defaultValue="general">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="w-full flex-nowrap">
            <TabsTrigger value="general" className="text-xs sm:text-sm">{t('General')}</TabsTrigger>
            <TabsTrigger value="reasons" className="text-xs sm:text-sm">{t('Return Reasons')}</TabsTrigger>
            <TabsTrigger value="tickets" className="text-xs sm:text-sm">{t('Tickets & SLA')}</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm">{t('Notifications')}</TabsTrigger>
            <TabsTrigger value="shipping" className="text-xs sm:text-sm gap-1">
              <Truck className="h-3.5 w-3.5" />
              {t('Shipping')}
            </TabsTrigger>
            <TabsTrigger value="appearance" className="text-xs sm:text-sm">{t('Portal Design')}</TabsTrigger>
            <TabsTrigger value="portal" className="text-xs sm:text-sm">{t('Portal Setup')}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('Return Reasons')}</CardTitle>
              <CardDescription>{t('Configure return reason categories')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder={t('New reason category...')}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddReason()}
                  className="flex-1"
                />
                <Button onClick={handleAddReason} disabled={!newCategory.trim()} className="w-full sm:w-auto">
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
                  {reasons.map((reason) => (
                    <div
                      key={reason.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <Switch checked={reason.active} onCheckedChange={(v) => handleToggleReason(reason.id, v)} />
                        <div>
                          <span className="font-medium">{reason.category}</span>
                          {reason.subcategories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {reason.subcategories.map(sub => (
                                <Badge key={sub} variant="secondary" className="text-xs">{sub}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-10 sm:ml-0">
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

        <TabsContent value="shipping" className="mt-4">
          <ShippingSettingsTab
            autoGenerateLabel={autoGenerateLabel}
            onAutoGenerateLabelChange={setAutoGenerateLabel}
            saving={saving}
            onSave={async () => {
              if (!settings) return;
              setSaving(true);
              await updateReturnsHubSettings({
                ...settings,
                autoGenerateLabel,
              } as any);
              setSaving(false);
            }}
          />
        </TabsContent>

        <TabsContent value="appearance" className="mt-4 space-y-4">
          <PortalDesignTab
            settings={settings!}
            setSettings={setSettings}
            saving={saving}
            onSave={handleSaveSettings}
          />
        </TabsContent>

        <TabsContent value="tickets" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('SLA')}</CardTitle>
              <CardDescription>{t('Default SLA times for new tickets')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <Card>
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
                  {cannedResponses.map((resp) => (
                    <div
                      key={resp.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between p-3 rounded-lg border hover:shadow-sm transition-shadow"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{resp.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{resp.content}</p>
                      </div>
                      <div className="flex items-center gap-1 sm:ml-2">
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
          <Card>
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

              <div className="space-y-2">
                <Label>{t('Email Language')}</Label>
                <p className="text-xs text-muted-foreground">{t('Language used for automated email notifications sent to customers')}</p>
                <select
                  className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={settings.notifications?.emailLocale ?? 'en'}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, emailLocale: e.target.value },
                  })}
                >
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotificationSettings} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {t('Save')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('Email Templates Configuration')}</CardTitle>
              <CardDescription>{t('Configure email templates for different events')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border bg-muted/30">
                <div>
                  <p className="font-medium text-sm">{t('Email Template Editor')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Visual editor with 15 templates, block editor, and live preview')}</p>
                </div>
                <Button onClick={() => navigate('/returns/email-templates')} className="gap-1.5 w-full sm:w-auto">
                  {t('Open Email Template Editor')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portal" className="mt-4 space-y-4">
          <PortalSetupTab
            settings={settings!}
            setSettings={setSettings}
            tenantSlug={tenantSlug}
            saving={saving}
            onSave={handleSaveSettings}
          />
          {tenantSlug && (
            <EmbedSnippetCard
              tenantSlug={tenantSlug}
              tenantName={tenantName}
              allowedDomains={settings?.embedAllowedDomains ?? []}
              onAllowedDomainsChange={async (domains) => {
                if (!settings) return;
                const updated = { ...settings, embedAllowedDomains: domains };
                setSettings(updated);
                await updateReturnsHubSettings(updated);
              }}
            />
          )}
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
    </Wrapper>
  );
}
