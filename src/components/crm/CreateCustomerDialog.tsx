/**
 * Customer creation wizard (Contact -> Person -> Classification) with a live
 * avatar preview and email validation hints.
 */
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Phone, Building2, User as UserIcon, Tag as TagIcon, AtSign, AlertCircle,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/adaptive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FormGrid, FormField, InputAffix } from '@/components/ui/form-layout';
import { FormWizard } from '@/components/ui/form-wizard';
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
  const { t } = useTranslation('returns');
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function setField<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function reset() {
    setForm(EMPTY);
    setTouched({});
    setStep(0);
  }

  // Live preview derivations
  const previewName = useMemo(() => {
    const full = [form.firstName, form.lastName].filter(Boolean).join(' ').trim();
    if (full) return full;
    if (form.email.trim()) return form.email.trim().split('@')[0];
    return t('New Customer');
  }, [form.firstName, form.lastName, form.email, t]);

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
  const canSave = hasMinimumIdentity && emailValid;

  async function handleSave(openAfter: boolean) {
    setTouched({ email: true, name: true });
    if (!hasMinimumIdentity) {
      toast.error(t('At least an email or a name is required.'));
      return;
    }
    if (!emailValid) {
      toast.error(t('Invalid email address'));
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
        toast.error(res.error || t('Could not create the customer'));
        return;
      }
      toast.success(t('{{name}} created', { name: previewName }));
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
      <DialogContent className="pb-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>{t('New Customer')}</DialogTitle>
        </DialogHeader>

        {/* Live preview */}
        <div className="flex items-center gap-3 pr-8">
          <div
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground"
          >
            {previewInitials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold">{previewName}</div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {form.company.trim() && (
                <span className="inline-flex min-w-0 items-center gap-1 truncate">
                  <Building2 className="h-3 w-3 shrink-0" />
                  {form.company.trim()}
                </span>
              )}
              {previewTags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="h-5 px-2 text-[10px]">{tag}</Badge>
              ))}
              {previewTags.length > 3 && (
                <Badge variant="outline" className="h-5 px-2 text-[10px]">+{previewTags.length - 3}</Badge>
              )}
            </div>
          </div>
        </div>

        <FormWizard
          variant="dialog"
          step={step}
          onStepChange={(_, i) => setStep(i)}
          onCancel={() => { reset(); onOpenChange(false); }}
          cancelLabel={t('Cancel')}
          onFinish={() => handleSave(true)}
          finishing={saving}
          finishLabel={t('Save & open')}
          secondaryAction={step === 2 ? (
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving || !canSave}>
              {t('Save')}
            </Button>
          ) : undefined}
          steps={[
            {
              id: 'contact',
              title: t('Contact'),
              description: t('How do you reach the customer?'),
              icon: AtSign,
              canNext: emailValid,
              content: (
                <FormGrid cols={1}>
                  <FormField label={t('Email')} error={emailInvalid ? t('Invalid email address') : undefined}>
                    <InputAffix prefix={<Mail className="h-4 w-4" />}>
                      <Input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoFocus
                        value={form.email}
                        onChange={e => setField('email', e.target.value)}
                        onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                        placeholder="kunde@beispiel.de"
                      />
                    </InputAffix>
                  </FormField>
                  <FormField label={t('Phone')} optional>
                    <InputAffix prefix={<Phone className="h-4 w-4" />}>
                      <Input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={form.phone}
                        onChange={e => setField('phone', e.target.value)}
                        placeholder="+49 30 12345678"
                      />
                    </InputAffix>
                  </FormField>
                </FormGrid>
              ),
            },
            {
              id: 'person',
              title: t('Person'),
              description: t('Who is the customer?'),
              icon: UserIcon,
              canNext: canSave,
              content: (
                <FormGrid cols={2}>
                  <FormField label={t('First Name')}>
                    <Input value={form.firstName} onChange={e => setField('firstName', e.target.value)} placeholder="Anna" autoComplete="given-name" />
                  </FormField>
                  <FormField label={t('Last Name')}>
                    <Input value={form.lastName} onChange={e => setField('lastName', e.target.value)} placeholder="Müller" autoComplete="family-name" />
                  </FormField>
                  <FormField label={t('Company')} optional span="full">
                    <InputAffix prefix={<Building2 className="h-4 w-4" />}>
                      <Input value={form.company} onChange={e => setField('company', e.target.value)} autoComplete="organization" />
                    </InputAffix>
                  </FormField>
                  {!hasMinimumIdentity && (
                    <p role="status" className="col-span-full flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {t('At least an email or a name is required.')}
                    </p>
                  )}
                </FormGrid>
              ),
            },
            {
              id: 'classify',
              title: t('Classification'),
              description: t('Tags and a first note help your team (optional).'),
              icon: TagIcon,
              canNext: canSave,
              content: (
                <FormGrid cols={1}>
                  <FormField label={t('Tags')} optional hint={t('Separate tags with commas.')}>
                    <Input value={form.tagsText} onChange={e => setField('tagsText', e.target.value)} placeholder="VIP, B2B" />
                  </FormField>
                  <FormField label={t('First note')} optional>
                    <Textarea
                      rows={3}
                      value={form.notes}
                      onChange={e => setField('notes', e.target.value)}
                      placeholder={t('e.g. met at a trade fair, prefers eco packaging')}
                      className="resize-none"
                    />
                  </FormField>
                </FormGrid>
              ),
            },
          ]}
        />
      </DialogContent>
    </Dialog>
  );
}
