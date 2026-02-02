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
import { LandingCTA } from '@/components/landing/LandingCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';

export function LandingPage() {
  return (
    <div className="min-h-screen scroll-smooth bg-white">
      <LandingNavbar />
      <LandingHero />
      <LandingTrustBar />
      <LandingFeaturesBento />
      <LandingDPPShowcase />
      <LandingSupplyChain />
      <LandingAISection />
      <LandingReturnFlow />
      <LandingReturnsHub />
      <LandingCustomerPortal />
      <LandingWorkflowShowcase />
      <LandingEmailEditor />
      <LandingQRSection />
      <LandingVisibility />
      <LandingStats />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
