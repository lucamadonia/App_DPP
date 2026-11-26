/**
 * Supplier Registration Page
 * 6-step wizard (shared FormWizard) for supplier self-registration via invitation link
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Building2, ClipboardCheck, Landmark, MapPin, UserRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { FormWizard, type WizardStep } from '@/components/ui/form-wizard';
import { useToast } from '@/hooks/use-toast';
import { useSupplierPortal } from '@/hooks/useSupplierPortal';
import { publicSubmitSupplierRegistration } from '@/services/supabase/supplier-portal';
import type { SupplierRegistrationData } from '@/types/supplier-portal';

import { CompanyBasicsStep, ContactPersonStep } from '@/components/suppliers/public/CompanyBasicsStep';
import { AddressStep } from '@/components/suppliers/public/AddressStep';
import { LegalBankingStep } from '@/components/suppliers/public/LegalBankingStep';
import { BusinessDetailsStep, RegistrationReviewStep } from '@/components/suppliers/public/BusinessDetailsStep';

export function SupplierRegisterPage() {
  const { t } = useTranslation('supplier-portal');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { invitationCode, invitation, portalSettings } = useSupplierPortal();

  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SupplierRegistrationData>({
    defaultValues: {
      companyName: invitation.companyName || '',
      contactName: invitation.contactName || '',
      email: invitation.email,
      country: 'DE',
      shippingAddressDifferent: false,
      termsAccepted: false,
    },
    mode: 'onBlur',
  });

  const { trigger, watch } = form;
  const termsAccepted = watch('termsAccepted');

  const handleSubmit = async () => {
    // Validate final step, then the entire form
    const isValid = await trigger(['termsAccepted']);
    const allValid = isValid && (await trigger());
    if (!allValid) {
      toast({
        title: t('Validation Error'),
        description: t('Please check all steps and fill in required fields'),
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const data = form.getValues();
      const result = await publicSubmitSupplierRegistration(invitationCode, data);

      if (result.success) {
        navigate(`/suppliers/register/${invitationCode}/success`, { replace: true });
      }
    } catch (err: unknown) {
      console.error('Failed to submit supplier registration:', err);
      toast({
        title: t('Submission Failed'),
        description: (err instanceof Error && err.message) || t('An error occurred while submitting your registration'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Per-step validation: inline errors show on the fields themselves.
  const steps: WizardStep[] = [
    {
      id: 'company', title: t('Company Basics'), shortTitle: t('Company'),
      description: t('Please provide your company information'), icon: Building2,
      validate: () => trigger(['companyName']),
      content: <CompanyBasicsStep form={form} />,
    },
    {
      id: 'contact', title: t('Contact Person'),
      description: t('Who we should contact about orders and documents.'), icon: UserRound,
      validate: () => trigger(['contactName', 'email']),
      content: <ContactPersonStep form={form} />,
    },
    {
      id: 'address', title: t('Address Information'), shortTitle: t('Address'),
      description: t('Please provide your business address'), icon: MapPin,
      validate: () => trigger([
        'street', 'city', 'country', 'postalCode',
        ...(form.getValues('shippingAddressDifferent')
          ? (['shippingStreet', 'shippingCity', 'shippingPostalCode', 'shippingCountry'] as const)
          : []),
      ]),
      content: <AddressStep form={form} />,
    },
    {
      id: 'legal', title: t('Legal & Banking Information'), shortTitle: t('Legal & Banking'),
      description: t('Please provide your legal and banking details'), icon: Landmark,
      validate: () => trigger(['taxNumber', 'vatNumber', 'iban', 'bic']),
      content: <LegalBankingStep form={form} />,
    },
    {
      id: 'business', title: t('Business Details'),
      description: t('Tell us more about your business'), icon: Briefcase,
      content: <BusinessDetailsStep form={form} />,
    },
    {
      id: 'review', title: t('Review Your Information'), shortTitle: t('Review'),
      description: t('Please review your information before submitting'), icon: ClipboardCheck,
      canNext: !!termsAccepted,
      content: <RegistrationReviewStep form={form} />,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      {/* Welcome Message */}
      {currentStep === 0 && portalSettings.welcomeMessage && (
        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-foreground">{portalSettings.welcomeMessage}</p>
        </div>
      )}

      <Card>
        <CardContent className="px-5 sm:px-8">
          <FormWizard
            variant="page"
            step={currentStep}
            onStepChange={(_, index) => setCurrentStep(index)}
            steps={steps}
            onFinish={handleSubmit}
            finishing={submitting}
            finishLabel={t('Submit Registration')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
