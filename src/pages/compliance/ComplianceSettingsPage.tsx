import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Zap, Recycle, Mail, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import {
  getComplianceSettings,
  updateComplianceSettings,
  DEFAULT_COMPLIANCE_SETTINGS,
} from '@/services/supabase/compliance-settings';
import type { ComplianceSettings, DistributorRole } from '@/types/compliance';
import { toast } from 'sonner';

export function ComplianceSettingsPage() {
  const { t } = useTranslation('compliance');
  const [settings, setSettings] = useState<ComplianceSettings>(DEFAULT_COMPLIANCE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getComplianceSettings().then(s => { setSettings(s); setLoading(false); });
  }, []);

  async function save() {
    setSaving(true);
    const res = await updateComplianceSettings(settings);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || t('Error saving'));
      return;
    }
    toast.success(t('Compliance settings saved'));
  }

  if (loading) return <ShimmerSkeleton className="h-96 w-full" />;

  const ear = settings.ear || DEFAULT_COMPLIANCE_SETTINGS.ear!;
  const lucid = settings.lucid || DEFAULT_COMPLIANCE_SETTINGS.lucid!;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {t('Compliance Settings')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('Registration numbers, brands, and reminder options for the EAR/LUCID monthly reports.')}
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('Save')}
        </Button>
      </div>

      <Tabs defaultValue="ear">
        <TabsList>
          <TabsTrigger value="ear" className="gap-1.5"><Zap className="h-3.5 w-3.5" />EAR / ElektroG</TabsTrigger>
          <TabsTrigger value="lucid" className="gap-1.5"><Recycle className="h-3.5 w-3.5" />LUCID / VerpackG</TabsTrigger>
        </TabsList>

        <TabsContent value="ear" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('Stiftung EAR Registration')}</CardTitle>
              <CardDescription>
                {t('Mandatory identifiers for the monthly report to the Stiftung Elektro-Altgeräte-Register.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                title={t('EAR module active')}
                desc={t('Enable monthly EAR reporting for this tenant.')}
                checked={ear.enabled}
                onChange={(v) => setSettings(prev => ({ ...prev, ear: { ...ear, enabled: v } }))}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('WEEE Reg. No. *')}</label>
                  <Input
                    value={ear.weeeNumber}
                    onChange={(e) => setSettings(prev => ({ ...prev, ear: { ...ear, weeeNumber: e.target.value } }))}
                    placeholder="WEEE-Reg.-Nr. DE 12345678"
                    className="font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">{t('Issued by the Stiftung EAR after registration.')}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('Brand *')}</label>
                  <Input
                    value={ear.stiftungEarBrand}
                    onChange={(e) => setSettings(prev => ({ ...prev, ear: { ...ear, stiftungEarBrand: e.target.value } }))}
                    placeholder={t('e.g. FAMBLISS')}
                  />
                  <p className="text-[10px] text-muted-foreground">{t('Under which the devices are reported to the Stiftung EAR.')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />{t('Reminders')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow
                title={t('Email reminders active')}
                desc={t('Automatic reminders 5/2/0 days before the 15th deadline, plus escalation when overdue.')}
                checked={ear.autoReminders}
                onChange={(v) => setSettings(prev => ({ ...prev, ear: { ...ear, autoReminders: v } }))}
              />
              <ToggleRow
                title={t('Auto-draft at month end')}
                desc={t('Automatically creates a report draft for the previous month on the 1st of each month.')}
                checked={ear.autoGenerateOnMonthEnd}
                onChange={(v) => setSettings(prev => ({ ...prev, ear: { ...ear, autoGenerateOnMonthEnd: v } }))}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('Email recipients')}</label>
                <Input
                  value={(ear.contactEmails || []).join(', ')}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    ear: { ...ear, contactEmails: e.target.value.split(',').map(s => s.trim()).filter(Boolean) },
                  }))}
                  placeholder={t('compliance@company.com, management@company.com')}
                />
                <p className="text-[10px] text-muted-foreground">{t('Separate multiple emails with commas.')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lucid" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('ZSVR LUCID Registration')}</CardTitle>
              <CardDescription>
                {t('Mandatory identifiers for the monthly report to the Zentrale Stelle Verpackungsregister.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                title={t('LUCID module active')}
                desc={t('Enable monthly LUCID reporting for this tenant.')}
                checked={lucid.enabled}
                onChange={(v) => setSettings(prev => ({ ...prev, lucid: { ...lucid, enabled: v } }))}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('LUCID Number *')}</label>
                  <Input
                    value={lucid.lucidNumber}
                    onChange={(e) => setSettings(prev => ({ ...prev, lucid: { ...lucid, lucidNumber: e.target.value } }))}
                    placeholder="DE1234567890123"
                    className="font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">{t('13 digits, issued by the ZSVR.')}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('Role')}</label>
                  <Select value={lucid.distributorRole} onValueChange={(v) => setSettings(prev => ({ ...prev, lucid: { ...lucid, distributorRole: v as DistributorRole } }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manufacturer">{t('Manufacturer')}</SelectItem>
                      <SelectItem value="distributor">{t('Distributor / Retailer')}</SelectItem>
                      <SelectItem value="importer">{t('Importer')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('Dual system (optional)')}</label>
                <Input
                  value={lucid.dualSystem || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, lucid: { ...lucid, dualSystem: e.target.value || undefined } }))}
                  placeholder={t('e.g. Der Grüne Punkt, Interseroh+, LIZENZERO')}
                />
                <p className="text-[10px] text-muted-foreground">{t('Where you participate in a dual system — reported on the PDF.')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />{t('Reminders')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow
                title={t('Email reminders active')}
                desc={t('Automatic reminders 5/2/0 days before the 15th deadline.')}
                checked={lucid.autoReminders}
                onChange={(v) => setSettings(prev => ({ ...prev, lucid: { ...lucid, autoReminders: v } }))}
              />
              <ToggleRow
                title={t('Auto-draft at month end')}
                desc={t('Automatically creates a report draft on the 1st of each month.')}
                checked={lucid.autoGenerateOnMonthEnd}
                onChange={(v) => setSettings(prev => ({ ...prev, lucid: { ...lucid, autoGenerateOnMonthEnd: v } }))}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('Email recipients')}</label>
                <Input
                  value={(lucid.contactEmails || []).join(', ')}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    lucid: { ...lucid, contactEmails: e.target.value.split(',').map(s => s.trim()).filter(Boolean) },
                  }))}
                  placeholder={t('compliance@company.com')}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ToggleRow({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
