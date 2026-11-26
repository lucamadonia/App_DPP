import { useTranslation } from 'react-i18next';
import { Mail, Phone, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/adaptive-dialog';
import { FormGrid, FormField, InputAffix, FormActions } from '@/components/ui/form-layout';
import type { SupplierContact } from '@/types/database';

interface SupplierContactDialogProps {
  open: boolean;
  isEditing: boolean;
  contact: Partial<SupplierContact>;
  onFieldChange: (field: string, value: unknown) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

/** Add/edit an additional contact person (sub-dialog of the supplier form) */
export function SupplierContactDialog({
  open, isEditing, contact, onFieldChange, onOpenChange, onSave,
}: SupplierContactDialogProps) {
  const { t } = useTranslation('settings');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pb-0">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('Edit Contact') : t('New Contact')}</DialogTitle>
        </DialogHeader>
        <FormGrid cols={2}>
          <FormField label={t('Name')} htmlFor="contact-name" required>
            <Input value={contact.name || ''} onChange={e => onFieldChange('name', e.target.value)} placeholder="John Doe" autoComplete="name" />
          </FormField>
          <FormField label={t('Position')} htmlFor="contact-position" optional>
            <Input value={contact.position || ''} onChange={e => onFieldChange('position', e.target.value)} placeholder="Purchasing Manager" />
          </FormField>
          <FormField label={t('Department')} htmlFor="contact-department" optional span="full">
            <Input value={contact.department || ''} onChange={e => onFieldChange('department', e.target.value)} placeholder="Purchasing" />
          </FormField>
          <FormField label={t('Email')} htmlFor="contact-email" span="full">
            <InputAffix prefix={<Mail className="size-4" />}>
              <Input type="email" inputMode="email" value={contact.email || ''} onChange={e => onFieldChange('email', e.target.value)} autoComplete="email" />
            </InputAffix>
          </FormField>
          <FormField label={t('Phone')} htmlFor="contact-phone">
            <InputAffix prefix={<Phone className="size-4" />}>
              <Input type="tel" value={contact.phone || ''} onChange={e => onFieldChange('phone', e.target.value)} />
            </InputAffix>
          </FormField>
          <FormField label={t('Mobile')} htmlFor="contact-mobile" optional>
            <InputAffix prefix={<Smartphone className="size-4" />}>
              <Input type="tel" value={contact.mobile || ''} onChange={e => onFieldChange('mobile', e.target.value)} />
            </InputAffix>
          </FormField>
          <FormField label={t('Notes')} htmlFor="contact-notes" optional span="full">
            <Textarea rows={2} value={contact.notes || ''} onChange={e => onFieldChange('notes', e.target.value)} />
          </FormField>
        </FormGrid>
        <FormActions sticky="dialog">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('Cancel', { ns: 'common' })}</Button>
          <Button onClick={onSave} disabled={!contact.name}>{t('Save', { ns: 'common' })}</Button>
        </FormActions>
      </DialogContent>
    </Dialog>
  );
}
