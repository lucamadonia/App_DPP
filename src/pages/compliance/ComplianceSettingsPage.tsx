import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Recycle, Mail, Save, Loader2, Factory, Store, Ship } from 'lucide-react';
import { FormSections, FormSection, FormGrid, FormField, ChoiceCards, FormToggleRow } from '@/components/ui/form-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import {
  getComplianceSettings,
  updateComplianceSettings,
  DEFAULT_COMPLIANCE_SETTINGS,
} from '@/services/supabase/compliance-settings';
import type { ComplianceSettings, DistributorRole } from '@/types/compliance';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { ComplianceSubnav } from '@/components/compliance/hub/hub-primitives';
import { ComplianceSetupStatus } from '@/components/compliance/hub/ComplianceSetupStatus';

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

  if (loading) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="space-y-2">
          <ShimmerSkeleton className="h-8 w-56" />
          <ShimmerSkeleton className="h-4 w-80 max-w-full" />
        </div>
        <ShimmerSkeleton className="h-11 w-full max-w-md rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
          <Card className="p-4"><ShimmerSkeleton className="h-28 rounded-lg" /></Card>
          <Card className="p-4"><ShimmerSkeleton className="h-28 rounded-lg" /></Card>
        </div>
        <Card className="p-4"><ShimmerSkeleton className="h-72 rounded-lg" /></Card>
      </div>
    );
  }

  const ear = settings.ear || DEFAULT_COMPLIANCE_SETTINGS.ear!;
  const lucid = settings.lucid || DEFAULT_COMPLIANCE_SETTINGS.lucid!;

  const saveButton = (
    <Button onClick={save} disabled={saving} className="min-h-11 w-full gap-1.5 md:min-h-9 md:w-auto">
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {t('Save')}
    </Button>
  );

  return (
    <PageContainer
      size="full"
      padding={false}
      title={t('Compliance Settings')}
      description={t('Registration numbers, brands, and reminder options for the EAR/LUCID monthly reports.')}
      actions={<div className="hidden md:block">{saveButton}</div>}
      bottomBar={saveButton}
    >
      <ComplianceSubnav />
      <div className="space-y-5 sm:space-y-6">
      <ComplianceSetupStatus ear={ear} lucid={lucid} />

      <Tabs defaultValue="ear">
        <TabsList className="h-auto w-full sm:w-auto">
          <TabsTrigger value="ear" className="min-h-10 flex-1 gap-1.5 sm:flex-none">
            <Zap className="h-3.5 w-3.5" />EAR / ElektroG
            <StatusDot on={ear.enabled} />
          </TabsTrigger>
          <TabsTrigger value="lucid" className="min-h-10 flex-1 gap-1.5 sm:flex-none">
            <Recycle className="h-3.5 w-3.5" />LUCID / VerpackG
            <StatusDot on={lucid.enabled} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ear" className="mt-4">
          <FormSections>
            <FormSection
              title={t('Stiftung EAR Registration')}
              description={t('Mandatory identifiers for the monthly report to the Stiftung Elektro-Altgeräte-Register.')}
              icon={Zap}
            >
              <ToggleRow
                title={t('EAR module active')}
                desc={t('Enable monthly EAR reporting for this tenant.')}
                checked={ear.enabled}
                onChange={(v) => setSettings(prev => ({ ...prev, ear: { ...ear, enabled: v } }))}
              />
              <FormGrid cols={2}>
                <FormField label={req(t('WEEE Reg. No. *'))} required hint={t('Issued by the Stiftung EAR after registration.')}>
                  <Input
                    value={ear.weeeNumber}
                    onChange={(e) => setSettings(prev => ({ ...prev, ear: { ...ear, weeeNumber: e.target.value } }))}
                    placeholder="WEEE-Reg.-Nr. DE 12345678"
                    className="font-mono"
                  />
                </FormField>
                <FormField label={req(t('Brand *'))} required hint={t('Under which the devices are reported to the Stiftung EAR.')}>
                  <Input
                    value={ear.stiftungEarBrand}
                    onChange={(e) => setSettings(prev => ({ ...prev, ear: { ...ear, stiftungEarBrand: e.target.value } }))}
                    placeholder={t('e.g. FAMBLISS')}
                  />
                </FormField>
              </FormGrid>
            </FormSection>

            <FormSection title={t('Reminders')} icon={Mail}>
              <div className="space-y-2">
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
              </div>
              <FormField label={t('Email recipients')} hint={t('Separate multiple emails with commas.')}>
                <Input
                  type="text"
                  inputMode="email"
                  value={(ear.contactEmails || []).join(', ')}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    ear: { ...ear, contactEmails: e.target.value.split(',').map(s => s.trim()).filter(Boolean) },
                  }))}
                  placeholder={t('compliance@company.com, management@company.com')}
                />
              </FormField>
            </FormSection>
          </FormSections>
        </TabsContent>

        <TabsContent value="lucid" className="mt-4">
          <FormSections>
            <FormSection
              title={t('ZSVR LUCID Registration')}
              description={t('Mandatory identifiers for the monthly report to the Zentrale Stelle Verpackungsregister.')}
              icon={Recycle}
            >
              <ToggleRow
                title={t('LUCID module active')}
                desc={t('Enable monthly LUCID reporting for this tenant.')}
                checked={lucid.enabled}
                onChange={(v) => setSettings(prev => ({ ...prev, lucid: { ...lucid, enabled: v } }))}
              />
              <FormField label={req(t('LUCID Number *'))} required hint={t('13 digits, issued by the ZSVR.')}>
                <Input
                  value={lucid.lucidNumber}
                  onChange={(e) => setSettings(prev => ({ ...prev, lucid: { ...lucid, lucidNumber: e.target.value } }))}
                  placeholder="DE1234567890123"
                  className="font-mono"
                />
              </FormField>
              <FormField label={t('Role')}>
                <ChoiceCards
                  columns={3}
                  value={lucid.distributorRole}
                  onValueChange={(v) => setSettings(prev => ({ ...prev, lucid: { ...lucid, distributorRole: v } }))}
                  options={[
                    { value: 'manufacturer' as DistributorRole, label: t('Manufacturer'), icon: Factory },
                    { value: 'distributor' as DistributorRole, label: t('Distributor / Retailer'), icon: Store },
                    { value: 'importer' as DistributorRole, label: t('Importer'), icon: Ship },
                  ]}
                />
              </FormField>
              <FormField label={req(t('Dual system (optional)'), /\s*\(optional\)$/i)} optional hint={t('Where you participate in a dual system — reported on the PDF.')}>
                <Input
                  value={lucid.dualSystem || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, lucid: { ...lucid, dualSystem: e.target.value || undefined } }))}
                  placeholder={t('e.g. Der Grüne Punkt, Interseroh+, LIZENZERO')}
                />
              </FormField>
            </FormSection>

            <FormSection title={t('Reminders')} icon={Mail}>
              <div className="space-y-2">
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
              </div>
              <FormField label={t('Email recipients')} hint={t('Separate multiple emails with commas.')}>
                <Input
                  type="text"
                  inputMode="email"
                  value={(lucid.contactEmails || []).join(', ')}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    lucid: { ...lucid, contactEmails: e.target.value.split(',').map(s => s.trim()).filter(Boolean) },
                  }))}
                  placeholder={t('compliance@company.com')}
                />
              </FormField>
            </FormSection>
          </FormSections>
        </TabsContent>
      </Tabs>
      </div>
    </PageContainer>
  );
}

function StatusDot({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={on ? 'h-1.5 w-1.5 shrink-0 rounded-full bg-success' : 'h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40'}
    />
  );
}

/** Strip the legacy " *" / "(optional)" marker baked into the translation; FormField renders its own. */
function req(label: string, marker: RegExp = /\s*\*$/): string {
  return label.replace(marker, '');
}

function ToggleRow({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <FormToggleRow htmlFor={id} label={title} description={desc}>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </FormToggleRow>
  );
}
