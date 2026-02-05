/**
 * Supplier Registration - Step 1: Company Basics
 */

import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SupplierRegistrationData } from '@/types/supplier-portal';

interface CompanyBasicsStepProps {
  form: UseFormReturn<SupplierRegistrationData>;
}

const LEGAL_FORMS = [
  'GmbH',
  'AG',
  'KG',
  'OHG',
  'UG',
  'e.K.',
  'GbR',
  'Limited',
  'LLC',
  'Corporation',
  'Partnership',
  'Sole Proprietorship',
  'Other',
];

export function CompanyBasicsStep({ form }: CompanyBasicsStepProps) {
  const { t } = useTranslation('supplier-portal');
  const { register, formState: { errors }, setValue, watch } = form;

  const legalForm = watch('legalForm');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('Company Basics')}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('Please provide your company information')}
        </p>
      </div>

      <div className="grid gap-4">
        {/* Company Name */}
        <div>
          <Label htmlFor="companyName">
            {t('Company Name')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="companyName"
            {...register('companyName', { required: t('This field is required') })}
            placeholder="Acme GmbH"
          />
          {errors.companyName && (
            <p className="text-sm text-destructive mt-1">{errors.companyName.message}</p>
          )}
        </div>

        {/* Legal Form */}
        <div>
          <Label htmlFor="legalForm">{t('Legal Form')}</Label>
          <Select value={legalForm || ''} onValueChange={(value) => setValue('legalForm', value)}>
            <SelectTrigger>
              <SelectValue placeholder={t('Select legal form')} />
            </SelectTrigger>
            <SelectContent>
              {LEGAL_FORMS.map((form) => (
                <SelectItem key={form} value={form}>
                  {t(form)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Contact Person */}
        <div>
          <Label htmlFor="contactName">
            {t('Contact Person')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contactName"
            {...register('contactName', { required: t('This field is required') })}
            placeholder="John Doe"
          />
          {errors.contactName && (
            <p className="text-sm text-destructive mt-1">{errors.contactName.message}</p>
          )}
        </div>

        {/* Position */}
        <div>
          <Label htmlFor="contactPosition">{t('Position')}</Label>
          <Input
            id="contactPosition"
            {...register('contactPosition')}
            placeholder="Purchasing Manager"
          />
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">
            {t('Email')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            {...register('email', {
              required: t('This field is required'),
              pattern: {
                value: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/,
                message: t('Invalid email format'),
              },
            })}
            placeholder="john.doe@acme.com"
          />
          {errors.email && (
            <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone">{t('Phone')}</Label>
          <Input
            id="phone"
            type="tel"
            {...register('phone')}
            placeholder="+49 123 456789"
          />
        </div>

        {/* Mobile */}
        <div>
          <Label htmlFor="mobile">{t('Mobile')}</Label>
          <Input
            id="mobile"
            type="tel"
            {...register('mobile')}
            placeholder="+49 160 1234567"
          />
        </div>

        {/* Website */}
        <div>
          <Label htmlFor="website">{t('Website')}</Label>
          <Input
            id="website"
            type="url"
            {...register('website')}
            placeholder="https://www.acme.com"
          />
        </div>

        {/* LinkedIn */}
        <div>
          <Label htmlFor="linkedin">{t('LinkedIn')}</Label>
          <Input
            id="linkedin"
            type="url"
            {...register('linkedin')}
            placeholder="https://www.linkedin.com/company/acme"
          />
        </div>
      </div>
    </div>
  );
}
