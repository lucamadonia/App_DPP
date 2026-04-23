/**
 * Zeigt alle Feature-Flags und erlaubt pro Tenant:
 *   - Force ON (Tenant in enabled_for_tenants)
 *   - Force OFF (Tenant in disabled_for_tenants)
 *   - Default (Tenant in keiner Liste — Rollout/Global entscheidet)
 */
import { useState, useEffect } from 'react';
import { ToggleRight, Lock, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { listFeatureFlags, upsertFeatureFlag } from '@/services/supabase/admin';
import type { FeatureFlag } from '@/types/admin-extended';
import { toast } from 'sonner';

type TenantFlagState = 'on' | 'off' | 'default';

function getState(flag: FeatureFlag, tenantId: string): TenantFlagState {
  if (flag.enabledForTenants.includes(tenantId)) return 'on';
  if (flag.disabledForTenants.includes(tenantId)) return 'off';
  return 'default';
}

function effectiveStatus(flag: FeatureFlag, tenantId: string): string {
  const state = getState(flag, tenantId);
  if (state === 'on') return 'Aktiv (forciert)';
  if (state === 'off') return 'Aus (forciert)';
  if (flag.enabledGlobally) return 'Aktiv (global)';
  if (flag.rolloutPercentage > 0) return `Rollout ${flag.rolloutPercentage}%`;
  return 'Aus (default)';
}

interface TenantFeatureFlagsPanelProps {
  tenantId: string;
}

export function TenantFeatureFlagsPanel({ tenantId }: TenantFeatureFlagsPanelProps) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setFlags(await listFeatureFlags());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function setState(flag: FeatureFlag, newState: TenantFlagState) {
    setBusyKey(flag.key);
    const enabled = flag.enabledForTenants.filter(id => id !== tenantId);
    const disabled = flag.disabledForTenants.filter(id => id !== tenantId);
    if (newState === 'on') enabled.push(tenantId);
    else if (newState === 'off') disabled.push(tenantId);
    try {
      await upsertFeatureFlag({
        key: flag.key,
        enabledForTenants: enabled,
        disabledForTenants: disabled,
      });
      setFlags(prev => prev.map(f => f.key === flag.key
        ? { ...f, enabledForTenants: enabled, disabledForTenants: disabled }
        : f));
      toast.success(`"${flag.key}" → ${newState}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ToggleRight className="h-4 w-4 text-primary" />
          Feature-Flags für diesen Tenant
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Override pro Flag: ON erzwingt aktiv, OFF erzwingt aus, Default folgt globaler Konfiguration.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          [...Array(3)].map((_, i) => <ShimmerSkeleton key={i} className="h-14" />)
        ) : flags.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Noch keine Feature-Flags angelegt.
          </div>
        ) : (
          flags.map(flag => {
            const state = getState(flag, tenantId);
            return (
              <div
                key={flag.id}
                className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm font-medium truncate">{flag.key}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    <span>{effectiveStatus(flag, tenantId)}</span>
                    {flag.description && <span className="truncate">· {flag.description}</span>}
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0 rounded-md border bg-background p-0.5">
                  <PillButton
                    active={state === 'on'}
                    onClick={() => setState(flag, 'on')}
                    disabled={busyKey === flag.key}
                    tone="emerald"
                    label="Ein"
                    icon={<Check className="h-3 w-3" />}
                  />
                  <PillButton
                    active={state === 'default'}
                    onClick={() => setState(flag, 'default')}
                    disabled={busyKey === flag.key}
                    tone="slate"
                    label="Default"
                    icon={<Lock className="h-3 w-3" />}
                  />
                  <PillButton
                    active={state === 'off'}
                    onClick={() => setState(flag, 'off')}
                    disabled={busyKey === flag.key}
                    tone="red"
                    label="Aus"
                    icon={<X className="h-3 w-3" />}
                  />
                </div>
              </div>
            );
          })
        )}
        <div className="pt-2 border-t flex items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="h-4 text-[10px]">Hinweis</Badge>
          <span>Änderungen werden im Audit-Log protokolliert.</span>
        </div>
      </CardContent>
    </Card>
  );
}

function PillButton({
  active, onClick, disabled, tone, label, icon,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  tone: 'emerald' | 'red' | 'slate';
  label: string;
  icon: React.ReactNode;
}) {
  const activeCls = tone === 'emerald'
    ? 'bg-emerald-500 text-white'
    : tone === 'red'
      ? 'bg-red-500 text-white'
      : 'bg-slate-600 text-white';
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className={`h-7 px-2 text-[11px] gap-1 ${active ? activeCls + ' hover:opacity-90' : ''}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
