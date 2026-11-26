/**
 * Supplier Registration - Step 4: Legal & Banking. Heading rendered by FormWizard.
 */

import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormGrid, FormField, OptionalDisclosure } from '@/components/ui/form-layout';
import type { SupplierRegistrationData } from '@/types/supplier-portal';

interface LegalBankingStepProps {
  form: UseFormReturn<SupplierRegistrationData>;
}

export function LegalBankingStep({ form }: LegalBankingStepProps) {
  const { t } = useTranslation('supplier-portal');
  const { register, formState: { errors }, watch } = form;
  const [registerNo, bankName, paymentTerms] = watch(['commercialRegisterNumber', 'bankName', 'paymentTerms']);

  // Basic IBAN validation (length and format)
  const validateIBAN = (value: string): boolean | string => {
    if (!value) return true; // Allow empty if not required
    // Remove spaces and convert to uppercase
    const iban = value.replace(/\s/g, '').toUpperCase();
    // Basic IBAN format check (2 letters + 2 digits + up to 30 alphanumeric)
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(iban)) {
      return t('Invalid IBAN format');
    }
    return true;
  };

  const idInput = 'font-mono uppercase placeholder:font-sans placeholder:normal-case';

  return (
    <>
      <FormGrid cols={6}>
        <FormField label={t('Tax Number')} htmlFor="taxNumber" required span={3} error={errors.taxNumber?.message}>
          <Input
            id="taxNumber"
            {...register('taxNumber', { required: t('This field is required') })}
            placeholder="123/456/78901"
            className="font-mono placeholder:font-sans"
          />
        </FormField>
        <FormField label={t('VAT Number')} htmlFor="vatNumber" required span={3} error={errors.vatNumber?.message}>
          <Input
            id="vatNumber"
            autoCapitalize="characters"
            spellCheck={false}
            {...register('vatNumber', { required: t('This field is required') })}
            placeholder="DE123456789"
            className={idInput}
          />
        </FormField>
        <FormField
          label={t('IBAN')}
          htmlFor="iban"
          required
          span={4}
          error={errors.iban?.message}
          hint={t('Spaces are fine, we ignore them.')}
        >
          <Input
            id="iban"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            {...register('iban', {
              required: t('This field is required'),
              validate: validateIBAN,
            })}
            placeholder="DE89 3704 0044 0532 0130 00"
            className={`${idInput} tracking-wide`}
          />
        </FormField>
        <FormField label={t('BIC/SWIFT')} htmlFor="bic" required span={2} error={errors.bic?.message}>
          <Input
            id="bic"
            autoCapitalize="characters"
            spellCheck={false}
            {...register('bic', { required: t('This field is required') })}
            placeholder="COBADEFFXXX"
            className={idInput}
          />
        </FormField>
      </FormGrid>

      <OptionalDisclosure
        description={[t('Commercial Register Number'), t('Bank Name'), t('Payment Terms')].join(', ')}
        filledCount={[registerNo, bankName, paymentTerms].filter(Boolean).length}
      >
        <FormGrid cols={2}>
          <FormField label={t('Commercial Register Number')} htmlFor="commercialRegisterNumber" optional>
            <Input id="commercialRegisterNumber" {...register('commercialRegisterNumber')} placeholder="HRB 12345" className="font-mono placeholder:font-sans" />
          </FormField>
          <FormField label={t('Bank Name')} htmlFor="bankName" optional>
            <Input id="bankName" {...register('bankName')} placeholder="Deutsche Bank" />
          </FormField>
          <FormField label={t('Payment Terms')} htmlFor="paymentTerms" span="full" hint={t('Optional: Specify your preferred payment terms')}>
            <Textarea
              id="paymentTerms"
              {...register('paymentTerms')}
              placeholder={t('e.g., Net 30 days, 2% discount if paid within 10 days')}
              rows={2}
            />
          </FormField>
        </FormGrid>
      </OptionalDisclosure>
    </>
  );
}
