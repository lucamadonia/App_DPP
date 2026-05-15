import { useState } from 'react';
import { MessageCircleHeart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { createFeedbackRequestsForShipment } from '@/services/supabase/feedback-requests';
import { getVariantColorHex } from '@/lib/variant-color';
import type { WhShipment, WhShipmentItem } from '@/types/warehouse';

interface Props {
  shipment: WhShipment;
  items: WhShipmentItem[];
  disabled?: boolean;
  onRequested?: () => void;
}

/**
 * Button + confirm dialog to send a customer feedback request for a
 * delivered shipment. Shows a preview of which variants will receive
 * a review request before firing emails.
 */
export function RequestFeedbackButton({ shipment, items, disabled, onRequested }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Dedup by (productId, batchId, variantTitle)
  const seen = new Set<string>();
  const uniqueVariants = items.filter(it => {
    const key = `${it.productId}::${it.batchId || ''}::${it.variantTitle || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  async function handleConfirm() {
    setBusy(true);
    const res = await createFeedbackRequestsForShipment(shipment.id);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`${res.created} Bewertungsanfrage(n) versendet`);
    setOpen(false);
    onRequested?.();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="gap-1"
      >
        <MessageCircleHeart className="h-4 w-4" />
        Feedback anfragen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircleHeart className="h-5 w-5" />
              Bewertung anfragen
            </DialogTitle>
            <DialogDescription>
              {shipment.recipientName} ({shipment.recipientEmail}) erhält per Email einen Link, um die folgenden Varianten zu bewerten. Es wird eine separate Bewertung pro Variante erstellt — Antworten werden vor Veröffentlichung von dir geprüft.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border divide-y">
            {uniqueVariants.map(it => {
              const hex = it.variantTitle ? getVariantColorHex(it.variantTitle) : null;
              return (
                <div key={it.id} className="p-3 flex items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="font-medium text-sm break-words">
                      {it.productName || it.productId.slice(0, 8)}
                    </div>
                    {it.variantTitle && (
                      <Badge
                        variant="outline"
                        className="gap-1.5 px-2 py-0 text-xs font-semibold border-2 bg-violet-50 text-violet-900 border-violet-300 dark:bg-violet-900/30 dark:text-violet-100 dark:border-violet-700"
                      >
                        {hex && (
                          <span
                            aria-hidden="true"
                            className="inline-block h-2.5 w-2.5 rounded-full border border-black/20"
                            style={{ backgroundColor: hex }}
                          />
                        )}
                        {it.variantTitle}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-muted-foreground">
            {uniqueVariants.length} {uniqueVariants.length === 1 ? 'Variante' : 'Varianten'} · 1 Email an {shipment.recipientEmail}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Abbrechen
            </Button>
            <Button onClick={handleConfirm} disabled={busy || !shipment.recipientEmail}>
              {busy ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Wird versendet…
                </>
              ) : (
                <>
                  <MessageCircleHeart className="mr-1 h-4 w-4" />
                  Anfrage senden
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
