/**
 * Single source for every supplier form field. The create wizard and the
 * edit tabs compose these renderers, so a field looks and behaves the same
 * everywhere. Each renderer takes an optional grid span.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Linkedin, Mail, Phone, Printer, Smartphone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FormField, InputAffix, ChoiceCards, type FormFieldSpan } from '@/components/ui/form-layout';
import { SUPPLIER_TYPES, LEGAL_FORMS, CURRENCIES } from '../supplier-helpers';
import type { Supplier, Country } from '@/types/database';

export type UpdateSupplierField = (field: string, value: unknown) => void;

export const SUPPLIER_TYPE_HINTS: Record<string, string> = {
  manufacturer: 'Produces the goods itself',
  wholesaler: 'Buys and resells in bulk',
  distributor: 'Distributes on behalf of brands',
  service_provider: 'Provides services, not goods',
};

const ID_CLASS = 'font-mono uppercase placeholder:font-sans placeholder:normal-case';
const icon = (Icon: typeof Mail) => <Icon className="size-4" />;

interface Options {
  formData: Partial<Supplier>;
  updateForm: UpdateSupplierField;
  countries: Country[];
  errors?: Partial<Record<keyof Supplier, string>>;
}

export function useSupplierFields({ formData, updateForm, countries, errors = {} }: Options) {
  const { t } = useTranslation('settings');
  const text = (
    field: keyof Supplier,
    label: string,
    opts: { span?: FormFieldSpan; placeholder?: string; optional?: boolean; required?: boolean; hint?: string; className?: string; type?: string; inputMode?: 'email' | 'tel' | 'url' | 'numeric' | 'decimal'; autoComplete?: string; prefix?: ReactNode } = {}
  ) => {
    const input = (
      <Input
        type={opts.type}
        inputMode={opts.inputMode}
        autoComplete={opts.autoComplete}
        value={(formData[field] as string | undefined) || ''}
        onChange={e => updateForm(field, e.target.value)}
        placeholder={opts.placeholder}
        className={opts.className}
        spellCheck={opts.className?.includes('font-mono') ? false : undefined}
      />
    );
    return (
      <FormField
        key={field}
        label={label}
        htmlFor={`supplier-${field}`}
        span={opts.span}
        optional={opts.optional}
        required={opts.required}
        hint={opts.hint}
        error={errors[field]}
      >
        {opts.prefix ? <InputAffix prefix={opts.prefix}>{input}</InputAffix> : input}
      </FormField>
    );
  };

  const select = (
    field: keyof Supplier,
    label: string,
    items: { value: string; label: string }[],
    opts: { span?: FormFieldSpan; fallback?: string; placeholder?: string; optional?: boolean } = {}
  ) => (
    <FormField key={field} label={label} htmlFor={`supplier-${field}`} span={opts.span} optional={opts.optional}>
      <Select value={(formData[field] as string | undefined) || opts.fallback || ''} onValueChange={v => updateForm(field, v)}>
        <SelectTrigger id={`supplier-${field}`} className="w-full">
          <SelectValue placeholder={opts.placeholder ?? t('Select')} />
        </SelectTrigger>
        <SelectContent>
          {items.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </FormField>
  );

  const countryItems = countries.map(c => ({ value: c.code, label: c.name }));

  return {
    // Company
    name: (span?: FormFieldSpan) => text('name', t('Company Name'), { span, required: true, placeholder: t('Company Name'), autoComplete: 'organization' }),
    code: (span?: FormFieldSpan) => text('code', t('Code'), { span, optional: true, placeholder: 'SUP001', className: 'font-mono placeholder:font-sans' }),
    legalForm: (span?: FormFieldSpan) => select('legal_form', t('Legal Form'), LEGAL_FORMS.map(f => ({ value: f, label: f })), { span }),
    industry: (span?: FormFieldSpan) => text('industry', t('Industry'), { span, optional: true, placeholder: t('e.g. Electronics') }),
    supplierType: (span: FormFieldSpan = 'full') => (
      <FormField key="supplier_type" label={t('Supplier Type')} htmlFor="supplier-type" span={span}>
        <ChoiceCards
          value={formData.supplier_type || ''}
          onValueChange={v => updateForm('supplier_type', v)}
          columns={2}
          options={SUPPLIER_TYPES.map(st => ({
            value: st.value,
            label: t(st.labelKey),
            description: t(SUPPLIER_TYPE_HINTS[st.value]),
            icon: st.icon,
          }))}
        />
      </FormField>
    ),
    notes: (span?: FormFieldSpan) => (
      <FormField key="notes" label={t('Notes')} htmlFor="supplier-notes" optional span={span}>
        <Textarea rows={3} value={formData.notes || ''} onChange={e => updateForm('notes', e.target.value)} placeholder={t('Public notes...')} />
      </FormField>
    ),
    internalNotes: (span?: FormFieldSpan) => (
      <FormField key="internal_notes" label={t('Internal Notes')} htmlFor="supplier-internal-notes" optional span={span} hint={t('Only visible to your team')}>
        <Textarea rows={3} value={formData.internal_notes || ''} onChange={e => updateForm('internal_notes', e.target.value)} placeholder={t('Internal use only...')} />
      </FormField>
    ),

    // Contact
    contactPerson: (span?: FormFieldSpan) => text('contact_person', t('Name'), { span, placeholder: 'John Doe', autoComplete: 'name' }),
    contactPosition: (span?: FormFieldSpan) => text('contact_position', t('Position'), { span, optional: true, placeholder: 'Sales Manager' }),
    email: (span?: FormFieldSpan) => text('email', t('Email'), { span, type: 'email', inputMode: 'email', autoComplete: 'email', placeholder: 'contact@company.com', prefix: icon(Mail) }),
    phone: (span?: FormFieldSpan) => text('phone', t('Phone'), { span, type: 'tel', autoComplete: 'tel', placeholder: '+49 123 456789', prefix: icon(Phone) }),
    mobile: (span?: FormFieldSpan) => text('mobile', t('Mobile'), { span, optional: true, type: 'tel', placeholder: '+49 170 1234567', prefix: icon(Smartphone) }),
    fax: (span?: FormFieldSpan) => text('fax', t('Fax'), { span, optional: true, type: 'tel', placeholder: '+49 123 456789', prefix: icon(Printer) }),
    website: (span?: FormFieldSpan) => text('website', t('Website'), { span, optional: true, type: 'url', inputMode: 'url', placeholder: 'https://www.company.com', prefix: icon(Globe) }),
    linkedin: (span?: FormFieldSpan) => text('linkedin', t('LinkedIn'), { span, optional: true, type: 'url', inputMode: 'url', placeholder: 'https://linkedin.com/company/...', prefix: icon(Linkedin) }),

    // Address
    street: (span: FormFieldSpan = 'full') => text('address', t('Street'), { span, placeholder: '123 Main Street', autoComplete: 'address-line1' }),
    addressLine2: (span: FormFieldSpan = 'full') => text('address_line2', t('Address Line 2'), { span, optional: true, placeholder: 'Building B, 3rd Floor', autoComplete: 'address-line2' }),
    postalCode: (span: FormFieldSpan = 2) => text('postal_code', t('ZIP/Postal Code'), { span, placeholder: '12345', autoComplete: 'postal-code' }),
    city: (span: FormFieldSpan = 4) => text('city', t('City'), { span, placeholder: 'Berlin', autoComplete: 'address-level2' }),
    state: (span: FormFieldSpan = 3) => text('state', t('State/Province'), { span, optional: true, placeholder: 'Berlin', autoComplete: 'address-level1' }),
    country: (span: FormFieldSpan = 3) => select('country', t('Country'), countryItems, { span, fallback: 'DE' }),
    shippingStreet: (span: FormFieldSpan = 'full') => text('shipping_address', t('Street'), { span }),
    shippingPostalCode: (span: FormFieldSpan = 2) => text('shipping_postal_code', t('ZIP/Postal Code'), { span }),
    shippingCity: (span: FormFieldSpan = 4) => text('shipping_city', t('City'), { span }),
    shippingCountry: (span: FormFieldSpan = 'full') => select('shipping_country', t('Country'), countryItems, { span }),

    // Legal
    taxId: (span?: FormFieldSpan) => text('tax_id', t('Tax ID'), { span, placeholder: '123/456/78901', className: 'font-mono placeholder:font-sans' }),
    vatId: (span?: FormFieldSpan) => text('vat_id', t('VAT ID'), { span, placeholder: 'DE123456789', className: ID_CLASS }),
    duns: (span?: FormFieldSpan) => text('duns_number', t('D-U-N-S Number'), { span, optional: true, inputMode: 'numeric', placeholder: '12-345-6789', className: 'font-mono placeholder:font-sans' }),
    registration: (span?: FormFieldSpan) => text('registration_number', t('Registration No.'), { span, optional: true, placeholder: 'HRB 12345', className: 'font-mono placeholder:font-sans' }),

    // Finance
    bankName: (span: FormFieldSpan = 'full') => text('bank_name', t('Bank'), { span, optional: true, placeholder: 'Deutsche Bank' }),
    iban: (span: FormFieldSpan = 4) => text('iban', t('IBAN'), { span, placeholder: 'DE89 3704 0044 0532 0130 00', hint: t('Starts with the country code, e.g. DE89 …'), className: `${ID_CLASS} tracking-wide` }),
    bic: (span: FormFieldSpan = 2) => text('bic', t('BIC'), { span, placeholder: 'COBADEFFXXX', className: ID_CLASS }),
    paymentTerms: (span?: FormFieldSpan) => text('payment_terms', t('Payment Terms'), { span, optional: true, placeholder: 'Net 30' }),
    currency: (span?: FormFieldSpan) => select('currency', t('Currency'), CURRENCIES.map(c => ({ value: c, label: c })), { span, fallback: 'EUR' }),
    minOrderValue: (span?: FormFieldSpan) => (
      <FormField key="min_order_value" label={t('Minimum Order Value')} htmlFor="supplier-min-order" span={span} optional>
        <InputAffix suffix={formData.currency || 'EUR'}>
          <Input type="number" inputMode="decimal" value={formData.min_order_value || ''} onChange={e => updateForm('min_order_value', parseFloat(e.target.value) || undefined)} placeholder="0.00" className="tabular-nums" />
        </InputAffix>
      </FormField>
    ),
    contractStart: (span?: FormFieldSpan) => text('contract_start', t('Contract Start'), { span, type: 'date' }),
    contractEnd: (span?: FormFieldSpan) => text('contract_end', t('Contract End'), { span, type: 'date' }),
  };
}

export type SupplierFields = ReturnType<typeof useSupplierFields>;
