/**
 * Premium customer creation dialog with live avatar preview,
 * grouped sections, icons inside fields, and email validation hints.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Check, X, Mail, Phone, Building2, User as UserIcon,
  Tag as TagIcon, StickyNote, AtSign, Sparkles, ArrowRight, AlertCircle,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreateCustomerDialog({ open, onOpenChange, onCreated }: CreateCustomerDialogProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function setField<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function reset() {
    setForm(EMPTY);
    setTouched({});
  }

  // Live preview derivations
  const previewName = useMemo(() => {
    const full = [form.firstName, form.lastName].filter(Boolean).join(' ').trim();
    if (full) return full;
    if (form.email.trim()) return form.email.trim().split('@')[0];
    return 'Neuer Kunde';
  }, [form.firstName, form.lastName, form.email]);

  const previewInitials = useMemo(() => {
    const parts = [form.firstName, form.lastName].filter(Boolean);
    if (parts.length > 0) return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
    if (form.email.trim()) return form.email.trim().charAt(0).toUpperCase();
    return '?';
  }, [form.firstName, form.lastName, form.email]);

  const previewTags = useMemo(
    () => form.tagsText.split(',').map(t => t.trim()).filter(Boolean),
    [form.tagsText],
  );

  const emailValid = !form.email.trim() || EMAIL_RE.test(form.email.trim());
  const emailInvalid = touched.email && !emailValid;
  const hasMinimumIdentity =
    form.email.trim() !== '' || form.firstName.trim() !== '' || form.lastName.trim() !== '';

  async function handleSave(openAfter: boolean) {
    setTouched({ email: true, name: true });
    if (!hasMinimumIdentity) {
      toast.error('Mindestens E-Mail oder Name muss ausgefüllt sein');
      return;
    }
    if (!emailValid) {
      toast.error('E-Mail-Adresse ist ungültig');
      return;
    }
    setSaving(true);
    try {
      const res = await createRhCustomer({
        externalId: undefined,
        email: form.email.trim() || `no-email-${Date.now()}@placeholder.local`,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        addresses: [],
        tags: previewTags,
        notes: form.notes.trim() || undefined,
      });
      if (!res.success || !res.id) {
        toast.error(res.error || 'Anlegen fehlgeschlagen');
        return;
      }
      toast.success(`${previewName} angelegt`);
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
      <DialogContent className="p-0 overflow-hidden max-w-xl gap-0 sm:rounded-2xl">
        {/* Hero Header with Live Preview */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="relative px-6 pt-6 pb-5 flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shadow-lg ring-4 ring-background transition-all duration-300">
                {previewInitials}
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                <UserPlus className="h-3 w-3 text-primary" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                <Sparkles className="h-3 w-3" />
                Neuer Kunde
              </div>
              <div className="text-xl font-bold truncate mt-0.5">{previewName}</div>
              {form.company.trim() && (
                <div className="text-sm text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3" />
                  {form.company.trim()}
                </div>
              )}
              {previewTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {previewTags.slice(0, 4).map(t => (
                    <Badge key={t} variant="secondary" className="text-[10px] h-5 px-2">{t}</Badge>
                  ))}
                  {previewTags.length > 4 && (
                    <Badge variant="outline" className="text-[10px] h-5 px-2">+{previewTags.length - 4}</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Section: Kontakt */}
          <div className="space-y-3">
            <SectionLabel icon={AtSign}>Kontakt</SectionLabel>
            <div className="space-y-2.5">
              <IconInput
                icon={Mail}
                type="email"
                autoFocus
                value={form.email}
                onChange={v => setField('email', v)}
                onBlur={() => setTouched(t => ({ ...t, email: true }))}
                placeholder="kunde@beispiel.de"
                label="E-Mail"
                invalid={!!emailInvalid}
                hint={emailInvalid ? 'Ungültiges Format' : undefined}
              />
              <IconInput
                icon={Phone}
                value={form.phone}
                onChange={v => setField('phone', v)}
                placeholder="optional, z.B. +49 30 12345678"
                label="Telefon"
              />
            </div>
          </div>

          {/* Section: Person */}
          <div className="space-y-3">
            <SectionLabel icon={UserIcon}>Person</SectionLabel>
            <div className="grid grid-cols-2 gap-2.5">
              <IconInput
                value={form.firstName}
                onChange={v => setField('firstName', v)}
                placeholder="Anna"
                label="Vorname"
              />
              <IconInput
                value={form.lastName}
                onChange={v => setField('lastName', v)}
                placeholder="Müller"
                label="Nachname"
              />
            </div>
            <IconInput
              icon={Building2}
              value={form.company}
              onChange={v => setField('company', v)}
              placeholder="optional"
              label="Firma"
            />
          </div>

          {/* Section: Klassifizierung */}
          <div className="space-y-3">
            <SectionLabel icon={TagIcon}>Klassifizierung</SectionLabel>
            <IconInput
              icon={TagIcon}
              value={form.tagsText}
              onChange={v => setField('tagsText', v)}
              placeholder="VIP, B2B, Wiederkäufer"
              label="Tags (kommagetrennt)"
            />

            <div>
              <Label htmlFor="c-notes" className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1.5">
                <StickyNote className="h-3 w-3" />
                Erste Notiz
              </Label>
              <Textarea
                id="c-notes"
                rows={2}
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                placeholder="z.B. auf Messe kennengelernt, wünscht Bio-Verpackung ..."
                className="resize-none"
              />
            </div>
          </div>

          {/* Validation Hint */}
          {!hasMinimumIdentity && (touched.email || touched.name) && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Mindestens E-Mail oder Name muss ausgefüllt sein.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-6 py-3 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { reset(); onOpenChange(false); }}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-1" />
            Abbrechen
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={saving || !hasMinimumIdentity || !emailValid}
            >
              <Check className="h-4 w-4 mr-1" />
              Speichern
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave(true)}
              disabled={saving || !hasMinimumIdentity || !emailValid}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Lädt
                </span>
              ) : (
                <>
                  Öffnen
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------- Sub-components ---------- */

function SectionLabel({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
      <Icon className="h-3 w-3" />
      {children}
      <div className="flex-1 h-px bg-border ml-2" />
    </div>
  );
}

interface IconInputProps {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
  invalid?: boolean;
  hint?: string;
}

function IconInput({ icon: Icon, label, value, onChange, onBlur, placeholder, type = 'text', autoFocus, invalid, hint }: IconInputProps) {
  const id = `fld-${label.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <div>
      <Label htmlFor={id} className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center justify-between">
        <span>{label}</span>
        {hint && <span className={`text-[10px] normal-case tracking-normal ${invalid ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>{hint}</span>}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${invalid ? 'text-destructive' : 'text-muted-foreground'}`} />
        )}
        <Input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`${Icon ? 'pl-10' : ''} ${invalid ? 'border-destructive focus-visible:ring-destructive' : ''} transition-colors`}
        />
      </div>
    </div>
  );
}
