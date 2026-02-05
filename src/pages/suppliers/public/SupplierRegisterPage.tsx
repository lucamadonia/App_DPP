/**
 * Supplier Registration Page
 * 4-step wizard for supplier self-registration via invitation link
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSupplierPortal } from '@/hooks/useSupplierPortal';
import { publicSubmitSupplierRegistration } from '@/services/supabase/supplier-portal';
import type { SupplierRegistrationData } from '@/types/supplier-portal';

import { WizardStepIndicator } from '@/components/returns/public/WizardStepIndicator';
import { CompanyBasicsStep } from '@/components/suppliers/public/CompanyBasicsStep';
import { AddressStep } from '@/components/suppliers/public/AddressStep';
import { LegalBankingStep } from '@/components/suppliers/public/LegalBankingStep';
import { BusinessDetailsStep } from '@/components/suppliers/public/BusinessDetailsStep';

const STEP_LABELS = ['Company Basics', 'Address', 'Legal & Banking', 'Business Details'];

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

  const { trigger } = form;

  // Field validation per step
  const getStepFields = (step: number): (keyof SupplierRegistrationData)[] => {
    switch (step) {
      case 0:
        return ['companyName', 'contactName', 'email'];
      case 1:
        return ['street', 'city', 'country', 'postalCode'];
      case 2:
        return ['taxNumber', 'vatNumber', 'iban', 'bic'];
      case 3:
        return ['termsAccepted'];
      default:
        return [];
    }
  };

  const validateStep = async (step: number): Promise<boolean> => {
    const fields = getStepFields(step);
    if (fields.length === 0) return true;

    const result = await trigger(fields);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (!isValid) {
      toast({
        title: t('Validation Error'),
        description: t('Please fill in all required fields correctly'),
        variant: 'destructive',
      });
      return;
    }

    if (currentStep < STEP_LABELS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate final step
    const isValid = await validateStep(currentStep);
    if (!isValid) {
      toast({
        title: t('Validation Error'),
        description: t('Please fill in all required fields correctly'),
        variant: 'destructive',
      });
      return;
    }

    // Validate entire form
    const allValid = await form.trigger();
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
    } catch (err: any) {
      console.error('Failed to submit supplier registration:', err);
      toast({
        title: t('Submission Failed'),
        description: err.message || t('An error occurred while submitting your registration'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <CompanyBasicsStep form={form} />;
      case 1:
        return <AddressStep form={form} />;
      case 2:
        return <LegalBankingStep form={form} />;
      case 3:
        return <BusinessDetailsStep form={form} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      {/* Welcome Message */}
      {currentStep === 0 && portalSettings.welcomeMessage && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">{portalSettings.welcomeMessage}</p>
        </div>
      )}

      {/* Step Indicator */}
      <div className="mb-6 sm:mb-8">
        <WizardStepIndicator
          currentStep={currentStep}
          totalSteps={STEP_LABELS.length}
          labels={STEP_LABELS}
        />
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0 || submitting}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t('Previous')}
        </Button>

        {currentStep < STEP_LABELS.length - 1 ? (
          <Button onClick={handleNext} disabled={submitting}>
            {t('Next')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('Submit Registration')}
          </Button>
        )}
      </div>
    </div>
  );
}
