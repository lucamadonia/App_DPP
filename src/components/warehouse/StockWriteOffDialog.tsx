import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Gift, FlaskConical, HeartHandshake, Home, Trash2, AlertOctagon, Loader2, MinusCircle, Box, X,
  type LucideIcon,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/adaptive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChoiceCards, FormActions, FormField } from '@/components/ui/form-layout';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { createStockAdjustment } from '@/services/supabase/wh-stock';
import type { WhStockLevel } from '@/types/warehouse';
import { toast } from 'sonner';

/** Categorical write-off reasons. The key is what we persist (machine-readable);
 *  the label is translatable. Reports can group by `category` later. */
export type WriteOffCategory =
  | 'giveaway'
  | 'tester'
  | 'donation'
  | 'own_use'
  | 'damage'
  | 'expired'
  | 'other';

interface ReasonDef {
  key: WriteOffCategory;
  icon: LucideIcon;
  /** Hex used for accent (border + icon color). */
  color: string;
  /** Tailwind background tint. */
  bg: string;
  labelKey: string;
  descKey: string;
}

const REASONS: ReasonDef[] = [
  { key: 'giveaway',  icon: Gift,           color: '#db2777', bg: 'bg-pink-50 dark:bg-pink-900/20',     labelKey: 'Werbegeschenk',           descKey: 'An Freunde, Bekannte, Kunden' },
  { key: 'tester',    icon: FlaskConical,   color: '#7c3aed', bg: 'bg-violet-50 dark:bg-violet-900/20', labelKey: 'Tester / Influencer',     descKey: 'Produkttest, Sample-Send' },
  { key: 'donation',  icon: HeartHandshake, color: '#059669', bg: 'bg-emerald-50 dark:bg-emerald-900/20', labelKey: 'Spende',                descKey: 'Kita, Verein, gemeinnützig' },
  { key: 'own_use',   icon: Home,           color: '#0284c7', bg: 'bg-sky-50 dark:bg-sky-900/20',       labelKey: 'Eigenverbrauch',          descKey: 'Büro, Foto-Shooting, Messe' },
  { key: 'damage',    icon: AlertOctagon,   color: '#dc2626', bg: 'bg-red-50 dark:bg-red-900/20',       labelKey: 'Bruch / Verlust',         descKey: 'Beschädigt, abhanden gekommen' },
  { key: 'expired',   icon: Trash2,         color: '#ea580c', bg: 'bg-orange-50 dark:bg-orange-900/20', labelKey: 'Ausschuss / Verfall',     descKey: 'MHD abgelaufen, B-Ware' },
  { key: 'other',     icon: Box,            color: '#525252', bg: 'bg-neutral-50 dark:bg-neutral-900/30', labelKey: 'Sonstiges',             descKey: 'Anderer Grund — bitte notieren' },
];

const LABEL_MAP: Record<WriteOffCategory, string> = {
  giveaway: 'Werbegeschenk',
  tester: 'Tester / Influencer',
  donation: 'Spende',
  own_use: 'Eigenverbrauch',
  damage: 'Bruch / Verlust',
  expired: 'Ausschuss / Verfall',
  other: 'Sonstiges',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * One or more stock rows to write off. When multiple, the dialog shows a
   * per-row quantity input but a single shared reason / recipient / notes.
   */
  stocks: WhStockLevel[];
  onSaved: () => void;
}

/**
 * Polished "Ware ausbuchen" dialog with single-row and bulk modes:
 *  - 1 stock → compact UX (product header, quantity, reason, recipient/notes)
 *  - N stocks → list of items with per-row quantity + remove-from-batch button,
 *    one shared reason picker for the entire batch
 *
 * On submit it loops createStockAdjustment for each row. Partial failures
 * are surfaced via toast (one row failing does not abort the rest).
 */
export function StockWriteOffDialog({ open, onOpenChange, stocks, onSaved }: Props) {
  const { t } = useTranslation('warehouse');

  const [reason, setReason] = useState<WriteOffCategory | null>(null);
  // Per-row quantities, keyed by stock id.
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  // Local list of stocks that the user has decided to actually write off
  // (allows removing individual rows without closing + reopening the dialog).
  const [activeStocks, setActiveStocks] = useState<WhStockLevel[]>([]);
  const [recipient, setRecipient] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset every time the dialog opens. Snapshot the props.stocks so the
  // user can remove rows locally without affecting the parent component.
  useEffect(() => {
    if (!open) return;
    setReason(null);
    setActiveStocks(stocks);
    const initial: Record<string, number> = {};
    for (const s of stocks) initial[s.id] = Math.min(1, s.quantityAvailable);
    setQuantities(initial);
    setRecipient('');
    setNotes('');
    // intentionally only depend on `open` + the stocks array reference to avoid
    // accidental resets while the user types.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isBulk = activeStocks.length > 1;
  const isMobile = useIsMobile();
  const selectedReason = useMemo(() => REASONS.find(r => r.key === reason) || null, [reason]);
  const requiresRecipient = reason === 'giveaway' || reason === 'tester' || reason === 'donation';
  const requiresNotes = reason === 'other' || reason === 'damage' || reason === 'expired';

  const totalQty = useMemo(
    () => activeStocks.reduce((sum, s) => sum + (quantities[s.id] || 0), 0),
    [activeStocks, quantities],
  );

  const anyInvalidQty = activeStocks.some(s => {
    const q = quantities[s.id] || 0;
    return q < 1 || q > s.quantityAvailable;
  });

  const recipientMissing = requiresRecipient && !recipient.trim();
  const notesMissing = requiresNotes && !notes.trim();
  const canSubmit =
    activeStocks.length > 0 && !!reason && !anyInvalidQty && totalQty > 0
    && !recipientMissing && !notesMissing && !submitting;

  function updateQty(stockId: string, n: number) {
    const stock = activeStocks.find(s => s.id === stockId);
    if (!stock) return;
    setQuantities(q => ({ ...q, [stockId]: Math.max(1, Math.min(stock.quantityAvailable, n)) }));
  }

  function removeRow(stockId: string) {
    setActiveStocks(rows => rows.filter(r => r.id !== stockId));
    setQuantities(q => {
      const next = { ...q };
      delete next[stockId];
      return next;
    });
  }

  async function handleSubmit() {
    if (!reason || activeStocks.length === 0) return;
    setSubmitting(true);

    // Build the shared reason string once: "category:label[ — recipient]".
    const parts = [`${reason}:${LABEL_MAP[reason]}`];
    if (recipient.trim()) parts.push(recipient.trim());
    const reasonStr = parts.join(' — ');
    const sharedNotes = notes.trim() || undefined;

    const failures: { name: string; error: string }[] = [];
    let successCount = 0;

    for (const s of activeStocks) {
      const q = quantities[s.id] || 0;
      if (q <= 0) continue;
      try {
        await createStockAdjustment({
          stockId: s.id,
          quantityChange: -Math.abs(q),
          reason: reasonStr,
          notes: sharedNotes,
        });
        successCount++;
      } catch (e) {
        failures.push({
          name: s.productName || s.productId.slice(0, 8),
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    setSubmitting(false);

    if (failures.length === 0) {
      toast.success(t('Bestand ausgebucht'), {
        description: t('{{n}}× Positionen — {{reason}}', {
          n: successCount,
          reason: t(LABEL_MAP[reason]),
        }),
      });
      onSaved();
      onOpenChange(false);
    } else if (successCount > 0) {
      // Partial success — keep dialog open so the user sees which rows failed.
      toast.warning(t('Teilweise ausgebucht'), {
        description: t('{{ok}} erfolgreich, {{fail}} fehlgeschlagen: {{names}}', {
          ok: successCount,
          fail: failures.length,
          names: failures.map(f => f.name).join(', '),
        }),
        duration: 8000,
      });
      onSaved(); // refresh inventory anyway — successful rows changed stock
      // Remove the successful rows from the active set so the user can retry the failed ones.
      setActiveStocks(rows => rows.filter(r => failures.some(f => f.name === (r.productName || r.productId.slice(0, 8)))));
    } else {
      toast.error(t('Ausbuchen fehlgeschlagen'), {
        description: failures.map(f => `${f.name}: ${f.error}`).join('\n'),
        duration: 10000,
      });
    }
  }

  if (activeStocks.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 min-w-0">
            <MinusCircle className="h-5 w-5 shrink-0 text-destructive" />
            <span className="truncate">
              {isBulk
                ? t('{{n}} Positionen ausbuchen', { n: activeStocks.length })
                : t('Ware ausbuchen')}
            </span>
          </DialogTitle>
          <DialogDescription className="break-words">
            {t('Bestand reduzieren ohne Sendung — für Werbegeschenke, Tester, Spenden, Eigenverbrauch oder Bruch.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-4 sm:px-6 py-4 min-w-0">
          {/* Selected items list */}
          <div className="space-y-2 min-w-0">
            <div className="flex min-h-5 items-center justify-between gap-2">
              <h3 className="text-sm font-medium leading-5">{isBulk ? t('Ausgewählte Positionen') : t('Position')}</h3>
              {isBulk && (
                <span className="text-xs text-muted-foreground">
                  {t('Summe')}: <span className="font-semibold text-foreground tabular-nums">{totalQty}</span>
                </span>
              )}
            </div>
            <div className="rounded-lg border divide-y max-h-56 overflow-y-auto">
              {activeStocks.map(s => {
                const q = quantities[s.id] || 0;
                const max = s.quantityAvailable;
                const invalid = q < 1 || q > max;
                return (
                  <div key={s.id} className={cn('flex items-center gap-3 p-3', invalid && 'bg-destructive/5')}>
                    <Box className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm leading-tight truncate">
                        {s.productName || s.productId.slice(0, 8)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {s.locationName || '?'}
                        {s.batchSerialNumber ? ` · ${s.batchSerialNumber}` : ''}
                        {s.binLocation ? ` · ${s.binLocation}` : ''}
                        {' · '}
                        <span className="tabular-nums">{max} {t('verfügbar')}</span>
                      </div>
                    </div>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={max}
                      value={q}
                      onChange={e => updateQty(s.id, parseInt(e.target.value, 10) || 0)}
                      className="w-16 sm:w-20 text-center tabular-nums pointer-coarse:h-11"
                      aria-label={t('Menge')}
                      aria-invalid={invalid || undefined}
                    />
                    {isBulk && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(s.id)}
                        className="size-9 shrink-0 text-muted-foreground hover:text-destructive pointer-coarse:size-11"
                        aria-label={t('Position entfernen')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reason picker */}
          <FormField
            label={t('Grund auswählen')}
            required
            hint={selectedReason && isMobile ? t(selectedReason.descKey) : undefined}
          >
            <ChoiceCards
              value={reason ?? ''}
              onValueChange={(v) => setReason(v)}
              columns={2}
              options={REASONS.map(r => ({
                value: r.key,
                label: t(r.labelKey),
                icon: r.icon,
                // Phones: label-only grid (no deep scroll); the chosen reason's
                // description shows as the field hint instead.
                description: isMobile ? undefined : t(r.descKey),
              }))}
            />
          </FormField>

          {/* Recipient (conditional) */}
          {selectedReason && requiresRecipient && (
            <FormField
              label={t('Empfänger')}
              htmlFor="wo-recipient"
              required
              hint={isBulk ? t('Empfänger gilt für alle {{n}} Positionen.', { n: activeStocks.length }) : undefined}
            >
              <Input
                id="wo-recipient"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder={
                  reason === 'donation'
                    ? t('z. B. "Kita Sonnenblume, Freiburg"')
                    : reason === 'tester'
                      ? t('z. B. "Sabrina P. — Instagram"')
                      : t('z. B. "Geburtstag Bekannte"')
                }
                className="w-full"
              />
            </FormField>
          )}

          {/* Notes (conditional or optional) */}
          {selectedReason && (
            <FormField
              label={t('Notiz')}
              htmlFor="wo-notes"
              required={requiresNotes}
              optional={!requiresNotes}
            >
              <Textarea
                id="wo-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={
                  reason === 'damage'
                    ? t('Was ist passiert? (z. B. "Beim Transport zerbrochen")')
                    : reason === 'expired'
                      ? t('Charge / MHD-Datum')
                      : t('Optionale interne Notiz')
                }
                rows={2}
                className="w-full resize-none"
              />
            </FormField>
          )}

          {/* Summary */}
          {selectedReason && totalQty > 0 && !anyInvalidQty && (
            <div role="status" className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex items-start gap-2">
                <selectedReason.icon className="h-4 w-4 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium break-words">
                    {isBulk
                      ? t('{{n}} Positionen ({{q}} Stück gesamt) werden als „{{reason}}" ausgebucht', {
                          n: activeStocks.length,
                          q: totalQty,
                          reason: t(selectedReason.labelKey),
                        })
                      : t('{{n}} Stück werden als „{{reason}}" ausgebucht', {
                          n: totalQty,
                          reason: t(selectedReason.labelKey),
                        })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 break-words">
                    {t('wird im Aktivitätsverlauf protokolliert')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,var(--safe-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
          <FormActions>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t('Abbrechen')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> {t('Speichert...')}</>
              ) : (
                <><MinusCircle className="mr-1 h-4 w-4" /> {t('Ausbuchen bestätigen')}</>
              )}
            </Button>
          </FormActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}
