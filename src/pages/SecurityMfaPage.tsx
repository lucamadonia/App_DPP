/**
 * MFA/2FA Setup + Management via Supabase Auth MFA (TOTP).
 * Super-Admins werden beim Login zur Einrichtung aufgefordert (siehe AdminGuard-Check in Folge-Commit).
 */
import { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, QrCode, KeyRound, Trash2, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MfaFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
}

export function SecurityMfaPage() {
  const { isSuperAdmin, adminRole } = useAuth();
  const requiresMfa = isSuperAdmin || adminRole !== null;

  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const all = (data as any)?.all || [];
      setFactors(all);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function startEnroll() {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Trackbliss-${new Date().toISOString().slice(0, 10)}`,
      });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any;
      setFactorId(d.id);
      setQrUri(d.totp?.qr_code || null);
      setSecret(d.totp?.secret || null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setEnrolling(false);
    }
  }

  async function verify() {
    if (!factorId || !code.trim()) return;
    setVerifying(true);
    try {
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        challengeId: (challenge as any).id,
        code: code.trim(),
      });
      if (error) throw error;
      toast.success('MFA erfolgreich eingerichtet!');
      setQrUri(null);
      setSecret(null);
      setFactorId(null);
      setCode('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setVerifying(false);
    }
  }

  async function unenroll(id: string) {
    if (!confirm('MFA-Faktor wirklich entfernen?')) return;
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (error) throw error;
      toast.success('MFA-Faktor entfernt');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  const verified = factors.filter(f => f.status === 'verified');

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Zwei-Faktor-Authentifizierung</h1>
          <p className="text-xs text-muted-foreground">
            Zusätzlicher Login-Schutz per TOTP (Authenticator-App).
          </p>
        </div>
      </div>

      {/* Status */}
      <Card className={requiresMfa && verified.length === 0 ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' : undefined}>
        <CardContent className="p-4 flex items-center gap-3">
          {verified.length > 0 ? (
            <>
              <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">MFA aktiv</div>
                <p className="text-xs text-muted-foreground">
                  {verified.length} Faktor{verified.length === 1 ? '' : 'en'} registriert — dein Account ist geschützt.
                </p>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Aktiv</Badge>
            </>
          ) : requiresMfa ? (
            <>
              <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-amber-900 dark:text-amber-100">MFA empfohlen</div>
                <p className="text-xs text-muted-foreground">
                  Als Admin hast du Zugriff auf sensible Daten — aktiviere 2FA für zusätzlichen Schutz.
                </p>
              </div>
            </>
          ) : (
            <>
              <ShieldCheck className="h-6 w-6 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">MFA optional</div>
                <p className="text-xs text-muted-foreground">
                  Empfohlen — aber für dein Konto nicht verpflichtend.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Existing factors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Registrierte Faktoren
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(2)].map((_, i) => <ShimmerSkeleton key={i} className="h-12" />)}</div>
          ) : factors.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Keine MFA-Faktoren registriert.
            </div>
          ) : (
            <ul className="divide-y">
              {factors.map(f => (
                <li key={f.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{f.friendly_name || f.factor_type.toUpperCase()}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <Badge variant="outline" className={f.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                        {f.status === 'verified' ? 'Verifiziert' : 'Ausstehend'}
                      </Badge>
                      <span>{new Date(f.created_at).toLocaleDateString('de-DE')}</span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => unenroll(f.id)}
                    title="Entfernen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Enroll flow */}
      {qrUri ? (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" />
              Authenticator einrichten
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Scanne den QR-Code mit deiner Authenticator-App (Google Authenticator, 1Password, Authy, …) und gib den 6-stelligen Code ein.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="bg-white p-3 rounded-lg border shrink-0">
                <img src={qrUri} alt="MFA QR Code" className="w-40 h-40" />
              </div>
              <div className="flex-1 space-y-3 min-w-0">
                {secret && (
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Secret (manuelle Eingabe)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 font-mono text-xs bg-muted px-2 py-1.5 rounded break-all">{secret}</code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        onClick={() => { navigator.clipboard.writeText(secret); toast.success('Kopiert'); }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
                <div>
                  <Label htmlFor="mfa-code" className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">6-stelliger Code</Label>
                  <Input
                    id="mfa-code"
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) verify(); }}
                    placeholder="000000"
                    className="font-mono tabular-nums text-center tracking-widest"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setQrUri(null); setSecret(null); setFactorId(null); }}>
                Abbrechen
              </Button>
              <Button onClick={verify} disabled={verifying || code.length !== 6}>
                {verifying ? 'Verifiziert...' : 'Verifizieren & aktivieren'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <Button onClick={startEnroll} disabled={enrolling}>
              <KeyRound className="h-4 w-4 mr-1.5" />
              {enrolling ? 'Wird vorbereitet...' : (verified.length > 0 ? 'Zusätzlichen Faktor hinzufügen' : 'Zwei-Faktor aktivieren')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
