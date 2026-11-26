/**
 * OnboardingWizard -- 4-step onboarding flow for new tenants.
 *
 * Steps:
 * 1. Company Profile (name, address, EORI, industry)
 * 2. Branding (logo, primary color)
 * 3. First Product (simplified creation)
 * 4. Choose Plan (Free or upgrade)
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Palette,
  Package,
  CreditCard,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/adaptive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormGrid, FormField } from '@/components/ui/form-layout';
import { FormWizard } from '@/components/ui/form-wizard';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface CompanyData {
  companyName: string;
  address: string;
  country: string;
  eori: string;
  industry: string;
}

interface BrandingData {
  primaryColor: string;
}

interface ProductData {
  name: string;
  gtin: string;
  description: string;
}

const COLOR_PRESETS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F97316',
  '#EF4444', '#06B6D4', '#EC4899', '#6366F1',
];

export function OnboardingWizard({ open, onOpenChange, onComplete }: OnboardingWizardProps) {
  const { t } = useTranslation('billing');
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [company, setCompany] = useState<CompanyData>({
    companyName: '',
    address: '',
    country: '',
    eori: '',
    industry: '',
  });

  const [branding, setBranding] = useState<BrandingData>({
    primaryColor: '#3B82F6',
  });

  const [product, setProduct] = useState<ProductData>({
    name: '',
    gtin: '',
    description: '',
  });

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // Save company profile
      if (company.companyName) {
        const { updateTenant } = await import('@/services/supabase/tenants');
        const { getCurrentTenantId } = await import('@/lib/supabase');
        const tenantId = await getCurrentTenantId();
        if (tenantId) {
          await updateTenant(tenantId, {
            name: company.companyName,
            address: company.address || undefined,
            country: company.country || undefined,
            eori: company.eori || undefined,
          });
        }
      }

      // Save branding if changed
      if (branding.primaryColor !== '#3B82F6') {
        const { updateTenantBranding } = await import('@/services/supabase/tenants');
        await updateTenantBranding({ primaryColor: branding.primaryColor });
      }

      // Create first product if filled
      if (product.name && product.gtin) {
        const { createProduct } = await import('@/services/supabase/products');
        await createProduct({
          name: product.name,
          gtin: product.gtin,
          description: product.description || undefined,
        });
      }

      // Mark onboarding as completed
      const { updateTenantSettings } = await import('@/services/supabase/tenants');
      await updateTenantSettings({ onboardingCompleted: true });

      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Onboarding error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/settings/billing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto pb-0">
        <FormWizard
          variant="dialog"
          step={step}
          onStepChange={(_, index) => setStep(index)}
          onSkip={handleSkip}
          skipLabel={t('Skip for now')}
          steps={[
            {
              id: 'company',
              icon: Building2,
              title: t('Company Profile'),
              description: t('Tell us about your company to personalize your experience'),
              nextLabel: t('Continue'),
              content: <StepCompany data={company} onChange={setCompany} t={t} />,
            },
            {
              id: 'branding',
              icon: Palette,
              title: t('Brand Colors'),
              description: t('Choose a primary color for your workspace'),
              nextLabel: t('Continue'),
              content: <StepBranding data={branding} onChange={setBranding} t={t} />,
            },
            {
              id: 'product',
              icon: Package,
              title: t('Create Your First Product'),
              description: t('Add a product to start building your Digital Product Passport'),
              nextLabel: t('Continue'),
              content: <StepProduct data={product} onChange={setProduct} t={t} />,
            },
            {
              id: 'plan',
              icon: CreditCard,
              title: t('Choose Your Plan'),
              description: t('Start free or unlock all features with Pro'),
              // The plan cards are the actions of this step.
              footer: (
                <Button type="button" variant="ghost" onClick={handleBack} disabled={isSubmitting}>
                  <ArrowLeft className="h-4 w-4" />
                  {t('Back')}
                </Button>
              ),
              content: (
                <StepPlan
                  t={t}
                  onContinueFree={handleComplete}
                  onUpgrade={handleUpgrade}
                  isSubmitting={isSubmitting}
                />
              ),
            },
          ]}
        />
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// STEP 1: Company Profile
// ============================================

function StepCompany({
  data,
  onChange,
  t,
}: {
  data: CompanyData;
  onChange: (d: CompanyData) => void;
  t: (key: string) => string;
}) {
  return (
    <FormGrid cols={2}>
      <FormField label={t('Company Name')} htmlFor="ob-company" span="full">
        <Input
          id="ob-company"
          autoComplete="organization"
          value={data.companyName}
          onChange={(e) => onChange({ ...data, companyName: e.target.value })}
          placeholder={t('Acme GmbH')}
        />
      </FormField>
      <FormField label={t('Address')} htmlFor="ob-address" span="full">
        <Input
          id="ob-address"
          autoComplete="street-address"
          value={data.address}
          onChange={(e) => onChange({ ...data, address: e.target.value })}
          placeholder={t('Street, City, Country')}
        />
      </FormField>
      <FormField label={t('Country')} htmlFor="ob-country">
        <Input
          id="ob-country"
          autoComplete="country"
          value={data.country}
          onChange={(e) => onChange({ ...data, country: e.target.value })}
          placeholder="DE"
        />
      </FormField>
      <FormField label={t('EORI Number')} htmlFor="ob-eori" optional>
        <Input
          id="ob-eori"
          value={data.eori}
          onChange={(e) => onChange({ ...data, eori: e.target.value })}
          placeholder="DE123456789"
          className="font-mono"
          autoCapitalize="characters"
          spellCheck={false}
        />
      </FormField>
      <FormField label={t('Industry')} htmlFor="ob-industry" optional span="full">
        <Input
          id="ob-industry"
          value={data.industry}
          onChange={(e) => onChange({ ...data, industry: e.target.value })}
          placeholder={t('Electronics, Textiles, Food...')}
        />
      </FormField>
    </FormGrid>
  );
}

// ============================================
// STEP 2: Branding
// ============================================

function StepBranding({
  data,
  onChange,
  t,
}: {
  data: BrandingData;
  onChange: (d: BrandingData) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-sm font-medium leading-5">{t('Primary Color')}</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange({ ...data, primaryColor: color })}
              aria-pressed={data.primaryColor === color}
              className={cn(
                'relative size-11 rounded-lg border-2 transition-[border-color,box-shadow,scale] duration-150 ease-out',
                data.primaryColor === color
                  ? 'border-foreground scale-105 ring-2 ring-foreground/20'
                  : 'border-transparent hover:scale-105',
              )}
              style={{ backgroundColor: color }}
              aria-label={color}
            >
              {data.primaryColor === color && <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="color"
            aria-label={t('Primary Color')}
            value={data.primaryColor}
            onChange={(e) => onChange({ ...data, primaryColor: e.target.value })}
            className="h-11 w-14 cursor-pointer p-1"
          />
          <Input
            aria-label={t('Primary Color')}
            value={data.primaryColor}
            onChange={(e) => onChange({ ...data, primaryColor: e.target.value })}
            className="h-11 w-28 font-mono text-sm"
            placeholder="#3B82F6"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="mb-2 text-xs text-muted-foreground">{t('Preview')}</p>
        <div className="flex flex-wrap gap-3">
          <div
            className="flex h-9 items-center rounded-md px-4 text-sm font-medium text-white"
            style={{ backgroundColor: data.primaryColor }}
          >
            {t('Primary Button')}
          </div>
          <div
            className="flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium"
            style={{ color: data.primaryColor, borderColor: data.primaryColor }}
          >
            {t('Outline Button')}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STEP 3: First Product
// ============================================

function StepProduct({
  data,
  onChange,
  t,
}: {
  data: ProductData;
  onChange: (d: ProductData) => void;
  t: (key: string) => string;
}) {
  return (
    <>
      <FormGrid cols={2}>
        <FormField label={t('Product Name')} htmlFor="ob-product" span="full">
          <Input
            id="ob-product"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder={t('e.g. Premium Wireless Headphones')}
          />
        </FormField>
        <FormField label={t('GTIN / EAN')} htmlFor="ob-gtin" span="full">
          <Input
            id="ob-gtin"
            inputMode="numeric"
            value={data.gtin}
            onChange={(e) => onChange({ ...data, gtin: e.target.value })}
            placeholder="4260123456789"
            className="font-mono tabular-nums"
          />
        </FormField>
        <FormField label={t('Description')} htmlFor="ob-desc" optional span="full">
          <Textarea
            id="ob-desc"
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            placeholder={t('Short product description...')}
            rows={3}
          />
        </FormField>
      </FormGrid>

      <p className="text-xs text-muted-foreground">
        {t('You can add more details later in the product editor.')}
      </p>
    </>
  );
}

// ============================================
// STEP 4: Choose Plan
// ============================================

function StepPlan({
  t,
  onContinueFree,
  onUpgrade,
  isSubmitting,
}: {
  t: (key: string, opts?: Record<string, unknown>) => string;
  onContinueFree: () => void;
  onUpgrade: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="grid gap-3">
      {/* Free */}
      <button
        type="button"
        onClick={onContinueFree}
        disabled={isSubmitting}
        className="flex min-h-11 items-center gap-4 rounded-lg border p-4 text-left transition-colors duration-150 ease-out hover:bg-muted/50 disabled:opacity-60"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Package className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t('Continue with Free')}</p>
          <p className="text-sm text-muted-foreground">
            {t('5 Products, 10 Documents, 3 AI Credits')}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {/* Pro */}
      <button
        type="button"
        onClick={onUpgrade}
        disabled={isSubmitting}
        className="flex min-h-11 items-center gap-4 rounded-lg border-2 border-primary p-4 text-left transition-colors duration-150 ease-out hover:bg-primary/5 disabled:opacity-60"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{t('Upgrade to Pro')}</p>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
              {t('Recommended')}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('50 Products, Custom Branding, 25 AI Credits')}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold tabular-nums">{'€'}49</p>
          <p className="text-xs text-muted-foreground">/{t('mo')}</p>
        </div>
      </button>
    </div>
  );
}
