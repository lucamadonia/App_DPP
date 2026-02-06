import { useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useReturnsPortal } from '@/hooks/useReturnsPortal';
import { publicCreateReturn, publicUploadReturnPhoto } from '@/services/supabase';
import type { DesiredSolution, ItemCondition } from '@/types/returns-hub';

import { WizardStepIndicator } from '@/components/returns/public/WizardStepIndicator';
import { WizardStepTransition } from '@/components/returns/public/WizardStepTransition';
import { WizardSuccessPage } from '@/components/returns/public/WizardSuccessPage';
import { IdentificationStep } from '@/components/returns/public/steps/IdentificationStep';
import { SelectItemsStep } from '@/components/returns/public/steps/SelectItemsStep';
import type { WizardItem } from '@/components/returns/public/steps/SelectItemsStep';
import { ReturnReasonStep } from '@/components/returns/public/steps/ReturnReasonStep';
import { PhotoUploadStep } from '@/components/returns/public/steps/PhotoUploadStep';
import { SolutionStep } from '@/components/returns/public/steps/SolutionStep';
import { ShippingStep } from '@/components/returns/public/steps/ShippingStep';
import { ConfirmationStep } from '@/components/returns/public/steps/ConfirmationStep';

const STEP_LABELS = ['Identification', 'Select Items', 'Return Reason', 'Photos', 'Preferred Solution', 'Shipping', 'Confirmation'];

// State
interface WizardState {
  step: number;
  direction: 'forward' | 'backward';
  orderNumber: string;
  email: string;
  items: WizardItem[];
  reasonCategory: string;
  reasonSubcategory: string;
  reasonText: string;
  followUpAnswers: Record<string, string>;
  photos: File[];
  solution: DesiredSolution;
  shippingMethod: string;
}

type WizardAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GO_TO_STEP'; step: number }
  | { type: 'SET_ORDER_NUMBER'; value: string }
  | { type: 'SET_EMAIL'; value: string }
  | { type: 'SET_ITEMS'; items: WizardItem[] }
  | { type: 'SET_REASON_CATEGORY'; value: string }
  | { type: 'SET_REASON_SUBCATEGORY'; value: string }
  | { type: 'SET_REASON_TEXT'; value: string }
  | { type: 'SET_FOLLOW_UP'; questionId: string; value: string }
  | { type: 'SET_PHOTOS'; photos: File[] }
  | { type: 'SET_SOLUTION'; value: DesiredSolution }
  | { type: 'SET_SHIPPING'; value: string };

const initialState: WizardState = {
  step: 0,
  direction: 'forward',
  orderNumber: '',
  email: '',
  items: [{ name: '', quantity: 1, condition: 'used' as ItemCondition }],
  reasonCategory: '',
  reasonSubcategory: '',
  reasonText: '',
  followUpAnswers: {},
  photos: [],
  solution: 'refund',
  shippingMethod: 'print_label',
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
    case 'SET_EMAIL':
      return { ...state, email: action.value };
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
    default:
      return state;
  }
}

export function PublicReturnRegisterPage() {
  const { t } = useTranslation('returns');
  const { tenantSlug, reasons } = useReturnsPortal();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [returnNumber, setReturnNumber] = useState('');

  const canProceed = () => {
    switch (state.step) {
      case 0: return state.orderNumber.trim() && state.email.trim();
      case 1: return state.items.some(i => i.name.trim());
      case 2: return true;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!tenantSlug) return;
    setSubmitting(true);

    const result = await publicCreateReturn(tenantSlug, {
      orderNumber: state.orderNumber || undefined,
      email: state.email,
      reasonCategory: state.reasonCategory || undefined,
      reasonText: state.reasonText || undefined,
      desiredSolution: state.solution,
      shippingMethod: state.shippingMethod,
      items: state.items.filter(i => i.name.trim()).map(i => ({
        name: i.name,
        quantity: i.quantity,
        condition: i.condition,
        productId: i.productId,
      })),
    });

    if (result.success && result.returnNumber) {
      // Upload photos in background
      if (state.photos.length > 0) {
        for (const photo of state.photos) {
          await publicUploadReturnPhoto(tenantSlug, result.returnNumber, photo);
        }
      }
      setReturnNumber(result.returnNumber);
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  if (submitted) {
    return <WizardSuccessPage returnNumber={returnNumber} tenantSlug={tenantSlug} />;
  }

  const renderStep = () => {
    switch (state.step) {
      case 0:
        return (
          <IdentificationStep
            orderNumber={state.orderNumber}
            email={state.email}
            onOrderNumberChange={(v) => dispatch({ type: 'SET_ORDER_NUMBER', value: v })}
            onEmailChange={(v) => dispatch({ type: 'SET_EMAIL', value: v })}
          />
        );
      case 1:
        return (
          <SelectItemsStep
            items={state.items}
            onItemsChange={(items) => dispatch({ type: 'SET_ITEMS', items })}
          />
        );
      case 2:
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
      case 3:
        return (
          <PhotoUploadStep
            photos={state.photos}
            onPhotosChange={(photos) => dispatch({ type: 'SET_PHOTOS', photos })}
          />
        );
      case 4:
        return (
          <SolutionStep
            selected={state.solution}
            onSelect={(v) => dispatch({ type: 'SET_SOLUTION', value: v })}
          />
        );
      case 5:
        return (
          <ShippingStep
            selected={state.shippingMethod}
            onSelect={(v) => dispatch({ type: 'SET_SHIPPING', value: v })}
          />
        );
      case 6:
        return (
          <ConfirmationStep
            orderNumber={state.orderNumber}
            email={state.email}
            items={state.items}
            reasonCategory={state.reasonCategory}
            reasonSubcategory={state.reasonSubcategory}
            reasonText={state.reasonText}
            solution={state.solution}
            shippingMethod={state.shippingMethod}
            photoCount={state.photos.length}
            onGoToStep={(step) => dispatch({ type: 'GO_TO_STEP', step })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      {/* Step Indicator */}
      <div className="mb-6 sm:mb-8">
        <WizardStepIndicator
          currentStep={state.step}
          totalSteps={STEP_LABELS.length}
          labels={STEP_LABELS}
        />
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          <WizardStepTransition direction={state.direction} stepKey={state.step}>
            {renderStep()}
          </WizardStepTransition>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => dispatch({ type: 'PREV_STEP' })}
          disabled={state.step === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t('Previous')}
        </Button>

        {state.step < STEP_LABELS.length - 1 ? (
          <Button
            onClick={() => dispatch({ type: 'NEXT_STEP' })}
            disabled={!canProceed()}
          >
            {t('Next')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('Submit Return')}
          </Button>
        )}
      </div>
    </div>
  );
}
