/**
 * Admin Feature-Flags-Verwaltung
 *   - Globaler Toggle
 *   - Prozentualer Rollout
 *   - Whitelist / Blacklist pro Tenant
 */
import { useState, useEffect } from 'react';
import { ToggleRight, Plus, Save, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { listFeatureFlags, upsertFeatureFlag, deleteFeatureFlag } from '@/services/supabase/admin';
import type { FeatureFlag } from '@/types/admin-extended';
import { toast } from 'sonner';

export function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setFlags(await listFeatureFlags());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  function updateFlag(key: string, patch: Partial<FeatureFlag>) {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, ...patch } : f));
    setDirty(prev => new Set(prev).add(key));
  }

  async function saveFlag(flag: FeatureFlag) {
    setBusyKey(flag.key);
    try {
      await upsertFeatureFlag({
        key: flag.key,
        description: flag.description,
        enabledGlobally: flag.enabledGlobally,
        rolloutPercentage: flag.rolloutPercentage,
        enabledForTenants: flag.enabledForTenants,
        disabledForTenants: flag.disabledForTenants,
      });
      toast.success(`"${flag.key}" gespeichert`);
      setDirty(prev => {
        const next = new Set(prev);
        next.delete(flag.key);
        return next;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDelete(flag: FeatureFlag) {
    if (!confirm(`Feature Flag "${flag.key}" wirklich löschen?`)) return;
    setBusyKey(flag.key);
    try {
      await deleteFeatureFlag(flag.key);
      toast.success('Flag gelöscht');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreate() {
    if (!newKey.trim()) return;
    try {
      await upsertFeatureFlag({
        key: newKey.trim(),
        description: newDescription.trim() || undefined,
        enabledGlobally: false,
        rolloutPercentage: 0,
      });
      toast.success('Flag angelegt');
      setCreateOpen(false);
      setNewKey('');
      setNewDescription('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1200px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ToggleRight className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Feature Flags</h1>
            <p className="text-xs text-muted-foreground">
              Features staged per Tenant aktivieren, Rollout-Percentage steuern.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Neu laden
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Neuer Flag
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <ShimmerSkeleton key={i} className="h-40" />)}</div>
      ) : flags.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ToggleRight className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Noch keine Feature Flags angelegt.</p>
            <Button size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Ersten Flag anlegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {flags.map(flag => {
            const isDirty = dirty.has(flag.key);
            const busy = busyKey === flag.key;
            const activeForCount = flag.enabledForTenants.length;
            const disabledForCount = flag.disabledForTenants.length;
            return (
              <Card key={flag.id} className={isDirty ? 'ring-2 ring-amber-200' : ''}>
                <CardHeader className="pb-3 flex-row items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base flex items-center gap-2 font-mono">
                      {flag.key}
                      {flag.enabledGlobally && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] h-5">GLOBAL</Badge>}
                      {!flag.enabledGlobally && flag.rolloutPercentage > 0 && (
                        <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] h-5">
                          ROLLOUT {flag.rolloutPercentage}%
                        </Badge>
                      )}
                    </CardTitle>
                    {flag.description && (
                      <p className="text-xs text-muted-foreground mt-1">{flag.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {isDirty && (
                      <Button size="sm" onClick={() => saveFlag(flag)} disabled={busy}>
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Speichern
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(flag)}
                      disabled={busy}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <Switch
                        checked={flag.enabledGlobally}
                        onCheckedChange={(v) => updateFlag(flag.key, { enabledGlobally: v })}
                      />
                      <div>
                        <div className="font-medium text-sm">Global aktivieren</div>
                        <div className="text-[11px] text-muted-foreground">
                          Für alle Tenants aktiv
                        </div>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Rollout</Label>
                        <span className="font-mono tabular-nums text-sm">{flag.rolloutPercentage}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={flag.rolloutPercentage}
                        onChange={(e) => updateFlag(flag.key, { rolloutPercentage: Number(e.target.value) })}
                        disabled={flag.enabledGlobally}
                        className="w-full cursor-pointer accent-primary"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        % der Tenants, die den Flag erhalten (stabile Hash-Verteilung)
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 block">
                        Immer aktiv (Whitelist)
                      </Label>
                      <div className="flex items-center justify-between px-3 py-2 rounded border bg-emerald-50/40 dark:bg-emerald-950/20">
                        <span className="text-xs">{activeForCount} Tenant(s)</span>
                        {activeForCount > 0 && <Badge variant="secondary" className="text-[10px]">via Tenant-Detail</Badge>}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 block">
                        Immer aus (Blacklist)
                      </Label>
                      <div className="flex items-center justify-between px-3 py-2 rounded border bg-red-50/40 dark:bg-red-950/20">
                        <span className="text-xs">{disabledForCount} Tenant(s)</span>
                        {disabledForCount > 0 && <Badge variant="secondary" className="text-[10px]">via Tenant-Detail</Badge>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neuer Feature Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Key (eindeutig, snake_case)</Label>
              <Input
                value={newKey}
                onChange={e => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                placeholder="z.B. new_email_editor"
                autoFocus
              />
            </div>
            <div>
              <Label>Beschreibung (optional)</Label>
              <Textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Was macht der Flag?"
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={!newKey.trim()}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Anlegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
