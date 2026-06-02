import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Send } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { sendCustomShipmentEmail } from '@/services/supabase/rh-notification-trigger';
import type { WhShipment } from '@/types/warehouse';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: WhShipment;
}

/**
 * Quick-pick reason templates. Each entry maps to three i18n keys (label,
 * subject, body) in the `warehouse` namespace. The list is intentionally a
 * plain array so new reasons can be added by appending one entry here and the
 * matching keys to public/locales/{en,de}/warehouse.json — nothing else.
 */
const CONTACT_TEMPLATES: { id: string; labelKey: string; subjectKey: string; bodyKey: string }[] = [
  { id: 'address_incomplete', labelKey: 'contact.tpl.address_incomplete.label', subjectKey: 'contact.tpl.address_incomplete.subject', bodyKey: 'contact.tpl.address_incomplete.body' },
  { id: 'out_of_stock',       labelKey: 'contact.tpl.out_of_stock.label',       subjectKey: 'contact.tpl.out_of_stock.subject',       bodyKey: 'contact.tpl.out_of_stock.body' },
  { id: 'shipping_delay',     labelKey: 'contact.tpl.shipping_delay.label',     subjectKey: 'contact.tpl.shipping_delay.subject',     bodyKey: 'contact.tpl.shipping_delay.body' },
  { id: 'holiday',            labelKey: 'contact.tpl.holiday.label',            subjectKey: 'contact.tpl.holiday.subject',            bodyKey: 'contact.tpl.holiday.body' },
  { id: 'partial_shipment',   labelKey: 'contact.tpl.partial_shipment.label',   subjectKey: 'contact.tpl.partial_shipment.subject',   bodyKey: 'contact.tpl.partial_shipment.body' },
  { id: 'order_question',     labelKey: 'contact.tpl.order_question.label',     subjectKey: 'contact.tpl.order_question.subject',     bodyKey: 'contact.tpl.order_question.body' },
  { id: 'confirm_details',    labelKey: 'contact.tpl.confirm_details.label',    subjectKey: 'contact.tpl.confirm_details.subject',    bodyKey: 'contact.tpl.confirm_details.body' },
];

/**
 * Compose and send a free-text email to the shipment's recipient directly from
 * the system. Offers a set of one-click reason templates (incomplete address,
 * out of stock, shipping delay, holiday closure, …) that pre-fill an editable
 * subject + message; the operator can also write fully free text.
 */
export function ContactCustomerDialog({ open, onOpenChange, shipment }: Props) {
  const { t } = useTranslation('warehouse');

  const firstName = (shipment.recipientName || '').trim().split(/\s+/)[0] || '';
  const interp = { shipmentNumber: shipment.shipmentNumber, firstName };

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [activeTpl, setActiveTpl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Reset the form whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setSubject('');
      setMessage('');
      setActiveTpl(null);
    }
  }, [open]);

  const applyTemplate = (tpl: typeof CONTACT_TEMPLATES[number]) => {
    setActiveTpl(tpl.id);
    setSubject(t(tpl.subjectKey, interp));
    setMessage(t(tpl.bodyKey, interp));
  };

  const hasEmail = !!shipment.recipientEmail;
  const canSend = hasEmail && !!subject.trim() && !!message.trim() && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const res = await sendCustomShipmentEmail({
        shipmentId: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        recipientEmail: shipment.recipientEmail!,
        recipientName: shipment.recipientName,
        customerId: shipment.customerId,
        subject,
        message,
      });
      if (res.success) {
        toast.success(t('contact.sent'));
        onOpenChange(false);
      } else {
        toast.error(res.error || t('contact.sendFailed'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('contact.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> {t('contact.title')}
          </DialogTitle>
          <DialogDescription>{t('contact.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient */}
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{t('contact.recipient')}</span>
            {hasEmail ? (
              <span className="font-medium break-all">{shipment.recipientEmail}</span>
            ) : (
              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                {t('contact.noEmail')}
              </Badge>
            )}
          </div>

          {/* Template quick-pick */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">{t('contact.templates')}</p>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={activeTpl === 'custom' ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => { setActiveTpl('custom'); setSubject(''); setMessage(''); }}
              >
                {t('contact.tpl.custom.label')}
              </Button>
              {CONTACT_TEMPLATES.map((tpl) => (
                <Button
                  key={tpl.id}
                  type="button"
                  size="sm"
                  variant={activeTpl === tpl.id ? 'default' : 'outline'}
                  className="h-7 text-xs"
                  onClick={() => applyTemplate(tpl)}
                >
                  {t(tpl.labelKey)}
                </Button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">{t('contact.subject')}</p>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('contact.subjectPlaceholder')}
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">{t('contact.message')}</p>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              placeholder={t('contact.messagePlaceholder')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            {t('Cancel', { ns: 'common' })}
          </Button>
          <Button onClick={handleSend} disabled={!canSend}>
            <Send className="h-3.5 w-3.5 mr-1" />
            {sending ? t('contact.sending') : t('contact.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
