import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingTrustBar } from '@/components/landing/LandingTrustBar';
import { LandingFeaturesBento } from '@/components/landing/LandingFeaturesBento';
import { LandingDPPShowcase } from '@/components/landing/LandingDPPShowcase';
import { LandingSupplyChain } from '@/components/landing/LandingSupplyChain';
import { LandingAISection } from '@/components/landing/LandingAISection';
import { LandingReturnFlow } from '@/components/landing/LandingReturnFlow';
import { LandingReturnsHub } from '@/components/landing/LandingReturnsHub';
import { LandingCustomerPortal } from '@/components/landing/LandingCustomerPortal';
import { LandingWorkflowShowcase } from '@/components/landing/LandingWorkflowShowcase';
import { LandingEmailEditor } from '@/components/landing/LandingEmailEditor';
import { LandingQRSection } from '@/components/landing/LandingQRSection';
import { LandingVisibility } from '@/components/landing/LandingVisibility';
import { LandingStats } from '@/components/landing/LandingStats';
import { LandingTeam } from '@/components/landing/LandingTeam';
import { LandingPricing } from '@/components/landing/LandingPricing';
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
    <div className="min-h-screen scroll-smooth bg-white">
      <LandingNavbar />
      <LandingHero />
      <LandingTrustBar />
      <GlowDivider />
      <LandingFeaturesBento />
      <LandingDPPShowcase />
      <LandingSupplyChain />
      <GlowDivider />
      <LandingAISection />
      <LandingReturnFlow />
      <LandingReturnsHub />
      <LandingCustomerPortal />
      <GlowDivider />
      <LandingWorkflowShowcase />
      <LandingEmailEditor />
      <LandingQRSection />
      <LandingVisibility />
      <GlowDivider />
      <LandingPricing />
      <LandingStats />
      <LandingTeam />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
