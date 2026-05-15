import { useEffect, useState } from 'react';
import { Copy, Check, Code2, Settings, Star, Lightbulb, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import {
  getFeedbackSettings,
  updateFeedbackSettings,
  DEFAULT_FEEDBACK_SETTINGS,
} from '@/services/supabase/feedback-settings';
import { supabase } from '@/lib/supabase';
import type { FeedbackSettings, FeedbackWidgetMode } from '@/types/feedback';
import { toast } from 'sonner';

export function FeedbackSettingsPage() {
  const [settings, setSettings] = useState<FeedbackSettings>(DEFAULT_FEEDBACK_SETTINGS);
  const [tenantSlug, setTenantSlug] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, { data: profile }] = await Promise.all([
        getFeedbackSettings(),
        supabase.auth.getUser().then(({ data: u }) =>
          supabase
            .from('profiles')
            .select('tenant_id, tenants(slug)')
            .eq('id', u.user?.id || '')
            .single(),
        ),
      ]);
      setSettings(s);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const slug = (profile as any)?.tenants?.slug;
      if (slug) setTenantSlug(slug);
      setLoading(false);
    })();
  }, []);

  async function patch(updates: Partial<FeedbackSettings>) {
    const next = { ...settings, ...updates };
    setSettings(next);
    const res = await updateFeedbackSettings(updates);
    if (!res.success) {
      toast.error(res.error || 'Speichern fehlgeschlagen');
    } else {
      toast.success('Einstellung gespeichert');
    }
  }

  async function patchWidget(updates: Partial<FeedbackSettings['widget']>) {
    const merged = { ...settings.widget, ...updates };
    setSettings(prev => ({ ...prev, widget: merged }));
    const res = await updateFeedbackSettings({ widget: merged });
    if (!res.success) toast.error(res.error || 'Speichern fehlgeschlagen');
    else toast.success('Einstellung gespeichert');
  }

  if (loading) return <ShimmerSkeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Feedback-Einstellungen
        </h1>
        <p className="text-sm text-muted-foreground">
          Konfiguriere Bewertungen, Idee-Board und das Embed-Widget für deine Website.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Allgemein
          </TabsTrigger>
          <TabsTrigger value="widget" className="gap-1.5">
            <Star className="h-3.5 w-3.5" />
            Widget
          </TabsTrigger>
          <TabsTrigger value="ideas" className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            Idea Board
          </TabsTrigger>
          <TabsTrigger value="embed" className="gap-1.5">
            <Code2 className="h-3.5 w-3.5" />
            Embed-Snippet
          </TabsTrigger>
          <TabsTrigger value="emails" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Emails
          </TabsTrigger>
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bewertungen</CardTitle>
              <CardDescription>Grundlegende Regeln für Kundenbewertungen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                title="Freigabe erforderlich"
                desc="Bewertungen müssen vor Veröffentlichung von dir geprüft werden."
                checked={settings.requireApproval}
                onChange={v => patch({ requireApproval: v })}
              />
              <ToggleRow
                title="Foto-Upload erlauben"
                desc="Kunden können bis zu 5 Fotos pro Bewertung hochladen."
                checked={settings.allowPhotos}
                onChange={v => patch({ allowPhotos: v })}
              />
              <ToggleRow
                title="Stadt anzeigen"
                desc={'Falls angegeben, wird die Stadt des Kunden veröffentlicht (z. B. „Aus Berlin").'}
                checked={settings.showReviewerCity}
                onChange={v => patch({ showReviewerCity: v })}
              />
              <ToggleRow
                title="AI-Moderationsvorschlag"
                desc="Claude Haiku schlägt Sentiment, Spam-Wahrscheinlichkeit und Tags vor. Verbraucht ~1 Credit pro 5 Reviews."
                checked={settings.aiModerationEnabled}
                onChange={v => patch({ aiModerationEnabled: v })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* WIDGET */}
        <TabsContent value="widget" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Widget-Darstellung</CardTitle>
              <CardDescription>Aussehen des Embed-Widgets auf deiner Website.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Standard-Modus</label>
                <div className="flex flex-wrap gap-2">
                  {(['carousel', 'grid', 'badge'] as FeedbackWidgetMode[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => patchWidget({ defaultMode: m })}
                      className={`px-3 py-1.5 rounded-full border text-sm capitalize transition-colors ${
                        settings.widget.defaultMode === m
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                    >
                      {m === 'carousel' ? 'Carousel' : m === 'grid' ? 'Grid' : 'Badge'}
                    </button>
                  ))}
                </div>
              </div>
              <ToggleRow
                title="Sterne-Verteilung anzeigen"
                desc="Balken pro Sterne-Anzahl im Widget-Header."
                checked={settings.widget.showRatingDistribution}
                onChange={v => patchWidget({ showRatingDistribution: v })}
              />
              <ToggleRow
                title="Produkt-Filter aktivieren"
                desc="Dropdown im Widget, um nach Produkt zu filtern."
                checked={settings.widget.showProductFilter}
                onChange={v => patchWidget({ showProductFilter: v })}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Akzent-Farbe (optional)</label>
                <Input
                  type="color"
                  value={settings.widget.accentColor || '#F59E0B'}
                  onChange={e => patchWidget({ accentColor: e.target.value })}
                  className="h-10 w-20 p-1"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IDEA BOARD */}
        <TabsContent value="ideas" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Partner-Idea-Board</CardTitle>
              <CardDescription>Lass eingeladene Partner Ideen einreichen und voten.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                title="Idea Board aktivieren"
                desc="Erfordert mindestens Feedback Professional."
                checked={settings.ideaBoardEnabled}
                onChange={v => patch({ ideaBoardEnabled: v })}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Token-Gültigkeit (Tage)</label>
                <Input
                  type="number"
                  min={30}
                  max={730}
                  value={settings.ideaInviteExpiryDays}
                  onChange={e => patch({ ideaInviteExpiryDays: Number(e.target.value) })}
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EMBED SNIPPET */}
        <TabsContent value="embed" className="mt-4 space-y-4">
          <EmbedSnippetCard tenantSlug={tenantSlug} mode={settings.widget.defaultMode} />
        </TabsContent>

        {/* EMAILS */}
        <TabsContent value="emails" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email-Texte</CardTitle>
              <CardDescription>
                Optionaler Override für die Standard-Email-Templates. Variablen:{' '}
                <code>{`{{customerName}}`}</code>, <code>{`{{tenantName}}`}</code>,{' '}
                <code>{`{{productNames}}`}</code>, <code>{`{{feedbackUrl}}`}</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Absender-Name</label>
                <Input
                  value={settings.emails.fromName || ''}
                  onChange={e => patch({ emails: { ...settings.emails, fromName: e.target.value } })}
                  placeholder={`${tenantSlug || 'Dein Shop'} Team`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Betreff der Bewertungsanfrage</label>
                <Input
                  value={settings.emails.requestSubject || ''}
                  onChange={e => patch({ emails: { ...settings.emails, requestSubject: e.target.value } })}
                  placeholder="Wie war dein Einkauf bei {{tenantName}}?"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
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

function EmbedSnippetCard({ tenantSlug, mode }: { tenantSlug: string; mode: FeedbackWidgetMode }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dpp-app.fambliss.eu';
  const snippet = `<!-- Trackbliss Feedback Widget -->
<div id="trackbliss-feedback"
     data-tenant="${tenantSlug || 'YOUR-TENANT-SLUG'}"
     data-mode="${mode}"></div>
<script async src="${origin}/widget.js"></script>`;

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Embed-Snippet</CardTitle>
          <CardDescription>
            Füge diesen Code in deine Website ein, um die verifizierten Bewertungen einzubetten.
            Das Skript läuft komplett asynchron und passt seine Höhe automatisch an.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto font-mono whitespace-pre">
            {snippet}
          </pre>
          <div className="mt-3 flex gap-2">
            <Button onClick={copy} className="gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Kopiert!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Snippet kopieren
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vorschau</CardTitle>
          <CardDescription>So sieht das Widget auf deiner Seite aus.</CardDescription>
        </CardHeader>
        <CardContent>
          {tenantSlug ? (
            <iframe
              src={`${origin}/embed/feedback/${tenantSlug}?mode=${mode}`}
              title="Widget preview"
              style={{ width: '100%', minHeight: 300, border: 0 }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Tenant-Slug nicht gefunden. Stelle sicher, dass dein Profil ein Tenant zugeordnet hat.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
