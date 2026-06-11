import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { RotateCcw, Warehouse, ShoppingCart, Star, Sparkles } from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { ErrorState } from '@/components/ui/state-feedback';
import { ComplianceReminderBanner } from '@/components/compliance/ComplianceReminderBanner';
import { useProducts, useDocumentStats } from '@/hooks/queries';
import { useBillingOptional } from '@/hooks/use-billing';
import { gridStagger, gridItem } from '@/lib/motion';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { RecentProductsCard } from '@/components/dashboard/RecentProductsCard';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { ComplianceWidget } from '@/components/dashboard/ComplianceWidget';
import { AiHintsWidget } from '@/components/dashboard/AiHintsWidget';
import { ReturnsModuleCard } from '@/components/dashboard/ReturnsModuleCard';
import { WarehouseModuleCard } from '@/components/dashboard/WarehouseModuleCard';
import { CommerceModuleCard } from '@/components/dashboard/CommerceModuleCard';
import { CrmModuleCard } from '@/components/dashboard/CrmModuleCard';
import { FeedbackModuleCard } from '@/components/dashboard/FeedbackModuleCard';
import { CreditsQuotaCard } from '@/components/dashboard/CreditsQuotaCard';
import { LockedModuleCard } from '@/components/dashboard/LockedModuleCard';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-1 pt-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {children}
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}

function ModuleSkeletonRow() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 sm:gap-5">
      {[8, 4, 4, 4].map((span, i) => (
        <GlassCard key={i} className={span === 8 ? 'lg:col-span-8' : 'lg:col-span-4'}>
          <CardContent className="animate-pulse space-y-3 p-5">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-12 rounded-lg bg-muted" />
              <div className="h-12 rounded-lg bg-muted" />
            </div>
          </CardContent>
        </GlassCard>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const prefersReduced = useReducedMotion();
  const billing = useBillingOptional();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { data: products = [], isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = useProducts();
  const { data: docStats = { total: 0, valid: 0, expiring: 0, expired: 0 }, isLoading: docsLoading, isError: docsError, refetch: refetchDocs } = useDocumentStats();

  const coreLoading = productsLoading || docsLoading;
  const isNewUser = !coreLoading && products.length === 0 && docStats.total === 0;

  const entitlementsReady = !!billing?.entitlements;
  const hasReturns = !!billing?.hasAnyReturnsHubModule();
  const hasWarehouse = !!billing?.hasAnyWarehouseModule();
  const hasCommerce = !!billing?.hasAnyCommerceHubModule();
  const hasFeedback = !!billing?.hasAnyFeedbackModule();
  const lockedCount = [hasReturns, hasWarehouse, hasCommerce, hasFeedback].filter((v) => !v).length;
  const allLocked = lockedCount === 4;

  // Both core sources dead → very likely auth/network problem; full-page error.
  if (productsError && docsError) {
    return (
      <ErrorState onRetry={() => { refetchProducts(); refetchDocs(); }} />
    );
  }

  const lockedTeasers = [
    !hasReturns && (
      <LockedModuleCard
        key="locked-returns"
        title={t('Returns & Support')}
        description={t('Manage returns, tickets and SLAs in one place')}
        icon={RotateCcw}
        className="lg:col-span-4"
      />
    ),
    !hasWarehouse && (
      <LockedModuleCard
        key="locked-warehouse"
        title={t('Warehouse & Shipping')}
        description={t('Stock levels, picking and shipping labels')}
        icon={Warehouse}
        className="lg:col-span-4"
      />
    ),
    !hasCommerce && (
      <LockedModuleCard
        key="locked-commerce"
        title={t('Commerce Hub')}
        description={t('Live revenue, orders and channel sync')}
        icon={ShoppingCart}
        className="lg:col-span-4"
      />
    ),
    !hasFeedback && (
      <LockedModuleCard
        key="locked-feedback"
        title={t('Feedback')}
        description={t('Collect and moderate customer reviews')}
        icon={Star}
        className="lg:col-span-4"
      />
    ),
  ].filter(Boolean);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Compliance reminder (EAR/LUCID monthly filings) — stays on the light app surface */}
      <ComplianceReminderBanner />

      {/* ── Dark command-center stage ───────────────────────────────── */}
      <div className="dashboard-stage space-y-5 p-3 sm:space-y-6 sm:p-5 lg:p-6">
        {/* Hero + core KPIs */}
        <DashboardHero
          products={products}
          docStats={docStats}
          isLoading={coreLoading}
          isNewUser={isNewUser}
        />

        {/* Onboarding CTA for new users */}
        {isNewUser && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <GlassCard enableGlow className="border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:text-left">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{t('Welcome to Trackbliss')}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('Create your first Digital Product Passport in minutes. Add a product, upload documents, and generate QR codes.')}
                  </p>
                </div>
                <Button size="lg" className="w-full sm:w-auto" onClick={() => setShowOnboarding(true)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t('Get Started')}
                </Button>
              </CardContent>
            </GlassCard>
          </motion.div>
        )}

        <OnboardingWizard
          open={showOnboarding}
          onOpenChange={setShowOnboarding}
          onComplete={() => setShowOnboarding(false)}
        />

        {/* ── Module section ──────────────────────────────────────────── */}
        <SectionLabel>{t('Your Modules')}</SectionLabel>

        {!entitlementsReady ? (
          <ModuleSkeletonRow />
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-12"
            variants={prefersReduced ? undefined : gridStagger}
            initial={prefersReduced ? false : 'initial'}
            animate="animate"
          >
            {hasCommerce && (
              <motion.div variants={prefersReduced ? undefined : gridItem} className="md:col-span-2 lg:col-span-8">
                <CommerceModuleCard enabled={hasCommerce} className="h-full" />
              </motion.div>
            )}
            <motion.div variants={prefersReduced ? undefined : gridItem} className="lg:col-span-4">
              <CreditsQuotaCard className="h-full" />
            </motion.div>
            {hasReturns && (
              <motion.div variants={prefersReduced ? undefined : gridItem} className="lg:col-span-4">
                <ReturnsModuleCard enabled={hasReturns} className="h-full" />
              </motion.div>
            )}
            {hasWarehouse && (
              <motion.div variants={prefersReduced ? undefined : gridItem} className="lg:col-span-4">
                <WarehouseModuleCard enabled={hasWarehouse} className="h-full" />
              </motion.div>
            )}
            <motion.div variants={prefersReduced ? undefined : gridItem} className="lg:col-span-4">
              <CrmModuleCard enabled className="h-full" />
            </motion.div>
            {hasFeedback && (
              <motion.div variants={prefersReduced ? undefined : gridItem} className="lg:col-span-4">
                <FeedbackModuleCard enabled={hasFeedback} className="h-full" />
              </motion.div>
            )}
            <motion.div variants={prefersReduced ? undefined : gridItem} className="md:col-span-2 lg:col-span-8">
              <AiHintsWidget className="h-full" />
            </motion.div>

            {/* Locked teasers — active modules first, locked at the end */}
            {!allLocked && lockedTeasers.map((teaser) => (
              <motion.div key={(teaser as React.ReactElement).key} variants={prefersReduced ? undefined : gridItem} className="lg:col-span-4">
                {teaser}
              </motion.div>
            ))}
            {allLocked && (
              <motion.div variants={prefersReduced ? undefined : gridItem} className="md:col-span-2 lg:col-span-12">
                <div>
                  <p className="mb-3 text-sm text-muted-foreground">{t('Discover more modules')}</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {lockedTeasers}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Core section ───────────────────────────────────────────── */}
        <SectionLabel>{t('Products & Compliance')}</SectionLabel>

        <motion.div
          className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-12"
          variants={prefersReduced ? undefined : gridStagger}
          initial={prefersReduced ? false : 'initial'}
          animate="animate"
        >
          <motion.div variants={prefersReduced ? undefined : gridItem} className="md:col-span-2 lg:col-span-8">
            <RecentProductsCard products={products} className="h-full" />
          </motion.div>
          <motion.div variants={prefersReduced ? undefined : gridItem} className="lg:col-span-4">
            <ActivityFeed className="h-full" />
          </motion.div>
          <motion.div variants={prefersReduced ? undefined : gridItem} className="md:col-span-2 lg:col-span-8">
            <ComplianceWidget className="h-full" />
          </motion.div>
          <motion.div variants={prefersReduced ? undefined : gridItem} className="lg:col-span-4">
            <QuickActionsCard hasProducts={products.length > 0} className="h-full" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
