/**
 * Create mode of the supplier dialog: a 5-step wizard
 * (Company → Contact → Address → Legal & Bank → Review). Each step shows at
 * most ~4 fields; rarely used ones sit in an OptionalDisclosure so every
 * step fits a phone screen. Status, compliance, ratings and contract data
 * are maintained later in edit mode.
 */
import type { TFunction } from 'i18next';
import { Building2, ClipboardCheck, Landmark, MapPin, UserRound } from 'lucide-react';
import { FormGrid, OptionalDisclosure } from '@/components/ui/form-layout';
import { WizardReview, ReviewSection, ReviewRow, type WizardStep } from '@/components/ui/form-wizard';
import { SUPPLIER_TYPES } from '../supplier-helpers';
import type { SupplierFields } from './supplier-fields';
import type { Supplier, Country } from '@/types/database';

interface BuildOptions {
  t: TFunction;
  formData: Partial<Supplier>;
  fields: SupplierFields;
  countries: Country[];
  /** Validates the company step (name required). */
  validateCompany: () => boolean;
}

const filled = (...values: unknown[]) => values.filter(v => v !== undefined && v !== null && v !== '').length;

export function buildSupplierCreateSteps({ t, formData: d, fields: f, countries, validateCompany }: BuildOptions): WizardStep[] {
  const countryName = (code?: string) => countries.find(c => c.code === code)?.name ?? code;
  const typeLabel = SUPPLIER_TYPES.find(s => s.value === d.supplier_type)?.labelKey;

  return [
    {
      id: 'company',
      title: t('Company'),
      description: t('Name, code and legal form as they appear in your records.'),
      icon: Building2,
      validate: validateCompany,
      content: (
        <>
          <FormGrid cols={2}>
            {f.name()}
            {f.legalForm()}
          </FormGrid>
          {f.supplierType()}
          <OptionalDisclosure description={[t('Industry'), t('Code')].join(', ')} filledCount={filled(d.industry, d.code)}>
            <FormGrid cols={2}>
              {f.industry()}
              {f.code()}
            </FormGrid>
          </OptionalDisclosure>
        </>
      ),
    },
    {
      id: 'contact',
      title: t('Primary Contact'),
      shortTitle: t('Contact'),
      description: t('The person you usually talk to.'),
      icon: UserRound,
      content: (
        <>
          <FormGrid cols={2}>
            {f.contactPerson()}
            {f.contactPosition()}
            {f.email()}
            {f.phone()}
          </FormGrid>
          <OptionalDisclosure
            description={[t('Mobile'), t('Fax'), t('Website'), t('LinkedIn')].join(', ')}
            filledCount={filled(d.mobile, d.fax, d.website, d.linkedin)}
          >
            <FormGrid cols={2}>
              {f.mobile()}
              {f.fax()}
              {f.website()}
              {f.linkedin()}
            </FormGrid>
          </OptionalDisclosure>
        </>
      ),
    },
    {
      id: 'address',
      title: t('Company Address'),
      shortTitle: t('Address'),
      description: t('Registered office used on documents.'),
      icon: MapPin,
      content: (
        <>
          <FormGrid cols={6}>
            {f.street()}
            {f.postalCode()}
            {f.city()}
            {f.country('full')}
          </FormGrid>
          <OptionalDisclosure
            description={[t('Address Line 2'), t('State/Province'), t('Shipping Address (if different)')].join(', ')}
            filledCount={filled(d.address_line2, d.state, d.shipping_address, d.shipping_city)}
          >
            <FormGrid cols={6}>
              {f.addressLine2()}
              {f.state('full')}
            </FormGrid>
            <p className="text-sm font-medium">{t('Shipping Address (if different)')}</p>
            <FormGrid cols={6}>
              {f.shippingStreet()}
              {f.shippingPostalCode()}
              {f.shippingCity()}
              {f.shippingCountry()}
            </FormGrid>
          </OptionalDisclosure>
        </>
      ),
    },
    {
      id: 'legal',
      title: t('Legal & Bank'),
      description: t('Tax and registry identifiers for invoices and audits.'),
      icon: Landmark,
      content: (
        <>
          <FormGrid cols={6}>
            {f.vatId(3)}
            {f.taxId(3)}
            {f.iban()}
            {f.bic()}
          </FormGrid>
          <OptionalDisclosure
            description={[t('Bank'), t('D-U-N-S Number'), t('Registration No.'), t('Payment Terms')].join(', ')}
            filledCount={filled(d.bank_name, d.duns_number, d.registration_number)}
          >
            <FormGrid cols={2}>
              {f.bankName()}
              {f.duns()}
              {f.registration()}
              {f.paymentTerms()}
              {f.currency()}
            </FormGrid>
          </OptionalDisclosure>
        </>
      ),
    },
    {
      id: 'review',
      title: t('Review'),
      description: t('Check the details. Status, compliance and contracts can be added after creating.'),
      icon: ClipboardCheck,
      content: (
        <WizardReview>
          <ReviewSection title={t('Company')} step="company">
            <ReviewRow label={t('Company Name')}>{d.name}</ReviewRow>
            <ReviewRow label={t('Legal Form')}>{d.legal_form}</ReviewRow>
            <ReviewRow label={t('Supplier Type')}>{typeLabel ? t(typeLabel) : ''}</ReviewRow>
            {d.industry && <ReviewRow label={t('Industry')}>{d.industry}</ReviewRow>}
          </ReviewSection>
          <ReviewSection title={t('Contact')} step="contact">
            <ReviewRow label={t('Name')}>{d.contact_person}</ReviewRow>
            <ReviewRow label={t('Email')}>{d.email}</ReviewRow>
            {d.phone && <ReviewRow label={t('Phone')}>{d.phone}</ReviewRow>}
          </ReviewSection>
          <ReviewSection title={t('Address')} step="address">
            <ReviewRow label={t('Company Address')}>
              {d.address || d.city ? (
                <>
                  {d.address}{d.address && <br />}
                  {[d.postal_code, d.city].filter(Boolean).join(' ')}<br />
                  {countryName(d.country)}
                </>
              ) : ''}
            </ReviewRow>
          </ReviewSection>
          <ReviewSection title={t('Legal & Bank')} step="legal">
            <ReviewRow label={t('VAT ID')}>{d.vat_id}</ReviewRow>
            <ReviewRow label={t('IBAN')}>{d.iban ? <span className="font-mono">{d.iban}</span> : ''}</ReviewRow>
            {d.bic && <ReviewRow label={t('BIC')}><span className="font-mono">{d.bic}</span></ReviewRow>}
          </ReviewSection>
        </WizardReview>
      ),
    },
  ];
}
