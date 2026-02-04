import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle2, Mail, User, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createPublicProductTicket } from '@/services/supabase/customer-portal';

interface PublicProductTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  productName: string;
  gtin: string;
  serialNumber: string;
}

export function PublicProductTicketDialog({
  open,
  onOpenChange,
  tenantId,
  productName,
  gtin,
  serialNumber,
}: PublicProductTicketDialogProps) {
  const { t } = useTranslation('dpp');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await createPublicProductTicket({
      tenantId,
      email: email.trim(),
      name: name.trim() || undefined,
      subject: subject.trim(),
      message: message.trim(),
      productContext: {
        productName,
        gtin,
        serialNumber,
      },
    });

    setLoading(false);

    if (result.success && result.ticketNumber) {
      setSuccess(true);
      setTicketNumber(result.ticketNumber);
      // Reset form
      setEmail('');
      setName('');
      setSubject('');
      setMessage('');
    } else {
      setError(result.error || t('Failed to create ticket. Please try again.'));
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setTicketNumber('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('Contact Support')}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('Ticket Created Successfully')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('Your ticket number is')} <span className="font-mono font-semibold">{ticketNumber}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {t('We will respond to your inquiry shortly via email.')}
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              {t('Close')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product Context Info */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">{t('Product')}</p>
              <p className="text-sm font-medium">{productName}</p>
              <p className="text-xs text-muted-foreground">
                {t('GTIN')}: {gtin} | {t('Serial')}: {serialNumber}
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('Email Address')} *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('Your Name')}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('John Doe')}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">{t('Subject')} *</Label>
              <Input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('Brief description of your issue')}
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">{t('Message')} *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('Describe your issue or question in detail...')}
                rows={5}
                required
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/2000
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                {t('Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('Submit Ticket')}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
