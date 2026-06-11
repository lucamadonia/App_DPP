import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Save, X, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { createSupplier, updateSupplier } from '@/services/supabase';
import { SupplierContactDialog } from './SupplierContactDialog';
import {
  CERTIFICATIONS, SUPPLIER_TYPES, LEGAL_FORMS, CURRENCIES,
  getEmptySupplierForm, getEmptyContactForm,
} from './supplier-helpers';
import type { Supplier, SupplierContact, Country } from '@/types/database';

interface SupplierFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  supplier: Supplier | null;
  countries: Country[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
}

/** Create/edit supplier dialog with 5 form tabs and additional-contact management */
export function SupplierFormDialog({ open, mode, supplier, countries, onOpenChange, onSaved }: SupplierFormDialogProps) {
  const { t } = useTranslation('settings');
  const [formData, setFormData] = useState<Partial<Supplier>>(getEmptySupplierForm());
  const [activeTab, setActiveTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);

  // Contact sub-dialog
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState<Partial<SupplierContact>>(getEmptyContactForm());

  // Initialize form when the dialog opens
  useEffect(() => {
    if (open) {
      setFormData(mode === 'edit' && supplier ? { ...supplier } : getEmptySupplierForm());
      setActiveTab('basic');
    }
  }, [open, mode, supplier]);

  const updateForm = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? t('New Supplier') : t('Edit Supplier')}</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex w-full overflow-x-auto">
              <TabsTrigger value="basic" className="flex-shrink-0">{t('General')}</TabsTrigger>
              <TabsTrigger value="contact" className="flex-shrink-0">{t('Contact')}</TabsTrigger>
              <TabsTrigger value="address" className="flex-shrink-0">{t('Addresses')}</TabsTrigger>
              <TabsTrigger value="compliance" className="flex-shrink-0">{t('Compliance')}</TabsTrigger>
              <TabsTrigger value="finance" className="flex-shrink-0">{t('Finance')}</TabsTrigger>
            </TabsList>

            {/* General */}
            <TabsContent value="basic" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Label>{t('Company Name')} *</Label>
                  <Input value={formData.name || ''} onChange={e => updateForm('name', e.target.value)} placeholder={t('Company Name')} />
                </div>
                <div>
                  <Label>{t('Code')}</Label>
                  <Input value={formData.code || ''} onChange={e => updateForm('code', e.target.value)} placeholder="SUP001" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label>{t('Legal Form')}</Label>
                  <Select value={formData.legal_form || ''} onValueChange={v => updateForm('legal_form', v)}>
                    <SelectTrigger><SelectValue placeholder={t('Select')} /></SelectTrigger>
                    <SelectContent>
                      {LEGAL_FORMS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('Supplier Type')}</Label>
                  <Select value={formData.supplier_type || ''} onValueChange={v => updateForm('supplier_type', v)}>
                    <SelectTrigger><SelectValue placeholder={t('Select')} /></SelectTrigger>
                    <SelectContent>
                      {SUPPLIER_TYPES.map(st => <SelectItem key={st.value} value={st.value}>{t(st.labelKey)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('Industry')}</Label>
                  <Input value={formData.industry || ''} onChange={e => updateForm('industry', e.target.value)} placeholder={t('e.g. Electronics')} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label>{t('Status')}</Label>
                  <Select value={formData.status || 'active'} onValueChange={v => updateForm('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('Active')}</SelectItem>
                      <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                      <SelectItem value="blocked">{t('Blocked')}</SelectItem>
                      <SelectItem value="pending_approval">{t('Pending Approval')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('Risk Level')}</Label>
                  <Select value={formData.risk_level || 'low'} onValueChange={v => updateForm('risk_level', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('Low')}</SelectItem>
                      <SelectItem value="medium">{t('Medium')}</SelectItem>
                      <SelectItem value="high">{t('High')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox id="supplier-verified" checked={formData.verified || false} onCheckedChange={v => updateForm('verified', v)} />
                  <Label htmlFor="supplier-verified">{t('Verified')}</Label>
                </div>
              </div>

              <div>
                <Label>{t('Notes')}</Label>
                <Input value={formData.notes || ''} onChange={e => updateForm('notes', e.target.value)} placeholder={t('Public notes...')} />
              </div>

              <div>
                <Label>{t('Internal Notes')}</Label>
                <Input value={formData.internal_notes || ''} onChange={e => updateForm('internal_notes', e.target.value)} placeholder={t('Internal use only...')} />
              </div>
            </TabsContent>

            {/* Contact */}
            <TabsContent value="contact" className="mt-4 space-y-4">
              <h3 className="font-medium">{t('Primary Contact')}</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t('Name')}</Label>
                  <Input value={formData.contact_person || ''} onChange={e => updateForm('contact_person', e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <Label>{t('Position')}</Label>
                  <Input value={formData.contact_position || ''} onChange={e => updateForm('contact_position', e.target.value)} placeholder="Sales Manager" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t('Email')}</Label>
                  <Input type="email" value={formData.email || ''} onChange={e => updateForm('email', e.target.value)} placeholder="contact@company.com" />
                </div>
                <div>
                  <Label>{t('Phone')}</Label>
                  <Input value={formData.phone || ''} onChange={e => updateForm('phone', e.target.value)} placeholder="+49 123 456789" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t('Mobile')}</Label>
                  <Input value={formData.mobile || ''} onChange={e => updateForm('mobile', e.target.value)} placeholder="+49 170 1234567" />
                </div>
                <div>
                  <Label>{t('Fax')}</Label>
                  <Input value={formData.fax || ''} onChange={e => updateForm('fax', e.target.value)} placeholder="+49 123 456789" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t('Website')}</Label>
                  <Input value={formData.website || ''} onChange={e => updateForm('website', e.target.value)} placeholder="https://www.company.com" />
                </div>
                <div>
                  <Label>{t('LinkedIn')}</Label>
                  <Input value={formData.linkedin || ''} onChange={e => updateForm('linkedin', e.target.value)} placeholder="https://linkedin.com/company/..." />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <h3 className="font-medium">{t('Additional Contacts')}</h3>
                <Button variant="outline" size="sm" onClick={handleAddContact}>
                  <Plus className="mr-1 h-4 w-4" />{t('Add')}
                </Button>
              </div>

              {(formData.additional_contacts || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('No additional contacts')}</p>
              ) : (
                <div className="space-y-2">
                  {(formData.additional_contacts || []).map((contact, i) => (
                    <div key={i} className="flex items-center justify-between rounded border p-3">
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {contact.position}{contact.department && ` | ${contact.department}`}
                        </div>
                        <div className="text-xs text-muted-foreground">{contact.email} | {contact.phone}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditContact(contact, i)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteContact(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Addresses */}
            <TabsContent value="address" className="mt-4 space-y-4">
              <h3 className="font-medium">{t('Company Address')}</h3>
              <div>
                <Label>{t('Street')}</Label>
                <Input value={formData.address || ''} onChange={e => updateForm('address', e.target.value)} placeholder="123 Main Street" />
              </div>
              <div>
                <Label>{t('Address Line 2')}</Label>
                <Input value={formData.address_line2 || ''} onChange={e => updateForm('address_line2', e.target.value)} placeholder="Building B, 3rd Floor" />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <Label>{t('ZIP/Postal Code')}</Label>
                  <Input value={formData.postal_code || ''} onChange={e => updateForm('postal_code', e.target.value)} placeholder="12345" />
                </div>
                <div className="col-span-2">
                  <Label>{t('City')}</Label>
                  <Input value={formData.city || ''} onChange={e => updateForm('city', e.target.value)} placeholder="Berlin" />
                </div>
                <div>
                  <Label>{t('State/Province')}</Label>
                  <Input value={formData.state || ''} onChange={e => updateForm('state', e.target.value)} placeholder="Berlin" />
                </div>
              </div>
              <div>
                <Label>{t('Country')}</Label>
                <Select value={formData.country || 'DE'} onValueChange={v => updateForm('country', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <h3 className="font-medium">{t('Shipping Address (if different)')}</h3>
              <div>
                <Label>{t('Street')}</Label>
                <Input value={formData.shipping_address || ''} onChange={e => updateForm('shipping_address', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label>{t('ZIP/Postal Code')}</Label>
                  <Input value={formData.shipping_postal_code || ''} onChange={e => updateForm('shipping_postal_code', e.target.value)} />
                </div>
                <div>
                  <Label>{t('City')}</Label>
                  <Input value={formData.shipping_city || ''} onChange={e => updateForm('shipping_city', e.target.value)} />
                </div>
                <div>
                  <Label>{t('Country')}</Label>
                  <Select value={formData.shipping_country || ''} onValueChange={v => updateForm('shipping_country', v)}>
                    <SelectTrigger><SelectValue placeholder={t('Select')} /></SelectTrigger>
                    <SelectContent>
                      {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Compliance */}
            <TabsContent value="compliance" className="mt-4 space-y-4">
              <h3 className="font-medium">{t('Legal Information')}</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t('Tax ID')}</Label>
                  <Input value={formData.tax_id || ''} onChange={e => updateForm('tax_id', e.target.value)} placeholder="123/456/78901" />
                </div>
                <div>
                  <Label>{t('VAT ID')}</Label>
                  <Input value={formData.vat_id || ''} onChange={e => updateForm('vat_id', e.target.value)} placeholder="DE123456789" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t('D-U-N-S Number')}</Label>
                  <Input value={formData.duns_number || ''} onChange={e => updateForm('duns_number', e.target.value)} placeholder="12-345-6789" />
                </div>
                <div>
                  <Label>{t('Registration No.')}</Label>
                  <Input value={formData.registration_number || ''} onChange={e => updateForm('registration_number', e.target.value)} placeholder="HRB 12345" />
                </div>
              </div>

              <Separator />

              <h3 className="font-medium">{t('Compliance & Audits')}</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label>{t('Compliance Status')}</Label>
                  <Select value={formData.compliance_status || 'pending'} onValueChange={v => updateForm('compliance_status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compliant">{t('Compliant')}</SelectItem>
                      <SelectItem value="pending">{t('Review Pending')}</SelectItem>
                      <SelectItem value="non_compliant">{t('Non-Compliant')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('Last Audit')}</Label>
                  <Input type="date" value={formData.audit_date || ''} onChange={e => updateForm('audit_date', e.target.value)} />
                </div>
                <div>
                  <Label>{t('Next Audit')}</Label>
                  <Input type="date" value={formData.next_audit_date || ''} onChange={e => updateForm('next_audit_date', e.target.value)} />
                </div>
              </div>

              <Separator />

              <h3 className="font-medium">{t('Certifications')}</h3>
              <div className="flex flex-wrap gap-2">
                {CERTIFICATIONS.map(cert => (
                  <Badge
                    key={cert}
                    variant={formData.certifications?.includes(cert) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleCertification(cert)}
                  >
                    {formData.certifications?.includes(cert) && <CheckCircle2 className="mr-1 h-3 w-3" />}
                    {cert}
                  </Badge>
                ))}
              </div>

              <Separator />

              <h3 className="font-medium">{t('Ratings')}</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t('Quality (1-5)')}</Label>
                  <Select value={formData.quality_rating ? String(formData.quality_rating) : 'none'} onValueChange={v => updateForm('quality_rating', v === 'none' ? undefined : parseInt(v))}>
                    <SelectTrigger><SelectValue placeholder={t('Rate')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('No Rating')}</SelectItem>
                      {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{t('{{count}} stars', { count: n })}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('Delivery Reliability (1-5)')}</Label>
                  <Select value={formData.delivery_rating ? String(formData.delivery_rating) : 'none'} onValueChange={v => updateForm('delivery_rating', v === 'none' ? undefined : parseInt(v))}>
                    <SelectTrigger><SelectValue placeholder={t('Rate')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('No Rating')}</SelectItem>
                      {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{t('{{count}} stars', { count: n })}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Finance */}
            <TabsContent value="finance" className="mt-4 space-y-4">
              <h3 className="font-medium">{t('Contract Data')}</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t('Contract Start')}</Label>
                  <Input type="date" value={formData.contract_start || ''} onChange={e => updateForm('contract_start', e.target.value)} />
                </div>
                <div>
                  <Label>{t('Contract End')}</Label>
                  <Input type="date" value={formData.contract_end || ''} onChange={e => updateForm('contract_end', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label>{t('Minimum Order Value')}</Label>
                  <Input type="number" value={formData.min_order_value || ''} onChange={e => updateForm('min_order_value', parseFloat(e.target.value) || undefined)} placeholder="0.00" />
                </div>
                <div>
                  <Label>{t('Currency')}</Label>
                  <Select value={formData.currency || 'EUR'} onValueChange={v => updateForm('currency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('Payment Terms')}</Label>
                  <Input value={formData.payment_terms || ''} onChange={e => updateForm('payment_terms', e.target.value)} placeholder="Net 30" />
                </div>
              </div>

              <Separator />

              <h3 className="font-medium">{t('Bank Details')}</h3>
              <div>
                <Label>{t('Bank')}</Label>
                <Input value={formData.bank_name || ''} onChange={e => updateForm('bank_name', e.target.value)} placeholder="Deutsche Bank" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t('IBAN')}</Label>
                  <Input value={formData.iban || ''} onChange={e => updateForm('iban', e.target.value)} placeholder="DE89 3704 0044 0532 0130 00" />
                </div>
                <div>
                  <Label>{t('BIC')}</Label>
                  <Input value={formData.bic || ''} onChange={e => updateForm('bic', e.target.value)} placeholder="COBADEFFXXX" />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />{t('Cancel', { ns: 'common' })}
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.name}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t('Save', { ns: 'common' })}
            </Button>
          </DialogFooter>
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
