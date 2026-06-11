/**
 * ShipmentQuickAction — renders the single "next best action" for a shipment
 * row in the shipment list (table row on desktop, card footer on mobile).
 *
 * Status → action mapping:
 *   draft         → "Start picking"     (inline status update → picking)
 *   picking       → "Mark as packed"    (inline status update → packed)
 *   packed        → "Create label"      (navigate to detail page — label flow lives there)
 *   label_created → "Mark as shipped"   (inline status update → shipped)
 *   shipped /
 *   in_transit    → "Track"             (open carrier tracking URL in a new tab)
 *   delivered / cancelled → no action
 *
 * Inline mutations go through the guarded `updateShipmentStatus()` service —
 * `ShipmentStatusError` (e.g. CARRIER_REQUIRED) is caught and surfaced as a
 * human-readable toast instead of a generic failure.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, PackageSearch, Package, Tag, Send, ExternalLink, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { updateShipmentStatus, ShipmentStatusError } from '@/services/supabase/wh-shipments';
import { getTrackingUrl } from '@/lib/warehouse-constants';
import type { WhShipment, ShipmentStatus } from '@/types/warehouse';

type QuickActionKind = 'status' | 'navigate' | 'track';

interface QuickActionDef {
  /** i18n key in the `warehouse` namespace (EN text = key). */
  labelKey: string;
  icon: LucideIcon;
  kind: QuickActionKind;
  /** Target status for `kind === 'status'` transitions. */
  nextStatus?: ShipmentStatus;
}

const QUICK_ACTIONS: Partial<Record<ShipmentStatus, QuickActionDef>> = {
  draft: { labelKey: 'Start picking', icon: PackageSearch, kind: 'status', nextStatus: 'picking' },
  picking: { labelKey: 'Mark as packed', icon: Package, kind: 'status', nextStatus: 'packed' },
  packed: { labelKey: 'Create label', icon: Tag, kind: 'navigate' },
  label_created: { labelKey: 'Mark as shipped', icon: Send, kind: 'status', nextStatus: 'shipped' },
  shipped: { labelKey: 'Track', icon: ExternalLink, kind: 'track' },
  in_transit: { labelKey: 'Track', icon: ExternalLink, kind: 'track' },
};

interface ShipmentQuickActionProps {
  shipment: WhShipment;
  /** Called after a successful inline mutation — parent reloads list + counts. */
  onChanged: () => void;
  /** 'table' = compact (h-8) for desktop rows, 'card' = 44px touch target. */
  size?: 'table' | 'card';
}

export function ShipmentQuickAction({ shipment, onChanged, size = 'table' }: ShipmentQuickActionProps) {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const action = QUICK_ACTIONS[shipment.status];
  if (!action) return null;

  const Icon = action.icon;
  const isCard = size === 'card';
  const iconCls = isCard ? 'h-4 w-4' : 'h-3.5 w-3.5';

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Mobile cards render inside a <Link> — keep the row navigation from firing.
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    if (action.kind === 'navigate') {
      navigate(`/warehouse/shipments/${shipment.id}`);
      return;
    }

    if (action.kind === 'track') {
      const url = getTrackingUrl(shipment.carrier, shipment.trackingNumber || '');
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        // No tracking number (or unknown carrier) yet — detail page has the context.
        navigate(`/warehouse/shipments/${shipment.id}`);
      }
      return;
    }

    if (!action.nextStatus) return;
    setBusy(true);
    try {
      await updateShipmentStatus(shipment.id, action.nextStatus);
      toast.success(t('Status updated'));
      onChanged();
    } catch (err) {
      if (err instanceof ShipmentStatusError && err.code === 'CARRIER_REQUIRED') {
        toast.error(t('Set a carrier first (open the shipment)'));
      } else {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={handleClick}
      className={isCard
        ? 'h-11 w-full justify-center text-sm font-medium'
        : 'h-8 px-2.5 text-xs whitespace-nowrap'}
    >
      {busy
        ? <Loader2 className={`${iconCls} animate-spin`} />
        : <Icon className={iconCls} />}
      <span className={isCard ? 'ml-2' : 'ml-1.5'}>{t(action.labelKey)}</span>
    </Button>
  );

  // Card mode brings its own divider row so parents don't render an empty
  // footer for statuses without an action (the component returns null above).
  if (isCard) {
    return <div className="mt-2 pt-2 border-t border-border/60">{button}</div>;
  }
  return button;
}
