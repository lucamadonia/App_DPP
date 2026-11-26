/**
 * Contact form field groups, shared by the create wizard (ContactsListPage)
 * and the edit dialogs (ContactsListPage, ContactDetailPage).
 *
 * Each group renders only fields; callers decide whether a group becomes a
 * wizard step or a FormSection. `ContactFormSections` composes all groups
 * as a calm edit form, one section at a time.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, Building2, Factory, Mail, MapPin, MoreHorizontal, Sparkles, User, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ChoiceCards, FormField, FormGrid, FormSectionNav, type ChoiceOption, type FormNavSection,
} from '@/components/ui/form-layout';
import { FormWizard } from '@/components/ui/form-wizard';
import { InfluencerFields } from '@/components/warehouse/InfluencerFields';
import type { WhContactInput, WhContactType } from '@/types/warehouse';

export interface ContactFieldsProps {
  form: Partial<WhContactInput>;
  onChange: (updates: Partial<WhContactInput>) => void;
}

export function useContactTypeOptions(): ChoiceOption<WhContactType>[] {
  const { t } = useTranslation('warehouse');
  return [
    { value: 'b2b', label: t('B2B'), icon: Building2 },
    { value: 'b2c', label: t('B2C'), icon: User },
    { value: 'supplier', label: t('Supplier'), icon: Factory },
    { value: 'influencer', label: t('Influencer'), icon: Sparkles },
    { value: 'other', label: t('Other'), icon: MoreHorizontal },
  ];
}

/** Contact type, name and company. */
export function ContactIdentityFields({ form, onChange }: ContactFieldsProps) {
  const { t } = useTranslation('warehouse');
  const typeOptions = useContactTypeOptions();
  return (
    <FormGrid cols={2}>
      <FormField label={t('Contact Type')} span="full">
        <ChoiceCards
          value={form.type || 'b2b'}
          onValueChange={(v) => onChange({ type: v })}
          options={typeOptions}
          columns={2}
        />
      </FormField>
      <FormField label={t('Contact Name')} required>
        <Input
          value={form.contactName || ''}
          autoComplete="name"
          onChange={(e) => onChange({ contactName: e.target.value })}
        />
      </FormField>
      <FormField label={t('Company')} optional>
        <Input
          value={form.companyName || ''}
          autoComplete="organization"
          onChange={(e) => onChange({ companyName: e.target.value })}
        />
      </FormField>
    </FormGrid>
  );
}

/** Email and phone. */
export function ContactChannelFields({ form, onChange }: ContactFieldsProps) {
  const { t } = useTranslation('warehouse');
  return (
    <FormGrid cols={2}>
      <FormField label={t('Email')} optional>
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={form.email || ''}
          onChange={(e) => onChange({ email: e.target.value })}
        />
      </FormField>
      <FormField label={t('Phone')} optional>
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={form.phone || ''}
          onChange={(e) => onChange({ phone: e.target.value })}
        />
      </FormField>
    </FormGrid>
  );
}

/** Street, postal code, city, country. */
export function ContactAddressFields({ form, onChange }: ContactFieldsProps) {
  const { t } = useTranslation('warehouse');
  return (
    <FormGrid cols={6}>
      <FormField label={t('Street')} span="full">
        <Input
          autoComplete="street-address"
          value={form.street || ''}
          onChange={(e) => onChange({ street: e.target.value })}
        />
      </FormField>
      <FormField label={t('Postal Code')} span={2}>
        <Input
          autoComplete="postal-code"
          value={form.postalCode || ''}
          onChange={(e) => onChange({ postalCode: e.target.value })}
        />
      </FormField>
      <FormField label={t('City')} span={4}>
        <Input
          autoComplete="address-level2"
          value={form.city || ''}
          onChange={(e) => onChange({ city: e.target.value })}
        />
      </FormField>
      <FormField label={t('Country')} span="full">
        <Input
          autoComplete="country-name"
          value={form.country || ''}
          onChange={(e) => onChange({ country: e.target.value })}
        />
      </FormField>
    </FormGrid>
  );
}

/** Customer number, VAT ID and notes. */
export function ContactBusinessFields({
  form,
  onChange,
  notesRows = 2,
}: ContactFieldsProps & { notesRows?: number }) {
  const { t } = useTranslation('warehouse');
  return (
    <FormGrid cols={2}>
      <FormField label={t('Customer Number')} optional>
        <Input
          value={form.customerNumber || ''}
          onChange={(e) => onChange({ customerNumber: e.target.value })}
        />
      </FormField>
      <FormField label={t('VAT ID')} optional>
        <Input
          value={form.vatId || ''}
          onChange={(e) => onChange({ vatId: e.target.value })}
        />
      </FormField>
      <FormField label={t('Notes')} optional span="full">
        <Textarea
          value={form.notes || ''}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={notesRows}
        />
      </FormField>
    </FormGrid>
  );
}

/**
 * All groups as an edit form. Renders one section at a time via
 * FormSectionNav so the dialog never scrolls deep.
 */
export function ContactFormSections({ form, onChange, notesRows }: ContactFieldsProps & { notesRows?: number }) {
  const { t } = useTranslation('warehouse');
  const [section, setSection] = useState('details');
  const isInfluencer = form.type === 'influencer';
  const sections: FormNavSection[] = [
    { id: 'details', label: t('Contact Details'), icon: User },
    { id: 'address', label: t('Address'), icon: MapPin },
    ...(isInfluencer ? [{ id: 'social', label: t('Social Media Profiles'), icon: Sparkles }] : []),
    { id: 'business', label: t('Business Information'), icon: Briefcase },
  ];
  // Fall back to the first section when the social tab disappears.
  const active = sections.some((s) => s.id === section) ? section : 'details';

  return (
    <FormSectionNav sections={sections} value={active} onValueChange={setSection}>
      {active === 'details' && (
        <div className="space-y-5">
          <ContactIdentityFields form={form} onChange={onChange} />
          <ContactChannelFields form={form} onChange={onChange} />
        </div>
      )}
      {active === 'address' && <ContactAddressFields form={form} onChange={onChange} />}
      {active === 'social' && <InfluencerFields form={form} onChange={onChange} />}
      {active === 'business' && <ContactBusinessFields form={form} onChange={onChange} notesRows={notesRows} />}
    </FormSectionNav>
  );
}

/**
 * Create flow: short wizard steps that each fit one phone screen.
 * Influencer steps only appear when the type is "influencer".
 */
export function ContactCreateWizard({
  form,
  onChange,
  onCancel,
  onFinish,
  finishing,
}: ContactFieldsProps & {
  onCancel: () => void;
  onFinish: () => void | Promise<void>;
  finishing?: boolean;
}) {
  const { t } = useTranslation('warehouse');
  const isInfluencer = form.type === 'influencer';
  return (
    <FormWizard
      variant="dialog"
      onCancel={onCancel}
      onFinish={onFinish}
      finishing={finishing}
      finishLabel={t('Add Contact')}
      steps={[
        {
          id: 'who',
          title: t('Who is this contact?'),
          shortTitle: t('Type'),
          icon: User,
          canNext: Boolean(form.contactName?.trim()),
          content: <ContactIdentityFields form={form} onChange={onChange} />,
        },
        {
          id: 'reach',
          title: t('How do you reach them?'),
          shortTitle: t('Contact'),
          icon: Mail,
          content: <ContactChannelFields form={form} onChange={onChange} />,
        },
        {
          id: 'address',
          title: t('Address'),
          shortTitle: t('Address'),
          icon: MapPin,
          content: <ContactAddressFields form={form} onChange={onChange} />,
        },
        {
          id: 'social',
          title: t('Social Media Profiles'),
          shortTitle: t('Social'),
          icon: Sparkles,
          when: isInfluencer,
          content: <InfluencerFields form={form} onChange={onChange} part="handles" />,
        },
        {
          id: 'audience',
          title: t('Audience & reach'),
          shortTitle: t('Audience'),
          icon: Users,
          when: isInfluencer,
          content: <InfluencerFields form={form} onChange={onChange} part="audience" />,
        },
        {
          id: 'business',
          title: t('Business Information'),
          shortTitle: t('Business'),
          description: t('All optional — you can add this later.'),
          icon: Briefcase,
          content: <ContactBusinessFields form={form} onChange={onChange} />,
        },
      ]}
    />
  );
}
