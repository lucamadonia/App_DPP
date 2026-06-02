import { useState } from 'react';
import { MessageCircleHeart, Loader2, AlertTriangle, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { createFeedbackRequestsForShipment } from '@/services/supabase/feedback-requests';
import { getVariantColorHex } from '@/lib/variant-color';
import type { WhShipment, WhShipmentItem } from '@/types/warehouse';

interface Props {
  shipment: WhShipment;
  items: WhShipmentItem[];
  disabled?: boolean;
  /** Show a hint when the shipment isn't marked delivered yet. */
  notYetDelivered?: boolean;
  onRequested?: () => void;
}

const DEFAULT_CUSTOM_SUBJECT = 'Wie war deine Bestellung?';
const DEFAULT_CUSTOM_BODY =
  'vielen Dank für deine Bestellung! Wir würden uns riesig freuen, wenn du dir kurz Zeit nimmst und sie bewertest – das dauert nur eine Minute.\n\n{{feedbackUrl}}\n\nVielen Dank und liebe Grüße';

/**
 * Button + confirm dialog to send a customer feedback request for a shipment.
 * Shows a preview of which variants will receive a review request before
 * firing emails. The operator can send the standard template mail or switch
 * to a fully custom subject + body — the verified review link is always
 * injected automatically (as a CTA button), so it can never break.
 */
export function RequestFeedbackButton({ shipment, items, disabled, notYetDelivered, onRequested }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [subject, setSubject] = useState(DEFAULT_CUSTOM_SUBJECT);
  const [body, setBody] = useState(DEFAULT_CUSTOM_BODY);

  // Dedup by (productId, batchId, variantTitle)
  const seen = new Set<string>();
  const uniqueVariants = items.filter(it => {
    const key = `${it.productId}::${it.batchId || ''}::${it.variantTitle || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const customInvalid = customize && (!subject.trim() || !body.trim());

  async function handleConfirm() {
    setBusy(true);
    const res = await createFeedbackRequestsForShipment(
      shipment.id,
      customize ? { email: { mode: 'custom', subject, body } } : { email: { mode: 'default' } },
    );
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

          {notYetDelivered && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Diese Sendung ist noch nicht als „zugestellt" markiert. Du kannst die Anfrage trotzdem senden.</span>
            </div>
          )}

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

          {/* Mail mode toggle */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCustomize(false)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  !customize ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                Standard-Mail
              </button>
              <button
                type="button"
                onClick={() => setCustomize(true)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  customize ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                Mail anpassen
              </button>
            </div>

            {customize && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Betreff</p>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Betreff der E-Mail" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Nachricht</p>
                  <Textarea value={body} onChange={e => setBody(e.target.value)} rows={7} />
                </div>
                <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <Link2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    Der persönliche Bewertungs-Link wird automatisch als „Jetzt bewerten"-Button eingefügt — du musst ihn nicht selbst einbauen. Der Platzhalter <code className="font-mono">{'{{feedbackUrl}}'}</code> markiert nur die Stelle und wird ersetzt.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {uniqueVariants.length} {uniqueVariants.length === 1 ? 'Variante' : 'Varianten'} · 1 Email an {shipment.recipientEmail}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Abbrechen
            </Button>
            <Button onClick={handleConfirm} disabled={busy || !shipment.recipientEmail || customInvalid}>
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
