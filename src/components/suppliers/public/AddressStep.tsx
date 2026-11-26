/**
 * Supplier Registration - Step 3: Address. Heading rendered by FormWizard.
 */

import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormGrid, FormField, FormToggleRow, OptionalDisclosure } from '@/components/ui/form-layout';
import { getCountries } from '@/services/supabase/master-data';
import type { SupplierRegistrationData } from '@/types/supplier-portal';
import type { Country } from '@/types/database';

interface AddressStepProps {
  form: UseFormReturn<SupplierRegistrationData>;
}

export function AddressStep({ form }: AddressStepProps) {
  const { t } = useTranslation('supplier-portal');
  const { register, formState: { errors }, setValue, watch } = form;

  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  const country = watch('country');
  const shippingCountry = watch('shippingCountry');
  const shippingAddressDifferent = watch('shippingAddressDifferent');
  const [addressLine2, state] = watch(['addressLine2', 'state']);

  useEffect(() => {
    loadCountries();
  }, []);

  async function loadCountries() {
    try {
      const data = await getCountries();
      setCountries(data);
    } catch (error) {
      console.error('Failed to load countries:', error);
    } finally {
      setLoading(false);
    }
  }

  const countrySelect = (id: string, value: string | undefined, field: 'country' | 'shippingCountry') => (
    <Select
      value={value || ''}
      onValueChange={(v) => setValue(field, v, { shouldValidate: true })}
      disabled={loading}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={t('Select country')} />
      </SelectTrigger>
      <SelectContent>
        {countries.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.flag} {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <FormGrid cols={6}>
        <FormField label={t('Street')} htmlFor="street" required span="full" error={errors.street?.message}>
          <Input
            id="street"
            autoComplete="billing address-line1"
            {...register('street', { required: t('This field is required') })}
            placeholder="Main Street 123"
          />
        </FormField>
        <FormField label={t('Postal Code')} htmlFor="postalCode" required span={2} error={errors.postalCode?.message}>
          <Input
            id="postalCode"
            autoComplete="billing postal-code"
            {...register('postalCode', { required: t('This field is required') })}
            placeholder="10115"
          />
        </FormField>
        <FormField label={t('City')} htmlFor="city" required span={4} error={errors.city?.message}>
          <Input
            id="city"
            autoComplete="billing address-level2"
            {...register('city', { required: t('This field is required') })}
            placeholder="Berlin"
          />
        </FormField>
        <FormField label={t('Country')} htmlFor="country" required span="full" error={errors.country?.message}>
          {countrySelect('country', country, 'country')}
        </FormField>
      </FormGrid>

      <OptionalDisclosure
        description={[t('Address Line 2'), t('State/Region')].join(', ')}
        filledCount={[addressLine2, state].filter(Boolean).length}
      >
        <FormGrid cols={2}>
          <FormField label={t('Address Line 2')} htmlFor="addressLine2" optional>
            <Input id="addressLine2" autoComplete="billing address-line2" {...register('addressLine2')} placeholder="Building, Floor, Apartment" />
          </FormField>
          <FormField label={t('State/Region')} htmlFor="state" optional>
            <Input id="state" autoComplete="billing address-level1" {...register('state')} placeholder="Brandenburg" />
          </FormField>
        </FormGrid>
      </OptionalDisclosure>

      <FormToggleRow
        htmlFor="shippingAddressDifferent"
        label={t('Shipping address is different')}
        description={t('Add a separate address for deliveries.')}
      >
        <Switch
          id="shippingAddressDifferent"
          checked={shippingAddressDifferent || false}
          aria-describedby="shippingAddressDifferent-description"
          onCheckedChange={(checked) => setValue('shippingAddressDifferent', checked === true)}
        />
      </FormToggleRow>

      {shippingAddressDifferent && (
        <div className="animate-in fade-in-0 slide-in-from-top-1 duration-200 ease-out">
          <FormGrid cols={6}>
            <FormField label={t('Street')} htmlFor="shippingStreet" required span="full" error={errors.shippingStreet?.message}>
              <Input
                id="shippingStreet"
                autoComplete="shipping address-line1"
                {...register('shippingStreet', {
                  required: shippingAddressDifferent ? t('This field is required') : false,
                })}
                placeholder="Main Street 123"
              />
            </FormField>
            <FormField label={t('Address Line 2')} htmlFor="shippingAddressLine2" optional span="full">
              <Input id="shippingAddressLine2" autoComplete="shipping address-line2" {...register('shippingAddressLine2')} placeholder="Building, Floor, Apartment" />
            </FormField>
            <FormField label={t('Postal Code')} htmlFor="shippingPostalCode" required span={2} error={errors.shippingPostalCode?.message}>
              <Input
                id="shippingPostalCode"
                autoComplete="shipping postal-code"
                {...register('shippingPostalCode', {
                  required: shippingAddressDifferent ? t('This field is required') : false,
                })}
                placeholder="10115"
              />
            </FormField>
            <FormField label={t('City')} htmlFor="shippingCity" required span={4} error={errors.shippingCity?.message}>
              <Input
                id="shippingCity"
                autoComplete="shipping address-level2"
                {...register('shippingCity', {
                  required: shippingAddressDifferent ? t('This field is required') : false,
                })}
                placeholder="Berlin"
              />
            </FormField>
            <FormField label={t('State/Region')} htmlFor="shippingState" optional span={3}>
              <Input id="shippingState" autoComplete="shipping address-level1" {...register('shippingState')} placeholder="Brandenburg" />
            </FormField>
            <FormField label={t('Country')} htmlFor="shippingCountry" required span={3} error={errors.shippingCountry?.message}>
              {countrySelect('shippingCountry', shippingCountry, 'shippingCountry')}
            </FormField>
          </FormGrid>
        </div>
      )}
    </>
  );
}
