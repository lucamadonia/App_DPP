/**
 * Supplier Registration - Step 3: Legal & Banking
 */

import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SupplierRegistrationData } from '@/types/supplier-portal';

interface LegalBankingStepProps {
  form: UseFormReturn<SupplierRegistrationData>;
}

export function LegalBankingStep({ form }: LegalBankingStepProps) {
  const { t } = useTranslation('supplier-portal');
  const { register, formState: { errors } } = form;

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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('Legal & Banking Information')}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('Please provide your legal and banking details')}
        </p>
      </div>

      {/* Legal Information */}
      <div className="space-y-4">
        <h4 className="font-medium">{t('Legal Information')}</h4>

        {/* Tax Number */}
        <div>
          <Label htmlFor="taxNumber">
            {t('Tax Number')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="taxNumber"
            {...register('taxNumber', { required: t('This field is required') })}
            placeholder="123/456/78901"
          />
          {errors.taxNumber && (
            <p className="text-sm text-destructive mt-1">{errors.taxNumber.message}</p>
          )}
        </div>

        {/* VAT Number */}
        <div>
          <Label htmlFor="vatNumber">
            {t('VAT Number')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="vatNumber"
            {...register('vatNumber', { required: t('This field is required') })}
            placeholder="DE123456789"
          />
          {errors.vatNumber && (
            <p className="text-sm text-destructive mt-1">{errors.vatNumber.message}</p>
          )}
        </div>

        {/* Commercial Register Number */}
        <div>
          <Label htmlFor="commercialRegisterNumber">{t('Commercial Register Number')}</Label>
          <Input
            id="commercialRegisterNumber"
            {...register('commercialRegisterNumber')}
            placeholder="HRB 12345"
          />
        </div>
      </div>

      {/* Banking Information */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium">{t('Banking Information')}</h4>

        {/* Bank Name */}
        <div>
          <Label htmlFor="bankName">{t('Bank Name')}</Label>
          <Input
            id="bankName"
            {...register('bankName')}
            placeholder="Deutsche Bank"
          />
        </div>

        {/* IBAN */}
        <div>
          <Label htmlFor="iban">
            {t('IBAN')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="iban"
            {...register('iban', {
              required: t('This field is required'),
              validate: validateIBAN,
            })}
            placeholder="DE89 3704 0044 0532 0130 00"
          />
          {errors.iban && (
            <p className="text-sm text-destructive mt-1">{errors.iban.message}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {t('International Bank Account Number')}
          </p>
        </div>

        {/* BIC */}
        <div>
          <Label htmlFor="bic">
            {t('BIC/SWIFT')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="bic"
            {...register('bic', { required: t('This field is required') })}
            placeholder="COBADEFFXXX"
          />
          {errors.bic && (
            <p className="text-sm text-destructive mt-1">{errors.bic.message}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {t('Bank Identifier Code')}
          </p>
        </div>

        {/* Payment Terms */}
        <div>
          <Label htmlFor="paymentTerms">{t('Payment Terms')}</Label>
          <Textarea
            id="paymentTerms"
            {...register('paymentTerms')}
            placeholder={t('e.g., Net 30 days, 2% discount if paid within 10 days')}
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('Optional: Specify your preferred payment terms')}
          </p>
        </div>
      </div>
    </div>
  );
}
