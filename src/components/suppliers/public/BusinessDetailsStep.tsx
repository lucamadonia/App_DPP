/**
 * Supplier Registration - Step 4: Business Details & Review
 */

import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SupplierRegistrationData } from '@/types/supplier-portal';
import { Pencil } from 'lucide-react';

interface BusinessDetailsStepProps {
  form: UseFormReturn<SupplierRegistrationData>;
  onEditStep: (step: number) => void;
}

const SUPPLIER_TYPES = [
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'service_provider', label: 'Service Provider' },
];

export function BusinessDetailsStep({ form, onEditStep }: BusinessDetailsStepProps) {
  const { t } = useTranslation('supplier-portal');
  const { register, formState: { errors }, setValue, watch } = form;

  const supplierType = watch('supplierType');
  const termsAccepted = watch('termsAccepted');

  // Get all form values for review
  const formValues = watch();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('Business Details')}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('Tell us more about your business')}
        </p>
      </div>

      {/* Business Details */}
      <div className="space-y-4">
        {/* Supplier Type */}
        <div>
          <Label htmlFor="supplierType">{t('Supplier Type')}</Label>
          <Select
            value={supplierType || ''}
            onValueChange={(value) => setValue('supplierType', value as SupplierRegistrationData['supplierType'])}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('Select supplier type')} />
            </SelectTrigger>
            <SelectContent>
              {SUPPLIER_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {t(type.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Industry */}
        <div>
          <Label htmlFor="industry">{t('Industry')}</Label>
          <Input
            id="industry"
            {...register('industry')}
            placeholder={t('e.g., Electronics, Textiles, Food & Beverage')}
          />
        </div>

        {/* Product Categories */}
        <div>
          <Label htmlFor="productCategories">{t('Product Categories')}</Label>
          <Textarea
            id="productCategories"
            {...register('productCategories')}
            placeholder={t('e.g., Smartphones, Laptops, Accessories')}
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('List the main product categories you supply')}
          </p>
        </div>

        {/* Certifications */}
        <div>
          <Label htmlFor="certifications">{t('Certifications')}</Label>
          <Textarea
            id="certifications"
            {...register('certifications')}
            placeholder={t('e.g., ISO 9001, ISO 14001, CE, RoHS')}
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('List any relevant certifications your company holds')}
          </p>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">{t('Additional Notes')}</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder={t('Any additional information you would like to share')}
            rows={4}
          />
        </div>
      </div>

      {/* Review Section */}
      <div className="pt-6 border-t space-y-4">
        <h4 className="font-semibold text-lg">{t('Review Your Information')}</h4>
        <p className="text-sm text-muted-foreground">
          {t('Please review your information before submitting')}
        </p>

        {/* Company Basics Review */}
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="font-medium">{t('Company Basics')}</h5>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEditStep(0)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              {t('Edit')}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><span className="font-medium">{t('Company Name')}:</span> {formValues.companyName || '-'}</p>
            <p><span className="font-medium">{t('Contact Person')}:</span> {formValues.contactName || '-'}</p>
            <p><span className="font-medium">{t('Email')}:</span> {formValues.email || '-'}</p>
            {formValues.phone && (
              <p><span className="font-medium">{t('Phone')}:</span> {formValues.phone}</p>
            )}
          </div>
        </div>

        {/* Address Review */}
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="font-medium">{t('Address Information')}</h5>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEditStep(1)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              {t('Edit')}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><span className="font-medium">{t('Address')}:</span></p>
            <p className="pl-4">
              {formValues.street || '-'}<br />
              {formValues.addressLine2 && <>{formValues.addressLine2}<br /></>}
              {formValues.postalCode} {formValues.city}<br />
              {formValues.state && <>{formValues.state}<br /></>}
              {formValues.country || '-'}
            </p>
            {formValues.shippingAddressDifferent && (
              <>
                <p className="pt-2"><span className="font-medium">{t('Shipping Address')}:</span></p>
                <p className="pl-4">
                  {formValues.shippingStreet || '-'}<br />
                  {formValues.shippingAddressLine2 && <>{formValues.shippingAddressLine2}<br /></>}
                  {formValues.shippingPostalCode} {formValues.shippingCity}<br />
                  {formValues.shippingState && <>{formValues.shippingState}<br /></>}
                  {formValues.shippingCountry || '-'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Legal & Banking Review */}
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="font-medium">{t('Legal & Banking Information')}</h5>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEditStep(2)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              {t('Edit')}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><span className="font-medium">{t('Tax Number')}:</span> {formValues.taxNumber || '-'}</p>
            <p><span className="font-medium">{t('VAT Number')}:</span> {formValues.vatNumber || '-'}</p>
            {formValues.commercialRegisterNumber && (
              <p><span className="font-medium">{t('Commercial Register Number')}:</span> {formValues.commercialRegisterNumber}</p>
            )}
            <p><span className="font-medium">{t('IBAN')}:</span> {formValues.iban || '-'}</p>
            <p><span className="font-medium">{t('BIC/SWIFT')}:</span> {formValues.bic || '-'}</p>
          </div>
        </div>
      </div>

      {/* Terms Acceptance */}
      <div className="flex items-start space-x-2 pt-6 border-t">
        <Checkbox
          id="termsAccepted"
          checked={termsAccepted || false}
          onCheckedChange={(checked) =>
            setValue('termsAccepted', checked === true, { shouldValidate: true })
          }
        />
        <div className="space-y-1">
          <Label
            htmlFor="termsAccepted"
            className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t('I accept the terms and conditions')} <span className="text-destructive">*</span>
          </Label>
          {errors.termsAccepted && (
            <p className="text-sm text-destructive">{errors.termsAccepted.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('By checking this box, you confirm that all information provided is accurate and complete')}
          </p>
        </div>
      </div>
    </div>
  );
}
