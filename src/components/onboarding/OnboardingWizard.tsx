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
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const STEPS = [
  { id: 'company', icon: Building2 },
  { id: 'branding', icon: Palette },
  { id: 'product', icon: Package },
  { id: 'plan', icon: CreditCard },
] as const;

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
    if (step < STEPS.length - 1) {
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
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        {/* Step indicator */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isCompleted = i < step;
              const isCurrent = i === step;
              return (
                <div key={s.id} className="flex items-center">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                      isCompleted && 'border-primary bg-primary text-primary-foreground',
                      isCurrent && 'border-primary bg-primary/10 text-primary',
                      !isCompleted && !isCurrent && 'border-muted-foreground/30 text-muted-foreground/50',
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'mx-1.5 h-0.5 w-6 rounded',
                        i < step ? 'bg-primary' : 'bg-muted-foreground/20',
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <span className="text-sm text-muted-foreground">
            {step + 1}/{STEPS.length}
          </span>
        </div>

        {/* Step content */}
        <div className="px-6 py-6">
          {step === 0 && (
            <StepCompany data={company} onChange={setCompany} t={t} />
          )}
          {step === 1 && (
            <StepBranding data={branding} onChange={setBranding} t={t} />
          )}
          {step === 2 && (
            <StepProduct data={product} onChange={setProduct} t={t} />
          )}
          {step === 3 && (
            <StepPlan
              t={t}
              onContinueFree={handleComplete}
              onUpgrade={handleUpgrade}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        {/* Footer actions */}
        {step < 3 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={step === 0 ? handleSkip : handleBack}
              disabled={isSubmitting}
            >
              {step === 0 ? (
                t('Skip for now')
              ) : (
                <>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  {t('Back')}
                </>
              )}
            </Button>
            <Button onClick={handleNext} disabled={isSubmitting}>
              {t('Continue')}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
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
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{t('Company Profile')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('Tell us about your company to personalize your experience')}
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="ob-company">{t('Company Name')}</Label>
          <Input
            id="ob-company"
            value={data.companyName}
            onChange={(e) => onChange({ ...data, companyName: e.target.value })}
            placeholder={t('Acme GmbH')}
          />
        </div>
        <div>
          <Label htmlFor="ob-address">{t('Address')}</Label>
          <Input
            id="ob-address"
            value={data.address}
            onChange={(e) => onChange({ ...data, address: e.target.value })}
            placeholder={t('Street, City, Country')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ob-country">{t('Country')}</Label>
            <Input
              id="ob-country"
              value={data.country}
              onChange={(e) => onChange({ ...data, country: e.target.value })}
              placeholder="DE"
            />
          </div>
          <div>
            <Label htmlFor="ob-eori">{t('EORI Number')}</Label>
            <Input
              id="ob-eori"
              value={data.eori}
              onChange={(e) => onChange({ ...data, eori: e.target.value })}
              placeholder="DE123456789"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="ob-industry">{t('Industry')}</Label>
          <Input
            id="ob-industry"
            value={data.industry}
            onChange={(e) => onChange({ ...data, industry: e.target.value })}
            placeholder={t('Electronics, Textiles, Food...')}
          />
        </div>
      </div>
    </div>
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
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{t('Brand Colors')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('Choose a primary color for your workspace')}
        </p>
      </div>

      <div className="space-y-3">
        <Label>{t('Primary Color')}</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => onChange({ ...data, primaryColor: color })}
              className={cn(
                'h-10 w-10 rounded-lg border-2 transition-all',
                data.primaryColor === color
                  ? 'border-foreground scale-110 ring-2 ring-foreground/20'
                  : 'border-transparent hover:scale-105',
              )}
              style={{ backgroundColor: color }}
              aria-label={color}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="color"
            value={data.primaryColor}
            onChange={(e) => onChange({ ...data, primaryColor: e.target.value })}
            className="h-10 w-14 cursor-pointer p-1"
          />
          <Input
            value={data.primaryColor}
            onChange={(e) => onChange({ ...data, primaryColor: e.target.value })}
            className="w-28 font-mono text-sm"
            placeholder="#3B82F6"
          />
        </div>

        {/* Preview */}
        <div className="mt-4 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-2">{t('Preview')}</p>
          <div className="flex gap-3">
            <div
              className="flex h-9 items-center rounded-md px-4 text-sm font-medium text-white"
              style={{ backgroundColor: data.primaryColor }}
            >
              {t('Primary Button')}
            </div>
            <div
              className="flex h-9 items-center rounded-md border px-4 text-sm font-medium"
              style={{ color: data.primaryColor, borderColor: data.primaryColor }}
            >
              {t('Outline Button')}
            </div>
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
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{t('Create Your First Product')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('Add a product to start building your Digital Product Passport')}
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="ob-product">{t('Product Name')}</Label>
          <Input
            id="ob-product"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder={t('e.g. Premium Wireless Headphones')}
          />
        </div>
        <div>
          <Label htmlFor="ob-gtin">{t('GTIN / EAN')}</Label>
          <Input
            id="ob-gtin"
            value={data.gtin}
            onChange={(e) => onChange({ ...data, gtin: e.target.value })}
            placeholder="4260123456789"
          />
        </div>
        <div>
          <Label htmlFor="ob-desc">{t('Description')}</Label>
          <Textarea
            id="ob-desc"
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            placeholder={t('Short product description...')}
            rows={3}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('You can add more details later in the product editor.')}
      </p>
    </div>
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
    <div className="space-y-4">
      <div className="text-center">
        <Sparkles className="mx-auto h-10 w-10 text-primary" />
        <h3 className="mt-3 text-lg font-semibold">{t('Choose Your Plan')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('Start free or unlock all features with Pro')}
        </p>
      </div>

      <div className="grid gap-3">
        {/* Free */}
        <button
          onClick={onContinueFree}
          disabled={isSubmitting}
          className="flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{t('Continue with Free')}</p>
            <p className="text-sm text-muted-foreground">
              {t('5 Products, 10 Documents, 3 AI Credits')}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Pro */}
        <button
          onClick={onUpgrade}
          disabled={isSubmitting}
          className="flex items-center gap-4 rounded-lg border-2 border-primary p-4 text-left transition-colors hover:bg-primary/5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{t('Upgrade to Pro')}</p>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                {t('Recommended')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('50 Products, Custom Branding, 25 AI Credits')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{'\u20AC'}49</p>
            <p className="text-xs text-muted-foreground">/{t('mo')}</p>
          </div>
        </button>
      </div>
    </div>
  );
}
