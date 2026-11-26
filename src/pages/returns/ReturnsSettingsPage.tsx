import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Save, Plus, Trash2, Mail, Pencil, MessageSquareText, ArrowRight, Settings2, Truck, Clock } from 'lucide-react';
import { FormSections, FormSection, FormGrid, FormField, InputAffix, ChoiceCards, FormToggleRow, FormActions } from '@/components/ui/form-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollableTabs } from '@/components/ui/scrollable-tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/adaptive-dialog';
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
import { toast } from 'sonner';

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

  const showActionError = (err: unknown) => {
    toast.error(`${t('Action failed')}: ${err instanceof Error ? err.message : String(err)}`);
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateReturnsHubSettings(settings);
    } catch (err) {
      showActionError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddReason = async () => {
    if (!newCategory.trim()) return;
    try {
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
    } catch (err) {
      showActionError(err);
    }
  };

  const handleDeleteReason = async (id: string) => {
    try {
      await deleteReturnReason(id);
      const r = await getReturnReasons();
      setReasons(r);
    } catch (err) {
      showActionError(err);
    }
  };

  const handleToggleReason = async (id: string, active: boolean) => {
    try {
      await updateReturnReason(id, { active });
      const r = await getReturnReasons();
      setReasons(r);
    } catch (err) {
      showActionError(err);
    }
  };

  const handleSaveNotificationSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateReturnsHubSettings({ notifications: settings.notifications });
    } catch (err) {
      showActionError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCannedResponse = async () => {
    if (!newResponseTitle.trim() || !newResponseContent.trim()) return;
    setSavingResponses(true);
    try {
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
    } catch (err) {
      showActionError(err);
    } finally {
      setSavingResponses(false);
    }
  };

  const handleDeleteCannedResponse = async (id: string) => {
    setSavingResponses(true);
    try {
      const updated = cannedResponses.filter((r) => r.id !== id);
      await saveCannedResponses(updated);
      setCannedResponses(updated);
    } catch (err) {
      showActionError(err);
    } finally {
      setSavingResponses(false);
    }
  };

  const handleOpenEditResponse = (response: RhCannedResponse) => {
    setEditingResponse(response);
    setEditResponseTitle(response.title);
    setEditResponseContent(response.content);
  };

  const handleSaveEditResponse = async () => {
    if (!editingResponse) return;
    setSavingResponses(true);
    try {
      const updated = cannedResponses.map((r) =>
        r.id === editingResponse.id
          ? { ...r, title: editResponseTitle.trim(), content: editResponseContent.trim() }
          : r
      );
      await saveCannedResponses(updated);
      setCannedResponses(updated);
      setEditingResponse(null);
    } catch (err) {
      showActionError(err);
    } finally {
      setSavingResponses(false);
    }
  };

  const handleSaveSlaDefaults = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateReturnsHubSettings({
        ...settings,
        slaDefaults: {
          firstResponseHours: parseInt(slaFirstResponseHours) || 4,
          resolutionHours: parseInt(slaResolutionHours) || 24,
        },
      } as any);
    } catch (err) {
      showActionError(err);
    } finally {
      setSaving(false);
    }
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
        <ScrollableTabs className="-mx-1 px-1">
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
        </ScrollableTabs>

        <TabsContent value="general" className="mt-4">
          <FormSections>
            <FormSection
              title={t('General')}
              description={t('Basic Returns Hub configuration')}
              icon={Settings2}
            >
              <FormToggleRow
                htmlFor="rh-enabled"
                label={t('Enable Returns Hub')}
                description={t('Activate the Returns Hub module for your organization')}
              >
                <Switch id="rh-enabled" checked={settings.enabled} onCheckedChange={(v) => setSettings({ ...settings, enabled: v })} />
              </FormToggleRow>
              <FormGrid cols={2}>
                <FormField label={t('Return Number Prefix')}>
                  <Input value={settings.prefix} onChange={(e) => setSettings({ ...settings, prefix: e.target.value })} placeholder="RET" />
                </FormField>
                <FormField label={t('Default Solution')}>
                  <Select value="refund" onValueChange={() => {}}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="refund">{t('Refund')}</SelectItem>
                      <SelectItem value="exchange">{t('Exchange')}</SelectItem>
                      <SelectItem value="voucher">{t('Voucher')}</SelectItem>
                      <SelectItem value="repair">{t('Repair')}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </FormGrid>
              <FormActions>
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {t('Save')}
                </Button>
              </FormActions>
            </FormSection>
          </FormSections>
        </TabsContent>

        <TabsContent value="reasons" className="mt-4">
          <FormSection
            title={t('Return Reasons')}
            description={t('Configure return reason categories')}
            icon={MessageSquareText}
            layout="stacked"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder={t('New reason category...')}
                aria-label={t('New reason category...')}
                onKeyDown={(e) => e.key === 'Enter' && handleAddReason()}
                className="flex-1 pointer-coarse:h-11"
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
              <ul className="divide-y rounded-lg border">
                {reasons.map((reason) => (
                  <li key={reason.id} className="flex min-h-14 items-center gap-3 px-3 py-2.5 sm:px-4">
                    <Switch
                      checked={reason.active}
                      onCheckedChange={(v) => handleToggleReason(reason.id, v)}
                      aria-label={reason.category}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{reason.category}</span>
                      {(reason.subcategories.length > 0 || reason.requiresPhotos) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {reason.requiresPhotos && <Badge variant="outline" className="text-xs">{t('Requires Photos')}</Badge>}
                          {reason.subcategories.map(sub => (
                            <Badge key={sub} variant="secondary" className="text-xs">{sub}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0 text-destructive sm:size-9"
                      onClick={() => handleDeleteReason(reason.id)}
                      aria-label={t('Delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </FormSection>
        </TabsContent>

        <TabsContent value="shipping" className="mt-4">
          <ShippingSettingsTab
            autoGenerateLabel={autoGenerateLabel}
            onAutoGenerateLabelChange={setAutoGenerateLabel}
            saving={saving}
            onSave={async () => {
              if (!settings) return;
              setSaving(true);
              try {
                await updateReturnsHubSettings({
                  ...settings,
                  autoGenerateLabel,
                } as any);
              } catch (err) {
                showActionError(err);
              } finally {
                setSaving(false);
              }
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

        <TabsContent value="tickets" className="mt-4">
          <FormSections>
            <FormSection title={t('SLA')} description={t('Default SLA times for new tickets')} icon={Clock}>
              <FormGrid cols={2}>
                <FormField label={t('SLA First Response')}>
                  <InputAffix suffix={t('hours')}>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={slaFirstResponseHours}
                      onChange={(e) => setSlaFirstResponseHours(e.target.value)}
                    />
                  </InputAffix>
                </FormField>
                <FormField label={t('SLA Resolution')}>
                  <InputAffix suffix={t('hours')}>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={slaResolutionHours}
                      onChange={(e) => setSlaResolutionHours(e.target.value)}
                    />
                  </InputAffix>
                </FormField>
              </FormGrid>
              <FormActions>
                <Button onClick={handleSaveSlaDefaults} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {t('Save')}
                </Button>
              </FormActions>
            </FormSection>

            <FormSection
              title={t('Canned Responses')}
              description={t('Text templates for quick ticket replies')}
              icon={MessageSquareText}
            >
              <div className="space-y-4 rounded-lg border bg-muted/30 p-3 sm:p-4">
                <FormField label={t('Title')}>
                  <Input
                    value={newResponseTitle}
                    onChange={(e) => setNewResponseTitle(e.target.value)}
                    placeholder={t('Response title...')}
                  />
                </FormField>
                <FormField label={t('Content')}>
                  <Textarea
                    value={newResponseContent}
                    onChange={(e) => setNewResponseContent(e.target.value)}
                    placeholder={t('Response text...')}
                    rows={3}
                  />
                </FormField>
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddCannedResponse}
                    disabled={!newResponseTitle.trim() || !newResponseContent.trim() || savingResponses}
                    variant="outline"
                    className="w-full sm:w-auto"
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
                <ul className="divide-y rounded-lg border">
                  {cannedResponses.map((resp) => (
                    <li key={resp.id} className="flex items-start gap-2 px-3 py-3 sm:px-4">
                      <div className="min-w-0 flex-1 self-center">
                        <p className="text-sm font-medium">{resp.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{resp.content}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="size-11 shrink-0 sm:size-9" onClick={() => handleOpenEditResponse(resp)} aria-label={t('Edit')}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-11 shrink-0 text-destructive sm:size-9" onClick={() => handleDeleteCannedResponse(resp.id)} aria-label={t('Delete')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </FormSection>
          </FormSections>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <FormSections>
            <FormSection
              title={t('Email Notifications')}
              description={t('Send email notifications when return status changes')}
              icon={Mail}
            >
              <FormToggleRow htmlFor="rh-email-enabled" label={t('Enable email notifications')}>
                <Switch
                  id="rh-email-enabled"
                  checked={settings.notifications?.emailEnabled ?? false}
                  onCheckedChange={(v) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, emailEnabled: v },
                  })}
                />
              </FormToggleRow>
              <FormGrid cols={2}>
                <FormField label={t('Sender Name')}>
                  <Input
                    value={settings.notifications?.senderName ?? ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, senderName: e.target.value },
                    })}
                    placeholder={t('Name shown as email sender')}
                  />
                </FormField>
                <FormField
                  label={t('Email Language')}
                  hint={t('Language used for automated email notifications sent to customers')}
                >
                  <ChoiceCards
                    value={settings.notifications?.emailLocale ?? 'en'}
                    onValueChange={(v) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, emailLocale: v },
                    })}
                    options={[
                      { value: 'en', label: 'English' },
                      { value: 'de', label: 'Deutsch' },
                    ]}
                  />
                </FormField>
              </FormGrid>
              <FormActions>
                <Button onClick={handleSaveNotificationSettings} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {t('Save')}
                </Button>
              </FormActions>
            </FormSection>

            <FormSection
              title={t('Email Templates Configuration')}
              description={t('Configure email templates for different events')}
              icon={Pencil}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t('Email Template Editor')}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('Visual editor with 15 templates, block editor, and live preview')}</p>
                </div>
                <Button onClick={() => navigate('/returns/email-templates')} className="w-full gap-1.5 sm:w-auto">
                  {t('Open Email Template Editor')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </FormSection>
          </FormSections>
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
          <div className="space-y-5">
            <FormField label={t('Title')}>
              <Input value={editResponseTitle} onChange={(e) => setEditResponseTitle(e.target.value)} />
            </FormField>
            <FormField label={t('Content')}>
              <Textarea value={editResponseContent} onChange={(e) => setEditResponseContent(e.target.value)} rows={5} />
            </FormField>
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
