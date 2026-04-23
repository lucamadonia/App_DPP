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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <div className="space-y-5">
      {/* Subdomain + Custom Domain */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Domain & Subdomain
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Lege fest, unter welcher Adresse {tenantName} erreichbar ist.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Subdomain block */}
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Trackbliss-Subdomain
            </Label>
            <div className="flex items-stretch gap-2">
              <div className="flex items-stretch rounded-md border bg-background flex-1 focus-within:ring-2 focus-within:ring-ring">
                <Input
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="z.B. fambliss"
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
              <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Live unter <code className="bg-muted px-1.5 py-0.5 rounded">{subdomainHost}</code>
                <button
                  type="button"
                  onClick={() => copy(`https://${subdomainHost}`)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <div className="border-t" />

          {/* Custom domain block */}
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <Link2 className="h-3 w-3" />
              Eigene Domain
            </Label>
            <div className="flex items-stretch gap-2">
              <Input
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                placeholder="z.B. app.deine-firma.de"
                className="flex-1"
              />
              <Button onClick={saveCustomDomainHandler} disabled={saving} size="sm" variant={customDomain ? 'default' : 'outline'}>
                <Save className="h-3.5 w-3.5 mr-1" />
                Speichern
              </Button>
            </div>

            {customDomain && dnsToken && (
              <div className="mt-3 space-y-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {customDomainVerified ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Verifiziert
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Nicht verifiziert
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={verifyDomain} disabled={verifyingDomain}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${verifyingDomain ? 'animate-spin' : ''}`} />
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
                    <p className="text-[11px] text-muted-foreground italic">
                      DNS-Propagation kann bis zu 24 Std dauern. Meistens schon nach Minuten aktiv.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">App-Name</Label>
              <Input
                value={brand.appName || ''}
                onChange={e => setBrand({ ...brand, appName: e.target.value })}
                placeholder="z.B. FamBliss Hub"
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

      {/* Custom SMTP */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Eigener SMTP-Server
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Wenn aktiv, werden E-Mails von diesem Tenant über dessen Server verschickt.
            </p>
          </div>
          {smtp?.enabled && (
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
            <Label htmlFor="smtp-enabled" className="font-medium">SMTP-Override aktivieren</Label>
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
                Passwort {smtp && <span className="text-emerald-600 normal-case tracking-normal">(gesetzt, leer = behalten)</span>}
              </Label>
              <Input
                type="password"
                value={smtpForm.password}
                onChange={e => setSmtpForm({ ...smtpForm, password: e.target.value })}
                placeholder={smtp ? '••••••••' : 'App-Passwort'}
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
                placeholder={tenantName}
              />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <Switch
                id="smtp-tls"
                checked={smtpForm.useTls}
                onCheckedChange={v => setSmtpForm({ ...smtpForm, useTls: v })}
              />
              <Label htmlFor="smtp-tls" className="text-sm">TLS verwenden (empfohlen für Port 465)</Label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button onClick={saveSmtp} disabled={saving || !smtpForm.host || !smtpForm.username} size="sm">
              <Save className="h-3.5 w-3.5 mr-1" />
              Konfiguration speichern
            </Button>
            {smtp && (
              <Button variant="outline" size="sm" onClick={handleDisableSmtp}>
                Deaktivieren (Fallback auf Trackbliss-SMTP)
              </Button>
            )}
          </div>

          {smtp && (
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
              {smtp.lastTestedAt && (
                <div className="mt-2 text-xs">
                  <span className="text-muted-foreground">Letzter Test:</span>{' '}
                  <span className={smtp.lastTestResult === 'ok' ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                    {smtp.lastTestResult}
                  </span>
                  <span className="text-muted-foreground"> ({new Date(smtp.lastTestedAt).toLocaleString('de-DE')})</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
          <Badge variant="outline" className="justify-center h-5 font-mono text-[10px]">{type}</Badge>
          <div className="min-w-0">
            <div className="truncate text-muted-foreground">{host}</div>
            <div className="truncate font-semibold">{value}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onCopy(`${host}\t${type}\t${value}`)}
          className="p-1.5 rounded hover:bg-muted cursor-pointer shrink-0"
          title="Kopieren"
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
