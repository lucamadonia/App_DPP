/**
 * Supplier Registration - Step 5: Business details, Step 6: Review & terms.
 * Headings rendered by FormWizard; review "Edit" buttons jump via FormWizard.
 */

import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Building2, Factory, Truck, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField, ChoiceCards, FormToggleRow, OptionalDisclosure } from '@/components/ui/form-layout';
import { WizardReview, ReviewSection, ReviewRow } from '@/components/ui/form-wizard';
import type { SupplierRegistrationData } from '@/types/supplier-portal';

interface StepProps {
  form: UseFormReturn<SupplierRegistrationData>;
}

const SUPPLIER_TYPES = [
  { value: 'manufacturer', label: 'Manufacturer', hint: 'Produces the goods itself', icon: Factory },
  { value: 'wholesaler', label: 'Wholesaler', hint: 'Buys and resells in bulk', icon: Building2 },
  { value: 'distributor', label: 'Distributor', hint: 'Distributes on behalf of brands', icon: Truck },
  { value: 'service_provider', label: 'Service Provider', hint: 'Provides services, not goods', icon: Users },
] as const;

type SupplierType = NonNullable<SupplierRegistrationData['supplierType']>;

export function BusinessDetailsStep({ form }: StepProps) {
  const { t } = useTranslation('supplier-portal');
  const { register, setValue, watch } = form;

  const supplierType = watch('supplierType');
  const [productCategories, certifications, notes] = watch(['productCategories', 'certifications', 'notes']);

  return (
    <>
      <FormField label={t('Supplier Type')} htmlFor="supplierType">
        <ChoiceCards<SupplierType>
          value={supplierType || ''}
          onValueChange={(value) => setValue('supplierType', value)}
          columns={2}
          options={SUPPLIER_TYPES.map((type) => ({
            value: type.value,
            label: t(type.label),
            description: t(type.hint),
            icon: type.icon,
          }))}
        />
      </FormField>

      <FormField label={t('Industry')} htmlFor="industry" optional>
        <Input id="industry" {...register('industry')} placeholder={t('e.g., Electronics, Textiles, Food & Beverage')} />
      </FormField>

      <OptionalDisclosure
        description={[t('Product Categories'), t('Certifications'), t('Additional Notes')].join(', ')}
        filledCount={[productCategories, certifications, notes].filter(Boolean).length}
      >
        <FormField label={t('Product Categories')} htmlFor="productCategories" optional hint={t('List the main product categories you supply')}>
          <Textarea id="productCategories" {...register('productCategories')} placeholder={t('e.g., Smartphones, Laptops, Accessories')} rows={2} />
        </FormField>
        <FormField label={t('Certifications')} htmlFor="certifications" optional hint={t('List any relevant certifications your company holds')}>
          <Textarea id="certifications" {...register('certifications')} placeholder={t('e.g., ISO 9001, ISO 14001, CE, RoHS')} rows={2} />
        </FormField>
        <FormField label={t('Additional Notes')} htmlFor="notes" optional>
          <Textarea id="notes" {...register('notes')} placeholder={t('Any additional information you would like to share')} rows={3} />
        </FormField>
      </OptionalDisclosure>
    </>
  );
}

export function RegistrationReviewStep({ form }: StepProps) {
  const { t } = useTranslation('supplier-portal');
  const { formState: { errors }, setValue, watch } = form;
  const termsAccepted = watch('termsAccepted');
  const v = watch();
  const typeLabel = SUPPLIER_TYPES.find(s => s.value === v.supplierType)?.label;

  return (
    <>
      <WizardReview>
        <ReviewSection title={t('Company Basics')} step="company" editLabel={t('Edit')}>
          <ReviewRow label={t('Company Name')}>{v.companyName}</ReviewRow>
          {v.legalForm && <ReviewRow label={t('Legal Form')}>{t(v.legalForm)}</ReviewRow>}
          <ReviewRow label={t('Contact Person')}>{v.contactName}</ReviewRow>
          <ReviewRow label={t('Email')}>{v.email}</ReviewRow>
          {v.phone && <ReviewRow label={t('Phone')}>{v.phone}</ReviewRow>}
        </ReviewSection>

        <ReviewSection title={t('Address Information')} step="address" editLabel={t('Edit')}>
          <ReviewRow label={t('Address')}>
            {v.street}<br />
            {v.addressLine2 && <>{v.addressLine2}<br /></>}
            {v.postalCode} {v.city}<br />
            {v.state && <>{v.state}<br /></>}
            {v.country}
          </ReviewRow>
          {v.shippingAddressDifferent && (
            <ReviewRow label={t('Shipping Address')}>
              {v.shippingStreet}<br />
              {v.shippingAddressLine2 && <>{v.shippingAddressLine2}<br /></>}
              {v.shippingPostalCode} {v.shippingCity}<br />
              {v.shippingState && <>{v.shippingState}<br /></>}
              {v.shippingCountry}
            </ReviewRow>
          )}
        </ReviewSection>

        <ReviewSection title={t('Legal & Banking Information')} step="legal" editLabel={t('Edit')}>
          <ReviewRow label={t('Tax Number')}>{v.taxNumber}</ReviewRow>
          <ReviewRow label={t('VAT Number')}>{v.vatNumber}</ReviewRow>
          {v.commercialRegisterNumber && <ReviewRow label={t('Commercial Register Number')}>{v.commercialRegisterNumber}</ReviewRow>}
          <ReviewRow label={t('IBAN')}>{v.iban && <span className="font-mono">{v.iban}</span>}</ReviewRow>
          <ReviewRow label={t('BIC/SWIFT')}>{v.bic && <span className="font-mono">{v.bic}</span>}</ReviewRow>
        </ReviewSection>

        {(typeLabel || v.industry) && (
          <ReviewSection title={t('Business Details')} step="business" editLabel={t('Edit')}>
            {typeLabel && <ReviewRow label={t('Supplier Type')}>{t(typeLabel)}</ReviewRow>}
            {v.industry && <ReviewRow label={t('Industry')}>{v.industry}</ReviewRow>}
          </ReviewSection>
        )}
      </WizardReview>

      <div>
        <FormToggleRow
          htmlFor="termsAccepted"
          controlPosition="start"
          label={(
            <>
              {t('I accept the terms and conditions')}
              <span aria-hidden="true" className="ml-1.5 inline-block size-1.5 rounded-full bg-destructive align-middle" />
            </>
          )}
          description={t('By checking this box, you confirm that all information provided is accurate and complete')}
          className={errors.termsAccepted ? 'border-destructive' : undefined}
        >
          <Checkbox
            id="termsAccepted"
            checked={termsAccepted || false}
            aria-required="true"
            aria-invalid={errors.termsAccepted ? true : undefined}
            aria-describedby="termsAccepted-description"
            onCheckedChange={(checked) =>
              setValue('termsAccepted', checked === true, { shouldValidate: true })
            }
          />
        </FormToggleRow>
        {errors.termsAccepted && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">{errors.termsAccepted.message}</p>
        )}
      </div>
    </>
  );
}
