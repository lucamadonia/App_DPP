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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <div className="space-y-5">
      {/* Subdomain */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Eigene Subdomain
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Erstelle eine Adresse unter <code>.trackbliss.eu</code>, unter der deine Kunden, Team-Mitglieder und öffentliche DPP-Seiten erreichbar sind.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-stretch gap-2">
            <div className="flex items-stretch rounded-md border bg-background flex-1 focus-within:ring-2 focus-within:ring-ring">
              <Input
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="z.B. dein-firmenname"
                className="border-0 rounded-r-none focus-visible:ring-0 flex-1"
                maxLength={32}
              />
              <div className="flex items-center px-3 text-sm text-muted-foreground bg-muted border-l rounded-r-md">
                .trackbliss.eu
              </div>
            </div>
            <Button onClick={saveSubdomain} disabled={saving} size="sm">
              <Save className="h-3.5 w-3.5 mr-1" />
              Speichern
            </Button>
          </div>
          {subdomainHost && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Live unter <code className="bg-muted px-1.5 py-0.5 rounded">{subdomainHost}</code>
              <button
                type="button"
                onClick={() => copy(`https://${subdomainHost}`)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Domain — Self-Service */}
      <CustomDomainSection
        whitelabel={whitelabel}
        onChanged={load}
      />

      {/* Branding Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Marken-Konfiguration
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Erscheint in der App, auf öffentlichen DPP-Seiten und in E-Mails (falls SMTP aktiv).
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">App-Name</Label>
              <Input
                value={brand.appName || ''}
                onChange={e => setBrand({ ...brand, appName: e.target.value })}
                placeholder="z.B. Meine Firma"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Support-E-Mail</Label>
              <Input
                type="email"
                value={brand.supportEmail || ''}
                onChange={e => setBrand({ ...brand, supportEmail: e.target.value })}
                placeholder="support@firma.de"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Primärfarbe</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={brand.primaryColor || '#4A4E42'}
                  onChange={e => setBrand({ ...brand, primaryColor: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={brand.primaryColor || ''}
                  onChange={e => setBrand({ ...brand, primaryColor: e.target.value })}
                  placeholder="#4A4E42"
                  className="flex-1 font-mono"
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Akzentfarbe</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={brand.accentColor || '#B8A88A'}
                  onChange={e => setBrand({ ...brand, accentColor: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={brand.accentColor || ''}
                  onChange={e => setBrand({ ...brand, accentColor: e.target.value })}
                  placeholder="#B8A88A"
                  className="flex-1 font-mono"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Logo-URL</Label>
              <Input
                value={brand.logoUrl || ''}
                onChange={e => setBrand({ ...brand, logoUrl: e.target.value })}
                placeholder="https://cdn.firma.de/logo.png"
              />
              {brand.logoUrl && (
                <div className="mt-2 p-3 rounded-md border bg-muted/30 flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Vorschau:</span>
                  <img src={brand.logoUrl} alt="Logo" className="h-8 object-contain" />
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={saveBrand} disabled={saving} size="sm">
              <Save className="h-3.5 w-3.5 mr-1" />
              Branding speichern
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SMTP */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Eigener SMTP-Server
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bei Aktivierung werden E-Mails von deinem Server gesendet statt von Trackbliss.
            </p>
          </div>
          {whitelabel.smtp?.enabled && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Aktiv
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch
              id="smtp-enabled"
              checked={smtpForm.enabled}
              onCheckedChange={v => setSmtpForm({ ...smtpForm, enabled: v })}
            />
            <Label htmlFor="smtp-enabled" className="font-medium">Eigenen SMTP verwenden</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Host</Label>
              <Input
                value={smtpForm.host}
                onChange={e => setSmtpForm({ ...smtpForm, host: e.target.value })}
                placeholder="smtp.deine-firma.de"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Port</Label>
              <Input
                type="number"
                value={smtpForm.port}
                onChange={e => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 465 })}
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Benutzername</Label>
              <Input
                value={smtpForm.username}
                onChange={e => setSmtpForm({ ...smtpForm, username: e.target.value })}
                placeholder="noreply@firma.de"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Passwort {whitelabel.smtp?.passwordSet && <span className="text-emerald-600 normal-case tracking-normal">(gesetzt)</span>}
              </Label>
              <Input
                type="password"
                value={smtpForm.password}
                onChange={e => setSmtpForm({ ...smtpForm, password: e.target.value })}
                placeholder={whitelabel.smtp?.passwordSet ? '•••••••• (leer = behalten)' : 'App-Passwort'}
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Absender-E-Mail</Label>
              <Input
                type="email"
                value={smtpForm.fromAddress}
                onChange={e => setSmtpForm({ ...smtpForm, fromAddress: e.target.value })}
                placeholder="noreply@firma.de"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Absender-Name</Label>
              <Input
                value={smtpForm.fromName}
                onChange={e => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                placeholder="Dein Firmenname"
              />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <Switch
                id="smtp-tls"
                checked={smtpForm.useTls}
                onCheckedChange={v => setSmtpForm({ ...smtpForm, useTls: v })}
              />
              <Label htmlFor="smtp-tls" className="text-sm">TLS verwenden (empfohlen)</Label>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button onClick={saveSmtp} disabled={saving || !smtpForm.host || !smtpForm.username} size="sm">
              <Save className="h-3.5 w-3.5 mr-1" />
              Speichern
            </Button>
          </div>

          {whitelabel.smtp && (
            <div className="mt-3 rounded-lg border bg-muted/30 p-3">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <TestTube className="h-3 w-3" />
                Test-E-Mail senden
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="email"
                  value={smtpTestEmail}
                  onChange={e => setSmtpTestEmail(e.target.value)}
                  placeholder="test@empfaenger.de"
                  className="flex-1"
                />
                <Button onClick={handleTestSmtp} disabled={smtpTesting || !smtpTestEmail.trim()} size="sm">
                  <Send className="h-3.5 w-3.5 mr-1" />
                  {smtpTesting ? 'Sendet...' : 'Testen'}
                </Button>
              </div>
              {whitelabel.smtp.lastTestedAt && (
                <div className="mt-2 text-xs">
                  <span className="text-muted-foreground">Letzter Test:</span>{' '}
                  <span className={whitelabel.smtp.lastTestResult === 'ok' ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                    {whitelabel.smtp.lastTestResult}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          Eigene Domain
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Verbinde deine eigene Domain (z.B. <code>app.deine-firma.de</code>) mit der App. Zwei DNS-Records setzen, einmal „Prüfen" klicken — fertig.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-stretch gap-2">
          <Input
            value={domain}
            onChange={e => setDomain(e.target.value.toLowerCase())}
            placeholder="app.deine-firma.de"
            className="flex-1"
          />
          <Button onClick={save} disabled={saving} size="sm" variant={domain ? 'default' : 'outline'}>
            <Save className="h-3.5 w-3.5 mr-1" />
            Speichern
          </Button>
        </div>

        {whitelabel.customDomain && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm truncate">{whitelabel.customDomain}</div>
                {whitelabel.customDomainVerified ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 mt-1">
                    <ShieldCheck className="h-3 w-3" />
                    Verifiziert und aktiv
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    Verifikation steht aus
                  </Badge>
                )}
              </div>
              {!whitelabel.customDomainVerified && (
                <Button size="sm" variant="outline" onClick={verify} disabled={verifying}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${verifying ? 'animate-spin' : ''}`} />
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
                        <Badge variant="outline" className="h-5 font-mono text-[10px] shrink-0">{type}</Badge>
                        <div className="min-w-0 flex-1 grid sm:grid-cols-2 gap-x-3">
                          <div className="truncate text-muted-foreground">{name}</div>
                          <div className="truncate font-semibold">{value}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copy(`${name}\t${type}\t${value}`)}
                          className="p-1 rounded hover:bg-muted cursor-pointer shrink-0"
                          title="Kopieren"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground italic">
                  DNS-Propagation kann bis zu 24 Stunden dauern, meistens innerhalb weniger Minuten.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
