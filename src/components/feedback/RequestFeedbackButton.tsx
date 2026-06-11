import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircleHeart, Loader2, AlertTriangle, Link2, MailCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { createFeedbackRequestsForShipment, getFeedbackRequests } from '@/services/supabase/feedback-requests';
import { getVariantColorHex } from '@/lib/variant-color';
import type { WhShipment, WhShipmentItem } from '@/types/warehouse';
import type { FeedbackRequest } from '@/types/feedback';

/** Format an ISO timestamp as German date + time (e.g. "27.05.2026, 11:00 Uhr"). */
function formatSentAt(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) + ' Uhr';
}

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
  const { t } = useTranslation('warehouse');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [subject, setSubject] = useState(DEFAULT_CUSTOM_SUBJECT);
  const [body, setBody] = useState(DEFAULT_CUSTOM_BODY);

  // Existing feedback requests for this shipment — so the operator sees
  // whether (and when) a request was already sent before sending again.
  const [existing, setExisting] = useState<FeedbackRequest[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getFeedbackRequests({ shipmentId: shipment.id })
      .then(rows => { if (!cancelled) setExisting(rows); })
      .catch(() => { if (!cancelled) setExisting([]); });
    return () => { cancelled = true; };
  }, [open, shipment.id]);

  // Latest send timestamp + whether the customer already responded.
  const priorRequests = existing ?? [];
  const alreadyRequested = priorRequests.length > 0;
  const latestSentAt = priorRequests
    .map(r => r.sentAt || r.createdAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const submittedRequest = priorRequests.find(r => r.status === 'submitted');

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
    toast.success(res.emailsSent > 0 ? t('Review request sent') : t('Review request created'));
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
        {t('Request Feedback')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircleHeart className="h-5 w-5" />
              {t('Request Review')}
            </DialogTitle>
            <DialogDescription>
              {t('{{name}} ({{email}}) will receive an email with a link to review the following variants. A separate review is created per variant — responses are checked by you before publication.', { name: shipment.recipientName, email: shipment.recipientEmail })}
            </DialogDescription>
          </DialogHeader>

          {/* Already-requested / already-answered notice */}
          {submittedRequest ? (
            <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {submittedRequest.submittedAt
                  ? t('{{name}} has already submitted a review (on {{date}}).', { name: shipment.recipientName, date: formatSentAt(submittedRequest.submittedAt) })
                  : t('{{name}} has already submitted a review.', { name: shipment.recipientName })}{' '}
                {t('Sending again is usually not necessary.')}
              </span>
            </div>
          ) : alreadyRequested ? (
            <div className="flex items-start gap-2 rounded-md border border-sky-300 bg-sky-50 dark:bg-sky-900/20 px-3 py-2 text-xs text-sky-800 dark:text-sky-200">
              <MailCheck className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {latestSentAt
                  ? t('A review request was already sent for this shipment — sent on {{date}}.', { date: formatSentAt(latestSentAt) })
                  : t('A review request was already sent for this shipment.')}{' '}
                {t('Sending again will email {{name}} once more.', { name: shipment.recipientName })}
              </span>
            </div>
          ) : null}

          {notYetDelivered && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t('This shipment is not yet marked as "delivered". You can still send the request.')}</span>
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
                {t('Standard email')}
              </button>
              <button
                type="button"
                onClick={() => setCustomize(true)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  customize ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                {t('Customize email')}
              </button>
            </div>

            {customize && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('Subject')}</p>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t('Email subject')} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('Message')}</p>
                  <Textarea value={body} onChange={e => setBody(e.target.value)} rows={7} />
                </div>
                <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <Link2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    {t('The personal review link is automatically inserted as a "Review now" button — you don\'t need to add it yourself. The placeholder')} <code className="font-mono">{'{{feedbackUrl}}'}</code> {t('only marks the position and will be replaced.')}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {t('{{count}} variants · 1 email to {{email}}', { count: uniqueVariants.length, email: shipment.recipientEmail })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              {t('Cancel', { ns: 'common' })}
            </Button>
            <Button onClick={handleConfirm} disabled={busy || !shipment.recipientEmail || customInvalid}>
              {busy ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  {t('Sending…')}
                </>
              ) : (
                <>
                  <MessageCircleHeart className="mr-1 h-4 w-4" />
                  {alreadyRequested ? t('Send again anyway') : t('Send request')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
