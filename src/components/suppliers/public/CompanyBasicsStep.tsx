/**
 * Supplier Registration - Step 1: Company, Step 2: Contact person.
 * Step headings are rendered by FormWizard.
 */

import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Globe, Linkedin, Mail, Phone, Smartphone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormGrid, FormField, InputAffix, OptionalDisclosure } from '@/components/ui/form-layout';
import type { SupplierRegistrationData } from '@/types/supplier-portal';

interface StepProps {
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

const affixIcon = (Icon: typeof Mail) => <Icon className="size-4" />;

export function CompanyBasicsStep({ form }: StepProps) {
  const { t } = useTranslation('supplier-portal');
  const { register, formState: { errors }, setValue, watch } = form;

  const legalForm = watch('legalForm');
  const [website, linkedin] = watch(['website', 'linkedin']);

  return (
    <>
      <FormGrid cols={6}>
        <FormField label={t('Company Name')} htmlFor="companyName" required span="full" error={errors.companyName?.message}>
          <Input
            id="companyName"
            {...register('companyName', { required: t('This field is required') })}
            placeholder="Acme GmbH"
            autoComplete="organization"
          />
        </FormField>
        <FormField label={t('Legal Form')} htmlFor="legalForm" span={3}>
          <Select value={legalForm || ''} onValueChange={(value) => setValue('legalForm', value)}>
            <SelectTrigger id="legalForm" className="w-full">
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
        </FormField>
      </FormGrid>

      <OptionalDisclosure
        label={t('Online Presence')}
        description={t('Optional links that help us get to know you.')}
        filledCount={[website, linkedin].filter(Boolean).length}
      >
        <FormGrid cols={2}>
          <FormField label={t('Website')} htmlFor="website" optional>
            <InputAffix prefix={affixIcon(Globe)}>
              <Input id="website" type="url" inputMode="url" {...register('website')} placeholder="https://www.acme.com" />
            </InputAffix>
          </FormField>
          <FormField label={t('LinkedIn')} htmlFor="linkedin" optional>
            <InputAffix prefix={affixIcon(Linkedin)}>
              <Input id="linkedin" type="url" inputMode="url" {...register('linkedin')} placeholder="https://www.linkedin.com/company/acme" />
            </InputAffix>
          </FormField>
        </FormGrid>
      </OptionalDisclosure>
    </>
  );
}

export function ContactPersonStep({ form }: StepProps) {
  const { t } = useTranslation('supplier-portal');
  const { register, formState: { errors }, watch } = form;
  const mobile = watch('mobile');

  return (
    <>
      <FormGrid cols={2}>
        <FormField label={t('Contact Person')} htmlFor="contactName" required error={errors.contactName?.message}>
          <Input
            id="contactName"
            {...register('contactName', { required: t('This field is required') })}
            placeholder="John Doe"
            autoComplete="name"
          />
        </FormField>
        <FormField label={t('Position')} htmlFor="contactPosition" optional>
          <Input id="contactPosition" {...register('contactPosition')} placeholder="Purchasing Manager" autoComplete="organization-title" />
        </FormField>
        <FormField label={t('Email')} htmlFor="email" required span="full" error={errors.email?.message}>
          <InputAffix prefix={affixIcon(Mail)}>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              {...register('email', {
                required: t('This field is required'),
                pattern: {
                  value: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/,
                  message: t('Invalid email format'),
                },
              })}
              placeholder="john.doe@acme.com"
            />
          </InputAffix>
        </FormField>
        <FormField label={t('Phone')} htmlFor="phone" optional span="full">
          <InputAffix prefix={affixIcon(Phone)}>
            <Input id="phone" type="tel" autoComplete="tel" {...register('phone')} placeholder="+49 123 456789" />
          </InputAffix>
        </FormField>
      </FormGrid>
      <OptionalDisclosure description={t('Mobile')} filledCount={mobile ? 1 : 0}>
        <FormField label={t('Mobile')} htmlFor="mobile" optional>
          <InputAffix prefix={affixIcon(Smartphone)}>
            <Input id="mobile" type="tel" {...register('mobile')} placeholder="+49 160 1234567" />
          </InputAffix>
        </FormField>
      </OptionalDisclosure>
    </>
  );
}
