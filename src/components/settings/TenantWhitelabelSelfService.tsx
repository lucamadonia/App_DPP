/**
 * Self-Service Whitelabel-Panel für Tenant-Admins auf /settings/branding.
 * Erlaubt Subdomain, SMTP und Brand-Config — Custom-Domain bleibt
 * Super-Admin-Feature (weil DNS-Verifikation erforderlich).
 */
import { useState, useEffect } from 'react';
import {
  Globe, Save, CheckCircle2, Copy, Mail, Palette, TestTube, Send, AlertCircle, Link2,
  RefreshCw, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormSections, FormSection, FormGrid, FormField, FormActions, FormToggleRow, InputAffix, SecretInput, OptionalDisclosure } from '@/components/ui/form-layout';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import {
  getOwnWhitelabel,
  setOwnSubdomain,
  updateOwnWhitelabelConfig,
  setOwnSmtp,
  testOwnSmtp,
  setOwnCustomDomain,
  verifyOwnCustomDomain,
  type TenantWhitelabel,
} from '@/services/supabase/tenant-whitelabel';
import { toast } from 'sonner';

interface BrandConfig {
  appName?: string;
  supportEmail?: string;
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
}

export function TenantWhitelabelSelfService() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [whitelabel, setWhitelabel] = useState<TenantWhitelabel | null>(null);
  const [subdomain, setSubdomain] = useState('');
  const [brand, setBrand] = useState<BrandConfig>({});
  const [smtpForm, setSmtpForm] = useState({
    enabled: false, host: '', port: 465, username: '', password: '',
    fromAddress: '', fromName: '', useTls: true,
  });
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [smtpTesting, setSmtpTesting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const w = await getOwnWhitelabel();
      setWhitelabel(w);
      setSubdomain(w.subdomain || '');
      setBrand((w.whitelabelConfig || {}) as BrandConfig);
      if (w.smtp) {
        setSmtpForm({
          enabled: w.smtp.enabled,
          host: w.smtp.host || '',
          port: w.smtp.port || 465,
          username: w.smtp.username || '',
          password: '',
          fromAddress: w.smtp.fromAddress || '',
          fromName: w.smtp.fromName || '',
          useTls: w.smtp.useTls ?? true,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveSubdomain() {
    setSaving(true);
    try {
      const res = await setOwnSubdomain(subdomain.trim() || null);
      setSubdomain(res.subdomain || '');
      toast.success(res.fullHost ? `Subdomain gesetzt: ${res.fullHost}` : 'Subdomain gelöscht');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveBrand() {
    setSaving(true);
    try {
      await updateOwnWhitelabelConfig(brand as Record<string, unknown>);
      toast.success('Branding gespeichert');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveSmtp() {
    setSaving(true);
    try {
      await setOwnSmtp(smtpForm);
      setSmtpForm({ ...smtpForm, password: '' });
      toast.success('SMTP-Konfiguration gespeichert');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSmtp() {
    if (!smtpTestEmail.trim()) { toast.error('Test-Adresse fehlt'); return; }
    setSmtpTesting(true);
    try {
      const res = await testOwnSmtp(smtpTestEmail.trim());
      if (res.ok) toast.success(`Test-Mail erfolgreich an ${smtpTestEmail} gesendet!`);
      else toast.error(res.result);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSmtpTesting(false);
    }
  }

  function copy(s: string) {
    navigator.clipboard.writeText(s);
    toast.success('Kopiert');
  }

  if (loading || !whitelabel) {
    return <ShimmerSkeleton className="h-96" />;
  }

  const subdomainHost = subdomain ? `${subdomain}.trackbliss.eu` : null;

  return (
    <FormSections>
      {/* Subdomain */}
      <FormSection
      layout="stacked"
        icon={Globe}
        title="Eigene Subdomain"
        description={<>Erstelle eine Adresse unter <code>.trackbliss.eu</code>, unter der deine Kunden, Team-Mitglieder und öffentliche DPP-Seiten erreichbar sind.</>}
      >
        <div className="space-y-3">
          <FormField
            label="Subdomain"
            htmlFor="wl-subdomain"
            hint={subdomainHost ? (
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                Live unter <code className="rounded bg-muted px-1.5 py-0.5">{subdomainHost}</code>
                <button
                  type="button"
                  onClick={() => copy(`https://${subdomainHost}`)}
                  aria-label="Kopieren"
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </span>
            ) : undefined}
          >
            <InputAffix suffix=".trackbliss.eu" variant="addon">
              <Input
                id="wl-subdomain"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="z.B. dein-firmenname"
                maxLength={32}
                autoCapitalize="none"
                spellCheck={false}
              />
            </InputAffix>
          </FormField>
          <FormActions>
            <Button onClick={saveSubdomain} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Speichern
            </Button>
          </FormActions>
        </div>
      </FormSection>

      {/* Custom Domain — Self-Service */}
      <CustomDomainSection
        whitelabel={whitelabel}
        onChanged={load}
      />

      {/* Branding Config */}
      <FormSection
      layout="stacked"
        icon={Palette}
        title="Marken-Konfiguration"
        description="Erscheint in der App, auf öffentlichen DPP-Seiten und in E-Mails (falls SMTP aktiv)."
      >
        <div className="space-y-5">
          <FormGrid cols={2}>
            <FormField label="App-Name" htmlFor="wl-app-name">
              <Input
                id="wl-app-name"
                value={brand.appName || ''}
                onChange={e => setBrand({ ...brand, appName: e.target.value })}
                placeholder="z.B. Meine Firma"
              />
            </FormField>
            <FormField label="Support-E-Mail" htmlFor="wl-support-email">
              <Input
                id="wl-support-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={brand.supportEmail || ''}
                onChange={e => setBrand({ ...brand, supportEmail: e.target.value })}
                placeholder="support@firma.de"
              />
            </FormField>
            <FormField label="Primärfarbe" htmlFor="wl-primary">
              <InputAffix
                variant="addon"
                prefix={
                  <input
                    type="color"
                    tabIndex={-1}
                    aria-label="Primärfarbe"
                    value={brand.primaryColor || '#4A4E42'}
                    onChange={e => setBrand({ ...brand, primaryColor: e.target.value })}
                    className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                }
              >
                <Input
                  id="wl-primary"
                  value={brand.primaryColor || ''}
                  onChange={e => setBrand({ ...brand, primaryColor: e.target.value })}
                  placeholder="#4A4E42"
                  className="font-mono"
                  spellCheck={false}
                />
              </InputAffix>
            </FormField>
            <FormField label="Akzentfarbe" htmlFor="wl-accent">
              <InputAffix
                variant="addon"
                prefix={
                  <input
                    type="color"
                    tabIndex={-1}
                    aria-label="Akzentfarbe"
                    value={brand.accentColor || '#B8A88A'}
                    onChange={e => setBrand({ ...brand, accentColor: e.target.value })}
                    className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                }
              >
                <Input
                  id="wl-accent"
                  value={brand.accentColor || ''}
                  onChange={e => setBrand({ ...brand, accentColor: e.target.value })}
                  placeholder="#B8A88A"
                  className="font-mono"
                  spellCheck={false}
                />
              </InputAffix>
            </FormField>
            <FormField label="Logo-URL" htmlFor="wl-logo" span="full">
              <Input
                id="wl-logo"
                type="url"
                inputMode="url"
                value={brand.logoUrl || ''}
                onChange={e => setBrand({ ...brand, logoUrl: e.target.value })}
                placeholder="https://cdn.firma.de/logo.png"
              />
            </FormField>
          </FormGrid>
          {brand.logoUrl && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <span className="text-xs text-muted-foreground">Vorschau:</span>
              <img src={brand.logoUrl} alt="Logo" className="h-8 object-contain" />
            </div>
          )}
          <FormActions>
            <Button onClick={saveBrand} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Branding speichern
            </Button>
          </FormActions>
        </div>
      </FormSection>

      {/* SMTP */}
      <FormSection
      layout="stacked"
        icon={Mail}
        title="Eigener SMTP-Server"
        description="Bei Aktivierung werden E-Mails von deinem Server gesendet statt von Trackbliss."
        aside={whitelabel.smtp?.enabled ? (
          <Badge variant="outline" className="gap-1 border-success/30 bg-success/10 text-success">
            <CheckCircle2 className="h-3 w-3" /> Aktiv
          </Badge>
        ) : undefined}
      >
        <div className="space-y-5">
          <FormToggleRow htmlFor="smtp-enabled" label="Eigenen SMTP verwenden">
            <Switch
              id="smtp-enabled"
              checked={smtpForm.enabled}
              onCheckedChange={v => setSmtpForm({ ...smtpForm, enabled: v })}
            />
          </FormToggleRow>

          <FormGrid cols={6}>
            <FormField label="Host" htmlFor="smtp-host" span={4}>
              <Input
                id="smtp-host"
                value={smtpForm.host}
                onChange={e => setSmtpForm({ ...smtpForm, host: e.target.value })}
                placeholder="smtp.deine-firma.de"
                autoCapitalize="none"
                spellCheck={false}
              />
            </FormField>
            <FormField label="Port" htmlFor="smtp-port" span={2}>
              <Input
                id="smtp-port"
                type="number"
                inputMode="numeric"
                value={smtpForm.port}
                onChange={e => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 465 })}
              />
            </FormField>
            <FormField label="Benutzername" htmlFor="smtp-user" span={3}>
              <Input
                id="smtp-user"
                value={smtpForm.username}
                onChange={e => setSmtpForm({ ...smtpForm, username: e.target.value })}
                placeholder="noreply@firma.de"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
              />
            </FormField>
            <FormField
              label="Passwort"
              htmlFor="smtp-pass"
              span={3}
              labelAside={whitelabel.smtp?.passwordSet ? <span className="text-success">gesetzt</span> : undefined}
            >
              <SecretInput
                id="smtp-pass"
                value={smtpForm.password}
                onChange={e => setSmtpForm({ ...smtpForm, password: e.target.value })}
                placeholder={whitelabel.smtp?.passwordSet ? '•••••••• (leer = behalten)' : 'App-Passwort'}
                autoComplete="new-password"
              />
            </FormField>
          </FormGrid>

          <OptionalDisclosure
            label="Absender & Verschlüsselung"
            description="Absender-E-Mail, Absender-Name, TLS"
            filledCount={[smtpForm.fromAddress, smtpForm.fromName].filter(Boolean).length}
          >
            <FormGrid cols={2}>
              <FormField label="Absender-E-Mail" htmlFor="smtp-from">
                <Input
                  id="smtp-from"
                  type="email"
                  inputMode="email"
                  value={smtpForm.fromAddress}
                  onChange={e => setSmtpForm({ ...smtpForm, fromAddress: e.target.value })}
                  placeholder="noreply@firma.de"
                />
              </FormField>
              <FormField label="Absender-Name" htmlFor="smtp-from-name">
                <Input
                  id="smtp-from-name"
                  value={smtpForm.fromName}
                  onChange={e => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                  placeholder="Dein Firmenname"
                />
              </FormField>
            </FormGrid>
            <FormToggleRow htmlFor="smtp-tls" label="TLS verwenden (empfohlen)">
              <Switch
                id="smtp-tls"
                checked={smtpForm.useTls}
                onCheckedChange={v => setSmtpForm({ ...smtpForm, useTls: v })}
              />
            </FormToggleRow>
          </OptionalDisclosure>

          <FormActions>
            <Button onClick={saveSmtp} disabled={saving || !smtpForm.host || !smtpForm.username}>
              <Save className="h-4 w-4 mr-2" />
              Speichern
            </Button>
          </FormActions>

          {whitelabel.smtp && (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-start sm:p-4">
              <FormField
                className="flex-1"
                label={<span className="inline-flex items-center gap-1.5"><TestTube className="h-3.5 w-3.5" aria-hidden="true" />Test-E-Mail senden</span>}
                htmlFor="smtp-test"
                hint={whitelabel.smtp.lastTestedAt ? (
                  <>
                    Letzter Test:{' '}
                    <span className={whitelabel.smtp.lastTestResult === 'ok' ? 'font-medium text-success' : 'font-medium text-destructive'}>
                      {whitelabel.smtp.lastTestResult}
                    </span>
                  </>
                ) : undefined}
              >
                <Input
                  id="smtp-test"
                  type="email"
                  inputMode="email"
                  value={smtpTestEmail}
                  onChange={e => setSmtpTestEmail(e.target.value)}
                  placeholder="test@empfaenger.de"
                />
              </FormField>
              <Button variant="outline" onClick={handleTestSmtp} disabled={smtpTesting || !smtpTestEmail.trim()} className="shrink-0 sm:mt-7">
                <Send className="h-4 w-4 mr-2" />
                {smtpTesting ? 'Sendet...' : 'Testen'}
              </Button>
            </div>
          )}
        </div>
      </FormSection>
    </FormSections>
  );
}

/* -------- Custom Domain Self-Service Sub-Component ---------- */

function CustomDomainSection({
  whitelabel,
  onChanged,
}: {
  whitelabel: TenantWhitelabel;
  onChanged: () => Promise<void>;
}) {
  const [domain, setDomain] = useState(whitelabel.customDomain || '');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{
    token: string | null;
    instructions: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vercelVerification?: any;
  } | null>(null);

  const storedToken = whitelabel.customDomain ? (result?.token || null) : null;
  const instructions = result?.instructions || (whitelabel.customDomain && storedToken ? [
    `CNAME    ${whitelabel.customDomain} → cname.vercel-dns.com`,
    `TXT      _trackbliss-verification.${whitelabel.customDomain} → ${storedToken}`,
  ] : []);

  async function save() {
    setSaving(true);
    try {
      const res = await setOwnCustomDomain(domain.trim() || null);
      setResult({
        token: res.verificationToken,
        instructions: res.instructions,
        vercelVerification: res.vercelVerification,
      });
      toast.success(res.customDomain ? 'Custom Domain hinterlegt — jetzt DNS einrichten' : 'Custom Domain entfernt');
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function verify() {
    setVerifying(true);
    try {
      const res = await verifyOwnCustomDomain();
      if (res.verified) toast.success('Custom Domain erfolgreich verifiziert!');
      else toast.error(res.error || 'Verifikation fehlgeschlagen');
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setVerifying(false);
    }
  }

  function copy(s: string) {
    navigator.clipboard.writeText(s);
    toast.success('Kopiert');
  }

  return (
    <FormSection
      layout="stacked"
      icon={Link2}
      title="Eigene Domain"
      description={<>Verbinde deine eigene Domain (z.B. <code>app.deine-firma.de</code>) mit der App. Zwei DNS-Records setzen, einmal „Prüfen" klicken — fertig.</>}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <FormField label="Domain" htmlFor="wl-custom-domain" className="flex-1">
            <Input
              id="wl-custom-domain"
              value={domain}
              onChange={e => setDomain(e.target.value.toLowerCase())}
              placeholder="app.deine-firma.de"
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
            />
          </FormField>
          <Button onClick={save} disabled={saving} variant={domain ? 'default' : 'outline'} className="shrink-0">
            <Save className="h-4 w-4 mr-2" />
            Speichern
          </Button>
        </div>

        {whitelabel.customDomain && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm truncate">{whitelabel.customDomain}</div>
                {whitelabel.customDomainVerified ? (
                  <Badge variant="outline" className="mt-1 gap-1 border-success/30 bg-success/10 text-success">
                    <ShieldCheck className="h-3 w-3" />
                    Verifiziert und aktiv
                  </Badge>
                ) : (
                  <Badge variant="outline" className="mt-1 gap-1 border-warning/30 bg-warning/10 text-warning">
                    <AlertCircle className="h-3 w-3" />
                    Verifikation steht aus
                  </Badge>
                )}
              </div>
              {!whitelabel.customDomainVerified && (
                <Button variant="outline" onClick={verify} disabled={verifying}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${verifying ? 'animate-spin' : ''}`} />
                  DNS prüfen
                </Button>
              )}
            </div>

            {!whitelabel.customDomainVerified && instructions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Setze folgende DNS-Records bei deinem Provider, dann „DNS prüfen":
                </p>
                <div className="space-y-1.5">
                  {instructions.map((line, i) => {
                    // Format: "TYPE   NAME → VALUE"
                    const match = line.match(/^(\S+)\s+(\S+)\s+→\s+(.+)$/);
                    if (!match) return <div key={i} className="text-xs font-mono">{line}</div>;
                    const [, type, name, value] = match;
                    return (
                      <div key={i} className="rounded-md bg-background border p-2 flex items-center gap-2 font-mono text-xs">
                        <Badge variant="outline" className="h-5 font-mono text-xs shrink-0">{type}</Badge>
                        <div className="min-w-0 flex-1 grid sm:grid-cols-2 gap-x-3">
                          <div className="truncate text-muted-foreground">{name}</div>
                          <div className="truncate font-semibold">{value}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copy(`${name}\t${type}\t${value}`)}
                          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md transition-colors duration-150 ease-out hover:bg-muted pointer-coarse:size-11"
                          aria-label="Kopieren"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  DNS-Propagation kann bis zu 24 Stunden dauern, meistens innerhalb weniger Minuten.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </FormSection>
  );
}
