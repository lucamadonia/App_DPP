import { useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { createCustomerReturn } from '@/services/supabase/customer-portal';
import { spring } from '@/lib/motion';
import type { DesiredSolution, ItemCondition } from '@/types/returns-hub';

import { WizardStepIndicator } from '@/components/returns/public/WizardStepIndicator';
import { WizardStepTransition } from '@/components/returns/public/WizardStepTransition';
import { SelectItemsStep } from '@/components/returns/public/steps/SelectItemsStep';
import type { WizardItem } from '@/components/returns/public/steps/SelectItemsStep';
import { ReturnReasonStep } from '@/components/returns/public/steps/ReturnReasonStep';
import { PhotoUploadStep } from '@/components/returns/public/steps/PhotoUploadStep';
import { SolutionStep } from '@/components/returns/public/steps/SolutionStep';
import { ShippingStep } from '@/components/returns/public/steps/ShippingStep';
import type { ShippingAddress } from '@/components/returns/public/steps/ShippingStep';
import { ConfirmationStep } from '@/components/returns/public/steps/ConfirmationStep';

// 6 steps (no identification step - customer is logged in)
const STEP_LABELS = ['Select Items', 'Return Reason', 'Photos', 'Preferred Solution', 'Shipping', 'Confirmation'];

interface WizardState {
  step: number;
  direction: 'forward' | 'backward';
  orderNumber: string;
  items: WizardItem[];
  reasonCategory: string;
  reasonSubcategory: string;
  reasonText: string;
  followUpAnswers: Record<string, string>;
  photos: File[];
  solution: DesiredSolution;
  shippingMethod: string;
  shippingAddress: ShippingAddress;
}

type WizardAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GO_TO_STEP'; step: number }
  | { type: 'SET_ORDER_NUMBER'; value: string }
  | { type: 'SET_ITEMS'; items: WizardItem[] }
  | { type: 'SET_REASON_CATEGORY'; value: string }
  | { type: 'SET_REASON_SUBCATEGORY'; value: string }
  | { type: 'SET_REASON_TEXT'; value: string }
  | { type: 'SET_FOLLOW_UP'; questionId: string; value: string }
  | { type: 'SET_PHOTOS'; photos: File[] }
  | { type: 'SET_SOLUTION'; value: DesiredSolution }
  | { type: 'SET_SHIPPING'; value: string }
  | { type: 'SET_SHIPPING_ADDRESS'; address: ShippingAddress };

const initialState: WizardState = {
  step: 0,
  direction: 'forward',
  orderNumber: '',
  items: [{ name: '', quantity: 1, condition: 'used' as ItemCondition }],
  reasonCategory: '',
  reasonSubcategory: '',
  reasonText: '',
  followUpAnswers: {},
  photos: [],
  solution: 'refund',
  shippingMethod: 'print_label',
  shippingAddress: { name: '', company: '', street: '', postalCode: '', city: '', country: 'DE' },
};

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'NEXT_STEP':
      return { ...state, step: Math.min(state.step + 1, STEP_LABELS.length - 1), direction: 'forward' };
    case 'PREV_STEP':
      return { ...state, step: Math.max(state.step - 1, 0), direction: 'backward' };
    case 'GO_TO_STEP':
      return { ...state, step: action.step, direction: action.step < state.step ? 'backward' : 'forward' };
    case 'SET_ORDER_NUMBER':
      return { ...state, orderNumber: action.value };
    case 'SET_ITEMS':
      return { ...state, items: action.items };
    case 'SET_REASON_CATEGORY':
      return { ...state, reasonCategory: action.value };
    case 'SET_REASON_SUBCATEGORY':
      return { ...state, reasonSubcategory: action.value };
    case 'SET_REASON_TEXT':
      return { ...state, reasonText: action.value };
    case 'SET_FOLLOW_UP':
      return { ...state, followUpAnswers: { ...state.followUpAnswers, [action.questionId]: action.value } };
    case 'SET_PHOTOS':
      return { ...state, photos: action.photos };
    case 'SET_SOLUTION':
      return { ...state, solution: action.value };
    case 'SET_SHIPPING':
      return { ...state, shippingMethod: action.value };
    case 'SET_SHIPPING_ADDRESS':
      return { ...state, shippingAddress: action.address };
    default:
      return state;
  }
}

export function CustomerNewReturnPage() {
  const { t } = useTranslation('customer-portal');
  const navigate = useNavigate();
  const { tenantSlug, customerProfile, reasons } = useCustomerPortal();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [returnNumber, setReturnNumber] = useState('');

  const canProceed = () => {
    switch (state.step) {
      case 0: return state.items.some(i => i.name.trim());
      case 1: return true;
      case 2: return true;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    const result = await createCustomerReturn({
      orderId: state.orderNumber || undefined,
      reasonCategory: state.reasonCategory || undefined,
      reasonSubcategory: state.reasonSubcategory || undefined,
      reasonText: state.reasonText || undefined,
      desiredSolution: state.solution,
      shippingMethod: state.shippingMethod,
      items: state.items.filter(i => i.name.trim()).map(i => ({
        name: i.name,
        quantity: i.quantity,
      })),
    });

    if (result.success && result.returnNumber) {
      setReturnNumber(result.returnNumber);
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  const prefersReduced = useReducedMotion();

  if (submitted) {
    return (
      <motion.div
        className="max-w-lg mx-auto px-4 sm:px-0 py-8 sm:py-12 text-center space-y-4 sm:space-y-6"
        initial={prefersReduced ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={prefersReduced ? { duration: 0 } : spring.bouncy}
      >
        <motion.div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mx-auto"
          initial={prefersReduced ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={prefersReduced ? { duration: 0 } : { ...spring.bouncy, delay: 0.15 }}
        >
          <CheckCircle className="h-8 w-8" />
        </motion.div>
        <h2 className="text-2xl font-bold">{t('Return Submitted')}</h2>
        <p className="text-muted-foreground">
          {t('Your return {{number}} has been submitted successfully.', { number: returnNumber })}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate(`/customer/${tenantSlug}/returns`)}>
            {t('View All Returns')}
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => navigate(`/customer/${tenantSlug}`)}>
            {t('Back to Dashboard')}
          </Button>
        </div>
      </motion.div>
    );
  }

  // Map step index: customer wizard has no identification step, but ConfirmationStep
  // expects an email prop (used for display). We pass the customer's email.
  const customerEmail = customerProfile?.email || '';

  const renderStep = () => {
    switch (state.step) {
      case 0:
        return (
          <SelectItemsStep
            items={state.items}
            onItemsChange={(items) => dispatch({ type: 'SET_ITEMS', items })}
          />
        );
      case 1:
        return (
          <ReturnReasonStep
            reasons={reasons}
            selectedCategory={state.reasonCategory}
            selectedSubcategory={state.reasonSubcategory}
            reasonText={state.reasonText}
            followUpAnswers={state.followUpAnswers}
            onCategoryChange={(v) => dispatch({ type: 'SET_REASON_CATEGORY', value: v })}
            onSubcategoryChange={(v) => dispatch({ type: 'SET_REASON_SUBCATEGORY', value: v })}
            onReasonTextChange={(v) => dispatch({ type: 'SET_REASON_TEXT', value: v })}
            onFollowUpChange={(qId, v) => dispatch({ type: 'SET_FOLLOW_UP', questionId: qId, value: v })}
          />
        );
      case 2:
        return (
          <PhotoUploadStep
            photos={state.photos}
            onPhotosChange={(photos) => dispatch({ type: 'SET_PHOTOS', photos })}
          />
        );
      case 3:
        return (
          <SolutionStep
            selected={state.solution}
            onSelect={(v) => dispatch({ type: 'SET_SOLUTION', value: v })}
          />
        );
      case 4:
        return (
          <ShippingStep
            selected={state.shippingMethod}
            onSelect={(v) => dispatch({ type: 'SET_SHIPPING', value: v })}
            address={state.shippingAddress}
            onAddressChange={(address) => dispatch({ type: 'SET_SHIPPING_ADDRESS', address })}
          />
        );
      case 5:
        return (
          <ConfirmationStep
            orderNumber={state.orderNumber}
            email={customerEmail}
            items={state.items}
            reasonCategory={state.reasonCategory}
            reasonSubcategory={state.reasonSubcategory}
            reasonText={state.reasonText}
            solution={state.solution}
            shippingMethod={state.shippingMethod}
            shippingAddress={state.shippingAddress}
            photoCount={state.photos.length}
            onGoToStep={(step) => dispatch({ type: 'GO_TO_STEP', step })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      className="max-w-2xl mx-auto px-4 sm:px-0"
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : spring.gentle}
    >
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{t('New Return')}</h1>

      {/* Step Indicator */}
      <div className="mb-4 sm:mb-6">
        <WizardStepIndicator
          currentStep={state.step}
          totalSteps={STEP_LABELS.length}
          labels={STEP_LABELS}
        />
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <WizardStepTransition direction={state.direction} stepKey={state.step}>
            {renderStep()}
          </WizardStepTransition>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between mt-4 sm:mt-6">
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => state.step === 0 ? navigate(`/customer/${tenantSlug}/returns`) : dispatch({ type: 'PREV_STEP' })}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {state.step === 0 ? t('Cancel', { ns: 'common' }) : t('Previous', { ns: 'returns' })}
        </Button>

        {state.step < STEP_LABELS.length - 1 ? (
          <Button
            className="w-full sm:w-auto"
            onClick={() => dispatch({ type: 'NEXT_STEP' })}
            disabled={!canProceed()}
          >
            {t('Next', { ns: 'returns' })}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('Submit Return', { ns: 'returns' })}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
