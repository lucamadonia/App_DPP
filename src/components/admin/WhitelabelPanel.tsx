/**
 * Per-tenant Whitelabel-Konfiguration:
 *   - Subdomain ({slug}.trackbliss.eu)
 *   - Custom Domain mit DNS-Verifikation
 *   - Marken-Konfiguration (Primary-Color, Accent, Logo-URL, App-Name)
 *   - Custom SMTP-Server
 *
 * Admin-seitige Komponente — wird im AdminTenantDetailPage als Tab gerendert.
 * Kann später mit reduziertem Scope auch für Tenant-Self-Service recycled werden.
 */
import { useState, useEffect } from 'react';
import {
  Globe, CheckCircle2, AlertCircle, Copy, Save, Mail, Palette,
  RefreshCw, TestTube, ShieldCheck, Link2, Send,
} from 'lucide-react';
import { FormSections, FormSection, FormGrid, FormField, FormActions, FormToggleRow, InputAffix, SecretInput, OptionalDisclosure } from '@/components/ui/form-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import {
  getTenantWhitelabel,
  setTenantSubdomain as apiSetSubdomain,
  setCustomDomain as apiSetCustomDomain,
  verifyCustomDomain as apiVerifyDomain,
  updateWhitelabelConfig as apiUpdateBrand,
  setTenantSmtp as apiSetSmtp,
  testTenantSmtp as apiTestSmtp,
  disableTenantSmtp as apiDisableSmtp,
  type TenantSmtpConfig,
} from '@/services/supabase/admin';
import { toast } from 'sonner';

interface WhitelabelPanelProps {
  tenantId: string;
  tenantName: string;
}

interface WhitelabelBrand {
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  appName?: string;
  supportEmail?: string;
}

export function WhitelabelPanel({ tenantId, tenantName }: WhitelabelPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [customDomainVerified, setCustomDomainVerified] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [dnsToken, setDnsToken] = useState<string | null>(null);
  const [brand, setBrand] = useState<WhitelabelBrand>({});
  const [smtp, setSmtp] = useState<TenantSmtpConfig | null>(null);
  const [smtpForm, setSmtpForm] = useState({
    enabled: false, host: '', port: 465, username: '', password: '',
    fromAddress: '', fromName: '', useTls: true,
  });
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [smtpTesting, setSmtpTesting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const w = await getTenantWhitelabel(tenantId);
      setSubdomain(w.subdomain || '');
      setCustomDomain(w.customDomain || '');
      setCustomDomainVerified(w.customDomainVerified);
      setDnsToken(w.dnsVerificationToken);
      setBrand((w.whitelabelConfig || {}) as WhitelabelBrand);
      setSmtp(w.smtp);
      if (w.smtp) {
        setSmtpForm({
          enabled: w.smtp.enabled,
          host: w.smtp.host || '',
          port: w.smtp.port || 465,
          username: w.smtp.username || '',
          password: '', // never re-shown
          fromAddress: w.smtp.fromAddress || '',
          fromName: w.smtp.fromName || '',
          useTls: w.smtp.useTls ?? true,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tenantId]);

  async function saveSubdomain() {
    setSaving(true);
    try {
      const res = await apiSetSubdomain(tenantId, subdomain.trim() || null);
      setSubdomain(res.subdomain || '');
      toast.success(res.fullHost ? `Subdomain gesetzt: ${res.fullHost}` : 'Subdomain gelöscht');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveCustomDomainHandler() {
    setSaving(true);
    try {
      const res = await apiSetCustomDomain(tenantId, customDomain.trim() || null);
      setCustomDomain(res.customDomain || '');
      setDnsToken(res.verificationToken);
      setCustomDomainVerified(false);
      toast.success(res.customDomain ? 'Custom Domain hinterlegt — jetzt DNS einrichten' : 'Custom Domain entfernt');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function verifyDomain() {
    setVerifyingDomain(true);
    try {
      const res = await apiVerifyDomain(tenantId);
      setCustomDomainVerified(res.verified);
      if (res.verified) toast.success('Custom Domain erfolgreich verifiziert!');
      else toast.error(res.error || 'Verifikation fehlgeschlagen');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setVerifyingDomain(false);
    }
  }

  async function saveBrand() {
    setSaving(true);
    try {
      await apiUpdateBrand(tenantId, brand as Record<string, unknown>);
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
      const res = await apiSetSmtp({ tenantId, ...smtpForm });
      setSmtp(res);
      setSmtpForm({ ...smtpForm, password: '' });
      toast.success('SMTP-Konfiguration gespeichert');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSmtp() {
    if (!smtpTestEmail.trim()) { toast.error('Test-E-Mail-Adresse fehlt'); return; }
    setSmtpTesting(true);
    try {
      const res = await apiTestSmtp(tenantId, smtpTestEmail.trim());
      if (res.ok) toast.success(`Test-E-Mail erfolgreich an ${smtpTestEmail} gesendet!`);
      else toast.error(res.result);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSmtpTesting(false);
    }
  }

  async function handleDisableSmtp() {
    if (!confirm('SMTP-Override wirklich deaktivieren? Trackbliss-SMTP wird als Fallback genutzt.')) return;
    await apiDisableSmtp(tenantId);
    toast.success('SMTP-Override deaktiviert');
    await load();
  }

  function copy(s: string) {
    navigator.clipboard.writeText(s);
    toast.success('In Zwischenablage kopiert');
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <ShimmerSkeleton className="h-48" />
        <ShimmerSkeleton className="h-48" />
      </div>
    );
  }

  const subdomainHost = subdomain ? `${subdomain}.trackbliss.eu` : null;

  return (
    <FormSections>
      {/* Subdomain + Custom Domain */}
      <FormSection
        icon={Globe}
        title="Domain & Subdomain"
        description={<>Lege fest, unter welcher Adresse {tenantName} erreichbar ist.</>}
      >
        <div className="space-y-6">
          {/* Subdomain block */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <FormField
              className="flex-1"
              label="Trackbliss-Subdomain"
              htmlFor="awl-subdomain"
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
                  id="awl-subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="z.B. fambliss"
                  maxLength={32}
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </InputAffix>
            </FormField>
            <Button onClick={saveSubdomain} disabled={saving} className="shrink-0 sm:mt-7">
              <Save className="h-4 w-4 mr-2" />
              Speichern
            </Button>
          </div>

          {/* Custom domain block */}
          <div className="space-y-3 border-t pt-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <FormField
                className="flex-1"
                label={<span className="inline-flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" aria-hidden="true" />Eigene Domain</span>}
                htmlFor="awl-custom-domain"
              >
                <Input
                  id="awl-custom-domain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                  placeholder="z.B. app.deine-firma.de"
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </FormField>
              <Button onClick={saveCustomDomainHandler} disabled={saving} variant={customDomain ? 'default' : 'outline'} className="shrink-0 sm:mt-7">
                <Save className="h-4 w-4 mr-2" />
                Speichern
              </Button>
            </div>

            {customDomain && dnsToken && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {customDomainVerified ? (
                    <Badge variant="outline" className="gap-1 border-success/30 bg-success/10 text-success">
                      <ShieldCheck className="h-3 w-3" />
                      Verifiziert
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 border-warning/30 bg-warning/10 text-warning">
                      <AlertCircle className="h-3 w-3" />
                      Nicht verifiziert
                    </Badge>
                  )}
                  <Button variant="outline" onClick={verifyDomain} disabled={verifyingDomain}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${verifyingDomain ? 'animate-spin' : ''}`} />
                    DNS prüfen
                  </Button>
                </div>

                {!customDomainVerified && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Lege folgende DNS-Records in deinem Provider an, dann „DNS prüfen" klicken:
                    </p>
                    <div className="space-y-1.5">
                      <DnsRecord
                        type="CNAME"
                        host={`app.${customDomain}`}
                        value="cname.vercel-dns.com"
                        onCopy={copy}
                      />
                      <DnsRecord
                        type="TXT"
                        host={`_trackbliss-verification.${customDomain}`}
                        value={dnsToken}
                        onCopy={copy}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      DNS-Propagation kann bis zu 24 Std dauern. Meistens schon nach Minuten aktiv.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </FormSection>

      {/* Branding */}
      <FormSection icon={Palette} title="Branding">
        <div className="space-y-5">
          <FormGrid cols={2}>
            <FormField label="App-Name" htmlFor="awl-app-name">
              <Input
                id="awl-app-name"
                value={brand.appName || ''}
                onChange={e => setBrand({ ...brand, appName: e.target.value })}
                placeholder="z.B. FamBliss Hub"
              />
            </FormField>
            <FormField label="Support-E-Mail" htmlFor="awl-support-email">
              <Input
                id="awl-support-email"
                type="email"
                inputMode="email"
                value={brand.supportEmail || ''}
                onChange={e => setBrand({ ...brand, supportEmail: e.target.value })}
                placeholder="support@firma.de"
              />
            </FormField>
            <FormField label="Primärfarbe" htmlFor="awl-primary">
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
                  id="awl-primary"
                  value={brand.primaryColor || ''}
                  onChange={e => setBrand({ ...brand, primaryColor: e.target.value })}
                  placeholder="#4A4E42"
                  className="font-mono"
                  spellCheck={false}
                />
              </InputAffix>
            </FormField>
            <FormField label="Akzentfarbe" htmlFor="awl-accent">
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
                  id="awl-accent"
                  value={brand.accentColor || ''}
                  onChange={e => setBrand({ ...brand, accentColor: e.target.value })}
                  placeholder="#B8A88A"
                  className="font-mono"
                  spellCheck={false}
                />
              </InputAffix>
            </FormField>
            <FormField label="Logo-URL" htmlFor="awl-logo" span="full">
              <Input
                id="awl-logo"
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

      {/* Custom SMTP */}
      <FormSection
        icon={Mail}
        title="Eigener SMTP-Server"
        description="Wenn aktiv, werden E-Mails von diesem Tenant über dessen Server verschickt."
        aside={smtp?.enabled ? (
          <Badge variant="outline" className="gap-1 border-success/30 bg-success/10 text-success">
            <CheckCircle2 className="h-3 w-3" /> Aktiv
          </Badge>
        ) : undefined}
      >
        <div className="space-y-5">
          <FormToggleRow htmlFor="smtp-enabled" label="SMTP-Override aktivieren">
            <Switch
              id="smtp-enabled"
              checked={smtpForm.enabled}
              onCheckedChange={v => setSmtpForm({ ...smtpForm, enabled: v })}
            />
          </FormToggleRow>

          <FormGrid cols={6}>
            <FormField label="Host" htmlFor="awl-smtp-host" span={4}>
              <Input
                id="awl-smtp-host"
                value={smtpForm.host}
                onChange={e => setSmtpForm({ ...smtpForm, host: e.target.value })}
                placeholder="smtp.deine-firma.de"
                autoCapitalize="none"
                spellCheck={false}
              />
            </FormField>
            <FormField label="Port" htmlFor="awl-smtp-port" span={2}>
              <Input
                id="awl-smtp-port"
                type="number"
                inputMode="numeric"
                value={smtpForm.port}
                onChange={e => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 465 })}
              />
            </FormField>
            <FormField label="Benutzername" htmlFor="awl-smtp-user" span={3}>
              <Input
                id="awl-smtp-user"
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
              htmlFor="awl-smtp-pass"
              span={3}
              labelAside={smtp ? <span className="text-success">gesetzt, leer = behalten</span> : undefined}
            >
              <SecretInput
                id="awl-smtp-pass"
                value={smtpForm.password}
                onChange={e => setSmtpForm({ ...smtpForm, password: e.target.value })}
                placeholder={smtp ? '••••••••' : 'App-Passwort'}
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
              <FormField label="Absender-E-Mail" htmlFor="awl-smtp-from">
                <Input
                  id="awl-smtp-from"
                  type="email"
                  inputMode="email"
                  value={smtpForm.fromAddress}
                  onChange={e => setSmtpForm({ ...smtpForm, fromAddress: e.target.value })}
                  placeholder="noreply@firma.de"
                />
              </FormField>
              <FormField label="Absender-Name" htmlFor="awl-smtp-from-name">
                <Input
                  id="awl-smtp-from-name"
                  value={smtpForm.fromName}
                  onChange={e => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                  placeholder={tenantName}
                />
              </FormField>
            </FormGrid>
            <FormToggleRow htmlFor="smtp-tls" label="TLS verwenden (empfohlen für Port 465)">
              <Switch
                id="smtp-tls"
                checked={smtpForm.useTls}
                onCheckedChange={v => setSmtpForm({ ...smtpForm, useTls: v })}
              />
            </FormToggleRow>
          </OptionalDisclosure>

          <FormActions>
            {smtp && (
              <Button variant="outline" onClick={handleDisableSmtp}>
                Deaktivieren (Fallback auf Trackbliss-SMTP)
              </Button>
            )}
            <Button onClick={saveSmtp} disabled={saving || !smtpForm.host || !smtpForm.username}>
              <Save className="h-4 w-4 mr-2" />
              Konfiguration speichern
            </Button>
          </FormActions>

          {smtp && (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-start sm:p-4">
              <FormField
                className="flex-1"
                label={<span className="inline-flex items-center gap-1.5"><TestTube className="h-3.5 w-3.5" aria-hidden="true" />Test-E-Mail senden</span>}
                htmlFor="awl-smtp-test"
                hint={smtp.lastTestedAt ? (
                  <>
                    Letzter Test:{' '}
                    <span className={smtp.lastTestResult === 'ok' ? 'font-medium text-success' : 'font-medium text-destructive'}>
                      {smtp.lastTestResult}
                    </span>
                    {' '}({new Date(smtp.lastTestedAt).toLocaleString('de-DE')})
                  </>
                ) : undefined}
              >
                <Input
                  id="awl-smtp-test"
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

function DnsRecord({
  type, host, value, onCopy,
}: {
  type: string;
  host: string;
  value: string;
  onCopy: (s: string) => void;
}) {
  return (
    <div className="rounded-md bg-background border p-2 font-mono text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="grid grid-cols-[60px_1fr] gap-2 flex-1 min-w-0">
          <Badge variant="outline" className="justify-center h-5 font-mono text-xs">{type}</Badge>
          <div className="min-w-0">
            <div className="truncate text-muted-foreground">{host}</div>
            <div className="truncate font-semibold">{value}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onCopy(`${host}\t${type}\t${value}`)}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md transition-colors duration-150 ease-out hover:bg-muted pointer-coarse:size-11"
          aria-label="Kopieren"
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
