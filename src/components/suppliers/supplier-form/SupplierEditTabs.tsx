/**
 * Edit mode of the supplier dialog: one tab per area, each a set of
 * FormSections. Only the active tab renders, so nothing scrolls deep.
 */
import { useTranslation } from 'react-i18next';
import {
  Plus, Pencil, Trash2, Check, Building2, Tags, StickyNote, UserRound, Users,
  MapPin, Truck, Scale, ShieldCheck, Award, Star, FileText, Landmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FormSections, FormSection, FormGrid, FormField, ChoiceCards, FormToggleRow, OptionalDisclosure,
} from '@/components/ui/form-layout';
import { cn } from '@/lib/utils';
import { CERTIFICATIONS } from '../supplier-helpers';
import type { SupplierFields, UpdateSupplierField } from './supplier-fields';
import type { Supplier, SupplierContact } from '@/types/database';

interface SupplierEditTabsProps {
  formData: Partial<Supplier>;
  updateForm: UpdateSupplierField;
  fields: SupplierFields;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onToggleCertification: (cert: string) => void;
  onAddContact: () => void;
  onEditContact: (contact: SupplierContact, index: number) => void;
  onDeleteContact: (index: number) => void;
}

export function SupplierEditTabs({
  formData, updateForm, fields: f, activeTab, onTabChange,
  onToggleCertification, onAddContact, onEditContact, onDeleteContact,
}: SupplierEditTabsProps) {
  const { t } = useTranslation('settings');
  const certifications = formData.certifications || [];
  const additionalContacts = formData.additional_contacts || [];

  const ratingSelect = (id: string, field: 'quality_rating' | 'delivery_rating') => (
    <Select
      value={formData[field] ? String(formData[field]) : 'none'}
      onValueChange={v => updateForm(field, v === 'none' ? undefined : parseInt(v))}
    >
      <SelectTrigger id={id} className="w-full"><SelectValue placeholder={t('Rate')} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{t('No Rating')}</SelectItem>
        {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{t('{{count}} stars', { count: n })}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="flex w-full overflow-x-auto">
        <TabsTrigger value="basic" className="flex-shrink-0">{t('General')}</TabsTrigger>
        <TabsTrigger value="contact" className="flex-shrink-0">{t('Contact')}</TabsTrigger>
        <TabsTrigger value="address" className="flex-shrink-0">{t('Addresses')}</TabsTrigger>
        <TabsTrigger value="compliance" className="flex-shrink-0">{t('Compliance')}</TabsTrigger>
        <TabsTrigger value="finance" className="flex-shrink-0">{t('Finance')}</TabsTrigger>
      </TabsList>

      {/* General */}
      <TabsContent value="basic" className="mt-6">
        <FormSections divided>
          <FormSection icon={Building2} title={t('Company')} description={t('Name, code and legal form as they appear in your records.')}>
            <FormGrid cols={6}>
              {f.name(4)}
              {f.code(2)}
              {f.legalForm(3)}
              {f.industry(3)}
            </FormGrid>
          </FormSection>

          <FormSection icon={Tags} title={t('Classification')} description={t('Type, status and risk drive filters and compliance checks.')}>
            {f.supplierType()}
            <FormGrid cols={2}>
              <FormField label={t('Status')} htmlFor="supplier-status">
                <Select value={formData.status || 'active'} onValueChange={v => updateForm('status', v)}>
                  <SelectTrigger id="supplier-status" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('Active')}</SelectItem>
                    <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                    <SelectItem value="blocked">{t('Blocked')}</SelectItem>
                    <SelectItem value="pending_approval">{t('Pending Approval')}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={t('Risk Level')} htmlFor="supplier-risk">
                <ChoiceCards
                  value={formData.risk_level || 'low'}
                  onValueChange={v => updateForm('risk_level', v)}
                  columns={3}
                  options={[
                    { value: 'low', label: t('Low') },
                    { value: 'medium', label: t('Medium') },
                    { value: 'high', label: t('High') },
                  ]}
                />
              </FormField>
            </FormGrid>
            <FormToggleRow htmlFor="supplier-verified" label={t('Verified')} description={t('Identity and master data have been checked.')}>
              <Switch
                id="supplier-verified"
                checked={formData.verified || false}
                onCheckedChange={v => updateForm('verified', v)}
                aria-describedby="supplier-verified-description"
              />
            </FormToggleRow>
          </FormSection>

          <FormSection icon={StickyNote} title={t('Notes')} description={t('Public notes appear on the supplier profile; internal notes stay with your team.')}>
            {f.notes()}
            {f.internalNotes()}
          </FormSection>
        </FormSections>
      </TabsContent>

      {/* Contact */}
      <TabsContent value="contact" className="mt-6">
        <FormSections divided>
          <FormSection icon={UserRound} title={t('Primary Contact')} description={t('The person you usually talk to.')}>
            <FormGrid cols={2}>
              {f.contactPerson()}
              {f.contactPosition()}
              {f.email('full')}
              {f.phone()}
              {f.mobile()}
            </FormGrid>
            <OptionalDisclosure description={[t('Fax'), t('Website'), t('LinkedIn')].join(', ')} filledCount={[formData.fax, formData.website, formData.linkedin].filter(Boolean).length}>
              <FormGrid cols={2}>
                {f.fax()}
                {f.website()}
                {f.linkedin('full')}
              </FormGrid>
            </OptionalDisclosure>
          </FormSection>

          <FormSection
            icon={Users}
            title={t('Additional Contacts')}
            description={t('Other people at this supplier, e.g. quality or logistics.')}
            aside={(
              <Button type="button" variant="outline" size="sm" onClick={onAddContact}>
                <Plus className="mr-1 h-4 w-4" />{t('Add')}
              </Button>
            )}
          >
            {additionalContacts.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                {t('No additional contacts')}
              </div>
            ) : (
              <ul className="divide-y rounded-lg border">
                {additionalContacts.map((contact, i) => (
                  <li key={i} className="flex items-center gap-3 p-3">
                    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {(contact.name || '?').trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{contact.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[contact.position, contact.department].filter(Boolean).join(' · ')}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[contact.email, contact.phone].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" variant="ghost" size="icon" aria-label={t('Edit Contact')} onClick={() => onEditContact(contact, i)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" aria-label={t('Delete', { ns: 'common' })} onClick={() => onDeleteContact(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </FormSection>
        </FormSections>
      </TabsContent>

      {/* Addresses */}
      <TabsContent value="address" className="mt-6">
        <FormSections divided>
          <FormSection icon={MapPin} title={t('Company Address')} description={t('Registered office used on documents.')}>
            <FormGrid cols={6}>
              {f.street()}
              {f.addressLine2()}
              {f.postalCode()}
              {f.city()}
              {f.state()}
              {f.country()}
            </FormGrid>
          </FormSection>
          <FormSection icon={Truck} title={t('Shipping Address (if different)')} description={t('Only needed if goods ship from another location.')}>
            <FormGrid cols={6}>
              {f.shippingStreet()}
              {f.shippingPostalCode()}
              {f.shippingCity()}
              {f.shippingCountry()}
            </FormGrid>
          </FormSection>
        </FormSections>
      </TabsContent>

      {/* Compliance */}
      <TabsContent value="compliance" className="mt-6">
        <FormSections divided>
          <FormSection icon={Scale} title={t('Legal Information')} description={t('Tax and registry identifiers for invoices and audits.')}>
            <FormGrid cols={2}>
              {f.taxId()}
              {f.vatId()}
              {f.duns()}
              {f.registration()}
            </FormGrid>
          </FormSection>

          <FormSection icon={ShieldCheck} title={t('Compliance & Audits')} description={t('Current status and audit schedule.')}>
            <FormField label={t('Compliance Status')} htmlFor="supplier-compliance-status">
              <ChoiceCards
                value={formData.compliance_status || 'pending'}
                onValueChange={v => updateForm('compliance_status', v)}
                columns={3}
                options={[
                  { value: 'compliant', label: t('Compliant') },
                  { value: 'pending', label: t('Review Pending') },
                  { value: 'non_compliant', label: t('Non-Compliant') },
                ]}
              />
            </FormField>
            <FormGrid cols={2}>
              <FormField label={t('Last Audit')} htmlFor="supplier-last-audit">
                <Input type="date" value={formData.audit_date || ''} onChange={e => updateForm('audit_date', e.target.value)} />
              </FormField>
              <FormField label={t('Next Audit')} htmlFor="supplier-next-audit">
                <Input type="date" value={formData.next_audit_date || ''} onChange={e => updateForm('next_audit_date', e.target.value)} />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection
            icon={Award}
            title={t('Certifications')}
            description={t('Select every certificate the supplier holds.')}
            aside={certifications.length > 0 ? (
              <span className="text-xs tabular-nums text-muted-foreground">{t('{{count}} selected', { count: certifications.length })}</span>
            ) : undefined}
          >
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('Certifications')}>
              {CERTIFICATIONS.map(cert => {
                const selected = certifications.includes(cert);
                return (
                  <button
                    key={cert}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onToggleCertification(cert)}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm outline-none pointer-coarse:h-11',
                      'transition-[background-color,border-color,color] duration-150 ease-out focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-muted'
                    )}
                  >
                    {selected && <Check aria-hidden="true" className="size-3.5" />}
                    {cert}
                  </button>
                );
              })}
            </div>
          </FormSection>

          <FormSection icon={Star} title={t('Ratings')} description={t("Your team's assessment from 1 to 5 stars.")}>
            <FormGrid cols={2}>
              <FormField label={t('Quality (1-5)')} htmlFor="supplier-quality-rating">
                {ratingSelect('supplier-quality-rating', 'quality_rating')}
              </FormField>
              <FormField label={t('Delivery Reliability (1-5)')} htmlFor="supplier-delivery-rating">
                {ratingSelect('supplier-delivery-rating', 'delivery_rating')}
              </FormField>
            </FormGrid>
          </FormSection>
        </FormSections>
      </TabsContent>

      {/* Finance */}
      <TabsContent value="finance" className="mt-6">
        <FormSections divided>
          <FormSection icon={FileText} title={t('Contract Data')} description={t('Term, minimum order and payment terms.')}>
            <FormGrid cols={2}>
              {f.contractStart()}
              {f.contractEnd()}
              {f.minOrderValue()}
              {f.currency()}
              {f.paymentTerms('full')}
            </FormGrid>
          </FormSection>
          <FormSection icon={Landmark} title={t('Bank Details')} description={t('Used for payments to this supplier.')}>
            <FormGrid cols={6}>
              {f.bankName()}
              {f.iban()}
              {f.bic()}
            </FormGrid>
          </FormSection>
        </FormSections>
      </TabsContent>
    </Tabs>
  );
}
