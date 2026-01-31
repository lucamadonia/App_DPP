import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Save, Plus, Trash2, Mail, Pencil } from 'lucide-react';
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
import {
  getReturnsHubSettings, updateReturnsHubSettings,
  getReturnReasons, createReturnReason, updateReturnReason, deleteReturnReason,
  getRhEmailTemplates, upsertRhEmailTemplate, seedDefaultEmailTemplates,
} from '@/services/supabase';
import type { ReturnsHubSettings, RhReturnReason, RhEmailTemplate } from '@/types/returns-hub';

export function ReturnsSettingsPage() {
  const { t } = useTranslation('returns');
  const [settings, setSettings] = useState<ReturnsHubSettings | null>(null);
  const [reasons, setReasons] = useState<RhReturnReason[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<RhEmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<RhEmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [seedingTemplates, setSeedingTemplates] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [s, r, et] = await Promise.all([
        getReturnsHubSettings(),
        getReturnReasons(),
        getRhEmailTemplates(),
      ]);
      setSettings(s);
      setReasons(r);
      setEmailTemplates(et);
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

  const handleSeedTemplates = async () => {
    setSeedingTemplates(true);
    await seedDefaultEmailTemplates();
    const et = await getRhEmailTemplates();
    setEmailTemplates(et);
    setSeedingTemplates(false);
  };

  const handleOpenEditTemplate = (tmpl: RhEmailTemplate) => {
    setEditingTemplate(tmpl);
    setEditSubject(tmpl.subjectTemplate);
    setEditBody(tmpl.bodyTemplate);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    setSavingTemplate(true);
    await upsertRhEmailTemplate({
      eventType: editingTemplate.eventType,
      enabled: editingTemplate.enabled,
      subjectTemplate: editSubject,
      bodyTemplate: editBody,
    });
    const et = await getRhEmailTemplates();
    setEmailTemplates(et);
    setEditingTemplate(null);
    setSavingTemplate(false);
  };

  const handleToggleTemplate = async (tmpl: RhEmailTemplate, enabled: boolean) => {
    await upsertRhEmailTemplate({
      eventType: tmpl.eventType,
      enabled,
      subjectTemplate: tmpl.subjectTemplate,
      bodyTemplate: tmpl.bodyTemplate,
    });
    const et = await getRhEmailTemplates();
    setEmailTemplates(et);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
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
          <TabsTrigger value="notifications">{t('Notifications')}</TabsTrigger>
        </TabsList>

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
          <Card>
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
                <p className="text-sm text-muted-foreground text-center py-8">{t('No return reasons configured')}</p>
              ) : (
                <div className="space-y-2">
                  {reasons.map((reason) => (
                    <div key={reason.id} className="flex items-center justify-between p-3 rounded-lg border">
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('License')}</CardTitle>
              <CardDescription>{t('Your current plan and usage')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className="text-lg px-3 py-1 capitalize">{settings.plan}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">{t('Returns this month')}</p>
                  <p className="text-2xl font-bold">{settings.usage.returnsThisMonth} <span className="text-sm font-normal text-muted-foreground">{t('of {{max}} included', { max: settings.maxReturnsPerMonth })}</span></p>
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
          <Card>
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
              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {t('Save')}
                </Button>
              </div>
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
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{t('Initialize default email templates for all event types')}</p>
                <Button variant="outline" onClick={handleSeedTemplates} disabled={seedingTemplates}>
                  {seedingTemplates ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  {t('Initialize Templates')}
                </Button>
              </div>

              <div className="rounded-md border p-3 bg-muted/50">
                <p className="text-xs font-medium mb-1">{t('Available Variables')}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {'{{customerName}}, {{returnNumber}}, {{status}}, {{reason}}, {{refundAmount}}, {{ticketNumber}}, {{subject}}, {{trackingUrl}}'}
                </p>
              </div>

              {emailTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('No email templates configured')}</p>
              ) : (
                <div className="space-y-2">
                  {emailTemplates.map((tmpl) => (
                    <div key={tmpl.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={tmpl.enabled}
                          onCheckedChange={(v) => handleToggleTemplate(tmpl, v)}
                        />
                        <div>
                          <span className="font-medium text-sm">{t(tmpl.eventType)}</span>
                          <p className="text-xs text-muted-foreground truncate max-w-md">{tmpl.subjectTemplate}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditTemplate(tmpl)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('Edit Template')} — {editingTemplate ? t(editingTemplate.eventType) : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Subject')}</Label>
              <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('Body')}</Label>
              <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={8} />
            </div>
            <div className="rounded-md border p-3 bg-muted/50">
              <p className="text-xs font-medium mb-1">{t('Available Variables')}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {'{{customerName}}, {{returnNumber}}, {{status}}, {{reason}}, {{refundAmount}}, {{ticketNumber}}, {{subject}}, {{trackingUrl}}'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>{t('Cancel')}</Button>
            <Button onClick={handleSaveTemplate} disabled={savingTemplate}>
              {savingTemplate ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {t('Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
