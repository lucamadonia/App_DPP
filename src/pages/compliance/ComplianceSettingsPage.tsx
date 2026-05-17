import { useEffect, useState } from 'react';
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
      toast.error(res.error || 'Fehler beim Speichern');
      return;
    }
    toast.success('Compliance-Einstellungen gespeichert');
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
            Compliance-Einstellungen
          </h1>
          <p className="text-sm text-muted-foreground">
            Registrierungsnummern, Marken und Reminder-Optionen für die EAR-/LUCID-Monatsmeldungen.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Speichern
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
              <CardTitle className="text-base">Stiftung-EAR-Registrierung</CardTitle>
              <CardDescription>
                Pflicht-Identifiers für die Monatsmeldung an die Stiftung Elektro-Altgeräte-Register.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                title="EAR-Modul aktiv"
                desc="Aktiviere die monatliche EAR-Berichterstattung für diesen Tenant."
                checked={ear.enabled}
                onChange={(v) => setSettings(prev => ({ ...prev, ear: { ...ear, enabled: v } }))}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">WEEE-Reg.-Nummer *</label>
                  <Input
                    value={ear.weeeNumber}
                    onChange={(e) => setSettings(prev => ({ ...prev, ear: { ...ear, weeeNumber: e.target.value } }))}
                    placeholder="WEEE-Reg.-Nr. DE 12345678"
                    className="font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">Vergeben durch die Stiftung EAR nach Registrierung.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Marke *</label>
                  <Input
                    value={ear.stiftungEarBrand}
                    onChange={(e) => setSettings(prev => ({ ...prev, ear: { ...ear, stiftungEarBrand: e.target.value } }))}
                    placeholder="z. B. FAMBLISS"
                  />
                  <p className="text-[10px] text-muted-foreground">Unter der die Geräte bei Stiftung EAR gemeldet werden.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Erinnerungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow
                title="Email-Reminder aktiv"
                desc="Automatische Erinnerungen 5/2/0 Tage vor der 15.-Frist, sowie Eskalation bei Überschreitung."
                checked={ear.autoReminders}
                onChange={(v) => setSettings(prev => ({ ...prev, ear: { ...ear, autoReminders: v } }))}
              />
              <ToggleRow
                title="Auto-Entwurf am Monatsende"
                desc="Erstellt am 1. eines Monats automatisch einen Bericht-Entwurf für den Vormonat."
                checked={ear.autoGenerateOnMonthEnd}
                onChange={(v) => setSettings(prev => ({ ...prev, ear: { ...ear, autoGenerateOnMonthEnd: v } }))}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email-Empfänger</label>
                <Input
                  value={(ear.contactEmails || []).join(', ')}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    ear: { ...ear, contactEmails: e.target.value.split(',').map(s => s.trim()).filter(Boolean) },
                  }))}
                  placeholder="compliance@firma.de, geschaeftsfuehrung@firma.de"
                />
                <p className="text-[10px] text-muted-foreground">Mehrere Emails durch Komma trennen.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lucid" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ZSVR-LUCID-Registrierung</CardTitle>
              <CardDescription>
                Pflicht-Identifiers für die Monatsmeldung an die Zentrale Stelle Verpackungsregister.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                title="LUCID-Modul aktiv"
                desc="Aktiviere die monatliche LUCID-Berichterstattung für diesen Tenant."
                checked={lucid.enabled}
                onChange={(v) => setSettings(prev => ({ ...prev, lucid: { ...lucid, enabled: v } }))}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">LUCID-Nummer *</label>
                  <Input
                    value={lucid.lucidNumber}
                    onChange={(e) => setSettings(prev => ({ ...prev, lucid: { ...lucid, lucidNumber: e.target.value } }))}
                    placeholder="DE1234567890123"
                    className="font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">13-stellig, vergeben durch die ZSVR.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Rolle</label>
                  <Select value={lucid.distributorRole} onValueChange={(v) => setSettings(prev => ({ ...prev, lucid: { ...lucid, distributorRole: v as DistributorRole } }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manufacturer">Hersteller</SelectItem>
                      <SelectItem value="distributor">Vertreiber / Händler</SelectItem>
                      <SelectItem value="importer">Importeur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Duales System (optional)</label>
                <Input
                  value={lucid.dualSystem || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, lucid: { ...lucid, dualSystem: e.target.value || undefined } }))}
                  placeholder="z. B. Der Grüne Punkt, Interseroh+, LIZENZERO"
                />
                <p className="text-[10px] text-muted-foreground">Wo du systembeteiligt bist — wird auf dem PDF gemeldet.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Erinnerungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow
                title="Email-Reminder aktiv"
                desc="Automatische Erinnerungen 5/2/0 Tage vor der 15.-Frist."
                checked={lucid.autoReminders}
                onChange={(v) => setSettings(prev => ({ ...prev, lucid: { ...lucid, autoReminders: v } }))}
              />
              <ToggleRow
                title="Auto-Entwurf am Monatsende"
                desc="Erstellt am 1. eines Monats automatisch einen Bericht-Entwurf."
                checked={lucid.autoGenerateOnMonthEnd}
                onChange={(v) => setSettings(prev => ({ ...prev, lucid: { ...lucid, autoGenerateOnMonthEnd: v } }))}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email-Empfänger</label>
                <Input
                  value={(lucid.contactEmails || []).join(', ')}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    lucid: { ...lucid, contactEmails: e.target.value.split(',').map(s => s.trim()).filter(Boolean) },
                  }))}
                  placeholder="compliance@firma.de"
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
