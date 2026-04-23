/**
 * Send an email to a customer via the tenant's SMTP (send-email Edge Function).
 *
 * Flow:
 *   UI → createRhNotification(channel='email', status='pending')
 *     → DB webhook triggers send-email Edge Function
 *     → SMTP (noreply@trackbliss.eu) delivers, row updated to status='sent'
 */
import { useState, useMemo } from 'react';
import { Mail, Send, X, Eye, FileEdit, Sparkles } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { createRhNotification } from '@/services/supabase/rh-notifications';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { CrmCustomer } from '@/services/supabase/crm-analytics';

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CrmCustomer;
  onSent?: () => void;
}

interface EmailTemplate {
  key: string;
  label: string;
  subject: string;
  body: string;
  tone: 'welcome' | 'thank' | 'reengagement' | 'free';
}

function makeTemplates(customer: CrmCustomer): EmailTemplate[] {
  const firstName = customer.firstName || 'du';
  return [
    {
      key: 'welcome',
      tone: 'welcome',
      label: 'Willkommen',
      subject: `Willkommen bei uns, ${firstName}!`,
      body: `Hallo ${firstName},

schön, dass du da bist. Danke für dein Vertrauen. Wenn du Fragen hast oder wir etwas für dich tun können, schreib uns gerne.

Herzliche Grüße
dein Team`,
    },
    {
      key: 'thank',
      tone: 'thank',
      label: 'Danke',
      subject: `Danke, ${firstName}!`,
      body: `Hallo ${firstName},

wir wollten uns einfach mal melden und Danke sagen. Es bedeutet uns viel, dass du zu unseren Kunden gehörst.

Falls du Anregungen, Wünsche oder Feedback hast, freuen wir uns über eine kurze Antwort auf diese E-Mail.

Herzliche Grüße`,
    },
    {
      key: 'reengagement',
      tone: 'reengagement',
      label: 'Reaktivierung',
      subject: `Wir denken an dich, ${firstName}`,
      body: `Hallo ${firstName},

wir haben dich länger nicht gesehen und wollten nur kurz Hallo sagen. Falls du Fragen zu unseren Produkten hast oder einfach wissen möchtest, was es Neues gibt: meld dich gerne.

Wir freuen uns, von dir zu hören.

Herzliche Grüße`,
    },
    {
      key: 'free',
      tone: 'free',
      label: 'Freies Thema',
      subject: '',
      body: '',
    },
  ];
}

export function SendEmailDialog({ open, onOpenChange, customer, onSent }: SendEmailDialogProps) {
  const templates = useMemo(() => makeTemplates(customer), [customer]);
  const [templateKey, setTemplateKey] = useState(templates[0].key);
  const [subject, setSubject] = useState(templates[0].subject);
  const [body, setBody] = useState(templates[0].body);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [sending, setSending] = useState(false);

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || 'Kunde';

  function applyTemplate(key: string) {
    setTemplateKey(key);
    const tpl = templates.find(t => t.key === key);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
  }

  async function handleSend() {
    if (!customer.email) {
      toast.error('Diese Kundin/dieser Kunde hat keine E-Mail-Adresse hinterlegt.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error('Betreff und Inhalt dürfen nicht leer sein.');
      return;
    }
    setSending(true);
    try {
      // 1. Log notification row (status=pending, customerId-linked)
      const res = await createRhNotification({
        customerId: customer.id,
        channel: 'email',
        template: templateKey === 'free' ? undefined : templateKey,
        subject: subject.trim(),
        content: body.trim(),
        metadata: {
          senderName: 'Trackbliss',
          isHtml: false,
          recipientEmail: customer.email,
        } as Record<string, unknown>,
      });
      if (!res.success || !res.id) {
        toast.error(res.error || 'E-Mail konnte nicht in die Versand-Warteschlange gestellt werden.');
        return;
      }

      // 2. Invoke send-email Edge Function directly — no Database Webhook needed
      const record = {
        id: res.id,
        channel: 'email',
        status: 'pending',
        recipient_email: customer.email,
        subject: subject.trim(),
        content: body.trim(),
        metadata: {
          senderName: 'Trackbliss',
          isHtml: false,
        },
      };
      const { error: invokeErr } = await supabase.functions.invoke('send-email', { body: { record } });
      if (invokeErr) {
        toast.error(`Versand fehlgeschlagen: ${invokeErr.message}`);
        return;
      }

      toast.success(`E-Mail an ${customer.email} versendet`);
      onSent?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  const previewHtml = useMemo(() => {
    return body
      .split('\n')
      .map(line => `<p style="margin: 0 0 12px 0;">${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
      .join('');
  }, [body]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-2xl gap-0 sm:rounded-2xl">
        {/* Header */}
        <div className="relative overflow-hidden border-b">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
          <div className="relative px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md">
                <Mail className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                  <Sparkles className="h-3 w-3" />
                  Persönliche E-Mail
                </div>
                <div className="text-lg font-bold truncate mt-0.5">An {fullName}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {customer.email || <span className="text-destructive">Keine E-Mail hinterlegt</span>}
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Eigener SMTP
              </Badge>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Template picker */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
                Vorlage
              </Label>
              <Select value={templateKey} onValueChange={applyTemplate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex rounded-md border bg-muted/40 p-0.5 self-end">
              <button
                type="button"
                onClick={() => setTab('edit')}
                className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  tab === 'edit' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileEdit className="h-3.5 w-3.5" />
                Bearbeiten
              </button>
              <button
                type="button"
                onClick={() => setTab('preview')}
                className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  tab === 'preview' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Vorschau
              </button>
            </div>
          </div>

          {tab === 'edit' ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="em-subject" className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
                  Betreff
                </Label>
                <Input
                  id="em-subject"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Kurzer, klarer Betreff"
                />
              </div>
              <div>
                <Label htmlFor="em-body" className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
                  Inhalt
                </Label>
                <Textarea
                  id="em-body"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={10}
                  className="resize-none font-normal"
                  placeholder="Dein persönlicher Text ..."
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Zeilenumbrüche werden übernommen, HTML wird automatisch gewrappt.
                </p>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-background">
              <div className="border-b bg-muted/50 px-4 py-2 text-xs font-mono text-muted-foreground space-y-0.5">
                <div><span className="font-semibold text-foreground">Von:</span> noreply@trackbliss.eu</div>
                <div><span className="font-semibold text-foreground">An:</span> {customer.email}</div>
                <div><span className="font-semibold text-foreground">Betreff:</span> {subject || <em>kein Betreff</em>}</div>
              </div>
              <div
                className="p-6 text-sm leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewHtml || '<em class="text-muted-foreground">Noch kein Inhalt</em>' }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-6 py-3 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground hidden sm:block">
            Versand erfolgt über deinen SMTP (noreply@trackbliss.eu)
          </p>
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={sending}>
              <X className="h-4 w-4 mr-1" />
              Abbrechen
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending || !customer.email || !subject.trim() || !body.trim()}
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Wird gesendet
                </span>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Jetzt senden
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
