import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? t('Edit Contact') : t('New Contact')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>{t('Name')} *</Label>
              <Input value={contact.name || ''} onChange={e => onFieldChange('name', e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <Label>{t('Position')}</Label>
              <Input value={contact.position || ''} onChange={e => onFieldChange('position', e.target.value)} placeholder="Purchasing Manager" />
            </div>
          </div>
          <div>
            <Label>{t('Department')}</Label>
            <Input value={contact.department || ''} onChange={e => onFieldChange('department', e.target.value)} placeholder="Purchasing" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>{t('Email')}</Label>
              <Input type="email" value={contact.email || ''} onChange={e => onFieldChange('email', e.target.value)} />
            </div>
            <div>
              <Label>{t('Phone')}</Label>
              <Input value={contact.phone || ''} onChange={e => onFieldChange('phone', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>{t('Mobile')}</Label>
            <Input value={contact.mobile || ''} onChange={e => onFieldChange('mobile', e.target.value)} />
          </div>
          <div>
            <Label>{t('Notes')}</Label>
            <Input value={contact.notes || ''} onChange={e => onFieldChange('notes', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel', { ns: 'common' })}</Button>
          <Button onClick={onSave} disabled={!contact.name}>{t('Save', { ns: 'common' })}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
