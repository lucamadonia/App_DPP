import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/adaptive-dialog';
import { FormActions } from '@/components/ui/form-layout';
import { FormWizard } from '@/components/ui/form-wizard';
import { createSupplier, updateSupplier } from '@/services/supabase';
import { SupplierContactDialog } from './SupplierContactDialog';
import { useSupplierFields } from './supplier-form/supplier-fields';
import { SupplierEditTabs } from './supplier-form/SupplierEditTabs';
import { buildSupplierCreateSteps } from './supplier-form/supplierCreateSteps';
import { getEmptySupplierForm, getEmptyContactForm } from './supplier-helpers';
import type { Supplier, SupplierContact, Country } from '@/types/database';

interface SupplierFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  supplier: Supplier | null;
  countries: Country[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
}

/**
 * Create: 5-step wizard. Edit: tabbed, sectioned form for quick access.
 * Both share field renderers (supplier-form/supplier-fields.tsx).
 */
export function SupplierFormDialog({ open, mode, supplier, countries, onOpenChange, onSaved }: SupplierFormDialogProps) {
  const { t } = useTranslation('settings');
  const [formData, setFormData] = useState<Partial<Supplier>>(getEmptySupplierForm());
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [wizardStep, setWizardStep] = useState('company');
  const [nameError, setNameError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  // Contact sub-dialog
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState<Partial<SupplierContact>>(getEmptyContactForm());

  // Initialize form when the dialog opens
  useEffect(() => {
    if (open) {
      const initial = mode === 'edit' && supplier ? { ...supplier } : getEmptySupplierForm();
      setFormData(initial);
      setInitialSnapshot(JSON.stringify(initial));
      setActiveTab('basic');
      setWizardStep('company');
      setNameError(undefined);
    }
  }, [open, mode, supplier]);

  const isDirty = useMemo(
    () => initialSnapshot !== '' && JSON.stringify(formData) !== initialSnapshot,
    [formData, initialSnapshot]
  );

  const updateForm = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'name' && value) setNameError(undefined);
  };

  const fields = useSupplierFields({ formData, updateForm, countries, errors: { name: nameError } });

  const updateContactForm = (field: string, value: unknown) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleCertification = (cert: string) => {
    const current = formData.certifications || [];
    updateForm('certifications', current.includes(cert) ? current.filter(c => c !== cert) : [...current, cert]);
  };

  const handleAddContact = () => {
    setEditingContactIndex(null);
    setContactForm(getEmptyContactForm());
    setContactFormOpen(true);
  };

  const handleEditContact = (contact: SupplierContact, index: number) => {
    setEditingContactIndex(index);
    setContactForm({ ...contact });
    setContactFormOpen(true);
  };

  const handleSaveContact = () => {
    const contacts = [...(formData.additional_contacts || [])];
    if (editingContactIndex !== null) {
      contacts[editingContactIndex] = contactForm as SupplierContact;
    } else {
      contacts.push(contactForm as SupplierContact);
    }
    updateForm('additional_contacts', contacts);
    setContactFormOpen(false);
  };

  const handleDeleteContact = (index: number) => {
    const contacts = (formData.additional_contacts || []).filter((_, i) => i !== index);
    updateForm('additional_contacts', contacts);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (mode === 'create') {
        const result = await createSupplier(formData as Omit<Supplier, 'id' | 'tenant_id' | 'createdAt'>);
        if (!result.success) throw new Error(result.error || 'Creation failed');
      } else if (supplier) {
        const result = await updateSupplier(supplier.id, formData);
        if (!result.success) throw new Error(result.error || 'Update failed');
      }
      toast.success(t('Supplier saved'));
      await onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error(t('Error saving'));
    }
    setIsSaving(false);
  };

  const validateCompany = () => {
    if (formData.name?.trim()) return true;
    setNameError(t('This field is required'));
    return false;
  };

  const isCreate = mode === 'create';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={
            isCreate
              ? 'max-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-2rem)] sm:max-h-[90vh] sm:max-w-2xl overflow-y-auto pb-0'
              : 'max-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-2rem)] sm:max-h-[90vh] sm:max-w-4xl overflow-y-auto pb-0'
          }
        >
          <DialogHeader>
            <DialogTitle>{isCreate ? t('New Supplier') : t('Edit Supplier')}</DialogTitle>
            <DialogDescription className={isCreate ? 'sr-only' : undefined}>
              {t('Master data, contacts and terms for this supplier.')}
            </DialogDescription>
          </DialogHeader>

          {isCreate ? (
            <FormWizard
              variant="dialog"
              step={wizardStep}
              onStepChange={setWizardStep}
              steps={buildSupplierCreateSteps({ t, formData, fields, countries, validateCompany })}
              onCancel={() => onOpenChange(false)}
              onFinish={handleSave}
              finishing={isSaving}
              finishLabel={t('Create supplier')}
            />
          ) : (
            <>
              <SupplierEditTabs
                formData={formData}
                updateForm={updateForm}
                fields={fields}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onToggleCertification={toggleCertification}
                onAddContact={handleAddContact}
                onEditContact={handleEditContact}
                onDeleteContact={handleDeleteContact}
              />
              <FormActions sticky="dialog" dirty={isDirty}>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  {t('Cancel', { ns: 'common' })}
                </Button>
                <Button onClick={handleSave} disabled={isSaving || !formData.name}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t('Save', { ns: 'common' })}
                </Button>
              </FormActions>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact person sub-dialog */}
      <SupplierContactDialog
        open={contactFormOpen}
        isEditing={editingContactIndex !== null}
        contact={contactForm}
        onFieldChange={updateContactForm}
        onOpenChange={setContactFormOpen}
        onSave={handleSaveContact}
      />
    </>
  );
}
