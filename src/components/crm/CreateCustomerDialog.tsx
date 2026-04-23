/**
 * Quick-create dialog for rh_customers.
 * Opens from the Customer List "Neuer Kunde" button, navigates to the new
 * detail page on success.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Check, X, Mail, Phone, Building2, User as UserIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createRhCustomer } from '@/services/supabase/rh-customers';
import { toast } from 'sonner';

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (newId: string) => void;
}

const EMPTY = {
  email: '',
  firstName: '',
  lastName: '',
  company: '',
  phone: '',
  tagsText: '',
  notes: '',
};

export function CreateCustomerDialog({ open, onOpenChange, onCreated }: CreateCustomerDialogProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function reset() {
    setForm(EMPTY);
  }

  async function handleSave(openAfter: boolean) {
    if (!form.email.trim() && !form.firstName.trim() && !form.lastName.trim()) {
      toast.error('Mindestens E-Mail oder Name muss ausgefüllt sein');
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('E-Mail-Adresse ist ungültig');
      return;
    }
    setSaving(true);
    try {
      const tags = form.tagsText
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      const res = await createRhCustomer({
        externalId: undefined,
        email: form.email.trim() || `no-email-${Date.now()}@placeholder.local`,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        addresses: [],
        tags,
        notes: form.notes.trim() || undefined,
      });
      if (!res.success || !res.id) {
        toast.error(res.error || 'Anlegen fehlgeschlagen');
        return;
      }
      toast.success('Kunde angelegt');
      onCreated?.(res.id);
      reset();
      onOpenChange(false);
      if (openAfter) navigate(`/crm/customers/${res.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Neuen Kunden anlegen
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid grid-cols-[auto_1fr] items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="c-email" className="text-xs text-muted-foreground">E-Mail</Label>
              <Input
                id="c-email"
                type="email"
                autoFocus
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                placeholder="kunde@beispiel.de"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid grid-cols-[auto_1fr] items-center gap-2">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="c-first" className="text-xs text-muted-foreground">Vorname</Label>
                <Input id="c-first" value={form.firstName} onChange={e => setField('firstName', e.target.value)} placeholder="Anna" />
              </div>
            </div>
            <div>
              <Label htmlFor="c-last" className="text-xs text-muted-foreground">Nachname</Label>
              <Input id="c-last" value={form.lastName} onChange={e => setField('lastName', e.target.value)} placeholder="Müller" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid grid-cols-[auto_1fr] items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="c-company" className="text-xs text-muted-foreground">Firma</Label>
                <Input id="c-company" value={form.company} onChange={e => setField('company', e.target.value)} placeholder="optional" />
              </div>
            </div>
            <div className="grid grid-cols-[auto_1fr] items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="c-phone" className="text-xs text-muted-foreground">Telefon</Label>
                <Input id="c-phone" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="optional" />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="c-tags" className="text-xs text-muted-foreground">Tags (kommagetrennt)</Label>
            <Input
              id="c-tags"
              value={form.tagsText}
              onChange={e => setField('tagsText', e.target.value)}
              placeholder="VIP, B2B, Wiederkäufer"
            />
          </div>

          <div>
            <Label htmlFor="c-notes" className="text-xs text-muted-foreground">Erste Notiz</Label>
            <Textarea
              id="c-notes"
              rows={2}
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="z.B. auf Messe kennengelernt, wünscht Bio-Verpackung"
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="h-4 w-4 mr-1" />
            Abbrechen
          </Button>
          <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? '…' : 'Speichern'}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            <Check className="h-4 w-4 mr-1" />
            {saving ? 'Lädt …' : 'Speichern + öffnen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
