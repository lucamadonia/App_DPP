/**
 * Supplier Registration - Step 2: Address
 */

import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('Address Information')}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('Please provide your business address')}
        </p>
      </div>

      {/* Billing Address */}
      <div className="space-y-4">
        <h4 className="font-medium">{t('Billing Address')}</h4>

        {/* Street */}
        <div>
          <Label htmlFor="street">
            {t('Street')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="street"
            {...register('street', { required: t('This field is required') })}
            placeholder="Main Street 123"
          />
          {errors.street && (
            <p className="text-sm text-destructive mt-1">{errors.street.message}</p>
          )}
        </div>

        {/* Address Line 2 */}
        <div>
          <Label htmlFor="addressLine2">{t('Address Line 2')}</Label>
          <Input
            id="addressLine2"
            {...register('addressLine2')}
            placeholder="Building, Floor, Apartment"
          />
        </div>

        {/* City */}
        <div>
          <Label htmlFor="city">
            {t('City')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="city"
            {...register('city', { required: t('This field is required') })}
            placeholder="Berlin"
          />
          {errors.city && (
            <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
          )}
        </div>

        {/* State/Region */}
        <div>
          <Label htmlFor="state">{t('State/Region')}</Label>
          <Input
            id="state"
            {...register('state')}
            placeholder="Brandenburg"
          />
        </div>

        {/* Country */}
        <div>
          <Label htmlFor="country">
            {t('Country')} <span className="text-destructive">*</span>
          </Label>
          <Select
            value={country || ''}
            onValueChange={(value) => setValue('country', value, { shouldValidate: true })}
            disabled={loading}
          >
            <SelectTrigger>
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
          {errors.country && (
            <p className="text-sm text-destructive mt-1">{errors.country.message}</p>
          )}
        </div>

        {/* Postal Code */}
        <div>
          <Label htmlFor="postalCode">
            {t('Postal Code')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="postalCode"
            {...register('postalCode', { required: t('This field is required') })}
            placeholder="10115"
          />
          {errors.postalCode && (
            <p className="text-sm text-destructive mt-1">{errors.postalCode.message}</p>
          )}
        </div>
      </div>

      {/* Shipping Address Different Checkbox */}
      <div className="flex items-center space-x-2 pt-4 border-t">
        <Checkbox
          id="shippingAddressDifferent"
          checked={shippingAddressDifferent || false}
          onCheckedChange={(checked) =>
            setValue('shippingAddressDifferent', checked === true)
          }
        />
        <Label
          htmlFor="shippingAddressDifferent"
          className="text-sm font-normal cursor-pointer"
        >
          {t('Shipping address is different')}
        </Label>
      </div>

      {/* Shipping Address (conditional) */}
      {shippingAddressDifferent && (
        <div className="space-y-4 pl-6 border-l-2">
          <h4 className="font-medium">{t('Shipping Address')}</h4>

          {/* Shipping Street */}
          <div>
            <Label htmlFor="shippingStreet">
              {t('Street')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="shippingStreet"
              {...register('shippingStreet', {
                required: shippingAddressDifferent ? t('This field is required') : false,
              })}
              placeholder="Main Street 123"
            />
            {errors.shippingStreet && (
              <p className="text-sm text-destructive mt-1">{errors.shippingStreet.message}</p>
            )}
          </div>

          {/* Shipping Address Line 2 */}
          <div>
            <Label htmlFor="shippingAddressLine2">{t('Address Line 2')}</Label>
            <Input
              id="shippingAddressLine2"
              {...register('shippingAddressLine2')}
              placeholder="Building, Floor, Apartment"
            />
          </div>

          {/* Shipping City */}
          <div>
            <Label htmlFor="shippingCity">
              {t('City')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="shippingCity"
              {...register('shippingCity', {
                required: shippingAddressDifferent ? t('This field is required') : false,
              })}
              placeholder="Berlin"
            />
            {errors.shippingCity && (
              <p className="text-sm text-destructive mt-1">{errors.shippingCity.message}</p>
            )}
          </div>

          {/* Shipping State/Region */}
          <div>
            <Label htmlFor="shippingState">{t('State/Region')}</Label>
            <Input
              id="shippingState"
              {...register('shippingState')}
              placeholder="Brandenburg"
            />
          </div>

          {/* Shipping Country */}
          <div>
            <Label htmlFor="shippingCountry">
              {t('Country')} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={shippingCountry || ''}
              onValueChange={(value) => setValue('shippingCountry', value, { shouldValidate: true })}
              disabled={loading}
            >
              <SelectTrigger>
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
            {errors.shippingCountry && (
              <p className="text-sm text-destructive mt-1">{errors.shippingCountry.message}</p>
            )}
          </div>

          {/* Shipping Postal Code */}
          <div>
            <Label htmlFor="shippingPostalCode">
              {t('Postal Code')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="shippingPostalCode"
              {...register('shippingPostalCode', {
                required: shippingAddressDifferent ? t('This field is required') : false,
              })}
              placeholder="10115"
            />
            {errors.shippingPostalCode && (
              <p className="text-sm text-destructive mt-1">{errors.shippingPostalCode.message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
