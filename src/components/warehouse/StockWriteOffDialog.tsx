import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Gift, FlaskConical, HeartHandshake, Home, Trash2, AlertOctagon, Loader2, MinusCircle, Box,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  icon: React.ComponentType<{ className?: string }>;
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The stock row from which to write off. */
  stock: WhStockLevel | null;
  onSaved: () => void;
}

/**
 * Polished "Ware ausbuchen" dialog. Categorical reasons render as a
 * clickable picker grid (icon + label + description), then quantity +
 * optional recipient/notes. Writes a structured stock_transaction via
 * createStockAdjustment so reports can group by category later.
 */
export function StockWriteOffDialog({ open, onOpenChange, stock, onSaved }: Props) {
  const { t } = useTranslation('warehouse');
  const [reason, setReason] = useState<WriteOffCategory | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [recipient, setRecipient] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset every time the dialog opens with a (possibly new) stock row.
  useEffect(() => {
    if (!open) return;
    setReason(null);
    setQuantity(1);
    setRecipient('');
    setNotes('');
  }, [open, stock?.id]);

  const maxQty = stock?.quantityAvailable ?? 0;
  const selectedReason = useMemo(() => REASONS.find(r => r.key === reason) || null, [reason]);
  const requiresRecipient = reason === 'giveaway' || reason === 'tester' || reason === 'donation';
  const requiresNotes = reason === 'other' || reason === 'damage' || reason === 'expired';

  const recipientMissing = requiresRecipient && !recipient.trim();
  const notesMissing = requiresNotes && !notes.trim();
  const canSubmit =
    !!stock && !!reason && quantity > 0 && quantity <= maxQty && !recipientMissing && !notesMissing && !submitting;

  async function handleSubmit() {
    if (!stock || !reason) return;
    setSubmitting(true);
    try {
      const labelMap: Record<WriteOffCategory, string> = {
        giveaway: 'Werbegeschenk',
        tester: 'Tester / Influencer',
        donation: 'Spende',
        own_use: 'Eigenverbrauch',
        damage: 'Bruch / Verlust',
        expired: 'Ausschuss / Verfall',
        other: 'Sonstiges',
      };
      // Structured reason: "category:label[ — recipient]" so DB can be parsed later.
      const parts = [`${reason}:${labelMap[reason]}`];
      if (recipient.trim()) parts.push(recipient.trim());
      const reasonStr = parts.join(' — ');

      await createStockAdjustment({
        stockId: stock.id,
        quantityChange: -Math.abs(quantity), // always negative for write-off
        reason: reasonStr,
        notes: notes.trim() || undefined,
      });
      toast.success(t('Bestand ausgebucht'), {
        description: t('{{n}}× {{name}} — {{reason}}', {
          n: quantity,
          name: stock.productName || stock.productId.slice(0, 8),
          reason: t(labelMap[reason]),
        }),
      });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!stock) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 min-w-0">
            <MinusCircle className="h-5 w-5 shrink-0 text-red-600" />
            <span className="truncate">{t('Ware ausbuchen')}</span>
          </DialogTitle>
          <DialogDescription className="break-words">
            {t('Bestand reduzieren ohne Sendung — für Werbegeschenke, Tester, Spenden, Eigenverbrauch oder Bruch.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-4 sm:px-6 py-4 min-w-0">
          {/* Product header */}
          <div className="rounded-lg border bg-muted/30 p-3 flex items-start gap-3 min-w-0">
            <Box className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm break-words">{stock.productName || stock.productId.slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground mt-0.5 break-words">
                {stock.locationName || '?'}
                {stock.batchSerialNumber ? ` · ${stock.batchSerialNumber}` : ''}
                {stock.binLocation ? ` · ${stock.binLocation}` : ''}
              </div>
              <div className="text-xs mt-1">
                <span className="text-muted-foreground">{t('Verfügbar')}:</span>{' '}
                <span className="font-semibold tabular-nums">{stock.quantityAvailable}</span>
              </div>
            </div>
          </div>

          {/* Reason picker */}
          <div className="space-y-2 min-w-0">
            <Label>{t('Grund auswählen')}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REASONS.map(r => {
                const Icon = r.icon;
                const active = reason === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setReason(r.key)}
                    className={`group relative flex items-start gap-3 rounded-lg border p-3 text-left transition-all cursor-pointer min-w-0 ${
                      active
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:border-foreground/30 hover:bg-muted/40'
                    }`}
                    aria-pressed={active}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${r.bg}`}
                      style={{ color: r.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-tight break-words">{t(r.labelKey)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 break-words">{t(r.descKey)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity */}
          {selectedReason && (
            <div className="space-y-2 min-w-0">
              <Label htmlFor="wo-qty">
                {t('Menge ausbuchen')}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  ({t('max. {{n}}', { n: maxQty })})
                </span>
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  id="wo-qty"
                  type="number"
                  min={1}
                  max={maxQty}
                  value={quantity}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    setQuantity(isNaN(v) ? 1 : Math.max(1, Math.min(maxQty, v)));
                  }}
                  className="w-24 sm:w-32"
                />
                {[1, 5, 10].filter(n => n <= maxQty).map(n => (
                  <Button
                    key={n}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(n)}
                    className="h-9"
                  >
                    {n}×
                  </Button>
                ))}
                {maxQty > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(maxQty)}
                    className="h-9"
                  >
                    {t('Alles ({{n}})', { n: maxQty })}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Recipient (conditional) */}
          {selectedReason && requiresRecipient && (
            <div className="space-y-2 min-w-0">
              <Label htmlFor="wo-recipient">
                {t('Empfänger')}{' '}
                <span className="text-xs font-normal text-red-600">*</span>
              </Label>
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
            </div>
          )}

          {/* Notes (conditional + optional) */}
          {selectedReason && (
            <div className="space-y-2 min-w-0">
              <Label htmlFor="wo-notes">
                {t('Notiz')}{' '}
                {requiresNotes ? (
                  <span className="text-xs font-normal text-red-600">*</span>
                ) : (
                  <span className="text-xs font-normal text-muted-foreground">({t('optional')})</span>
                )}
              </Label>
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
            </div>
          )}

          {/* Confirmation summary */}
          {selectedReason && quantity > 0 && quantity <= maxQty && (
            <div className={`rounded-lg border p-3 text-sm ${selectedReason.bg}`}>
              <div className="flex items-start gap-2">
                <selectedReason.icon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: selectedReason.color }} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium break-words">
                    {t('{{n}} Stück werden als „{{reason}}" ausgebucht', {
                      n: quantity,
                      reason: t(selectedReason.labelKey),
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 break-words">
                    {t('Neuer Bestand')}: <span className="font-semibold tabular-nums">{Math.max(0, maxQty - quantity)}</span>{' '}
                    {t('verfügbar')} · {t('wird im Aktivitätsverlauf protokolliert')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 bg-background border-t px-4 sm:px-6 py-3 flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {t('Abbrechen')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
          >
            {submitting ? (
              <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> {t('Speichert...')}</>
            ) : (
              <><MinusCircle className="mr-1 h-4 w-4" /> {t('Ausbuchen bestätigen')}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
