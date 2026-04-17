import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingOldVsNew } from '@/components/landing/LandingOldVsNew';
import { LandingOutcomes } from '@/components/landing/LandingOutcomes';
import { LandingDPPShowcase } from '@/components/landing/LandingDPPShowcase';
import { LandingSupplyChain } from '@/components/landing/LandingSupplyChain';
import { LandingAISection } from '@/components/landing/LandingAISection';
import { LandingVsCompetitors } from '@/components/landing/LandingVsCompetitors';
import { LandingReturnFlow } from '@/components/landing/LandingReturnFlow';
import { LandingReturnsHub } from '@/components/landing/LandingReturnsHub';
import { LandingWorkflowShowcase } from '@/components/landing/LandingWorkflowShowcase';
import { LandingEmailEditor } from '@/components/landing/LandingEmailEditor';
import { LandingQRSection } from '@/components/landing/LandingQRSection';
import { LandingVisibility } from '@/components/landing/LandingVisibility';
import { LandingStats } from '@/components/landing/LandingStats';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingTestimonials } from '@/components/landing/LandingTestimonials';
import { LandingFAQ } from '@/components/landing/LandingFAQ';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';

function GlowDivider() {
  return (
    <div className="py-2">
      <div className="landing-glow-divider max-w-4xl" />
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen scroll-smooth bg-white dark:bg-slate-950">
      <LandingNavbar />
      <LandingHero />
      <LandingOldVsNew />
      <LandingOutcomes />
      <LandingDPPShowcase />
      <LandingSupplyChain />
      <GlowDivider />
      <LandingAISection />
      <LandingVsCompetitors />
      <LandingTestimonials />
      <LandingReturnFlow />
      <LandingReturnsHub />
      <GlowDivider />
      <LandingWorkflowShowcase />
      <LandingEmailEditor />
      <LandingQRSection />
      <LandingVisibility />
      <GlowDivider />
      <LandingStats />
      <LandingPricing />
      <LandingFAQ />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
