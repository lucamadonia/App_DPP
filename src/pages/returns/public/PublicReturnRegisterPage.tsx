import { useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Package, HelpCircle, Camera, Lightbulb, Truck, ClipboardCheck } from 'lucide-react';
import { FormWizard, type WizardStep } from '@/components/ui/form-wizard';
import { Card, CardContent } from '@/components/ui/card';
import { useReturnsPortal } from '@/hooks/useReturnsPortal';
import { useEmbedMode } from '@/hooks/useEmbedMode';
import { sendReturnCreatedEvent } from '@/lib/embed-messaging';
import { publicCreateReturn, publicUploadReturnPhoto } from '@/services/supabase';
import {
  lookupShipmentWithItemsByOrderAndEmail,
  type LookupItem,
} from '@/services/supabase/shipment-tracking';
import type { DesiredSolution, ItemCondition } from '@/types/returns-hub';

import { WizardSuccessPage } from '@/components/returns/public/WizardSuccessPage';
import { IdentificationStep } from '@/components/returns/public/steps/IdentificationStep';
import { SelectItemsStep } from '@/components/returns/public/steps/SelectItemsStep';
import type { WizardItem } from '@/components/returns/public/steps/SelectItemsStep';
import { ReturnReasonStep } from '@/components/returns/public/steps/ReturnReasonStep';
import { PhotoUploadStep } from '@/components/returns/public/steps/PhotoUploadStep';
import { SolutionStep } from '@/components/returns/public/steps/SolutionStep';
import { ShippingStep } from '@/components/returns/public/steps/ShippingStep';
import type { ShippingAddress } from '@/components/returns/public/steps/ShippingStep';
import { ConfirmationStep } from '@/components/returns/public/steps/ConfirmationStep';

const STEP_LABELS = ['Identification', 'Select Items', 'Return Reason', 'Photos', 'Preferred Solution', 'Shipping', 'Confirmation'];
const STEP_IDS = ['identify', 'items', 'reason', 'photos', 'solution', 'shipping', 'confirm'];
const STEP_ICONS = [User, Package, HelpCircle, Camera, Lightbulb, Truck, ClipboardCheck];

// State
export type LookupState = 'idle' | 'loading' | 'hit' | 'miss';

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
  shippingAddress: ShippingAddress;
  // Shipment lookup — set after step 0 succeeds. availableItems=null means
  // we fall back to the legacy "all tenant products" picker. shipmentToken
  // + shipmentNumber are recorded in rh_returns.metadata for the operator.
  lookupState: LookupState;
  shipmentToken: string | null;
  shipmentNumber: string | null;
  availableItems: LookupItem[] | null;
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
  | { type: 'SET_SHIPPING'; value: string }
  | { type: 'SET_SHIPPING_ADDRESS'; address: ShippingAddress }
  | { type: 'LOOKUP_START' }
  | { type: 'LOOKUP_HIT'; trackingToken: string; shipmentNumber: string; items: LookupItem[] }
  | { type: 'LOOKUP_MISS' }
  | { type: 'LOOKUP_RESET' };

const initialState: WizardState = {
  step: 0,
  direction: 'forward',
  orderNumber: '',
  email: '',
  items: [],
  reasonCategory: '',
  reasonSubcategory: '',
  reasonText: '',
  followUpAnswers: {},
  photos: [],
  solution: 'refund',
  shippingMethod: 'print_label',
  shippingAddress: { name: '', company: '', street: '', postalCode: '', city: '', country: 'DE' },
  lookupState: 'idle',
  shipmentToken: null,
  shipmentNumber: null,
  availableItems: null,
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
      // Editing identification fields invalidates a previous lookup result
      // (miss or hit) so the next "Next" looks the order up again.
      return {
        ...state,
        orderNumber: action.value,
        lookupState: action.value === state.orderNumber ? state.lookupState : 'idle',
      };
    case 'SET_EMAIL':
      return {
        ...state,
        email: action.value,
        lookupState: action.value === state.email ? state.lookupState : 'idle',
      };
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
    case 'LOOKUP_START':
      return { ...state, lookupState: 'loading' };
    case 'LOOKUP_HIT':
      return {
        ...state,
        lookupState: 'hit',
        shipmentToken: action.trackingToken,
        shipmentNumber: action.shipmentNumber,
        availableItems: action.items,
        // Pre-fill the items list with the order's items but leave the
        // quantity at 0 so the next step makes the customer actively pick
        // what they're returning (default unchecked).
        items: action.items.map((it) => ({
          name: it.name,
          productId: it.productId,
          quantity: 0,
          condition: 'used' as ItemCondition,
          maxQuantity: it.quantity,
          imageUrl: it.imageUrl,
        })),
        step: state.step + 1,
        direction: 'forward',
      };
    case 'LOOKUP_MISS':
      return {
        ...state,
        lookupState: 'miss',
        shipmentToken: null,
        shipmentNumber: null,
        availableItems: null,
      };
    case 'LOOKUP_RESET':
      return {
        ...state,
        lookupState: 'idle',
        shipmentToken: null,
        shipmentNumber: null,
        availableItems: null,
      };
    default:
      return state;
  }
}

export function PublicReturnRegisterPage() {
  const { t } = useTranslation('returns');
  const navigate = useNavigate();
  const { tenantSlug, reasons } = useReturnsPortal();
  const { isEmbed } = useEmbedMode();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [returnNumber, setReturnNumber] = useState('');
  const [submitError, setSubmitError] = useState('');

  const canProceed = () => {
    switch (state.step) {
      case 0:
        // Order + email entered AND we haven't already established that the
        // lookup misses — the button stays disabled while we're loading or
        // showing the miss block.
        return !!(
          state.orderNumber.trim() &&
          state.email.trim() &&
          state.lookupState !== 'loading' &&
          state.lookupState !== 'miss'
        );
      case 1:
        // At least one item with a positive quantity. Works for both the
        // pre-filled order list (checkbox + qty) and the legacy free-form list.
        return state.items.some((i) => i.name.trim() && i.quantity > 0);
      case 2: return true;
      case 3: return true;
      case 4: return true;
      case 5: {
        const a = state.shippingAddress;
        return !!(a.name.trim() && a.street.trim() && a.postalCode.trim() && a.city.trim() && a.country.trim());
      }
      case 6: return true;
      default: return false;
    }
  };

  // Step-0 → step-1 transition: try to look up the shipment with the supplied
  // order number + email. On hit the reducer advances; on miss the reducer
  // surfaces the help block and the button stays disabled.
  // Returns true when the wizard itself may advance: only when an earlier hit
  // for the unchanged order/email still stands — re-running the lookup would
  // reset the customer's item selection (LOOKUP_HIT re-seeds the items).
  const advanceFromIdentification = async (): Promise<boolean> => {
    if (state.lookupState === 'hit') return true;
    if (state.lookupState === 'loading') return false;
    dispatch({ type: 'LOOKUP_START' });
    const result = await lookupShipmentWithItemsByOrderAndEmail(
      state.orderNumber,
      state.email,
    );
    if (!result || result.items.length === 0) {
      dispatch({ type: 'LOOKUP_MISS' });
      return false;
    }
    dispatch({
      type: 'LOOKUP_HIT',
      trackingToken: result.trackingToken,
      shipmentNumber: result.shipmentNumber,
      items: result.items,
    });
    return false;
  };

  const handleSubmit = async () => {
    if (!tenantSlug) return;
    setSubmitting(true);
    setSubmitError('');

    const result = await publicCreateReturn(tenantSlug, {
      orderNumber: state.orderNumber || undefined,
      email: state.email,
      reasonCategory: state.reasonCategory || undefined,
      reasonText: state.reasonText || undefined,
      desiredSolution: state.solution,
      shippingMethod: state.shippingMethod,
      shippingAddress: state.shippingAddress,
      shipmentToken: state.shipmentToken || undefined,
      shipmentNumber: state.shipmentNumber || undefined,
      items: state.items
        .filter((i) => i.name.trim() && i.quantity > 0)
        .map((i) => ({
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
      if (isEmbed) {
        sendReturnCreatedEvent(result.returnNumber);
      }
      setSubmitted(true);
    } else {
      // e.g. rate-limited or rejected by public_create_return
      setSubmitError(t('Your return could not be submitted. Please try again later.'));
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
            lookupState={state.lookupState}
            onOrderNumberChange={(v) => dispatch({ type: 'SET_ORDER_NUMBER', value: v })}
            onEmailChange={(v) => dispatch({ type: 'SET_EMAIL', value: v })}
          />
        );
      case 1:
        return (
          <SelectItemsStep
            items={state.items}
            availableItems={state.availableItems}
            shipmentNumber={state.shipmentNumber}
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
            address={state.shippingAddress}
            onAddressChange={(address) => dispatch({ type: 'SET_SHIPPING_ADDRESS', address })}
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
            shippingAddress={state.shippingAddress}
            photoCount={state.photos.length}
            onGoToStep={(step) => dispatch({ type: 'GO_TO_STEP', step })}
          />
        );
      default:
        return null;
    }
  };

  const portalPath = isEmbed ? `/embed/portal/${tenantSlug}` : `/returns/portal/${tenantSlug}`;

  const steps: WizardStep[] = STEP_LABELS.map((label, i) => ({
    id: STEP_IDS[i],
    title: t(label),
    icon: STEP_ICONS[i],
    // canProceed() only knows the current step; other steps are never shown.
    canNext: i === state.step ? canProceed() : undefined,
  }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      {/* Back to Portal */}
      <button
        onClick={() => navigate(portalPath)}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('Back to Overview')}
      </button>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <FormWizard
            variant={isEmbed ? 'embedded' : 'page'}
            steps={steps}
            step={state.step}
            onStepChange={(_, index) => dispatch({ type: 'GO_TO_STEP', step: index })}
            onNext={async (id) => {
              // Step 0 runs the shipment lookup; the reducer advances on a fresh
              // hit (LOOKUP_HIT) and stays on a miss, so the wizard only moves
              // itself when a previous hit is reused.
              if (id === 'identify') return advanceFromIdentification();
              return true;
            }}
            onFinish={handleSubmit}
            finishing={submitting}
            finishLabel={t('Submit Return')}
            showStepHeader={false}
          >
            {() => (
              <>
                {renderStep()}
                {submitError && (
                  <p role="alert" className="text-sm text-destructive">
                    {submitError}
                  </p>
                )}
              </>
            )}
          </FormWizard>
        </CardContent>
      </Card>
    </div>
  );
}
